import React, { useContext, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Grid,
  Paper,
  Slider,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { ArrowRight, Download, RefreshCw } from 'lucide-react';
import { AppContext } from '../../context/AppContext';
import ToolShell from '../../components/tools/ToolShell';
import ToolDropzone from '../../components/tools/ToolDropzone';
import ToolFileList from '../../components/tools/ToolFileList';
import ToolProgress from '../../components/tools/ToolProgress';
import { ImageBeforeAfterPreview } from '../../components/tools/ToolPreview';
import ToolResultBar from '../../components/tools/ToolResultBar';
import {
  MAX_IMAGE_FILE_BYTES,
  formatBytes,
  toFriendlyErrorMessage,
  validateUploadedFiles,
} from '../../utils/fileValidation';
import { createUrlRegistry, downloadBlob, downloadItemsAsZip } from '../../utils/zipUtils';
import { useToolSettings } from '../../utils/toolPrefs';
import {
  IMAGE_MIME_LABELS,
  buildImageOutputFilename,
  convertImageFile,
  inferImageMime,
  readImageMetadata,
} from '../../utils/imageProcessing';

const OUTPUT_FORMATS = [
  { mime: 'image/png', label: 'PNG', hint: 'Lossless · Keeps transparency' },
  { mime: 'image/jpeg', label: 'JPG', hint: 'Smaller photos · Solid fill' },
  { mime: 'image/webp', label: 'WEBP', hint: 'Modern web · Small + alpha' },
];

const BG_COLOR_SWATCHES = [
  { label: 'White', color: '#ffffff' },
  { label: 'Light Gray', color: '#f1f5f9' },
  { label: 'Black', color: '#000000' },
];

const MAX_BATCH_FILES = 50;

const DEFAULT_SETTINGS = {
  outputMime: 'image/png',
  quality: 92,
  backgroundColor: '#ffffff',
};

export default function ImageConverterPage() {
  const { theme } = useContext(AppContext);
  const isDark = theme === 'dark';
  const accent = isDark ? '#a78bfa' : '#7c3aed';

  const [settings, setSettings] = useToolSettings('image_converter', DEFAULT_SETTINGS);
  const [files, setFiles] = useState([]);
  const [uploadErrors, setUploadErrors] = useState([]);
  const [processError, setProcessError] = useState('');
  const [warningMessage, setWarningMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, label: '' });
  const [results, setResults] = useState([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [zipping, setZipping] = useState(false);

  const inputUrlsRef = useRef(createUrlRegistry());
  const resultUrlsRef = useRef(createUrlRegistry());

  useEffect(() => {
    const inputRegistry = inputUrlsRef.current;
    const resultRegistry = resultUrlsRef.current;
    return () => {
      inputRegistry.revokeAll();
      resultRegistry.revokeAll();
    };
  }, []);

  const updateSettings = (patch) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  };

  const handleFilesSelected = async (fileList) => {
    setUploadErrors([]);
    setProcessError('');

    const remainingSlots = MAX_BATCH_FILES - files.length;
    if (remainingSlots <= 0) {
      setUploadErrors([`Maximum ${MAX_BATCH_FILES} images can be queued at once. Clear or remove some files first.`]);
      return;
    }

    const { valid, errors } = await validateUploadedFiles(fileList, {
      allowedTypes: ['jpeg', 'png', 'webp', 'bmp'],
      maxFileSizeBytes: MAX_IMAGE_FILE_BYTES,
      maxFiles: remainingSlots,
      formatLabel: 'image (JPG, PNG, WEBP, or BMP)',
    });

    const nextErrors = [...errors];
    const decodedItems = [];

    for (const entry of valid) {
      try {
        const meta = await readImageMetadata(entry.file);
        const previewUrl = inputUrlsRef.current.create(entry.file);
        decodedItems.push({
          id: `${entry.file.name}-${entry.file.size}-${Date.now()}-${Math.random()}`,
          file: entry.file,
          name: entry.file.name,
          size: entry.file.size,
          kind: 'image',
          previewUrl,
          width: meta.width,
          height: meta.height,
          mime: inferImageMime(entry.file),
        });
      } catch {
        nextErrors.push(`Could not read "${entry.file.name}". The image may be corrupted.`);
      }
    }

    if (nextErrors.length > 0) {
      setUploadErrors(nextErrors);
    }

    if (decodedItems.length > 0) {
      setFiles((prev) => [...prev, ...decodedItems]);
    }
  };

  const handleRemoveFile = (idx) => {
    const target = files[idx];
    if (!target) return;
    if (results.some((r) => r.id === target.id)) {
      const nextResults = results.filter((r) => {
        if (r.id === target.id) {
          resultUrlsRef.current.revoke(r.afterUrl);
          return false;
        }
        return true;
      });
      setResults(nextResults);
      setPreviewIndex((pIdx) => Math.min(pIdx, Math.max(0, nextResults.length - 1)));
    }
    if (target.previewUrl) {
      inputUrlsRef.current.revoke(target.previewUrl);
    }
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleClearAll = () => {
    inputUrlsRef.current.revokeAll();
    resultUrlsRef.current.revokeAll();
    setFiles([]);
    setResults([]);
    setPreviewIndex(0);
    setUploadErrors([]);
    setProcessError('');
    setWarningMessage('');
  };

  const handleConvertAll = async () => {
    if (files.length === 0 || isProcessing) return;

    resultUrlsRef.current.revokeAll();
    setResults([]);
    setPreviewIndex(0);
    setProcessError('');
    setWarningMessage('');
    setIsProcessing(true);
    setProgress({ current: 0, total: files.length, label: 'Starting conversion...' });

    const nextResults = [];
    const failedMessages = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const item = files[i];
        setProgress({
          current: i,
          total: files.length,
          label: `Converting ${item.name} (${i + 1} of ${files.length})`,
        });

        try {
          const output = await convertImageFile(item.file, {
            outputMime: settings.outputMime,
            quality: Number(settings.quality) || 92,
            backgroundColor: settings.backgroundColor || '#ffffff',
          });

          const afterUrl = resultUrlsRef.current.create(output.blob);
          const filename = buildImageOutputFilename(item.name, '', output.ext);

          nextResults.push({
            id: item.id,
            name: item.name,
            filename,
            sourceLabel: IMAGE_MIME_LABELS[item.mime] || 'IMG',
            targetLabel: IMAGE_MIME_LABELS[output.mime] || output.ext.toUpperCase(),
            backgroundColor: settings.outputMime === 'image/jpeg' ? settings.backgroundColor : null,
            beforeUrl: item.previewUrl,
            afterUrl,
            ...output,
          });
        } catch (err) {
          failedMessages.push(`${item.name}: ${toFriendlyErrorMessage(err)}`);
        }

        setProgress({
          current: i + 1,
          total: files.length,
          label: `Completed ${i + 1} of ${files.length}`,
        });
      }

      if (nextResults.length === 0) {
        setProcessError(failedMessages[0] || 'Could not convert your images. Please try another file.');
      } else {
        setResults(nextResults);
        if (failedMessages.length > 0) {
          setWarningMessage(
            `${failedMessages.length} file(s) failed: ${failedMessages.join(' · ')}`
          );
        }
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadZip = async () => {
    if (results.length === 0) return;
    setZipping(true);
    try {
      await downloadItemsAsZip(
        results.map((r) => ({ blob: r.blob, filename: r.filename })),
        `lyzov_converted_images_${Date.now()}.zip`
      );
    } catch (err) {
      setProcessError(toFriendlyErrorMessage(err));
    } finally {
      setZipping(false);
    }
  };

  const outputMime = settings.outputMime || 'image/png';
  const targetFormatLabel = IMAGE_MIME_LABELS[outputMime] || 'PNG';
  const activePreview = results[previewIndex] || results[0] || null;
  const cardBg = isDark ? 'rgba(255, 255, 255, 0.03)' : 'background.paper';

  return (
    <ToolShell
      title="Image Converter"
      description="Convert images between JPG, PNG, WEBP, and BMP cleanly with transparent fills."
      canonical="https://tools.lyzov.com/image-converter"
      accentColor={accent}
      icon={RefreshCw}
    >
      {/* Step 1: Choose Files */}
      <ToolDropzone
        title={files.length > 0 ? 'Add more images to convert' : 'Drop your images here'}
        subtitle="Supports JPG, JPEG, PNG, WEBP & BMP · Up to 25 MB per image · Single or bulk"
        buttonLabel={files.length > 0 ? 'Add More Images' : 'Choose Images'}
        accept="image/jpeg,image/png,image/webp,image/bmp,.jpg,.jpeg,.png,.webp,.bmp"
        multiple
        disabled={isProcessing}
        accentColor={accent}
        errorMessages={uploadErrors}
        onClearErrors={() => setUploadErrors([])}
        onFilesSelected={handleFilesSelected}
        compact={files.length > 0}
      />

      <ToolFileList
        items={files}
        title="Images Ready to Convert"
        disabled={isProcessing}
        onRemoveItem={handleRemoveFile}
        onClearAll={handleClearAll}
        renderMeta={(item) =>
          `${item.width} × ${item.height} px · ${IMAGE_MIME_LABELS[item.mime] || 'Image'}`
        }
      />

      {/* Step 2 & 3: Format Options + Main Action Button */}
      {files.length > 0 && (
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
            gap: 2.5,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1.5,
            }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary' }}>
              Conversion Options
            </Typography>
            <Chip
              size="small"
              label={`Converting to ${targetFormatLabel}`}
              sx={{
                fontWeight: 700,
                fontSize: '0.74rem',
                bgcolor: isDark ? 'rgba(167, 139, 250, 0.16)' : 'rgba(124, 58, 237, 0.1)',
                color: accent,
              }}
            />
          </Box>

          {/* Output Format Selector */}
          <Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, display: 'block', mb: 1 }}>
              Convert Images To
            </Typography>
            <ToggleButtonGroup
              exclusive
              value={outputMime}
              onChange={(_, next) => next && updateSettings({ outputMime: next })}
              disabled={isProcessing}
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
                gap: 1,
                '& .MuiToggleButton-root': {
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: '10px !important',
                },
              }}
            >
              {OUTPUT_FORMATS.map((fmt) => {
                const selected = outputMime === fmt.mime;
                return (
                  <ToggleButton
                    key={fmt.mime}
                    value={fmt.mime}
                    sx={{
                      textTransform: 'none',
                      py: 1.25,
                      px: 1.5,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      gap: 0.25,
                      borderColor: selected ? `${accent} !important` : undefined,
                      bgcolor: selected ? `${accent}1a !important` : 'transparent',
                    }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 800, color: selected ? accent : 'text.primary' }}>
                      {fmt.label}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.72rem' }}>
                      {fmt.hint}
                    </Typography>
                  </ToggleButton>
                );
              })}
            </ToggleButtonGroup>
          </Box>

          {/* Quality Slider (for JPG / WEBP) */}
          {outputMime !== 'image/png' && (
            <Box sx={{ px: 0.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.3 }}>
                <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                  {targetFormatLabel} Output Quality
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 800, color: accent }}>
                  {settings.quality}%
                </Typography>
              </Box>
              <Slider
                size="small"
                min={10}
                max={100}
                value={Number(settings.quality) || 92}
                disabled={isProcessing}
                onChange={(_, val) => updateSettings({ quality: Number(val) })}
                aria-label="Converted image quality"
                sx={{ color: accent }}
              />
            </Box>
          )}

          {/* Background Color Picker for Transparent -> JPG */}
          {outputMime === 'image/jpeg' && (
            <Box
              sx={{
                p: 2,
                borderRadius: 2.5,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                display: 'flex',
                flexDirection: 'column',
                gap: 1.25,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                  Background Fill for Transparent Areas
                </Typography>
                <Chip
                  size="small"
                  label={(settings.backgroundColor || '#ffffff').toUpperCase()}
                  sx={{ fontWeight: 700, fontFamily: 'monospace' }}
                />
              </Box>

              <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
                {BG_COLOR_SWATCHES.map((swatch) => {
                  const active = (settings.backgroundColor || '#ffffff').toLowerCase() === swatch.color;
                  return (
                    <Button
                      key={swatch.color}
                      size="small"
                      variant={active ? 'contained' : 'outlined'}
                      disabled={isProcessing}
                      onClick={() => updateSettings({ backgroundColor: swatch.color })}
                      startIcon={
                        <Box
                          sx={{
                            width: 14,
                            height: 14,
                            borderRadius: '4px',
                            bgcolor: swatch.color,
                            border: '1px solid rgba(148,163,184,0.6)',
                          }}
                        />
                      }
                      sx={{
                        textTransform: 'none',
                        fontWeight: 700,
                        borderRadius: 2,
                        borderColor: active ? accent : 'divider',
                        bgcolor: active ? accent : 'transparent',
                        color: active ? '#ffffff' : 'text.primary',
                        '&:hover': {
                          borderColor: accent,
                          bgcolor: active ? accent : `${accent}14`,
                        },
                      }}
                    >
                      {swatch.label}
                    </Button>
                  );
                })}

                <Box
                  component="label"
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 1,
                    px: 1.25,
                    py: 0.55,
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    cursor: isProcessing ? 'not-allowed' : 'pointer',
                  }}
                >
                  <input
                    type="color"
                    value={settings.backgroundColor || '#ffffff'}
                    disabled={isProcessing}
                    onChange={(e) => updateSettings({ backgroundColor: e.target.value })}
                    aria-label="Pick custom background fill color"
                    style={{
                      width: 22,
                      height: 22,
                      border: 'none',
                      padding: 0,
                      background: 'transparent',
                      cursor: 'pointer',
                    }}
                  />
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.primary' }}>
                    Custom Color
                  </Typography>
                </Box>
              </Box>

              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                JPG does not support transparency, so any see-through areas will be filled cleanly with this color instead of turning black.
              </Typography>
            </Box>
          )}

          {processError && (
            <Alert severity="error" onClose={() => setProcessError('')} sx={{ borderRadius: 2 }}>
              {processError}
            </Alert>
          )}

          <Button
            variant="contained"
            size="large"
            disabled={isProcessing}
            onClick={handleConvertAll}
            endIcon={<ArrowRight size={18} />}
            sx={{
              py: 1.35,
              fontWeight: 800,
              fontSize: '0.96rem',
              textTransform: 'none',
              borderRadius: 2.5,
              color: '#ffffff',
              background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
              boxShadow: '0 8px 22px rgba(139, 92, 246, 0.28)',
              '&:hover': {
                background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
              },
            }}
          >
            {isProcessing
              ? 'Converting Images...'
              : files.length === 1
                ? `Convert Image to ${targetFormatLabel}`
                : `Convert ${files.length} Images to ${targetFormatLabel}`}
          </Button>
        </Paper>
      )}

      {/* Progress */}
      {isProcessing && (
        <ToolProgress
          title={`Converting images to ${targetFormatLabel}...`}
          subtitle={progress.label}
          current={progress.current}
          total={progress.total}
          accentColor={accent}
        />
      )}

      {/* Step 4 & 5: Results, Before/After Preview & Download */}
      {!isProcessing && results.length > 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <ToolResultBar
            title={
              results.length === 1
                ? `Your ${results[0].targetLabel} image is ready`
                : `${results.length} converted images are ready`
            }
            subtitle={
              results.length === 1
                ? `${results[0].sourceLabel} → ${results[0].targetLabel} · ${results[0].width}×${results[0].height} px · ${formatBytes(results[0].afterBytes)}`
                : 'Preview any converted image below or download the complete batch as a ZIP.'
            }
            count={results.length}
            singleLabel={`Download ${results[0].targetLabel}`}
            zipLabel="Download All (.ZIP)"
            resetLabel="Clear & Start Over"
            onDownloadSingle={() => downloadBlob(results[0].blob, results[0].filename)}
            onDownloadAllZip={handleDownloadZip}
            onReset={handleClearAll}
            zipping={zipping}
            warningMessage={warningMessage}
          />

          {results.length > 1 && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8, alignItems: 'center' }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', mr: 0.5 }}>
                Preview image:
              </Typography>
              {results.map((res, idx) => (
                <Chip
                  key={res.id}
                  label={`${idx + 1}. ${res.name}`}
                  size="small"
                  clickable
                  onClick={() => setPreviewIndex(idx)}
                  sx={{
                    maxWidth: 200,
                    fontWeight: previewIndex === idx ? 800 : 600,
                    bgcolor: previewIndex === idx ? accent : undefined,
                    color: previewIndex === idx ? '#ffffff' : 'text.primary',
                  }}
                />
              ))}
            </Box>
          )}

          {activePreview && (
            <ImageBeforeAfterPreview
              beforeUrl={activePreview.beforeUrl}
              afterUrl={activePreview.afterUrl}
              beforeLabel={`Original (${activePreview.sourceLabel})`}
              afterLabel={`Converted (${activePreview.targetLabel})`}
              beforeMeta={formatBytes(activePreview.beforeBytes)}
              afterMeta={formatBytes(activePreview.afterBytes)}
              transparentBackdrop={activePreview.mime !== 'image/jpeg'}
              solidBgColor={activePreview.mime === 'image/jpeg' ? activePreview.backgroundColor : null}
            />
          )}

          {/* Individual Result Cards */}
          <Grid container spacing={1.5}>
            {results.map((res) => (
              <Grid key={res.id} size={{ xs: 12, sm: 6 }}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 1.5,
                    borderRadius: 2.5,
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: cardBg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 1.5,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0, flex: 1 }}>
                    <Box
                      component="img"
                      src={res.afterUrl}
                      alt={res.filename}
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: 1.5,
                        objectFit: 'cover',
                        border: '1px solid',
                        borderColor: 'divider',
                        flexShrink: 0,
                      }}
                    />
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                        <Typography
                          variant="body2"
                          noWrap
                          title={res.filename}
                          sx={{ fontWeight: 700, color: 'text.primary', maxWidth: '100%' }}
                        >
                          {res.filename}
                        </Typography>
                        <Chip
                          size="small"
                          label={`${res.sourceLabel} → ${res.targetLabel}`}
                          sx={{
                            height: 20,
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            bgcolor: isDark ? 'rgba(167, 139, 250, 0.16)' : 'rgba(124, 58, 237, 0.1)',
                            color: accent,
                          }}
                        />
                      </Box>
                      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.2 }}>
                        {res.width}×{res.height} px · {formatBytes(res.beforeBytes)} → {formatBytes(res.afterBytes)}
                      </Typography>
                    </Box>
                  </Box>

                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<Download size={14} />}
                    onClick={() => downloadBlob(res.blob, res.filename)}
                    sx={{
                      textTransform: 'none',
                      fontWeight: 700,
                      borderRadius: 2,
                      flexShrink: 0,
                      borderColor: 'divider',
                      color: 'text.primary',
                      '&:hover': { borderColor: accent, color: accent },
                    }}
                  >
                    Download
                  </Button>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </ToolShell>
  );
}
