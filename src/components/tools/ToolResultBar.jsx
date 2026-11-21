import React, { useContext } from 'react';
import { Alert, Box, Button, Paper, Typography } from '@mui/material';
import { Archive, CheckCircle2, Download, RotateCcw } from 'lucide-react';
import { AppContext } from '../../context/AppContext';

/**
 * Standardized result banner with single download, bulk ZIP download, and reset CTA.
 */
export default function ToolResultBar({
  title = 'Your file is ready to download',
  subtitle = '',
  count = 1,
  singleLabel = 'Download File',
  zipLabel = 'Download All (.ZIP)',
  resetLabel = 'Process More Files',
  onDownloadSingle,
  onDownloadAllZip,
  onReset,
  zipping = false,
  warningMessage = '',
}) {
  const { theme } = useContext(AppContext);
  const isDark = theme === 'dark';
  const accent = isDark ? '#00c9ff' : '#0284c7';

  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 2, sm: 3 },
        borderRadius: 3,
        border: '1px solid',
        borderColor: isDark ? 'rgba(0, 214, 143, 0.3)' : 'rgba(0, 168, 107, 0.3)',
        bgcolor: isDark ? 'rgba(0, 214, 143, 0.06)' : 'rgba(0, 168, 107, 0.05)',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
          <Box
            sx={{
              p: 1.2,
              borderRadius: 2,
              bgcolor: 'rgba(0, 214, 143, 0.16)',
              color: '#00d68f',
              display: 'flex',
              flexShrink: 0,
            }}
          >
            <CheckCircle2 size={24} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1.2 }}>
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.3 }}>
                {subtitle}
              </Typography>
            )}
          </Box>
        </Box>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.2 }}>
          {count === 1 && onDownloadSingle && (
            <Button
              variant="contained"
              startIcon={<Download size={18} />}
              onClick={onDownloadSingle}
              sx={{
                py: 1.15,
                px: 2.5,
                fontWeight: 800,
                textTransform: 'none',
                borderRadius: 2.5,
                color: '#ffffff',
                background: 'linear-gradient(135deg, #00c9ff 0%, #0077ff 100%)',
                boxShadow: '0 6px 20px rgba(0, 201, 255, 0.3)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #00b8e6 0%, #0066dd 100%)',
                },
              }}
            >
              {singleLabel}
            </Button>
          )}

          {count > 1 && onDownloadAllZip && (
            <Button
              variant="contained"
              disabled={zipping}
              startIcon={<Archive size={18} />}
              onClick={onDownloadAllZip}
              sx={{
                py: 1.15,
                px: 2.5,
                fontWeight: 800,
                textTransform: 'none',
                borderRadius: 2.5,
                color: '#081420',
                background: 'linear-gradient(135deg, #00d68f 0%, #00c9ff 100%)',
                boxShadow: '0 6px 20px rgba(0, 214, 143, 0.3)',
              }}
            >
              {zipping ? 'Creating ZIP...' : zipLabel}
            </Button>
          )}

          {onReset && (
            <Button
              variant="outlined"
              startIcon={<RotateCcw size={16} />}
              onClick={onReset}
              sx={{
                textTransform: 'none',
                fontWeight: 700,
                borderRadius: 2.5,
                color: 'text.secondary',
                borderColor: 'divider',
                '&:hover': { borderColor: accent, color: accent },
              }}
            >
              {resetLabel}
            </Button>
          )}
        </Box>
      </Box>

      {warningMessage && (
        <Alert severity="warning" sx={{ mt: 2, borderRadius: 2 }}>
          {warningMessage}
        </Alert>
      )}
    </Paper>
  );
}
