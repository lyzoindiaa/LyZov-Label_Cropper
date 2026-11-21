import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  AlertCircle,
  Check,
  Cpu,
  Download,
  Info,
  Palette,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Wand2,
} from 'lucide-react';
import { AppContext } from '../../context/AppContext';
import ToolDropzone from '../../components/tools/ToolDropzone';
import ToolFileList from '../../components/tools/ToolFileList';
import { ImageBeforeAfterPreview } from '../../components/tools/ToolPreview';
import ToolProgress from '../../components/tools/ToolProgress';
import ToolResultBar from '../../components/tools/ToolResultBar';
import ToolShell from '../../components/tools/ToolShell';
import {
  MAX_AI_DIMENSION,
  compositeCutoutBackground,
  removeImageBackground,
} from '../../utils/bgRemovalService';
import {
  MAX_BG_IMAGE_BYTES,
  cleanBaseName,
  formatBytes,
  toFriendlyErrorMessage,
  validateUploadedFiles,
} from '../../utils/fileValidation';
import { useToolSettings } from '../../utils/toolPrefs';
import { createUrlRegistry, downloadBlob, downloadItemsAsZip } from '../../utils/zipUtils';

const MAX_BATCH_FILES = 10;

const DEFAULT_SETTINGS = {
  modelQuality: 'high',
  bgMode: 'transparent',
  customColor: '#00c9ff',
  outputFormat: 'image/png',
};

const QUICK_SWATCHES = [
  { hex: '#ffffff', label: 'Pure White' },
  { hex: '#f8fafc', label: 'Soft Off-White' },
  { hex: '#0f172a', label: 'Deep Slate' },
  { hex: '#00c9ff', label: 'LyZov Cyan' },
  { hex: '#fef08a', label: 'Soft Lemon' },
  { hex: '#fce7f3', label: 'Blush Pink' },
];

const MODEL_MODES = [
  {
    value: 'high',
    title: 'Balanced / High Quality',
    subtitle: 'Sharper edges for products, hair & fine details (~80 MB first download)',
  },
  {
    value: 'fast',
    title: 'Fast / Lighter Download',
    subtitle: '2× smaller ~40 MB download & faster processing on mobile/older devices',
  },
];

const BG_MODES = [
  {
    value: 'transparent',
    title: 'Transparent (PNG)',
    subtitle: 'See-through cutout ready for designs & overlays',
  },
  {
    value: 'white',
    title: 'Clean White (#ffffff)',
    subtitle: 'Marketplace-ready studio white background',
  },
  {
    value: 'custom',
    title: 'Custom Solid Color',
    subtitle: 'Pick any brand color or swatch below',
  },
];

function buildOutputFilename(originalName, bgMode, outputFormat) {
  const stem = cleanBaseName(originalName, 'image');
  const ext = bgMode !== 'transparent' && outputFormat === 'image/jpeg' ? 'jpg' : 'png';
  return `${stem}_no_bg.${ext}`;
}

function isLightHex(hex) {
  const cleaned = String(hex || '').replace('#', '');
  if (cleaned.length !== 6) return false;
  const r = parseInt(cleaned.slice(0, 2), 16);
  const g = parseInt(cleaned.slice(2, 4), 16);
  const b = parseInt(cleaned.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.65;
}

export default function BackgroundRemoverPage() {
  const { theme } = useContext(AppContext);
  const isDark = theme === 'dark';
  const accent = isDark ? '#ec4899' : '#db2777';

  const [settings, setSettings] = useToolSettings('background_remover', DEFAULT_SETTINGS);

  const [queueItems, setQueueItems] = useState([]);
  const [uploadErrors, setUploadErrors] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressState, setProgressState] = useState({
    currentIndex: 0,
    total: 0,
    fileName: '',
    stageLabel: '',
    fileRatio: 0,
  });

  const [results, setResults] = useState([]);
  const [selectedResultIdx, setSelectedResultIdx] = useState(0);
  const [isUpdatingBg, setIsUpdatingBg] = useState(false);
  const [zipping, setZipping] = useState(false);
  const [actionError, setActionError] = useState('');

  const urlRegistryRef = useRef(null);
  const getUrlRegistry = () => {
    if (!urlRegistryRef.current) {
      urlRegistryRef.current = createUrlRegistry();
    }
    return urlRegistryRef.current;
  };

  const isMountedRef = useRef(true);
  const resultsRef = useRef(results);

  const lastCompositedKeyRef = useRef('');
  const compositeVersionRef = useRef(0);
  const processingRunRef = useRef(0);

  const effectiveFormat = settings.bgMode === 'transparent' ? 'image/png' : settings.outputFormat;
  const effectiveExt = effectiveFormat === 'image/jpeg' ? 'jpg' : 'png';
  const bgSignature = `${settings.bgMode}|${settings.customColor}|${effectiveFormat}`;

  useEffect(() => {
    resultsRef.current = results;
  }, [results]);

  useEffect(() => {
    isMountedRef.current = true;
    const registry = getUrlRegistry();
    return () => {
      isMountedRef.current = false;
      processingRunRef.current += 1;
      compositeVersionRef.current += 1;
      registry.revokeAll();
    };
  }, []);

  // Re-composite background colors instantly after AI inference without re-running the AI model
  useEffect(() => {
    if (isProcessing || resultsRef.current.length === 0) return undefined;
    if (lastCompositedKeyRef.current === bgSignature) return undefined;

    const version = ++compositeVersionRef.current;
    const timerId = setTimeout(async () => {
      if (
        !isMountedRef.current ||
        compositeVersionRef.current !== version ||
        resultsRef.current.length === 0
      ) {
        return;
      }
      setIsUpdatingBg(true);
      setActionError('');

      const registry = getUrlRegistry();
      const snapshot = resultsRef.current;
      const createdUrls = [];
      const oldUrlsToRevoke = [];

      try {
        const updatedList = [];
        for (const item of snapshot) {
          if (!item.cutoutBlob || item.error) {
            updatedList.push(item);
            continue;
          }

          const nextBlob = await compositeCutoutBackground(item.cutoutBlob, {
            bgMode: settings.bgMode,
            customColor: settings.customColor,
            outputFormat: effectiveFormat,
          });

          if (!isMountedRef.current || compositeVersionRef.current !== version) {
            for (const u of createdUrls) {
              registry.revoke(u);
            }
            return;
          }

          const nextUrl = registry.create(nextBlob);
          if (nextUrl) createdUrls.push(nextUrl);
          if (item.afterUrl) oldUrlsToRevoke.push(item.afterUrl);

          updatedList.push({
            ...item,
            outputBlob: nextBlob,
            afterUrl: nextUrl,
          });
        }

        if (!isMountedRef.current || compositeVersionRef.current !== version) {
          for (const u of createdUrls) {
            registry.revoke(u);
          }
          return;
        }

        lastCompositedKeyRef.current = bgSignature;
        setResults(updatedList);
        for (const oldUrl of oldUrlsToRevoke) {
          registry.revoke(oldUrl);
        }
      } catch (err) {
        for (const u of createdUrls) {
          registry.revoke(u);
        }
        if (isMountedRef.current) {
          setActionError(
            toFriendlyErrorMessage(err, 'Could not update the background color. Please try again.')
          );
        }
      } finally {
        if (isMountedRef.current && compositeVersionRef.current === version) {
          setIsUpdatingBg(false);
        }
      }
    }, 60);

    return () => {
      clearTimeout(timerId);
      compositeVersionRef.current += 1;
    };
  }, [bgSignature, effectiveFormat, isProcessing, results.length, settings.bgMode, settings.customColor]);

  const revokeResultUrls = (resultList) => {
    const registry = getUrlRegistry();
    for (const item of resultList) {
      if (item?.afterUrl) {
        registry.revoke(item.afterUrl);
      }
    }
  };

  const handleFilesSelected = async (fileList) => {
    setUploadErrors([]);
    setActionError('');

    const remainingSlots = MAX_BATCH_FILES - queueItems.length;
    if (remainingSlots <= 0) {
      setUploadErrors([
        `Maximum ${MAX_BATCH_FILES} images can be processed in one batch. Clear or remove a file first.`,
      ]);
      return;
    }

    const { valid, errors } = await validateUploadedFiles(fileList, {
      allowedTypes: ['jpeg', 'png', 'webp'],
      maxFileSizeBytes: MAX_BG_IMAGE_BYTES,
      maxFiles: MAX_BATCH_FILES,
      formatLabel: 'image (JPG, PNG, or WEBP)',
    });

    const nextErrors = [...errors];
    let accepted = valid;
    if (valid.length > remainingSlots) {
      accepted = valid.slice(0, remainingSlots);
      nextErrors.push(
        `Maximum ${MAX_BATCH_FILES} images can be processed in one batch. Extra files were skipped.`
      );
    }

    if (nextErrors.length > 0) {
      setUploadErrors(nextErrors);
    }

    if (accepted.length === 0) return;

    if (results.length > 0) {
      revokeResultUrls(results);
      setResults([]);
      setSelectedResultIdx(0);
      lastCompositedKeyRef.current = '';
    }

    const registry = getUrlRegistry();
    const mapped = accepted.map(({ file, detectedType }, idx) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${idx}`,
      file,
      name: file.name,
      size: file.size,
      kind: 'image',
      detectedType,
      previewUrl: registry.create(file),
    }));

    setQueueItems((prev) => [...prev, ...mapped]);
  };

  const handleRemoveQueueItem = (idx) => {
    if (isProcessing) return;
    setActionError('');
    const registry = getUrlRegistry();
    setQueueItems((prev) => {
      const target = prev[idx];
      if (target?.previewUrl) {
        registry.revoke(target.previewUrl);
      }
      return prev.filter((_, i) => i !== idx);
    });
  };

  const handleClearAll = () => {
    if (isProcessing) return;
    compositeVersionRef.current += 1;
    getUrlRegistry().revokeAll();
    setQueueItems([]);
    setResults([]);
    setSelectedResultIdx(0);
    setUploadErrors([]);
    setActionError('');
    lastCompositedKeyRef.current = '';
  };

  const handleRemoveBackground = async () => {
    if (queueItems.length === 0 || isProcessing) return;

    const registry = getUrlRegistry();
    const runId = ++processingRunRef.current;
    compositeVersionRef.current += 1;
    revokeResultUrls(results);
    setResults([]);
    setSelectedResultIdx(0);
    setActionError('');
    setUploadErrors([]);
    setIsProcessing(true);

    const processedList = [];
    const total = queueItems.length;

    for (let idx = 0; idx < total; idx += 1) {
      if (!isMountedRef.current || processingRunRef.current !== runId) {
        revokeResultUrls(processedList);
        return;
      }

      const item = queueItems[idx];
      setProgressState({
        currentIndex: idx,
        total,
        fileName: item.name,
        stageLabel: 'Starting AI segmentation...',
        fileRatio: 0.02,
      });

      try {
        const aiResult = await removeImageBackground(item.file, {
          modelQuality: settings.modelQuality,
          onProgress: (stageLabel, ratio) => {
            if (!isMountedRef.current || processingRunRef.current !== runId) return;
            setProgressState({
              currentIndex: idx,
              total,
              fileName: item.name,
              stageLabel,
              fileRatio: ratio,
            });
          },
        });

        if (!isMountedRef.current || processingRunRef.current !== runId) {
          revokeResultUrls(processedList);
          return;
        }

        const outputBlob = await compositeCutoutBackground(aiResult.cutoutBlob, {
          bgMode: settings.bgMode,
          customColor: settings.customColor,
          outputFormat: effectiveFormat,
        });

        const afterUrl = registry.create(outputBlob);
        processedList.push({
          id: item.id,
          name: item.name,
          originalSize: item.size,
          beforeUrl: item.previewUrl,
          cutoutBlob: aiResult.cutoutBlob,
          outputBlob,
          afterUrl,
          width: aiResult.width,
          height: aiResult.height,
          originalWidth: aiResult.originalWidth,
          originalHeight: aiResult.originalHeight,
          wasDownscaled: aiResult.wasDownscaled,
          error: null,
        });
      } catch (err) {
        processedList.push({
          id: item.id,
          name: item.name,
          originalSize: item.size,
          beforeUrl: item.previewUrl,
          cutoutBlob: null,
          outputBlob: null,
          afterUrl: null,
          width: 0,
          height: 0,
          originalWidth: 0,
          originalHeight: 0,
          wasDownscaled: false,
          error: toFriendlyErrorMessage(
            err,
            'Could not remove the background for this image. Please try another photo.'
          ),
        });
      }
    }

    if (!isMountedRef.current || processingRunRef.current !== runId) {
      revokeResultUrls(processedList);
      return;
    }

    lastCompositedKeyRef.current = bgSignature;
    const firstSuccessIdx = processedList.findIndex((entry) => !entry.error);
    setSelectedResultIdx(firstSuccessIdx >= 0 ? firstSuccessIdx : 0);
    setResults(processedList);
    setIsProcessing(false);
  };

  const successfulResults = useMemo(
    () => results.filter((item) => !item.error && item.outputBlob),
    [results]
  );

  const failedResults = useMemo(() => results.filter((item) => Boolean(item.error)), [results]);
  const downscaledCount = useMemo(
    () => successfulResults.filter((item) => item.wasDownscaled).length,
    [successfulResults]
  );

  const activeResult = results[selectedResultIdx] || results[0] || null;

  const handleDownloadSingleResult = (resultItem) => {
    if (!resultItem?.outputBlob) return;
    downloadBlob(
      resultItem.outputBlob,
      buildOutputFilename(resultItem.name, settings.bgMode, effectiveFormat)
    );
  };

  const handleDownloadAllZip = async () => {
    if (successfulResults.length === 0 || zipping) return;
    setZipping(true);
    setActionError('');
    try {
      const zipEntries = successfulResults.map((item) => ({
        blob: item.outputBlob,
        filename: buildOutputFilename(item.name, settings.bgMode, effectiveFormat),
      }));
      await downloadItemsAsZip(zipEntries, `lyzov_cutouts_${Date.now()}.zip`);
    } catch (err) {
      setActionError(toFriendlyErrorMessage(err, 'Could not create the ZIP file. Please try again.'));
    } finally {
      if (isMountedRef.current) {
        setZipping(false);
      }
    }
  };

  const cardBg = isDark ? 'rgba(255, 255, 255, 0.03)' : 'background.paper';
  const optionActiveBg = isDark ? 'rgba(236, 72, 153, 0.14)' : 'rgba(219, 39, 119, 0.08)';

  const renderBackgroundOptions = (showInstantBadge = false) => (
    <Box>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 1,
          mb: 1.5,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Palette size={17} color={accent} />
          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary' }}>
            Background Replacement
          </Typography>
        </Box>
        {showInstantBadge && (
          <Chip
            icon={<Sparkles size={13} color={isDark ? '#00d68f' : '#00a86b'} />}
            label="Instant preview · No AI re-run needed"
            size="small"
            sx={{
              fontWeight: 700,
              fontSize: '0.72rem',
              bgcolor: isDark ? 'rgba(0, 214, 143, 0.14)' : 'rgba(0, 168, 107, 0.1)',
              color: isDark ? '#00d68f' : '#00a86b',
            }}
          />
        )}
      </Box>

      {/* Background mode cards */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
          gap: 1.25,
        }}
      >
        {BG_MODES.map((mode) => {
          const selected = settings.bgMode === mode.value;
          return (
            <Box
              key={mode.value}
              component="button"
              type="button"
              disabled={isProcessing}
              aria-pressed={selected}
              onClick={() => setSettings((prev) => ({ ...prev, bgMode: mode.value }))}
              sx={{
                textAlign: 'left',
                p: 1.5,
                borderRadius: 2.5,
                border: '1.5px solid',
                borderColor: selected ? accent : 'divider',
                bgcolor: selected ? optionActiveBg : 'transparent',
                cursor: isProcessing ? 'not-allowed' : 'pointer',
                transition: 'all 0.18s ease',
                display: 'flex',
                flexDirection: 'column',
                gap: 0.4,
                fontFamily: 'inherit',
                '&:hover': isProcessing
                  ? undefined
                  : {
                      borderColor: accent,
                    },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                  {mode.title}
                </Typography>
                {selected && <Check size={15} color={accent} />}
              </Box>
              <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.4 }}>
                {mode.subtitle}
              </Typography>
            </Box>
          );
        })}
      </Box>

      {/* Custom solid color picker + quick swatches */}
      {settings.bgMode === 'custom' && (
        <Box
          sx={{
            mt: 2,
            p: 1.75,
            borderRadius: 2.5,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.015)',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            <Box
              component="label"
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 1,
                px: 1.4,
                py: 0.75,
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: isDark ? 'rgba(255,255,255,0.04)' : '#ffffff',
                cursor: isProcessing ? 'not-allowed' : 'pointer',
              }}
            >
              <input
                type="color"
                aria-label="Pick custom background color"
                disabled={isProcessing}
                value={settings.customColor}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    bgMode: 'custom',
                    customColor: e.target.value,
                  }))
                }
                style={{
                  width: 26,
                  height: 26,
                  border: 'none',
                  padding: 0,
                  background: 'transparent',
                  cursor: isProcessing ? 'not-allowed' : 'pointer',
                }}
              />
              <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary', fontFamily: 'monospace' }}>
                {String(settings.customColor || '#00c9ff').toUpperCase()}
              </Typography>
            </Box>

            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
              Quick Swatches:
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              {QUICK_SWATCHES.map((swatch) => {
                const isSelected =
                  String(settings.customColor || '').toLowerCase() === swatch.hex.toLowerCase();
                return (
                  <Tooltip key={swatch.hex} title={`${swatch.label} (${swatch.hex})`}>
                    <Box
                      component="button"
                      type="button"
                      disabled={isProcessing}
                      aria-label={`Select ${swatch.label} (${swatch.hex})`}
                      aria-pressed={isSelected}
                      onClick={() =>
                        setSettings((prev) => ({
                          ...prev,
                          bgMode: 'custom',
                          customColor: swatch.hex,
                        }))
                      }
                      sx={{
                        width: 30,
                        height: 30,
                        borderRadius: '50%',
                        bgcolor: swatch.hex,
                        border: '2px solid',
                        borderColor: isSelected ? accent : 'divider',
                        boxShadow: isSelected ? `0 0 0 2px ${accent}55` : 'none',
                        cursor: isProcessing ? 'not-allowed' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        p: 0,
                        transition: 'transform 0.15s ease',
                        '&:hover': isProcessing ? undefined : { transform: 'scale(1.08)' },
                        '&:focus-visible': {
                          outline: `2px solid ${accent}`,
                          outlineOffset: 2,
                        },
                      }}
                    >
                      {isSelected && (
                        <Check
                          size={14}
                          color={isLightHex(swatch.hex) ? '#0f172a' : '#ffffff'}
                        />
                      )}
                    </Box>
                  </Tooltip>
                );
              })}
            </Box>
          </Box>
        </Box>
      )}

      {/* Output format selection for solid backgrounds */}
      <Box
        sx={{
          mt: 2,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1.5,
        }}
      >
        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
          {settings.bgMode === 'transparent'
            ? 'Transparent cutouts always export as PNG to preserve transparency.'
            : 'Choose download file format for your solid-background image:'}
        </Typography>

        {settings.bgMode !== 'transparent' && (
          <ToggleButtonGroup
            size="small"
            exclusive
            disabled={isProcessing}
            value={settings.outputFormat}
            onChange={(_, nextFormat) => {
              if (nextFormat) {
                setSettings((prev) => ({ ...prev, outputFormat: nextFormat }));
              }
            }}
            aria-label="Output image format"
          >
            <ToggleButton value="image/png" sx={{ px: 2, fontWeight: 700, textTransform: 'none' }}>
              PNG (Lossless)
            </ToggleButton>
            <ToggleButton value="image/jpeg" sx={{ px: 2, fontWeight: 700, textTransform: 'none' }}>
              JPG (Smaller Size)
            </ToggleButton>
          </ToggleButtonGroup>
        )}
      </Box>
    </Box>
  );

  const hasResults = results.length > 0 && !isProcessing;

  const resultSubtitle = useMemo(() => {
    const modeLabel =
      settings.bgMode === 'transparent'
        ? 'Transparent PNG'
        : settings.bgMode === 'white'
          ? `Clean White (${effectiveExt.toUpperCase()})`
          : `Custom Color ${String(settings.customColor).toUpperCase()} (${effectiveExt.toUpperCase()})`;
    const downscaleNote =
      downscaledCount > 0
        ? ` · ${downscaledCount} oversized ${downscaledCount === 1 ? 'photo' : 'photos'} scaled to ≤${MAX_AI_DIMENSION}px for browser stability`
        : '';
    return `${modeLabel}${downscaleNote}`;
  }, [downscaledCount, effectiveExt, settings.bgMode, settings.customColor]);

  return (
    <ToolShell
      title="AI Background Remover"
      seoTitle="Free AI Background Remover — Transparent & White Background | LyZov Tools"
      description="Remove backgrounds from product photos, portraits, and graphics directly in your browser using on-device AI. Export transparent PNGs, studio white, or custom solid colors."
      canonical="https://tools.lyzov.com/background-remover"
      privacyLabel="100% Private · On-device AI in your browser (zero uploads)"
      accentColor={accent}
      icon={Wand2}
    >
      {/* Informative AI & Browser Limits Banner */}
      <Alert
        severity="info"
        icon={<Info size={20} />}
        sx={{
          borderRadius: 3,
          border: '1px solid',
          borderColor: isDark ? 'rgba(0, 201, 255, 0.25)' : 'rgba(2, 132, 199, 0.22)',
          bgcolor: isDark ? 'rgba(0, 201, 255, 0.06)' : 'rgba(2, 132, 199, 0.05)',
          color: 'text.primary',
          '& .MuiAlert-icon': { color: isDark ? '#00c9ff' : '#0284c7', alignItems: 'flex-start', pt: 0.4 },
        }}
      >
        <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.4 }}>
          How on-device AI background removal works
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', lineHeight: 1.55 }}>
          • Runs a genuine AI segmentation model locally in your browser — your photos are never uploaded to any server.
          <br />
          • First run downloads ~40–80 MB of AI model files once (cached by your browser afterward for faster repeat runs).
          <br />
          • Limits: up to 15 MB per image, up to {MAX_BATCH_FILES} images per batch; oversized photos above {MAX_AI_DIMENSION}px are safely scaled for browser stability.
        </Typography>
      </Alert>

      {/* Step 1: Choose Files (shown before results; compact when files are queued) */}
      {!hasResults && !isProcessing && (
        <ToolDropzone
          title={queueItems.length > 0 ? 'Add more photos to your batch' : 'Drop your photos here'}
          subtitle={`Supports JPG, PNG, and WEBP · Up to ${MAX_BATCH_FILES} images per batch (max 15 MB each)`}
          buttonLabel={queueItems.length > 0 ? 'Add More Images' : 'Choose Images'}
          accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
          multiple={true}
          disabled={isProcessing || queueItems.length >= MAX_BATCH_FILES}
          accentColor={accent}
          errorMessages={uploadErrors}
          onClearErrors={() => setUploadErrors([])}
          onFilesSelected={handleFilesSelected}
          compact={queueItems.length > 0}
        />
      )}

      {/* Selected File Queue */}
      {!hasResults && !isProcessing && queueItems.length > 0 && (
        <ToolFileList
          items={queueItems}
          title="Selected Images"
          disabled={isProcessing}
          onRemoveItem={handleRemoveQueueItem}
          onClearAll={handleClearAll}
          renderMeta={(item) => item.detectedType?.toUpperCase() || 'IMAGE'}
        />
      )}

      {/* Step 2: Options (shown before processing when queue has files, or always accessible) */}
      {!hasResults && !isProcessing && (
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, sm: 3 },
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: cardBg,
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
          }}
        >
          {/* AI Model Quality */}
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <Cpu size={17} color={accent} />
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary' }}>
                AI Model Quality
              </Typography>
            </Box>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
                gap: 1.25,
              }}
            >
              {MODEL_MODES.map((option) => {
                const selected = settings.modelQuality === option.value;
                return (
                  <Box
                    key={option.value}
                    component="button"
                    type="button"
                    aria-pressed={selected}
                    onClick={() =>
                      setSettings((prev) => ({ ...prev, modelQuality: option.value }))
                    }
                    sx={{
                      textAlign: 'left',
                      p: 1.5,
                      borderRadius: 2.5,
                      border: '1.5px solid',
                      borderColor: selected ? accent : 'divider',
                      bgcolor: selected ? optionActiveBg : 'transparent',
                      cursor: 'pointer',
                      transition: 'all 0.18s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 0.4,
                      fontFamily: 'inherit',
                      '&:hover': { borderColor: accent },
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                        {option.title}
                      </Typography>
                      {selected && <Check size={15} color={accent} />}
                    </Box>
                    <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.4 }}>
                      {option.subtitle}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          </Box>

          {/* Background Replacement Options */}
          {renderBackgroundOptions(false)}
        </Paper>
      )}

      {/* Step 3: Main Action Button */}
      {!hasResults && !isProcessing && queueItems.length > 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <Button
            variant="contained"
            size="large"
            startIcon={<Wand2 size={20} />}
            onClick={handleRemoveBackground}
            sx={{
              py: 1.5,
              px: 4.5,
              fontWeight: 800,
              fontSize: '1rem',
              textTransform: 'none',
              borderRadius: 3,
              color: '#ffffff',
              background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
              boxShadow: '0 8px 24px rgba(236, 72, 153, 0.35)',
              '&:hover': {
                background: 'linear-gradient(135deg, #db2777 0%, #7c3aed 100%)',
              },
            }}
          >
            {queueItems.length === 1
              ? 'Remove Background'
              : `Remove Background (${queueItems.length} Images)`}
          </Button>
        </Box>
      )}

      {/* Step 4a: Processing Progress */}
      {isProcessing && (
        <ToolProgress
          title={`Processing image ${progressState.currentIndex + 1} of ${progressState.total}...`}
          subtitle={`${progressState.fileName} — ${progressState.stageLabel}`}
          current={progressState.currentIndex + progressState.fileRatio}
          total={progressState.total}
          accentColor={accent}
        />
      )}

      {/* General action error alert */}
      {actionError && (
        <Alert severity="error" onClose={() => setActionError('')} sx={{ borderRadius: 2.5 }}>
          {actionError}
        </Alert>
      )}

      {/* Step 4b & 5: Results View (Live Background Switcher + Preview + ToolResultBar) */}
      {hasResults && (
        <>
          {/* Live Background Replacement Controls (updates preview & blobs without AI re-run) */}
          {successfulResults.length > 0 && (
            <Paper
              elevation={0}
              sx={{
                p: { xs: 2, sm: 2.5 },
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: cardBg,
              }}
            >
              {renderBackgroundOptions(true)}
            </Paper>
          )}

          {/* Batch Item Switcher + Selected Preview Header */}
          {results.length > 1 && (
            <Paper
              elevation={0}
              sx={{
                p: { xs: 1.5, sm: 2 },
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: cardBg,
              }}
            >
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 1 }}>
                Select an image to preview ({results.length} total):
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {results.map((item, idx) => {
                  const active = idx === selectedResultIdx;
                  const failed = Boolean(item.error);
                  return (
                    <Box
                      key={item.id}
                      component="button"
                      type="button"
                      onClick={() => setSelectedResultIdx(idx)}
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 1,
                        px: 1.25,
                        py: 0.75,
                        borderRadius: 2,
                        border: '1.5px solid',
                        borderColor: failed ? '#ef4444' : active ? accent : 'divider',
                        bgcolor: active ? optionActiveBg : 'transparent',
                        color: 'text.primary',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        maxWidth: 220,
                      }}
                    >
                      <Box
                        component="img"
                        src={item.afterUrl || item.beforeUrl}
                        alt={item.name}
                        sx={{
                          width: 28,
                          height: 28,
                          borderRadius: 1,
                          objectFit: 'cover',
                          flexShrink: 0,
                          bgcolor: isDark ? '#0b1020' : '#f1f5f9',
                        }}
                      />
                      <Typography variant="caption" noWrap sx={{ fontWeight: active ? 700 : 600, color: 'text.primary' }}>
                        {item.name}
                      </Typography>
                      {failed && <AlertCircle size={14} color="#ef4444" />}
                    </Box>
                  );
                })}
              </Box>
            </Paper>
          )}

          {/* Active Preview Item */}
          {activeResult && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {activeResult.error ? (
                <Alert severity="error" sx={{ borderRadius: 2.5 }}>
                  <strong>{activeResult.name}:</strong> {activeResult.error}
                </Alert>
              ) : (
                <>
                  {/* Individual Download & Metadata Header */}
                  <Box
                    sx={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 1.5,
                      px: 0.5,
                    }}
                  >
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                        {activeResult.name}
                      </Typography>
                      {activeResult.wasDownscaled && (
                        <Chip
                          label={`Scaled from ${activeResult.originalWidth}×${activeResult.originalHeight} to ≤${MAX_AI_DIMENSION}px`}
                          size="small"
                          sx={{
                            fontWeight: 600,
                            fontSize: '0.7rem',
                            bgcolor: isDark ? 'rgba(245, 166, 35, 0.14)' : 'rgba(245, 166, 35, 0.12)',
                            color: isDark ? '#fbbf24' : '#b45309',
                          }}
                        />
                      )}
                      {isUpdatingBg && (
                        <Chip
                          icon={<CircularProgress size={12} />}
                          label="Updating background..."
                          size="small"
                          sx={{ fontWeight: 600, fontSize: '0.72rem' }}
                        />
                      )}
                    </Box>

                    <Button
                      size="small"
                      variant="outlined"
                      disabled={isUpdatingBg}
                      startIcon={<Download size={15} />}
                      onClick={() => handleDownloadSingleResult(activeResult)}
                      sx={{
                        textTransform: 'none',
                        fontWeight: 700,
                        borderRadius: 2,
                        borderColor: accent,
                        color: accent,
                        '&:hover': {
                          borderColor: accent,
                          bgcolor: optionActiveBg,
                        },
                      }}
                    >
                      Download This {effectiveExt.toUpperCase()}
                    </Button>
                  </Box>

                  <ImageBeforeAfterPreview
                    beforeUrl={activeResult.beforeUrl}
                    afterUrl={activeResult.afterUrl}
                    beforeLabel="Original"
                    afterLabel="Background Removed"
                    beforeMeta={formatBytes(activeResult.originalSize)}
                    afterMeta={`${activeResult.width}×${activeResult.height} · ${formatBytes(
                      activeResult.outputBlob?.size || 0
                    )}`}
                    transparentBackdrop={settings.bgMode === 'transparent'}
                    solidBgColor={
                      settings.bgMode === 'white'
                        ? '#ffffff'
                        : settings.bgMode === 'custom'
                          ? settings.customColor
                          : null
                    }
                  />
                </>
              )}
            </Box>
          )}

          {/* Failed items summary if any */}
          {failedResults.length > 0 && successfulResults.length === 0 && (
            <Paper
              elevation={0}
              sx={{
                p: 3,
                borderRadius: 3,
                border: '1px solid rgba(239, 68, 68, 0.35)',
                bgcolor: isDark ? 'rgba(239, 68, 68, 0.06)' : 'rgba(239, 68, 68, 0.04)',
                display: 'flex',
                flexDirection: 'column',
                gap: 1.5,
                alignItems: 'flex-start',
              }}
            >
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary' }}>
                Could not process the selected {failedResults.length === 1 ? 'image' : 'images'}
              </Typography>
              {failedResults.map((item) => (
                <Typography key={item.id} variant="body2" sx={{ color: 'text.secondary' }}>
                  • <strong>{item.name}</strong>: {item.error}
                </Typography>
              ))}
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.2, mt: 0.5 }}>
                <Button
                  variant="contained"
                  startIcon={<RefreshCw size={16} />}
                  onClick={handleRemoveBackground}
                  sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
                >
                  Retry
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<RotateCcw size={16} />}
                  onClick={handleClearAll}
                  sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
                >
                  Choose Different Images
                </Button>
              </Box>
            </Paper>
          )}

          {/* Standardized Result Bar */}
          {successfulResults.length > 0 && (
            <ToolResultBar
              title={
                successfulResults.length === 1
                  ? 'Your cutout is ready to download'
                  : `${successfulResults.length} cutouts are ready to download`
              }
              subtitle={resultSubtitle}
              count={successfulResults.length}
              singleLabel={`Download ${effectiveExt.toUpperCase()}`}
              zipLabel="Download All (.ZIP)"
              resetLabel="Process More Files"
              onDownloadSingle={() => handleDownloadSingleResult(successfulResults[0])}
              onDownloadAllZip={handleDownloadAllZip}
              onReset={handleClearAll}
              zipping={zipping}
              warningMessage={
                failedResults.length > 0
                  ? `${failedResults.length} of ${results.length} images failed (${failedResults
                      .map((f) => f.name)
                      .join(', ')}). The remaining ${successfulResults.length} images succeeded.`
                  : ''
              }
            />
          )}
        </>
      )}
    </ToolShell>
  );
}
