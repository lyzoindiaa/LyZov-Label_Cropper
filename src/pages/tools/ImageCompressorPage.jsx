import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Grid,
  Paper,
  Slider,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { ArrowRight, Download, Minimize2 } from 'lucide-react';
import { AppContext } from '../../context/AppContext';
import ToolShell from '../../components/tools/ToolShell';
import ToolDropzone from '../../components/tools/ToolDropzone';
import ToolFileList from '../../components/tools/ToolFileList';
import ToolProgress from '../../components/tools/ToolProgress';
import { ImageBeforeAfterPreview } from '../../components/tools/ToolPreview';
import ToolResultBar from '../../components/tools/ToolResultBar';
import {
  MAX_IMAGE_FILE_BYTES,
  calcCompressionPercent,
  formatBytes,
  toFriendlyErrorMessage,
  validateUploadedFiles,
} from '../../utils/fileValidation';
import { createUrlRegistry, downloadBlob, downloadItemsAsZip } from '../../utils/zipUtils';
import { useToolSettings } from '../../utils/toolPrefs';
import {
  IMAGE_MIME_LABELS,
  buildImageOutputFilename,
  compressImageFile,
  inferImageMime,
  readImageMetadata,
} from '../../utils/imageProcessing';

const QUALITY_PRESETS = [
  { label: 'High Quality (85%)', value: 85 },
  { label: 'Balanced (75%)', value: 75 },
  { label: 'Small File (50%)', value: 50 },
];

const MAX_BATCH_FILES = 50;

const DEFAULT_SETTINGS = {
  mode: 'quality',
  quality: 75,
  targetValue: 200,
  targetUnit: 'KB',
};

export default function ImageCompressorPage() {
  const { theme } = useContext(AppContext);
  const isDark = theme === 'dark';
  const accent = isDark ? '#00d68f' : '#00a86b';

  const [settings, setSettings] = useToolSettings('image_compressor', DEFAULT_SETTINGS);
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

  const handleUnitChange = (_, nextUnit) => {
    if (!nextUnit || nextUnit === settings.targetUnit) return;
    const raw = Number(settings.targetValue);
    if (!Number.isFinite(raw) || raw <= 0) {
      updateSettings({ targetUnit: nextUnit, targetValue: nextUnit === 'MB' ? 1 : 200 });
      return;
    }
    if (nextUnit === 'MB') {
      const mbVal = Number((raw / 1024).toFixed(2));
      updateSettings({ targetUnit: 'MB', targetValue: Math.max(0.05, mbVal) });
    } else {
      const kbVal = Math.max(5, Math.round(raw * 1024));
      updateSettings({ targetUnit: 'KB', targetValue: kbVal });
    }
  };

  const targetSizeKb = useMemo(() => {
    const val = Number(settings.targetValue);
    if (!Number.isFinite(val) || val <= 0) return 0;
    return settings.targetUnit === 'MB' ? Math.round(val * 1024) : Math.round(val);
  }, [settings.targetValue, settings.targetUnit]);

  const validationIssue = useMemo(() => {
    if (settings.mode === 'target') {
      const val = Number(settings.targetValue);
      if (!Number.isFinite(val) || val <= 0 || targetSizeKb < 5) {
        return 'Enter a target size of at least 5 KB (or 0.05 MB).';
      }
    }
    return '';
  }, [settings.mode, settings.targetValue, targetSizeKb]);

  const totalInputBytes = useMemo(
    () => files.reduce((sum, item) => sum + (item.size || 0), 0),
    [files]
  );

  const summaryStats = useMemo(() => {
    if (results.length === 0) return null;
    const totalBefore = results.reduce((sum, r) => sum + r.beforeBytes, 0);
    const totalAfter = results.reduce((sum, r) => sum + r.afterBytes, 0);
    const savedBytes = Math.max(0, totalBefore - totalAfter);
    const savedPct = Math.max(0, calcCompressionPercent(totalBefore, totalAfter));
    return { totalBefore, totalAfter, savedBytes, savedPct };
  }, [results]);

  const handleCompressAll = async () => {
    if (files.length === 0 || validationIssue || isProcessing) return;

    resultUrlsRef.current.revokeAll();
    setResults([]);
    setPreviewIndex(0);
    setProcessError('');
    setWarningMessage('');
    setIsProcessing(true);
    setProgress({ current: 0, total: files.length, label: 'Starting compression...' });

    const nextResults = [];
    const failedMessages = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const item = files[i];
        setProgress({
          current: i,
          total: files.length,
          label: `Compressing ${item.name} (${i + 1} of ${files.length})`,
        });

        try {
          const output = await compressImageFile(item.file, {
            mode: settings.mode,
            quality: Number(settings.quality) || 75,
            targetSizeKb,
          });

          const afterUrl = resultUrlsRef.current.create(output.blob);
          const filename = buildImageOutputFilename(item.name, '_compressed', output.ext);

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
        setProcessError(failedMessages[0] || 'Could not compress your images. Please try another file.');
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
        `lyzov_compressed_images_${Date.now()}.zip`
      );
    } catch (err) {
      setProcessError(toFriendlyErrorMessage(err));
    } finally {
      setZipping(false);
    }
  };

  const activePreview = results[previewIndex] || results[0] || null;
  const cardBg = isDark ? 'rgba(255, 255, 255, 0.03)' : 'background.paper';

  return (
    <ToolShell
      title="Image Compressor"
      description="Reduce JPG, PNG & WEBP file sizes with quality control or a target KB/MB size."
      canonical="https://tools.lyzov.com/image-compressor"
      accentColor={accent}
      icon={Minimize2}
    >
      {/* Step 1: Choose Files */}
      <ToolDropzone
        title={files.length > 0 ? 'Add more images to compress' : 'Drop your images here'}
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
        title="Images Ready to Compress"
        disabled={isProcessing}
        onRemoveItem={handleRemoveFile}
        onClearAll={handleClearAll}
        renderMeta={(item) =>
          `${item.width} × ${item.height} px · ${IMAGE_MIME_LABELS[item.mime] || 'Image'}`
        }
      />

      {/* Step 2 & 3: Compression Options + Main Action Button */}
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
              Compression Settings
            </Typography>
            <Chip
              size="small"
              label={`Total input size: ${formatBytes(totalInputBytes)}`}
              sx={{
                fontWeight: 700,
                fontSize: '0.74rem',
                bgcolor: isDark ? 'rgba(0, 214, 143, 0.14)' : 'rgba(0, 168, 107, 0.1)',
                color: accent,
              }}
            />
          </Box>

          <ToggleButtonGroup
            exclusive
            value={settings.mode}
            onChange={(_, next) => next && updateSettings({ mode: next })}
            size="small"
            disabled={isProcessing}
            sx={{ flexWrap: 'wrap', gap: 0.75 }}
          >
            <ToggleButton value="quality" sx={{ textTransform: 'none', fontWeight: 700, px: 2 }}>
              By Quality Level
            </ToggleButton>
            <ToggleButton value="target" sx={{ textTransform: 'none', fontWeight: 700, px: 2 }}>
              Target File Size (KB / MB)
            </ToggleButton>
          </ToggleButtonGroup>

          {settings.mode === 'quality' ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {QUALITY_PRESETS.map((preset) => {
                  const active = Number(settings.quality) === preset.value;
                  return (
                    <Chip
                      key={preset.value}
                      label={preset.label}
                      clickable
                      disabled={isProcessing}
                      onClick={() => updateSettings({ quality: preset.value })}
                      sx={{
                        fontWeight: 700,
                        bgcolor: active ? accent : undefined,
                        color: active ? '#061510' : 'text.primary',
                      }}
                    />
                  );
                })}
              </Box>

              <Box sx={{ px: 0.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                    Compression Quality
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 800, color: accent }}>
                    {settings.quality}%
                  </Typography>
                </Box>
                <Slider
                  min={10}
                  max={100}
                  value={Number(settings.quality) || 75}
                  disabled={isProcessing}
                  onChange={(_, val) => updateSettings({ quality: Number(val) })}
                  aria-label="Compression quality percentage"
                  sx={{ color: accent }}
                />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Smaller file size
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Higher visual quality
                  </Typography>
                </Box>
              </Box>

              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Smart compression automatically optimizes JPG, WEBP, and PNG palette sizes — and keeps the original file if it is already smaller.
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5 }}>
                <TextField
                  size="small"
                  type="number"
                  label="Target Size Per Image"
                  disabled={isProcessing}
                  value={settings.targetValue}
                  onChange={(e) =>
                    updateSettings({
                      targetValue: e.target.value === '' ? '' : Number(e.target.value),
                    })
                  }
                  sx={{ width: 200 }}
                  slotProps={{
                    htmlInput: {
                      min: settings.targetUnit === 'MB' ? 0.05 : 5,
                      step: settings.targetUnit === 'MB' ? 0.1 : 10,
                    },
                  }}
                />

                <ToggleButtonGroup
                  exclusive
                  size="small"
                  value={settings.targetUnit}
                  onChange={handleUnitChange}
                  disabled={isProcessing}
                >
                  <ToggleButton value="KB" sx={{ fontWeight: 700, px: 2 }}>
                    KB
                  </ToggleButton>
                  <ToggleButton value="MB" sx={{ fontWeight: 700, px: 2 }}>
                    MB
                  </ToggleButton>
                </ToggleButtonGroup>
              </Box>

              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Automatically adjusts quality (and scales large dimensions gently only if needed) to keep each file under {settings.targetValue || 0} {settings.targetUnit}.
              </Typography>
            </Box>
          )}

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
            onClick={handleCompressAll}
            endIcon={<ArrowRight size={18} />}
            sx={{
              py: 1.35,
              fontWeight: 800,
              fontSize: '0.96rem',
              textTransform: 'none',
              borderRadius: 2.5,
              color: '#061510',
              background: 'linear-gradient(135deg, #00d68f 0%, #00c9ff 100%)',
              boxShadow: '0 8px 22px rgba(0, 214, 143, 0.28)',
              '&:hover': {
                background: 'linear-gradient(135deg, #00c280 0%, #00b4e6 100%)',
              },
            }}
          >
            {isProcessing
              ? 'Compressing Images...'
              : files.length === 1
                ? 'Compress Image'
                : `Compress ${files.length} Images`}
          </Button>
        </Paper>
      )}

      {/* Progress */}
      {isProcessing && (
        <ToolProgress
          title="Compressing your images..."
          subtitle={progress.label}
          current={progress.current}
          total={progress.total}
          accentColor={accent}
        />
      )}

      {/* Step 4 & 5: Summary, Before/After Preview & Download */}
      {!isProcessing && results.length > 0 && summaryStats && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <ToolResultBar
            title={
              results.length === 1
                ? 'Your compressed image is ready'
                : `${results.length} compressed images are ready`
            }
            subtitle={`${formatBytes(summaryStats.totalBefore)} → ${formatBytes(summaryStats.totalAfter)} · ${
              summaryStats.savedPct > 0
                ? `${summaryStats.savedPct}% smaller (Saved ${formatBytes(summaryStats.savedBytes)})`
                : 'Original files were already well optimized'
            }`}
            count={results.length}
            singleLabel="Download Compressed Image"
            zipLabel="Download All (.ZIP)"
            resetLabel="Clear & Start Over"
            onDownloadSingle={() => downloadBlob(results[0].blob, results[0].filename)}
            onDownloadAllZip={handleDownloadZip}
            onReset={handleClearAll}
            zipping={zipping}
            warningMessage={warningMessage}
          />

          {/* Overall Size Comparison Summary Cards */}
          <Grid container spacing={1.5}>
            <Grid size={{ xs: 4 }}>
              <Paper
                elevation={0}
                sx={{ p: 1.5, borderRadius: 2.5, border: '1px solid', borderColor: 'divider', bgcolor: cardBg, textAlign: 'center' }}
              >
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, display: 'block' }}>
                  Original Total
                </Typography>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary' }}>
                  {formatBytes(summaryStats.totalBefore)}
                </Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 4 }}>
              <Paper
                elevation={0}
                sx={{ p: 1.5, borderRadius: 2.5, border: '1px solid', borderColor: 'divider', bgcolor: cardBg, textAlign: 'center' }}
              >
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, display: 'block' }}>
                  Compressed Total
                </Typography>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: accent }}>
                  {formatBytes(summaryStats.totalAfter)}
                </Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 4 }}>
              <Paper
                elevation={0}
                sx={{ p: 1.5, borderRadius: 2.5, border: '1px solid', borderColor: 'divider', bgcolor: cardBg, textAlign: 'center' }}
              >
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, display: 'block' }}>
                  Space Saved
                </Typography>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: accent }}>
                  {summaryStats.savedPct}%
                </Typography>
              </Paper>
            </Grid>
          </Grid>

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
                    color: previewIndex === idx ? '#061510' : 'text.primary',
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
              afterLabel="Compressed"
              beforeMeta={formatBytes(activePreview.beforeBytes)}
              afterMeta={`${formatBytes(activePreview.afterBytes)}${
                activePreview.savedPercent > 0 ? ` · -${activePreview.savedPercent}%` : ' · Kept original'
              }`}
              transparentBackdrop={activePreview.mime !== 'image/jpeg'}
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
                          label={res.savedPercent > 0 ? `-${res.savedPercent}%` : 'Kept original'}
                          sx={{
                            height: 20,
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            bgcolor:
                              res.savedPercent > 0
                                ? isDark
                                  ? 'rgba(0, 214, 143, 0.16)'
                                  : 'rgba(0, 168, 107, 0.12)'
                                : undefined,
                            color: res.savedPercent > 0 ? accent : 'text.secondary',
                          }}
                        />
                      </Box>
                      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.2 }}>
                        {formatBytes(res.beforeBytes)} → {formatBytes(res.afterBytes)} · {res.width}×{res.height} px
                      </Typography>
                      {res.note && (
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.2 }}>
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
