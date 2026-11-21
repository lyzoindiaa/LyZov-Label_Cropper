import React, { useContext } from 'react';
import {
  Box,
  Button,
  Chip,
  IconButton,
  Paper,
  Tooltip,
  Typography,
} from '@mui/material';
import { ArrowDown, ArrowUp, FileText, Image as ImageIcon, RotateCcw, Trash2 } from 'lucide-react';
import { AppContext } from '../../context/AppContext';
import { formatBytes } from '../../utils/fileValidation';

/**
 * Reusable bulk file queue with thumbnails, metadata chips, optional reordering,
 * per-item removal, and Clear All.
 */
export default function ToolFileList({
  items = [],
  title = 'Selected Files',
  allowReorder = false,
  disabled = false,
  onMoveItem,
  onRemoveItem,
  onClearAll,
  renderMeta,
}) {
  const { theme } = useContext(AppContext);
  const isDark = theme === 'dark';

  if (!items || items.length === 0) return null;

  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 2, sm: 2.5 },
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'background.paper',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 1,
          mb: 1.5,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary' }}>
            {title}
          </Typography>
          <Chip
            label={`${items.length} ${items.length === 1 ? 'file' : 'files'}`}
            size="small"
            sx={{
              fontWeight: 700,
              fontSize: '0.72rem',
              bgcolor: isDark ? 'rgba(0, 201, 255, 0.14)' : 'rgba(2, 132, 199, 0.1)',
              color: isDark ? '#00c9ff' : '#0284c7',
            }}
          />
        </Box>

        <Button
          size="small"
          variant="text"
          disabled={disabled}
          startIcon={<RotateCcw size={14} />}
          onClick={onClearAll}
          sx={{
            textTransform: 'none',
            fontWeight: 700,
            color: 'text.secondary',
            '&:hover': { color: '#ef4444' },
          }}
        >
          Clear All
        </Button>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, maxHeight: 340, overflowY: 'auto' }}>
        {items.map((item, idx) => (
          <Box
            key={item.id || `${item.name}-${idx}`}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1.5,
              p: 1.2,
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.015)',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0, flex: 1 }}>
              {item.previewUrl ? (
                <Box
                  component="img"
                  src={item.previewUrl}
                  alt={item.name}
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: 1.5,
                    objectFit: 'cover',
                    border: '1px solid',
                    borderColor: 'divider',
                    flexShrink: 0,
                    bgcolor: isDark ? '#0b1020' : '#f1f5f9',
                  }}
                />
              ) : (
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: isDark ? 'rgba(0, 201, 255, 0.12)' : 'rgba(2, 132, 199, 0.08)',
                    color: isDark ? '#00c9ff' : '#0284c7',
                    flexShrink: 0,
                  }}
                >
                  {item.kind === 'image' ? <ImageIcon size={18} /> : <FileText size={18} />}
                </Box>
              )}

              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography
                  variant="body2"
                  noWrap
                  title={item.name}
                  sx={{ fontWeight: 600, color: 'text.primary' }}
                >
                  {item.name}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                  {formatBytes(item.size)}
                  {renderMeta ? ` · ${renderMeta(item, idx)}` : ''}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
              {allowReorder && (
                <>
                  <Tooltip title="Move Up">
                    <span>
                      <IconButton
                        size="small"
                        disabled={disabled || idx === 0}
                        onClick={() => onMoveItem?.(idx, idx - 1)}
                        aria-label={`Move ${item.name} up`}
                      >
                        <ArrowUp size={15} />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="Move Down">
                    <span>
                      <IconButton
                        size="small"
                        disabled={disabled || idx === items.length - 1}
                        onClick={() => onMoveItem?.(idx, idx + 1)}
                        aria-label={`Move ${item.name} down`}
                      >
                        <ArrowDown size={15} />
                      </IconButton>
                    </span>
                  </Tooltip>
                </>
              )}

              <Tooltip title="Remove file">
                <IconButton
                  size="small"
                  disabled={disabled}
                  onClick={() => onRemoveItem?.(idx)}
                  aria-label={`Remove ${item.name}`}
                  sx={{ color: 'text.secondary', '&:hover': { color: '#ef4444' } }}
                >
                  <Trash2 size={16} />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        ))}
      </Box>
    </Paper>
  );
}
