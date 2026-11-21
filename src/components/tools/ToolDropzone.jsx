import React, { useContext, useRef, useState } from 'react';
import { Alert, Box, Button, Paper, Typography } from '@mui/material';
import { Plus, UploadCloud } from 'lucide-react';
import { AppContext } from '../../context/AppContext';

/**
 * Reusable accessible drag-and-drop and click-to-browse file upload zone.
 */
export default function ToolDropzone({
  title = 'Drop your files here',
  subtitle = 'Supports drag & drop or browsing from your device',
  buttonLabel = 'Choose File',
  accept = '*/*',
  multiple = true,
  disabled = false,
  accentColor,
  errorMessages = [],
  onClearErrors,
  onFilesSelected,
  compact = false,
}) {
  const { theme } = useContext(AppContext);
  const isDark = theme === 'dark';
  const accent = accentColor || (isDark ? '#00c9ff' : '#0284c7');

  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleOpenPicker = () => {
    if (disabled) return;
    inputRef.current?.click();
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected?.(e.target.files);
    }
    e.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    if (e.dataTransfer?.files?.length > 0) {
      onFilesSelected?.(e.dataTransfer.files);
    }
  };

  const cardBg = isDark ? 'rgba(255, 255, 255, 0.03)' : 'background.paper';

  return (
    <Paper
      elevation={0}
      sx={{
        p: compact ? { xs: 1.5, sm: 2 } : { xs: 2, sm: 3.5 },
        width: '100%',
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: cardBg,
      }}
    >
      <input
        ref={inputRef}
        type="file"
        hidden
        multiple={multiple}
        accept={accept}
        onChange={handleFileChange}
        disabled={disabled}
      />

      <Box
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label={buttonLabel}
        onClick={handleOpenPicker}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleOpenPicker();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        sx={{
          p: compact ? { xs: 2, sm: 2.5 } : { xs: 3, sm: 5 },
          textAlign: 'center',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1,
          borderRadius: 3,
          border: '2px dashed',
          borderColor: isDragging ? accent : 'divider',
          bgcolor: isDragging
            ? `${accent}14`
            : isDark
              ? 'rgba(255, 255, 255, 0.02)'
              : 'rgba(0, 0, 0, 0.02)',
          transition: 'all 0.2s ease',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: compact ? 1 : 1.5,
          '&:hover': disabled
            ? undefined
            : {
                borderColor: accent,
                bgcolor: `${accent}0d`,
              },
        }}
      >
        <Box
          sx={{
            p: compact ? 1.1 : 1.5,
            borderRadius: '50%',
            bgcolor: `${accent}1a`,
            color: accent,
            display: 'flex',
          }}
        >
          <UploadCloud size={compact ? 24 : 30} />
        </Box>

        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary' }}>
            {title}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.3 }}>
            {subtitle}
          </Typography>
        </Box>

        <Button
          variant="contained"
          disabled={disabled}
          startIcon={<Plus size={16} />}
          onClick={(e) => {
            e.stopPropagation();
            handleOpenPicker();
          }}
          sx={{
            py: compact ? 0.8 : 1.05,
            px: 3,
            fontWeight: 800,
            fontSize: '0.9rem',
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
          {buttonLabel}
        </Button>
      </Box>

      {Array.isArray(errorMessages) && errorMessages.length > 0 && (
        <Alert
          severity="error"
          onClose={onClearErrors}
          sx={{ mt: 2, borderRadius: 2, textAlign: 'left' }}
        >
          {errorMessages.map((msg, i) => (
            <div key={i}>{msg}</div>
          ))}
        </Alert>
      )}
    </Paper>
  );
}
