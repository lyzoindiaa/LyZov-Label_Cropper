import React, { createContext, useState, useCallback, useEffect } from 'react';
import { detectLabelBoundingBox } from '../utils/pdfUtils';
import { getActiveUser, clearAuthSession } from '../gst-tool/api/client';

export const AppContext = createContext();

export const MARKETPLACE_PRESETS = {
  amazon: {
    id: 'amazon',
    name: 'Amazon',
    label: 'Amazon',
    badge: 'Full First Page',
    description: 'Amazon shipping label — full first page auto-selected',
    color: '#ff9900',
    // Full page: Amazon labels are printed one per page; grab the entire first page
    selection: {
      xRatio: 0.0,
      yRatio: 0.0,
      widthRatio: 1.0,
      heightRatio: 1.0,
    },
    fixed: true,
  },
  flipkart: {
    id: 'flipkart',
    name: 'Flipkart',
    label: 'Flipkart',
    badge: 'Fixed 3.22"×5.13"',
    description: 'Standard Flipkart logistics shipping label (3.22" × 5.13" / 232 × 369 pt)',
    color: '#2874f0',
    // Flipkart labels are printed 2-up on A4 (label on left half, blank space on right).
    // These ratios center the crop on the actual label content area.
    selection: {
      xRatio: 0.36,
      yRatio: 0.02,
      widthRatio: 0.26,
      heightRatio: 0.90,
    },
    fixed: true,
  },
  meesho: {
    id: 'meesho',
    name: 'Meesho',
    label: 'Meesho',
    badge: 'Fixed 4"×6"',
    description: 'Standard Meesho supplier shipping label',
    color: '#f43397',
    selection: {
      xRatio: 0.04,
      yRatio: 0.03,
      widthRatio: 0.92,
      heightRatio: 0.48,
    },
    fixed: true,
  },
  other: {
    id: 'other',
    name: 'Other',
    label: 'Other',
    badge: 'Adjustable',
    description: 'Custom dimensions — drag corners to resize freely',
    color: '#00c9ff',
    selection: {
      xRatio: 0.05,
      yRatio: 0.05,
      widthRatio: 0.90,
      heightRatio: 0.50,
    },
    fixed: false,
  },
};

const STORAGE_KEY = 'labelcrop_custom_presets_v1';

export const AppProvider = ({ children }) => {
  const [pdfFiles, setPdfFiles] = useState([]);
  const [selectedPdfIndex, setSelectedPdfIndex] = useState(0);
  const [selection, setSelection] = useState(null); // Defaults to null: NO cropper shown on open!
  const [selectionMode, setSelectionMode] = useState('inspect'); // 'inspect' | 'select'
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270
  const [cropMode, setCropMode] = useState('amazon'); // 'amazon' | 'flipkart' | 'meesho' | 'other'
  const [splitMode, setSplitMode] = useState('none'); // preserved for backwards compatibility
  const [croppedBlobs, setCroppedBlobs] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processProgress, setProcessProgress] = useState({ current: 0, total: 0 });
  const [zoom, setZoom] = useState(1.0);
  const [currentPage, setCurrentPage] = useState(1);
  const [cropOptions, setCropOptions] = useState({ pagesToCrop: 'first' });
  const [namingPattern, setNamingPattern] = useState('original_label');
  const [activeTab, setActiveTab] = useState(0);

  // Guest Mode & Daily Usage Tracking (from cropper-plan.md)
  const GUEST_DAILY_LIMIT = 5;

  const getGuestUsage = () => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const raw = localStorage.getItem('cropper_guest_usage');
      if (!raw) return { date: today, count: 0 };
      const parsed = JSON.parse(raw);
      if (parsed.date !== today) {
        return { date: today, count: 0 };
      }
      return parsed;
    } catch {
      return { date: new Date().toISOString().slice(0, 10), count: 0 };
    }
  };

  const [guestUsage, setGuestUsage] = useState(getGuestUsage);

  const recordCropUsage = useCallback((count = 1) => {
    const current = getActiveUser();
    // Only increment for guests or expired trial users
    if (current && current.plan !== 'trial') return;
    if (current && current.plan === 'trial' && current.trialEndsAt && new Date(current.trialEndsAt) >= new Date()) {
      return; // Unlimited during active 30-day trial!
    }

    const currentUsage = getGuestUsage();
    const next = { date: currentUsage.date, count: currentUsage.count + count };
    try {
      localStorage.setItem('cropper_guest_usage', JSON.stringify(next));
    } catch {}
    setGuestUsage(next);
  }, []);

  // User Auth & 30-Day Trial State
  const [user, setUser] = useState(() => getActiveUser());
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('auth'); // 'auth' | 'paywall'

  const isTrialExpired = Boolean(
    user &&
    user.plan === 'trial' &&
    user.trialEndsAt &&
    new Date(user.trialEndsAt) < new Date()
  );

  const daysLeftInTrial = user?.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(user.trialEndsAt) - new Date()) / (1000 * 60 * 60 * 24)))
    : 0;

  const requireCropperAccess = useCallback((countToCrop = 1) => {
    const current = getActiveUser();
    if (current) {
      const isPaid = ['cropper_monthly', 'cropper_yearly', 'starter', 'pro'].includes(current.plan);
      if (isPaid) return true;

      const expired = current.plan === 'trial' && current.trialEndsAt && new Date(current.trialEndsAt) < new Date();
      if (!expired) return true; // Active 30-day free trial -> UNLIMITED access!

      // Option A from plan: expired trial fallback to 5 free daily crops
      const usage = getGuestUsage();
      if (usage.count + countToCrop > GUEST_DAILY_LIMIT) {
        setAuthModalMode('paywall');
        setAuthModalOpen(true);
        return false;
      }
      return true;
    }

    // Guest mode: check if they exceeded the 5 free daily crops
    const usage = getGuestUsage();
    if (usage.count + countToCrop > GUEST_DAILY_LIMIT) {
      setAuthModalMode('auth');
      setAuthModalOpen(true);
      return false;
    }
    return true;
  }, []);

  const logoutUser = useCallback(() => {
    clearAuthSession();
    setUser(null);
    setAuthModalOpen(false);
  }, []);

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
      setCropMode('other');
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

    setPdfFiles((prev) => {
      if (prev.length === 0 && !selection) {
        setSelection({ ...MARKETPLACE_PRESETS[cropMode || 'amazon'].selection });
        setSelectionMode('select');
      }
      return [...prev, ...newEntries];
    });
  }, [selection, cropMode, requireCropperAccess]);

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

  const selectCropMode = useCallback((mode) => {
    setCropMode(mode);
    setSelectionMode('select');
    setSplitMode('none');
    if (mode === 'amazon') {
      // Amazon: always force full-page selection on first page
      setCropOptions((prev) => ({ ...prev, pagesToCrop: 'first' }));
      setSelection({ xRatio: 0.0, yRatio: 0.0, widthRatio: 1.0, heightRatio: 1.0 });
      return;
    }
    const preset = MARKETPLACE_PRESETS[mode];
    if (preset) {
      // Always apply fixed presets so they snap to the correct position
      setSelection({ ...preset.selection });
    }
  }, []);

  const applyPreset = useCallback((presetType) => {
    setSelectionMode('select');
    setSplitMode('none');
    if (presetType === 'amazon') {
      setCropOptions((prev) => ({ ...prev, pagesToCrop: 'first' }));
    }
    if (MARKETPLACE_PRESETS[presetType]) {
      setCropMode(presetType);
      setSelection({ ...MARKETPLACE_PRESETS[presetType].selection });
      return;
    }
    setCropMode('other');
    switch (presetType) {
      case 'meesho':
        setSelection({
          xRatio: 0.04,
          yRatio: 0.03,
          widthRatio: 0.92,
          heightRatio: 0.48,
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
      setCropMode('other');
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
    cropMode,
    setCropMode,
    selectCropMode,
    MARKETPLACE_PRESETS,
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
    user,
    setUser,
    isTrialExpired,
    daysLeftInTrial,
    authModalOpen,
    setAuthModalOpen,
    authModalMode,
    setAuthModalMode,
    requireCropperAccess,
    logoutUser,
    GUEST_DAILY_LIMIT,
    guestUsage,
    recordCropUsage,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
