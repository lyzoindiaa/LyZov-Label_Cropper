import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  FormControlLabel,
  Paper,
  Switch,
  Typography,
} from '@mui/material';
import { Download, FileText, FileType2, ScanText, Sparkles, X } from 'lucide-react';
import { AppContext } from '../../context/AppContext';
import ToolShell from '../../components/tools/ToolShell';
import ToolDropzone from '../../components/tools/ToolDropzone';
import ToolFileList from '../../components/tools/ToolFileList';
import ToolProgress from '../../components/tools/ToolProgress';
import ToolResultBar from '../../components/tools/ToolResultBar';
import {
  MAX_PDF_FILE_BYTES,
  cleanBaseName,
  formatBytes,
  toFriendlyErrorMessage,
  validateUploadedFiles,
} from '../../utils/fileValidation';
import { downloadBlob, downloadItemsAsZip } from '../../utils/zipUtils';
import { useToolSettings } from '../../utils/toolPrefs';
import { convertPdfToDocx } from '../../utils/pdfToWordEngine';

const MAX_BATCH_PDFS = 20;

export default function PdfToWordPage() {
  const { theme } = useContext(AppContext);
  const isDark = theme === 'dark';
  const accent = '#4a9eff';

  const [settings, setSettings] = useToolSettings('pdf_to_word', {
    enableOcr: true,
    extractImages: true,
  });

  const [items, setItems] = useState([]);
  const [uploadErrors, setUploadErrors] = useState([]);
  const [processError, setProcessError] = useState('');
  const [processing, setProcessing] = useState({
    active: false,
    current: 0,
    total: 100,
    title: 'Converting PDF to Word...',
    subtitle: '',
  });
  const [results, setResults] = useState([]);
  const [selectedPreviewIdx, setSelectedPreviewIdx] = useState(0);
  const [partialWarnings, setPartialWarnings] = useState('');
  const [zipping, setZipping] = useState(false);

  const abortControllerRef = useRef(null);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const totalInputBytes = useMemo(
    () => items.reduce((sum, item) => sum + (item.size || 0), 0),
    [items]
  );

  const handleFilesSelected = async (fileList) => {
    setUploadErrors([]);
    setProcessError('');

    const remainingSlots = MAX_BATCH_PDFS - items.length;
    if (remainingSlots <= 0) {
      setUploadErrors([
        `Maximum ${MAX_BATCH_PDFS} PDFs can be converted in one batch. Remove a file to add another.`,
      ]);
      return;
    }

    const { valid, errors } = await validateUploadedFiles(fileList, {
      allowedTypes: ['pdf'],
      maxFileSizeBytes: MAX_PDF_FILE_BYTES,
      maxFiles: remainingSlots,
      formatLabel: 'PDF',
    });

    if (errors.length > 0) {
      setUploadErrors(errors);
    }

    if (valid.length === 0) return;

    setResults([]);
    setPartialWarnings('');

    const added = valid.map(({ file }) => ({
      id:
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      name: file.name,
      size: file.size,
      kind: 'pdf',
    }));

    setItems((prev) => [...prev, ...added]);
  };

  const handleRemoveItem = (idx) => {
    setResults([]);
    setPartialWarnings('');
    setProcessError('');
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleReset = () => {
    abortControllerRef.current?.abort();
    setItems([]);
    setResults([]);
    setSelectedPreviewIdx(0);
    setUploadErrors([]);
    setProcessError('');
    setPartialWarnings('');
  };

  const handleConvert = async () => {
    if (items.length === 0 || processing.active) return;

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setProcessError('');
    setUploadErrors([]);
    setPartialWarnings('');
    setResults([]);
    setSelectedPreviewIdx(0);

    const totalFiles = items.length;
    setProcessing({
      active: true,
      current: 0,
      total: totalFiles * 100,
      title: 'Converting PDF to Word...',
      subtitle: `Preparing ${items[0].name}...`,
    });

    const convertedList = [];
    const failedMessages = [];

    try {
      for (let fileIdx = 0; fileIdx < totalFiles; fileIdx++) {
        if (controller.signal.aborted) {
          throw new Error('Conversion was cancelled.');
        }

        const item = items[fileIdx];
        const baseProgress = fileIdx * 100;

        try {
          const output = await convertPdfToDocx(item.file, {
            enableOcr: settings.enableOcr,
            extractImages: settings.extractImages,
            signal: controller.signal,
            onProgress: (info) => {
              const totalPages = Math.max(1, info.totalPages || 1);
              let pageRatio = 0;

              if (info.stage === 'assemble') {
                pageRatio = 0.96;
              } else if (info.stage === 'ocr') {
                const pageBase = Math.max(0, (info.page || 1) - 1) / totalPages;
                const ocrPart = ((info.ocrProgress || 0) / totalPages) * 0.92;
                pageRatio = Math.min(0.94, pageBase + ocrPart);
              } else if (info.stage === 'extract') {
                pageRatio = Math.min(0.92, ((info.page || 0) / totalPages) * 0.9);
              }

              const filePrefix =
                totalFiles > 1 ? `File ${fileIdx + 1} of ${totalFiles} (${item.name}) · ` : '';

              setProcessing({
                active: true,
                current: Math.round(baseProgress + pageRatio * 100),
                total: totalFiles * 100,
                title:
                  info.stage === 'ocr'
                    ? 'Reading scanned text (OCR)...'
                    : 'Converting PDF to Word...',
                subtitle: `${filePrefix}${info.message}`,
              });
            },
          });

          const outputFilename = `${cleanBaseName(item.name, 'document')}.docx`;
          convertedList.push({
            id: item.id,
            sourceName: item.name,
            outputFilename,
            ...output,
          });
        } catch (fileErr) {
          if (controller.signal.aborted) {
            throw fileErr;
          }
          const friendly = toFriendlyErrorMessage(
            fileErr,
            `Could not convert "${item.name}".`
          );
          failedMessages.push(`${item.name}: ${friendly}`);
        }
      }

      if (convertedList.length === 0) {
        setProcessError(
          failedMessages[0] || 'Could not convert the uploaded PDF. Please try another file.'
        );
      } else {
        setResults(convertedList);
        setSelectedPreviewIdx(0);
        if (failedMessages.length > 0) {
          setPartialWarnings(
            `${failedMessages.length} ${
              failedMessages.length === 1 ? 'file was' : 'files were'
            } skipped: ${failedMessages.join(' | ')}`
          );
        }
      }
    } catch (err) {
      if (!controller.signal.aborted) {
        setProcessError(
          toFriendlyErrorMessage(err, 'Something went wrong while converting your PDF.')
        );
      }
    } finally {
      abortControllerRef.current = null;
      setProcessing({
        active: false,
        current: 0,
        total: 100,
        title: 'Converting PDF to Word...',
        subtitle: '',
      });
    }
  };

  const handleDownloadAllZip = async () => {
    if (results.length === 0 || zipping) return;
    setZipping(true);
    try {
      await downloadItemsAsZip(
        results.map((r) => ({ blob: r.blob, filename: r.outputFilename })),
        'lyzov_pdf_to_word.zip'
      );
    } catch (err) {
      setProcessError(toFriendlyErrorMessage(err, 'Could not build ZIP file.'));
    } finally {
      setZipping(false);
    }
  };

  const activeResult = results[selectedPreviewIdx] || results[0] || null;

  return (
    <ToolShell
      title="PDF to Word"
      seoTitle="PDF to Word Converter Free (With OCR) | PDF to DOCX | LyZov Tools"
      description="Turn digital or scanned PDF documents into editable Microsoft Word (.docx) files."
      canonical="https://tools.lyzov.com/pdf-to-word"
      accentColor={accent}
      icon={FileType2}
    >
      {/* Step 1: Choose File */}
      <ToolDropzone
        title={items.length > 0 ? 'Add more PDF files' : 'Drop your PDF files here'}
        subtitle={`Supports single or bulk PDFs (up to ${MAX_BATCH_PDFS} files · Max ${formatBytes(MAX_PDF_FILE_BYTES)} each)`}
        buttonLabel={items.length > 0 ? 'Add More PDFs' : 'Choose PDF Files'}
        accept=".pdf,application/pdf"
        multiple={true}
        disabled={processing.active}
        accentColor={accent}
        compact={items.length > 0}
        errorMessages={uploadErrors}
        onClearErrors={() => setUploadErrors([])}
        onFilesSelected={handleFilesSelected}
      />

      {items.length > 0 && (
        <ToolFileList
          items={items}
          title={`Selected PDFs (${formatBytes(totalInputBytes)} total)`}
          allowReorder={false}
          disabled={processing.active}
          onRemoveItem={handleRemoveItem}
          onClearAll={handleReset}
        />
      )}

      {/* Step 2: Options & Honest Layout Disclaimer */}
      {items.length > 0 && !processing.active && (
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, sm: 2.5 },
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'background.paper',
            display: 'flex',
            flexDirection: 'column',
            gap: 1.75,
          }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary' }}>
            Conversion Options
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={Boolean(settings.enableOcr)}
                  disabled={processing.active}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, enableOcr: e.target.checked }))
                  }
                />
              }
              label={
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                    Auto-detect &amp; OCR scanned PDFs
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                    Automatically reads scanned or photo-based PDF pages into editable text (English).
                  </Typography>
                </Box>
              }
            />

            <FormControlLabel
              control={
                <Switch
                  checked={Boolean(settings.extractImages)}
                  disabled={processing.active}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, extractImages: e.target.checked }))
                  }
                />
              }
              label={
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                    Include embedded images
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                    Copies photos and logos found on digital PDF pages into your Word file.
                  </Typography>
                </Box>
              }
            />
          </Box>

          <Alert severity="info" sx={{ borderRadius: 2 }}>
            Complex multi-column layouts, overlapping boxes, or intricate graphics may simplify in
            Word. Standard text documents, invoices, tables, and scanned pages convert cleanly.
          </Alert>
        </Paper>
      )}

      {/* Step 3: Main Action Button & Progress */}
      {items.length > 0 && !processing.active && results.length === 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <Button
            variant="contained"
            size="large"
            startIcon={<Sparkles size={18} />}
            onClick={handleConvert}
            sx={{
              py: 1.4,
              px: 4,
              fontWeight: 800,
              fontSize: '1rem',
              textTransform: 'none',
              borderRadius: 3,
              color: '#ffffff',
              background: 'linear-gradient(135deg, #4a9eff 0%, #2563eb 100%)',
              boxShadow: '0 8px 24px rgba(74, 158, 255, 0.32)',
              '&:hover': {
                background: 'linear-gradient(135deg, #3b8ef0 0%, #1d4ed8 100%)',
              },
            }}
          >
            {items.length === 1
              ? 'Convert to Word (.docx)'
              : `Convert ${items.length} PDFs to Word (.docx)`}
          </Button>
        </Box>
      )}

      {processing.active && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <ToolProgress
            title={processing.title}
            subtitle={processing.subtitle}
            current={processing.current}
            total={processing.total}
            accentColor={accent}
          />
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<X size={15} />}
              onClick={() => abortControllerRef.current?.abort()}
              sx={{
                textTransform: 'none',
                fontWeight: 700,
                borderRadius: 2,
                color: 'text.secondary',
                borderColor: 'divider',
              }}
            >
              Cancel Conversion
            </Button>
          </Box>
        </Box>
      )}

      {processError && (
        <Alert severity="error" onClose={() => setProcessError('')} sx={{ borderRadius: 2.5 }}>
          {processError}
        </Alert>
      )}

      {/* Step 4 & 5: Download + Preview */}
      {results.length > 0 && activeResult && (
        <>
          <ToolResultBar
            title={
              results.length === 1
                ? 'Your Word document is ready'
                : `${results.length} Word documents are ready`
            }
            subtitle={
              results.length === 1
                ? `${activeResult.pageCount} ${activeResult.pageCount === 1 ? 'page' : 'pages'} · ${activeResult.ocrPageCount} OCR ${activeResult.ocrPageCount === 1 ? 'page' : 'pages'} · ${activeResult.tableCount} ${activeResult.tableCount === 1 ? 'table' : 'tables'} · ${formatBytes(activeResult.blob.size)}`
                : 'Download all files as a ZIP archive or save any file individually below.'
            }
            count={results.length}
            singleLabel="Download DOCX"
            zipLabel="Download All (.ZIP)"
            resetLabel="Convert More PDFs"
            zipping={zipping}
            warningMessage={partialWarnings}
            onDownloadSingle={() => downloadBlob(activeResult.blob, activeResult.outputFilename)}
            onDownloadAllZip={handleDownloadAllZip}
            onReset={handleReset}
          />

          {/* Batch selector when multiple PDFs were converted */}
          {results.length > 1 && (
            <Paper
              elevation={0}
              sx={{
                p: 2,
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'background.paper',
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                Converted Files (Click to Preview Text)
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {results.map((res, idx) => {
                  const selected = idx === selectedPreviewIdx;
                  return (
                    <Box
                      key={res.id}
                      onClick={() => setSelectedPreviewIdx(idx)}
                      sx={{
                        p: 1.25,
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: selected ? accent : 'divider',
                        bgcolor: selected
                          ? isDark
                            ? 'rgba(74, 158, 255, 0.1)'
                            : 'rgba(74, 158, 255, 0.06)'
                          : 'transparent',
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 1,
                        cursor: 'pointer',
                      }}
                    >
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography
                          variant="body2"
                          noWrap
                          sx={{ fontWeight: 700, color: 'text.primary' }}
                        >
                          {res.outputFilename}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {res.pageCount} {res.pageCount === 1 ? 'page' : 'pages'} ·{' '}
                          {res.ocrPageCount} OCR {res.ocrPageCount === 1 ? 'page' : 'pages'} ·{' '}
                          {res.tableCount} {res.tableCount === 1 ? 'table' : 'tables'} ·{' '}
                          {formatBytes(res.blob.size)}
                        </Typography>
                      </Box>

                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<Download size={14} />}
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadBlob(res.blob, res.outputFilename);
                        }}
                        sx={{
                          textTransform: 'none',
                          fontWeight: 700,
                          borderRadius: 2,
                          borderColor: 'divider',
                        }}
                      >
                        Download
                      </Button>
                    </Box>
                  );
                })}
              </Box>
            </Paper>
          )}

          {/* Extracted Text Snippet + Conversion Stats Preview */}
          <Paper
            elevation={0}
            sx={{
              p: { xs: 2, sm: 2.5 },
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'background.paper',
              display: 'flex',
              flexDirection: 'column',
              gap: 1.5,
            }}
          >
            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 1,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <FileText size={18} color={accent} />
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary' }}>
                  Extracted Content Preview — {activeResult.outputFilename}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8 }}>
                <Chip
                  label={`${activeResult.pageCount} ${activeResult.pageCount === 1 ? 'page' : 'pages'}`}
                  size="small"
                  sx={{ fontWeight: 700, fontSize: '0.72rem' }}
                />
                <Chip
                  icon={<ScanText size={13} />}
                  label={`${activeResult.ocrPageCount} OCR ${activeResult.ocrPageCount === 1 ? 'page' : 'pages'}`}
                  size="small"
                  color={activeResult.ocrPageCount > 0 ? 'primary' : 'default'}
                  sx={{ fontWeight: 700, fontSize: '0.72rem' }}
                />
                <Chip
                  label={`${activeResult.tableCount} ${activeResult.tableCount === 1 ? 'table' : 'tables'}`}
                  size="small"
                  sx={{ fontWeight: 700, fontSize: '0.72rem' }}
                />
                {activeResult.imageCount > 0 && (
                  <Chip
                    label={`${activeResult.imageCount} ${activeResult.imageCount === 1 ? 'image' : 'images'}`}
                    size="small"
                    sx={{ fontWeight: 700, fontSize: '0.72rem' }}
                  />
                )}
              </Box>
            </Box>

            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: isDark ? 'rgba(8, 12, 24, 0.7)' : '#f8fafc',
                maxHeight: 300,
                overflowY: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                fontSize: '0.82rem',
                lineHeight: 1.6,
                color: activeResult.extractedPreviewText ? 'text.primary' : 'text.secondary',
              }}
            >
              {activeResult.extractedPreviewText
                ? activeResult.extractedPreviewText
                : 'No selectable or OCR text was detected in this document. Embedded images (if enabled) were still included in the Word file.'}
            </Box>
          </Paper>
        </>
      )}
    </ToolShell>
  );
}
