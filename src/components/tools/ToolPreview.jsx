import React, { useContext, useState } from 'react';
import { Box, Chip, Paper, Slider, Typography } from '@mui/material';
import { AppContext } from '../../context/AppContext';

const CHECKERBOARD_STYLE = {
  backgroundImage:
    'linear-gradient(45deg, rgba(148,163,184,0.22) 25%, transparent 25%), ' +
    'linear-gradient(-45deg, rgba(148,163,184,0.22) 25%, transparent 25%), ' +
    'linear-gradient(45deg, transparent 75%, rgba(148,163,184,0.22) 75%), ' +
    'linear-gradient(-45deg, transparent 75%, rgba(148,163,184,0.22) 75%)',
  backgroundSize: '18px 18px',
  backgroundPosition: '0 0, 0 9px, 9px -9px, -9px 0px',
};

/**
 * Before-and-after visual image comparison preview with split slider or side-by-side layout.
 */
export function ImageBeforeAfterPreview({
  beforeUrl,
  afterUrl,
  beforeLabel = 'Original',
  afterLabel = 'Processed',
  beforeMeta = '',
  afterMeta = '',
  transparentBackdrop = false,
  solidBgColor = null,
}) {
  const { theme } = useContext(AppContext);
  const isDark = theme === 'dark';
  const [splitPct, setSplitPct] = useState(50);

  if (!beforeUrl || !afterUrl) return null;

  const afterBackdropStyle = solidBgColor
    ? { backgroundColor: solidBgColor }
    : transparentBackdrop
      ? CHECKERBOARD_STYLE
      : { backgroundColor: isDark ? '#0b1020' : '#f1f5f9' };

  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 1.5, sm: 2.5 },
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'background.paper',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
          mb: 1.5,
        }}
      >
        <Chip
          label={`${beforeLabel}${beforeMeta ? ` · ${beforeMeta}` : ''}`}
          size="small"
          sx={{ fontWeight: 700, fontSize: '0.72rem' }}
        />
        <Chip
          label={`${afterLabel}${afterMeta ? ` · ${afterMeta}` : ''}`}
          size="small"
          color="primary"
          sx={{ fontWeight: 700, fontSize: '0.72rem' }}
        />
      </Box>

      {/* Interactive split preview container */}
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          maxHeight: 380,
          minHeight: 220,
          borderRadius: 2,
          overflow: 'hidden',
          border: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          ...afterBackdropStyle,
        }}
      >
        {/* Processed Image (Base) */}
        <Box
          component="img"
          src={afterUrl}
          alt={afterLabel}
          sx={{
            display: 'block',
            maxWidth: '100%',
            maxHeight: 360,
            objectFit: 'contain',
            userSelect: 'none',
          }}
        />

        {/* Original Image (Clipped overlay) */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            clipPath: `inset(0 ${100 - splitPct}% 0 0)`,
            bgcolor: isDark ? '#0b1020' : '#f1f5f9',
            pointerEvents: 'none',
          }}
        >
          <Box
            component="img"
            src={beforeUrl}
            alt={beforeLabel}
            sx={{
              display: 'block',
              maxWidth: '100%',
              maxHeight: 360,
              objectFit: 'contain',
              userSelect: 'none',
            }}
          />
        </Box>

        {/* Vertical divider indicator */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: `${splitPct}%`,
            width: 2,
            bgcolor: '#00c9ff',
            boxShadow: '0 0 8px rgba(0, 201, 255, 0.8)',
            pointerEvents: 'none',
          }}
        />
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1.5, px: 1 }}>
        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', minWidth: 52 }}>
          Before
        </Typography>
        <Slider
          size="small"
          value={splitPct}
          onChange={(_, v) => setSplitPct(Number(v))}
          aria-label="Before and after comparison slider"
        />
        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', minWidth: 42, textAlign: 'right' }}>
          After
        </Typography>
      </Box>
    </Paper>
  );
}

/**
 * Simple responsive PDF preview iframe wrapper.
 */
export function PdfDocumentPreview({ pdfUrl, title = 'PDF Preview', height = 460 }) {
  const { theme } = useContext(AppContext);
  const isDark = theme === 'dark';

  if (!pdfUrl) return null;

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 3,
        overflow: 'hidden',
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: isDark ? '#0b1020' : '#e2e8f0',
      }}
    >
      <Box
        sx={{
          px: 2,
          py: 1,
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: isDark ? 'rgba(255,255,255,0.04)' : '#ffffff',
        }}
      >
        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {title}
        </Typography>
      </Box>
      <iframe
        src={pdfUrl}
        title={title}
        width="100%"
        height={height}
        style={{ border: 'none', display: 'block', background: '#ffffff' }}
      />
    </Paper>
  );
}
