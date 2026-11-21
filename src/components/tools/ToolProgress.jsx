import React, { useContext } from 'react';
import { LinearProgress, Paper, Typography } from '@mui/material';
import { AppContext } from '../../context/AppContext';

/**
 * Accessible progress panel displayed while files are processed.
 */
export default function ToolProgress({
  title = 'Processing your files...',
  subtitle = '',
  current = 0,
  total = 0,
  indeterminate = false,
  accentColor,
}) {
  const { theme } = useContext(AppContext);
  const isDark = theme === 'dark';
  const accent = accentColor || (isDark ? '#00c9ff' : '#0284c7');

  const pct =
    !indeterminate && total > 0
      ? Math.min(100, Math.round((current / total) * 100))
      : 0;

  return (
    <Paper
      elevation={0}
      aria-live="polite"
      sx={{
        p: { xs: 2.5, sm: 3.5 },
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'background.paper',
      }}
    >
      <Typography variant="subtitle1" sx={{ fontWeight: 700, textAlign: 'center', color: 'text.primary' }}>
        {title}
      </Typography>

      {subtitle && (
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            textAlign: 'center',
            color: 'text.secondary',
            mt: 0.4,
            mb: 2,
            wordBreak: 'break-word',
          }}
        >
          {subtitle}
        </Typography>
      )}

      <LinearProgress
        variant={indeterminate ? 'indeterminate' : 'determinate'}
        value={pct}
        sx={{
          mt: subtitle ? 0 : 2,
          height: 8,
          borderRadius: 4,
          bgcolor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
          '& .MuiLinearProgress-bar': {
            background: 'linear-gradient(90deg, #00c9ff 0%, #00d68f 100%)',
          },
        }}
      />

      {!indeterminate && (
        <Typography
          variant="caption"
          sx={{ display: 'block', textAlign: 'center', mt: 1, fontWeight: 700, color: accent }}
        >
          {pct}%
        </Typography>
      )}
    </Paper>
  );
}
