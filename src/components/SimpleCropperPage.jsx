import React, { useContext, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  LinearProgress,
  Paper,
  Typography,
} from '@mui/material';
import { UploadCloud, Download, RotateCcw, ShieldCheck, Plus } from 'lucide-react';
import { AppContext } from '../context/AppContext';
import { autoCropLabelsAndInvoices, mergePdfBlobs } from '../utils/pdfUtils';

/**
 * Typography wrapper: MUI v9 no longer reads `fontWeight` / `color` as props on Typography,
 * so map them into `sx` to keep bold headings and muted secondary text.
 */
function T({ fontWeight, color, sx, ...rest }) {
  return (
    <Typography
      {...rest}
      sx={{ ...(fontWeight ? { fontWeight } : {}), ...(color ? { color } : {}), ...sx }}
    />
  );
}

/**
 * Simplified cropper workspace: drop a PDF -> labels + invoices are cropped automatically.
 * Built with the same MUI components, theme tokens and gradients as the rest of the app.
 */
export default function SimpleCropperPage() {
  const { theme } = useContext(AppContext);
  const isDark = theme === 'dark';
  const accent = isDark ? '#00c9ff' : '#0284c7';

  const fileInputRef = useRef(null);
  const activeUrlsRef = useRef([]);

  const [status, setStatus] = useState('idle'); // 'idle' | 'processing' | 'done' | 'error'
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState('');
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [errorMessage, setErrorMessage] = useState('');
  const [result, setResult] = useState(null);

  // Revoke generated blob URLs to avoid leaking memory
  const revokeActiveUrls = () => {
    for (const url of activeUrlsRef.current) {
      try {
        URL.revokeObjectURL(url);
      } catch {}
    }
    activeUrlsRef.current = [];
  };

  useEffect(() => () => revokeActiveUrls(), []);

  const handleReset = () => {
    revokeActiveUrls();
    setStatus('idle');
    setFileName('');
    setProgress({ current: 0, total: 0 });
    setErrorMessage('');
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const processSelectedFiles = async (fileList) => {
    const files = Array.from(fileList || []).filter(
      (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
    );

    if (files.length === 0) {
      setStatus('error');
      setErrorMessage('Please select a valid PDF file (.pdf).');
      return;
    }

    revokeActiveUrls();
    setStatus('processing');
    setErrorMessage('');
    setResult(null);

    const displayBase =
      files.length === 1
        ? files[0].name.replace(/\.pdf$/i, '')
        : `${files[0].name.replace(/\.pdf$/i, '')}_and_${files.length - 1}_more`;
    setFileName(files.length === 1 ? files[0].name : `${files.length} PDF files`);
    setProgress({ current: 1, total: 1 });

    try {
      const sourceBlob =
        files.length === 1
          ? files[0]
          : await mergePdfBlobs(files.map((f) => ({ name: f.name, blob: f })));

      const cropped = await autoCropLabelsAndInvoices(sourceBlob, (p) =>
        setProgress({ current: p.current, total: p.total })
      );

      const labelsUrl = cropped.labelsBlob ? URL.createObjectURL(cropped.labelsBlob) : null;
      const invoicesUrl = cropped.invoicesBlob ? URL.createObjectURL(cropped.invoicesBlob) : null;
      if (labelsUrl) activeUrlsRef.current.push(labelsUrl);
      if (invoicesUrl) activeUrlsRef.current.push(invoicesUrl);

      setResult({
        ...cropped,
        baseName: displayBase.replace(/[^a-z0-9_-]+/gi, '_').slice(0, 48) || 'shipping',
        labelsUrl,
        invoicesUrl,
      });
      setStatus('done');
    } catch (err) {
      console.error('Auto-crop failed:', err);
      setStatus('error');
      setErrorMessage(err?.message || 'Unable to process this PDF. Please check the file and try again.');
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) processSelectedFiles(e.target.files);
    e.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer?.files?.length > 0) processSelectedFiles(e.dataTransfer.files);
  };

  const triggerDownload = (url, downloadName) => {
    if (!url) return;
    const link = document.createElement('a');
    link.href = url;
    link.download = downloadName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const progressPct =
    progress.total > 0 ? Math.min(100, Math.round((progress.current / progress.total) * 100)) : 0;

  const primaryBtnSx = {
    py: 1.4,
    fontWeight: 800,
    fontSize: '0.92rem',
    textTransform: 'none',
    borderRadius: 2.5,
    color: '#ffffff',
    background: 'linear-gradient(135deg, #00c9ff 0%, #0077ff 100%)',
    boxShadow: '0 6px 20px rgba(0, 201, 255, 0.35)',
    '&:hover': { background: 'linear-gradient(135deg, #00b8e6 0%, #0066dd 100%)' },
  };

  const cardSx = {
    p: { xs: 2, sm: 3.5 },
    width: '100%',
    minWidth: 0,
    borderRadius: 3,
    border: '1px solid',
    borderColor: 'divider',
    bgcolor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'background.paper',
  };

  return (
    <Box
      component="main"
      sx={{
        flex: 1,
        width: '100%',
        maxWidth: 760,
        minWidth: 0,
        mx: 'auto',
        px: { xs: 1.5, sm: 3 },
        py: { xs: 3, sm: 5 },
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
        boxSizing: 'border-box',
      }}
    >
      {/* Heading */}
      <Box sx={{ textAlign: 'center' }}>
        <T
          variant="h4"
          component="h1"
          fontWeight={800}
          sx={{ letterSpacing: '-0.5px', fontSize: { xs: '1.6rem', sm: '2.1rem' }, mb: 1 }}
        >
          PDF Label &amp; Invoice Cropper
        </T>
        <T
          variant="body1"
          color="text.secondary"
          sx={{ maxWidth: 560, mx: 'auto', mb: 1.8, fontSize: { xs: '0.9rem', sm: '1rem' } }}
        >
          Drop your Amazon, Flipkart, or Meesho shipping-label PDF to automatically crop thermal
          labels and separate tax invoices.
        </T>
        <Chip
          icon={<ShieldCheck size={13} color={accent} />}
          label="Files stay in your browser, nothing is uploaded."
          size="small"
          sx={{
            bgcolor: isDark ? 'rgba(0,201,255,0.08)' : 'rgba(2,132,199,0.08)',
            color: accent,
            border: '1px solid',
            borderColor: isDark ? 'rgba(0,201,255,0.2)' : 'rgba(2,132,199,0.2)',
            fontWeight: 600,
            fontSize: '0.72rem',
            maxWidth: '100%',
          }}
        />
      </Box>

      {/* Upload card (idle / error) */}
      {(status === 'idle' || status === 'error') && (
        <Paper elevation={0} sx={cardSx}>
          <input
            ref={fileInputRef}
            type="file"
            hidden
            multiple
            accept="application/pdf,.pdf"
            onChange={handleFileChange}
          />

          <Box
            role="button"
            tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            sx={{
              p: { xs: 3, sm: 5 },
              textAlign: 'center',
              cursor: 'pointer',
              borderRadius: 3,
              border: '2px dashed',
              borderColor: isDragging ? accent : 'divider',
              bgcolor: isDragging
                ? isDark
                  ? 'rgba(0, 201, 255, 0.08)'
                  : 'rgba(2, 132, 199, 0.08)'
                : isDark
                ? 'rgba(255, 255, 255, 0.02)'
                : 'rgba(0, 0, 0, 0.02)',
              transition: 'all 0.2s ease',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 1.5,
              '&:hover': {
                borderColor: isDark ? 'rgba(0, 201, 255, 0.6)' : 'rgba(2, 132, 199, 0.6)',
                bgcolor: isDark ? 'rgba(0, 201, 255, 0.04)' : 'rgba(2, 132, 199, 0.04)',
              },
            }}
          >
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
              <T variant="subtitle1" fontWeight={700}>
                Drop your shipping-label PDF here
              </T>
              <T variant="caption" color="text.secondary">
                Cropping starts automatically — no marketplace selection or extra clicks needed
              </T>
            </Box>
            <Button
              variant="contained"
              startIcon={<Plus size={16} />}
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              sx={{ ...primaryBtnSx, py: 1, px: 3 }}
            >
              Choose PDF File
            </Button>
          </Box>

          {status === 'error' && errorMessage && (
            <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>
              {errorMessage}
            </Alert>
          )}
        </Paper>
      )}

      {/* Progress card */}
      {status === 'processing' && (
        <Paper elevation={0} sx={cardSx} aria-live="polite">
          <T variant="subtitle1" fontWeight={700} sx={{ textAlign: 'center' }}>
            Cropping page {progress.current} of {progress.total}…
          </T>
          <T
            variant="caption"
            color="text.secondary"
            sx={{ display: 'block', textAlign: 'center', mb: 2, wordBreak: 'break-all' }}
          >
            {fileName}
          </T>
          <LinearProgress
            variant="determinate"
            value={progressPct}
            sx={{
              height: 8,
              borderRadius: 4,
              bgcolor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
              '& .MuiLinearProgress-bar': {
                background: 'linear-gradient(90deg, #00c9ff 0%, #00d68f 100%)',
              },
            }}
          />
          <T
            variant="caption"
            fontWeight={700}
            sx={{ display: 'block', textAlign: 'center', mt: 1, color: accent }}
          >
            {progressPct}%
          </T>
        </Paper>
      )}

      {/* Results card */}
      {status === 'done' && result && (
        <Paper elevation={0} sx={cardSx}>
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1.5,
              pb: 2,
              mb: 2,
              borderBottom: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <T variant="h6" fontWeight={800}>
                Ready to Download
              </T>
              <T variant="body2" color="text.secondary">
                {result.labelCount} {result.labelCount === 1 ? 'label' : 'labels'}
                {result.invoiceCount > 0
                  ? ` • ${result.invoiceCount} ${result.invoiceCount === 1 ? 'invoice' : 'invoices'}`
                  : ''}{' '}
                ({result.totalPages} {result.totalPages === 1 ? 'page' : 'pages'} scanned)
              </T>
            </Box>

            {result.marketplace && (
              <Chip
                label={result.marketplace}
                size="small"
                sx={{
                  bgcolor: 'rgba(0, 201, 255, 0.12)',
                  color: accent,
                  border: '1px solid rgba(0, 201, 255, 0.3)',
                  fontWeight: 700,
                }}
              />
            )}
          </Box>

          {/* Yellow warning: pages without Tax Invoice / Bill of Supply / Cash Memo heading */}
          {result.noInvoiceHeadingCount > 0 && (
            <Alert severity="warning" sx={{ mb: 1.5, borderRadius: 2 }}>
              {result.noInvoiceHeadingCount}{' '}
              {result.noInvoiceHeadingCount === 1 ? 'page had' : 'pages had'} no &ldquo;Tax
              Invoice&rdquo;, &ldquo;Bill of Supply&rdquo;, or &ldquo;Cash Memo&rdquo; heading and{' '}
              {result.noInvoiceHeadingCount === 1 ? 'was' : 'were'} treated as{' '}
              {result.noInvoiceHeadingCount === 1 ? 'a full label' : 'full labels'}.
            </Alert>
          )}

          {result.skippedBlankPages > 0 && (
            <Alert severity="info" sx={{ mb: 1.5, borderRadius: 2 }}>
              Skipped {result.skippedBlankPages} blank{' '}
              {result.skippedBlankPages === 1 ? 'page' : 'pages'}.
            </Alert>
          )}

          {/* First cropped label preview */}
          {result.firstLabelPreviewUrl && (
            <Box
              sx={{
                p: 2,
                mb: 2.5,
                textAlign: 'center',
                borderRadius: 2.5,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
                overflow: 'hidden',
              }}
            >
              <T
                variant="caption"
                fontWeight={700}
                color="text.secondary"
                sx={{ display: 'block', mb: 1.2, textTransform: 'uppercase', letterSpacing: 0.5 }}
              >
                First cropped label preview (
                {result.firstLabelOrientation === 'landscape' ? '5×3 in landscape' : '3×5 in portrait'})
              </T>
              <Box
                component="img"
                src={result.firstLabelPreviewUrl}
                alt="Preview of the first cropped shipping label"
                sx={{
                  display: 'block',
                  mx: 'auto',
                  maxWidth: '100%',
                  height: 'auto',
                  maxHeight: 300,
                  objectFit: 'contain',
                  bgcolor: '#ffffff',
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'divider',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
                }}
              />
            </Box>
          )}

          {/* Downloads */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: result.invoicesUrl ? '1fr 1fr' : '1fr' },
              gap: 1.5,
              mb: 1.5,
            }}
          >
            {result.labelsUrl && (
              <Button
                variant="contained"
                startIcon={<Download size={18} />}
                onClick={() => triggerDownload(result.labelsUrl, `${result.baseName}_labels.pdf`)}
                sx={primaryBtnSx}
              >
                Download Labels PDF
              </Button>
            )}
            {result.invoicesUrl && (
              <Button
                variant="outlined"
                startIcon={<Download size={18} />}
                onClick={() => triggerDownload(result.invoicesUrl, `${result.baseName}_invoices.pdf`)}
                sx={{
                  py: 1.4,
                  fontWeight: 800,
                  fontSize: '0.92rem',
                  textTransform: 'none',
                  borderRadius: 2.5,
                  color: accent,
                  borderColor: accent,
                  '&:hover': {
                    borderColor: accent,
                    bgcolor: isDark ? 'rgba(0, 201, 255, 0.1)' : 'rgba(2, 132, 199, 0.08)',
                  },
                }}
              >
                Download Invoice PDF
              </Button>
            )}
          </Box>

          <Button
            fullWidth
            variant="outlined"
            startIcon={<RotateCcw size={16} />}
            onClick={handleReset}
            sx={{
              textTransform: 'none',
              fontWeight: 700,
              borderRadius: 2.5,
              color: 'text.secondary',
              borderColor: 'divider',
              '&:hover': { borderColor: accent, color: accent },
            }}
          >
            Crop another file
          </Button>
        </Paper>
      )}
    </Box>
  );
}
