import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import {
  Download,
  FileOutput,
  FileText,
  Info,
  RotateCcw,
} from 'lucide-react';
import { AppContext } from '../../context/AppContext';
import ToolShell from '../../components/tools/ToolShell';
import ToolDropzone from '../../components/tools/ToolDropzone';
import ToolFileList from '../../components/tools/ToolFileList';
import ToolProgress from '../../components/tools/ToolProgress';
import { PdfDocumentPreview } from '../../components/tools/ToolPreview';
import ToolResultBar from '../../components/tools/ToolResultBar';
import {
  MAX_DOCX_FILE_BYTES,
  cleanBaseName,
  formatBytes,
  toFriendlyErrorMessage,
  validateUploadedFiles,
} from '../../utils/fileValidation';
import { createUrlRegistry, downloadBlob, downloadItemsAsZip } from '../../utils/zipUtils';
import { useToolSettings } from '../../utils/toolPrefs';
import { convertDocxToPdf } from '../../utils/wordToPdfEngine';

const MAX_BATCH_FILES = 15;
const ACCEPT_WORD_FILES =
  '.docx,.doc,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword';

const PAGE_FORMAT_OPTIONS = [
  { value: 'auto', label: 'Match Document (Auto)', hint: 'Uses the document page size' },
  { value: 'a4', label: 'A4', hint: '210 × 297 mm' },
  { value: 'letter', label: 'US Letter', hint: '8.5 × 11 in' },
];

const QUALITY_OPTIONS = [
  { value: 1.75, label: 'Standard', hint: 'Fast & compact PDF size' },
  { value: 2, label: 'High', hint: 'Sharper text & graphics' },
];

export default function WordToPdfPage() {
  const { theme } = useContext(AppContext);
  const isDark = theme === 'dark';
  const accent = isDark ? '#f5a623' : '#d97706';

  const [settings, setSettings] = useToolSettings('word_to_pdf', {
    pageFormat: 'auto',
    qualityScale: 1.75,
  });

  const [files, setFiles] = useState([]);
  const [validationErrors, setValidationErrors] = useState([]);
  const [conversionError, setConversionError] = useState('');
  const [partialWarning, setPartialWarning] = useState('');

  const [isConverting, setIsConverting] = useState(false);
  const [progressState, setProgressState] = useState({
    title: 'Converting Word document...',
    subtitle: '',
    current: 0,
    total: 100,
  });

  const [results, setResults] = useState([]);
  const [activePreviewIdx, setActivePreviewIdx] = useState(0);
  const [isZipping, setIsZipping] = useState(false);

  const urlRegistryRef = useRef(null);
  const isMountedRef = useRef(true);

  const getUrlRegistry = () => {
    if (!urlRegistryRef.current) {
      urlRegistryRef.current = createUrlRegistry();
    }
    return urlRegistryRef.current;
  };

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      urlRegistryRef.current?.revokeAll();
    };
  }, []);

  const clearConvertedResults = () => {
    urlRegistryRef.current?.revokeAll();
    setResults([]);
    setActivePreviewIdx(0);
    setConversionError('');
    setPartialWarning('');
  };

  const handleFilesSelected = async (fileList) => {
    setValidationErrors([]);
    setConversionError('');

    const { valid, errors } = await validateUploadedFiles(fileList, {
      allowedTypes: ['zip_ooxml'],
      maxFileSizeBytes: MAX_DOCX_FILE_BYTES,
      maxFiles: MAX_BATCH_FILES,
      formatLabel: 'Word document (.docx)',
    });

    const nextErrors = [...errors];

    if (valid.length > 0) {
      clearConvertedResults();
      setFiles((prev) => {
        const remainingSlots = Math.max(0, MAX_BATCH_FILES - prev.length);
        if (remainingSlots === 0) {
          nextErrors.push(`Maximum ${MAX_BATCH_FILES} files can be converted in one batch.`);
          return prev;
        }

        const accepted = valid.slice(0, remainingSlots);
        if (accepted.length < valid.length) {
          nextErrors.push(`Only ${MAX_BATCH_FILES} files can be queued at once. Extra files were skipped.`);
        }

        const stamped = accepted.map(({ file }, idx) => ({
          id: `${file.name}-${file.size}-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
          file,
          name: file.name,
          size: file.size,
          kind: 'document',
        }));

        return [...prev, ...stamped];
      });
    }

    if (nextErrors.length > 0) {
      setValidationErrors(nextErrors);
    }
  };

  const handleRemoveFile = (index) => {
    clearConvertedResults();
    setFiles((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleClearAllFiles = () => {
    clearConvertedResults();
    setValidationErrors([]);
    setFiles([]);
  };

  const handleReset = () => {
    clearConvertedResults();
    setValidationErrors([]);
    setFiles([]);
  };

  const handleConvert = async () => {
    if (files.length === 0 || isConverting) return;

    clearConvertedResults();
    setValidationErrors([]);
    setIsConverting(true);

    const registry = getUrlRegistry();
    const converted = [];
    const failedMessages = [];

    try {
      for (let i = 0; i < files.length; i++) {
        if (!isMountedRef.current) return;
        const item = files[i];

        setProgressState({
          title:
            files.length === 1
              ? `Converting "${item.name}"...`
              : `Converting "${item.name}" (${i + 1} of ${files.length})...`,
          subtitle: 'Preparing document...',
          current: Math.round((i / files.length) * 100),
          total: 100,
        });

        try {
          const { blob, pageCount, engineUsed } = await convertDocxToPdf(item.file, {
            pageFormat: settings.pageFormat,
            qualityScale: settings.qualityScale,
            onProgress: (stageLabel, ratio) => {
              if (!isMountedRef.current) return;
              const overallPct = Math.round(((i + ratio) / files.length) * 100);
              setProgressState({
                title:
                  files.length === 1
                    ? `Converting "${item.name}"...`
                    : `Converting "${item.name}" (${i + 1} of ${files.length})...`,
                subtitle: stageLabel,
                current: overallPct,
                total: 100,
              });
            },
          });

          if (!isMountedRef.current) return;

          const previewUrl = registry.create(blob);
          const pdfFilename = `${cleanBaseName(item.name, 'document')}.pdf`;

          converted.push({
            id: item.id,
            sourceName: item.name,
            filename: pdfFilename,
            blob,
            previewUrl,
            size: blob.size,
            pageCount,
            engineUsed,
          });
        } catch (err) {
          failedMessages.push(`${item.name}: ${toFriendlyErrorMessage(err)}`);
        }
      }

      if (!isMountedRef.current) return;

      if (converted.length === 0) {
        setConversionError(
          failedMessages[0] || 'Could not convert the selected Word file. Please try another .docx file.'
        );
      } else {
        setResults(converted);
        setActivePreviewIdx(0);
        if (failedMessages.length > 0) {
          setPartialWarning(
            `Some files could not be converted: ${failedMessages.join(' | ')}`
          );
        }
      }
    } catch (err) {
      if (isMountedRef.current) {
        setConversionError(toFriendlyErrorMessage(err));
      }
    } finally {
      if (isMountedRef.current) {
        setIsConverting(false);
      }
    }
  };

  const handleDownloadZip = async () => {
    if (results.length === 0 || isZipping) return;
    setIsZipping(true);
    try {
      await downloadItemsAsZip(results, `word_to_pdf_${Date.now()}.zip`);
    } catch (err) {
      setConversionError(toFriendlyErrorMessage(err, 'Could not create the ZIP archive.'));
    } finally {
      if (isMountedRef.current) {
        setIsZipping(false);
      }
    }
  };

  const totals = useMemo(() => {
    const totalPages = results.reduce((sum, item) => sum + (item.pageCount || 0), 0);
    const totalBytes = results.reduce((sum, item) => sum + (item.size || 0), 0);
    return { totalPages, totalBytes };
  }, [results]);

  const activeResult = results[activePreviewIdx] || results[0] || null;
  const cardBg = isDark ? 'rgba(255, 255, 255, 0.03)' : 'background.paper';

  const renderOptionButton = ({ selected, label, hint, onClick }) => (
    <Button
      type="button"
      variant={selected ? 'contained' : 'outlined'}
      onClick={onClick}
      disabled={isConverting}
      sx={{
        flex: '1 1 150px',
        py: 1.15,
        px: 1.75,
        borderRadius: 2.5,
        textTransform: 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        textAlign: 'left',
        borderColor: selected ? 'transparent' : 'divider',
        color: selected ? '#0a0f1e' : 'text.primary',
        bgcolor: selected ? accent : 'transparent',
        boxShadow: selected ? `0 6px 18px ${accent}40` : 'none',
        '&:hover': {
          borderColor: accent,
          bgcolor: selected ? accent : `${accent}12`,
        },
      }}
    >
      <Typography variant="body2" sx={{ fontWeight: 800, color: 'inherit', lineHeight: 1.25 }}>
        {label}
      </Typography>
      <Typography
        variant="caption"
        sx={{
          color: selected ? 'rgba(10, 15, 30, 0.78)' : 'text.secondary',
          fontWeight: 600,
          mt: 0.25,
          lineHeight: 1.2,
        }}
      >
        {hint}
      </Typography>
    </Button>
  );

  return (
    <ToolShell
      title="Word to PDF"
      seoTitle="Word to PDF Converter — Free Private DOCX to PDF | LyZov Tools"
      description="Convert Word (.docx) documents into clean, printable multi-page PDFs with live preview right in your browser."
      canonical="https://tools.lyzov.com/word-to-pdf"
      accentColor={accent}
      icon={FileOutput}
    >
      {/* Step 1: Choose Word Files */}
      {results.length === 0 && !isConverting && (
        <>
          <ToolDropzone
            title={
              files.length > 0
                ? 'Add more Word (.docx) documents'
                : 'Drop your Word (.docx) files here'
            }
            subtitle="Supports .docx up to 25 MB each (up to 15 files per batch)"
            buttonLabel={files.length > 0 ? 'Add More Files' : 'Choose Word Files'}
            accept={ACCEPT_WORD_FILES}
            multiple
            compact={files.length > 0}
            accentColor={accent}
            errorMessages={validationErrors}
            onClearErrors={() => setValidationErrors([])}
            onFilesSelected={handleFilesSelected}
          />

          <Alert
            severity="info"
            icon={<Info size={18} />}
            sx={{
              borderRadius: 2.5,
              border: '1px solid',
              borderColor: isDark ? 'rgba(245, 166, 35, 0.25)' : 'rgba(217, 119, 6, 0.22)',
              bgcolor: isDark ? 'rgba(245, 166, 35, 0.07)' : 'rgba(245, 166, 35, 0.08)',
              color: 'text.primary',
              '& .MuiAlert-icon': { color: accent },
            }}
          >
            <Typography variant="body2" sx={{ color: 'text.primary', lineHeight: 1.5 }}>
              Your <strong>.docx</strong> files convert privately in your browser — preserving layout,
              fonts, tables, and images without uploading to any server. If you have an older binary{' '}
              <strong>.doc</strong> file, open it in Microsoft Word or Google Docs and save it as{' '}
              <strong>.docx</strong> first.
            </Typography>
          </Alert>
        </>
      )}

      {/* Selected Files Queue + Step 2: Options + Step 3: Convert Action */}
      {files.length > 0 && results.length === 0 && !isConverting && (
        <>
          <ToolFileList
            items={files}
            title="Selected Word Documents"
            onRemoveItem={handleRemoveFile}
            onClearAll={handleClearAllFiles}
            renderMeta={() => 'Ready to convert'}
          />

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
            <Stack spacing={2.5}>
              <Box>
                <Typography
                  variant="subtitle1"
                  sx={{ fontWeight: 800, color: 'text.primary', mb: 0.3 }}
                >
                  PDF Options
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Choose your page size and output clarity before converting.
                </Typography>
              </Box>

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
                  Page Format
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.25 }}>
                  {PAGE_FORMAT_OPTIONS.map((opt) => (
                    <React.Fragment key={opt.value}>
                      {renderOptionButton({
                        selected: settings.pageFormat === opt.value,
                        label: opt.label,
                        hint: opt.hint,
                        onClick: () =>
                          setSettings((prev) => ({ ...prev, pageFormat: opt.value })),
                      })}
                    </React.Fragment>
                  ))}
                </Box>
              </Box>

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
                  Render Quality
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.25 }}>
                  {QUALITY_OPTIONS.map((opt) => (
                    <React.Fragment key={opt.value}>
                      {renderOptionButton({
                        selected: Number(settings.qualityScale) === opt.value,
                        label: opt.label,
                        hint: opt.hint,
                        onClick: () =>
                          setSettings((prev) => ({ ...prev, qualityScale: opt.value })),
                      })}
                    </React.Fragment>
                  ))}
                </Box>
              </Box>
            </Stack>
          </Paper>

          {conversionError && (
            <Alert
              severity="error"
              onClose={() => setConversionError('')}
              sx={{ borderRadius: 2.5 }}
            >
              {conversionError}
            </Alert>
          )}

          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: 1.5,
            }}
          >
            <Button
              type="button"
              variant="contained"
              size="large"
              startIcon={<FileOutput size={19} />}
              onClick={handleConvert}
              sx={{
                py: 1.35,
                px: 4,
                fontWeight: 800,
                fontSize: '0.98rem',
                textTransform: 'none',
                borderRadius: 2.5,
                color: '#0a0f1e',
                background: 'linear-gradient(135deg, #f5a623 0%, #fbbf24 100%)',
                boxShadow: '0 8px 24px rgba(245, 166, 35, 0.34)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #e5940c 0%, #f59e0b 100%)',
                },
              }}
            >
              {files.length === 1
                ? 'Convert to PDF'
                : `Convert ${files.length} Files to PDF`}
            </Button>

            <Button
              type="button"
              variant="outlined"
              size="large"
              startIcon={<RotateCcw size={17} />}
              onClick={handleReset}
              sx={{
                py: 1.35,
                px: 2.5,
                fontWeight: 700,
                textTransform: 'none',
                borderRadius: 2.5,
                color: 'text.secondary',
                borderColor: 'divider',
              }}
            >
              Start Over
            </Button>
          </Box>
        </>
      )}

      {/* Progress Bar during Conversion */}
      {isConverting && (
        <ToolProgress
          title={progressState.title}
          subtitle={progressState.subtitle}
          current={progressState.current}
          total={progressState.total}
          accentColor={accent}
        />
      )}

      {/* Step 4 & Step 5: Result Bar + Multi-File Switcher + Live PDF Preview */}
      {results.length > 0 && activeResult && (
        <Stack spacing={2.5}>
          <ToolResultBar
            title={
              results.length === 1
                ? 'Your PDF is ready to download'
                : `${results.length} PDFs are ready to download`
            }
            subtitle={`${totals.totalPages} ${
              totals.totalPages === 1 ? 'page' : 'pages'
            } · ${formatBytes(totals.totalBytes)}`}
            count={results.length}
            singleLabel="Download PDF"
            zipLabel="Download All (.ZIP)"
            resetLabel="Start Over"
            onDownloadSingle={() =>
              downloadBlob(results[0].blob, results[0].filename)
            }
            onDownloadAllZip={handleDownloadZip}
            onReset={handleReset}
            zipping={isZipping}
            warningMessage={partialWarning}
          />

          {conversionError && (
            <Alert
              severity="error"
              onClose={() => setConversionError('')}
              sx={{ borderRadius: 2.5 }}
            >
              {conversionError}
            </Alert>
          )}

          {/* File Switcher when multiple documents were converted */}
          {results.length > 1 && (
            <Paper
              elevation={0}
              sx={{
                p: { xs: 1.5, sm: 2 },
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: cardBg,
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 1,
                  mb: 1.25,
                }}
              >
                <Typography
                  variant="subtitle2"
                  sx={{ fontWeight: 700, color: 'text.primary' }}
                >
                  Preview Document ({activePreviewIdx + 1} of {results.length})
                </Typography>

                <Button
                  type="button"
                  size="small"
                  variant="outlined"
                  startIcon={<Download size={14} />}
                  onClick={() =>
                    downloadBlob(activeResult.blob, activeResult.filename)
                  }
                  sx={{
                    textTransform: 'none',
                    fontWeight: 700,
                    borderRadius: 2,
                    borderColor: 'divider',
                    color: accent,
                    '&:hover': {
                      borderColor: accent,
                      bgcolor: `${accent}12`,
                    },
                  }}
                >
                  Download {activeResult.filename}
                </Button>
              </Box>

              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {results.map((res, idx) => {
                  const selected = idx === activePreviewIdx;
                  return (
                    <Chip
                      key={res.id}
                      icon={<FileText size={14} />}
                      label={`${res.filename} (${res.pageCount}p · ${formatBytes(res.size)})`}
                      clickable
                      onClick={() => setActivePreviewIdx(idx)}
                      sx={{
                        fontWeight: selected ? 800 : 600,
                        maxWidth: '100%',
                        bgcolor: selected
                          ? accent
                          : isDark
                            ? 'rgba(255,255,255,0.06)'
                            : 'rgba(0,0,0,0.05)',
                        color: selected ? '#0a0f1e' : 'text.primary',
                        '& .MuiChip-icon': {
                          color: selected ? '#0a0f1e' : accent,
                        },
                        '&:hover': {
                          bgcolor: selected ? accent : `${accent}22`,
                        },
                      }}
                    />
                  );
                })}
              </Box>
            </Paper>
          )}

          {/* Live PDF Preview before download */}
          <PdfDocumentPreview
            pdfUrl={activeResult.previewUrl}
            title={`Live PDF Preview · ${activeResult.filename} · ${activeResult.pageCount} ${
              activeResult.pageCount === 1 ? 'page' : 'pages'
            } (${formatBytes(activeResult.size)})`}
            height={540}
          />
        </Stack>
      )}
    </ToolShell>
  );
}
