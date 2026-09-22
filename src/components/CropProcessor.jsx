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
    splitMode,
    setSplitMode,
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
  } = useContext(AppContext);

  const previewCanvasRef = useRef(null);

  // Live real-time crop snippet canvas rendering
  useEffect(() => {
    if (!selection || splitMode !== 'none') return;

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
    targetCanvas.width = maxPreviewW;
    targetCanvas.height = Math.round(maxPreviewW / aspect);

    ctx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
    ctx.drawImage(sourceCanvas, sx, sy, sw, sh, 0, 0, targetCanvas.width, targetCanvas.height);
  }, [selection, selectedPdfIndex, rotation, splitMode]);

  const handleBatchCrop = async () => {
    if (splitMode === 'none' && !selection) {
      alert('Please select a crop area or choose a Grid Split mode first.');
      return;
    }
    if (pdfFiles.length === 0) {
      alert('Please upload at least one PDF file first.');
      return;
    }

    setIsProcessing(true);
    setProcessProgress({ current: 0, total: pdfFiles.length });

    const results = [];
    try {
      for (let i = 0; i < pdfFiles.length; i++) {
        const item = pdfFiles[i];
        setProcessProgress({ current: i + 1, total: pdfFiles.length });

        const croppedItems = await cropPdfBlob(item.file, selection, {
          ...cropOptions,
          rotation,
          splitMode,
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

  const isReadyToCrop = (selection !== null || splitMode !== 'none') && pdfFiles.length > 0;

  return (
    <Paper
      sx={{
        p: 2.5,
        bgcolor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 3,
        border: '1px solid rgba(255, 255, 255, 0.08)',
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

      {/* Slicing / Grid Mode */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.8 }}>
        <Typography variant="caption" color="text.secondary" fontWeight={600}>
          CROP / SPLIT MODE:
        </Typography>
        <RadioGroup
          value={splitMode}
          onChange={(e) => setSplitMode(e.target.value)}
          sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.5 }}
        >
          <FormControlLabel
            value="none"
            control={<Radio size="small" sx={{ color: '#00c9ff', '&.Mui-checked': { color: '#00c9ff' } }} />}
            label={<Typography variant="caption">Single Crop Box</Typography>}
          />
          <FormControlLabel
            value="2-up-vertical"
            control={<Radio size="small" sx={{ color: '#00c9ff', '&.Mui-checked': { color: '#00c9ff' } }} />}
            label={<Typography variant="caption">2-Up Top / Bottom</Typography>}
          />
          <FormControlLabel
            value="2-up-horizontal"
            control={<Radio size="small" sx={{ color: '#00c9ff', '&.Mui-checked': { color: '#00c9ff' } }} />}
            label={<Typography variant="caption">2-Up Left / Right</Typography>}
          />
          <FormControlLabel
            value="4-up-grid"
            control={<Radio size="small" sx={{ color: '#00c9ff', '&.Mui-checked': { color: '#00c9ff' } }} />}
            label={<Typography variant="caption">4-Up Grid (2×2)</Typography>}
          />
        </RadioGroup>
      </Box>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)' }} />

      {/* Pages to crop */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="caption" color="text.secondary">
          Pages per document:
        </Typography>
        <RadioGroup
          row
          value={cropOptions.pagesToCrop}
          onChange={(e) => setCropOptions({ ...cropOptions, pagesToCrop: e.target.value })}
        >
          <FormControlLabel
            value="all"
            control={<Radio size="small" sx={{ color: '#00c9ff', '&.Mui-checked': { color: '#00c9ff' } }} />}
            label={<Typography variant="caption">All</Typography>}
          />
          <FormControlLabel
            value="first"
            control={<Radio size="small" sx={{ color: '#00c9ff', '&.Mui-checked': { color: '#00c9ff' } }} />}
            label={<Typography variant="caption">First Only</Typography>}
          />
        </RadioGroup>
      </Box>

      {/* Live Preview Card or Split Mode Notification */}
      {splitMode !== 'none' ? (
        <Box
          sx={{
            p: 1.8,
            borderRadius: 2,
            bgcolor: 'rgba(0, 201, 255, 0.08)',
            border: '1px solid rgba(0, 201, 255, 0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
          }}
        >
          <GridIcon size={24} color="#00c9ff" />
          <Box>
            <Typography variant="body2" fontWeight={700} color="#00c9ff">
              {splitMode === '4-up-grid' ? '4-Up Grid Split Active' : '2-Up Sheet Split Active'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Each sheet will be automatically split into{' '}
              {splitMode === '4-up-grid' ? '4' : '2'} separate thermal labels.
            </Typography>
          </Box>
        </Box>
      ) : selection ? (
        <Box
          sx={{
            p: 1.8,
            borderRadius: 2.5,
            bgcolor: 'rgba(0, 0, 0, 0.35)',
            border: '1px solid rgba(0, 201, 255, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            gap: 1.5,
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
              <Eye size={15} color="#00c9ff" />
              <Typography variant="caption" fontWeight={700} color="#00c9ff">
                LIVE CROP PREVIEW
              </Typography>
            </Box>
            <Chip
              size="small"
              label={`${inchW}" × ${inchH}" (${mmW}×${mmH}mm)`}
              sx={{
                height: 20,
                fontSize: '0.7rem',
                bgcolor: 'rgba(0, 201, 255, 0.15)',
                color: '#00c9ff',
                fontWeight: 700,
              }}
            />
          </Box>

          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              bgcolor: '#06090e',
              p: 1.5,
              borderRadius: 2,
              border: '1px dashed rgba(255, 255, 255, 0.1)',
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
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
              }}
            />
          </Box>
        </Box>
      ) : (
        <Alert
          severity="info"
          icon={<Crosshair size={18} color="#00c9ff" />}
          sx={{
            bgcolor: 'rgba(0, 201, 255, 0.08)',
            color: '#00c9ff',
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
            bgcolor: 'rgba(255, 255, 255, 0.04)',
            color: 'text.primary',
            '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.12)' },
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
              bgcolor: 'rgba(255, 255, 255, 0.1)',
              '& .MuiLinearProgress-bar': {
                background: 'linear-gradient(90deg, #00c9ff 0%, #ff6ec7 100%)',
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
          background: 'linear-gradient(135deg, #ff6ec7 0%, #7873f5 100%)',
          boxShadow: '0 6px 20px rgba(255, 110, 199, 0.35)',
          '&:hover': {
            background: 'linear-gradient(135deg, #ff5ebc 0%, #6964eb 100%)',
          },
          '&.Mui-disabled': {
            background: 'rgba(255, 255, 255, 0.08)',
            color: 'rgba(255, 255, 255, 0.3)',
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
