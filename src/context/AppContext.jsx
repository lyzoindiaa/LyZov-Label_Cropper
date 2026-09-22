import React, { createContext, useState, useCallback } from 'react';
import { detectLabelBoundingBox } from '../utils/pdfUtils';

export const AppContext = createContext();

const STORAGE_KEY = 'labelcrop_custom_presets_v1';

export const AppProvider = ({ children }) => {
  const [pdfFiles, setPdfFiles] = useState([]);
  const [selectedPdfIndex, setSelectedPdfIndex] = useState(0);
  const [selection, setSelection] = useState(null); // Defaults to null: NO cropper shown on open!
  const [selectionMode, setSelectionMode] = useState('inspect'); // 'inspect' | 'select'
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270
  const [splitMode, setSplitMode] = useState('none'); // 'none' | '2-up-vertical' | '2-up-horizontal' | '4-up-grid'
  const [croppedBlobs, setCroppedBlobs] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processProgress, setProcessProgress] = useState({ current: 0, total: 0 });
  const [zoom, setZoom] = useState(1.0);
  const [currentPage, setCurrentPage] = useState(1);
  const [cropOptions, setCropOptions] = useState({ pagesToCrop: 'all' });
  const [namingPattern, setNamingPattern] = useState('original_label');
  const [activeTab, setActiveTab] = useState(0);

  // Load custom presets from localStorage
  const [customPresets, setCustomPresets] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const saveCurrentPreset = useCallback((name) => {
    if (!selection || !name.trim()) return false;
    const newPreset = {
      id: `preset-${Date.now()}`,
      name: name.trim(),
      selection: { ...selection },
      date: new Date().toLocaleDateString(),
    };
    setCustomPresets((prev) => {
      const updated = [...prev, newPreset];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save preset to storage', e);
      }
      return updated;
    });
    return true;
  }, [selection]);

  const deleteCustomPreset = useCallback((id) => {
    setCustomPresets((prev) => {
      const updated = prev.filter((p) => p.id !== id);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to remove preset from storage', e);
      }
      return updated;
    });
  }, []);

  const autoDetectLabel = useCallback(() => {
    const canvas = document.querySelector('.react-pdf__Page__canvas');
    if (!canvas) {
      alert('Please wait for the PDF to finish loading on screen.');
      return false;
    }
    const detected = detectLabelBoundingBox(canvas);
    if (detected) {
      setSelectionMode('select');
      setSplitMode('none');
      setSelection(detected);
      return true;
    } else {
      alert('No distinct label or barcode area detected on this page. Try manual selection or a preset.');
      return false;
    }
  }, []);

  const addPdfFiles = useCallback((files) => {
    const list = Array.from(files).filter(
      (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
    );
    if (list.length === 0) return;

    const newEntries = list.map((file) => ({
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      file,
      name: file.name,
      size: file.size,
      url: URL.createObjectURL(file),
      numPages: 1,
    }));

    setPdfFiles((prev) => [...prev, ...newEntries]);
  }, []);

  const removePdfFile = useCallback((index) => {
    setPdfFiles((prev) => {
      const target = prev[index];
      if (target?.url) URL.revokeObjectURL(target.url);
      const next = prev.filter((_, i) => i !== index);
      if (selectedPdfIndex >= next.length) {
        setSelectedPdfIndex(Math.max(0, next.length - 1));
      }
      return next;
    });
  }, [selectedPdfIndex]);

  const clearAllFiles = useCallback(() => {
    pdfFiles.forEach((item) => {
      if (item.url) URL.revokeObjectURL(item.url);
    });
    croppedBlobs.forEach((item) => {
      if (item.url) URL.revokeObjectURL(item.url);
    });
    setPdfFiles([]);
    setSelectedPdfIndex(0);
    setCroppedBlobs([]);
    setSelection(null);
    setSelectionMode('inspect');
    setSplitMode('none');
    setRotation(0);
  }, [pdfFiles, croppedBlobs]);

  const rotateClockwise = useCallback(() => {
    setRotation((r) => (r + 90) % 360);
  }, []);

  const rotateCounterClockwise = useCallback(() => {
    setRotation((r) => (r - 90 + 360) % 360);
  }, []);

  const clearSelection = useCallback(() => {
    setSelection(null);
    setSelectionMode('inspect');
    setSplitMode('none');
  }, []);

  const applyPreset = useCallback((presetType) => {
    setSelectionMode('select');
    setSplitMode('none');
    switch (presetType) {
      case 'amazon':
        setSelection({
          xRatio: 0.04,
          yRatio: 0.02,
          widthRatio: 0.92,
          heightRatio: 0.52,
        });
        break;
      case 'flipkart':
        setSelection({
          xRatio: 0.05,
          yRatio: 0.04,
          widthRatio: 0.9,
          heightRatio: 0.46,
        });
        break;
      case '4x6-top':
        setSelection({
          xRatio: 0.08,
          yRatio: 0.1,
          widthRatio: 0.47,
          heightRatio: 0.55,
        });
        break;
      case '4x4-top':
        setSelection({
          xRatio: 0.08,
          yRatio: 0.1,
          widthRatio: 0.47,
          heightRatio: 0.36,
        });
        break;
      case '3x2-top':
        setSelection({
          xRatio: 0.08,
          yRatio: 0.08,
          widthRatio: 0.35,
          heightRatio: 0.18,
        });
        break;
      case 'half-top':
        setSelection({
          xRatio: 0.05,
          yRatio: 0.04,
          widthRatio: 0.9,
          heightRatio: 0.46,
        });
        break;
      case 'half-bottom':
        setSelection({
          xRatio: 0.05,
          yRatio: 0.5,
          widthRatio: 0.9,
          heightRatio: 0.46,
        });
        break;
      default:
        break;
    }
  }, []);

  const applyCustomPreset = useCallback((preset) => {
    if (preset?.selection) {
      setSelectionMode('select');
      setSplitMode('none');
      setSelection({ ...preset.selection });
    }
  }, []);

  const value = {
    pdfFiles,
    addPdfFiles,
    removePdfFile,
    clearAllFiles,
    selectedPdfIndex,
    setSelectedPdfIndex,
    selection,
    setSelection,
    selectionMode,
    setSelectionMode,
    clearSelection,
    splitMode,
    setSplitMode,
    autoDetectLabel,
    rotation,
    setRotation,
    rotateClockwise,
    rotateCounterClockwise,
    applyPreset,
    customPresets,
    saveCurrentPreset,
    deleteCustomPreset,
    applyCustomPreset,
    croppedBlobs,
    setCroppedBlobs,
    isProcessing,
    setIsProcessing,
    processProgress,
    setProcessProgress,
    zoom,
    setZoom,
    currentPage,
    setCurrentPage,
    cropOptions,
    setCropOptions,
    namingPattern,
    setNamingPattern,
    activeTab,
    setActiveTab,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
