import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  InputAdornment,
  LinearProgress,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import {
  AlertCircle,
  ArrowUp,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Code,
  Copy,
  Eye,
  FileJson,
  FileSpreadsheet,
  FileText,
  Info,
  Lightbulb,
  Link2,
  Receipt,
  RotateCcw,
  Search,
  ShieldAlert,
  Sparkles,
  Tag,
  Wand2,
  X,
} from 'lucide-react';
import { AppContext } from '../../context/AppContext';
import ToolShell from '../../components/tools/ToolShell';
import { toFriendlyErrorMessage } from '../../utils/fileValidation';
import { useToolSettings } from '../../utils/toolPrefs';
import { downloadBlob } from '../../utils/zipUtils';
import {
  PRODUCT_CATEGORIES,
  resolveEffectiveGst,
  searchHsnCatalog,
} from '../../data/hsnCatalog';
import {
  LISTING_PLATFORMS,
  LISTING_TONES,
  SAMPLE_PRODUCTS,
  countWords,
  exportAllListingsAsCsv,
  exportAllListingsAsJson,
  exportAllListingsAsText,
  formatSinglePlatformCopyText,
  generateMultiPlatformListings,
  getUtf8ByteLength,
} from '../../utils/listingGenerator';

const RAW_API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';
const API_BASE = RAW_API_BASE.replace(/\/+$/, '');

const DEFAULT_CATEGORY_ID = PRODUCT_CATEGORIES?.[0]?.id || 'apparel';
const DEFAULT_TONE_ID = LISTING_TONES?.[0]?.id || 'professional';
const ALL_PLATFORM_IDS = (LISTING_PLATFORMS || []).map((p) => p.id);

const DEFAULT_TOOL_SETTINGS = {
  tone: DEFAULT_TONE_ID,
  brandName: '',
  categoryId: DEFAULT_CATEGORY_ID,
  selectedPlatforms: ALL_PLATFORM_IDS,
};

function isSocialPlatform(platform) {
  const grp = String(platform?.group || '').toLowerCase();
  if (grp.includes('social')) return true;
  const id = String(platform?.id || '').toLowerCase();
  return ['instagram', 'facebook', 'whatsapp', 'youtube', 'youtube_shorts', 'youtube-shorts'].includes(id);
}

function createFormState(settings) {
  const safeCategoryId = (PRODUCT_CATEGORIES || []).some((c) => c.id === settings?.categoryId)
    ? settings.categoryId
    : DEFAULT_CATEGORY_ID;
  const safeToneId = (LISTING_TONES || []).some((t) => t.id === settings?.tone)
    ? settings.tone
    : DEFAULT_TONE_ID;
  return {
    productName: '',
    brandName: settings?.brandName || '',
    categoryId: safeCategoryId,
    sellingPrice: '',
    mrp: '',
    material: '',
    color: '',
    sizeOrCapacity: '',
    packQty: '',
    keyFeatures: '',
    targetAudience: '',
    tone: safeToneId,
    careInstructions: '',
    extraKeywords: '',
  };
}

function normalizeFeaturesText(val) {
  if (Array.isArray(val)) return val.join('\n');
  return String(val || '');
}

function hasFieldContent(val) {
  if (Array.isArray(val)) return val.some((item) => String(item || '').trim().length > 0);
  return String(val || '').trim().length > 0;
}

function formatInr(amount) {
  const num = Number(amount);
  if (!Number.isFinite(num)) return '₹0.00';
  return `₹${num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function computeTaxBreakdown(sellingPrice, gstRate, mrp = 0) {
  const price = Number(sellingPrice);
  const mrpNum = Number(mrp);
  const rate = Number(gstRate);
  if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(rate) || rate < 0) {
    return null;
  }
  const baseTaxableValue = Number((price / (1 + rate / 100)).toFixed(2));
  const gstAmount = Number((price - baseTaxableValue).toFixed(2));
  const halfGst = Number((gstAmount / 2).toFixed(2));
  const discountPercent =
    Number.isFinite(mrpNum) && mrpNum > price ? Math.round(((mrpNum - price) / mrpNum) * 100) : 0;
  return {
    sellingPrice: price,
    mrp: Number.isFinite(mrpNum) && mrpNum > 0 ? mrpNum : null,
    discountPercent,
    baseTaxableValue,
    gstAmount,
    cgstAmount: halfGst,
    sgstAmount: Number((gstAmount - halfGst).toFixed(2)),
    igstAmount: gstAmount,
    gstRate: rate,
  };
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function plainTextToSafeHtml(text) {
  const lines = String(text || '').split(/\r?\n/);
  const blocks = [];
  let listItems = [];

  const flushList = () => {
    if (listItems.length > 0) {
      blocks.push(`<ul>${listItems.map((li) => `<li>${escapeHtml(li)}</li>`).join('')}</ul>`);
      listItems = [];
    }
  };

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) {
      flushList();
      continue;
    }
    if (/^[-*•]\s+/.test(trimmed)) {
      listItems.push(trimmed.replace(/^[-*•]\s+/, ''));
    } else {
      flushList();
      blocks.push(`<p>${escapeHtml(trimmed)}</p>`);
    }
  }
  flushList();

  return blocks.join('\n');
}

function sanitizePreviewHtml(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '')
    .replace(/<(iframe|object|embed|link|meta)[^>]*?>/gi, '')
    .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/javascript:/gi, '');
}

function pickLimitNumber(limits, keys) {
  if (!limits || typeof limits !== 'object') return null;
  for (const key of keys) {
    const val = limits[key];
    if (typeof val === 'number' && Number.isFinite(val) && val > 0) {
      return val;
    }
  }
  return null;
}

function extractPlatformLimits(limits) {
  return {
    titleMaxChars: pickLimitNumber(limits, [
      'titleMaxChars',
      'titleChars',
      'titleMax',
      'maxTitleChars',
      'titleLimit',
      'title',
    ]),
    bulletMaxChars: pickLimitNumber(limits, [
      'bulletMaxChars',
      'bulletChars',
      'maxBulletChars',
      'perBulletMaxChars',
    ]),
    bulletsMaxCount: pickLimitNumber(limits, [
      'maxBullets',
      'bulletCount',
      'bulletsMax',
      'bulletsCount',
    ]),
    descriptionMaxChars: pickLimitNumber(limits, [
      'descriptionMaxChars',
      'descriptionChars',
      'descriptionMax',
      'maxDescriptionChars',
      'descriptionLimit',
      'description',
    ]),
    reelsCaptionMaxChars: pickLimitNumber(limits, [
      'reelsCaptionMaxChars',
      'captionMaxChars',
      'reelsMaxChars',
      'descriptionMaxChars',
      'descriptionChars',
    ]),
    keywordsMaxBytes: pickLimitNumber(limits, [
      'keywordsMaxBytes',
      'searchTermsMaxBytes',
      'keywordMaxBytes',
      'backendKeywordsMaxBytes',
      'maxKeywordBytes',
      'maxBytes',
    ]),
    keywordsMaxChars: pickLimitNumber(limits, [
      'keywordsMaxChars',
      'keywordMaxChars',
      'keywordsChars',
      'maxKeywordChars',
      'tagsMaxChars',
    ]),
    keywordsMaxCount: pickLimitNumber(limits, [
      'keywordsCount',
      'tagsCount',
      'hashtagsCount',
      'maxKeywords',
      'maxTags',
      'maxHashtags',
      'hashtagLimit',
      'hashtagsMax',
    ]),
    tagMaxChars: pickLimitNumber(limits, ['tagMaxChars']),
    metaTitleMaxChars: pickLimitNumber(limits, [
      'seoTitleMaxChars',
      'metaTitleMaxChars',
      'metaTitleChars',
      'metaTitleMax',
    ]),
    metaDescriptionMaxChars: pickLimitNumber(limits, [
      'metaDescMaxChars',
      'metaDescriptionMaxChars',
      'metaDescriptionChars',
      'metaDescriptionMax',
    ]),
  };
}

function splitKeywordsForPlatform(platformId, text) {
  const raw = String(text || '').trim();
  if (!raw) return [];
  if (platformId === 'amazon' || platformId === 'instagram') {
    return raw
      .split(/[\s,]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return raw
    .split(/[,\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function listingToDraft(listing) {
  return {
    title: listing?.title || '',
    bulletsText: Array.isArray(listing?.bullets)
      ? listing.bullets.join('\n')
      : String(listing?.bullets || ''),
    description: listing?.description || '',
    descriptionHtml: listing?.descriptionHtml || '',
    keywordsText:
      listing?.keywordsText ??
      (Array.isArray(listing?.keywords)
        ? listing.keywords.join(', ')
        : String(listing?.keywords || '')),
    metaTitle: listing?.metaTitle ?? listing?.seoTitle ?? '',
    metaDescription: listing?.metaDescription || '',
    urlSlug: listing?.urlSlug || '',
    reelsCaption: listing?.reelsCaption || '',
  };
}

function draftToExportListing(original, draft) {
  if (!draft) return original;
  const bulletsWasArray = Array.isArray(original?.bullets);
  const keywordsWasArray = Array.isArray(original?.keywords);
  const descriptionChanged = draft.description !== (original?.description || '');
  const bulletsList = draft.bulletsText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const parsedKeywords = splitKeywordsForPlatform(original?.platformId, draft.keywordsText);

  const next = {
    ...original,
    title: draft.title,
    bullets: bulletsWasArray ? bulletsList : draft.bulletsText,
    description: draft.description,
    descriptionHtml: descriptionChanged
      ? original?.limits?.plainTextOnly
        ? null
        : plainTextToSafeHtml(draft.description)
      : original?.descriptionHtml ?? null,
    keywords: keywordsWasArray ? parsedKeywords : draft.keywordsText,
    keywordsText: draft.keywordsText,
    metaDescription: draft.metaDescription,
    urlSlug: draft.urlSlug,
    reelsCaption: draft.reelsCaption,
    stats: {
      ...(original?.stats || {}),
      titleChars: draft.title.length,
      titleWords: countWords(draft.title),
      descriptionChars: draft.description.length,
      descriptionWords: countWords(draft.description),
      keywordsBytes: getUtf8ByteLength(draft.keywordsText),
      keywordsChars: draft.keywordsText.length,
      bulletsCount: bulletsList.length,
    },
  };

  if ('seoTitle' in (original || {}) || original?.platformId === 'shopify') {
    next.seoTitle = draft.metaTitle;
  }
  if ('metaTitle' in (original || {})) {
    next.metaTitle = draft.metaTitle;
  }
  if ('tags' in (original || {})) {
    next.tags = parsedKeywords;
    next.tagsText = draft.keywordsText;
  }
  if ('hashtags' in (original || {})) {
    next.hashtags = parsedKeywords;
    next.hashtagsText = draft.keywordsText;
  }

  return next;
}

function guessCategoryFromImported({ title, category, url }) {
  const combined = `${title || ''} ${category || ''} ${String(url || '').replace(/[-/_?=&]+/g, ' ')}`.trim();
  if (!combined) return null;

  const hsnHits = searchHsnCatalog(combined, '', 0);
  if (Array.isArray(hsnHits) && hsnHits.length > 0) {
    const matchedCat = PRODUCT_CATEGORIES.find((c) => c.id === hsnHits[0].categoryId);
    if (matchedCat) return matchedCat.id;
  }

  const lower = combined.toLowerCase();
  for (const cat of PRODUCT_CATEGORIES) {
    const tokens = `${cat.name} ${cat.description} ${cat.id}`
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length >= 4);
    if (tokens.some((tok) => lower.includes(tok))) {
      return cat.id;
    }
  }
  return null;
}

function normalizeUrlInput(rawUrl) {
  const trimmed = String(rawUrl || '').trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^[a-z0-9.-]+\.[a-z]{2,}/i.test(trimmed)) return `https://${trimmed}`;
  return trimmed;
}

function buildDownloadStem(productName) {
  const stem = String(productName || 'product_listing')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48);
  return stem || 'product_listing';
}

async function copyTextSafe(text) {
  const str = String(text ?? '');
  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(str);
      return true;
    } catch {
      // Fallback below
    }
  }
  const textarea = document.createElement('textarea');
  textarea.value = str;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.top = '-9999px';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  const ok = document.execCommand('copy');
  document.body.removeChild(textarea);
  return ok;
}

function FieldCopyButton({
  copyKey,
  activeCopyKey,
  onCopy,
  text,
  getText,
  label = 'Copy',
  accent,
  size = 'small',
  variant = 'outlined',
}) {
  const isCopied = activeCopyKey === copyKey;
  const isDisabled = !getText && !String(text || '').trim();
  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      startIcon={isCopied ? <Check size={14} /> : <Copy size={14} />}
      onClick={() => onCopy(copyKey, getText ? getText() : text)}
      disabled={isDisabled}
      sx={{
        textTransform: 'none',
        fontWeight: 700,
        fontSize: '0.76rem',
        borderRadius: 2,
        px: 1.4,
        py: 0.45,
        flexShrink: 0,
        borderColor: isCopied ? '#00d68f' : 'divider',
        color: isCopied ? '#00d68f' : variant === 'contained' ? '#081420' : accent,
        bgcolor:
          variant === 'contained'
            ? isCopied
              ? 'rgba(0, 214, 143, 0.16)'
              : accent
            : isCopied
              ? 'rgba(0, 214, 143, 0.12)'
              : 'transparent',
        '&:hover': {
          borderColor: isCopied ? '#00d68f' : accent,
          bgcolor:
            variant === 'contained'
              ? accent
              : isCopied
                ? 'rgba(0, 214, 143, 0.16)'
                : `${accent}14`,
        },
      }}
    >
      {isCopied ? 'Copied!' : label}
    </Button>
  );
}

function FieldLimitMeter({
  value,
  maxChars = null,
  maxBytes = null,
  maxItems = null,
  itemCount = 0,
  itemLabel = 'items',
  perLineMaxChars = null,
  perTagMaxChars = null,
  showBytes = false,
  isDark,
}) {
  const text = String(value || '');
  const chars = text.length;
  const words = countWords(text);
  const bytes = getUtf8ByteLength(text);

  const lines = perLineMaxChars
    ? text
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
    : [];
  const longestLine = lines.reduce((max, l) => Math.max(max, l.length), 0);

  const tags = perTagMaxChars
    ? text
        .split(/[,\n]+/)
        .map((t) => t.trim())
        .filter(Boolean)
    : [];
  const longestTag = tags.reduce((max, t) => Math.max(max, t.length), 0);

  const charRatio = maxChars ? chars / maxChars : 0;
  const byteRatio = maxBytes ? bytes / maxBytes : 0;
  const itemRatio = maxItems ? itemCount / maxItems : 0;
  const lineRatio = perLineMaxChars ? longestLine / perLineMaxChars : 0;
  const tagRatio = perTagMaxChars ? longestTag / perTagMaxChars : 0;

  const maxRatio = Math.max(charRatio, byteRatio, itemRatio, lineRatio, tagRatio);

  let status = 'neutral';
  if (chars > 0) {
    if (
      (maxChars && chars > maxChars) ||
      (maxBytes && bytes > maxBytes) ||
      (maxItems && itemCount > maxItems) ||
      (perLineMaxChars && longestLine > perLineMaxChars) ||
      (perTagMaxChars && longestTag > perTagMaxChars)
    ) {
      status = 'error';
    } else if (maxRatio >= 0.9) {
      status = 'warning';
    } else {
      status = 'success';
    }
  }

  const palette = {
    neutral: isDark ? '#8896b3' : '#64748b',
    success: isDark ? '#00d68f' : '#00a86b',
    warning: '#f59e0b',
    error: '#ef4444',
  };
  const statusColor = palette[status];

  const primaryLimitRatio = maxBytes ? byteRatio : maxChars ? charRatio : lineRatio || itemRatio || tagRatio;
  const hasAnyLimit = Boolean(maxChars || maxBytes || maxItems || perLineMaxChars || perTagMaxChars);

  const parts = [];
  if (maxChars) {
    parts.push(`${chars} / ${maxChars} chars`);
  } else {
    parts.push(`${chars} chars`);
  }

  parts.push(`${words} ${words === 1 ? 'word' : 'words'}`);

  if (maxBytes) {
    parts.push(`${bytes} / ${maxBytes} bytes`);
  } else if (showBytes) {
    parts.push(`${bytes} bytes`);
  }

  if (maxItems) {
    parts.push(`${itemCount} / ${maxItems} ${itemLabel}`);
  } else if (itemCount > 0 && perLineMaxChars) {
    parts.push(`${itemCount} ${itemLabel}`);
  }

  if (perLineMaxChars && longestLine > 0) {
    parts.push(`max bullet ${longestLine} / ${perLineMaxChars} chars`);
  }

  if (perTagMaxChars && longestTag > 0) {
    parts.push(`longest tag ${longestTag} / ${perTagMaxChars} chars`);
  }

  return (
    <Box sx={{ mt: 0.9 }}>
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
          mb: hasAnyLimit ? 0.5 : 0,
        }}
      >
        <Typography
          variant="caption"
          sx={{
            color: statusColor,
            fontWeight: status === 'error' ? 800 : 600,
            fontSize: '0.75rem',
          }}
        >
          {parts.join(' · ')}
        </Typography>

        {status === 'error' && (
          <Typography
            variant="caption"
            sx={{ color: '#ef4444', fontWeight: 800, fontSize: '0.73rem' }}
          >
            Over platform limit — trim text for best approval
          </Typography>
        )}
        {status === 'warning' && (
          <Typography
            variant="caption"
            sx={{ color: '#f59e0b', fontWeight: 700, fontSize: '0.73rem' }}
          >
            Near limit
          </Typography>
        )}
      </Box>

      {hasAnyLimit && primaryLimitRatio > 0 && (
        <LinearProgress
          variant="determinate"
          value={Math.min(100, Math.round(primaryLimitRatio * 100))}
          sx={{
            height: 4,
            borderRadius: 2,
            bgcolor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)',
            '& .MuiLinearProgress-bar': {
              borderRadius: 2,
              bgcolor: statusColor,
            },
          }}
        />
      )}
    </Box>
  );
}

function HsnSearchDialog({
  open,
  onClose,
  sellingPrice,
  currentHsnCode,
  onSelectHsn,
  isDark,
  accent,
}) {
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const handleClose = () => {
    setQuery('');
    setCategoryFilter('');
    onClose();
  };

  const handlePick = (entry, gstInfo) => {
    setQuery('');
    setCategoryFilter('');
    onSelectHsn(entry, gstInfo);
  };

  const numericPrice = Number(sellingPrice) > 0 ? Number(sellingPrice) : 0;

  const matches = useMemo(() => {
    return searchHsnCatalog(query, categoryFilter || 'all', numericPrice) || [];
  }, [query, categoryFilter, numericPrice]);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: isDark ? '#0e1628' : '#ffffff',
          },
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1.5,
          pb: 1.5,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
          <Receipt size={20} color={accent} />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1.2 }}>
              Search &amp; Pick Different HSN Code
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Filter by product keyword, 4–8 digit HSN code, or category
            </Typography>
          </Box>
        </Box>
        <IconButton size="small" onClick={handleClose} aria-label="Close HSN search">
          <X size={18} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 2.5 }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1.6fr 1fr' },
            gap: 1.5,
            mb: 2,
            mt: 0.5,
          }}
        >
          <TextField
            autoFocus
            size="small"
            fullWidth
            label="Search HSN code or product keyword"
            placeholder="e.g. kurti, 6204, earbuds, bottle, cosmetics..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={16} />
                  </InputAdornment>
                ),
              },
            }}
          />

          <TextField
            select
            size="small"
            fullWidth
            label="Filter by Category"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <MenuItem value="">All Categories</MenuItem>
            {PRODUCT_CATEGORIES.map((cat) => (
              <MenuItem key={cat.id} value={cat.id}>
                {cat.name}
              </MenuItem>
            ))}
          </TextField>
        </Box>

        {matches.length === 0 ? (
          <Alert severity="info" sx={{ borderRadius: 2 }}>
            No HSN entries matched &ldquo;{query}&rdquo;. Try a broader keyword (e.g. shirt, plastic,
            electronics) or switch category to All Categories.
          </Alert>
        ) : (
          <Stack spacing={1.25} sx={{ maxHeight: 400, overflowY: 'auto', pr: 0.5 }}>
            {matches.map((entry) => {
              const gstInfo = resolveEffectiveGst(entry, numericPrice);
              const isSelected = currentHsnCode && entry.hsnCode === currentHsnCode;
              return (
                <Paper
                  key={entry.id || entry.hsnCode}
                  elevation={0}
                  sx={{
                    p: 1.75,
                    borderRadius: 2.5,
                    border: '1px solid',
                    borderColor: isSelected ? accent : 'divider',
                    bgcolor: isSelected
                      ? `${accent}12`
                      : isDark
                        ? 'rgba(255,255,255,0.02)'
                        : 'rgba(15,23,42,0.02)',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 1.5,
                  }}
                >
                  <Box sx={{ flex: '1 1 320px', minWidth: 0 }}>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Chip
                        label={`HSN ${entry.hsnCode}`}
                        size="small"
                        sx={{
                          fontWeight: 800,
                          bgcolor: `${accent}20`,
                          color: accent,
                        }}
                      />
                      <Chip
                        label={`GST ${gstInfo.gstRate}% (${gstInfo.cgstRate}% CGST + ${gstInfo.sgstRate}% SGST)`}
                        size="small"
                        sx={{
                          fontWeight: 700,
                          bgcolor: isDark ? 'rgba(0,214,143,0.14)' : 'rgba(0,168,107,0.1)',
                          color: isDark ? '#00d68f' : '#00a86b',
                        }}
                      />
                    </Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                      {entry.title}
                    </Typography>
                    {entry.description && (
                      <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mt: 0.25 }}>
                        {entry.description}
                      </Typography>
                    )}
                    {gstInfo.appliedThresholdNote && (
                      <Typography
                        variant="caption"
                        sx={{ display: 'block', color: '#f59e0b', fontWeight: 600, mt: 0.35 }}
                      >
                        {gstInfo.appliedThresholdNote}
                      </Typography>
                    )}
                  </Box>

                  <Button
                    type="button"
                    size="small"
                    variant={isSelected ? 'contained' : 'outlined'}
                    onClick={() => handlePick(entry, gstInfo)}
                    sx={{
                      textTransform: 'none',
                      fontWeight: 700,
                      borderRadius: 2,
                      flexShrink: 0,
                      borderColor: accent,
                      color: isSelected ? '#081420' : accent,
                      bgcolor: isSelected ? accent : 'transparent',
                      '&:hover': {
                        bgcolor: isSelected ? accent : `${accent}16`,
                      },
                    }}
                  >
                    {isSelected ? 'Selected' : 'Use This HSN'}
                  </Button>
                </Paper>
              );
            })}
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid', borderColor: 'divider' }}>
        <Typography variant="caption" sx={{ color: 'text.secondary', mr: 'auto' }}>
          Showing {matches.length} matching {matches.length === 1 ? 'entry' : 'entries'}
        </Typography>
        <Button onClick={handleClose} sx={{ textTransform: 'none', fontWeight: 700 }}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function ProductDescriptionPage() {
  const { theme } = useContext(AppContext);
  const isDark = theme === 'dark';
  const accent = isDark ? '#00c9ff' : '#0284c7';
  const emerald = isDark ? '#00d68f' : '#00a86b';
  const cardBg = isDark ? 'rgba(255, 255, 255, 0.03)' : 'background.paper';

  const [settings, setSettings] = useToolSettings('product_description_gen', DEFAULT_TOOL_SETTINGS);

  const rawSelectedPlatforms = settings?.selectedPlatforms;

  const selectedPlatforms = useMemo(() => {
    const validIds = new Set(ALL_PLATFORM_IDS);
    const saved = Array.isArray(rawSelectedPlatforms)
      ? rawSelectedPlatforms.filter((id) => validIds.has(id))
      : [];
    return saved;
  }, [rawSelectedPlatforms]);

  const [form, setForm] = useState(() => createFormState(settings));
  const [formError, setFormError] = useState('');

  // Quick-Import URL bar state
  const [importOpen, setImportOpen] = useState(true);
  const [importUrl, setImportUrl] = useState('');
  const [importLoading, setImportLoading] = useState(false);
  const [importNotice, setImportNotice] = useState({ type: '', message: '' });

  // Generated output & interactive edits state
  const [generatedResult, setGeneratedResult] = useState(null);
  const [draftsByPlatform, setDraftsByPlatform] = useState({});
  const [activePlatformId, setActivePlatformId] = useState('');
  const [descriptionViewMode, setDescriptionViewMode] = useState('plain'); // 'plain' | 'html'
  const [hsnModalOpen, setHsnModalOpen] = useState(false);

  // Copy button feedback state
  const [activeCopyKey, setActiveCopyKey] = useState('');
  const copyTimerRef = useRef(null);
  const isMountedRef = useRef(true);
  const formSectionRef = useRef(null);
  const outputSectionRef = useRef(null);
  const productNameInputRef = useRef(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  const updateFormField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (field === 'productName' && formError) {
      setFormError('');
    }
    if (field === 'tone' || field === 'brandName' || field === 'categoryId') {
      setSettings((prev) => ({ ...prev, [field]: value }));
    }
  };

  const setSelectedPlatforms = (updater) => {
    setSettings((prev) => {
      const current = Array.isArray(prev?.selectedPlatforms) ? prev.selectedPlatforms : ALL_PLATFORM_IDS;
      const next = typeof updater === 'function' ? updater(current) : updater;
      return { ...prev, selectedPlatforms: next };
    });
    if (formError) setFormError('');
  };

  const togglePlatform = (platformId) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platformId) ? prev.filter((id) => id !== platformId) : [...prev, platformId]
    );
  };

  const marketplaceIds = useMemo(
    () => (LISTING_PLATFORMS || []).filter((p) => !isSocialPlatform(p)).map((p) => p.id),
    []
  );
  const socialIds = useMemo(
    () => (LISTING_PLATFORMS || []).filter((p) => isSocialPlatform(p)).map((p) => p.id),
    []
  );

  const handleApplySample = (sample) => {
    const data = sample?.data || sample || {};
    const nextCategory = data.categoryId || DEFAULT_CATEGORY_ID;
    const nextTone = data.tone || DEFAULT_TONE_ID;
    const nextBrand = data.brandName ?? data.brand ?? '';
    const nextCare =
      data.careInstructions ??
      [data.careOrUsage, data.warranty].filter(Boolean).join(' • ');

    setForm({
      productName: data.productName || '',
      brandName: nextBrand,
      categoryId: nextCategory,
      sellingPrice:
        data.sellingPrice !== undefined && data.sellingPrice !== null
          ? String(data.sellingPrice)
          : '',
      mrp: data.mrp !== undefined && data.mrp !== null ? String(data.mrp) : '',
      material: data.material || '',
      color: data.color || '',
      sizeOrCapacity: data.sizeOrCapacity || '',
      packQty: data.packQty ?? data.packageContents ?? '',
      keyFeatures: normalizeFeaturesText(data.keyFeatures),
      targetAudience: data.targetAudience || '',
      tone: nextTone,
      careInstructions: nextCare,
      extraKeywords: Array.isArray(data.extraKeywords)
        ? data.extraKeywords.join(', ')
        : String(data.extraKeywords || ''),
    });

    setSettings((prev) => ({
      ...prev,
      brandName: nextBrand,
      categoryId: nextCategory,
      tone: nextTone,
    }));

    setFormError('');
    setImportNotice({ type: '', message: '' });
  };

  const handleClearForm = () => {
    setForm({
      ...createFormState(settings),
      brandName: '',
      productName: '',
    });
    setSettings((prev) => ({ ...prev, brandName: '' }));
    setFormError('');
    setImportUrl('');
    setImportNotice({ type: '', message: '' });
    setGeneratedResult(null);
    setDraftsByPlatform({});
    setActivePlatformId('');
  };

  const handleImportFromUrl = async () => {
    const normalized = normalizeUrlInput(importUrl);
    if (!normalized || !/^https?:\/\//i.test(normalized)) {
      setImportNotice({
        type: 'warning',
        message: 'Please paste a valid product link (e.g. https://www.amazon.in/dp/... or Flipkart/Meesho/Myntra URL).',
      });
      return;
    }

    setImportLoading(true);
    setImportNotice({ type: '', message: '' });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7500);

    try {
      const token = localStorage.getItem('gst_token') || localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/product-image/extract`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ url: normalized }),
      });

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error('UNAVAILABLE');
      }

      const json = await res.json();
      if (!isMountedRef.current) return;

      if (res.ok && json?.success && json?.data) {
        const data = json.data;
        const importedTitle = String(data.title || '').trim();
        const importedBrand = String(data.brand || '').trim();
        const guessedCategory = guessCategoryFromImported({
          title: importedTitle,
          category: data.category,
          url: normalized,
        });

        setForm((prev) => ({
          ...prev,
          productName: importedTitle || prev.productName,
          brandName: importedBrand || prev.brandName,
          categoryId: guessedCategory || prev.categoryId,
          sellingPrice:
            Number(data.sellingPrice || data.price) > 0
              ? String(data.sellingPrice || data.price)
              : prev.sellingPrice,
          mrp: Number(data.mrp) > 0 ? String(data.mrp) : prev.mrp,
        }));

        setSettings((prev) => ({
          ...prev,
          ...(importedBrand ? { brandName: importedBrand } : {}),
          ...(guessedCategory ? { categoryId: guessedCategory } : {}),
        }));

        setFormError('');
        setImportNotice({
          type: 'success',
          message: importedTitle
            ? `Imported "${importedTitle}"! Review or add key features below, then click Generate.`
            : 'Link connected, though no product title was found. Please enter your product name below.',
        });
      } else {
        setImportNotice({
          type: 'info',
          message:
            json?.error ||
            'Quick-import could not fetch details from that link (marketplace blocked or offline). You can enter your product details manually below.',
        });
      }
    } catch {
      if (!isMountedRef.current) return;
      setImportNotice({
        type: 'info',
        message:
          'Quick-import is offline or that marketplace blocked auto-fetch. No problem — fill in your product details below to generate listings instantly.',
      });
    } finally {
      clearTimeout(timeoutId);
      if (isMountedRef.current) {
        setImportLoading(false);
      }
    }
  };

  const buildProductInputPayload = () => {
    const rawFeat = form.keyFeatures.trim();
    const normalizedFeatures =
      rawFeat && !rawFeat.includes('\n') && !rawFeat.includes(';') && rawFeat.includes(',')
        ? rawFeat
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
            .join('\n')
        : rawFeat;

    return {
      ...form,
      productName: form.productName.trim(),
      brand: form.brandName.trim(),
      brandName: form.brandName.trim(),
      sellingPrice: Number(form.sellingPrice) > 0 ? Number(form.sellingPrice) : 0,
      mrp: Number(form.mrp) > 0 ? Number(form.mrp) : 0,
      material: form.material.trim(),
      color: form.color.trim(),
      sizeOrCapacity: form.sizeOrCapacity.trim(),
      packQty: form.packQty.trim(),
      packageContents: form.packQty.trim(),
      keyFeatures: normalizedFeatures,
      targetAudience: form.targetAudience.trim(),
      careOrUsage: form.careInstructions.trim(),
      careInstructions: form.careInstructions.trim(),
      extraKeywords: form.extraKeywords.trim(),
    };
  };

  const handleGenerate = (e) => {
    if (e) e.preventDefault();
    if (!form.productName.trim()) {
      setFormError('Please enter a Product Name (or click a Sample Product chip) before generating.');
      productNameInputRef.current?.focus();
      return;
    }
    if (selectedPlatforms.length === 0) {
      setFormError('Please choose at least one Marketplace or Social Media platform to generate.');
      return;
    }

    setFormError('');

    try {
      const payload = buildProductInputPayload();
      const result = generateMultiPlatformListings(payload, selectedPlatforms);
      const resultListings = Array.isArray(result?.listings)
        ? result.listings
        : Object.values(result?.listingsByPlatform || result?.listingsById || {});

      const nextDrafts = {};
      const keys = [];
      for (const item of resultListings) {
        if (item?.platformId) {
          keys.push(item.platformId);
          nextDrafts[item.platformId] = listingToDraft(item);
        }
      }

      setGeneratedResult(result);
      setDraftsByPlatform(nextDrafts);
      setActivePlatformId((prev) => (prev && keys.includes(prev) ? prev : keys[0] || ''));
      setDescriptionViewMode('plain');

      requestAnimationFrame(() => {
        outputSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    } catch (err) {
      setFormError(toFriendlyErrorMessage(err, 'Could not generate listings. Please check your inputs and try again.'));
    }
  };

  const handleCopy = async (key, text) => {
    try {
      await copyTextSafe(text);
      if (!isMountedRef.current) return;
      setActiveCopyKey(key);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => {
        if (isMountedRef.current) setActiveCopyKey('');
      }, 1800);
    } catch {
      // Ignore clipboard failures
    }
  };

  const handleSelectHsnOverride = (entry, preResolvedGst) => {
    if (!generatedResult || !entry) return;
    const priceNum = Number(form.sellingPrice) > 0 ? Number(form.sellingPrice) : 0;
    const mrpNum = Number(form.mrp) > 0 ? Number(form.mrp) : 0;
    const gstInfo = preResolvedGst || resolveEffectiveGst(entry, priceNum);

    const updatedPrimaryHsn = {
      ...entry,
      ...gstInfo,
    };

    const updatedTaxBreakdown = computeTaxBreakdown(priceNum, gstInfo.gstRate, mrpNum);

    setGeneratedResult((prev) =>
      prev
        ? {
            ...prev,
            primaryHsn: updatedPrimaryHsn,
            taxBreakdown: updatedTaxBreakdown,
          }
        : prev
    );
    setHsnModalOpen(false);
  };

  const updateDraftField = (platformId, field, value) => {
    setDraftsByPlatform((prev) => ({
      ...prev,
      [platformId]: {
        ...(prev[platformId] || {}),
        [field]: value,
      },
    }));
  };

  const buildExportResultSnapshot = () => {
    if (!generatedResult) return null;
    const baseListings = Array.isArray(generatedResult.listings)
      ? generatedResult.listings
      : Object.values(generatedResult.listingsByPlatform || generatedResult.listingsById || {});
    const updatedListings = baseListings.map((origListing) =>
      draftToExportListing(origListing, draftsByPlatform[origListing.platformId])
    );
    const updatedMap = Object.fromEntries(
      updatedListings.map((item) => [item.platformId, item])
    );
    return {
      ...generatedResult,
      listings: updatedListings,
      listingsById: updatedMap,
      listingsByPlatform: updatedMap,
    };
  };

  const handleExportTxt = () => {
    const snapshot = buildExportResultSnapshot();
    if (!snapshot) return;
    const content = exportAllListingsAsText(snapshot, buildProductInputPayload());
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    downloadBlob(blob, `${buildDownloadStem(form.productName)}_listings.txt`);
  };

  const handleExportCsv = () => {
    const snapshot = buildExportResultSnapshot();
    if (!snapshot) return;
    const rawCsv = exportAllListingsAsCsv(snapshot, buildProductInputPayload()) || '';
    const csvWithBom = rawCsv.startsWith('\uFEFF') ? rawCsv : `\uFEFF${rawCsv}`;
    const blob = new Blob([csvWithBom], { type: 'text/csv;charset=utf-8' });
    downloadBlob(blob, `${buildDownloadStem(form.productName)}_listings.csv`);
  };

  const handleExportJson = () => {
    const snapshot = buildExportResultSnapshot();
    if (!snapshot) return;
    const content = exportAllListingsAsJson(snapshot, buildProductInputPayload());
    const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
    downloadBlob(blob, `${buildDownloadStem(form.productName)}_listings.json`);
  };

  const handleEditInput = () => {
    formSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => productNameInputRef.current?.focus(), 300);
  };

  const handleStartOver = () => {
    handleClearForm();
    formSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const discountPercent = useMemo(() => {
    const sp = Number(form.sellingPrice);
    const mrpVal = Number(form.mrp);
    if (Number.isFinite(sp) && Number.isFinite(mrpVal) && sp > 0 && mrpVal > sp) {
      return Math.round(((mrpVal - sp) / mrpVal) * 100);
    }
    return 0;
  }, [form.sellingPrice, form.mrp]);

  const generatedPlatformsList = useMemo(() => {
    if (Array.isArray(generatedResult?.listings)) return generatedResult.listings;
    const map = generatedResult?.listingsByPlatform || generatedResult?.listingsById;
    return map ? Object.values(map) : [];
  }, [generatedResult]);

  const activeListing = useMemo(() => {
    const map = generatedResult?.listingsByPlatform || generatedResult?.listingsById;
    if (map && activePlatformId && map[activePlatformId]) {
      return map[activePlatformId];
    }
    return (
      generatedPlatformsList.find((item) => item?.platformId === activePlatformId) ||
      generatedPlatformsList[0] ||
      null
    );
  }, [generatedResult, activePlatformId, generatedPlatformsList]);

  const activeDraft = useMemo(() => {
    if (!activeListing) return null;
    return draftsByPlatform[activeListing.platformId] || listingToDraft(activeListing);
  }, [activeListing, draftsByPlatform]);

  const activeExportListing = useMemo(() => {
    if (!activeListing) return null;
    return draftToExportListing(activeListing, activeDraft);
  }, [activeListing, activeDraft]);

  const activeLimits = useMemo(() => {
    return extractPlatformLimits(activeListing?.limits);
  }, [activeListing]);

  const activePlatformAccent = activeListing?.accent || accent;

  const activeHtmlPreview = useMemo(() => {
    if (!activeListing || !activeDraft) return '';
    const changed = activeDraft.description !== (activeListing.description || '');
    const rawHtml = changed
      ? plainTextToSafeHtml(activeDraft.description)
      : activeListing.descriptionHtml || '';
    return sanitizePreviewHtml(rawHtml);
  }, [activeListing, activeDraft]);

  const keywordCount = useMemo(() => {
    const raw = String(activeDraft?.keywordsText || '').trim();
    if (!raw) return 0;
    if (raw.includes(',') || raw.includes('\n')) {
      return raw
        .split(/[,\n]+/)
        .map((k) => k.trim())
        .filter(Boolean).length;
    }
    return raw.split(/\s+/).filter(Boolean).length;
  }, [activeDraft?.keywordsText]);

  const bulletLineCount = useMemo(() => {
    return String(activeDraft?.bulletsText || '')
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean).length;
  }, [activeDraft?.bulletsText]);

  const allSelected =
    ALL_PLATFORM_IDS.length > 0 && selectedPlatforms.length === ALL_PLATFORM_IDS.length;
  const onlyMarketplacesSelected =
    marketplaceIds.length > 0 &&
    selectedPlatforms.length === marketplaceIds.length &&
    marketplaceIds.every((id) => selectedPlatforms.includes(id));
  const onlySocialSelected =
    socialIds.length > 0 &&
    selectedPlatforms.length === socialIds.length &&
    socialIds.every((id) => selectedPlatforms.includes(id));

  const primaryHsn = generatedResult?.primaryHsn || null;
  const taxBreakdown = generatedResult?.taxBreakdown || null;
  const hsnMatches = Array.isArray(generatedResult?.hsnMatches) ? generatedResult.hsnMatches : [];

  return (
    <ToolShell
      title="Rich Product Description & Listing Generator"
      seoTitle="Rich Product Description, Multi-Platform Listing & HSN/GST Generator | LyZov Tools"
      description="Create SEO-ready titles, bullet points, HTML descriptions, search keywords, and Indian HSN/GST rate estimates for 12 marketplaces and social channels in seconds."
      canonical="https://tools.lyzov.com/product-description"
      privacyLabel="100% Private · Runs locally in your browser (URL quick-import optional)"
      accentColor={accent}
      icon={Sparkles}
      maxWidth={1080}
    >
      {/* Optional Quick-Import from Product URL */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 1.75, sm: 2.25 },
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: cardBg,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.1, minWidth: 0 }}>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: 2,
                bgcolor: `${accent}18`,
                color: accent,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Link2 size={16} />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary' }}>
                Quick-Import from Product URL (Optional)
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                Paste an Amazon, Flipkart, Meesho, or Myntra link to pre-fill product name &amp; category
              </Typography>
            </Box>
          </Box>

          <Button
            type="button"
            size="small"
            onClick={() => setImportOpen((v) => !v)}
            endIcon={importOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            sx={{
              textTransform: 'none',
              fontWeight: 700,
              color: 'text.secondary',
              flexShrink: 0,
            }}
          >
            {importOpen ? 'Hide' : 'Expand'}
          </Button>
        </Box>

        <Collapse in={importOpen}>
          <Box sx={{ mt: 1.75 }}>
            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                gap: 1.25,
                alignItems: { xs: 'stretch', sm: 'center' },
              }}
            >
              <TextField
                size="small"
                fullWidth
                placeholder="https://www.amazon.in/dp/... or flipkart.com/.../p/..."
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleImportFromUrl();
                  }
                }}
                disabled={importLoading}
                aria-label="Product link for quick import"
              />
              <Button
                type="button"
                variant="outlined"
                onClick={handleImportFromUrl}
                disabled={importLoading}
                startIcon={
                  importLoading ? <CircularProgress size={15} color="inherit" /> : <Wand2 size={15} />
                }
                sx={{
                  textTransform: 'none',
                  fontWeight: 800,
                  borderRadius: 2,
                  px: 2.5,
                  py: 0.9,
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  borderColor: accent,
                  color: accent,
                  '&:hover': {
                    borderColor: accent,
                    bgcolor: `${accent}14`,
                  },
                }}
              >
                {importLoading ? 'Importing...' : 'Import Details'}
              </Button>
            </Box>

            {importNotice.message && (
              <Alert
                severity={importNotice.type || 'info'}
                onClose={() => setImportNotice({ type: '', message: '' })}
                sx={{ mt: 1.5, borderRadius: 2 }}
              >
                {importNotice.message}
              </Alert>
            )}
          </Box>
        </Collapse>
      </Paper>

      {/* Step 1 & 2: Guided Product Form & Platform Selection */}
      <Paper
        ref={formSectionRef}
        component="form"
        onSubmit={handleGenerate}
        elevation={0}
        sx={{
          p: { xs: 2, sm: 3 },
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: cardBg,
        }}
      >
        <Stack spacing={3}>
          {/* Sample Presets Header */}
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1.5,
            }}
          >
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, color: 'text.primary' }}>
                1. Tell Us About Your Product
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Fill in as many details as you know — or click a sample below to test in one click.
              </Typography>
            </Box>

            <Button
              type="button"
              size="small"
              variant="outlined"
              startIcon={<RotateCcw size={14} />}
              onClick={handleClearForm}
              sx={{
                textTransform: 'none',
                fontWeight: 700,
                borderRadius: 2,
                color: 'text.secondary',
                borderColor: 'divider',
                '&:hover': { borderColor: accent, color: accent },
              }}
            >
              Clear
            </Button>
          </Box>

          {/* Try a Sample Product Chips */}
          <Box>
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                fontWeight: 700,
                color: 'text.secondary',
                textTransform: 'uppercase',
                letterSpacing: 0.6,
                mb: 1,
              }}
            >
              Try a Sample Product
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {(SAMPLE_PRODUCTS || []).map((sample) => (
                <Chip
                  key={sample.id}
                  icon={<Sparkles size={13} />}
                  label={sample.label}
                  clickable
                  onClick={() => handleApplySample(sample)}
                  sx={{
                    fontWeight: 700,
                    bgcolor: isDark ? 'rgba(0,201,255,0.1)' : 'rgba(2,132,199,0.08)',
                    color: accent,
                    border: '1px solid',
                    borderColor: isDark ? 'rgba(0,201,255,0.25)' : 'rgba(2,132,199,0.25)',
                    '& .MuiChip-icon': { color: accent },
                    '&:hover': {
                      bgcolor: `${accent}24`,
                    },
                  }}
                />
              ))}
            </Box>
          </Box>

          <Divider />

          {/* Main Product Details Grid */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1.4fr 1fr 1fr' },
              gap: 2,
            }}
          >
            <TextField
              inputRef={productNameInputRef}
              required
              fullWidth
              label="Product Name"
              placeholder="e.g. Women Cotton Printed Straight Kurti with Dupatta"
              value={form.productName}
              onChange={(e) => updateFormField('productName', e.target.value)}
              error={Boolean(formError && !form.productName.trim())}
            />

            <TextField
              fullWidth
              label="Brand Name"
              placeholder="e.g. LyZov Ethnic (saved automatically)"
              value={form.brandName}
              onChange={(e) => updateFormField('brandName', e.target.value)}
            />

            <TextField
              select
              fullWidth
              label="Category"
              value={form.categoryId}
              onChange={(e) => updateFormField('categoryId', e.target.value)}
            >
              {(PRODUCT_CATEGORIES || []).map((cat) => (
                <MenuItem key={cat.id} value={cat.id}>
                  {cat.name}
                </MenuItem>
              ))}
            </TextField>
          </Box>

          {/* Pricing & Specs Grid */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' },
              gap: 2,
            }}
          >
            <TextField
              fullWidth
              type="number"
              label="Selling Price (₹)"
              placeholder="e.g. 799"
              value={form.sellingPrice}
              onChange={(e) => updateFormField('sellingPrice', e.target.value)}
              slotProps={{
                htmlInput: { min: 0, step: 'any' },
                input: {
                  startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                },
              }}
              helperText="Used for GST & HSN slab calculation"
            />

            <TextField
              fullWidth
              type="number"
              label="MRP (₹)"
              placeholder="e.g. 1499"
              value={form.mrp}
              onChange={(e) => updateFormField('mrp', e.target.value)}
              slotProps={{
                htmlInput: { min: 0, step: 'any' },
                input: {
                  startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                  endAdornment:
                    discountPercent > 0 ? (
                      <InputAdornment position="end">
                        <Chip
                          label={`${discountPercent}% OFF`}
                          size="small"
                          sx={{
                            height: 22,
                            fontSize: '0.7rem',
                            fontWeight: 800,
                            bgcolor: isDark ? 'rgba(0,214,143,0.18)' : 'rgba(0,168,107,0.12)',
                            color: emerald,
                          }}
                        />
                      </InputAdornment>
                    ) : null,
                },
              }}
              helperText="Optional original print price"
            />

            <TextField
              fullWidth
              label="Pack Size / Net Qty"
              placeholder="e.g. Pack of 1, 500 ml, Set of 3"
              value={form.packQty}
              onChange={(e) => updateFormField('packQty', e.target.value)}
            />

            <TextField
              fullWidth
              label="Size / Capacity"
              placeholder="e.g. S to XXL, 1 Litre, 42 mm"
              value={form.sizeOrCapacity}
              onChange={(e) => updateFormField('sizeOrCapacity', e.target.value)}
            />
          </Box>

          {/* Material, Color, Audience */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' },
              gap: 2,
            }}
          >
            <TextField
              fullWidth
              label="Material / Specs"
              placeholder="e.g. 100% Pure Combed Cotton, Bluetooth 5.3"
              value={form.material}
              onChange={(e) => updateFormField('material', e.target.value)}
            />

            <TextField
              fullWidth
              label="Color / Variant"
              placeholder="e.g. Teal Blue, Matte Black"
              value={form.color}
              onChange={(e) => updateFormField('color', e.target.value)}
            />

            <TextField
              fullWidth
              label="Target Audience"
              placeholder="e.g. Women, Office Wear, Festive Gifting"
              value={form.targetAudience}
              onChange={(e) => updateFormField('targetAudience', e.target.value)}
            />
          </Box>

          {/* Key Features & Care / Box Contents */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1.5fr 1fr' },
              gap: 2,
            }}
          >
            <TextField
              fullWidth
              multiline
              minRows={3}
              maxRows={6}
              label="Key Features & Benefits"
              placeholder={
                'Enter one feature per line or separate with commas:\nBreathable skin-friendly fabric\nColorfast print that lasts multiple washes\nSide pocket for phone & keys'
              }
              value={form.keyFeatures}
              onChange={(e) => updateFormField('keyFeatures', e.target.value)}
              helperText="One feature per line or comma-separated — turns into high-converting bullets"
            />

            <TextField
              fullWidth
              multiline
              minRows={3}
              maxRows={6}
              label="Care Instructions / Box Contents"
              placeholder="e.g. Gentle machine wash cold. Package includes 1 Kurti, 1 Palazzo & 1 Dupatta. 6 months warranty."
              value={form.careInstructions}
              onChange={(e) => updateFormField('careInstructions', e.target.value)}
            />
          </Box>

          <TextField
            fullWidth
            size="small"
            label="Extra Search Keywords (Optional)"
            placeholder="e.g. festive kurta set, ethnic wear for women, summer cotton kurti"
            value={form.extraKeywords}
            onChange={(e) => updateFormField('extraKeywords', e.target.value)}
            helperText="Comma-separated seed keywords to weave into backend search terms and hashtags"
          />

          <Divider />

          {/* Tone Selector */}
          <Box>
            <Typography
              variant="subtitle1"
              sx={{ fontWeight: 800, color: 'text.primary', mb: 0.35 }}
            >
              2. Writing Tone &amp; Style
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1.5 }}>
              Pick the voice that fits your brand — saved automatically for next time.
            </Typography>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.25 }}>
              {(LISTING_TONES || []).map((toneOpt) => {
                const selected = form.tone === toneOpt.id;
                return (
                  <Button
                    key={toneOpt.id}
                    type="button"
                    variant={selected ? 'contained' : 'outlined'}
                    onClick={() => updateFormField('tone', toneOpt.id)}
                    sx={{
                      flex: '1 1 175px',
                      py: 1.15,
                      px: 1.75,
                      borderRadius: 2.5,
                      textTransform: 'none',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      textAlign: 'left',
                      borderColor: selected ? 'transparent' : 'divider',
                      color: selected ? '#081420' : 'text.primary',
                      bgcolor: selected ? accent : 'transparent',
                      boxShadow: selected ? `0 6px 18px ${accent}38` : 'none',
                      '&:hover': {
                        borderColor: accent,
                        bgcolor: selected ? accent : `${accent}12`,
                      },
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 800, color: 'inherit', lineHeight: 1.25 }}
                    >
                      {toneOpt.label}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        color: selected ? 'rgba(8, 20, 32, 0.8)' : 'text.secondary',
                        fontWeight: 600,
                        mt: 0.25,
                        lineHeight: 1.25,
                      }}
                    >
                      {toneOpt.hint || toneOpt.description}
                    </Typography>
                  </Button>
                );
              })}
            </Box>
          </Box>

          <Divider />

          {/* Platform Selector Chips */}
          <Box>
            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 1.25,
                mb: 1.25,
              }}
            >
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary' }}>
                  3. Select Platforms ({selectedPlatforms.length} of {ALL_PLATFORM_IDS.length} selected)
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Generate tailored copy, character limits, and tags for every channel you sell on.
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.85 }}>
                <Chip
                  label="All Platforms"
                  size="small"
                  clickable
                  onClick={() => setSelectedPlatforms(ALL_PLATFORM_IDS)}
                  sx={{
                    fontWeight: 700,
                    bgcolor: allSelected ? accent : 'transparent',
                    color: allSelected ? '#081420' : 'text.primary',
                    border: '1px solid',
                    borderColor: allSelected ? accent : 'divider',
                  }}
                />
                <Chip
                  label="Marketplaces Only"
                  size="small"
                  clickable
                  onClick={() => setSelectedPlatforms(marketplaceIds)}
                  sx={{
                    fontWeight: 700,
                    bgcolor: onlyMarketplacesSelected ? accent : 'transparent',
                    color: onlyMarketplacesSelected ? '#081420' : 'text.primary',
                    border: '1px solid',
                    borderColor: onlyMarketplacesSelected ? accent : 'divider',
                  }}
                />
                <Chip
                  label="Social Media Only"
                  size="small"
                  clickable
                  onClick={() => setSelectedPlatforms(socialIds)}
                  sx={{
                    fontWeight: 700,
                    bgcolor: onlySocialSelected ? accent : 'transparent',
                    color: onlySocialSelected ? '#081420' : 'text.primary',
                    border: '1px solid',
                    borderColor: onlySocialSelected ? accent : 'divider',
                  }}
                />
              </Box>
            </Box>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {(LISTING_PLATFORMS || []).map((plat) => {
                const selected = selectedPlatforms.includes(plat.id);
                const chipColor = plat.accent || accent;
                return (
                  <Chip
                    key={plat.id}
                    icon={selected ? <Check size={14} /> : undefined}
                    label={plat.name}
                    clickable
                    onClick={() => togglePlatform(plat.id)}
                    sx={{
                      fontWeight: selected ? 800 : 600,
                      borderRadius: 2,
                      px: 0.5,
                      border: '1px solid',
                      borderColor: selected ? chipColor : 'divider',
                      bgcolor: selected
                        ? `${chipColor}22`
                        : isDark
                          ? 'rgba(255,255,255,0.03)'
                          : 'rgba(15,23,42,0.02)',
                      color: selected ? 'text.primary' : 'text.secondary',
                      '& .MuiChip-icon': { color: chipColor },
                      '&:hover': {
                        borderColor: chipColor,
                        bgcolor: `${chipColor}18`,
                      },
                    }}
                  />
                );
              })}
            </Box>
          </Box>

          {formError && (
            <Alert
              severity="error"
              icon={<AlertCircle size={18} />}
              onClose={() => setFormError('')}
              sx={{ borderRadius: 2.5 }}
            >
              {formError}
            </Alert>
          )}

          {/* Prominent Primary CTA */}
          <Box sx={{ display: 'flex', justifyContent: 'center', pt: 0.5 }}>
            <Button
              type="submit"
              variant="contained"
              size="large"
              startIcon={<Sparkles size={19} />}
              sx={{
                py: 1.45,
                px: { xs: 3, sm: 4.5 },
                fontWeight: 800,
                fontSize: { xs: '0.94rem', sm: '1.02rem' },
                textTransform: 'none',
                borderRadius: 2.5,
                color: '#081420',
                background: 'linear-gradient(135deg, #00c9ff 0%, #00d68f 100%)',
                boxShadow: '0 10px 26px rgba(0, 201, 255, 0.28)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #00b8eb 0%, #00c280 100%)',
                  boxShadow: '0 12px 30px rgba(0, 201, 255, 0.36)',
                },
              }}
            >
              Generate Descriptions, Keywords &amp; HSN
            </Button>
          </Box>
        </Stack>
      </Paper>

      {/* Step 4 & 5: Generated Output Section */}
      {generatedResult && (
        <Stack ref={outputSectionRef} spacing={3}>
          {/* Bulk Action Bar */}
          <Paper
            elevation={0}
            sx={{
              p: { xs: 2, sm: 2.5 },
              borderRadius: 3,
              border: '1px solid',
              borderColor: isDark ? 'rgba(0, 214, 143, 0.32)' : 'rgba(0, 168, 107, 0.28)',
              bgcolor: isDark ? 'rgba(0, 214, 143, 0.06)' : 'rgba(0, 168, 107, 0.05)',
            }}
          >
            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 2,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                  sx={{
                    p: 1.1,
                    borderRadius: 2,
                    bgcolor: 'rgba(0, 214, 143, 0.16)',
                    color: emerald,
                    display: 'flex',
                  }}
                >
                  <CheckCircle2 size={22} />
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1.2 }}>
                    Listings Ready for {generatedPlatformsList.length}{' '}
                    {generatedPlatformsList.length === 1 ? 'Platform' : 'Platforms'}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Edit any field live below, copy individual sections, or export all channels at once.
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                <Button
                  type="button"
                  variant="contained"
                  size="small"
                  startIcon={<FileText size={15} />}
                  onClick={handleExportTxt}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 800,
                    borderRadius: 2,
                    px: 1.8,
                    py: 0.85,
                    color: '#081420',
                    background: 'linear-gradient(135deg, #00c9ff 0%, #00d68f 100%)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #00b8eb 0%, #00c280 100%)',
                    },
                  }}
                >
                  Download All (.TXT)
                </Button>

                <Button
                  type="button"
                  variant="outlined"
                  size="small"
                  startIcon={<FileSpreadsheet size={15} />}
                  onClick={handleExportCsv}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 700,
                    borderRadius: 2,
                    px: 1.7,
                    py: 0.85,
                    borderColor: accent,
                    color: accent,
                    '&:hover': { borderColor: accent, bgcolor: `${accent}14` },
                  }}
                >
                  Download Spreadsheet (.CSV)
                </Button>

                <Button
                  type="button"
                  variant="outlined"
                  size="small"
                  startIcon={<FileJson size={15} />}
                  onClick={handleExportJson}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 700,
                    borderRadius: 2,
                    px: 1.7,
                    py: 0.85,
                    borderColor: 'divider',
                    color: 'text.primary',
                    '&:hover': { borderColor: accent, color: accent },
                  }}
                >
                  Download (.JSON)
                </Button>

                <Button
                  type="button"
                  variant="outlined"
                  size="small"
                  startIcon={<ArrowUp size={15} />}
                  onClick={handleEditInput}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 700,
                    borderRadius: 2,
                    px: 1.6,
                    py: 0.85,
                    borderColor: 'divider',
                    color: 'text.secondary',
                    '&:hover': { borderColor: accent, color: accent },
                  }}
                >
                  Edit Input
                </Button>

                <Button
                  type="button"
                  variant="text"
                  size="small"
                  startIcon={<RotateCcw size={14} />}
                  onClick={handleStartOver}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 700,
                    borderRadius: 2,
                    px: 1.4,
                    py: 0.85,
                    color: 'text.secondary',
                  }}
                >
                  Start Over
                </Button>
              </Box>
            </Box>
          </Paper>

          {/* HSN Code & GST Rate Card */}
          <Paper
            elevation={0}
            sx={{
              p: { xs: 2, sm: 3 },
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: cardBg,
            }}
          >
            <Stack spacing={2}>
              <Box
                sx={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 1.5,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                  <Box
                    sx={{
                      width: 38,
                      height: 38,
                      borderRadius: 2,
                      bgcolor: `${emerald}1c`,
                      color: emerald,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Receipt size={20} />
                  </Box>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1.2 }}>
                      Recommended HSN Code &amp; GST Slab
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      Matched automatically from your product name, keywords, category, and price
                    </Typography>
                  </Box>
                </Box>

                <Button
                  type="button"
                  size="small"
                  variant="outlined"
                  startIcon={<Search size={15} />}
                  onClick={() => setHsnModalOpen(true)}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 700,
                    borderRadius: 2,
                    borderColor: accent,
                    color: accent,
                    '&:hover': { borderColor: accent, bgcolor: `${accent}14` },
                  }}
                >
                  Search &amp; Pick Different HSN Code
                </Button>
              </Box>

              {primaryHsn ? (
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', md: '1.2fr 1fr' },
                    gap: 2,
                  }}
                >
                  {/* Primary HSN Details */}
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: 2.5,
                      border: '1px solid',
                      borderColor: 'divider',
                      bgcolor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(15,23,42,0.02)',
                    }}
                  >
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Chip
                        label={`HSN: ${primaryHsn.hsnCode}`}
                        sx={{
                          fontWeight: 900,
                          fontSize: '0.88rem',
                          bgcolor: `${accent}22`,
                          color: accent,
                        }}
                      />
                      <Chip
                        label={`Total GST: ${primaryHsn.gstRate}%`}
                        sx={{
                          fontWeight: 800,
                          fontSize: '0.85rem',
                          bgcolor: `${emerald}20`,
                          color: emerald,
                        }}
                      />
                      <FieldCopyButton
                        copyKey="hsn-code"
                        activeCopyKey={activeCopyKey}
                        onCopy={handleCopy}
                        text={primaryHsn.hsnCode}
                        label="Copy HSN"
                        accent={accent}
                      />
                    </Box>

                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary' }}>
                      {primaryHsn.title}
                    </Typography>
                    {primaryHsn.description && (
                      <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.4 }}>
                        {primaryHsn.description}
                      </Typography>
                    )}

                    <Box
                      sx={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 1.5,
                        mt: 1.5,
                        pt: 1.5,
                        borderTop: '1px dashed',
                        borderColor: 'divider',
                      }}
                    >
                      <Box>
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                          Intra-State (Same State)
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 800, color: 'text.primary' }}>
                          CGST {primaryHsn.cgstRate}% + SGST {primaryHsn.sgstRate}%
                        </Typography>
                      </Box>
                      <Divider orientation="vertical" flexItem />
                      <Box>
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                          Inter-State (Other State)
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 800, color: 'text.primary' }}>
                          IGST {primaryHsn.igstRate}%
                        </Typography>
                      </Box>
                    </Box>

                    {primaryHsn.appliedThresholdNote && (
                      <Alert severity="info" icon={<Info size={16} />} sx={{ mt: 1.5, borderRadius: 2 }}>
                        {primaryHsn.appliedThresholdNote}
                      </Alert>
                    )}
                  </Box>

                  {/* Tax Calculation Box */}
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: 2.5,
                      border: '1px solid',
                      borderColor: 'divider',
                      bgcolor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(15,23,42,0.02)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                    }}
                  >
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary', mb: 1 }}>
                      GST Invoice Breakdown (Per Unit)
                    </Typography>

                    {taxBreakdown ? (
                      <Stack spacing={0.85}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                            Selling Price (GST Inclusive)
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 800, color: 'text.primary' }}>
                            {formatInr(taxBreakdown.sellingPrice)}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                            Taxable Base Value
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                            {formatInr(taxBreakdown.baseTaxableValue)}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                            Total GST ({taxBreakdown.gstRate}%)
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 800, color: emerald }}>
                            {formatInr(taxBreakdown.gstAmount)}
                          </Typography>
                        </Box>
                        <Divider sx={{ my: 0.4 }} />
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            Intra-State Split (CGST + SGST)
                          </Typography>
                          <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.primary' }}>
                            {formatInr(taxBreakdown.cgstAmount)} + {formatInr(taxBreakdown.sgstAmount)}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            Inter-State (IGST)
                          </Typography>
                          <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.primary' }}>
                            {formatInr(taxBreakdown.igstAmount)}
                          </Typography>
                        </Box>
                      </Stack>
                    ) : (
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        Enter a <strong>Selling Price (₹)</strong> above and click Generate to see exact
                        Taxable Value, CGST, SGST, and IGST amounts.
                      </Typography>
                    )}
                  </Box>
                </Box>
              ) : (
                <Alert severity="info" sx={{ borderRadius: 2 }}>
                  No exact automatic HSN match found. Click{' '}
                  <strong>&ldquo;Search &amp; Pick Different HSN Code&rdquo;</strong> to choose manually.
                </Alert>
              )}

              {/* Alternative HSN Match Chips */}
              {(hsnMatches.length > 1 ||
                (hsnMatches.length === 1 && primaryHsn?.hsnCode !== hsnMatches[0]?.hsnCode)) && (
                <Box>
                  <Typography
                    variant="caption"
                    sx={{
                      display: 'block',
                      fontWeight: 700,
                      color: 'text.secondary',
                      mb: 0.75,
                    }}
                  >
                    Other Suggested HSN Matches (click to switch):
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.85 }}>
                    {hsnMatches.map((match) => {
                      const isActive = primaryHsn?.hsnCode === match.hsnCode;
                      return (
                        <Chip
                          key={match.id || match.hsnCode}
                          label={`${match.hsnCode} · ${match.title} (${match.gstRate}% GST)`}
                          size="small"
                          clickable
                          onClick={() => handleSelectHsnOverride(match)}
                          sx={{
                            maxWidth: '100%',
                            fontWeight: isActive ? 800 : 600,
                            border: '1px solid',
                            borderColor: isActive ? accent : 'divider',
                            bgcolor: isActive ? `${accent}20` : 'transparent',
                            color: isActive ? accent : 'text.primary',
                          }}
                        />
                      );
                    })}
                  </Box>
                </Box>
              )}

              {/* Compliance Disclaimer */}
              <Alert
                severity="warning"
                icon={<ShieldAlert size={18} />}
                sx={{
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: isDark ? 'rgba(245, 166, 35, 0.25)' : 'rgba(217, 119, 6, 0.25)',
                }}
              >
                <Typography variant="caption" sx={{ color: 'text.primary', fontWeight: 600 }}>
                  Reference guidance only — verify final HSN/GST rate on the CBIC GST portal or with
                  your CA before filing.
                </Typography>
              </Alert>
            </Stack>
          </Paper>

          {/* Platform Tabs & Editable Listings */}
          {generatedPlatformsList.length > 0 && activeListing && activeDraft && (
            <Paper
              elevation={0}
              sx={{
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: cardBg,
                overflow: 'hidden',
              }}
            >
              {/* Platform Tabs Header */}
              <Box
                sx={{
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  bgcolor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(15,23,42,0.02)',
                }}
              >
                <Tabs
                  value={activeListing.platformId}
                  onChange={(_, newId) => {
                    setActivePlatformId(newId);
                    setDescriptionViewMode('plain');
                  }}
                  variant="scrollable"
                  scrollButtons="auto"
                  aria-label="Generated platform listings"
                  sx={{
                    '& .MuiTabs-indicator': {
                      height: 3,
                      bgcolor: activePlatformAccent,
                    },
                  }}
                >
                  {generatedPlatformsList.map((plat) => {
                    const dotColor = plat.accent || accent;
                    return (
                      <Tab
                        key={plat.platformId}
                        value={plat.platformId}
                        label={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.9 }}>
                            <Box
                              sx={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                bgcolor: dotColor,
                                flexShrink: 0,
                              }}
                            />
                            <span>{plat.platformName}</span>
                          </Box>
                        }
                        sx={{
                          textTransform: 'none',
                          fontWeight: 700,
                          fontSize: '0.86rem',
                          minHeight: 50,
                          '&.Mui-selected': {
                            color: 'text.primary',
                            fontWeight: 800,
                          },
                        }}
                      />
                    );
                  })}
                </Tabs>
              </Box>

              {/* Active Platform Content */}
              <Box sx={{ p: { xs: 2, sm: 3 } }}>
                <Stack spacing={2.75}>
                  {/* Platform Banner + Copy Full Listing */}
                  <Box
                    sx={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 1.5,
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="h6" sx={{ fontWeight: 800, color: 'text.primary' }}>
                        {activeListing.platformName}
                      </Typography>
                      <Chip
                        label={isSocialPlatform(activeListing) ? 'Social Media' : 'Marketplace'}
                        size="small"
                        sx={{
                          fontWeight: 700,
                          fontSize: '0.72rem',
                          bgcolor: `${activePlatformAccent}1e`,
                          color: activePlatformAccent,
                        }}
                      />
                    </Box>

                    <FieldCopyButton
                      copyKey={`full-${activeListing.platformId}`}
                      activeCopyKey={activeCopyKey}
                      onCopy={handleCopy}
                      getText={() =>
                        formatSinglePlatformCopyText(
                          activeExportListing,
                          primaryHsn,
                          taxBreakdown
                        )
                      }
                      label="Copy Full Listing"
                      accent={activePlatformAccent}
                      variant="contained"
                      size="medium"
                    />
                  </Box>

                  {/* Platform Compliance Tips */}
                  {hasFieldContent(activeListing.notes || activeListing.ruleSummary) && (
                    <Alert
                      severity="info"
                      icon={<Lightbulb size={18} />}
                      sx={{
                        borderRadius: 2.5,
                        border: '1px solid',
                        borderColor: `${activePlatformAccent}40`,
                        bgcolor: `${activePlatformAccent}10`,
                        '& .MuiAlert-icon': { color: activePlatformAccent },
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{
                          display: 'block',
                          fontWeight: 800,
                          color: 'text.primary',
                          mb: 0.3,
                        }}
                      >
                        {activeListing.platformName} Tips &amp; Guidelines
                      </Typography>
                      {Array.isArray(activeListing.notes) ? (
                        <Box component="ul" sx={{ m: 0, pl: 2.2 }}>
                          {activeListing.notes.map((tip, idx) => (
                            <Box
                              component="li"
                              key={idx}
                              sx={{ fontSize: '0.82rem', color: 'text.primary', lineHeight: 1.5 }}
                            >
                              {tip}
                            </Box>
                          ))}
                        </Box>
                      ) : (
                        <Typography variant="body2" sx={{ color: 'text.primary' }}>
                          {activeListing.notes || activeListing.ruleSummary}
                        </Typography>
                      )}
                    </Alert>
                  )}

                  {/* Title Field */}
                  {(hasFieldContent(activeListing.title) || activeDraft.title) && (
                    <Box>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 1,
                          mb: 1,
                        }}
                      >
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary' }}>
                          Product Title / Headline
                        </Typography>
                        <FieldCopyButton
                          copyKey={`title-${activeListing.platformId}`}
                          activeCopyKey={activeCopyKey}
                          onCopy={handleCopy}
                          text={activeDraft.title}
                          accent={activePlatformAccent}
                        />
                      </Box>
                      <TextField
                        fullWidth
                        multiline
                        minRows={2}
                        maxRows={4}
                        value={activeDraft.title}
                        onChange={(e) =>
                          updateDraftField(activeListing.platformId, 'title', e.target.value)
                        }
                      />
                      <FieldLimitMeter
                        value={activeDraft.title}
                        maxChars={activeLimits.titleMaxChars}
                        isDark={isDark}
                      />
                    </Box>
                  )}

                  {/* Key Highlights / Bullet Points */}
                  {(hasFieldContent(activeListing.bullets) || activeDraft.bulletsText) && (
                    <Box>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 1,
                          mb: 1,
                        }}
                      >
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary' }}>
                            Key Highlights / Bullet Points
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            One bullet point per line — edit directly as needed
                          </Typography>
                        </Box>
                        <FieldCopyButton
                          copyKey={`bullets-${activeListing.platformId}`}
                          activeCopyKey={activeCopyKey}
                          onCopy={handleCopy}
                          text={activeDraft.bulletsText}
                          accent={activePlatformAccent}
                        />
                      </Box>
                      <TextField
                        fullWidth
                        multiline
                        minRows={4}
                        maxRows={10}
                        value={activeDraft.bulletsText}
                        onChange={(e) =>
                          updateDraftField(activeListing.platformId, 'bulletsText', e.target.value)
                        }
                      />
                      <FieldLimitMeter
                        value={activeDraft.bulletsText}
                        maxItems={activeLimits.bulletsMaxCount}
                        itemCount={bulletLineCount}
                        itemLabel="bullets"
                        perLineMaxChars={activeLimits.bulletMaxChars}
                        isDark={isDark}
                      />
                    </Box>
                  )}

                  {/* Description with Plain Text vs Rendered HTML Preview Toggle */}
                  {(hasFieldContent(activeListing.description) ||
                    hasFieldContent(activeListing.descriptionHtml) ||
                    activeDraft.description) && (
                    <Box>
                      <Box
                        sx={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 1,
                          mb: 1,
                        }}
                      >
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary' }}>
                          {isSocialPlatform(activeListing) ? 'Post Caption / Description' : 'Product Description'}
                        </Typography>

                        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
                          {hasFieldContent(activeListing.descriptionHtml) && (
                            <ToggleButtonGroup
                              size="small"
                              exclusive
                              value={descriptionViewMode}
                              onChange={(_, val) => {
                                if (val) setDescriptionViewMode(val);
                              }}
                              aria-label="Description view mode"
                            >
                              <ToggleButton
                                value="plain"
                                sx={{ textTransform: 'none', fontWeight: 700, py: 0.4, px: 1.25 }}
                              >
                                <Code size={14} style={{ marginRight: 6 }} />
                                Plain Text
                              </ToggleButton>
                              <ToggleButton
                                value="html"
                                sx={{ textTransform: 'none', fontWeight: 700, py: 0.4, px: 1.25 }}
                              >
                                <Eye size={14} style={{ marginRight: 6 }} />
                                HTML Preview
                              </ToggleButton>
                            </ToggleButtonGroup>
                          )}

                          {hasFieldContent(activeListing.descriptionHtml) && (
                            <FieldCopyButton
                              copyKey={`desc-html-${activeListing.platformId}`}
                              activeCopyKey={activeCopyKey}
                              onCopy={handleCopy}
                              text={activeHtmlPreview}
                              label="Copy HTML"
                              accent={activePlatformAccent}
                            />
                          )}

                          <FieldCopyButton
                            copyKey={`desc-${activeListing.platformId}`}
                            activeCopyKey={activeCopyKey}
                            onCopy={handleCopy}
                            text={activeDraft.description}
                            label={hasFieldContent(activeListing.descriptionHtml) ? 'Copy Text' : 'Copy'}
                            accent={activePlatformAccent}
                          />
                        </Box>
                      </Box>

                      {descriptionViewMode === 'html' && hasFieldContent(activeListing.descriptionHtml) ? (
                        <Paper
                          elevation={0}
                          sx={{
                            p: 2,
                            borderRadius: 2,
                            border: '1px solid',
                            borderColor: 'divider',
                            bgcolor: isDark ? 'rgba(255,255,255,0.02)' : '#ffffff',
                            color: 'text.primary',
                            fontSize: '0.92rem',
                            lineHeight: 1.65,
                            '& p': { mt: 0, mb: 1.2 },
                            '& p:last-child': { mb: 0 },
                            '& ul': { mt: 0.5, mb: 1.2, pl: 2.5 },
                            '& li': { mb: 0.5 },
                          }}
                          dangerouslySetInnerHTML={{ __html: activeHtmlPreview }}
                        />
                      ) : (
                        <TextField
                          fullWidth
                          multiline
                          minRows={5}
                          maxRows={14}
                          value={activeDraft.description}
                          onChange={(e) =>
                            updateDraftField(activeListing.platformId, 'description', e.target.value)
                          }
                        />
                      )}

                      <FieldLimitMeter
                        value={activeDraft.description}
                        maxChars={activeLimits.descriptionMaxChars}
                        isDark={isDark}
                      />
                    </Box>
                  )}

                  {/* Reels Caption (for Instagram / Video platforms) */}
                  {(hasFieldContent(activeListing.reelsCaption) || activeDraft.reelsCaption) && (
                    <Box>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 1,
                          mb: 1,
                        }}
                      >
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary' }}>
                          Reels / Short Video Caption
                        </Typography>
                        <FieldCopyButton
                          copyKey={`reels-${activeListing.platformId}`}
                          activeCopyKey={activeCopyKey}
                          onCopy={handleCopy}
                          text={activeDraft.reelsCaption}
                          accent={activePlatformAccent}
                        />
                      </Box>
                      <TextField
                        fullWidth
                        multiline
                        minRows={3}
                        maxRows={8}
                        value={activeDraft.reelsCaption}
                        onChange={(e) =>
                          updateDraftField(activeListing.platformId, 'reelsCaption', e.target.value)
                        }
                      />
                      <FieldLimitMeter
                        value={activeDraft.reelsCaption}
                        maxChars={activeLimits.reelsCaptionMaxChars}
                        isDark={isDark}
                      />
                    </Box>
                  )}

                  {/* SEO Meta Fields (Shopify / D2C / Etsy etc.) */}
                  {(hasFieldContent(activeListing.metaTitle) ||
                    hasFieldContent(activeListing.seoTitle) ||
                    hasFieldContent(activeListing.metaDescription) ||
                    hasFieldContent(activeListing.urlSlug) ||
                    activeDraft.metaTitle ||
                    activeDraft.metaDescription ||
                    activeDraft.urlSlug) && (
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2,
                        borderRadius: 2.5,
                        border: '1px solid',
                        borderColor: 'divider',
                        bgcolor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(15,23,42,0.02)',
                      }}
                    >
                      <Typography
                        variant="subtitle2"
                        sx={{ fontWeight: 800, color: 'text.primary', mb: 1.5 }}
                      >
                        Google SEO &amp; Storefront Meta Tags
                      </Typography>

                      <Stack spacing={2}>
                        {(hasFieldContent(activeListing.metaTitle) ||
                          hasFieldContent(activeListing.seoTitle) ||
                          activeDraft.metaTitle) && (
                          <Box>
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                mb: 0.75,
                              }}
                            >
                              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                                SEO Meta Title
                              </Typography>
                              <FieldCopyButton
                                copyKey={`meta-title-${activeListing.platformId}`}
                                activeCopyKey={activeCopyKey}
                                onCopy={handleCopy}
                                text={activeDraft.metaTitle}
                                accent={activePlatformAccent}
                              />
                            </Box>
                            <TextField
                              size="small"
                              fullWidth
                              value={activeDraft.metaTitle}
                              onChange={(e) =>
                                updateDraftField(activeListing.platformId, 'metaTitle', e.target.value)
                              }
                            />
                            <FieldLimitMeter
                              value={activeDraft.metaTitle}
                              maxChars={activeLimits.metaTitleMaxChars || 60}
                              isDark={isDark}
                            />
                          </Box>
                        )}

                        {(hasFieldContent(activeListing.metaDescription) || activeDraft.metaDescription) && (
                          <Box>
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                mb: 0.75,
                              }}
                            >
                              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                                SEO Meta Description
                              </Typography>
                              <FieldCopyButton
                                copyKey={`meta-desc-${activeListing.platformId}`}
                                activeCopyKey={activeCopyKey}
                                onCopy={handleCopy}
                                text={activeDraft.metaDescription}
                                accent={activePlatformAccent}
                              />
                            </Box>
                            <TextField
                              size="small"
                              fullWidth
                              multiline
                              minRows={2}
                              value={activeDraft.metaDescription}
                              onChange={(e) =>
                                updateDraftField(
                                  activeListing.platformId,
                                  'metaDescription',
                                  e.target.value
                                )
                              }
                            />
                            <FieldLimitMeter
                              value={activeDraft.metaDescription}
                              maxChars={activeLimits.metaDescriptionMaxChars || 160}
                              isDark={isDark}
                            />
                          </Box>
                        )}

                        {(hasFieldContent(activeListing.urlSlug) || activeDraft.urlSlug) && (
                          <Box>
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                mb: 0.75,
                              }}
                            >
                              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                                Clean URL Slug
                              </Typography>
                              <FieldCopyButton
                                copyKey={`slug-${activeListing.platformId}`}
                                activeCopyKey={activeCopyKey}
                                onCopy={handleCopy}
                                text={activeDraft.urlSlug}
                                accent={activePlatformAccent}
                              />
                            </Box>
                            <TextField
                              size="small"
                              fullWidth
                              value={activeDraft.urlSlug}
                              onChange={(e) =>
                                updateDraftField(activeListing.platformId, 'urlSlug', e.target.value)
                              }
                            />
                          </Box>
                        )}
                      </Stack>
                    </Paper>
                  )}

                  {/* Search Keywords / Tags / Hashtags */}
                  {(hasFieldContent(activeListing.keywords) || activeDraft.keywordsText) && (
                    <Box>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 1,
                          mb: 1,
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                          <Tag size={15} color={activePlatformAccent} />
                          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary' }}>
                            {isSocialPlatform(activeListing)
                              ? 'Hashtags & Discovery Tags'
                              : 'Backend Search Keywords & Tags'}
                          </Typography>
                        </Box>
                        <FieldCopyButton
                          copyKey={`kw-${activeListing.platformId}`}
                          activeCopyKey={activeCopyKey}
                          onCopy={handleCopy}
                          text={activeDraft.keywordsText}
                          accent={activePlatformAccent}
                        />
                      </Box>
                      <TextField
                        fullWidth
                        multiline
                        minRows={2}
                        maxRows={6}
                        value={activeDraft.keywordsText}
                        onChange={(e) =>
                          updateDraftField(activeListing.platformId, 'keywordsText', e.target.value)
                        }
                      />
                      <FieldLimitMeter
                        value={activeDraft.keywordsText}
                        maxChars={activeLimits.keywordsMaxChars}
                        maxBytes={activeLimits.keywordsMaxBytes}
                        maxItems={activeLimits.keywordsMaxCount}
                        perTagMaxChars={activeLimits.tagMaxChars}
                        itemCount={keywordCount}
                        itemLabel={isSocialPlatform(activeListing) ? 'tags' : 'keywords'}
                        showBytes
                        isDark={isDark}
                      />
                    </Box>
                  )}
                </Stack>
              </Box>
            </Paper>
          )}
        </Stack>
      )}

      {/* Search & Pick Different HSN Code Modal */}
      <HsnSearchDialog
        open={hsnModalOpen}
        onClose={() => setHsnModalOpen(false)}
        sellingPrice={form.sellingPrice}
        currentHsnCode={primaryHsn?.hsnCode}
        onSelectHsn={handleSelectHsnOverride}
        isDark={isDark}
        accent={accent}
      />
    </ToolShell>
  );
}
