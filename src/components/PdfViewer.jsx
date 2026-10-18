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
  Layers,
  BookmarkPlus,
  Bookmark,
  X,
  Wand2,
  Maximize2,
  Move,
  Minus,
  Plus,
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
    setCropMode,
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
    // Crucial: page.width in react-pdf returns getViewport({ scale: zoom }).width
    // Using page.originalWidth prevents infinite scale-oscillation loops and recalculation jitter on mobile
    const origWidth = page.originalWidth || (page.getViewport ? page.getViewport({ scale: 1 }).width : page.width);
    const origHeight = page.originalHeight || (page.getViewport ? page.getViewport({ scale: 1 }).height : page.height);
    setPageDimensions({ width: origWidth, height: origHeight });
    if (containerRef.current && origWidth > 0) {
      const containerWidth = containerRef.current.clientWidth - 32;
      if (containerWidth < origWidth) {
        const autoScale = Number(Math.max(0.35, Math.min(1.0, containerWidth / origWidth)).toFixed(2));
        setZoom((prev) => (Math.abs(prev - autoScale) > 0.03 ? autoScale : prev));
      }
    }
  };

  // Fit to container width helper
  const handleFitWidth = useCallback(() => {
    if (containerRef.current && pageDimensions.width > 0) {
      const containerWidth = containerRef.current.clientWidth - 32;
      const targetScale = Math.min(2.0, Math.max(0.35, containerWidth / pageDimensions.width));
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
          const containerWidth = containerRef.current.clientWidth - 32;
          if (containerWidth < pageDimensions.width) {
            const autoScale = Number(Math.max(0.35, Math.min(1.0, containerWidth / pageDimensions.width)).toFixed(2));
            setZoom((prev) => (Math.abs(prev - autoScale) > 0.03 ? autoScale : prev));
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
    } catch { }
    setCropMode('other');
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

  const handleScaleSelection = useCallback((factor) => {
    const current = currentBoxRef.current || selection;
    if (!current) return;
    if (cropMode !== 'other') {
      setCropMode('other');
    }
    const centerCX = current.xRatio + current.widthRatio / 2;
    const centerCY = current.yRatio + current.heightRatio / 2;
    const newW = Math.max(0.02, Math.min(1.0, current.widthRatio * factor));
    const newH = Math.max(0.02, Math.min(1.0, current.heightRatio * factor));
    const newX = Math.max(0, Math.min(1 - newW, centerCX - newW / 2));
    const newY = Math.max(0, Math.min(1 - newH, centerCY - newH / 2));
    const nextBox = { xRatio: newX, yRatio: newY, widthRatio: newW, heightRatio: newH };
    currentBoxRef.current = nextBox;
    setSelection(nextBox);
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
  }, [selection, cropMode, setCropMode, pageDimensions.width, pageDimensions.height, setSelection]);

  const applyQuickSize = useCallback((wInches, hInches) => {
    const pageW = pageDimensions.width || 612;
    const pageH = pageDimensions.height || 792;
    const targetW = (wInches * 72) / pageW;
    const targetH = (hInches * 72) / pageH;
    const current = currentBoxRef.current || selection || { xRatio: 0.1, yRatio: 0.1, widthRatio: 0.5, heightRatio: 0.5 };
    const centerCX = current.xRatio + current.widthRatio / 2;
    const centerCY = current.yRatio + current.heightRatio / 2;
    const wRatio = Math.max(0.02, Math.min(1.0, targetW));
    const hRatio = Math.max(0.02, Math.min(1.0, targetH));
    const xRatio = Math.max(0, Math.min(1 - wRatio, centerCX - wRatio / 2));
    const yRatio = Math.max(0, Math.min(1 - hRatio, centerCY - hRatio / 2));
    const nextBox = { xRatio, yRatio, widthRatio: wRatio, heightRatio: hRatio };
    setCropMode('other');
    currentBoxRef.current = nextBox;
    setSelection(nextBox);
    if (boxRef.current) {
      boxRef.current.style.left = `${nextBox.xRatio * 100}%`;
      boxRef.current.style.top = `${nextBox.yRatio * 100}%`;
      boxRef.current.style.width = `${nextBox.widthRatio * 100}%`;
      boxRef.current.style.height = `${nextBox.heightRatio * 100}%`;
    }
    if (badgeTextRef.current) {
      badgeTextRef.current.textContent = `${wInches.toFixed(2)}" × ${hInches.toFixed(2)}"`;
    }
  }, [selection, setCropMode, pageDimensions.width, pageDimensions.height, setSelection]);

  const handleStartRedraw = useCallback(() => {
    setSelection(null);
    setSelectionMode('select');
    setCropMode('other');
  }, [setSelection, setSelectionMode, setCropMode]);

  const handleBoxPointerDown = (e) => {
    // If user clicked or touched directly on a handle, let handleResizePointerStart handle it
    if (e.target.dataset?.handle || e.target.closest('[data-handle]')) {
      return;
    }

    e.stopPropagation();

    if (pageWrapperRef.current) {
      pageRectRef.current = pageWrapperRef.current.getBoundingClientRect();
    }
    const coords = getRelativeCoords(e);

    // If user touches near corners or edges of the box,
    // seamlessly treat it as a resize instead of moving the whole box!
    // This allows effortless mobile touch resizing to make the box small without missing tiny handles.
    if (boxRef.current) {
      const boxRect = boxRef.current.getBoundingClientRect();
      const clientX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
      const clientY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
      const offsetX = clientX - boxRect.left;
      const offsetY = clientY - boxRect.top;
      const w = boxRect.width;
      const h = boxRect.height;

      // Generous corner threshold (up to 44px, or 35% of dimension for smaller boxes)
      const cornerThresh = Math.min(44, Math.max(16, Math.min(w, h) * 0.35));
      const edgeThresh = Math.min(28, Math.max(12, Math.min(w, h) * 0.25));

      let autoHandle = null;

      // 4 Corners
      if (offsetX <= cornerThresh && offsetY <= cornerThresh) {
        autoHandle = 'nw';
      } else if (offsetX >= w - cornerThresh && offsetY <= cornerThresh) {
        autoHandle = 'ne';
      } else if (offsetX >= w - cornerThresh && offsetY >= h - cornerThresh) {
        autoHandle = 'se';
      } else if (offsetX <= cornerThresh && offsetY >= h - cornerThresh) {
        autoHandle = 'sw';
      }
      // 4 Edges
      else if (offsetY <= edgeThresh) {
        autoHandle = 'n';
      } else if (offsetY >= h - edgeThresh) {
        autoHandle = 's';
      } else if (offsetX <= edgeThresh) {
        autoHandle = 'w';
      } else if (offsetX >= w - edgeThresh) {
        autoHandle = 'e';
      }

      if (autoHandle) {
        try {
          e.currentTarget.setPointerCapture?.(e.pointerId);
        } catch { }
        if (cropMode !== 'other') {
          setCropMode('other');
        }
        const mode = `resize-${autoHandle}`;
        setInteractionMode(mode);
        interactionModeRef.current = mode;
        dragStartRef.current = coords;
        const box = { ...(currentBoxRef.current || selection) };
        initialBoxRef.current = box;
        return;
      }
    }

    try {
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch { }
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
    } catch { }
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
    if (cropMode !== 'other') {
      setCropMode('other');
    }
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
        widthRatio = Math.max(0.02, Math.min(1 - xRatio, box.widthRatio + dx));
        heightRatio = Math.max(0.02, Math.min(1 - yRatio, box.heightRatio + dy));
      } else if (handle === 'sw') {
        const potentialX = Math.max(0, Math.min(box.xRatio + box.widthRatio - 0.02, box.xRatio + dx));
        widthRatio = (box.xRatio + box.widthRatio) - potentialX;
        xRatio = potentialX;
        heightRatio = Math.max(0.02, Math.min(1 - yRatio, box.heightRatio + dy));
      } else if (handle === 'ne') {
        const potentialY = Math.max(0, Math.min(box.yRatio + box.heightRatio - 0.02, box.yRatio + dy));
        heightRatio = (box.yRatio + box.heightRatio) - potentialY;
        yRatio = potentialY;
        widthRatio = Math.max(0.02, Math.min(1 - xRatio, box.widthRatio + dx));
      } else if (handle === 'nw') {
        const potentialX = Math.max(0, Math.min(box.xRatio + box.widthRatio - 0.02, box.xRatio + dx));
        const potentialY = Math.max(0, Math.min(box.yRatio + box.heightRatio - 0.02, box.yRatio + dy));
        widthRatio = (box.xRatio + box.widthRatio) - potentialX;
        xRatio = potentialX;
        heightRatio = (box.yRatio + box.heightRatio) - potentialY;
        yRatio = potentialY;
      } else if (handle === 'n') {
        const potentialY = Math.max(0, Math.min(box.yRatio + box.heightRatio - 0.02, box.yRatio + dy));
        heightRatio = (box.yRatio + box.heightRatio) - potentialY;
        yRatio = potentialY;
      } else if (handle === 's') {
        heightRatio = Math.max(0.02, Math.min(1 - yRatio, box.heightRatio + dy));
      } else if (handle === 'w') {
        const potentialX = Math.max(0, Math.min(box.xRatio + box.widthRatio - 0.02, box.xRatio + dx));
        widthRatio = (box.xRatio + box.widthRatio) - potentialX;
        xRatio = potentialX;
      } else if (handle === 'e') {
        widthRatio = Math.max(0.02, Math.min(1 - xRatio, box.widthRatio + dx));
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
    if (e.cancelable) e.preventDefault();
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
    window.addEventListener('pointermove', handlePointerMove, { passive: false });
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
        {/* Auto-Detect & Custom Presets */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
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

      {/* Custom Adjust Mode Controls Bar (only visible when in Custom mode) */}
      {cropMode === 'other' && selection && (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1, flexWrap: 'wrap', gap: 1 }}>
          <Typography variant="caption" color="text.secondary">
            ✨ <b>Custom Mode:</b> Drag box to move. Drag corner dots to resize.
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
            <ButtonGroup size="small" variant="outlined" sx={{ height: 26 }}>
              <Tooltip title="Make Crop Box 15% Smaller">
                <Button
                  onClick={() => handleScaleSelection(0.85)}
                  startIcon={<Minus size={12} />}
                  sx={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    px: 0.8,
                    py: 0,
                    borderColor: 'rgba(0, 201, 255, 0.4)',
                    color: '#00c9ff',
                    textTransform: 'none',
                    '&:hover': { bgcolor: 'rgba(0, 201, 255, 0.12)' },
                  }}
                >
                  − Shrink
                </Button>
              </Tooltip>
              <Tooltip title="Make Crop Box 15% Larger">
                <Button
                  onClick={() => handleScaleSelection(1.15)}
                  startIcon={<Plus size={12} />}
                  sx={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    px: 0.8,
                    py: 0,
                    borderColor: 'rgba(0, 201, 255, 0.4)',
                    color: '#00c9ff',
                    textTransform: 'none',
                    '&:hover': { bgcolor: 'rgba(0, 201, 255, 0.12)' },
                  }}
                >
                  + Enlarge
                </Button>
              </Tooltip>
            </ButtonGroup>

            <Button
              size="small"
              variant="outlined"
              onClick={() => applyQuickSize(3.0, 5.0)}
              sx={{
                fontSize: '0.68rem',
                height: 26,
                px: 0.7,
                py: 0,
                borderColor: 'divider',
                color: 'text.secondary',
                textTransform: 'none',
                '&:hover': { borderColor: '#00c9ff', color: '#00c9ff' },
              }}
            >
              3"×5"
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={() => applyQuickSize(4.0, 6.0)}
              sx={{
                fontSize: '0.68rem',
                height: 26,
                px: 0.7,
                py: 0,
                borderColor: 'divider',
                color: 'text.secondary',
                textTransform: 'none',
                '&:hover': { borderColor: '#00c9ff', color: '#00c9ff' },
              }}
            >
              4"×6"
            </Button>
            <Button
              size="small"
              variant="text"
              onClick={handleStartRedraw}
              sx={{
                fontSize: '0.68rem',
                height: 26,
                px: 0.8,
                py: 0,
                color: '#ff4d6d',
                textTransform: 'none',
                fontWeight: 700,
                '&:hover': { bgcolor: 'rgba(255, 77, 109, 0.1)' },
              }}
            >
              ✏️ Redraw
            </Button>
          </Box>
        </Box>
      )}

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
          touchAction: interactionMode ? 'none' : 'pan-y',
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
            touchAction: interactionMode ? 'none' : 'pan-y',
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
                  bgcolor: cropMode !== 'other' && MARKETPLACE_PRESETS[cropMode] ? MARKETPLACE_PRESETS[cropMode].color : '#00c9ff',
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
                <span>{cropMode !== 'other' && MARKETPLACE_PRESETS[cropMode] ? `🔒 ${MARKETPLACE_PRESETS[cropMode].name}` : '📐 Custom'}</span>
                <span>•</span>
                <span ref={badgeTextRef}>{inchWidth}" × {inchHeight}"</span>
              </Box>

              {/* Center Move Badge - hide on small boxes to keep interior clean */}
              {selection.widthRatio >= 0.16 && selection.heightRatio >= 0.10 && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    bgcolor: 'rgba(0, 0, 0, 0.45)',
                    backdropFilter: 'blur(4px)',
                    color: 'rgba(255, 255, 255, 0.9)',
                    px: 1,
                    py: 0.3,
                    borderRadius: 2,
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    opacity: interactionMode === 'move' ? 0.95 : 0.4,
                    transition: 'opacity 0.2s',
                    userSelect: 'none',
                  }}
                >
                  <Move size={12} />
                  <span>Move</span>
                </Box>
              )}

              {/* 4 Corner Handles with 44px hit-test containers – always active on all modes so mobile users can easily resize */}
              {[
                { id: 'nw', top: -22, left: -22, cursor: 'nw-resize' },
                { id: 'ne', top: -22, left: 'calc(100% - 22px)', cursor: 'ne-resize' },
                { id: 'se', top: 'calc(100% - 22px)', left: 'calc(100% - 22px)', cursor: 'se-resize' },
                { id: 'sw', top: 'calc(100% - 22px)', left: -22, cursor: 'sw-resize' },
              ].map((h) => (
                <Box
                  key={h.id}
                  data-handle={h.id}
                  onPointerDown={(e) => handleResizePointerStart(e, h.id)}
                  sx={{
                    position: 'absolute',
                    width: 44,
                    height: 44,
                    top: h.top,
                    left: h.left,
                    cursor: h.cursor,
                    zIndex: 35,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    touchAction: 'none',
                    userSelect: 'none',
                    bgcolor: 'transparent',
                    '&:hover > div': {
                      transform: 'scale(1.2)',
                      bgcolor: '#e6f9ff',
                    },
                  }}
                >
                  <Box
                    sx={{
                      width: 22,
                      height: 22,
                      bgcolor: '#ffffff',
                      border: '2.5px solid #00c9ff',
                      borderRadius: '50%',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
                      pointerEvents: 'none',
                      transition: 'transform 0.15s ease',
                    }}
                  />
                </Box>
              ))}

              {/* 4 Edge Handles (Top, Bottom, Left, Right) – only render when box is large enough to avoid crowding corners */}
              {selection.widthRatio >= 0.18 && selection.heightRatio >= 0.14 && (
                [
                  { id: 'n', top: -22, left: 'calc(50% - 30px)', width: 60, height: 44, cursor: 'n-resize', isH: true },
                  { id: 's', top: 'calc(100% - 22px)', left: 'calc(50% - 30px)', width: 60, height: 44, cursor: 's-resize', isH: true },
                  { id: 'w', top: 'calc(50% - 30px)', left: -22, width: 44, height: 60, cursor: 'w-resize', isH: false },
                  { id: 'e', top: 'calc(50% - 30px)', left: 'calc(100% - 22px)', width: 44, height: 60, cursor: 'e-resize', isH: false },
                ].map((h) => (
                  <Box
                    key={h.id}
                    data-handle={h.id}
                    onPointerDown={(e) => handleResizePointerStart(e, h.id)}
                    sx={{
                      position: 'absolute',
                      width: h.width,
                      height: h.height,
                      top: h.top,
                      left: h.left,
                      cursor: h.cursor,
                      zIndex: 32,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      touchAction: 'none',
                      userSelect: 'none',
                      bgcolor: 'transparent',
                      '&:hover > div': {
                        transform: 'scale(1.15)',
                        bgcolor: '#e6f9ff',
                      },
                    }}
                  >
                    <Box
                      sx={{
                        width: h.isH ? 32 : 12,
                        height: h.isH ? 12 : 32,
                        bgcolor: '#ffffff',
                        border: '2px solid #00c9ff',
                        borderRadius: '6px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                        pointerEvents: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'transform 0.15s ease',
                      }}
                    >
                      <Box
                        sx={{
                          width: h.isH ? 12 : 3,
                          height: h.isH ? 3 : 12,
                          bgcolor: '#00c9ff',
                          borderRadius: 1,
                        }}
                      />
                    </Box>
                  </Box>
                ))
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
