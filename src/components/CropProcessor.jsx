import React, { useContext, useState } from 'react';
import {
  Box,
  Button,
  LinearProgress,
  Typography,
  Paper,
  Radio,
  RadioGroup,
  Chip,
  Select,
  MenuItem,
  Collapse,
} from '@mui/material';
import {
  Scissors,
  RotateCw,
  Settings,
} from 'lucide-react';
import { AppContext } from '../context/AppContext';

export default function CropProcessor() {
  const {
    pdfFiles,
    selection,
    cropMode,
    selectCropMode,
    MARKETPLACE_PRESETS,
    rotation,
    isProcessing,
    processProgress,
    namingPattern,
    setNamingPattern,
    theme,
    processBatchCrop,
  } = useContext(AppContext);

  const [showAdvanced, setShowAdvanced] = useState(false);

  const progressPercent =
    processProgress.total > 0
      ? Math.round((processProgress.current / processProgress.total) * 100)
      : 0;

  const isReadyToCrop = selection !== null && pdfFiles.length > 0;

  return (
    <Paper
      sx={{
        p: { xs: 1.8, sm: 2.2 },
        bgcolor: theme === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
        display: 'flex',
        flexDirection: 'column',
        gap: 1.8,
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="subtitle2" fontWeight={800} sx={{ fontSize: '0.9rem' }}>
          🏷️ Select Store
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

      {/* 4 Marketplace Tiles */}
      <RadioGroup
        value={cropMode || 'amazon'}
        onChange={(e) => {
          if (e.target.value) selectCropMode(e.target.value);
        }}
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
                  ? `2px solid ${p.color}`
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
                value={p.id}
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
                  {p.id === 'other' ? 'Custom size & position' : 'Standard auto-fit'}
                </Typography>
              </Box>
            </Box>
          );
        })}
      </RadioGroup>

      {/* Progress Bar (Visible only when processing) */}
      {isProcessing && (
        <Box sx={{ width: '100%' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              Cropping document {processProgress.current} of {processProgress.total}...
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

      {/* Big Action Button */}
      <Button
        variant="contained"
        size="large"
        disabled={isProcessing || !isReadyToCrop}
        onClick={processBatchCrop}
        startIcon={<Scissors size={20} />}
        sx={{
          py: 1.6,
          fontWeight: 800,
          fontSize: '0.95rem',
          letterSpacing: '0.3px',
          textTransform: 'none',
          borderRadius: 2.5,
          background: 'linear-gradient(135deg, #00c9ff 0%, #0077ff 100%)',
          boxShadow: isReadyToCrop ? '0 6px 20px rgba(0, 201, 255, 0.35)' : 'none',
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
          ? `Cropping ${processProgress.current} of ${processProgress.total}...`
          : !pdfFiles.length
          ? 'Upload PDF to Crop'
          : `✂️ Crop & Download ${pdfFiles.length} ${pdfFiles.length === 1 ? 'PDF' : 'PDFs'}`}
      </Button>

      {/* Subtle Advanced Filename Option (Collapsible, out of the way) */}
      <Box sx={{ pt: 0.5 }}>
        <Button
          size="small"
          variant="text"
          onClick={() => setShowAdvanced((v) => !v)}
          startIcon={<Settings size={13} />}
          sx={{
            fontSize: '0.72rem',
            color: 'text.secondary',
            textTransform: 'none',
            p: 0,
            '&:hover': { color: 'text.primary', bgcolor: 'transparent' },
          }}
        >
          {showAdvanced ? 'Hide options' : '⚙️ Filename format'}
        </Button>

        <Collapse in={showAdvanced}>
          <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Name format:
            </Typography>
            <Select
              size="small"
              value={namingPattern}
              onChange={(e) => setNamingPattern(e.target.value)}
              sx={{
                fontSize: '0.72rem',
                height: 28,
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
        </Collapse>
      </Box>
    </Paper>
  );
}
