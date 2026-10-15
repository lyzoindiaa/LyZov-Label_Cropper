import React, { useContext, useRef, useEffect } from 'react';
import {
  Box,
  Button,
  LinearProgress,
  Typography,
  Paper,
  FormControlLabel,
  Radio,
  RadioGroup,
  Alert,
  Chip,
  Select,
  MenuItem,
  Divider,
} from '@mui/material';
import {
  Scissors,
  CheckCircle,
  Crosshair,
  RotateCw,
  Eye,
  Grid as GridIcon,
  Wand2,
} from 'lucide-react';
import { AppContext } from '../context/AppContext';
import { cropPdfBlob } from '../utils/pdfUtils';

export default function CropProcessor() {
  const {
    pdfFiles,
    selectedPdfIndex,
    selection,
    setSelectionMode,
    cropMode,
    selectCropMode,
    MARKETPLACE_PRESETS,
    autoDetectLabel,
    rotation,
    setCroppedBlobs,
    isProcessing,
    setIsProcessing,
    processProgress,
    setProcessProgress,
    cropOptions,
    setCropOptions,
    namingPattern,
    setNamingPattern,
    setActiveTab,
    requireCropperAccess,
    recordCropUsage,
    theme,
  } = useContext(AppContext);

  const previewCanvasRef = useRef(null);

  // Live real-time crop snippet canvas rendering (optimized with RAF & buffer reuse)
  useEffect(() => {
    if (!selection) return;

    let animId = null;
    const renderPreview = () => {
      const sourceCanvas = document.querySelector('.react-pdf__Page__canvas');
      const targetCanvas = previewCanvasRef.current;
      if (!sourceCanvas || !targetCanvas) return;

      const ctx = targetCanvas.getContext('2d');
      if (!ctx) return;

      const srcW = sourceCanvas.width;
      const srcH = sourceCanvas.height;

      const sx = Math.max(0, selection.xRatio * srcW);
      const sy = Math.max(0, selection.yRatio * srcH);
      const sw = Math.min(srcW - sx, selection.widthRatio * srcW);
      const sh = Math.min(srcH - sy, selection.heightRatio * srcH);

      if (sw <= 0 || sh <= 0) return;

      const maxPreviewW = 280;
      const aspect = sw / sh;
      const targetW = maxPreviewW;
      const targetH = Math.max(20, Math.round(maxPreviewW / aspect));

      // CRITICAL: Avoid resetting canvas dimensions if they haven't changed!
      // Mutating canvas.width or height forces the browser to discard and reallocate GPU textures.
      if (targetCanvas.width !== targetW || targetCanvas.height !== targetH) {
        targetCanvas.width = targetW;
        targetCanvas.height = targetH;
      }

      ctx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
      ctx.drawImage(sourceCanvas, sx, sy, sw, sh, 0, 0, targetCanvas.width, targetCanvas.height);
    };

    animId = requestAnimationFrame(renderPreview);
    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [selection, selectedPdfIndex, rotation, cropMode]);

  const handleBatchCrop = async () => {
    if (!requireCropperAccess()) return;

    if (!selection) {
      alert('Please select a crop area or choose a marketplace label mode first.');
      return;
    }
    if (pdfFiles.length === 0) {
      alert('Please upload at least one PDF file first.');
      return;
    }

    setIsProcessing(true);
    setProcessProgress({ current: 0, total: pdfFiles.length });

    // Yield to let React re-render loading state and let browser paint the progress bar
    await new Promise((resolve) => setTimeout(resolve, 60));

    const results = [];
    try {
      for (let i = 0; i < pdfFiles.length; i++) {
        const item = pdfFiles[i];
        setProcessProgress({ current: i + 1, total: pdfFiles.length });

        // Yield between documents so browser paints progress bar and remains responsive
        await new Promise((resolve) => setTimeout(resolve, 30));

        const croppedItems = await cropPdfBlob(item.file, selection, {
          ...cropOptions,
          rotation,
        });

        const baseClean = item.name.replace(/\.pdf$/i, '');

        croppedItems.forEach((slice, sIdx) => {
          let outputName = `${baseClean}${slice.suffix}`;
          if (namingPattern === 'numbered') {
            outputName = `label_${String(results.length + 1).padStart(2, '0')}`;
          }

          results.push({
            id: `${item.name}-${Date.now()}-${i}-${sIdx}`,
            name: outputName,
            blob: slice.blob,
          });
        });
      }

      setCroppedBlobs(results);
      recordCropUsage(results.length || 1);
      setActiveTab(1);
    } catch (err) {
      console.error('Batch cropping failed', err);
      alert('An error occurred during batch cropping: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const progressPercent =
    processProgress.total > 0
      ? Math.round((processProgress.current / processProgress.total) * 100)
      : 0;

  const inchW = selection ? ((selection.widthRatio * 612) / 72).toFixed(1) : 0;
  const inchH = selection ? ((selection.heightRatio * 792) / 72).toFixed(1) : 0;
  const mmW = selection ? Math.round(((selection.widthRatio * 612) / 72) * 25.4) : 0;
  const mmH = selection ? Math.round(((selection.heightRatio * 792) / 72) * 25.4) : 0;

  const isReadyToCrop = selection !== null && pdfFiles.length > 0;

  return (
    <Paper
      sx={{
        p: 2.5,
        bgcolor: theme === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="subtitle2" fontWeight={700}>
          Batch Crop Configuration
        </Typography>

        {rotation !== 0 && (
          <Chip
            size="small"
            icon={<RotateCw size={12} color="#00c9ff" />}
            label={`Rotated ${rotation}°`}
            sx={{
              height: 20,
              fontSize: '0.7rem',
              bgcolor: 'rgba(0, 201, 255, 0.15)',
              color: '#00c9ff',
            }}
          />
        )}
      </Box>

      {/* Marketplace Label Mode Selector */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ letterSpacing: '0.5px' }}>
            SELECT MARKETPLACE / LABEL TYPE:
          </Typography>
          <Chip
            size="small"
            label={MARKETPLACE_PRESETS[cropMode]?.fixed ? '🔒 Fixed Size' : '✏️ Free Adjust'}
            sx={{
              height: 20,
              fontSize: '0.68rem',
              fontWeight: 800,
              bgcolor: MARKETPLACE_PRESETS[cropMode]?.fixed ? 'rgba(255, 153, 0, 0.15)' : 'rgba(0, 201, 255, 0.15)',
              color: MARKETPLACE_PRESETS[cropMode]?.fixed ? '#ff9900' : '#00c9ff',
              border: `1px solid ${MARKETPLACE_PRESETS[cropMode]?.fixed ? 'rgba(255, 153, 0, 0.3)' : 'rgba(0, 201, 255, 0.3)'}`,
            }}
          />
        </Box>

        <RadioGroup
          value={cropMode}
          onChange={(e) => selectCropMode(e.target.value)}
          sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1 }}
        >
          {Object.values(MARKETPLACE_PRESETS).map((p) => {
            const isSelected = cropMode === p.id;
            return (
              <Box
                key={p.id}
                onClick={() => selectCropMode(p.id)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  p: 1.2,
                  borderRadius: 2,
                  cursor: 'pointer',
                  border: isSelected
                    ? `1.5px solid ${p.color}`
                    : '1px solid',
                  borderColor: isSelected ? p.color : 'divider',
                  bgcolor: isSelected
                    ? `${p.color}15`
                    : (theme === 'dark' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)'),
                  transition: 'all 0.18s ease',
                  '&:hover': {
                    borderColor: p.color,
                    bgcolor: `${p.color}10`,
                  },
                }}
              >
                <Radio
                  checked={isSelected}
                  size="small"
                  sx={{
                    p: 0.5,
                    mr: 0.8,
                    color: p.color,
                    '&.Mui-checked': { color: p.color },
                  }}
                />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                    <Typography
                      variant="body2"
                      fontWeight={isSelected ? 800 : 600}
                      sx={{ color: isSelected ? (theme === 'dark' ? '#ffffff' : '#0f172a') : 'text.primary', fontSize: '0.85rem' }}
                    >
                      {p.name}
                    </Typography>
                    <span
                      style={{
                        fontSize: '0.62rem',
                        fontWeight: 700,
                        padding: '1px 5px',
                        borderRadius: 4,
                        background: `${p.color}25`,
                        color: p.color,
                      }}
                    >
                      {p.badge}
                    </span>
                  </Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{
                      display: 'block',
                      fontSize: '0.68rem',
                      lineHeight: 1.2,
                      mt: 0.3,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {p.id === 'other' ? 'Adjust size & position' : 'Fixed label dimensions'}
                  </Typography>
                </Box>
              </Box>
            );
          })}
        </RadioGroup>

        {/* Informational Banner */}
        <Box
          sx={{
            p: 1.2,
            borderRadius: 1.8,
            bgcolor: theme === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
            border: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <Box sx={{ fontSize: 16 }}>
            {cropMode === 'amazon' ? '📦' : cropMode === 'flipkart' ? '🛍️' : cropMode === 'meesho' ? '🏷️' : '📐'}
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem', lineHeight: 1.3 }}>
            {cropMode === 'other' ? (
              <>
                <b style={{ color: theme === 'dark' ? '#00c9ff' : '#0284c7' }}>Custom Adjust Mode:</b> Drag corner dots on the viewer to resize width &amp; height. Drag inside the box to reposition.
              </>
            ) : cropMode === 'amazon' ? (
              <>
                <b style={{ color: MARKETPLACE_PRESETS.amazon.color }}>Amazon — Full Page Auto-Selected:</b> The entire first page is automatically selected. Just click <b>Crop &amp; Export</b> to extract your label.
              </>
            ) : (
              <>
                <b style={{ color: MARKETPLACE_PRESETS[cropMode]?.color }}>{MARKETPLACE_PRESETS[cropMode]?.name} Fixed Size:</b> Width &amp; height are locked to standard label dimensions. Drag inside the box on the viewer to position it over your label.
              </>
            )}
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ borderColor: 'divider' }} />

      {/* Pages to crop */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        <Typography variant="caption" color="text.secondary" fontWeight={600}>
          PAGES TO CROP PER DOCUMENT:
        </Typography>
        <RadioGroup
          row
          value={cropOptions.pagesToCrop}
          onChange={(e) => setCropOptions({ ...cropOptions, pagesToCrop: e.target.value })}
          sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}
        >
          <FormControlLabel
            value="first"
            control={<Radio size="small" sx={{ color: theme === 'dark' ? '#00c9ff' : '#0284c7', '&.Mui-checked': { color: theme === 'dark' ? '#00c9ff' : '#0284c7' } }} />}
            label={
              <Typography variant="caption" sx={{ fontWeight: cropOptions.pagesToCrop === 'first' ? 700 : 500, color: cropOptions.pagesToCrop === 'first' ? (theme === 'dark' ? '#00c9ff' : '#0284c7') : 'text.primary' }}>
                Page 1 Only {cropMode === 'amazon' ? '(Amazon Label)' : ''}
              </Typography>
            }
          />
          <FormControlLabel
            value="all"
            control={<Radio size="small" sx={{ color: theme === 'dark' ? '#00c9ff' : '#0284c7', '&.Mui-checked': { color: theme === 'dark' ? '#00c9ff' : '#0284c7' } }} />}
            label={<Typography variant="caption">All Pages</Typography>}
          />
          <FormControlLabel
            value="page2"
            control={<Radio size="small" sx={{ color: theme === 'dark' ? '#00c9ff' : '#0284c7', '&.Mui-checked': { color: theme === 'dark' ? '#00c9ff' : '#0284c7' } }} />}
            label={<Typography variant="caption">Page 2 Only</Typography>}
          />
        </RadioGroup>
      </Box>

      {/* Live Preview Card */}
      {selection ? (
        <Box
          sx={{
            p: 1.8,
            borderRadius: 2.5,
            bgcolor: theme === 'dark' ? 'rgba(0, 0, 0, 0.35)' : 'rgba(0, 0, 0, 0.02)',
            border: '1px solid',
            borderColor: theme === 'dark' ? 'rgba(0, 201, 255, 0.25)' : 'rgba(2, 132, 199, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            gap: 1.5,
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
              <Eye size={15} color={theme === 'dark' ? '#00c9ff' : '#0284c7'} />
              <Typography variant="caption" fontWeight={700} color={theme === 'dark' ? '#00c9ff' : '#0284c7'}>
                LIVE CROP PREVIEW
              </Typography>
            </Box>
            <Chip
              size="small"
              label={`${inchW}" × ${inchH}" (${mmW}×${mmH}mm)`}
              sx={{
                height: 20,
                fontSize: '0.7rem',
                bgcolor: theme === 'dark' ? 'rgba(0, 201, 255, 0.15)' : 'rgba(2, 132, 199, 0.12)',
                color: theme === 'dark' ? '#00c9ff' : '#0284c7',
                fontWeight: 700,
              }}
            />
          </Box>

          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              bgcolor: 'var(--canvas-bg)',
              p: 1.5,
              borderRadius: 2,
              border: '1px dashed',
              borderColor: 'divider',
              minHeight: 140,
              maxHeight: 180,
              overflow: 'hidden',
            }}
          >
            <canvas
              ref={previewCanvasRef}
              style={{
                maxWidth: '100%',
                maxHeight: '160px',
                borderRadius: '4px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
              }}
            />
          </Box>
        </Box>
      ) : (
        <Alert
          severity="info"
          icon={<Crosshair size={18} color={theme === 'dark' ? '#00c9ff' : '#0284c7'} />}
          sx={{
            bgcolor: theme === 'dark' ? 'rgba(0, 201, 255, 0.08)' : 'rgba(2, 132, 199, 0.08)',
            color: theme === 'dark' ? '#00c9ff' : '#0284c7',
            py: 0.8,
            fontSize: '0.8rem',
            alignItems: 'center',
          }}
          action={
            <Button
              color="inherit"
              size="small"
              startIcon={<Wand2 size={13} />}
              onClick={autoDetectLabel}
              sx={{ fontWeight: 700, fontSize: '0.75rem', textTransform: 'none' }}
            >
              Auto-Detect
            </Button>
          }
        >
          No area selected. Drag on viewer, use presets, or click Auto-Detect.
        </Alert>
      )}

      {/* Filename Pattern Selection */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
        <Typography variant="caption" color="text.secondary">
          Filename format:
        </Typography>
        <Select
          size="small"
          value={namingPattern}
          onChange={(e) => setNamingPattern(e.target.value)}
          sx={{
            fontSize: '0.75rem',
            height: 30,
            bgcolor: theme === 'dark' ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)',
            color: 'text.primary',
            '& .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' },
          }}
        >
          <MenuItem value="original_label" sx={{ fontSize: '0.75rem' }}>
            [original_name]_label.pdf
          </MenuItem>
          <MenuItem value="numbered" sx={{ fontSize: '0.75rem' }}>
            label_01.pdf, label_02.pdf...
          </MenuItem>
        </Select>
      </Box>

      {/* Progress Bar */}
      {isProcessing && (
        <Box sx={{ width: '100%' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              Processing document {processProgress.current} of {processProgress.total}...
            </Typography>
            <Typography variant="caption" fontWeight={700} color="secondary.main">
              {progressPercent}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={progressPercent}
            sx={{
              height: 8,
              borderRadius: 4,
              bgcolor: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
              '& .MuiLinearProgress-bar': {
                background: 'linear-gradient(90deg, #00c9ff 0%, #00d68f 100%)',
              },
            }}
          />
        </Box>
      )}

      {/* Batch Crop Action Button */}
      <Button
        variant="contained"
        size="large"
        disabled={isProcessing || !isReadyToCrop}
        onClick={handleBatchCrop}
        startIcon={<Scissors size={20} />}
        sx={{
          py: 1.5,
          fontWeight: 700,
          letterSpacing: '0.5px',
          background: 'linear-gradient(135deg, #00c9ff 0%, #0077ff 100%)',
          boxShadow: '0 6px 20px rgba(0, 201, 255, 0.35)',
          color: '#ffffff',
          '&:hover': {
            background: 'linear-gradient(135deg, #00b8e6 0%, #0066dd 100%)',
          },
          '&.Mui-disabled': {
            background: theme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
            color: theme === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.35)',
          },
        }}
      >
        {isProcessing
          ? `Cropping ${processProgress.current}/${processProgress.total}...`
          : `Apply Crop to All ${pdfFiles.length || 0} PDFs`}
      </Button>
    </Paper>
  );
}
