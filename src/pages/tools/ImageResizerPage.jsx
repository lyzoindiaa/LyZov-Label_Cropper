import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  FormControl,
  FormControlLabel,
  Grid,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Slider,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { ArrowRight, Download, Lock, Maximize2, Unlock } from 'lucide-react';
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
  calculateResizeDimensions,
  inferImageMime,
  readImageMetadata,
  resizeImageFile,
} from '../../utils/imageProcessing';

const SQUARE_PRESETS = [500, 1000, 1200, 1500];
const PERCENT_PRESETS = [25, 50, 75, 150];
const MAX_BATCH_FILES = 50;

const DEFAULT_SETTINGS = {
  mode: 'preset',
  presetSize: 1000,
  customWidth: 1000,
  customHeight: 1000,
  maintainAspectRatio: true,
  scalePercent: 50,
  outputFormat: 'original',
  quality: 90,
  targetSizeKb: '',
};

export default function ImageResizerPage() {
  const { theme } = useContext(AppContext);
  const isDark = theme === 'dark';
  const accent = isDark ? '#00c9ff' : '#0284c7';

  const [settings, setSettings] = useToolSettings('image_resizer', DEFAULT_SETTINGS);
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

  const firstFile = files[0] || null;

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
      allowedTypes: ['jpeg', 'png', 'webp'],
      maxFileSizeBytes: MAX_IMAGE_FILE_BYTES,
      maxFiles: remainingSlots,
      formatLabel: 'image (JPG, PNG, or WEBP)',
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
      if (files.length === 0 && settings.mode === 'custom') {
        updateSettings({
          customWidth: decodedItems[0].width,
          customHeight: decodedItems[0].height,
        });
      }
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

  const handleModeChange = (_, nextMode) => {
    if (!nextMode) return;
    if (nextMode === 'custom' && firstFile) {
      updateSettings({
        mode: nextMode,
        customWidth: firstFile.width,
        customHeight: firstFile.height,
      });
    } else {
      updateSettings({ mode: nextMode });
    }
  };

  const handleCustomWidthChange = (raw) => {
    if (raw === '') {
      updateSettings({ customWidth: '' });
      return;
    }
    const parsed = Math.round(Number(raw));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      updateSettings({ customWidth: Number.isFinite(parsed) ? parsed : '' });
      return;
    }
    if (settings.maintainAspectRatio && firstFile && firstFile.width > 0) {
      const ratio = firstFile.height / firstFile.width;
      const syncedHeight = Math.max(1, Math.min(10000, Math.round(parsed * ratio)));
      updateSettings({ customWidth: parsed, customHeight: syncedHeight });
    } else {
      updateSettings({ customWidth: parsed });
    }
  };

  const handleCustomHeightChange = (raw) => {
    if (raw === '') {
      updateSettings({ customHeight: '' });
      return;
    }
    const parsed = Math.round(Number(raw));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      updateSettings({ customHeight: Number.isFinite(parsed) ? parsed : '' });
      return;
    }
    if (settings.maintainAspectRatio && firstFile && firstFile.height > 0) {
      const ratio = firstFile.width / firstFile.height;
      const syncedWidth = Math.max(1, Math.min(10000, Math.round(parsed * ratio)));
      updateSettings({ customHeight: parsed, customWidth: syncedWidth });
    } else {
      updateSettings({ customHeight: parsed });
    }
  };

  const handleAspectToggle = (checked) => {
    if (checked && settings.mode === 'custom' && firstFile && Number(settings.customWidth) > 0) {
      const syncedHeight = Math.max(
        1,
        Math.min(10000, Math.round(Number(settings.customWidth) * (firstFile.height / firstFile.width)))
      );
      updateSettings({ maintainAspectRatio: true, customHeight: syncedHeight });
    } else {
      updateSettings({ maintainAspectRatio: checked });
    }
  };

  const effectiveTargetWidth =
    settings.mode === 'preset' ? settings.presetSize : Number(settings.customWidth);
  const effectiveTargetHeight =
    settings.mode === 'preset' ? settings.presetSize : Number(settings.customHeight);

  const validationIssue = useMemo(() => {
    if (settings.mode === 'custom') {
      const w = Number(settings.customWidth);
      const h = Number(settings.customHeight);
      if (!Number.isFinite(w) || w < 1 || w > 10000 || !Number.isFinite(h) || h < 1 || h > 10000) {
        return 'Enter width and height between 1 and 10,000 pixels.';
      }
    }
    if (settings.mode === 'percentage') {
      const pct = Number(settings.scalePercent);
      if (!Number.isFinite(pct) || pct < 1 || pct > 500) {
        return 'Enter a percentage between 1% and 500%.';
      }
    }
    if (settings.targetSizeKb !== '' && settings.targetSizeKb !== null) {
      const kb = Number(settings.targetSizeKb);
      if (!Number.isFinite(kb) || kb < 5) {
        return 'Target file size should be at least 5 KB, or leave it blank.';
      }
    }
    return '';
  }, [settings]);

  const firstFilePreviewDims = useMemo(() => {
    if (!firstFile || validationIssue) return null;
    return calculateResizeDimensions(firstFile.width, firstFile.height, {
      mode: settings.mode,
      width: effectiveTargetWidth,
      height: effectiveTargetHeight,
      maintainAspectRatio: settings.maintainAspectRatio,
      scalePercent: Number(settings.scalePercent),
    });
  }, [
    firstFile,
    validationIssue,
    settings.mode,
    effectiveTargetWidth,
    effectiveTargetHeight,
    settings.maintainAspectRatio,
    settings.scalePercent,
  ]);

  const handleResizeAll = async () => {
    if (files.length === 0 || validationIssue || isProcessing) return;

    resultUrlsRef.current.revokeAll();
    setResults([]);
    setPreviewIndex(0);
    setProcessError('');
    setWarningMessage('');
    setIsProcessing(true);
    setProgress({ current: 0, total: files.length, label: 'Preparing images...' });

    const targetKb =
      settings.targetSizeKb !== '' && Number(settings.targetSizeKb) > 0
        ? Number(settings.targetSizeKb)
        : 0;

    const nextResults = [];
    const failedMessages = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const item = files[i];
        setProgress({
          current: i,
          total: files.length,
          label: `Resizing ${item.name} (${i + 1} of ${files.length})`,
        });

        try {
          const output = await resizeImageFile(item.file, {
            mode: settings.mode,
            width: effectiveTargetWidth,
            height: effectiveTargetHeight,
            maintainAspectRatio: settings.maintainAspectRatio,
            scalePercent: Number(settings.scalePercent),
            outputFormat: settings.outputFormat,
            quality: Number(settings.quality) || 90,
            targetSizeKb: targetKb,
          });

          const afterUrl = resultUrlsRef.current.create(output.blob);
          const filename = buildImageOutputFilename(
            item.name,
            `_${output.width}x${output.height}`,
            output.ext
          );

          nextResults.push({
            id: item.id,
            name: item.name,
            filename,
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
        setProcessError(failedMessages[0] || 'Could not resize your images. Please try another file.');
      } else {
        setResults(nextResults);
        if (failedMessages.length > 0) {
          setWarningMessage(
            `${failedMessages.length} file(s) could not be resized: ${failedMessages.join(' · ')}`
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
        `lyzov_resized_images_${Date.now()}.zip`
      );
    } catch (err) {
      setProcessError(toFriendlyErrorMessage(err));
    } finally {
      setZipping(false);
    }
  };

  const activePreview = results[previewIndex] || results[0] || null;
  const showQualitySlider = settings.outputFormat !== 'image/png';
  const cardBg = isDark ? 'rgba(255, 255, 255, 0.03)' : 'background.paper';

  return (
    <ToolShell
      title="Image Resizer"
      description="Resize single or bulk photos to exact pixel dimensions, percentages, or presets."
      canonical="https://tools.lyzov.com/image-resizer"
      accentColor={accent}
      icon={Maximize2}
    >
      {/* Step 1: Choose Files */}
      <ToolDropzone
        title={files.length > 0 ? 'Add more images to resize' : 'Drop your images here'}
        subtitle="Supports JPG, JPEG, PNG & WEBP · Up to 25 MB per image · Single or bulk"
        buttonLabel={files.length > 0 ? 'Add More Images' : 'Choose Images'}
        accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
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
        title="Images Ready to Resize"
        disabled={isProcessing}
        onRemoveItem={handleRemoveFile}
        onClearAll={handleClearAll}
        renderMeta={(item) =>
          `${item.width} × ${item.height} px · ${IMAGE_MIME_LABELS[item.mime] || 'Image'}`
        }
      />

      {/* Step 2 & 3: Options + Main Action Button */}
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
              Resize Options
            </Typography>
            {firstFilePreviewDims && (
              <Chip
                size="small"
                label={`First image output: ${firstFile.width}×${firstFile.height} → ${firstFilePreviewDims.width}×${firstFilePreviewDims.height} px`}
                sx={{
                  fontWeight: 700,
                  fontSize: '0.74rem',
                  bgcolor: isDark ? 'rgba(0, 201, 255, 0.14)' : 'rgba(2, 132, 199, 0.1)',
                  color: accent,
                }}
              />
            )}
          </Box>

          {/* Resize Mode Toggle */}
          <ToggleButtonGroup
            exclusive
            value={settings.mode}
            onChange={handleModeChange}
            size="small"
            color="primary"
            disabled={isProcessing}
            sx={{ flexWrap: 'wrap', gap: 0.75 }}
          >
            <ToggleButton value="preset" sx={{ textTransform: 'none', fontWeight: 700, px: 2 }}>
              Quick Presets
            </ToggleButton>
            <ToggleButton value="custom" sx={{ textTransform: 'none', fontWeight: 700, px: 2 }}>
              Custom Dimensions
            </ToggleButton>
            <ToggleButton value="percentage" sx={{ textTransform: 'none', fontWeight: 700, px: 2 }}>
              By Percentage
            </ToggleButton>
          </ToggleButtonGroup>

          {/* Mode: Presets */}
          {settings.mode === 'preset' && (
            <Box>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, display: 'block', mb: 1 }}>
                Select Target Size (px)
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {SQUARE_PRESETS.map((size) => {
                  const selected = settings.presetSize === size;
                  return (
                    <Button
                      key={size}
                      variant={selected ? 'contained' : 'outlined'}
                      size="small"
                      disabled={isProcessing}
                      onClick={() => updateSettings({ presetSize: size })}
                      sx={{
                        borderRadius: 2,
                        textTransform: 'none',
                        fontWeight: 700,
                        px: 2,
                        py: 0.9,
                        borderColor: selected ? accent : 'divider',
                        color: selected ? '#ffffff' : 'text.primary',
                        bgcolor: selected ? accent : 'transparent',
                        '&:hover': {
                          borderColor: accent,
                          bgcolor: selected ? accent : `${accent}14`,
                        },
                      }}
                    >
                      {size} × {size}
                    </Button>
                  );
                })}
              </Box>
            </Box>
          )}

          {/* Mode: Custom Pixels */}
          {settings.mode === 'custom' && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Grid container spacing={2} alignItems="center">
                <Grid size={{ xs: 12, sm: 5 }}>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    label="Width"
                    disabled={isProcessing}
                    value={settings.customWidth}
                    onChange={(e) => handleCustomWidthChange(e.target.value)}
                    slotProps={{
                      htmlInput: { min: 1, max: 10000 },
                      input: {
                        endAdornment: <InputAdornment position="end">px</InputAdornment>,
                      },
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 5 }}>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    label="Height"
                    disabled={isProcessing}
                    value={settings.customHeight}
                    onChange={(e) => handleCustomHeightChange(e.target.value)}
                    slotProps={{
                      htmlInput: { min: 1, max: 10000 },
                      input: {
                        endAdornment: <InputAdornment position="end">px</InputAdornment>,
                      },
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 2 }}>
                  {firstFile && (
                    <Button
                      size="small"
                      variant="text"
                      disabled={isProcessing}
                      onClick={() =>
                        updateSettings({
                          customWidth: firstFile.width,
                          customHeight: firstFile.height,
                        })
                      }
                      sx={{ textTransform: 'none', fontWeight: 700, color: accent }}
                    >
                      Reset Original
                    </Button>
                  )}
                </Grid>
              </Grid>
            </Box>
          )}

          {/* Mode: Percentage */}
          {settings.mode === 'percentage' && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
                {PERCENT_PRESETS.map((pct) => {
                  const selected = Number(settings.scalePercent) === pct;
                  return (
                    <Chip
                      key={pct}
                      label={`${pct}%`}
                      clickable
                      disabled={isProcessing}
                      onClick={() => updateSettings({ scalePercent: pct })}
                      sx={{
                        fontWeight: 700,
                        bgcolor: selected ? accent : undefined,
                        color: selected ? '#ffffff' : 'text.primary',
                      }}
                    />
                  );
                })}
                <TextField
                  size="small"
                  type="number"
                  label="Custom %"
                  disabled={isProcessing}
                  value={settings.scalePercent}
                  onChange={(e) =>
                    updateSettings({
                      scalePercent: e.target.value === '' ? '' : Number(e.target.value),
                    })
                  }
                  sx={{ width: 130 }}
                  slotProps={{
                    htmlInput: { min: 1, max: 500 },
                    input: {
                      endAdornment: <InputAdornment position="end">%</InputAdornment>,
                    },
                  }}
                />
              </Box>
            </Box>
          )}

          {/* Aspect Ratio Switch (for Preset & Custom modes) */}
          {settings.mode !== 'percentage' && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 1,
                px: 1.5,
                py: 1,
                borderRadius: 2,
                bgcolor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <FormControlLabel
                control={
                  <Switch
                    checked={Boolean(settings.maintainAspectRatio)}
                    disabled={isProcessing}
                    onChange={(e) => handleAspectToggle(e.target.checked)}
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                    {settings.maintainAspectRatio ? <Lock size={15} color={accent} /> : <Unlock size={15} />}
                    <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                      Maintain aspect ratio
                    </Typography>
                  </Box>
                }
              />
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {settings.maintainAspectRatio
                  ? 'Fits inside target dimensions without stretching'
                  : 'Stretches or crops to exact pixel dimensions'}
              </Typography>
            </Box>
          )}

          {/* Output Format, Quality & Optional Target KB */}
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, sm: 4 }}>
              <FormControl fullWidth size="small" disabled={isProcessing}>
                <InputLabel id="resizer-format-label">Output Format</InputLabel>
                <Select
                  labelId="resizer-format-label"
                  label="Output Format"
                  value={settings.outputFormat}
                  onChange={(e) => updateSettings({ outputFormat: e.target.value })}
                >
                  <MenuItem value="original">Keep Original Format</MenuItem>
                  <MenuItem value="image/jpeg">JPG (Smallest Photos)</MenuItem>
                  <MenuItem value="image/png">PNG (Lossless / Transparent)</MenuItem>
                  <MenuItem value="image/webp">WEBP (Modern Web)</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Target Size (Optional)"
                placeholder="e.g. 200"
                disabled={isProcessing}
                value={settings.targetSizeKb}
                onChange={(e) => updateSettings({ targetSizeKb: e.target.value })}
                slotProps={{
                  htmlInput: { min: 5, max: 25000 },
                  input: {
                    endAdornment: <InputAdornment position="end">KB</InputAdornment>,
                  },
                }}
              />
            </Grid>

            {showQualitySlider && (
              <Grid size={{ xs: 12, sm: 4 }}>
                <Box sx={{ px: 0.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                      Quality (JPG/WEBP)
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 800, color: accent }}>
                      {settings.quality}%
                    </Typography>
                  </Box>
                  <Slider
                    size="small"
                    min={10}
                    max={100}
                    value={Number(settings.quality) || 90}
                    disabled={isProcessing}
                    onChange={(_, val) => updateSettings({ quality: Number(val) })}
                    aria-label="Output image quality"
                  />
                </Box>
              </Grid>
            )}
          </Grid>

          {validationIssue && (
            <Alert severity="warning" sx={{ borderRadius: 2 }}>
              {validationIssue}
            </Alert>
          )}

          {processError && (
            <Alert severity="error" onClose={() => setProcessError('')} sx={{ borderRadius: 2 }}>
              {processError}
            </Alert>
          )}

          <Button
            variant="contained"
            size="large"
            disabled={isProcessing || Boolean(validationIssue)}
            onClick={handleResizeAll}
            endIcon={<ArrowRight size={18} />}
            sx={{
              py: 1.35,
              fontWeight: 800,
              fontSize: '0.96rem',
              textTransform: 'none',
              borderRadius: 2.5,
              color: '#ffffff',
              background: 'linear-gradient(135deg, #00c9ff 0%, #0077ff 100%)',
              boxShadow: '0 8px 22px rgba(0, 201, 255, 0.28)',
              '&:hover': {
                background: 'linear-gradient(135deg, #00b8e6 0%, #0066dd 100%)',
              },
            }}
          >
            {isProcessing
              ? 'Resizing Images...'
              : files.length === 1
                ? 'Resize Image'
                : `Resize ${files.length} Images`}
          </Button>
        </Paper>
      )}

      {/* Progress */}
      {isProcessing && (
        <ToolProgress
          title="Resizing your images..."
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
                ? 'Your resized image is ready'
                : `${results.length} resized images are ready`
            }
            subtitle={
              results.length === 1
                ? `${results[0].originalWidth}×${results[0].originalHeight} → ${results[0].width}×${results[0].height} px · ${formatBytes(results[0].afterBytes)}`
                : 'Preview any image below or download everything together in a ZIP file.'
            }
            count={results.length}
            singleLabel="Download Resized Image"
            zipLabel="Download All (.ZIP)"
            resetLabel="Clear & Start Over"
            onDownloadSingle={() => downloadBlob(results[0].blob, results[0].filename)}
            onDownloadAllZip={handleDownloadZip}
            onReset={handleClearAll}
            zipping={zipping}
            warningMessage={warningMessage}
          />

          {/* Item selector for bulk batches */}
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
              beforeLabel="Original"
              afterLabel="Resized"
              beforeMeta={`${activePreview.originalWidth}×${activePreview.originalHeight} · ${formatBytes(activePreview.beforeBytes)}`}
              afterMeta={`${activePreview.width}×${activePreview.height} · ${formatBytes(activePreview.afterBytes)}`}
              transparentBackdrop={activePreview.mime !== 'image/jpeg'}
            />
          )}

          {/* Individual Resized Cards */}
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
                      <Typography
                        variant="body2"
                        noWrap
                        title={res.filename}
                        sx={{ fontWeight: 700, color: 'text.primary' }}
                      >
                        {res.filename}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                        {res.originalWidth}×{res.originalHeight} → {res.width}×{res.height} px ·{' '}
                        {formatBytes(res.beforeBytes)} → {formatBytes(res.afterBytes)}
                      </Typography>
                      {res.note && (
                        <Typography variant="caption" sx={{ color: accent, display: 'block', mt: 0.2 }}>
                          {res.note}
                        </Typography>
                      )}
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
