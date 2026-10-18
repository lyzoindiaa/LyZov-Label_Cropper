import React, { createContext, useState, useCallback, useEffect, useRef } from 'react';
import { detectLabelBoundingBox, cropPdfBlob } from '../utils/pdfUtils';
import { getActiveUser, clearAuthSession, setAuthSession, gstApi } from '../gst-tool/api/client';

export const AppContext = createContext();

export const MARKETPLACE_PRESETS = {
  amazon: {
    id: 'amazon',
    name: 'Amazon',
    label: 'Amazon',
    badge: 'Page 1 Only',
    description: 'Amazon shipping label — full first page only (excludes invoice on page 2)',
    color: '#ff9900',
    // Full page: grab the entire first page (shipping label)
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
    badge: 'Fixed Center 3"×5"',
    description: 'Standard Flipkart shipping label — auto-centered cleanly above invoice',
    color: '#2874f0',
    // Flipkart shipping labels are centered on the upper portion of the page.
    // Width ratio 0.38 (centered with 0.31 margin) and height 0.43 (yRatio 0.038)
    // captures the complete label with top/bottom padding while stopping cleanly above the Tax Invoice line.
    selection: {
      xRatio: 0.31,
      yRatio: 0.038,
      widthRatio: 0.38,
      heightRatio: 0.43,
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

  // Theme Management (Light / Dark)
  const getInitialTheme = () => {
    try {
      const saved = localStorage.getItem('theme');
      if (saved === 'light' || saved === 'dark') return saved;
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
    } catch (e) {}
    return (typeof document !== 'undefined' && document.documentElement.dataset.theme) || 'light';
  };

  const [theme, setTheme] = useState(getInitialTheme);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      if (typeof document !== 'undefined') {
        document.documentElement.dataset.theme = next;
      }
      try {
        localStorage.setItem('theme', next);
      } catch (e) {}
      return next;
    });
  }, []);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.theme = theme;
    }
    try {
      localStorage.setItem('theme', theme);
    } catch (e) {}
  }, [theme]);

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
  const [authModalDefaultTab, setAuthModalDefaultTab] = useState(0); // 0 = Login, 1 = Signup
  const [invoicesModalOpen, setInvoicesModalOpen] = useState(false);

  // ─────────────────────────────────────────────────────────────────────────
  // SECURITY PATCH: Validate localStorage session against the server on boot.
  // Without this, any user can open DevTools and set:
  //   localStorage.setItem('gst_user', JSON.stringify({ plan: 'cropper_yearly', ... }))
  // to get unlimited Pro access without paying.
  // On every page load, we silently fetch /api/auth/me and overwrite the
  // local user with the authoritative server-side plan & trialEndsAt.
  // ─────────────────────────────────────────────────────────────────────────
  const sessionValidatedRef = useRef(false);
  useEffect(() => {
    if (sessionValidatedRef.current) return;
    sessionValidatedRef.current = true;

    const localUser = getActiveUser();
    if (!localUser) return; // Guest — nothing to validate

    // Fire-and-forget: update the user state with authoritative server data
    gstApi.getMe().then((res) => {
      if (res?.user) {
        const serverUser = res.user;
        // Overwrite localStorage with the real plan from the database
        setAuthSession(null, serverUser, null);
        setUser(serverUser);
      }
    }).catch((err) => {
      // If the token is expired or invalid, clear the session
      if (err?.status === 401) {
        clearAuthSession();
        setUser(null);
      }
      // Other errors (network, server down) are silent — don't log out user
    });
  }, []);

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
      // Auto-detect marketplace if first file or new file uploaded
      let detectedMode = cropMode || 'amazon';
      const firstFileName = newEntries[0].name.toLowerCase();
      if (firstFileName.includes('amazon')) {
        detectedMode = 'amazon';
      } else if (
        firstFileName.includes('flipkart') ||
        firstFileName.startsWith('order_') ||
        firstFileName.includes('order') ||
        firstFileName.includes('od3')
      ) {
        detectedMode = 'flipkart';
      } else if (firstFileName.includes('meesho')) {
        detectedMode = 'meesho';
      }

      setCropMode(detectedMode);
      setSelectionMode('select');
      if (detectedMode === 'amazon') {
        setCropOptions((opts) => ({ ...opts, pagesToCrop: 'first' }));
        setSelection({ xRatio: 0.0, yRatio: 0.0, widthRatio: 1.0, heightRatio: 1.0 });
      } else {
        setCropOptions((opts) => ({ ...opts, pagesToCrop: 'all' }));
        const preset = MARKETPLACE_PRESETS[detectedMode];
        if (preset) {
          setSelection({ ...preset.selection });
        }
      }

      return [...prev, ...newEntries];
    });
  }, [cropMode, requireCropperAccess]);

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
    setSelectionMode('select');
    setCropMode('other');
    setSplitMode('none');
  }, []);

  const selectCropMode = useCallback((mode) => {
    const validMode = (mode && MARKETPLACE_PRESETS[mode]) ? mode : 'other';
    setCropMode(validMode);
    setSelectionMode('select');
    setSplitMode('none');
    if (validMode === 'amazon') {
      // Amazon: always force full-page selection on first page only (excludes invoice on page 2)
      setCropOptions((prev) => ({ ...prev, pagesToCrop: 'first' }));
      setSelection({ xRatio: 0.0, yRatio: 0.0, widthRatio: 1.0, heightRatio: 1.0 });
      return;
    }
    setCropOptions((prev) => ({ ...prev, pagesToCrop: 'all' }));
    const preset = MARKETPLACE_PRESETS[validMode];
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
    } else {
      setCropOptions((prev) => ({ ...prev, pagesToCrop: 'all' }));
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

  const processBatchCrop = useCallback(async () => {
    if (!requireCropperAccess()) return;
    if (!selection) {
      alert('Please select a crop area or choose a marketplace label mode first.');
      return;
    }
    if (pdfFiles.length === 0) {
      alert('Please upload at least one PDF file first.');
      return;
    }

    setIsProcessing(true);
    setProcessProgress({ current: 0, total: pdfFiles.length });

    // Single animation frame yield to let browser show processing state
    await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));

    const results = [];
    try {
      for (let i = 0; i < pdfFiles.length; i++) {
        const item = pdfFiles[i];
        setProcessProgress({ current: i + 1, total: pdfFiles.length });

        // Minimal yield only when processing multiple files to keep UI responsive
        if (pdfFiles.length > 1 && i > 0) {
          await new Promise((resolve) => setTimeout(resolve, 5));
        }

        const effectivePagesToCrop = cropMode === 'amazon' ? 'first' : (cropOptions.pagesToCrop || 'all');
        const croppedItems = await cropPdfBlob(item.file, selection, {
          ...cropOptions,
          pagesToCrop: effectivePagesToCrop,
          rotation,
        });

        const baseClean = item.name.replace(/\.pdf$/i, '');

        croppedItems.forEach((slice, sIdx) => {
          let outputName = `${baseClean}${slice.suffix}`;
          if (namingPattern === 'numbered') {
            outputName = `label_${String(results.length + 1).padStart(2, '0')}`;
          }

          results.push({
            id: `${item.name}-${Date.now()}-${i}-${sIdx}`,
            name: outputName,
            blob: slice.blob,
          });
        });
      }

      setCroppedBlobs(results);
      recordCropUsage(results.length || 1);
      setActiveTab(1);
    } catch (err) {
      console.error('Batch cropping failed', err);
      alert('An error occurred during batch cropping: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  }, [requireCropperAccess, selection, pdfFiles, cropOptions, cropMode, rotation, namingPattern, recordCropUsage, setActiveTab]);

  const value = {
    processBatchCrop,
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
    authModalDefaultTab,
    setAuthModalDefaultTab,
    invoicesModalOpen,
    setInvoicesModalOpen,
    requireCropperAccess,
    logoutUser,
    GUEST_DAILY_LIMIT,
    guestUsage,
    recordCropUsage,
    theme,
    toggleTheme,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
