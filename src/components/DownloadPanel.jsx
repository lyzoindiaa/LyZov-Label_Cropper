import React, { useContext, useState } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Divider,
} from '@mui/material';
import {
  Download,
  Printer,
  Eye,
  FileText,
  Archive,
  CheckCircle2,
  RotateCcw,
  Layers,
  Sparkles,
} from 'lucide-react';
import { AppContext } from '../context/AppContext';
import { mergePdfBlobs, printPdfBlob } from '../utils/pdfUtils';

export default function DownloadPanel() {
  const { croppedBlobs, setCroppedBlobs, user, setAuthModalMode, setAuthModalOpen, theme } = useContext(AppContext);
  const [previewItem, setPreviewItem] = useState(null);
  const [isZipping, setIsZipping] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  if (croppedBlobs.length === 0) {
    return (
      <Box
        sx={{
          p: 6,
          textAlign: 'center',
          bgcolor: theme === 'dark' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)',
          borderRadius: 4,
          border: '1px dashed',
          borderColor: 'divider',
        }}
      >
        <Archive size={48} color={theme === 'dark' ? '#00c9ff' : '#0284c7'} style={{ marginBottom: 16, opacity: 0.7 }} />
        <Typography variant="h6" fontWeight={600} gutterBottom>
          No Cropped Labels Yet
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 450, mx: 'auto', mb: 3 }}>
          Select a crop region in the viewer on the left and click <b>"Apply Crop to All PDFs"</b> to batch-crop all uploaded files.
        </Typography>
      </Box>
    );
  }

  // 1. Download as single merged continuous PDF
  const handleDownloadMergedPdf = async () => {
    setIsMerging(true);
    try {
      const mergedBlob = await mergePdfBlobs(croppedBlobs);
      saveAs(mergedBlob, `all_cropped_labels_${Date.now()}.pdf`);
    } catch (err) {
      console.error('Failed to merge PDFs', err);
      alert('Failed to generate merged PDF: ' + err.message);
    } finally {
      setIsMerging(false);
    }
  };

  // 2. Download all as ZIP archive
  const handleDownloadZip = async () => {
    setIsZipping(true);
    try {
      const zip = new JSZip();
      const folder = zip.folder('cropped_labels');
      croppedBlobs.forEach((item) => {
        const cleanName = item.name.replace(/\.pdf$/i, '');
        folder.file(`${cleanName}.pdf`, item.blob);
      });
      const content = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
      });
      saveAs(content, `cropped_labels_${Date.now()}.zip`);
    } catch (err) {
      console.error('Failed to generate ZIP archive', err);
      alert('Failed to generate ZIP archive: ' + err.message);
    } finally {
      setIsZipping(false);
    }
  };

  // 3. Download individual PDF
  const handleDownloadSingle = (item) => {
    const cleanName = item.name.replace(/\.pdf$/i, '');
    saveAs(item.blob, `${cleanName}.pdf`);
  };

  // 4. Print all labels sequentially
  const handlePrintAll = async () => {
    setIsPrinting(true);
    try {
      const mergedBlob = await mergePdfBlobs(croppedBlobs);
      printPdfBlob(mergedBlob);
    } catch (err) {
      console.error('Failed to print merged labels', err);
      alert('Failed to trigger print: ' + err.message);
    } finally {
      setIsPrinting(false);
    }
  };

  const handlePrintSingle = (item) => {
    printPdfBlob(item.blob);
  };

  return (
    <Box sx={{ mt: 3, width: '100%' }}>
      {/* Top Banner & Batch Actions */}
      <Box
        sx={{
          p: 3,
          mb: 4,
          borderRadius: 3,
          background: 'linear-gradient(135deg, rgba(0, 201, 255, 0.1) 0%, rgba(255, 110, 199, 0.1) 100%)',
          border: '1px solid rgba(0, 201, 255, 0.25)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              p: 1.5,
              borderRadius: 2,
              bgcolor: 'rgba(0, 201, 255, 0.2)',
              display: 'flex',
            }}
          >
            <CheckCircle2 size={28} color="#00c9ff" />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={700}>
              {croppedBlobs.length} {croppedBlobs.length === 1 ? 'Label' : 'Labels'} Ready
            </Typography>
            <Typography variant="body2" color="text.secondary">
              All PDF pages successfully cropped to your exact selection region.
            </Typography>
          </Box>
        </Box>

        {/* Action Buttons: Merged PDF, ZIP, and Print */}
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            startIcon={<Layers size={18} />}
            onClick={handleDownloadMergedPdf}
            disabled={isMerging}
            sx={{
              background: 'linear-gradient(135deg, #00c9ff 0%, #0072ff 100%)',
              color: '#ffffff',
              fontWeight: 700,
              boxShadow: '0 4px 14px rgba(0, 201, 255, 0.35)',
              textTransform: 'none',
              '&:hover': {
                background: 'linear-gradient(135deg, #00b4e6 0%, #0060db 100%)',
              },
            }}
          >
            {isMerging ? 'Merging PDF...' : 'Download Merged PDF (Multi-Page)'}
          </Button>

          <Button
            variant="contained"
            startIcon={<Archive size={18} />}
            onClick={handleDownloadZip}
            disabled={isZipping}
            sx={{
              background: 'linear-gradient(135deg, #92fe9d 0%, #00c9ff 100%)',
              color: '#081420',
              fontWeight: 700,
              textTransform: 'none',
              boxShadow: '0 4px 14px rgba(0, 201, 255, 0.25)',
            }}
          >
            {isZipping ? 'Archiving...' : 'Download All (.ZIP)'}
          </Button>

          <Button
            variant="contained"
            startIcon={<Printer size={18} />}
            onClick={handlePrintAll}
            disabled={isPrinting}
            sx={{
              background: 'linear-gradient(135deg, #00d68f 0%, #00b37a 100%)',
              color: '#0a0f1e',
              fontWeight: 700,
              textTransform: 'none',
              boxShadow: '0 4px 14px rgba(0, 214, 143, 0.35)',
            }}
          >
            {isPrinting ? 'Preparing Print...' : 'Print All Labels'}
          </Button>

          <Button
            variant="outlined"
            startIcon={<RotateCcw size={16} />}
            onClick={() => setCroppedBlobs([])}
            sx={{ color: 'text.secondary', borderColor: 'divider', textTransform: 'none' }}
          >
            Clear
          </Button>
        </Box>
      </Box>

      {/* Guest conversion banner from cropper-plan.md */}
      {!user && (
        <Box
          sx={{
            p: 2,
            mb: 3,
            borderRadius: 2.5,
            bgcolor: 'rgba(0, 201, 255, 0.08)',
            border: '1px solid rgba(0, 201, 255, 0.25)',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1.5,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Sparkles size={22} color="#00c9ff" />
            <Box>
              <Typography variant="body2" fontWeight={700} sx={{ color: '#00c9ff' }}>
                Save your settings and get unlimited crops, free for 30 days!
              </Typography>
              <Typography variant="caption" color="text.secondary">
                No credit card or payment required. Quick 10-second signup.
              </Typography>
            </Box>
          </Box>
          <Button
            size="small"
            variant="contained"
            onClick={() => {
              setAuthModalMode('auth');
              setAuthModalOpen(true);
            }}
            sx={{
              background: 'linear-gradient(135deg, #00c9ff 0%, #0077ff 100%)',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '0.8rem',
              borderRadius: 2,
              textTransform: 'none',
              px: 2,
              py: 0.6,
              boxShadow: '0 4px 14px rgba(0, 201, 255, 0.35)',
            }}
          >
            Start 30-Day Free Trial
          </Button>
        </Box>
      )}

      {/* Individual Cropped Cards */}
      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <FileText size={18} color="#00c9ff" /> Individual Files ({croppedBlobs.length})
      </Typography>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            md: 'repeat(3, 1fr)',
            lg: 'repeat(4, 1fr)',
          },
          gap: 2,
          width: '100%',
        }}
      >
        {croppedBlobs.map((item, index) => {
          const fileSizeKb = Math.round(item.blob.size / 1024);
          return (
            <Card
              key={index}
              sx={{
                bgcolor: theme === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 3,
                transition: 'all 0.2s ease',
                '&:hover': {
                  borderColor: 'rgba(0, 201, 255, 0.4)',
                  boxShadow: theme === 'dark' ? '0 8px 24px rgba(0, 0, 0, 0.3)' : '0 8px 24px rgba(0, 0, 0, 0.08)',
                  transform: 'translateY(-2px)',
                },
              }}
            >
              <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
                  <Box sx={{ overflow: 'hidden', pr: 1 }}>
                    <Typography variant="body1" fontWeight={600} noWrap title={item.name}>
                      {item.name}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                      <Chip
                        label="Thermal Ready"
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: '0.7rem',
                          bgcolor: 'rgba(0, 201, 255, 0.15)',
                          color: '#00c9ff',
                          fontWeight: 600,
                        }}
                      />
                      <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center' }}>
                        {fileSizeKb} KB
                      </Typography>
                    </Box>
                  </Box>
                </Box>

                <Divider sx={{ my: 1.5, borderColor: 'divider' }} />

                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                  <Tooltip title="Preview Cropped PDF">
                    <IconButton
                      size="small"
                      onClick={() => setPreviewItem(item)}
                      sx={{
                        color: theme === 'dark' ? '#00c9ff' : '#0284c7',
                        bgcolor: theme === 'dark' ? 'rgba(0, 201, 255, 0.08)' : 'rgba(2, 132, 199, 0.08)',
                        '&:hover': { bgcolor: theme === 'dark' ? 'rgba(0, 201, 255, 0.2)' : 'rgba(2, 132, 199, 0.18)' },
                      }}
                    >
                      <Eye size={16} />
                    </IconButton>
                  </Tooltip>

                  <Tooltip title="Print This Label">
                    <IconButton
                      size="small"
                      onClick={() => handlePrintSingle(item)}
                      sx={{
                        color: 'var(--gst-emerald, #00d68f)',
                        bgcolor: 'rgba(0, 214, 143, 0.08)',
                        '&:hover': { bgcolor: 'rgba(0, 214, 143, 0.2)' },
                      }}
                    >
                      <Printer size={16} />
                    </IconButton>
                  </Tooltip>

                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<Download size={14} />}
                    onClick={() => handleDownloadSingle(item)}
                    sx={{
                      fontSize: '0.75rem',
                      textTransform: 'none',
                      borderColor: 'divider',
                      '&:hover': { borderColor: '#00c9ff', color: '#00c9ff' },
                    }}
                  >
                    Download PDF
                  </Button>
                </Box>
              </CardContent>
            </Card>
          );
        })}
      </Box>

      {/* PDF Quick Preview Dialog */}
      <Dialog
        open={Boolean(previewItem)}
        onClose={() => setPreviewItem(null)}
        maxWidth="md"
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
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography component="div" variant="h6" fontWeight={600}>
            Preview: {previewItem?.name}.pdf
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {previewItem && (
              <>
                <Button
                  size="small"
                  startIcon={<Printer size={16} />}
                  onClick={() => handlePrintSingle(previewItem)}
                  variant="outlined"
                  sx={{ color: '#00d68f', borderColor: '#00d68f', textTransform: 'none' }}
                >
                  Print
                </Button>
                <Button
                  size="small"
                  startIcon={<Download size={16} />}
                  onClick={() => handleDownloadSingle(previewItem)}
                  variant="contained"
                  sx={{ bgcolor: theme === 'dark' ? '#00c9ff' : '#0284c7', color: '#ffffff', fontWeight: 600, textTransform: 'none' }}
                >
                  Download
                </Button>
              </>
            )}
          </Box>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0, height: '70vh', bgcolor: 'var(--canvas-bg)' }}>
          {previewItem && (
            <iframe
              src={URL.createObjectURL(previewItem.blob)}
              title="Preview PDF"
              width="100%"
              height="100%"
              style={{ border: 'none' }}
            />
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setPreviewItem(null)} sx={{ color: 'text.secondary', textTransform: 'none' }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
