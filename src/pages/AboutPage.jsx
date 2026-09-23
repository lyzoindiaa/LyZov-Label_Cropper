import React from 'react';
import { Box, Typography, Divider } from '@mui/material';
import { Scissors, ShieldCheck, Zap, Globe } from 'lucide-react';
import PageLayout from '../components/PageLayout';

const highlights = [
  {
    icon: <Scissors size={22} color="#00c9ff" />,
    title: 'Precision Crop Engine',
    body: 'Draw your crop region once on a reference page and the tool applies the exact same pixel-perfect coordinates across every PDF in your batch — no per-file adjustments needed.',
  },
  {
    icon: <ShieldCheck size={22} color="#00c9ff" />,
    title: 'Completely Private by Design',
    body: 'Every computation happens inside your browser. Your PDF files never leave your device — no accounts, no cloud uploads, no third-party processing, ever.',
  },
  {
    icon: <Zap size={22} color="#ff6ec7" />,
    title: 'Built for Throughput',
    body: 'Process dozens of PDFs in a single session and download them as individual files or a convenient ZIP archive — ready to hand off to any thermal or label printer.',
  },
  {
    icon: <Globe size={22} color="#ff6ec7" />,
    title: 'Works Anywhere, No Install',
    body: 'LyZov Cropper Studio is a pure browser-based web app. Open it on any modern browser on any operating system — nothing to install, nothing to update.',
  },
];

export default function AboutPage() {
  return (
    <PageLayout
      title="About Us"
      description="Learn about LyZov Cropper Studio — a free, 100% client-side batch PDF label cropper and thermal printer tool built for label professionals worldwide."
    >
      {/* Page Heading */}
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
          About LyZov Cropper Studio
        </Typography>
        <Typography color="text.secondary" sx={{ lineHeight: 1.75, maxWidth: 640 }}>
          LyZov Cropper Studio is a free, browser-based tool designed for anyone who regularly
          works with shipping labels, inventory stickers, or any PDF document that needs
          consistent, repeatable cropping across a large batch of files.
        </Typography>
      </Box>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.07)', mb: 4 }} />

      {/* What We Do */}
      <Box sx={{ mb: 5 }}>
        <Typography variant="h5" fontWeight={700} sx={{ mb: 2, color: '#f1f5f9' }}>
          What We Do
        </Typography>
        <Typography color="text.secondary" sx={{ lineHeight: 1.8, mb: 2 }}>
          Many e-commerce sellers, warehouse operators, and print-on-demand businesses receive
          PDF label sheets where only a portion of each page contains the actual label. Manually
          cropping each file is tedious, error-prone, and time-consuming — especially at scale.
        </Typography>
        <Typography color="text.secondary" sx={{ lineHeight: 1.8 }}>
          LyZov Cropper Studio solves this by letting you define the crop region visually once
          on a preview canvas, then automatically extracting that same region from every uploaded
          PDF. The resulting cropped PDFs are ready for direct printing — individually or as a
          batch ZIP.
        </Typography>
      </Box>

      {/* Highlights grid */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
          gap: 2.5,
          mb: 5,
        }}
      >
        {highlights.map(({ icon, title, body }) => (
          <Box
            key={title}
            sx={{
              bgcolor: '#0d131f',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 3,
              p: 3,
              display: 'flex',
              flexDirection: 'column',
              gap: 1.5,
              transition: 'border-color 0.25s',
              '&:hover': { borderColor: 'rgba(0,201,255,0.25)' },
            }}
          >
            {icon}
            <Typography fontWeight={700} sx={{ color: '#f1f5f9' }}>
              {title}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
              {body}
            </Typography>
          </Box>
        ))}
      </Box>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.07)', mb: 4 }} />

      {/* Our Commitment */}
      <Box sx={{ mb: 5 }}>
        <Typography variant="h5" fontWeight={700} sx={{ mb: 2, color: '#f1f5f9' }}>
          Our Commitment
        </Typography>
        <Typography color="text.secondary" sx={{ lineHeight: 1.8, mb: 2 }}>
          We built this tool because we believe professional-grade utilities should be accessible
          to everyone — not locked behind subscriptions or desktop installs. LyZov Cropper Studio
          is and will always be free to use in your browser.
        </Typography>
        <Typography color="text.secondary" sx={{ lineHeight: 1.8 }}>
          Privacy is not an afterthought. Because the tool runs entirely in your browser, we have
          no technical ability to access, view, or store your documents. We do not collect any
          personally identifiable information from your files.
        </Typography>
      </Box>
    </PageLayout>
  );
}
