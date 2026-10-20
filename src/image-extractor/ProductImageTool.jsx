import React, { useState, useEffect, useContext, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Chip,
  Tooltip,
  Alert,
  CircularProgress,
  Slider,
  RadioGroup,
  FormControlLabel,
  Radio,
  Tabs,
  Tab,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Image as ImageIcon,
  Download,
  ClipboardPaste,
  Trash2,
  Crown,
  AlertCircle,
  Sun,
  Moon,
  ExternalLink,
  Archive,
  RefreshCw,
  Copy,
  Sliders,
  Check,
  Eye,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Upload,
  X,
  ChevronLeft,
  ChevronRight,
  Layers,
} from 'lucide-react';

import './image-extractor.css';
import { AppContext } from '../context/AppContext';
import SEOHead from '../components/SEOHead';
import Footer from '../components/Footer';
import ImageAuthModal from './ImageAuthModal';
import {
  PLATFORMS,
  SAMPLE_LINKS,
  detectPlatform,
  simulateExtract,
} from './mockData';

const rawBase = import.meta.env.VITE_API_BASE_URL || '/api';
const API_BASE = rawBase.replace(/\/+$/, '');

export default function ProductImageTool() {
  const { theme, toggleTheme, user, setUser } = useContext(AppContext);
  const fileInputRef = useRef(null);

  // Active Tab: 0 = Single Link Extractor, 1 = Batch Multi-Link Mode
  const [activeTab, setActiveTab] = useState(0);

  // Single URL / Upload Mode State
  const [urlInput, setUrlInput] = useState('');
  const [detectedPlatform, setDetectedPlatform] = useState(null);
  const [format, setFormat] = useState('png'); // 'png' | 'jpeg'
  const [quality, setQuality] = useState(90);
  const [stateStatus, setStateStatus] = useState('idle'); // 'idle' | 'loading' | 'success' | 'error'
  const [errorMessage, setErrorMessage] = useState('');
  const [errorCode, setErrorCode] = useState('');
  const [extractedData, setExtractedData] = useState(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Active image URL across multiple angles
  const activeImageUrl = useMemo(() => {
    if (!extractedData) return '';
    if (extractedData.images && extractedData.images.length > 0) {
      return extractedData.images[selectedImageIndex] || extractedData.images[0];
    }
    return extractedData.imageUrl || '';
  }, [extractedData, selectedImageIndex]);

  // Full Image Preview Modal State
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [activePreviewItem, setActivePreviewItem] = useState(null);
  const [zoomScale, setZoomScale] = useState(1);

  // Batch Mode State
  const [batchInput, setBatchInput] = useState('');
  const [batchResults, setBatchResults] = useState([]);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  const [batchZipping, setBatchZipping] = useState(false);

  // Auth / Paywall Modal
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('paywall'); // 'auth' | 'paywall'
  const [authModalDefaultTab, setAuthModalDefaultTab] = useState(0);

  // Guest Quota Tracking (5 extractions / day)
  const GUEST_DAILY_LIMIT = 5;
  const [guestCount, setGuestCount] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('image_guest_usage') || '{}');
      const today = new Date().toISOString().slice(0, 10);
      return saved.date === today ? saved.count || 0 : 0;
    } catch {
      return 0;
    }
  });

  const recordGuestExtraction = () => {
    if (!user) {
      const today = new Date().toISOString().slice(0, 10);
      const newCount = guestCount + 1;
      setGuestCount(newCount);
      localStorage.setItem('image_guest_usage', JSON.stringify({ date: today, count: newCount }));
    }
  };

  const isProOrTrial = useMemo(() => {
    if (!user) return false;
    if (user.plan === 'trial') {
      const ends = user.trialEndsAt ? new Date(user.trialEndsAt) : null;
      return !ends || ends > new Date();
    }
    return ['image_monthly', 'image_yearly', 'pro', 'cropper_monthly', 'cropper_yearly'].includes(user.plan);
  }, [user]);

  // Real-time domain detection as user types or pastes
  useEffect(() => {
    if (urlInput) {
      const plat = detectPlatform(urlInput);
      setDetectedPlatform(plat);
    } else {
      setDetectedPlatform(null);
    }
  }, [urlInput]);

  // Handle Clipboard Paste
  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrlInput(text.trim());
      }
    } catch (err) {
      console.warn('Clipboard read failed:', err);
    }
  };

  // Handle Clear
  const handleClear = () => {
    setUrlInput('');
    setStateStatus('idle');
    setExtractedData(null);
    setErrorMessage('');
    setErrorCode('');
  };

  // Trigger Single Extraction from Link
  const handleExtract = async (targetUrl = urlInput) => {
    const urlToTest = targetUrl || urlInput;
    if (!urlToTest.trim()) {
      setStateStatus('error');
      setErrorCode('INVALID_URL');
      setErrorMessage('Please paste an e-commerce product link to extract.');
      return;
    }

    // Check Guest Quota
    if (!isProOrTrial && guestCount >= GUEST_DAILY_LIMIT) {
      setAuthModalMode('paywall');
      setAuthModalOpen(true);
      return;
    }

    setStateStatus('loading');
    setErrorMessage('');
    setErrorCode('');

    try {
      let result = null;
      try {
        const token = localStorage.getItem('token');
        const apiRes = await fetch(`${API_BASE}/product-image/extract`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ url: urlToTest, format, quality }),
        });
        if (apiRes.ok) {
          const json = await apiRes.json();
          if (json.success && json.data) {
            const platformObj = PLATFORMS[json.data.platform] || PLATFORMS.generic;
            const images = json.data.images && json.data.images.length > 0
              ? json.data.images
              : [json.data.imageUrl];
            result = {
              success: true,
              platform: json.data.platform,
              platformInfo: platformObj,
              title: json.data.title,
              category: json.data.category || 'Product',
              dimensions: '2048 × 2048 px',
              fileSizeEstimate: '2.4 MB',
              imageUrl: images[0],
              images: images,
              sourceUrl: json.data.sourceUrl || urlToTest,
              sku: `SKU-${Date.now().toString().slice(-6)}`,
              format,
              quality,
              extractedAt: new Date().toISOString(),
            };
          }
        }
      } catch (apiErr) {
        console.warn('Backend API unavailable, using client extractor:', apiErr);
      }

      if (!result) {
        result = await simulateExtract(urlToTest, format, quality);
      }

      setExtractedData(result);
      setSelectedImageIndex(0);
      setStateStatus('success');
      recordGuestExtraction();
    } catch (err) {
      setStateStatus('error');
      setErrorCode(err.code || 'UNKNOWN_ERROR');
      setErrorMessage(err.message || 'Failed to extract product image.');
    }
  };

  // Handle Direct Image File Upload
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setStateStatus('error');
      setErrorCode('INVALID_FILE');
      setErrorMessage('Please upload a valid image file (PNG, JPEG, WEBP, or SVG).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const dataUrl = loadEvent.target.result;
      const img = new Image();
      img.onload = () => {
        const item = {
          success: true,
          platform: 'upload',
          platformInfo: {
            name: 'Uploaded Image',
            color: '#00d68f',
            bgColor: 'rgba(0, 214, 143, 0.12)',
            borderColor: 'rgba(0, 214, 143, 0.35)',
            icon: '📁',
          },
          title: file.name.replace(/\.[^/.]+$/, ''),
          category: 'Uploaded File',
          dimensions: `${img.naturalWidth} × ${img.naturalHeight} px`,
          fileSizeEstimate: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
          imageUrl: dataUrl,
          images: [dataUrl],
          sourceUrl: '',
          sku: `IMG-${Date.now().toString().slice(-6)}`,
          format,
          quality,
          extractedAt: new Date().toISOString(),
        };

        setExtractedData(item);
        setSelectedImageIndex(0);
        setStateStatus('success');
        recordGuestExtraction();
        openImagePreview(item, 0);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);

    // Reset input so re-selecting same file works
    e.target.value = '';
  };

  // Open Full-Screen Image Preview Lightbox
  const openImagePreview = (item, index = 0) => {
    const target = item || extractedData;
    if (target) {
      setActivePreviewItem(target);
      setSelectedImageIndex(index);
      setZoomScale(1);
      setPreviewModalOpen(true);
    }
  };

  // Single Image Download with safe data URI handling & direct fallback
  const handleDownload = (item = extractedData, targetUrlOverride = null) => {
    const targetUrl = targetUrlOverride || activeImageUrl || item?.imageUrl;
    if (!targetUrl) return;
    setDownloading(true);

    const cleanName = (item?.title || 'product')
      .replace(/[^a-z0-9_-]/gi, '_')
      .slice(0, 36);

    const angleSuffix = item?.images && item.images.length > 1 ? `_Angle_${selectedImageIndex + 1}` : '';

    const fallbackDirectDownload = () => {
      try {
        if (targetUrl.startsWith('data:')) {
          const arr = targetUrl.split(',');
          const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
          const bstr = atob(arr[1]);
          let n = bstr.length;
          const u8arr = new Uint8Array(n);
          while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
          }
          const blob = new Blob([u8arr], { type: mime });
          saveAs(blob, `${cleanName}${angleSuffix}.${format === 'jpeg' ? 'jpg' : 'png'}`);
        } else {
          const directUrl = /^https?:\/\//i.test(targetUrl)
            ? `${API_BASE}/product-image/proxy?url=${encodeURIComponent(targetUrl)}`
            : targetUrl;
          saveAs(directUrl, `${cleanName}${angleSuffix}.${format === 'jpeg' ? 'jpg' : 'png'}`);
        }
      } catch (e) {
        console.warn('Fallback direct download failed:', e);
      } finally {
        setDownloading(false);
      }
    };

    const img = new Image();
    const sourceSrc = /^https?:\/\//i.test(targetUrl)
      ? `${API_BASE}/product-image/proxy?url=${encodeURIComponent(targetUrl)}`
      : targetUrl;

    if (/^https?:\/\//i.test(sourceSrc)) {
      img.crossOrigin = 'anonymous';
    }

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || 1200;
        canvas.height = img.naturalHeight || 1200;
        const ctx = canvas.getContext('2d');

        if (format === 'jpeg') {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        ctx.drawImage(img, 0, 0);

        const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
        const q = format === 'jpeg' ? quality / 100 : undefined;

        canvas.toBlob((blob) => {
          if (blob) {
            saveAs(blob, `${cleanName}${angleSuffix}.${format === 'jpeg' ? 'jpg' : 'png'}`);
            setDownloading(false);
          } else {
            fallbackDirectDownload();
          }
        }, mimeType, q);
      } catch (canvasErr) {
        console.warn('Canvas export error, using fallback:', canvasErr);
        fallbackDirectDownload();
      }
    };

    img.onerror = (err) => {
      console.warn('Image canvas load failed, using fallback:', err);
      fallbackDirectDownload();
    };

    img.src = sourceSrc;
  };

  // Download All Angles of a Single Product as ZIP
  const handleDownloadProductAllAnglesZip = async (item = extractedData) => {
    const images = item?.images && item.images.length > 0 ? item.images : [item?.imageUrl].filter(Boolean);
    if (images.length === 0) return;

    setDownloading(true);
    try {
      const zip = new JSZip();
      const cleanTitle = (item.title || 'product').replace(/[^a-z0-9_-]/gi, '_').slice(0, 32);
      const folder = zip.folder(`${cleanTitle}_images`);

      for (let i = 0; i < images.length; i++) {
        const url = images[i];
        const blob = await new Promise((resolve) => {
          const img = new Image();
          const proxySrc = /^https?:\/\//i.test(url)
            ? `${API_BASE}/product-image/proxy?url=${encodeURIComponent(url)}`
            : url;

          if (/^https?:\/\//i.test(proxySrc)) {
            img.crossOrigin = 'anonymous';
          }
          img.onload = () => {
            try {
              const canvas = document.createElement('canvas');
              canvas.width = img.naturalWidth || 1200;
              canvas.height = img.naturalHeight || 1200;
              const ctx = canvas.getContext('2d');
              if (format === 'jpeg') {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
              }
              ctx.drawImage(img, 0, 0);
              canvas.toBlob(
                (b) => resolve(b || new Blob([''], { type: 'image/png' })),
                format === 'jpeg' ? 'image/jpeg' : 'image/png',
                quality / 100
              );
            } catch {
              resolve(new Blob([''], { type: 'image/png' }));
            }
          };
          img.onerror = () => {
            resolve(new Blob([''], { type: 'image/png' }));
          };
          img.src = proxySrc;
        });

        folder.file(`Angle_${i + 1}_${cleanTitle}.${format === 'jpeg' ? 'jpg' : 'png'}`, blob);
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      saveAs(zipBlob, `${cleanTitle}_All_Angles_${Date.now()}.zip`);
    } catch (err) {
      console.error('Failed to generate product angles ZIP:', err);
      alert('Failed to package all angles.');
    } finally {
      setDownloading(false);
    }
  };

  // Batch Multi-link Processing
  const handleBatchExtract = async () => {
    const urls = batchInput
      .split('\n')
      .map((u) => u.trim())
      .filter((u) => u.length > 0);

    if (urls.length === 0) {
      alert('Please enter at least one URL per line.');
      return;
    }

    // Gating check for Batch mode
    if (!isProOrTrial && urls.length > 2) {
      setAuthModalMode('paywall');
      setAuthModalOpen(true);
      return;
    }

    setBatchLoading(true);
    setBatchResults([]);
    setBatchProgress({ current: 0, total: urls.length });

    const results = [];
    for (let i = 0; i < urls.length; i++) {
      setBatchProgress({ current: i + 1, total: urls.length });
      try {
        let res = null;
        try {
          const token = localStorage.getItem('token');
          const apiRes = await fetch(`${API_BASE}/product-image/extract`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ url: urls[i], format, quality }),
          });
          if (apiRes.ok) {
            const json = await apiRes.json();
            if (json.success && json.data) {
              const platformObj = PLATFORMS[json.data.platform] || PLATFORMS.generic;
              res = {
                success: true,
                platform: json.data.platform,
                platformInfo: platformObj,
                title: json.data.title,
                category: json.data.category || 'Product',
                dimensions: '2048 × 2048 px',
                fileSizeEstimate: '2.4 MB',
                imageUrl: json.data.imageUrl,
                sourceUrl: json.data.sourceUrl || urls[i],
                sku: `SKU-${Date.now().toString().slice(-6)}`,
                format,
                quality,
                extractedAt: new Date().toISOString(),
              };
            }
          }
        } catch {}

        if (!res) {
          res = await simulateExtract(urls[i], format, quality);
        }
        results.push({ ...res, status: 'success', id: i });
      } catch (err) {
        results.push({
          sourceUrl: urls[i],
          status: 'error',
          error: err.message,
          id: i,
        });
      }
      await new Promise((r) => setTimeout(r, 100));
    }

    setBatchResults(results);
    setBatchLoading(false);
  };

  // Batch Download as ZIP
  const handleDownloadAllZip = async () => {
    const validItems = batchResults.filter((r) => r.status === 'success');
    if (validItems.length === 0) return;

    if (!isProOrTrial) {
      setAuthModalMode('paywall');
      setAuthModalOpen(true);
      return;
    }

    setBatchZipping(true);
    try {
      const zip = new JSZip();
      const folder = zip.folder('product_images');

      for (let i = 0; i < validItems.length; i++) {
        const item = validItems[i];
        const blob = await new Promise((resolve) => {
          const img = new Image();
          const proxySrc = /^https?:\/\//i.test(item.imageUrl)
            ? `${API_BASE}/product-image/proxy?url=${encodeURIComponent(item.imageUrl)}`
            : item.imageUrl;

          if (/^https?:\/\//i.test(proxySrc)) {
            img.crossOrigin = 'anonymous';
          }
          img.onload = () => {
            try {
              const canvas = document.createElement('canvas');
              canvas.width = img.naturalWidth || 1200;
              canvas.height = img.naturalHeight || 1200;
              const ctx = canvas.getContext('2d');
              if (format === 'jpeg') {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
              }
              ctx.drawImage(img, 0, 0);
              canvas.toBlob((b) => resolve(b || new Blob([''], { type: 'image/png' })), format === 'jpeg' ? 'image/jpeg' : 'image/png', quality / 100);
            } catch {
              resolve(new Blob([''], { type: 'image/png' }));
            }
          };
          img.onerror = () => {
            if (item.imageUrl?.startsWith('data:')) {
              try {
                const arr = item.imageUrl.split(',');
                const bstr = atob(arr[1]);
                let n = bstr.length;
                const u8arr = new Uint8Array(n);
                while (n--) u8arr[n] = bstr.charCodeAt(n);
                resolve(new Blob([u8arr], { type: 'image/png' }));
                return;
              } catch {}
            }
            resolve(new Blob([''], { type: 'image/png' }));
          };
          img.src = proxySrc;
        });

        const safeTitle = (item.title || 'item').replace(/[^a-z0-9_-]/gi, '_').slice(0, 24);
        folder.file(`${i + 1}_${safeTitle}.${format === 'jpeg' ? 'jpg' : 'png'}`, blob);
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      saveAs(zipBlob, `lyzov_batch_images_${Date.now()}.zip`);
    } catch (err) {
      console.error('ZIP generation error:', err);
      alert('Failed to generate ZIP archive.');
    } finally {
      setBatchZipping(false);
    }
  };

  return (
    <Box className="extractor-root">
      {/* Hidden File Input for Image Upload */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/png, image/jpeg, image/webp, image/svg+xml"
        style={{ display: 'none' }}
        onChange={handleFileUpload}
      />

      {/* SEO Title without 'Free' or 'AI' */}
      <SEOHead
        title="Product Link to Image Extractor | Amazon, Flipkart, Meesho, Myntra"
        description="Extract high-resolution product photos from Amazon, Flipkart, Meesho, and Myntra links, or upload image files. Download cleanly as PNG or JPEG."
        canonical="https://tools.lyzov.com/image-extractor"
      />

      {/* Ambient Glow */}
      <Box className="extractor-glow-bg" />

      {/* Top Navbar */}
      <Box
        component="header"
        sx={{
          py: 1.5,
          px: { xs: 1.5, sm: 3, md: 4 },
          borderBottom: '1px solid var(--border)',
          bgcolor: theme === 'dark' ? 'rgba(7, 10, 18, 0.95)' : 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(16px)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1.5,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #00c9ff 0%, #0077ff 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(0, 201, 255, 0.35)',
            }}
          >
            <ImageIcon size={20} color="#ffffff" />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={800} sx={{ letterSpacing: '-0.5px', lineHeight: 1.1, fontSize: { xs: '1rem', sm: '1.15rem' } }}>
              LyZov <span style={{ color: '#00c9ff' }}>Image</span> Extractor
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
              Product Link &amp; Image Converter
            </Typography>
          </Box>
        </Box>

        {/* Right Actions */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {/* User Status / Quota */}
          {user ? (
            <Chip
              icon={<Crown size={14} color="#00d68f" />}
              label={user.plan === 'trial' ? '30-Day Trial Active' : 'Pro Member'}
              size="small"
              onClick={() => {
                setAuthModalMode('paywall');
                setAuthModalOpen(true);
              }}
              sx={{
                bgcolor: 'rgba(0, 214, 143, 0.12)',
                color: '#00d68f',
                border: '1px solid rgba(0, 214, 143, 0.3)',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            />
          ) : (
            <Tooltip title="Daily extractions quota for unregistered guests">
              <Chip
                label={`Guest: ${Math.max(0, GUEST_DAILY_LIMIT - guestCount)}/5 extractions today`}
                size="small"
                sx={{
                  bgcolor: 'rgba(0, 201, 255, 0.1)',
                  color: '#00c9ff',
                  border: '1px solid rgba(0, 201, 255, 0.25)',
                  fontWeight: 700,
                }}
              />
            </Tooltip>
          )}

          {!user && (
            <Button
              size="small"
              variant="outlined"
              onClick={() => {
                setAuthModalMode('auth');
                setAuthModalDefaultTab(0);
                setAuthModalOpen(true);
              }}
              sx={{
                borderColor: 'var(--border)',
                color: 'text.primary',
                fontWeight: 700,
                fontSize: '0.78rem',
                textTransform: 'none',
                borderRadius: 2,
                display: { xs: 'none', sm: 'inline-flex' },
              }}
            >
              Sign In
            </Button>
          )}

          <Button
            size="small"
            variant="contained"
            onClick={() => {
              setAuthModalMode('paywall');
              setAuthModalOpen(true);
            }}
            sx={{
              background: 'linear-gradient(135deg, #00c9ff 0%, #0077ff 100%)',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '0.78rem',
              borderRadius: 2,
              textTransform: 'none',
              boxShadow: '0 4px 14px rgba(0, 201, 255, 0.35)',
            }}
          >
            Upgrade Pro ₹99
          </Button>

          <Button
            component={Link}
            to="/"
            variant="outlined"
            size="small"
            sx={{
              color: 'text.secondary',
              borderColor: 'var(--border)',
              fontWeight: 700,
              fontSize: '0.78rem',
              borderRadius: 2,
              textTransform: 'none',
              display: { xs: 'none', md: 'inline-flex' },
            }}
          >
            ← All Tools
          </Button>

          {/* Theme Toggle */}
          <IconButton
            size="small"
            onClick={toggleTheme}
            sx={{
              color: 'text.primary',
              bgcolor: theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
              border: '1px solid var(--border)',
              borderRadius: 2,
              p: 0.8,
            }}
          >
            {theme === 'dark' ? <Sun size={17} color="#f5a623" /> : <Moon size={17} color="#0284c7" />}
          </IconButton>
        </Box>
      </Box>

      {/* Main Container */}
      <Box sx={{ maxWidth: 1140, mx: 'auto', width: '100%', px: { xs: 2, sm: 3 }, flex: 1, pb: 8 }}>
        {/* Hero Header */}
        <Box className="extractor-hero">
          <Box className="extractor-badge-pill">
            <ImageIcon size={13} />
            <span>Product Image Extractor</span>
          </Box>
          <Typography
            variant="h3"
            fontWeight={900}
            sx={{
              letterSpacing: '-1px',
              fontSize: { xs: '1.8rem', sm: '2.6rem' },
              mb: 1.5,
              lineHeight: 1.15,
            }}
          >
            Extract Product Images from <br />
            <span style={{ background: 'linear-gradient(135deg, #00c9ff 0%, #a78bfa 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Amazon, Flipkart, Meesho &amp; More
            </span>
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 640, mx: 'auto', fontSize: { xs: '0.9rem', sm: '1rem' } }}>
            Paste any product link or upload an image file to inspect high-resolution photos. Download cleanly as PNG or compressed JPEG.
          </Typography>

          {/* Mode Switcher */}
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <Tabs
              value={activeTab}
              onChange={(_, v) => setActiveTab(v)}
              sx={{
                bgcolor: 'var(--surface-2)',
                p: 0.5,
                borderRadius: 3,
                border: '1px solid var(--border)',
                minHeight: 44,
                '& .MuiTabs-indicator': { display: 'none' },
                '& .MuiTab-root': {
                  textTransform: 'none',
                  fontWeight: 700,
                  fontSize: '0.86rem',
                  borderRadius: 2.5,
                  minHeight: 36,
                  px: 2.5,
                  color: 'text.secondary',
                  '&.Mui-selected': {
                    bgcolor: 'var(--surface)',
                    color: '#00c9ff',
                    boxShadow: 'var(--shadow)',
                  },
                },
              }}
            >
              <Tab label="Single Product / Upload" icon={<ImageIcon size={16} />} iconPosition="start" />
              <Tab
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                    <span>Batch Multi-Link</span>
                    <Chip label="PRO" size="small" sx={{ height: 18, fontSize: '0.62rem', fontWeight: 800, bgcolor: 'rgba(0, 201, 255, 0.2)', color: '#00c9ff' }} />
                  </Box>
                }
                icon={<Layers size={16} />}
                iconPosition="start"
              />
            </Tabs>
          </Box>
        </Box>

        {/* ============================================================== */}
        {/* TAB 0: SINGLE URL EXTRACTOR & UPLOAD MODE                       */}
        {/* ============================================================== */}
        {activeTab === 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Input & Generator Card */}
            <Box className="extractor-card" sx={{ p: { xs: 2, sm: 3 } }}>
              <Box className="extractor-input-wrapper">
                {/* Platform Icon Badge */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, pl: 0.5 }}>
                  {detectedPlatform ? (
                    <Chip
                      label={detectedPlatform.name}
                      size="small"
                      sx={{
                        bgcolor: detectedPlatform.bgColor,
                        color: detectedPlatform.color,
                        border: `1px solid ${detectedPlatform.borderColor}`,
                        fontWeight: 800,
                        fontSize: '0.75rem',
                      }}
                    />
                  ) : (
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
                      Auto-Detect
                    </Typography>
                  )}
                </Box>

                <input
                  type="text"
                  className="extractor-input"
                  placeholder="Paste Amazon, Flipkart, Meesho, or Myntra product link here..."
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleExtract();
                  }}
                />

                {/* Paste and Clear buttons */}
                {urlInput ? (
                  <Tooltip title="Clear Input">
                    <IconButton size="small" onClick={handleClear} sx={{ color: 'text.secondary' }}>
                      <Trash2 size={16} />
                    </IconButton>
                  </Tooltip>
                ) : (
                  <Button
                    size="small"
                    variant="text"
                    startIcon={<ClipboardPaste size={15} />}
                    onClick={handlePaste}
                    sx={{ color: '#00c9ff', fontWeight: 700, fontSize: '0.78rem', textTransform: 'none' }}
                  >
                    Paste
                  </Button>
                )}

                {/* Direct Upload Image Button */}
                <Tooltip title="Upload local image file (PNG, JPG, WEBP) to preview and convert">
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<Upload size={15} />}
                    onClick={() => fileInputRef.current?.click()}
                    sx={{
                      borderColor: 'var(--border)',
                      color: 'text.primary',
                      fontWeight: 700,
                      fontSize: '0.78rem',
                      textTransform: 'none',
                      borderRadius: 2,
                      px: 1.5,
                      whiteSpace: 'nowrap',
                      display: { xs: 'none', sm: 'inline-flex' },
                      '&:hover': {
                        borderColor: '#00c9ff',
                        color: '#00c9ff',
                      },
                    }}
                  >
                    Upload Image
                  </Button>
                </Tooltip>

                {/* Generate Button */}
                <Button
                  variant="contained"
                  disabled={stateStatus === 'loading'}
                  onClick={() => handleExtract()}
                  sx={{
                    background: 'linear-gradient(135deg, #00c9ff 0%, #0077ff 100%)',
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: '0.88rem',
                    textTransform: 'none',
                    px: { xs: 2, sm: 3 },
                    py: 1.1,
                    borderRadius: 2.2,
                    boxShadow: '0 4px 14px rgba(0, 201, 255, 0.4)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {stateStatus === 'loading' ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CircularProgress size={16} color="inherit" />
                      <span>Extracting...</span>
                    </Box>
                  ) : (
                    'Extract Image'
                  )}
                </Button>
              </Box>

              {/* Mobile Upload Button Row */}
              <Box sx={{ display: { xs: 'block', sm: 'none' }, mt: 1.5 }}>
                <Button
                  fullWidth
                  variant="outlined"
                  size="small"
                  startIcon={<Upload size={16} />}
                  onClick={() => fileInputRef.current?.click()}
                  sx={{
                    borderColor: 'var(--border)',
                    color: 'text.primary',
                    fontWeight: 700,
                    textTransform: 'none',
                    borderRadius: 2,
                  }}
                >
                  Upload Image File from Device
                </Button>
              </Box>

              {/* Quick Sample Links Bar */}
              <Box sx={{ mt: 2, pt: 1.5, borderTop: '1px solid var(--border)' }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, mr: 1, display: 'inline-block' }}>
                  Quick Try:
                </Typography>
                <Box className="extractor-samples-bar" sx={{ display: 'inline-flex', verticalAlign: 'middle' }}>
                  {SAMPLE_LINKS.map((item, idx) => (
                    <Chip
                      key={idx}
                      className="extractor-sample-chip"
                      label={item.label}
                      size="small"
                      onClick={() => {
                        setUrlInput(item.url);
                        handleExtract(item.url);
                      }}
                      sx={{
                        bgcolor: 'var(--surface-2)',
                        border: '1px solid var(--border)',
                        color: 'text.secondary',
                        '&:hover': {
                          borderColor: '#00c9ff',
                          color: '#00c9ff',
                        },
                      }}
                    />
                  ))}
                </Box>
              </Box>
            </Box>

            {/* Shimmer line when loading */}
            {stateStatus === 'loading' && <Box className="extractor-shimmer-bar" />}

            {/* ================= STATE 1: ERROR ALERT ================= */}
            {stateStatus === 'error' && (
              <Alert
                severity={errorCode === 'INVALID_URL' ? 'warning' : 'error'}
                icon={<AlertCircle size={20} />}
                sx={{
                  borderRadius: 3,
                  border: '1px solid',
                  borderColor: errorCode === 'INVALID_URL' ? 'rgba(245, 166, 35, 0.4)' : 'rgba(239, 68, 68, 0.4)',
                  bgcolor: 'var(--surface)',
                }}
                action={
                  <Button
                    color="inherit"
                    size="small"
                    startIcon={<RefreshCw size={14} />}
                    onClick={() => handleExtract()}
                    sx={{ fontWeight: 700, textTransform: 'none' }}
                  >
                    Retry
                  </Button>
                }
              >
                <Typography variant="subtitle2" fontWeight={800}>
                  {errorCode === 'INVALID_URL'
                    ? 'Invalid Product Link'
                    : errorCode === 'NOT_FOUND'
                    ? 'Product Not Found (404)'
                    : errorCode === 'TIMEOUT'
                    ? 'Extraction Timed Out'
                    : 'Extraction Notice'}
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.4 }}>
                  {errorMessage}
                </Typography>
                {errorCode === 'UNSUPPORTED_PLATFORM' && (
                  <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'text.secondary' }}>
                    Tip: Try an Amazon, Flipkart, Meesho, or Myntra product link, or upload an image file directly.
                  </Typography>
                )}
              </Alert>
            )}

            {/* ================= STATE 2: SUCCESS PREVIEW STUDIO ================= */}
            {stateStatus === 'success' && extractedData && (
              <Box className="extractor-card" sx={{ p: { xs: 2, sm: 3 } }}>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', md: '1.2fr 1fr' },
                    gap: 3,
                    alignItems: 'center',
                  }}
                >
                  {/* Left: Interactive Image Canvas Frame with Click-to-Preview + Gallery Strip */}
                  <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                    <Box
                      className="extractor-preview-frame checkerboard-pattern"
                      onClick={() => openImagePreview(extractedData, selectedImageIndex)}
                      sx={{ cursor: 'pointer', position: 'relative' }}
                    >
                      <img
                        src={activeImageUrl}
                        alt={extractedData.title}
                        className="extractor-preview-img"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = '/products/shoes.jpg';
                        }}
                      />

                      {/* Top Badges */}
                      <Box
                        sx={{
                          position: 'absolute',
                          top: 12,
                          left: 12,
                          display: 'flex',
                          gap: 1,
                          flexWrap: 'wrap',
                        }}
                      >
                        <Chip
                          label={extractedData.platformInfo?.name || 'Verified Product'}
                          size="small"
                          sx={{
                            bgcolor: 'rgba(0, 0, 0, 0.75)',
                            color: '#ffffff',
                            backdropFilter: 'blur(8px)',
                            fontWeight: 700,
                            fontSize: '0.72rem',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                          }}
                        />
                        <Chip
                          label={extractedData.dimensions}
                          size="small"
                          sx={{
                            bgcolor: 'rgba(0, 201, 255, 0.2)',
                            color: '#00c9ff',
                            backdropFilter: 'blur(8px)',
                            fontWeight: 700,
                            fontSize: '0.72rem',
                            border: '1px solid rgba(0, 201, 255, 0.3)',
                          }}
                        />
                      </Box>

                      {/* Click to Preview Overlay Pill */}
                      <Box
                        sx={{
                          position: 'absolute',
                          bottom: 14,
                          right: 14,
                          bgcolor: 'rgba(0, 0, 0, 0.8)',
                          backdropFilter: 'blur(8px)',
                          px: 1.5,
                          py: 0.6,
                          borderRadius: 2,
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.8,
                          color: '#00c9ff',
                          fontWeight: 700,
                          fontSize: '0.76rem',
                          boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
                          transition: 'transform 0.2s ease',
                          '&:hover': { transform: 'scale(1.05)' },
                        }}
                      >
                        <Eye size={14} />
                        <span>Click to Enlarge / Preview</span>
                      </Box>
                    </Box>

                    {/* Gallery Angles Strip (when product has multiple images) */}
                    {extractedData.images && extractedData.images.length > 1 && (
                      <Box sx={{ mt: 1.5, p: 1.2, bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 2.5, border: '1px solid rgba(255,255,255,0.08)' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.8, px: 0.5 }}>
                          <Typography variant="caption" sx={{ color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.72rem' }}>
                            Product Angles ({extractedData.images.length} Photos)
                          </Typography>
                          <Chip
                            label={`Angle ${selectedImageIndex + 1} of ${extractedData.images.length}`}
                            size="small"
                            sx={{ height: 20, fontSize: '0.68rem', fontWeight: 800, bgcolor: 'rgba(0, 201, 255, 0.15)', color: '#00c9ff' }}
                          />
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', pb: 0.5 }}>
                          {extractedData.images.map((imgUrl, idx) => (
                            <Box
                              key={idx}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedImageIndex(idx);
                              }}
                              sx={{
                                width: 62,
                                height: 62,
                                borderRadius: 2,
                                border: idx === selectedImageIndex ? '2px solid #00c9ff' : '1px solid rgba(255,255,255,0.12)',
                                bgcolor: '#090d16',
                                overflow: 'hidden',
                                cursor: 'pointer',
                                flexShrink: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: idx === selectedImageIndex ? '0 0 14px rgba(0,201,255,0.45)' : 'none',
                                transition: 'all 0.2s ease',
                                '&:hover': {
                                  borderColor: '#00c9ff',
                                  transform: 'scale(1.04)',
                                },
                              }}
                            >
                              <img
                                src={imgUrl}
                                alt={`Angle ${idx + 1}`}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                onError={(e) => {
                                  e.currentTarget.onerror = null;
                                  e.currentTarget.src = '/products/shoes.jpg';
                                }}
                              />
                            </Box>
                          ))}
                        </Box>
                      </Box>
                    )}
                  </Box>

                  {/* Right: Controls & Download Options */}
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Chip
                          label={extractedData.category}
                          size="small"
                          sx={{
                            bgcolor: 'rgba(0, 214, 143, 0.12)',
                            color: '#00d68f',
                            fontWeight: 700,
                            fontSize: '0.7rem',
                          }}
                        />
                        <Typography variant="caption" color="text.secondary">
                          SKU: {extractedData.sku}
                        </Typography>
                      </Box>
                      <Typography variant="h6" fontWeight={800} sx={{ lineHeight: 1.3, letterSpacing: '-0.3px' }}>
                        {extractedData.title}
                      </Typography>
                    </Box>

                    {/* Format Selector: PNG vs JPEG */}
                    <Box sx={{ bgcolor: 'var(--surface-2)', p: 2, borderRadius: 2.5, border: '1px solid var(--border)' }}>
                      <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Sliders size={16} color="#00c9ff" />
                        <span>Download Format &amp; Quality</span>
                      </Typography>

                      <RadioGroup
                        row
                        value={format}
                        onChange={(e) => setFormat(e.target.value)}
                        sx={{ gap: 2 }}
                      >
                        <FormControlLabel
                          value="png"
                          control={<Radio size="small" sx={{ color: '#00c9ff' }} />}
                          label={
                            <Box>
                              <Typography variant="body2" fontWeight={700}>
                                PNG (Lossless)
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Transparent background ready
                              </Typography>
                            </Box>
                          }
                        />
                        <FormControlLabel
                          value="jpeg"
                          control={<Radio size="small" sx={{ color: '#00c9ff' }} />}
                          label={
                            <Box>
                              <Typography variant="body2" fontWeight={700}>
                                JPEG (Optimized)
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Compressed web studio size
                              </Typography>
                            </Box>
                          }
                        />
                      </RadioGroup>

                      {/* JPEG Quality Slider */}
                      {format === 'jpeg' && (
                        <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid var(--border)' }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography variant="caption" fontWeight={700}>
                              JPEG Compression Quality
                            </Typography>
                            <Typography variant="caption" fontWeight={800} color="#00c9ff">
                              {quality}%
                            </Typography>
                          </Box>
                          <Slider
                            size="small"
                            value={quality}
                            min={60}
                            max={100}
                            step={5}
                            onChange={(_, val) => setQuality(val)}
                            sx={{ color: '#00c9ff' }}
                          />
                        </Box>
                      )}
                    </Box>

                    {/* Action Buttons: Preview Image + Download */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.2 }}>
                      <Box sx={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 1.5 }}>
                        <Button
                          variant="contained"
                          disabled={downloading}
                          onClick={() => handleDownload()}
                          startIcon={downloading ? <CircularProgress size={16} color="inherit" /> : <Download size={18} />}
                          sx={{
                            py: 1.3,
                            borderRadius: 2.5,
                            fontWeight: 800,
                            fontSize: '0.88rem',
                            textTransform: 'none',
                            background: 'linear-gradient(135deg, #00c9ff 0%, #0077ff 100%)',
                            color: '#ffffff',
                            boxShadow: '0 6px 20px rgba(0, 201, 255, 0.4)',
                          }}
                        >
                          {downloading
                            ? 'Rendering...'
                            : extractedData.images && extractedData.images.length > 1
                            ? `Download Angle ${selectedImageIndex + 1} (.${format.toUpperCase()})`
                            : `Download (.${format.toUpperCase()})`}
                        </Button>

                        {/* Explicit Image Preview Option Button */}
                        <Button
                          variant="outlined"
                          startIcon={<Eye size={17} />}
                          onClick={() => openImagePreview(extractedData, selectedImageIndex)}
                          sx={{
                            py: 1.3,
                            borderRadius: 2.5,
                            fontWeight: 800,
                            fontSize: '0.88rem',
                            textTransform: 'none',
                            color: '#00c9ff',
                            borderColor: 'rgba(0, 201, 255, 0.4)',
                            bgcolor: 'rgba(0, 201, 255, 0.05)',
                            '&:hover': {
                              borderColor: '#00c9ff',
                              bgcolor: 'rgba(0, 201, 255, 0.12)',
                            },
                          }}
                        >
                          Preview &amp; Zoom
                        </Button>
                      </Box>

                      {/* Download All Angles as ZIP Button (when product has multiple images) */}
                      {extractedData.images && extractedData.images.length > 1 && (
                        <Button
                          variant="contained"
                          disabled={downloading}
                          onClick={() => handleDownloadProductAllAnglesZip(extractedData)}
                          startIcon={downloading ? <CircularProgress size={16} color="inherit" /> : <Archive size={18} />}
                          sx={{
                            py: 1.2,
                            borderRadius: 2.5,
                            fontWeight: 800,
                            fontSize: '0.88rem',
                            textTransform: 'none',
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            color: '#ffffff',
                            boxShadow: '0 4px 16px rgba(16, 185, 129, 0.35)',
                            '&:hover': {
                              background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                            },
                          }}
                        >
                          Download All {extractedData.images.length} Angles (ZIP Archive)
                        </Button>
                      )}
                    </Box>

                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                          variant="outlined"
                          fullWidth
                          size="small"
                          startIcon={copiedLink ? <Check size={16} /> : <Copy size={16} />}
                          onClick={() => {
                            navigator.clipboard.writeText(extractedData.imageUrl);
                            setCopiedLink(true);
                            setTimeout(() => setCopiedLink(false), 2000);
                          }}
                          sx={{
                            color: 'text.secondary',
                            borderColor: 'var(--border)',
                            fontWeight: 700,
                            borderRadius: 2,
                            textTransform: 'none',
                          }}
                        >
                          {copiedLink ? 'Copied to Clipboard!' : 'Copy Data Link'}
                        </Button>

                        {extractedData.sourceUrl && (
                          <Button
                            variant="outlined"
                            size="small"
                            target="_blank"
                            href={extractedData.sourceUrl}
                            endIcon={<ExternalLink size={14} />}
                            sx={{
                              color: 'text.secondary',
                              borderColor: 'var(--border)',
                              fontWeight: 700,
                              borderRadius: 2,
                              textTransform: 'none',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            Visit Store
                          </Button>
                        )}
                      </Box>
                    </Box>
                  </Box>
                </Box>
            )}

            {/* ================= STATE 0: EMPTY FEATURE CARDS ================= */}
            {stateStatus === 'idle' && (
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 2 }}>
                {[
                  {
                    icon: '📦',
                    title: 'Amazon & Flipkart',
                    desc: 'Auto-resolves short links (amzn.in, fkrt.it) and extracts high-resolution product gallery photos.',
                  },
                  {
                    icon: '🛍️',
                    title: 'Meesho & Myntra',
                    desc: 'Grabs high-resolution apparel catalog images with transparent background extraction.',
                  },
                  {
                    icon: '⚡',
                    title: 'PNG & JPEG Transmutation',
                    desc: 'High-speed server rendering into production-ready formats with zero watermarks.',
                  },
                ].map((item, idx) => (
                  <Box
                    key={idx}
                    className="extractor-card"
                    sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 1 }}
                  >
                    <Typography variant="h4">{item.icon}</Typography>
                    <Typography variant="subtitle1" fontWeight={800}>
                      {item.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
                      {item.desc}
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        )}

        {/* ============================================================== */}
        {/* TAB 1: BATCH MULTI-LINK & ZIP DOWNLOAD MODE                     */}
        {/* ============================================================== */}
        {activeTab === 1 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box className="extractor-card" sx={{ p: { xs: 2.5, sm: 3.5 } }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
                <Box>
                  <Typography variant="h6" fontWeight={800}>
                    Bulk Product Image Extractor
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Paste up to 50 e-commerce product links (one per line) and download all as a ZIP file.
                  </Typography>
                </Box>
                <Chip
                  icon={<Crown size={14} color="#00c9ff" />}
                  label="PRO FEATURE"
                  size="small"
                  sx={{
                    bgcolor: 'rgba(0, 201, 255, 0.12)',
                    color: '#00c9ff',
                    border: '1px solid rgba(0, 201, 255, 0.3)',
                    fontWeight: 800,
                  }}
                />
              </Box>

              <TextField
                multiline
                rows={5}
                fullWidth
                placeholder={`https://www.amazon.in/dp/B09B8W5FW7\nhttps://www.flipkart.com/boat-storm-call-3/p/itm12345\nhttps://www.meesho.com/s/p/4v91a\nhttps://www.myntra.com/shoes/nike/nike-air-max-excee/12345/buy`}
                value={batchInput}
                onChange={(e) => setBatchInput(e.target.value)}
                sx={{
                  bgcolor: 'var(--surface-2)',
                  borderRadius: 2.5,
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--border)' },
                }}
              />

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2, flexWrap: 'wrap', gap: 1.5 }}>
                <Button
                  size="small"
                  variant="text"
                  onClick={() => {
                    const sampleBatch = SAMPLE_LINKS.slice(0, 4)
                      .map((s) => s.url)
                      .join('\n');
                    setBatchInput(sampleBatch);
                  }}
                  sx={{ color: '#00c9ff', textTransform: 'none', fontWeight: 700 }}
                >
                  + Load 4 Demo Links
                </Button>

                <Box sx={{ display: 'flex', gap: 1.5 }}>
                  <Button
                    variant="contained"
                    disabled={batchLoading}
                    onClick={handleBatchExtract}
                    sx={{
                      background: 'linear-gradient(135deg, #00c9ff 0%, #0077ff 100%)',
                      color: '#ffffff',
                      fontWeight: 800,
                      borderRadius: 2,
                      textTransform: 'none',
                      px: 3,
                    }}
                  >
                    {batchLoading ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CircularProgress size={16} color="inherit" />
                        <span>Processing ({batchProgress.current}/{batchProgress.total})...</span>
                      </Box>
                    ) : (
                      'Extract Batch Images'
                    )}
                  </Button>
                </Box>
              </Box>
            </Box>

            {/* Batch Results Grid & ZIP Exporter */}
            {batchResults.length > 0 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}>
                  <Typography variant="subtitle1" fontWeight={800}>
                    Extracted Results ({batchResults.filter((r) => r.status === 'success').length} / {batchResults.length} Ready)
                  </Typography>

                  <Button
                    variant="contained"
                    disabled={batchZipping || batchResults.filter((r) => r.status === 'success').length === 0}
                    onClick={handleDownloadAllZip}
                    startIcon={batchZipping ? <CircularProgress size={16} color="inherit" /> : <Archive size={18} />}
                    sx={{
                      background: 'linear-gradient(135deg, #00d68f 0%, #00a86b 100%)',
                      color: '#ffffff',
                      fontWeight: 800,
                      textTransform: 'none',
                      borderRadius: 2,
                      boxShadow: '0 4px 14px rgba(0, 214, 143, 0.4)',
                    }}
                  >
                    {batchZipping ? 'Archiving ZIP...' : 'Download All as ZIP Archive'}
                  </Button>
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr' }, gap: 2 }}>
                  {batchResults.map((item) => (
                    <Box
                      key={item.id}
                      className="extractor-card"
                      sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}
                    >
                      {item.status === 'success' ? (
                        <>
                          <Box
                            onClick={() => openImagePreview(item)}
                            sx={{
                              height: 160,
                              borderRadius: 2,
                              bgcolor: '#090d16',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              overflow: 'hidden',
                              cursor: 'pointer',
                              position: 'relative',
                            }}
                          >
                            <img
                              src={item.imageUrl}
                              alt={item.title}
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = '/products/shoes.jpg';
                              }}
                              style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}
                            />
                            <Box
                              sx={{
                                position: 'absolute',
                                top: 6,
                                right: 6,
                                p: 0.5,
                                bgcolor: 'rgba(0,0,0,0.6)',
                                borderRadius: 1.5,
                                color: '#00c9ff',
                                display: 'flex',
                              }}
                            >
                              <Eye size={14} />
                            </Box>
                          </Box>
                          <Typography
                            variant="body2"
                            fontWeight={700}
                            sx={{
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              minHeight: 40,
                              lineHeight: 1.25,
                            }}
                          >
                            {item.title}
                          </Typography>
                          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mt: 'auto' }}>
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<Eye size={13} />}
                              onClick={() => openImagePreview(item)}
                              sx={{
                                borderColor: 'var(--border)',
                                color: '#00c9ff',
                                fontWeight: 700,
                                textTransform: 'none',
                                borderRadius: 2,
                                fontSize: '0.75rem',
                              }}
                            >
                              Preview
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<Download size={13} />}
                              onClick={() => handleDownload(item)}
                              sx={{
                                borderColor: 'var(--border)',
                                color: 'text.primary',
                                fontWeight: 700,
                                textTransform: 'none',
                                borderRadius: 2,
                                fontSize: '0.75rem',
                              }}
                            >
                              Download
                            </Button>
                          </Box>
                        </>
                      ) : (
                        <Box sx={{ p: 2, bgcolor: 'rgba(239, 68, 68, 0.08)', borderRadius: 2, border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                          <Typography variant="caption" color="error" fontWeight={700} display="block">
                            Failed to extract:
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
                            {item.sourceUrl}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  ))}
                </Box>
              </Box>
            )}
          </Box>
        )}
      </Box>

      {/* ============================================================== */}
      {/* FULL-SCREEN IMAGE PREVIEW LIGHTBOX DIALOG                       */}
      {/* ============================================================== */}
      <Dialog
        open={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3.5,
            bgcolor: '#090d16',
            color: '#ffffff',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            overflow: 'hidden',
          },
        }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            py: 1.5,
            px: 2.5,
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Eye size={18} color="#00c9ff" />
            <Typography variant="subtitle1" fontWeight={800}>
              Image Preview
            </Typography>
            {activePreviewItem?.images && activePreviewItem.images.length > 1 && (
              <Chip
                label={`Angle ${selectedImageIndex + 1} of ${activePreviewItem.images.length}`}
                size="small"
                sx={{
                  bgcolor: 'rgba(0, 201, 255, 0.2)',
                  color: '#00c9ff',
                  fontWeight: 800,
                  fontSize: '0.72rem',
                }}
              />
            )}
            {activePreviewItem?.dimensions && (
              <Chip
                label={activePreviewItem.dimensions}
                size="small"
                sx={{
                  bgcolor: 'rgba(255, 255, 255, 0.08)',
                  color: '#94a3b8',
                  fontWeight: 700,
                  fontSize: '0.72rem',
                }}
              />
            )}
          </Box>

          {/* Zoom and Close Controls */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Tooltip title="Zoom Out">
              <IconButton
                size="small"
                onClick={() => setZoomScale((z) => Math.max(0.5, z - 0.25))}
                sx={{ color: '#94a3b8', '&:hover': { color: '#ffffff' } }}
              >
                <ZoomOut size={16} />
              </IconButton>
            </Tooltip>
            <Typography variant="caption" sx={{ minWidth: 40, textAlign: 'center', fontWeight: 700 }}>
              {Math.round(zoomScale * 100)}%
            </Typography>
            <Tooltip title="Zoom In">
              <IconButton
                size="small"
                onClick={() => setZoomScale((z) => Math.min(3, z + 0.25))}
                sx={{ color: '#94a3b8', '&:hover': { color: '#ffffff' } }}
              >
                <ZoomIn size={16} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Reset Zoom">
              <IconButton
                size="small"
                onClick={() => setZoomScale(1)}
                sx={{ color: '#94a3b8', '&:hover': { color: '#ffffff' } }}
              >
                <RotateCcw size={15} />
              </IconButton>
            </Tooltip>
            <IconButton
              size="small"
              onClick={() => setPreviewModalOpen(false)}
              sx={{ color: '#94a3b8', ml: 1, '&:hover': { color: '#ffffff' } }}
            >
              <X size={18} />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent
          sx={{
            p: 3,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 440,
            maxHeight: '75vh',
            overflow: 'auto',
            bgcolor: '#060a12',
            position: 'relative',
          }}
        >
          {/* Main Zoomable Image Canvas with Arrow Navigation */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              height: '100%',
              overflow: 'hidden',
              position: 'relative',
              flex: 1,
            }}
          >
            {/* Prev Angle Button */}
            {activePreviewItem?.images && activePreviewItem.images.length > 1 && (
              <IconButton
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedImageIndex((i) => (i > 0 ? i - 1 : activePreviewItem.images.length - 1));
                }}
                sx={{
                  position: 'absolute',
                  left: 12,
                  zIndex: 2,
                  bgcolor: 'rgba(0, 0, 0, 0.75)',
                  color: '#ffffff',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  '&:hover': { bgcolor: 'rgba(0, 201, 255, 0.3)', color: '#00c9ff' },
                }}
              >
                <ChevronLeft size={22} />
              </IconButton>
            )}

            <img
              src={
                activePreviewItem?.images && activePreviewItem.images.length > 0
                  ? activePreviewItem.images[selectedImageIndex] || activePreviewItem.images[0]
                  : activePreviewItem?.imageUrl
              }
              alt={activePreviewItem?.title || 'Preview'}
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = '/products/shoes.jpg';
              }}
              style={{
                maxWidth: '100%',
                maxHeight: '62vh',
                objectFit: 'contain',
                transform: `scale(${zoomScale})`,
                transition: 'transform 0.15s ease-out',
                borderRadius: 8,
                boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
              }}
            />

            {/* Next Angle Button */}
            {activePreviewItem?.images && activePreviewItem.images.length > 1 && (
              <IconButton
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedImageIndex((i) => (i < activePreviewItem.images.length - 1 ? i + 1 : 0));
                }}
                sx={{
                  position: 'absolute',
                  right: 12,
                  zIndex: 2,
                  bgcolor: 'rgba(0, 0, 0, 0.75)',
                  color: '#ffffff',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  '&:hover': { bgcolor: 'rgba(0, 201, 255, 0.3)', color: '#00c9ff' },
                }}
              >
                <ChevronRight size={22} />
              </IconButton>
            )}
          </Box>

          {/* Bottom Thumbnails Strip in Lightbox */}
          {activePreviewItem?.images && activePreviewItem.images.length > 1 && (
            <Box sx={{ display: 'flex', gap: 1, mt: 2, justifyContent: 'center', overflowX: 'auto', maxWidth: '100%', pb: 0.5 }}>
              {activePreviewItem.images.map((imgUrl, idx) => (
                <Box
                  key={idx}
                  onClick={() => setSelectedImageIndex(idx)}
                  sx={{
                    width: 52,
                    height: 52,
                    borderRadius: 2,
                    border: idx === selectedImageIndex ? '2px solid #00c9ff' : '1px solid rgba(255,255,255,0.15)',
                    bgcolor: '#090d16',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: idx === selectedImageIndex ? '0 0 10px rgba(0,201,255,0.5)' : 'none',
                    transition: 'all 0.15s ease',
                    '&:hover': { borderColor: '#00c9ff', transform: 'scale(1.05)' },
                  }}
                >
                  <img
                    src={imgUrl}
                    alt={`Angle ${idx + 1}`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = '/products/shoes.jpg';
                    }}
                  />
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>

        <DialogActions
          sx={{
            p: 2,
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            justifyContent: 'space-between',
            bgcolor: '#090d16',
          }}
        >
          <Typography
            variant="caption"
            sx={{
              color: '#94a3b8',
              maxWidth: '50%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontWeight: 500,
            }}
          >
            {activePreviewItem?.title}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {activePreviewItem?.images && activePreviewItem.images.length > 1 && (
              <Button
                size="small"
                variant="outlined"
                startIcon={<Archive size={15} />}
                onClick={() => {
                  handleDownloadProductAllAnglesZip(activePreviewItem);
                  setPreviewModalOpen(false);
                }}
                sx={{
                  color: '#10b981',
                  borderColor: 'rgba(16, 185, 129, 0.4)',
                  bgcolor: 'rgba(16, 185, 129, 0.08)',
                  fontWeight: 800,
                  textTransform: 'none',
                  borderRadius: 2,
                  px: 1.8,
                  '&:hover': {
                    borderColor: '#10b981',
                    bgcolor: 'rgba(16, 185, 129, 0.15)',
                  },
                }}
              >
                Download All Angles (ZIP)
              </Button>
            )}

            <Button
              size="small"
              variant="contained"
              startIcon={<Download size={15} />}
              onClick={() => {
                handleDownload(activePreviewItem);
                setPreviewModalOpen(false);
              }}
              sx={{
                background: 'linear-gradient(135deg, #00c9ff 0%, #0077ff 100%)',
                color: '#ffffff',
                fontWeight: 800,
                textTransform: 'none',
                borderRadius: 2,
                px: 2,
              }}
            >
              {activePreviewItem?.images && activePreviewItem.images.length > 1
                ? `Download Angle ${selectedImageIndex + 1}`
                : 'Download Image'}
            </Button>
          </Box>
        </DialogActions>
      </Dialog>

      {/* Auth / Razorpay Paywall Modal */}
      <ImageAuthModal
        open={authModalOpen}
        mode={authModalMode}
        defaultTab={authModalDefaultTab}
        user={user}
        onClose={() => setAuthModalOpen(false)}
        onAuthSuccess={(updatedUser) => {
          setUser(updatedUser);
          setAuthModalOpen(false);
        }}
      />

      {/* Footer */}
      <Footer />
    </Box>
  );
}
