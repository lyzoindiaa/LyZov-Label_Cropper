import React from 'react';
import { Link } from 'react-router-dom';
import { Box, Typography, Button, Chip } from '@mui/material';
import {
  Scissors,
  ShieldCheck,
  Zap,
  Globe,
  Sparkles,
  ArrowRight,
  Lock,
  Cpu,
  Layers,
  HeartHandshake,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import PageLayout from '../components/PageLayout';

const highlights = [
  {
    icon: <Scissors size={24} />,
    color: '#00c9ff',
    gradient: 'linear-gradient(135deg, #00c9ff 0%, #0284c7 100%)',
    bgTint: 'rgba(0, 201, 255, 0.06)',
    borderGlow: 'rgba(0, 201, 255, 0.25)',
    title: 'Precision Crop Engine',
    metric: 'Sub-Pixel Precision',
    body: 'Draw your crop region once on a reference page and the tool applies the exact same pixel-perfect coordinates across every PDF in your batch — no per-file adjustments needed.',
  },
  {
    icon: <ShieldCheck size={24} />,
    color: '#10b981',
    gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    bgTint: 'rgba(16, 185, 129, 0.06)',
    borderGlow: 'rgba(16, 185, 129, 0.25)',
    title: 'Client-Side Privacy',
    metric: '0 Bytes Uploaded',
    body: 'Every computation happens inside your browser memory. Your PDF invoices and labels never leave your device — no accounts, no cloud uploads, no third-party tracking.',
  },
  {
    icon: <Zap size={24} />,
    color: '#f59e0b',
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    bgTint: 'rgba(245, 158, 11, 0.06)',
    borderGlow: 'rgba(245, 158, 11, 0.25)',
    title: 'High Batch Throughput',
    metric: 'Dozens in Seconds',
    body: 'Process entire manifest batches in a single session. Export single labels directly to your thermal printer queue or download a compressed ZIP archive ready for dispatch.',
  },
  {
    icon: <Globe size={24} />,
    color: '#a855f7',
    gradient: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
    bgTint: 'rgba(168, 85, 247, 0.06)',
    borderGlow: 'rgba(168, 85, 247, 0.25)',
    title: 'Zero Software Install',
    metric: '100% Web Based',
    body: 'Runs seamlessly across Windows, macOS, Linux, and Chromebooks. No bulky desktop drivers, no Adobe Acrobat dependencies, and no annoying system updates.',
  },
];

const guarantees = [
  {
    title: 'In-Memory Only Processing',
    desc: 'PDF documents are held exclusively in browser heap memory during your session and disappear the instant you close or refresh the tab.',
    icon: <Cpu size={20} color="#00c9ff" />,
  },
  {
    title: 'No User Account or Paywall',
    desc: 'Full batch functionality is completely unlocked for independent sellers, small businesses, and enterprise logistics teams alike.',
    icon: <HeartHandshake size={20} color="#10b981" />,
  },
  {
    title: 'Thermal Standard Compatibility',
    desc: 'Coordinates adhere to standard 203 DPI and 300 DPI thermal print heads (4x6, 4x4, 3x2, and custom dimensions).',
    icon: <Layers size={20} color="#a855f7" />,
  },
];

export default function AboutPage() {
  return (
    <PageLayout
      title="About Us"
      description="Learn about LyZov Cropper Studio — a free, 100% client-side batch PDF label cropper built for shippers, e-commerce sellers, and logistics teams."
      maxWidth={1240}
    >
      {/* Hero Section */}
      <Box
        sx={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: { xs: 3, md: 4 },
          p: { xs: 3, sm: 4, md: 5 },
          mb: 5,
          background: 'radial-gradient(ellipse at top right, rgba(168,85,247,0.12) 0%, rgba(0,201,255,0.08) 50%, rgba(0,0,0,0) 80%), rgba(255,255,255,0.02)',
          border: '1px solid',
          borderColor: 'rgba(168,85,247,0.2)',
          boxShadow: '0 20px 40px -15px rgba(0,0,0,0.2)',
        }}
      >
        <Box sx={{ maxWidth: 860, position: 'relative', zIndex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', mb: 2 }}>
            <Chip
              icon={<Sparkles size={14} color="#a855f7" />}
              label="Engineering Mission"
              size="small"
              sx={{
                bgcolor: 'rgba(168,85,247,0.12)',
                color: '#c084fc',
                fontWeight: 700,
                border: '1px solid rgba(168,85,247,0.3)',
              }}
            />
            <Chip
              icon={<Lock size={14} color="#10b981" />}
              label="Zero Telemetry On Your Documents"
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
            Built for High-Speed Logistics,{' '}
            <span
              style={{
                background: 'linear-gradient(135deg, #a855f7 0%, #00c9ff 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Engineered for Total Privacy
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
            LyZov Cropper Studio was born out of a real problem faced by daily e-commerce shippers:
            spending tedious hours manually slicing shipping labels out of multi-page invoices.
            We built a zero-latency, 100% private in-browser tool that transforms the task into seconds.
          </Typography>

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
              },
            }}
          >
            Start Cropping Right Now
          </Button>
        </Box>
      </Box>

      {/* Problem vs Solution Split */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          gap: 3,
          mb: 6,
        }}
      >
        <Box
          sx={{
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'rgba(239, 68, 68, 0.25)',
            borderRadius: 3.5,
            p: 3.5,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <AlertCircle size={22} color="#ef4444" />
            <Typography variant="h6" fontWeight={800} sx={{ color: 'text.primary' }}>
              The Legacy Problem
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8, mb: 2 }}>
            Sellers receive label files embedded within large A4 invoices or courier PDFs. Using standard desktop PDF readers requires opening every single file, taking screenshots, manual cropping, pasting into photo editors, and praying that barcode clarity survives the compression.
          </Typography>
          <Typography variant="caption" sx={{ color: '#ef4444', fontWeight: 700 }}>
            • Slow, error-prone, risks barcode blurriness, and wastes valuable dispatch hours.
          </Typography>
        </Box>

        <Box
          sx={{
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'rgba(16, 185, 129, 0.3)',
            borderRadius: 3.5,
            p: 3.5,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <CheckCircle2 size={22} color="#10b981" />
            <Typography variant="h6" fontWeight={800} sx={{ color: 'text.primary' }}>
              The LyZov Solution
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8, mb: 2 }}>
            LyZov Cropper Studio lets you define a visual bounding box once. The tool applies mathematical coordinate mapping directly to the underlying vector stream of every PDF, generating crystal clear, native 300 DPI thermal labels without any raster degradation.
          </Typography>
          <Typography variant="caption" sx={{ color: '#10b981', fontWeight: 700 }}>
            • 100% vector fidelity, batch automation, instantaneous ZIP export, zero costs.
          </Typography>
        </Box>
      </Box>

      {/* 4 Pillars Grid (Full Width) */}
      <Box sx={{ mb: 7 }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" fontWeight={800} sx={{ letterSpacing: '-0.3px', color: 'text.primary', mb: 0.5 }}>
            Core Architecture Highlights
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Modern browser technology delivering desktop-class performance without server latency
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(4, 1fr)' },
            gap: 2.5,
          }}
        >
          {highlights.map((h) => (
            <Box
              key={h.title}
              sx={{
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 3.5,
                p: 3,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  borderColor: h.borderGlow,
                  transform: 'translateY(-4px)',
                  boxShadow: `0 16px 32px -10px ${h.borderGlow}`,
                },
              }}
            >
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 2.5,
                      background: h.gradient,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      boxShadow: `0 6px 16px ${h.borderGlow}`,
                    }}
                  >
                    {h.icon}
                  </Box>
                  <Chip
                    label={h.metric}
                    size="small"
                    sx={{
                      bgcolor: h.bgTint,
                      color: h.color,
                      fontWeight: 700,
                      fontSize: '0.7rem',
                      border: `1px solid ${h.borderGlow}`,
                    }}
                  />
                </Box>
                <Typography variant="h6" fontWeight={800} sx={{ mb: 1, color: 'text.primary', fontSize: '1.05rem' }}>
                  {h.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.75 }}>
                  {h.body}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Guarantees Box */}
      <Box
        sx={{
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 3.5,
          p: { xs: 3, sm: 4 },
          mb: 5,
        }}
      >
        <Typography variant="h5" fontWeight={800} sx={{ color: 'text.primary', mb: 1 }}>
          Our Three Non-Negotiable Guarantees
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          We hold our tools to the highest privacy and engineering standards.
        </Typography>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
            gap: 2.5,
          }}
        >
          {guarantees.map((g) => (
            <Box
              key={g.title}
              sx={{
                p: 2.5,
                borderRadius: 2.5,
                bgcolor: 'action.hover',
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 1 }}>
                {g.icon}
                <Typography fontWeight={700} sx={{ color: 'text.primary', fontSize: '0.95rem' }}>
                  {g.title}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.65 }}>
                {g.desc}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </PageLayout>
  );
}
