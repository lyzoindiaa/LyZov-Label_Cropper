import React, { useContext, useState, useRef, useEffect, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  ButtonGroup,
  Button,
  Chip,
  Paper,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import {
  ZoomIn,
  ZoomOut,
  Trash2,
  RotateCw,
  RotateCcw,
  Hand,
  Crosshair,
  Layers,
  BookmarkPlus,
  Bookmark,
  X,
  Wand2,
  Maximize2,
} from 'lucide-react';
import { AppContext } from '../context/AppContext';

pdfjs.GlobalWorkerOptions.workerSrc = typeof window !== 'undefined'
  ? new URL('/pdf.worker.min.mjs', window.location.origin).toString()
  : `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const PDF_OPTIONS = {
  cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
  cMapPacked: true,
  standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/standard_fonts/`,
  wasmUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/wasm/`,
};


export default function PdfViewer() {
  const {
    pdfFiles,
    selectedPdfIndex,
    selection,
    setSelection,
    selectionMode,
    setSelectionMode,
    clearSelection,
    cropMode,
    selectCropMode,
    MARKETPLACE_PRESETS,
    autoDetectLabel,
    rotation,
    rotateClockwise,
    rotateCounterClockwise,
    customPresets,
    saveCurrentPreset,
    deleteCustomPreset,
    applyCustomPreset,
    zoom,
    setZoom,
    currentPage,
    setCurrentPage,
    theme,
    processBatchCrop,
    isProcessing,
  } = useContext(AppContext);

  const [numPages, setNumPages] = useState(null);
  const [pageDimensions, setPageDimensions] = useState({ width: 612, height: 792 });
  const [interactionMode, setInteractionMode] = useState(null);

  // References for ultra-smooth 60fps/120fps direct DOM manipulation
  const boxRef = useRef(null);
  const badgeTextRef = useRef(null);
  const currentBoxRef = useRef(selection);
  const pageRectRef = useRef(null);
  const interactionModeRef = useRef(null);
  const dragStartRef = useRef(null);
  const initialBoxRef = useRef(null);
  const moveRafRef = useRef(null);
  const pendingCoordsRef = useRef(null);

  // Keep currentBoxRef and DOM box synced with React selection state when not actively dragging
  useEffect(() => {
    currentBoxRef.current = selection;
    if (boxRef.current && selection && !interactionModeRef.current) {
      boxRef.current.style.left = `${selection.xRatio * 100}%`;
      boxRef.current.style.top = `${selection.yRatio * 100}%`;
      boxRef.current.style.width = `${selection.widthRatio * 100}%`;
      boxRef.current.style.height = `${selection.heightRatio * 100}%`;
    }
  }, [selection]);

  // Save preset dialog
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [presetNameInput, setPresetNameInput] = useState('');

  const containerRef = useRef(null);
  const pageWrapperRef = useRef(null);

  const activePdf = pdfFiles[selectedPdfIndex];

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setCurrentPage(1);
  };

  const onPageLoadSuccess = (page) => {
    const { width, height } = page;
    setPageDimensions({ width, height });
    if (containerRef.current && width > 0) {
      const containerWidth = containerRef.current.clientWidth - 32;
      if (containerWidth < width) {
        const autoScale = Number(Math.max(0.35, Math.min(1.0, containerWidth / width)).toFixed(2));
        setZoom(autoScale);
      }
    }
  };

  // Fit to container width helper
  const handleFitWidth = useCallback(() => {
    if (containerRef.current && pageDimensions.width > 0) {
      const containerWidth = containerRef.current.clientWidth - 48; // padding
      const targetScale = Math.min(2.0, Math.max(0.4, containerWidth / pageDimensions.width));
      setZoom(Number(targetScale.toFixed(2)));
    }
  }, [pageDimensions.width, setZoom]);

  // Auto-fit to container width on screen resize
  useEffect(() => {
    let timer = null;
    let lastWidth = window.innerWidth;
    const handleAutoFit = () => {
      // Mobile URL-bar show/hide fires height-only resizes; ignore them
      if (window.innerWidth === lastWidth) return;
      lastWidth = window.innerWidth;
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (containerRef.current && pageDimensions.width > 0) {
          const containerWidth = containerRef.current.clientWidth - 40;
          if (containerWidth < pageDimensions.width) {
            const autoScale = Number(Math.max(0.35, Math.min(1.0, containerWidth / pageDimensions.width)).toFixed(2));
            setZoom((prev) => (prev === autoScale ? prev : autoScale));
          }
        }
      }, 200);
    };
    window.addEventListener('resize', handleAutoFit);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleAutoFit);
    };
  }, [pageDimensions.width, setZoom]);

  const getRelativeCoords = (e) => {
    const rect = pageRectRef.current || pageWrapperRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0 || rect.height <= 0) return { x: 0, y: 0 };
    const clientX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
    const clientY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
    const rawX = (clientX - rect.left) / rect.width;
    const rawY = (clientY - rect.top) / rect.height;
    return {
      x: Math.max(0, Math.min(1, rawX)),
      y: Math.max(0, Math.min(1, rawY)),
    };
  };

  const handleWrapperPointerDown = (e) => {
    if (e.target.dataset.handle || e.target.dataset.role === 'selection-box') {
      return;
    }
    // If a selection already exists, clicking the wrapper should NOT wipe it out
    if (selection) {
      return;
    }
    if (selectionMode !== 'select') {
      return;
    }

    if (pageWrapperRef.current) {
      pageRectRef.current = pageWrapperRef.current.getBoundingClientRect();
    }
    const coords = getRelativeCoords(e);

    try {
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch {}
    setInteractionMode('draw');
    interactionModeRef.current = 'draw';
    dragStartRef.current = coords;
    initialBoxRef.current = null;
    currentBoxRef.current = {
      xRatio: coords.x,
      yRatio: coords.y,
      widthRatio: 0.001,
      heightRatio: 0.001,
    };
    setSelection(currentBoxRef.current);
  };

  const handleBoxPointerDown = (e) => {
    e.stopPropagation();
    try {
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch {}
    if (pageWrapperRef.current) {
      pageRectRef.current = pageWrapperRef.current.getBoundingClientRect();
    }
    const coords = getRelativeCoords(e);
    setInteractionMode('move');
    interactionModeRef.current = 'move';
    dragStartRef.current = coords;
    const box = { ...(currentBoxRef.current || selection) };
    initialBoxRef.current = box;
  };

  const handleResizePointerStart = (e, handleType) => {
    e.stopPropagation();
    try {
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch {}
    if (pageWrapperRef.current) {
      pageRectRef.current = pageWrapperRef.current.getBoundingClientRect();
    }
    const coords = getRelativeCoords(e);
    const mode = `resize-${handleType}`;
    setInteractionMode(mode);
    interactionModeRef.current = mode;
    dragStartRef.current = coords;
    const box = { ...(currentBoxRef.current || selection) };
    initialBoxRef.current = box;
  };

  // Perform direct DOM updates at 60fps/120fps without React re-render lag
  const applyMove = useCallback(() => {
    moveRafRef.current = null;
    const current = pendingCoordsRef.current;
    const mode = interactionModeRef.current;
    const start = dragStartRef.current;
    const box = initialBoxRef.current;

    if (!current || !mode || !start) return;

    let nextBox = null;

    if (mode === 'draw') {
      const x1 = Math.min(start.x, current.x);
      const y1 = Math.min(start.y, current.y);
      const x2 = Math.max(start.x, current.x);
      const y2 = Math.max(start.y, current.y);
      nextBox = {
        xRatio: x1,
        yRatio: y1,
        widthRatio: Math.max(0.02, x2 - x1),
        heightRatio: Math.max(0.02, y2 - y1),
      };
    } else if (mode === 'move' && box) {
      const dx = current.x - start.x;
      const dy = current.y - start.y;
      const newX = Math.max(0, Math.min(1 - box.widthRatio, box.xRatio + dx));
      const newY = Math.max(0, Math.min(1 - box.heightRatio, box.yRatio + dy));
      nextBox = {
        ...box,
        xRatio: newX,
        yRatio: newY,
      };
    } else if (mode.startsWith('resize-') && box) {
      const handle = mode.replace('resize-', '');
      let { xRatio, yRatio, widthRatio, heightRatio } = box;
      const dx = current.x - start.x;
      const dy = current.y - start.y;

      if (handle === 'se') {
        widthRatio = Math.max(0.04, Math.min(1 - xRatio, box.widthRatio + dx));
        heightRatio = Math.max(0.04, Math.min(1 - yRatio, box.heightRatio + dy));
      } else if (handle === 'sw') {
        const potentialX = Math.max(0, box.xRatio + dx);
        widthRatio = Math.max(0.04, (box.xRatio + box.widthRatio) - potentialX);
        xRatio = (box.xRatio + box.widthRatio) - widthRatio;
        heightRatio = Math.max(0.04, Math.min(1 - yRatio, box.heightRatio + dy));
      } else if (handle === 'ne') {
        const potentialY = Math.max(0, box.yRatio + dy);
        heightRatio = Math.max(0.04, (box.yRatio + box.heightRatio) - potentialY);
        yRatio = (box.yRatio + box.heightRatio) - heightRatio;
        widthRatio = Math.max(0.04, Math.min(1 - xRatio, box.widthRatio + dx));
      } else if (handle === 'nw') {
        const potentialX = Math.max(0, box.xRatio + dx);
        const potentialY = Math.max(0, box.yRatio + dy);
        widthRatio = Math.max(0.04, (box.xRatio + box.widthRatio) - potentialX);
        xRatio = (box.xRatio + box.widthRatio) - widthRatio;
        heightRatio = Math.max(0.04, (box.yRatio + box.heightRatio) - potentialY);
        yRatio = (box.yRatio + box.heightRatio) - heightRatio;
      } else if (handle === 'n') {
        const potentialY = Math.max(0, box.yRatio + dy);
        heightRatio = Math.max(0.04, (box.yRatio + box.heightRatio) - potentialY);
        yRatio = (box.yRatio + box.heightRatio) - heightRatio;
      } else if (handle === 's') {
        heightRatio = Math.max(0.04, Math.min(1 - yRatio, box.heightRatio + dy));
      } else if (handle === 'w') {
        const potentialX = Math.max(0, box.xRatio + dx);
        widthRatio = Math.max(0.04, (box.xRatio + box.widthRatio) - potentialX);
        xRatio = (box.xRatio + box.widthRatio) - widthRatio;
      } else if (handle === 'e') {
        widthRatio = Math.max(0.04, Math.min(1 - xRatio, box.widthRatio + dx));
      }

      nextBox = { xRatio, yRatio, widthRatio, heightRatio };
    }

    if (nextBox) {
      currentBoxRef.current = nextBox;
      if (boxRef.current) {
        boxRef.current.style.left = `${nextBox.xRatio * 100}%`;
        boxRef.current.style.top = `${nextBox.yRatio * 100}%`;
        boxRef.current.style.width = `${nextBox.widthRatio * 100}%`;
        boxRef.current.style.height = `${nextBox.heightRatio * 100}%`;
      }
      if (badgeTextRef.current) {
        const ptW = Math.round(nextBox.widthRatio * (pageDimensions.width || 612));
        const ptH = Math.round(nextBox.heightRatio * (pageDimensions.height || 792));
        const inW = (ptW / 72).toFixed(2);
        const inH = (ptH / 72).toFixed(2);
        badgeTextRef.current.textContent = `${inW}" × ${inH}"`;
      }
    }
  }, [pageDimensions.width, pageDimensions.height]);

  const handlePointerMove = useCallback((e) => {
    if (!interactionModeRef.current || !dragStartRef.current) return;
    pendingCoordsRef.current = getRelativeCoords(e);
    if (!moveRafRef.current) {
      moveRafRef.current = requestAnimationFrame(applyMove);
    }
  }, [applyMove]);

  const handlePointerUp = useCallback(() => {
    if (moveRafRef.current) {
      cancelAnimationFrame(moveRafRef.current);
      moveRafRef.current = null;
      applyMove();
    }
    if (currentBoxRef.current) {
      setSelection({ ...currentBoxRef.current });
    }
    setInteractionMode(null);
    interactionModeRef.current = null;
    dragStartRef.current = null;
    initialBoxRef.current = null;
    pageRectRef.current = null;
  }, [applyMove, setSelection]);

  const handleKeyDown = useCallback((e) => {
    if (!selection) return;
    const step = e.shiftKey ? 0.02 : 0.005;
    let handled = false;

    if (e.key === 'ArrowUp') {
      setSelection((prev) => prev && { ...prev, yRatio: Math.max(0, prev.yRatio - step) });
      handled = true;
    } else if (e.key === 'ArrowDown') {
      setSelection((prev) => prev && { ...prev, yRatio: Math.min(1 - prev.heightRatio, prev.yRatio + step) });
      handled = true;
    } else if (e.key === 'ArrowLeft') {
      setSelection((prev) => prev && { ...prev, xRatio: Math.max(0, prev.xRatio - step) });
      handled = true;
    } else if (e.key === 'ArrowRight') {
      setSelection((prev) => prev && { ...prev, xRatio: Math.min(1 - prev.widthRatio, prev.xRatio + step) });
      handled = true;
    } else if (e.key === 'Escape') {
      clearSelection();
      handled = true;
    }

    if (handled) {
      e.preventDefault();
    }
  }, [selection, setSelection, clearSelection]);

  useEffect(() => {
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handlePointerMove, handlePointerUp, handleKeyDown]);

  const handleSavePreset = () => {
    if (presetNameInput.trim()) {
      saveCurrentPreset(presetNameInput.trim());
      setPresetNameInput('');
      setSaveDialogOpen(false);
    }
  };

  const pointWidth = selection ? Math.round(selection.widthRatio * pageDimensions.width) : 0;
  const pointHeight = selection ? Math.round(selection.heightRatio * pageDimensions.height) : 0;
  const inchWidth = (pointWidth / 72).toFixed(2);
  const inchHeight = (pointHeight / 72).toFixed(2);

  if (!activePdf) {
    return (
      <Paper
        sx={{
          p: 8,
          textAlign: 'center',
          bgcolor: 'rgba(255, 255, 255, 0.02)',
          border: '1px dashed rgba(255, 255, 255, 0.15)',
          borderRadius: 3,
          width: '100%',
          flex: 1,
          minHeight: '75vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Layers size={56} color="#00c9ff" style={{ opacity: 0.6, marginBottom: 16 }} />
        <Typography variant="h5" fontWeight={700} gutterBottom>
          No PDF Opened
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 460 }}>
          Upload your PDFs in the left sidebar to inspect them cleanly across this workspace and select your label crop region.
        </Typography>
      </Paper>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.8, width: '100%', flex: 1 }}>
      {/* Top Toolbar: Mode, Presets, Rotation & Zoom */}
      <Box
        sx={{
          p: { xs: 1.2, sm: 1.5 },
          bgcolor: 'rgba(255, 255, 255, 0.04)',
          backdropFilter: { xs: 'none', md: 'blur(10px)' },
          borderRadius: 3,
          border: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          flexDirection: { xs: 'column', lg: 'row' },
          alignItems: { xs: 'stretch', lg: 'center' },
          justifyContent: 'space-between',
          gap: { xs: 1.2, sm: 1.5 },
          width: '100%',
        }}
      >
        {/* Mode Selector & Auto-Detect */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
          <ButtonGroup size="small">
            <Button
              variant={selectionMode === 'inspect' ? 'contained' : 'outlined'}
              startIcon={<Hand size={15} />}
              onClick={() => setSelectionMode('inspect')}
              sx={{
                fontSize: '0.75rem',
                textTransform: 'none',
                fontWeight: 600,
                ...(selectionMode === 'inspect'
                  ? { bgcolor: theme === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)', color: 'text.primary' }
                  : { color: 'text.secondary', borderColor: 'divider' }),
              }}
            >
              Inspect Mode
            </Button>
            <Button
              variant={selectionMode === 'select' ? 'contained' : 'outlined'}
              startIcon={<Crosshair size={15} />}
              onClick={() => setSelectionMode('select')}
              sx={{
                fontSize: '0.75rem',
                textTransform: 'none',
                fontWeight: 600,
                ...(selectionMode === 'select'
                  ? { bgcolor: '#00c9ff', color: '#081420', '&:hover': { bgcolor: '#00b4e6' } }
                  : { color: '#00c9ff', borderColor: 'rgba(0, 201, 255, 0.4)' }),
              }}
            >
              Select Crop Area
            </Button>
          </ButtonGroup>

          {/* Auto-Detect Label Button */}
          <Button
            size="small"
            variant="contained"
            startIcon={<Wand2 size={14} />}
            onClick={autoDetectLabel}
            sx={{
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'none',
              background: 'linear-gradient(135deg, #00c9ff 0%, #0077ff 100%)',
              color: '#ffffff',
              boxShadow: '0 2px 10px rgba(0, 201, 255, 0.3)',
            }}
          >
            Auto-Detect Label
          </Button>

          {/* Marketplace Label Mode Buttons */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, ml: 0.5, flexWrap: 'wrap' }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: { xs: 'none', sm: 'block' } }}>
              MARKETPLACE:
            </Typography>
            {Object.values(MARKETPLACE_PRESETS).map((p) => {
              const active = cropMode === p.id;
              return (
                <Button
                  key={p.id}
                  size="small"
                  variant={active ? 'contained' : 'outlined'}
                  onClick={() => selectCropMode(p.id)}
                  sx={{
                    fontSize: '0.72rem',
                    py: 0.2,
                    px: 0.9,
                    fontWeight: active ? 800 : 500,
                    bgcolor: active ? p.color : 'transparent',
                    color: active ? '#081420' : 'text.primary',
                    borderColor: active ? p.color : 'rgba(255, 255, 255, 0.15)',
                    '&:hover': {
                      borderColor: p.color,
                      bgcolor: active ? p.color : `${p.color}20`,
                    },
                  }}
                >
                  {p.name} {p.fixed ? '(Fixed)' : '(Adjust)'}
                </Button>
              );
            })}

            {/* Custom Saved Presets */}
            {customPresets.map((preset) => (
              <Chip
                key={preset.id}
                size="small"
                icon={<Bookmark size={12} color="#00c9ff" />}
                label={preset.name}
                onClick={() => applyCustomPreset(preset)}
                onDelete={() => deleteCustomPreset(preset.id)}
                deleteIcon={<X size={12} />}
                sx={{
                  height: 24,
                  fontSize: '0.72rem',
                  bgcolor: 'rgba(0, 201, 255, 0.15)',
                  color: '#00c9ff',
                  border: '1px solid rgba(0, 201, 255, 0.3)',
                  '& .MuiChip-deleteIcon': { color: '#ff4d6d' },
                }}
              />
            ))}

            {selection && (
              <Tooltip title="Save current selection as preset for future sessions">
                <Button
                  size="small"
                  startIcon={<BookmarkPlus size={13} />}
                  onClick={() => setSaveDialogOpen(true)}
                  sx={{
                    fontSize: '0.72rem',
                    py: 0.2,
                    px: 0.8,
                    color: '#00c9ff',
                    textTransform: 'none',
                  }}
                >
                  Save Preset
                </Button>
              </Tooltip>
            )}
          </Box>
        </Box>

        {/* Rotation, Zoom & Page Nav */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', justifyContent: { xs: 'flex-start', sm: 'flex-end' } }}>
          <ButtonGroup size="small" variant="outlined">
            <Tooltip title="Rotate Left 90°">
              <IconButton size="small" onClick={rotateCounterClockwise} sx={{ borderColor: 'divider' }}>
                <RotateCcw size={15} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Rotate Right 90°">
              <IconButton size="small" onClick={rotateClockwise} sx={{ borderColor: 'divider' }}>
                <RotateCw size={15} />
              </IconButton>
            </Tooltip>
          </ButtonGroup>

          {numPages > 1 && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, bgcolor: 'rgba(0, 201, 255, 0.08)', px: 1, py: 0.3, borderRadius: 2, border: '1px solid rgba(0, 201, 255, 0.25)' }}>
              <Typography variant="caption" sx={{ color: '#00c9ff', fontWeight: 700, mr: 0.5 }}>
                Page:
              </Typography>
              {Array.from({ length: Math.min(6, numPages) }, (_, i) => i + 1).map((pg) => (
                <Button
                  key={pg}
                  size="small"
                  variant={currentPage === pg ? 'contained' : 'outlined'}
                  onClick={() => setCurrentPage(pg)}
                  sx={{
                    minWidth: 26,
                    height: 24,
                    px: 0.8,
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    ...(currentPage === pg
                      ? { bgcolor: '#00c9ff', color: '#081420', '&:hover': { bgcolor: '#00b4e6' } }
                      : { color: '#00c9ff', borderColor: 'rgba(0, 201, 255, 0.3)' }),
                  }}
                >
                  {pg}
                </Button>
              ))}
              {numPages > 6 && (
                <Typography variant="caption" sx={{ color: 'text.secondary', ml: 0.5 }}>
                  /{numPages}
                </Typography>
              )}
            </Box>
          )}

          <ButtonGroup size="small" variant="outlined">
            <Tooltip title="Zoom Out">
              <IconButton
                size="small"
                onClick={() => setZoom((z) => Math.max(0.5, z - 0.15))}
                sx={{ borderColor: 'divider' }}
              >
                <ZoomOut size={15} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Fit to Container Width">
              <Button
                size="small"
                startIcon={<Maximize2 size={12} />}
                onClick={handleFitWidth}
                sx={{
                  fontSize: '0.72rem',
                  borderColor: 'divider',
                  color: 'text.secondary',
                  textTransform: 'none',
                  px: 1,
                }}
              >
                Fit Width
              </Button>
            </Tooltip>
            <Button
              size="small"
              onClick={() => setZoom(1.0)}
              sx={{
                fontSize: '0.72rem',
                minWidth: 44,
                borderColor: 'divider',
                color: 'text.secondary',
              }}
            >
              {Math.round(zoom * 100)}%
            </Button>
            <Tooltip title="Zoom In">
              <IconButton
                size="small"
                onClick={() => setZoom((z) => Math.min(2.5, z + 0.15))}
                sx={{ borderColor: 'divider' }}
              >
                <ZoomIn size={15} />
              </IconButton>
            </Tooltip>
          </ButtonGroup>

          {selection && (
            <Tooltip title="Remove Selection (Show Clean PDF)">
              <Button
                size="small"
                variant="outlined"
                color="error"
                startIcon={<Trash2 size={14} />}
                onClick={clearSelection}
                sx={{
                  fontSize: '0.72rem',
                  py: 0.2,
                  px: 1,
                  borderColor: 'rgba(255, 77, 109, 0.4)',
                  color: '#ff4d6d',
                  '&:hover': { bgcolor: 'rgba(255, 77, 109, 0.1)' },
                  textTransform: 'none',
                }}
              >
                Clear Selection
              </Button>
            </Tooltip>
          )}
        </Box>
      </Box>

      {/* Helpful Status Bar */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1 }}>
        <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
          {cropMode === 'amazon' && selection ? (
            <>
              📦 <b>Amazon — Full Page Auto-Selected:</b> The entire first page is automatically captured. Click <b>Crop &amp; Export</b> to extract your label.
            </>
          ) : cropMode !== 'other' && selection ? (
            <>
              🛍️ <b>{MARKETPLACE_PRESETS[cropMode]?.name} Fixed Mode:</b> Locked to standard label size ({inchWidth}" × {inchHeight}"). Drag inside the box to align with your label.
            </>
          ) : selection ? (
            <>
              ✨ <b>Custom Adjust Mode:</b> Drag inside the box to move. Drag corner dots to resize width &amp; height. Use Arrow keys to nudge.
            </>
          ) : selectionMode === 'select' ? (
            <>
              🎯 <b>Selection Mode Active:</b> Tap &amp; drag on the PDF below, or choose a marketplace above.
            </>
          ) : (
            <>
              🔍 Select a marketplace above (Amazon, Flipkart, Meesho) or tap <b>&quot;Auto-Detect Label&quot;</b>.
            </>
          )}
        </Typography>

        {selection && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              size="small"
              label={`${cropMode !== 'other' ? `🔒 ${MARKETPLACE_PRESETS[cropMode]?.name} • ` : ''}${inchWidth}" × ${inchHeight}" (${pointWidth} × ${pointHeight} pt)`}
              sx={{
                bgcolor: cropMode !== 'other' ? `${MARKETPLACE_PRESETS[cropMode]?.color}25` : 'rgba(0, 201, 255, 0.15)',
                color: cropMode !== 'other' ? MARKETPLACE_PRESETS[cropMode]?.color : '#00c9ff',
                fontWeight: 700,
                fontSize: '0.75rem',
                border: `1px solid ${cropMode !== 'other' ? MARKETPLACE_PRESETS[cropMode]?.color : 'rgba(0, 201, 255, 0.3)'}`,
              }}
            />
            <Button
              size="small"
              variant="contained"
              disabled={isProcessing}
              onClick={processBatchCrop}
              sx={{
                background: 'linear-gradient(135deg, #00c9ff 0%, #0077ff 100%)',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '0.75rem',
                textTransform: 'none',
                px: 1.5,
                py: 0.3,
                borderRadius: 2,
                boxShadow: '0 2px 10px rgba(0, 201, 255, 0.35)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #00b4e6 0%, #0066dd 100%)',
                },
              }}
            >
              {isProcessing ? 'Cropping...' : `✂️ Apply Crop (${pdfFiles.length} PDF${pdfFiles.length > 1 ? 's' : ''})`}
            </Button>
          </Box>
        )}
      </Box>

      {/* Interactive Full-Width PDF Canvas Container */}
      <Box
        ref={containerRef}
        className="crop-surface"
        sx={{
          position: 'relative',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          width: '100%',
          flex: 1,
          minHeight: { xs: '50vh', md: '75vh' },
          p: { xs: 1.5, sm: 3 },
          bgcolor: 'var(--canvas-bg)',
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          overflow: 'auto',
          userSelect: 'none',
          touchAction: 'pan-y',
        }}
      >
        <Box
          ref={pageWrapperRef}
          className="crop-surface"
          onPointerDown={handleWrapperPointerDown}
          sx={{
            position: 'relative',
            boxShadow: theme === 'dark' ? '0 16px 40px rgba(0,0,0,0.6)' : '0 12px 30px rgba(0,0,0,0.15)',
            cursor: selectionMode === 'select' ? 'crosshair' : 'default',
            lineHeight: 0,
            touchAction: 'pan-y',
            userSelect: 'none',
          }}
        >
          <Document
            file={activePdf.url}
            options={PDF_OPTIONS}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={(err) => {
              console.error('PDF Document Load Error:', err);
            }}
            loading={
              <Box sx={{ p: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <CircularProgress size={36} color="secondary" />
                <Typography variant="body2" color="text.secondary">
                  Rendering PDF...
                </Typography>
              </Box>
            }
            error={
              <Box sx={{ p: 6, textAlign: 'center' }}>
                <Typography variant="body2" color="error">
                  Failed to load PDF. Please check if file is valid.
                </Typography>
              </Box>
            }
          >
            <Page
              pageNumber={currentPage}
              scale={zoom}
              rotate={rotation}
              devicePixelRatio={Math.min(window.devicePixelRatio || 1, 2)}
              onLoadSuccess={onPageLoadSuccess}
              onRenderError={(err) => console.error('Page Render Error:', err)}
              renderAnnotationLayer={false}
              renderTextLayer={false}
            />
          </Document>

          {/* Interactive Crop Box */}
          {selection && (
            <Box
              ref={boxRef}
              data-role="selection-box"
              onPointerDown={handleBoxPointerDown}
              sx={{
                position: 'absolute',
                left: `${selection.xRatio * 100}%`,
                top: `${selection.yRatio * 100}%`,
                width: `${selection.widthRatio * 100}%`,
                height: `${selection.heightRatio * 100}%`,
                border: `2px solid ${cropMode !== 'other' ? MARKETPLACE_PRESETS[cropMode]?.color || '#00c9ff' : '#00c9ff'}`,
                boxShadow: interactionMode
                  ? '0 0 0 9999px rgba(0, 0, 0, 0.55)'
                  : '0 0 0 9999px rgba(0, 0, 0, 0.55), 0 0 15px rgba(0, 201, 255, 0.5)',
                willChange: interactionMode ? 'left, top, width, height' : 'auto',
                cursor: 'move',
                zIndex: 10,
                boxSizing: 'border-box',
                touchAction: 'none',
                transition: interactionMode ? 'none' : 'border-color 0.15s ease',
              }}
            >
              {/* Header Badge */}
              <Box
                sx={{
                  position: 'absolute',
                  top: -24,
                  left: 0,
                  bgcolor: cropMode !== 'other' ? MARKETPLACE_PRESETS[cropMode]?.color || '#00c9ff' : '#00c9ff',
                  color: '#ffffff',
                  px: 1,
                  py: 0.2,
                  borderRadius: '4px 4px 0 0',
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  pointerEvents: 'none',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                }}
              >
                <span>{cropMode !== 'other' ? `🔒 ${MARKETPLACE_PRESETS[cropMode]?.name}` : '📐 Custom'}</span>
                <span>•</span>
                <span ref={badgeTextRef}>{inchWidth}" × {inchHeight}"</span>
              </Box>

              {/* 8 Drag Handles – available in 'other' (Adjustable) mode with generous touch hit areas */}
              {cropMode === 'other' && (
                <>
                  {/* 4 Corner Handles */}
                  {[
                    { id: 'nw', top: -12, left: -12, cursor: 'nw-resize' },
                    { id: 'ne', top: -12, left: 'calc(100% - 12px)', cursor: 'ne-resize' },
                    { id: 'se', top: 'calc(100% - 12px)', left: 'calc(100% - 12px)', cursor: 'se-resize' },
                    { id: 'sw', top: 'calc(100% - 12px)', left: -12, cursor: 'sw-resize' },
                  ].map((h) => (
                    <Box
                      key={h.id}
                      data-handle={h.id}
                      onPointerDown={(e) => handleResizePointerStart(e, h.id)}
                      sx={{
                        position: 'absolute',
                        width: 24,
                        height: 24,
                        bgcolor: '#ffffff',
                        border: '2.5px solid #00c9ff',
                        borderRadius: '50%',
                        top: h.top,
                        left: h.left,
                        cursor: h.cursor,
                        zIndex: 25,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
                        touchAction: 'none',
                        userSelect: 'none',
                        '&:hover': {
                          transform: 'scale(1.15)',
                          bgcolor: '#e6f9ff',
                        },
                        '&::before': {
                          content: '""',
                          position: 'absolute',
                          top: -12,
                          left: -12,
                          width: 48,
                          height: 48,
                          borderRadius: '50%',
                        },
                      }}
                    />
                  ))}

                  {/* 4 Edge Handles (Top, Bottom, Left, Right) */}
                  {[
                    { id: 'n', top: -10, left: 'calc(50% - 18px)', width: 36, height: 18, cursor: 'n-resize', borderRadius: '9px' },
                    { id: 's', top: 'calc(100% - 8px)', left: 'calc(50% - 18px)', width: 36, height: 18, cursor: 's-resize', borderRadius: '9px' },
                    { id: 'w', top: 'calc(50% - 18px)', left: -10, width: 18, height: 36, cursor: 'w-resize', borderRadius: '9px' },
                    { id: 'e', top: 'calc(50% - 18px)', left: 'calc(100% - 8px)', width: 18, height: 36, cursor: 'e-resize', borderRadius: '9px' },
                  ].map((h) => (
                    <Box
                      key={h.id}
                      data-handle={h.id}
                      onPointerDown={(e) => handleResizePointerStart(e, h.id)}
                      sx={{
                        position: 'absolute',
                        width: h.width,
                        height: h.height,
                        bgcolor: '#ffffff',
                        border: '2px solid #00c9ff',
                        borderRadius: h.borderRadius,
                        top: h.top,
                        left: h.left,
                        cursor: h.cursor,
                        zIndex: 24,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                        touchAction: 'none',
                        userSelect: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        '&:hover': {
                          transform: 'scale(1.1)',
                          bgcolor: '#e6f9ff',
                        },
                        '&::before': {
                          content: '""',
                          position: 'absolute',
                          top: -10,
                          left: -10,
                          width: 'calc(100% + 20px)',
                          height: 'calc(100% + 20px)',
                        },
                      }}
                    >
                      <Box sx={{ width: h.width > h.height ? 14 : 3, height: h.width > h.height ? 3 : 14, bgcolor: '#00c9ff', borderRadius: 1 }} />
                    </Box>
                  ))}
                </>
              )}
            </Box>
          )}
        </Box>
      </Box>

      {/* Save Custom Preset Dialog */}
      <Dialog
        open={saveDialogOpen}
        onClose={() => setSaveDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 3,
            },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Save Custom Label Preset</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Save this exact crop area ({inchWidth}" × {inchHeight}") to browser storage for instant reuse.
          </Typography>
          <TextField
            autoFocus
            fullWidth
            label="Preset Name (e.g. Shopify 4x6, FBA Box)"
            value={presetNameInput}
            onChange={(e) => setPresetNameInput(e.target.value)}
            size="small"
            onKeyDown={(e) => e.key === 'Enter' && handleSavePreset()}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setSaveDialogOpen(false)} sx={{ color: 'text.secondary' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSavePreset}
            disabled={!presetNameInput.trim()}
            sx={{ bgcolor: '#00c9ff', color: '#081420', fontWeight: 700 }}
          >
            Save Preset
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
