import React from 'react';
import { Link } from 'react-router-dom';
import { Box, Typography, Button, Chip } from '@mui/material';
import {
  Upload,
  MousePointer2,
  Crop,
  Download,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Zap,
  Sliders,
  Target,
  Maximize2,
  FileCheck,
  Printer,
} from 'lucide-react';
import PageLayout from '../components/PageLayout';

const steps = [
  {
    number: '01',
    badge: 'Step 1: Input',
    gradient: 'linear-gradient(135deg, #00c9ff 0%, #0284c7 100%)',
    bgTint: 'rgba(0, 201, 255, 0.05)',
    borderGlow: 'rgba(0, 201, 255, 0.25)',
    iconColor: '#00c9ff',
    icon: <Upload size={26} />,
    title: 'Upload Your PDF Files',
    body: 'Click the upload zone in the sidebar or drag and drop PDFs directly from your computer. You can queue multiple single or multi-page PDF documents simultaneously. Every file is parsed locally in real time.',
    keyPoints: ['Batch drag & drop', 'Instant zero-upload parsing', 'Multi-file queue support'],
  },
  {
    number: '02',
    badge: 'Step 2: Inspect',
    gradient: 'linear-gradient(135deg, #38bdf8 0%, #6366f1 100%)',
    bgTint: 'rgba(99, 102, 241, 0.05)',
    borderGlow: 'rgba(99, 102, 241, 0.25)',
    iconColor: '#818cf8',
    icon: <MousePointer2 size={26} />,
    title: 'Preview & Calibrate Canvas',
    body: 'The preview canvas renders the first PDF with sub-pixel clarity. Use zoom, pan, and page controls to inspect label margins, barcodes, and borders before committing your crop rectangle.',
    keyPoints: ['Adaptive zoom & pan', 'Page carousel switcher', 'Retina canvas rendering'],
  },
  {
    number: '03',
    badge: 'Step 3: Define',
    gradient: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)',
    bgTint: 'rgba(168, 85, 247, 0.05)',
    borderGlow: 'rgba(168, 85, 247, 0.25)',
    iconColor: '#c084fc',
    icon: <Crop size={26} />,
    title: 'Draw the Crop Region',
    body: 'Click and drag a box around the exact label area. Use interactive corner handles to resize, or fine-tune exact millimeters and pixel coordinates in the sidebar input fields.',
    keyPoints: ['Visual bounding box', 'Direct coordinate inputs', 'Applied to all batch files'],
  },
  {
    number: '04',
    badge: 'Step 4: Output',
    gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    bgTint: 'rgba(16, 185, 129, 0.05)',
    borderGlow: 'rgba(16, 185, 129, 0.25)',
    iconColor: '#34d399',
    icon: <Download size={26} />,
    title: 'Batch Process & Export',
    body: 'Hit "Crop All Files" to instantly extract and rebuild clean PDFs in memory. Review generated output thumbnails, print single labels, or download the entire batch in a zipped package.',
    keyPoints: ['Instant memory export', 'One-click ZIP download', 'Thermal printer ready'],
  },
];

const tips = [
  {
    icon: <Target size={22} color="#00c9ff" />,
    title: 'Consistent Source Dimensions',
    body: 'Crop coordinates are applied in absolute page units. For ideal batch results, verify your invoices or manifests share standard page dimensions (such as standard 4x6 or A4).',
    tag: 'Accuracy',
  },
  {
    icon: <Zap size={22} color="#f59e0b" />,
    title: 'Test First with 1 File',
    body: 'Before running a large batch of 50+ PDFs, draw your crop area and test with a single file to confirm margins and barcode clarity before batch processing.',
    tag: 'Workflow',
  },
  {
    icon: <Maximize2 size={22} color="#a855f7" />,
    title: 'Zoom In for Millimeter Snapping',
    body: 'Use canvas zoom before drawing. This makes aligning selection borders around thermal label cut lines much faster and avoids clipping critical barcodes.',
    tag: 'Precision',
  },
  {
    icon: <Sliders size={22} color="#10b981" />,
    title: 'Manual Coordinate Tweaking',
    body: 'If you have an exact shipping label specification from DHL, FedEx, or Amazon, enter the exact X, Y, Width, and Height numbers in the sidebar for 100% precision.',
    tag: 'Pro Feature',
  },
];

const printers = [
  'Zebra ZD420 / ZP450',
  'Munbyn 941 / RealWriter',
  'Rollo Wireless & USB',
  'Brother QL Series',
  'Dymo 4XL',
  'Standard Desktop Inkjet/Laser',
];

export default function HowToUsePage() {
  return (
    <PageLayout
      title="How to Use"
      description="Step-by-step interactive guide to using LyZov Cropper Studio: upload PDFs, calibrate coordinates, and download batch-cropped labels ready for thermal printing."
      maxWidth={1240}
    >
      {/* Hero Header Banner */}
      <Box
        sx={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: { xs: 3, md: 4 },
          p: { xs: 3, sm: 4, md: 5 },
          mb: 5,
          background: 'radial-gradient(ellipse at top left, rgba(0,201,255,0.12) 0%, rgba(168,85,247,0.08) 50%, rgba(0,0,0,0) 80%), rgba(255,255,255,0.02)',
          border: '1px solid',
          borderColor: 'rgba(0,201,255,0.2)',
          boxShadow: '0 20px 40px -15px rgba(0,0,0,0.2)',
        }}
      >
        <Box sx={{ maxWidth: 840, position: 'relative', zIndex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', mb: 2 }}>
            <Chip
              icon={<Sparkles size={14} color="#00c9ff" />}
              label="Interactive Workflow Guide"
              size="small"
              sx={{
                bgcolor: 'rgba(0,201,255,0.12)',
                color: '#00c9ff',
                fontWeight: 700,
                border: '1px solid rgba(0,201,255,0.3)',
              }}
            />
            <Chip
              icon={<ShieldCheck size={14} color="#10b981" />}
              label="Zero Server Uploads • 100% Private"
              size="small"
              sx={{
                bgcolor: 'rgba(16,185,129,0.12)',
                color: '#10b981',
                fontWeight: 700,
                border: '1px solid rgba(16,185,129,0.3)',
              }}
            />
          </Box>

          <Typography
            component="h1"
            variant="h3"
            fontWeight={900}
            sx={{
              letterSpacing: '-1px',
              color: 'text.primary',
              fontSize: { xs: '1.85rem', sm: '2.4rem', md: '2.85rem' },
              lineHeight: 1.15,
              mb: 2,
            }}
          >
            Master Batch Label Cropping in{' '}
            <span
              style={{
                background: 'linear-gradient(135deg, #00c9ff 0%, #a855f7 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              4 Simple Steps
            </span>
          </Typography>

          <Typography
            color="text.secondary"
            sx={{
              fontSize: { xs: '0.95rem', md: '1.1rem' },
              lineHeight: 1.7,
              maxWidth: 720,
              mb: 3,
            }}
          >
            Transform full-page multi-order PDF invoices into pristine, single-label cutouts formatted
            for high-speed thermal printers — completely client-side in seconds.
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Button
              component={Link}
              to="/"
              variant="contained"
              endIcon={<ArrowRight size={18} />}
              sx={{
                background: 'linear-gradient(135deg, #00c9ff 0%, #0284c7 100%)',
                color: '#000',
                fontWeight: 800,
                px: 3,
                py: 1.2,
                borderRadius: 2.5,
                textTransform: 'none',
                boxShadow: '0 8px 24px rgba(0,201,255,0.35)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #38bdf8 0%, #0369a1 100%)',
                  boxShadow: '0 10px 30px rgba(0,201,255,0.5)',
                },
              }}
            >
              Open Cropper Studio
            </Button>
            <Button
              component={Link}
              to="/faq"
              variant="outlined"
              sx={{
                borderColor: 'divider',
                color: 'text.primary',
                fontWeight: 600,
                px: 2.5,
                py: 1.2,
                borderRadius: 2.5,
                textTransform: 'none',
                '&:hover': {
                  borderColor: 'text.secondary',
                  bgcolor: 'action.hover',
                },
              }}
            >
              Read Troubleshooting FAQ
            </Button>
          </Box>
        </Box>
      </Box>

      {/* 4 Steps Grid (Full Width Responsive Grid) */}
      <Box sx={{ mb: 7 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box>
            <Typography variant="h5" fontWeight={800} sx={{ letterSpacing: '-0.3px', color: 'text.primary' }}>
              The Studio Processing Pipeline
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Step-by-step visual blueprint from file drop to thermal print queue
            </Typography>
          </Box>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
            gap: 2.5,
          }}
        >
          {steps.map((step) => (
            <Box
              key={step.number}
              sx={{
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 3.5,
                p: 3,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
                overflow: 'hidden',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  borderColor: step.borderGlow,
                  transform: 'translateY(-4px)',
                  boxShadow: `0 16px 32px -10px ${step.borderGlow}`,
                },
              }}
            >
              {/* Subtle top background highlight */}
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 4,
                  background: step.gradient,
                }}
              />

              <Box>
                {/* Header row: Step chip & Big number */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
                  <Chip
                    label={step.badge}
                    size="small"
                    sx={{
                      bgcolor: step.bgTint,
                      color: step.iconColor,
                      fontWeight: 700,
                      fontSize: '0.72rem',
                      border: `1px solid ${step.borderGlow}`,
                    }}
                  />
                  <Typography
                    variant="h4"
                    fontWeight={900}
                    sx={{
                      color: 'text.secondary',
                      opacity: 0.25,
                      fontFamily: 'monospace',
                    }}
                  >
                    {step.number}
                  </Typography>
                </Box>

                {/* Icon roundel */}
                <Box
                  sx={{
                    width: 52,
                    height: 52,
                    borderRadius: 3,
                    background: step.gradient,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    mb: 2,
                    boxShadow: `0 8px 18px ${step.borderGlow}`,
                  }}
                >
                  {step.icon}
                </Box>

                {/* Title & Body */}
                <Typography variant="h6" fontWeight={800} sx={{ mb: 1.25, color: 'text.primary', lineHeight: 1.25 }}>
                  {step.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.75, mb: 2.5 }}>
                  {step.body}
                </Typography>
              </Box>

              {/* Checklist bullets */}
              <Box sx={{ pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                {step.keyPoints.map((pt) => (
                  <Box key={pt} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
                    <CheckCircle2 size={14} color={step.iconColor} style={{ flexShrink: 0 }} />
                    <Typography variant="caption" sx={{ color: 'text.primary', fontWeight: 600 }}>
                      {pt}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Pro Tips Section (Modern 4-Column Grid) */}
      <Box sx={{ mb: 7 }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" fontWeight={800} sx={{ letterSpacing: '-0.3px', color: 'text.primary', mb: 0.5 }}>
            Pro-Tips for Flawless Printing
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Recommended settings and best practices used by high-volume e-commerce shippers
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(4, 1fr)' },
            gap: 2.5,
          }}
        >
          {tips.map((tip) => (
            <Box
              key={tip.title}
              sx={{
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 3,
                p: 2.5,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.25s ease',
                '&:hover': {
                  borderColor: 'rgba(0,201,255,0.3)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
                },
              }}
            >
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 2,
                      bgcolor: 'action.hover',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {tip.icon}
                  </Box>
                  <Chip
                    label={tip.tag}
                    size="small"
                    sx={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      height: 22,
                      bgcolor: 'action.hover',
                      color: 'text.secondary',
                    }}
                  />
                </Box>
                <Typography fontWeight={700} sx={{ color: 'text.primary', mb: 1, fontSize: '0.95rem' }}>
                  {tip.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.65 }}>
                  {tip.body}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Hardware & Compatibility Callout */}
      <Box
        sx={{
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 3.5,
          p: { xs: 3, sm: 4 },
          mb: 6,
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: { xs: 'flex-start', md: 'center' },
          justifyContent: 'space-between',
          gap: 3,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
          <Box
            sx={{
              width: 52,
              height: 52,
              borderRadius: 3,
              bgcolor: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#10b981',
              flexShrink: 0,
            }}
          >
            <Printer size={26} />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={800} sx={{ color: 'text.primary', mb: 0.5 }}>
              Universal Hardware Compatibility
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 560 }}>
              Exported PDFs follow standardized vector dimensions compatible with any direct thermal or thermal transfer printer:
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, maxWidth: { xs: '100%', md: 450 } }}>
          {printers.map((p) => (
            <Chip
              key={p}
              label={p}
              size="small"
              icon={<FileCheck size={13} color="#10b981" />}
              sx={{
                bgcolor: 'action.hover',
                fontWeight: 600,
                fontSize: '0.75rem',
                border: '1px solid',
                borderColor: 'divider',
              }}
            />
          ))}
        </Box>
      </Box>
    </PageLayout>
  );
}
