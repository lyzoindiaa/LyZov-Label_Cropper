import React, { useContext, useRef, useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  IconButton,
  Tooltip,
  Chip,
} from '@mui/material';
import {
  UploadCloud,
  FileText,
  Trash2,
  Plus,
} from 'lucide-react';
import { AppContext } from '../context/AppContext';

export default function PdfUploader() {
  const {
    pdfFiles,
    addPdfFiles,
    removePdfFile,
    clearAllFiles,
    selectedPdfIndex,
    setSelectedPdfIndex,
  } = useContext(AppContext);

  const fileInputRef = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addPdfFiles(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      addPdfFiles(e.target.files);
    }
    e.target.value = null;
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Drag and Drop Zone */}
      <Paper
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        sx={{
          p: 3,
          textAlign: 'center',
          cursor: 'pointer',
          borderRadius: 3,
          bgcolor: isDragOver ? 'rgba(0, 201, 255, 0.08)' : 'rgba(255, 255, 255, 0.02)',
          border: isDragOver
            ? '2px dashed #00c9ff'
            : '2px dashed rgba(255, 255, 255, 0.15)',
          transition: 'all 0.2s ease',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1.5,
          '&:hover': {
            borderColor: 'rgba(0, 201, 255, 0.6)',
            bgcolor: 'rgba(0, 201, 255, 0.04)',
          },
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          hidden
          multiple
          accept="application/pdf"
          onChange={handleFileInput}
        />
        <Box
          sx={{
            p: 1.5,
            borderRadius: '50%',
            bgcolor: 'rgba(0, 201, 255, 0.1)',
            color: '#00c9ff',
            display: 'flex',
          }}
        >
          <UploadCloud size={30} />
        </Box>
        <Box>
          <Typography variant="subtitle1" fontWeight={700}>
            Upload PDF Files
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Drag & drop multiple PDFs here, or click to browse
          </Typography>
        </Box>

        <Button
          size="small"
          variant="contained"
          startIcon={<Plus size={16} />}
          onClick={(e) => {
            e.stopPropagation();
            fileInputRef.current?.click();
          }}
          sx={{
            mt: 0.5,
            background: 'linear-gradient(135deg, #00c9ff 0%, #0072ff 100%)',
            fontWeight: 600,
            fontSize: '0.8rem',
            textTransform: 'none',
          }}
        >
          Browse Files
        </Button>
      </Paper>

      {/* Uploaded Files Manager */}
      {pdfFiles.length > 0 && (
        <Box
          sx={{
            bgcolor: 'rgba(255, 255, 255, 0.03)',
            borderRadius: 3,
            border: '1px solid rgba(255, 255, 255, 0.08)',
            p: 2,
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="subtitle2" fontWeight={700}>
                Uploaded Files
              </Typography>
              <Chip
                label={pdfFiles.length}
                size="small"
                sx={{
                  bgcolor: 'rgba(0, 201, 255, 0.2)',
                  color: '#00c9ff',
                  height: 20,
                  fontSize: '0.75rem',
                  fontWeight: 700,
                }}
              />
            </Box>
            <Button
              size="small"
              onClick={clearAllFiles}
              sx={{ color: 'text.secondary', fontSize: '0.75rem' }}
            >
              Clear All
            </Button>
          </Box>

          <List dense disablePadding sx={{ maxHeight: 220, overflowY: 'auto' }}>
            {pdfFiles.map((item, idx) => {
              const isSelected = idx === selectedPdfIndex;
              const sizeKb = Math.round(item.size / 1024);
              return (
                <ListItem
                  key={item.id || idx}
                  disablePadding
                  secondaryAction={
                    <Tooltip title="Remove File">
                      <IconButton
                        edge="end"
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          removePdfFile(idx);
                        }}
                        sx={{
                          color: 'rgba(255, 255, 255, 0.4)',
                          '&:hover': { color: '#ff4d6d' },
                        }}
                      >
                        <Trash2 size={16} />
                      </IconButton>
                    </Tooltip>
                  }
                  sx={{ mb: 0.5 }}
                >
                  <ListItemButton
                    selected={isSelected}
                    onClick={() => setSelectedPdfIndex(idx)}
                    sx={{
                      borderRadius: 2,
                      py: 0.8,
                      border: isSelected
                        ? '1px solid rgba(0, 201, 255, 0.5)'
                        : '1px solid transparent',
                      bgcolor: isSelected ? 'rgba(0, 201, 255, 0.08) !important' : 'transparent',
                    }}
                  >
                    <FileText
                      size={18}
                      color={isSelected ? '#00c9ff' : 'rgba(255,255,255,0.4)'}
                      style={{ marginRight: 10, flexShrink: 0 }}
                    />
                    <ListItemText
                      primary={
                        <Typography
                          variant="body2"
                          fontWeight={isSelected ? 700 : 500}
                          noWrap
                          sx={{ color: isSelected ? '#ffffff' : 'text.primary' }}
                        >
                          {item.name}
                        </Typography>
                      }
                      secondary={
                        <Typography variant="caption" color="text.secondary">
                          {sizeKb} KB • {isSelected ? 'Viewing in Editor' : 'Click to inspect'}
                        </Typography>
                      }
                    />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        </Box>
      )}
    </Box>
  );
}
