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
import { detectLabelBoundingBox } from '../utils/pdfUtils';

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

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
    splitMode,
    autoDetectLabel,
    rotation,
    rotateClockwise,
    rotateCounterClockwise,
    applyPreset,
    customPresets,
    saveCurrentPreset,
    deleteCustomPreset,
    applyCustomPreset,
    zoom,
    setZoom,
    currentPage,
    setCurrentPage,
  } = useContext(AppContext);

  const [numPages, setNumPages] = useState(null);
  const [pageDimensions, setPageDimensions] = useState({ width: 612, height: 792 });
  const [interactionMode, setInteractionMode] = useState(null);
  const [dragStart, setDragStart] = useState(null);
  const [initialBox, setInitialBox] = useState(null);

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
  };

  // Fit to container width helper
  const handleFitWidth = useCallback(() => {
    if (containerRef.current && pageDimensions.width > 0) {
      const containerWidth = containerRef.current.clientWidth - 48; // padding
      const targetScale = Math.min(2.0, Math.max(0.6, containerWidth / pageDimensions.width));
      setZoom(Number(targetScale.toFixed(2)));
    }
  }, [pageDimensions.width, setZoom]);

  const getRelativeCoords = (e) => {
    if (!pageWrapperRef.current) return { x: 0, y: 0 };
    const rect = pageWrapperRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const rawX = (clientX - rect.left) / rect.width;
    const rawY = (clientY - rect.top) / rect.height;
    return {
      x: Math.max(0, Math.min(1, rawX)),
      y: Math.max(0, Math.min(1, rawY)),
    };
  };

  const handleWrapperMouseDown = (e) => {
    // Prevent default scroll on touch so drawing doesn't scroll the page
    if (e.touches) e.preventDefault();
    if (e.target.dataset.handle || e.target.dataset.role === 'selection-box') {
      return;
    }
    if (selectionMode !== 'select' && !selection) {
      return;
    }

    const coords = getRelativeCoords(e);
    setInteractionMode('draw');
    setDragStart(coords);
    setSelection({
      xRatio: coords.x,
      yRatio: coords.y,
      widthRatio: 0.001,
      heightRatio: 0.001,
    });
  };

  const handleBoxMouseDown = (e) => {
    e.stopPropagation();
    const coords = getRelativeCoords(e);
    setInteractionMode('move');
    setDragStart(coords);
    setInitialBox({ ...selection });
  };

  const handleResizeStart = (e, handleType) => {
    e.stopPropagation();
    const coords = getRelativeCoords(e);
    setInteractionMode(`resize-${handleType}`);
    setDragStart(coords);
    setInitialBox({ ...selection });
  };

  const handleMouseMove = useCallback((e) => {
    if (!interactionMode || !dragStart) return;
    // Prevent page scroll while dragging a crop region on touch devices
    if (e.touches) e.preventDefault();
    const current = getRelativeCoords(e);

    if (interactionMode === 'draw') {
      const x1 = Math.min(dragStart.x, current.x);
      const y1 = Math.min(dragStart.y, current.y);
      const x2 = Math.max(dragStart.x, current.x);
      const y2 = Math.max(dragStart.y, current.y);
      setSelection({
        xRatio: x1,
        yRatio: y1,
        widthRatio: Math.max(0.02, x2 - x1),
        heightRatio: Math.max(0.02, y2 - y1),
      });
    } else if (interactionMode === 'move' && initialBox) {
      const dx = current.x - dragStart.x;
      const dy = current.y - dragStart.y;
      const newX = Math.max(0, Math.min(1 - initialBox.widthRatio, initialBox.xRatio + dx));
      const newY = Math.max(0, Math.min(1 - initialBox.heightRatio, initialBox.yRatio + dy));
      setSelection({
        ...initialBox,
        xRatio: newX,
        yRatio: newY,
      });
    } else if (interactionMode.startsWith('resize-') && initialBox) {
      const handle = interactionMode.replace('resize-', '');
      let { xRatio, yRatio, widthRatio, heightRatio } = initialBox;
      const dx = current.x - dragStart.x;
      const dy = current.y - dragStart.y;

      if (handle === 'se') {
        widthRatio = Math.max(0.04, Math.min(1 - xRatio, initialBox.widthRatio + dx));
        heightRatio = Math.max(0.04, Math.min(1 - yRatio, initialBox.heightRatio + dy));
      } else if (handle === 'sw') {
        const potentialX = Math.max(0, initialBox.xRatio + dx);
        widthRatio = Math.max(0.04, (initialBox.xRatio + initialBox.widthRatio) - potentialX);
        xRatio = (initialBox.xRatio + initialBox.widthRatio) - widthRatio;
        heightRatio = Math.max(0.04, Math.min(1 - yRatio, initialBox.heightRatio + dy));
      } else if (handle === 'ne') {
        const potentialY = Math.max(0, initialBox.yRatio + dy);
        heightRatio = Math.max(0.04, (initialBox.yRatio + initialBox.heightRatio) - potentialY);
        yRatio = (initialBox.yRatio + initialBox.heightRatio) - heightRatio;
        widthRatio = Math.max(0.04, Math.min(1 - xRatio, initialBox.widthRatio + dx));
      } else if (handle === 'nw') {
        const potentialX = Math.max(0, initialBox.xRatio + dx);
        const potentialY = Math.max(0, initialBox.yRatio + dy);
        widthRatio = Math.max(0.04, (initialBox.xRatio + initialBox.widthRatio) - potentialX);
        xRatio = (initialBox.xRatio + initialBox.widthRatio) - widthRatio;
        heightRatio = Math.max(0.04, (initialBox.yRatio + initialBox.heightRatio) - potentialY);
        yRatio = (initialBox.yRatio + initialBox.heightRatio) - heightRatio;
      }

      setSelection({ xRatio, yRatio, widthRatio, heightRatio });
    }
  }, [interactionMode, dragStart, initialBox, setSelection]);

  const handleMouseUp = useCallback(() => {
    setInteractionMode(null);
    setDragStart(null);
    setInitialBox(null);
  }, []);

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
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleMouseMove, { passive: false });
    window.addEventListener('touchend', handleMouseUp);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleMouseMove, handleMouseUp, handleKeyDown]);

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
          p: { xs: 1, sm: 1.5 },
          bgcolor: 'rgba(255, 255, 255, 0.04)',
          backdropFilter: 'blur(10px)',
          borderRadius: 3,
          border: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: { xs: 1, sm: 1.5 },
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
                  ? { bgcolor: 'rgba(255,255,255,0.15)', color: '#fff' }
                  : { color: 'text.secondary', borderColor: 'rgba(255,255,255,0.15)' }),
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
              background: 'linear-gradient(135deg, #00c9ff 0%, #ff6ec7 100%)',
              color: '#ffffff',
              boxShadow: '0 2px 10px rgba(0, 201, 255, 0.3)',
            }}
          >
            Auto-Detect Label
          </Button>

          {/* Thermal Presets */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, ml: 0.5, flexWrap: 'wrap' }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: { xs: 'none', sm: 'block' } }}>
              PRESETS:
            </Typography>
            <Button
              size="small"
              variant="outlined"
              onClick={() => applyPreset('4x6-top')}
              sx={{
                fontSize: '0.72rem',
                py: 0.2,
                px: 0.9,
                borderColor: 'rgba(255, 110, 199, 0.35)',
                color: '#ff6ec7',
                '&:hover': { borderColor: '#ff6ec7', bgcolor: 'rgba(255, 110, 199, 0.1)' },
              }}
            >
              4" × 6" Thermal
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={() => applyPreset('4x4-top')}
              sx={{
                fontSize: '0.72rem',
                py: 0.2,
                px: 0.9,
                borderColor: 'rgba(255, 255, 255, 0.15)',
                color: 'text.primary',
              }}
            >
              4" × 4"
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={() => applyPreset('3x2-top')}
              sx={{
                fontSize: '0.72rem',
                py: 0.2,
                px: 0.9,
                borderColor: 'rgba(255, 255, 255, 0.15)',
                color: 'text.primary',
              }}
            >
              3" × 2"
            </Button>

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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ButtonGroup size="small" variant="outlined">
            <Tooltip title="Rotate Left 90°">
              <IconButton size="small" onClick={rotateCounterClockwise} sx={{ borderColor: 'rgba(255,255,255,0.15)' }}>
                <RotateCcw size={15} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Rotate Right 90°">
              <IconButton size="small" onClick={rotateClockwise} sx={{ borderColor: 'rgba(255,255,255,0.15)' }}>
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
                sx={{ borderColor: 'rgba(255,255,255,0.15)' }}
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
                  borderColor: 'rgba(255,255,255,0.15)',
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
                borderColor: 'rgba(255,255,255,0.15)',
                color: 'text.secondary',
              }}
            >
              {Math.round(zoom * 100)}%
            </Button>
            <Tooltip title="Zoom In">
              <IconButton
                size="small"
                onClick={() => setZoom((z) => Math.min(2.5, z + 0.15))}
                sx={{ borderColor: 'rgba(255,255,255,0.15)' }}
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
          {splitMode !== 'none' ? (
            <>
              ✂️ <b>Grid Split Mode Active:</b> Slicing each sheet into multiple labels ({splitMode.replace('-', ' ')}).
            </>
          ) : selection ? (
            <>
              ✨ Drag inside the box to move. Drag corner dots to resize. Use <b>Arrow keys</b> (or <b>Shift+Arrow</b>) to micro-nudge.
            </>
          ) : selectionMode === 'select' ? (
            <>
              🎯 <b>Selection Mode Active:</b> Tap &amp; drag on the PDF below, or tap <b>&quot;Auto-Detect&quot;</b>.
            </>
          ) : (
            <>
              🔍 <b>Inspect Mode:</b> Tap <b>&quot;Auto-Detect Label&quot;</b> or <b>&quot;Select Crop Area&quot;</b> when ready.
            </>
          )}
        </Typography>

        {selection && splitMode === 'none' && (
          <Chip
            size="small"
            label={`${inchWidth}" × ${inchHeight}" (${pointWidth} × ${pointHeight} pt)`}
            sx={{
              bgcolor: 'rgba(0, 201, 255, 0.15)',
              color: '#00c9ff',
              fontWeight: 700,
              fontSize: '0.75rem',
              border: '1px solid rgba(0, 201, 255, 0.3)',
            }}
          />
        )}
      </Box>




      {/* Interactive Full-Width PDF Canvas Container */}
      <Box
        ref={containerRef}
        sx={{
          position: 'relative',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          width: '100%',
          flex: 1,
          minHeight: { xs: '50vh', md: '75vh' },
          p: { xs: 1.5, sm: 3 },
          bgcolor: '#090d16',
          borderRadius: 3,
          border: '1px solid rgba(255, 255, 255, 0.08)',
          overflow: 'auto',
          userSelect: 'none',
          touchAction: 'none',
        }}
      >
        <Box
          ref={pageWrapperRef}
          onMouseDown={handleWrapperMouseDown}
          onTouchStart={handleWrapperMouseDown}
          sx={{
            position: 'relative',
            boxShadow: '0 16px 40px rgba(0,0,0,0.6)',
            cursor: selectionMode === 'select' ? 'crosshair' : 'default',
            lineHeight: 0,
            touchAction: 'none',
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
              onLoadSuccess={onPageLoadSuccess}
              onRenderError={(err) => console.error('Page Render Error:', err)}
              renderAnnotationLayer={false}
              renderTextLayer={false}
            />
          </Document>

          {/* Grid Split Lines (when 2-up or 4-up mode is enabled) */}
          {splitMode === '2-up-vertical' && (
            <Box
              sx={{
                position: 'absolute',
                top: '50%',
                left: 0,
                right: 0,
                borderTop: '2px dashed #00c9ff',
                pointerEvents: 'none',
                zIndex: 15,
                boxShadow: '0 0 10px rgba(0,201,255,0.6)',
              }}
            />
          )}

          {splitMode === '2-up-horizontal' && (
            <Box
              sx={{
                position: 'absolute',
                left: '50%',
                top: 0,
                bottom: 0,
                borderLeft: '2px dashed #00c9ff',
                pointerEvents: 'none',
                zIndex: 15,
                boxShadow: '0 0 10px rgba(0,201,255,0.6)',
              }}
            />
          )}

          {splitMode === '4-up-grid' && (
            <>
              <Box
                sx={{
                  position: 'absolute',
                  top: '50%',
                  left: 0,
                  right: 0,
                  borderTop: '2px dashed #00c9ff',
                  pointerEvents: 'none',
                  zIndex: 15,
                }}
              />
              <Box
                sx={{
                  position: 'absolute',
                  left: '50%',
                  top: 0,
                  bottom: 0,
                  borderLeft: '2px dashed #00c9ff',
                  pointerEvents: 'none',
                  zIndex: 15,
                }}
              />
            </>
          )}

          {/* Interactive Crop Box */}
          {selection && splitMode === 'none' && (
            <Box
              data-role="selection-box"
              onMouseDown={handleBoxMouseDown}
              onTouchStart={handleBoxMouseDown}
              sx={{
                position: 'absolute',
                left: `${selection.xRatio * 100}%`,
                top: `${selection.yRatio * 100}%`,
                width: `${selection.widthRatio * 100}%`,
                height: `${selection.heightRatio * 100}%`,
                border: '2px solid #00c9ff',
                boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.55), 0 0 15px rgba(0, 201, 255, 0.5)',
                cursor: 'move',
                zIndex: 10,
                boxSizing: 'border-box',
                transition: interactionMode ? 'none' : 'border-color 0.15s ease',
              }}
            >
              {/* Header Badge */}
              <Box
                sx={{
                  position: 'absolute',
                  top: -24,
                  left: 0,
                  bgcolor: '#00c9ff',
                  color: '#081420',
                  px: 1,
                  py: 0.2,
                  borderRadius: '4px 4px 0 0',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  pointerEvents: 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                {inchWidth}" × {inchHeight}"
              </Box>

              {/* 4 Corner Handles – larger hit target on touch */}
              {['nw', 'ne', 'se', 'sw'].map((h) => (
                <Box
                  key={h}
                  data-handle={h}
                  onMouseDown={(e) => handleResizeStart(e, h)}
                  onTouchStart={(e) => handleResizeStart(e, h)}
                  sx={{
                    position: 'absolute',
                    width: { xs: 20, sm: 12 },
                    height: { xs: 20, sm: 12 },
                    bgcolor: '#ffffff',
                    border: '2px solid #00c9ff',
                    borderRadius: '50%',
                    top: h.includes('n') ? { xs: -10, sm: -6 } : { xs: 'calc(100% - 10px)', sm: 'calc(100% - 6px)' },
                    left: h.includes('w') ? { xs: -10, sm: -6 } : { xs: 'calc(100% - 10px)', sm: 'calc(100% - 6px)' },
                    cursor: `${h}-resize`,
                    zIndex: 20,
                    boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
                    touchAction: 'none',
                    '&:hover': {
                      transform: 'scale(1.25)',
                      bgcolor: '#ff6ec7',
                    },
                  }}
                />
              ))}
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
              bgcolor: '#0d131f',
              border: '1px solid rgba(255, 255, 255, 0.15)',
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
