import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  InputAdornment,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import { Layers, Sparkles } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument } from 'pdf-lib';
import { AppContext } from '../../context/AppContext';
import ToolShell from '../../components/tools/ToolShell';
import ToolDropzone from '../../components/tools/ToolDropzone';
import ToolFileList from '../../components/tools/ToolFileList';
import ToolProgress from '../../components/tools/ToolProgress';
import ToolResultBar from '../../components/tools/ToolResultBar';
import { PdfDocumentPreview } from '../../components/tools/ToolPreview';
import {
  MAX_PDF_FILE_BYTES,
  cleanBaseName,
  formatBytes,
  toFriendlyErrorMessage,
  validateUploadedFiles,
} from '../../utils/fileValidation';
import { createUrlRegistry, downloadBlob } from '../../utils/zipUtils';

const MAX_MERGE_FILES = 30;

if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    '/pdf.worker.min.mjs',
    window.location.origin
  ).toString();
}

/**
 * Inspects a single PDF file using PDF.js to obtain page count and a lightweight page-1 thumbnail.
 */
async function inspectPdfFile(file) {
  const buffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
  let pdfDoc = null;

  try {
    pdfDoc = await loadingTask.promise;
    const pageCount = pdfDoc.numPages || 0;
    if (pageCount === 0) {
      throw new Error(`"${file.name}" has no pages.`);
    }

    let previewUrl = null;
    const page = await pdfDoc.getPage(1);
    try {
      const baseViewport = page.getViewport({ scale: 1 });
      const maxDim = Math.max(baseViewport.width || 1, baseViewport.height || 1);
      const scale = Math.min(0.45, 160 / maxDim);
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(viewport.width));
      canvas.height = Math.max(1, Math.round(viewport.height));
      const ctx = canvas.getContext('2d');

      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: ctx, viewport }).promise;
        previewUrl = canvas.toDataURL('image/png');
      }

      canvas.width = 0;
      canvas.height = 0;
    } finally {
      page.cleanup?.();
    }

    return {
      id:
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      name: file.name,
      size: file.size,
      kind: 'pdf',
      pageCount,
      previewUrl,
    };
  } catch (err) {
    if (err?.name === 'PasswordException' || /password/i.test(err?.message || '')) {
      throw new Error(
        `"${file.name}" is password-protected. Please unlock it first and upload the unlocked file.`
      );
    }
    throw new Error(
      `"${file.name}" could not be opened as a valid PDF. It may be corrupted or unsupported.`
    );
  } finally {
    if (pdfDoc) {
      try {
        await pdfDoc.destroy();
      } catch {
        // Ignore cleanup failures
      }
    }
  }
}

export default function MergePdfPage() {
  const { theme } = useContext(AppContext);
  const isDark = theme === 'dark';
  const accent = isDark ? '#00c9ff' : '#0284c7';

  const urlRegistryRef = useRef(null);
  const getUrlRegistry = () => {
    if (!urlRegistryRef.current) {
      urlRegistryRef.current = createUrlRegistry();
    }
    return urlRegistryRef.current;
  };

  const [items, setItems] = useState([]);
  const [outputName, setOutputName] = useState('merged_document');
  const [uploadErrors, setUploadErrors] = useState([]);
  const [processError, setProcessError] = useState('');
  const [inspecting, setInspecting] = useState({ active: false, current: 0, total: 0, name: '' });
  const [merging, setMerging] = useState({ active: false, current: 0, total: 0, name: '' });
  const [mergedResult, setMergedResult] = useState(null);

  useEffect(() => {
    return () => {
      urlRegistryRef.current?.revokeAll();
    };
  }, []);

  const clearMergedPreview = () => {
    urlRegistryRef.current?.revokeAll();
    setMergedResult(null);
  };

  const totalPages = useMemo(
    () => items.reduce((sum, item) => sum + (item.pageCount || 0), 0),
    [items]
  );

  const totalBytes = useMemo(
    () => items.reduce((sum, item) => sum + (item.size || 0), 0),
    [items]
  );

  const isBusy = inspecting.active || merging.active;

  const handleFilesSelected = async (fileList) => {
    setUploadErrors([]);
    setProcessError('');

    const remainingSlots = MAX_MERGE_FILES - items.length;
    if (remainingSlots <= 0) {
      setUploadErrors([
        `Maximum ${MAX_MERGE_FILES} PDFs can be merged in one batch. Remove a file to add another.`,
      ]);
      return;
    }

    const { valid, errors } = await validateUploadedFiles(fileList, {
      allowedTypes: ['pdf'],
      maxFileSizeBytes: MAX_PDF_FILE_BYTES,
      maxFiles: remainingSlots,
      formatLabel: 'PDF',
    });

    const nextErrors = [...errors];
    if (valid.length === 0) {
      setUploadErrors(nextErrors);
      return;
    }

    clearMergedPreview();
    setInspecting({ active: true, current: 0, total: valid.length, name: '' });

    const inspectedItems = [];
    for (let i = 0; i < valid.length; i++) {
      const { file } = valid[i];
      setInspecting({
        active: true,
        current: i + 1,
        total: valid.length,
        name: file.name,
      });

      try {
        const entry = await inspectPdfFile(file);
        inspectedItems.push(entry);
      } catch (err) {
        nextErrors.push(toFriendlyErrorMessage(err, `Could not read "${file.name}".`));
      }
    }

    setInspecting({ active: false, current: 0, total: 0, name: '' });
    if (nextErrors.length > 0) {
      setUploadErrors(nextErrors);
    }

    if (inspectedItems.length > 0) {
      setItems((prev) => [...prev, ...inspectedItems]);
    }
  };

  const handleMoveItem = (fromIdx, toIdx) => {
    if (toIdx < 0 || toIdx >= items.length) return;
    clearMergedPreview();
    setProcessError('');
    setItems((prev) => {
      const copy = [...prev];
      const [moved] = copy.splice(fromIdx, 1);
      copy.splice(toIdx, 0, moved);
      return copy;
    });
  };

  const handleRemoveItem = (idx) => {
    clearMergedPreview();
    setProcessError('');
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleClearAll = () => {
    clearMergedPreview();
    setItems([]);
    setUploadErrors([]);
    setProcessError('');
  };

  const handleMerge = async () => {
    if (items.length < 2 || isBusy) return;

    setProcessError('');
    setUploadErrors([]);
    clearMergedPreview();
    setMerging({ active: true, current: 0, total: items.length, name: items[0].name });

    try {
      const mergedDoc = await PDFDocument.create();

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        setMerging({
          active: true,
          current: i + 1,
          total: items.length,
          name: item.name,
        });

        const arrayBuffer = await item.file.arrayBuffer();
        let srcDoc;
        try {
          srcDoc = await PDFDocument.load(arrayBuffer);
        } catch (err) {
          if (/encrypted|password/i.test(err?.message || '')) {
            throw new Error(
              `"${item.name}" has encryption restrictions that prevent merging. Please unlock it first and try again.`
            );
          }
          throw new Error(`Could not merge "${item.name}". Please ensure it is a valid PDF.`);
        }

        const copiedPages = await mergedDoc.copyPages(srcDoc, srcDoc.getPageIndices());
        copiedPages.forEach((page) => mergedDoc.addPage(page));

        if (i < items.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      }

      const mergedBytes = await mergedDoc.save();
      const mergedBlob = new Blob([mergedBytes], { type: 'application/pdf' });
      const previewUrl = getUrlRegistry().create(mergedBlob);
      const safeStem = cleanBaseName(outputName, 'merged_document');
      const finalFilename = `${safeStem}.pdf`;

      setMergedResult({
        blob: mergedBlob,
        url: previewUrl,
        filename: finalFilename,
        pageCount: mergedDoc.getPageCount(),
        fileCount: items.length,
      });
    } catch (err) {
      setProcessError(toFriendlyErrorMessage(err, 'Failed to merge your PDFs. Please try again.'));
    } finally {
      setMerging({ active: false, current: 0, total: 0, name: '' });
    }
  };

  return (
    <ToolShell
      title="Merge PDF"
      seoTitle="Merge PDF Online Free | Combine Multiple PDFs | LyZov Tools"
      description="Combine multiple PDF documents into one organized PDF in just a few clicks."
      canonical="https://tools.lyzov.com/merge-pdf"
      accentColor={accent}
      icon={Layers}
    >
      {/* Step 1: Choose PDF Files */}
      <ToolDropzone
        title={items.length > 0 ? 'Add more PDF files' : 'Drop your PDF files here'}
        subtitle={`Supports up to ${MAX_MERGE_FILES} PDFs per merge · Max ${formatBytes(MAX_PDF_FILE_BYTES)} each`}
        buttonLabel={items.length > 0 ? 'Add More PDFs' : 'Choose PDF Files'}
        accept=".pdf,application/pdf"
        multiple={true}
        disabled={isBusy}
        accentColor={accent}
        compact={items.length > 0}
        errorMessages={uploadErrors}
        onClearErrors={() => setUploadErrors([])}
        onFilesSelected={handleFilesSelected}
      />

      {inspecting.active && (
        <ToolProgress
          title="Reading your PDFs..."
          subtitle={`Inspecting file ${inspecting.current} of ${inspecting.total}: ${inspecting.name}`}
          current={inspecting.current}
          total={inspecting.total}
          accentColor={accent}
        />
      )}

      {/* Step 2: Reorder File Queue + Summary + Options */}
      {items.length > 0 && !inspecting.active && (
        <>
          <ToolFileList
            items={items}
            title="PDFs to Merge (Top to Bottom Order)"
            allowReorder={true}
            disabled={isBusy}
            onMoveItem={handleMoveItem}
            onRemoveItem={handleRemoveItem}
            onClearAll={handleClearAll}
            renderMeta={(item) => `${item.pageCount} ${item.pageCount === 1 ? 'page' : 'pages'}`}
          />

          {/* Summary & Output Filename Option */}
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
              gap: 2,
            }}
          >
            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 1.5,
              }}
            >
              <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
                <Chip
                  label={`${items.length} ${items.length === 1 ? 'PDF' : 'PDFs'}`}
                  size="small"
                  sx={{ fontWeight: 700 }}
                />
                <Chip
                  label={`${totalPages} total ${totalPages === 1 ? 'page' : 'pages'}`}
                  size="small"
                  color="primary"
                  sx={{ fontWeight: 700 }}
                />
                <Chip
                  label={`${formatBytes(totalBytes)} total`}
                  size="small"
                  variant="outlined"
                  sx={{ fontWeight: 600 }}
                />
              </Box>

              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Use the arrow buttons above to change the page order.
              </Typography>
            </Box>

            <TextField
              label="Merged File Name"
              size="small"
              value={outputName}
              disabled={isBusy}
              onChange={(e) => {
                setOutputName(e.target.value);
                if (mergedResult) {
                  const safeStem = cleanBaseName(e.target.value, 'merged_document');
                  setMergedResult((prev) =>
                    prev ? { ...prev, filename: `${safeStem}.pdf` } : prev
                  );
                }
              }}
              placeholder="merged_document"
              slotProps={{
                input: {
                  endAdornment: <InputAdornment position="end">.pdf</InputAdornment>,
                },
              }}
              sx={{ maxWidth: 380 }}
            />
          </Paper>
        </>
      )}

      {/* Step 3: Main Action Button */}
      {items.length > 0 && !merging.active && !mergedResult && (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
          <Button
            variant="contained"
            size="large"
            disabled={items.length < 2 || isBusy}
            startIcon={<Sparkles size={18} />}
            onClick={handleMerge}
            sx={{
              py: 1.4,
              px: 4,
              fontWeight: 800,
              fontSize: '1rem',
              textTransform: 'none',
              borderRadius: 3,
              color: '#ffffff',
              background: 'linear-gradient(135deg, #00c9ff 0%, #0077ff 100%)',
              boxShadow: '0 8px 24px rgba(0, 201, 255, 0.32)',
              '&:hover': {
                background: 'linear-gradient(135deg, #00b8e6 0%, #0066dd 100%)',
              },
              '&.Mui-disabled': {
                opacity: 0.5,
                color: '#ffffff',
              },
            }}
          >
            Merge {items.length} PDFs ({totalPages} Pages)
          </Button>
          {items.length < 2 && (
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Add at least 1 more PDF to merge (2 or more files required).
            </Typography>
          )}
        </Box>
      )}

      {merging.active && (
        <ToolProgress
          title="Merging your PDFs..."
          subtitle={`Combining file ${merging.current} of ${merging.total}: ${merging.name}`}
          current={merging.current}
          total={merging.total}
          accentColor={accent}
        />
      )}

      {processError && (
        <Alert severity="error" onClose={() => setProcessError('')} sx={{ borderRadius: 2.5 }}>
          {processError}
        </Alert>
      )}

      {/* Step 4 & 5: Download + Preview */}
      {mergedResult && (
        <>
          <ToolResultBar
            title="Your merged PDF is ready"
            subtitle={`${mergedResult.fileCount} files combined · ${mergedResult.pageCount} pages · ${formatBytes(mergedResult.blob.size)}`}
            count={1}
            singleLabel="Download Merged PDF"
            resetLabel="Merge More PDFs"
            onDownloadSingle={() => downloadBlob(mergedResult.blob, mergedResult.filename)}
            onReset={handleClearAll}
          />

          <PdfDocumentPreview
            pdfUrl={mergedResult.url}
            title={`Merged PDF Preview (${mergedResult.pageCount} pages)`}
            height={500}
          />
        </>
      )}
    </ToolShell>
  );
}
