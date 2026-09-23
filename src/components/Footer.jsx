import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Box, Typography, Divider, Chip } from '@mui/material';
import { Scissors, ShieldCheck } from 'lucide-react';

const footerLinks = [
  { label: 'About Us', to: '/about' },
  { label: 'How to Use', to: '/how-to-use' },
  { label: 'FAQ', to: '/faq' },
  { label: 'Privacy Policy', to: '/privacy-policy' },
  { label: 'Terms & Conditions', to: '/terms' },
  { label: 'Disclaimer', to: '/disclaimer' },
  { label: 'Contact Us', to: '/contact' },
];

export default function Footer() {
  const location = useLocation();

  return (
    <Box
      component="footer"
      sx={{
        mt: 'auto',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        bgcolor: 'rgba(7,10,18,0.9)',
        backdropFilter: 'blur(16px)',
        px: { xs: 2, sm: 4, md: 6 },
        py: { xs: 4, md: 5 },
      }}
    >
      {/* Branding row */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'flex-start', sm: 'center' },
          justifyContent: 'space-between',
          gap: 2,
          mb: 3,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #00c9ff 0%, #ff6ec7 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(0,201,255,0.3)',
            }}
          >
            <Scissors size={16} color="#ffffff" />
          </Box>
          <Box>
            <Typography
              variant="body1"
              fontWeight={800}
              sx={{ letterSpacing: '-0.4px', lineHeight: 1.1 }}
            >
              LyZov <span style={{ color: '#00c9ff' }}>Cropper</span> Studio
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Batch PDF Label Cropper &amp; Thermal Printer
            </Typography>
          </Box>
        </Box>

        <Chip
          icon={<ShieldCheck size={13} color="#00c9ff" />}
          label="100% Client-Side · No Server Uploads"
          size="small"
          sx={{
            bgcolor: 'rgba(0,201,255,0.08)',
            color: '#00c9ff',
            border: '1px solid rgba(0,201,255,0.2)',
            fontWeight: 600,
            fontSize: '0.7rem',
          }}
        />
      </Box>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.07)', mb: 3 }} />

      {/* Navigation links */}
      <Box
        component="nav"
        aria-label="Footer navigation"
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: { xs: 1.5, sm: 2 },
          mb: 3,
          justifyContent: { xs: 'flex-start', sm: 'center' },
        }}
      >
        {footerLinks.map(({ label, to }) => {
          const isActive = location.pathname === to;
          return (
            <Link
              key={to}
              to={to}
              style={{
                color: isActive ? '#00c9ff' : '#94a3b8',
                textDecoration: 'none',
                fontSize: '0.82rem',
                fontWeight: isActive ? 700 : 500,
                fontFamily: '"Plus Jakarta Sans", sans-serif',
                transition: 'color 0.2s',
                borderBottom: isActive ? '1px solid rgba(0,201,255,0.5)' : '1px solid transparent',
                paddingBottom: '1px',
              }}
              onMouseEnter={e => { if (!isActive) e.target.style.color = '#f1f5f9'; }}
              onMouseLeave={e => { if (!isActive) e.target.style.color = '#94a3b8'; }}
            >
              {label}
            </Link>
          );
        })}
      </Box>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.05)', mb: 2.5 }} />

      {/* Copyright */}
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: 'block', textAlign: 'center', opacity: 0.7 }}
      >
        © {new Date().getFullYear()} LyZov Cropper Studio. All rights reserved. &nbsp;·&nbsp; Built for label professionals worldwide.
      </Typography>
    </Box>
  );
}
