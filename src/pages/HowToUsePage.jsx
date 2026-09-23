import React from 'react';
import { Box, Typography, Divider } from '@mui/material';
import { Upload, MousePointer2, Crop, Download } from 'lucide-react';
import PageLayout from '../components/PageLayout';

const steps = [
  {
    number: '01',
    icon: <Upload size={24} color="#00c9ff" />,
    title: 'Upload Your PDF Files',
    body: `Click the upload area in the left sidebar — or drag and drop files directly onto it. You can upload multiple PDFs at once. Each file must be a valid PDF document. LyZov Cropper Studio supports single-page and multi-page PDFs, and will process the first page of each file as the label source.`,
  },
  {
    number: '02',
    icon: <MousePointer2 size={24} color="#00c9ff" />,
    title: 'Preview & Navigate Pages',
    body: `Once uploaded, a preview of the first PDF will appear in the main canvas area on the right. Use the page navigation controls to browse pages if you want to find the best reference page. The canvas scales to fit your screen automatically — you can also zoom in for precision.`,
  },
  {
    number: '03',
    icon: <Crop size={24} color="#ff6ec7" />,
    title: 'Draw the Crop Region',
    body: `Click and drag on the canvas to draw a rectangle over the area you want to keep — typically the label content. The selection box is resizable and repositionable; you can fine-tune the coordinates in the sidebar fields for pixel-level accuracy. This crop region will be applied identically to every PDF in your batch.`,
  },
  {
    number: '04',
    icon: <Download size={24} color="#ff6ec7" />,
    title: 'Process & Download',
    body: `Click the "Crop All Files" button in the sidebar to process the entire batch. Once complete, switch to the "Download & Print" tab to review the cropped thumbnails. Download files individually or download them all as a single ZIP archive. The output PDFs are ready to send directly to any label or thermal printer.`,
  },
];

const tips = [
  {
    title: 'Use a consistent source template',
    body: 'The crop coordinates are applied in absolute page units. For best results, all PDFs in a batch should have the same page dimensions and label position.',
  },
  {
    title: 'Check with a single file first',
    body: 'Before processing your entire batch, test the crop region on one file and verify the output looks correct. This saves time if an adjustment is needed.',
  },
  {
    title: 'Zoom in for precision',
    body: 'Use the zoom control on the preview canvas to enlarge the view before drawing your selection. This makes it much easier to align the crop region precisely with label borders.',
  },
  {
    title: 'Use the numeric fields for accuracy',
    body: 'After drawing the selection, you can manually type precise X, Y, Width, and Height values in the sidebar to set an exact crop region — useful when you know the dimensions from your label template spec.',
  },
];

export default function HowToUsePage() {
  return (
    <PageLayout
      title="How to Use"
      description="Step-by-step guide to using LyZov Cropper Studio: upload PDFs, draw a crop region, and download batch-cropped label PDFs — all in your browser."
    >
      <Box sx={{ mb: 5 }}>
        <Typography
          component="h1"
          variant="h4"
          fontWeight={800}
          sx={{
            letterSpacing: '-0.5px',
            background: 'linear-gradient(135deg, #f1f5f9 0%, #94a3b8 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            mb: 1.5,
          }}
        >
          How to Use LyZov Cropper Studio
        </Typography>
        <Typography color="text.secondary" sx={{ lineHeight: 1.75, maxWidth: 620 }}>
          Follow these four steps to go from raw PDF files to precision-cropped, print-ready
          label PDFs — all without leaving your browser.
        </Typography>
      </Box>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.07)', mb: 4 }} />

      {/* Steps */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mb: 6 }}>
        {steps.map(({ number, icon, title, body }) => (
          <Box
            key={number}
            sx={{
              bgcolor: '#0d131f',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 3,
              p: 3,
              display: 'flex',
              gap: 2.5,
              alignItems: 'flex-start',
              transition: 'border-color 0.25s',
              '&:hover': { borderColor: 'rgba(0,201,255,0.2)' },
            }}
          >
            {/* Step number */}
            <Box
              sx={{
                minWidth: 42,
                height: 42,
                borderRadius: '10px',
                background: 'linear-gradient(135deg, rgba(0,201,255,0.15) 0%, rgba(255,110,199,0.1) 100%)',
                border: '1px solid rgba(0,201,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Typography fontWeight={800} sx={{ color: '#00c9ff', fontSize: '0.8rem' }}>
                {number}
              </Typography>
            </Box>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
                {icon}
                <Typography fontWeight={700} sx={{ color: '#f1f5f9' }}>
                  {title}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8 }}>
                {body}
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.07)', mb: 4 }} />

      {/* Tips */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" fontWeight={700} sx={{ color: '#f1f5f9', mb: 3 }}>
          Tips for Best Results
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
            gap: 2,
          }}
        >
          {tips.map(({ title, body }) => (
            <Box
              key={title}
              sx={{
                bgcolor: 'rgba(0,201,255,0.04)',
                border: '1px solid rgba(0,201,255,0.12)',
                borderRadius: 2.5,
                p: 2.5,
                transition: 'border-color 0.25s',
                '&:hover': { borderColor: 'rgba(0,201,255,0.25)' },
              }}
            >
              <Typography
                fontWeight={700}
                sx={{ color: '#00c9ff', mb: 0.75, fontSize: '0.9rem' }}
              >
                {title}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                {body}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </PageLayout>
  );
}
