import React, { useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Box, Typography, Divider, Chip } from '@mui/material';
import { Scissors, ShieldCheck } from 'lucide-react';
import { AppContext } from '../context/AppContext';

const footerLinks = [
  { label: 'About Us', to: '/about' },
  { label: 'Blog & Guides', to: '/blog' },
  { label: 'How to Use', to: '/how-to-use' },
  { label: 'FAQ', to: '/faq' },
  { label: 'GST Tool ✦', to: '/gst-tool' },
  { label: 'Privacy Policy', to: '/privacy-policy' },
  { label: 'Terms & Conditions', to: '/terms' },
  { label: 'Disclaimer', to: '/disclaimer' },
  { label: 'Contact Us', to: '/contact' },
];

export default function Footer() {
  const location = useLocation();
  const { theme } = useContext(AppContext);

  const accentColor = theme === 'dark' ? '#00c9ff' : '#0284c7';
  const inactiveTextColor = theme === 'dark' ? '#94a3b8' : '#64748b';
  const hoverTextColor = theme === 'dark' ? '#f1f5f9' : '#0f172a';

  return (
    <Box
      component="footer"
      sx={{
        mt: 'auto',
        borderTop: '1px solid',
        borderColor: 'divider',
        bgcolor: theme === 'dark' ? 'rgba(7,10,18,0.95)' : 'rgba(255,255,255,0.95)',
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
              background: 'linear-gradient(135deg, #00c9ff 0%, #a78bfa 100%)',
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
              sx={{ letterSpacing: '-0.4px', lineHeight: 1.1, color: 'text.primary' }}
            >
              LyZov <span style={{ color: accentColor }}>Cropper</span> Studio
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Batch PDF Label Cropper &amp; Thermal Printer
            </Typography>
          </Box>
        </Box>

        <Chip
          icon={<ShieldCheck size={13} color={accentColor} />}
          label="100% Client-Side · No Server Uploads"
          size="small"
          sx={{
            bgcolor: theme === 'dark' ? 'rgba(0,201,255,0.08)' : 'rgba(2,132,199,0.08)',
            color: accentColor,
            border: '1px solid',
            borderColor: theme === 'dark' ? 'rgba(0,201,255,0.2)' : 'rgba(2,132,199,0.2)',
            fontWeight: 600,
            fontSize: '0.7rem',
          }}
        />
      </Box>

      <Divider sx={{ borderColor: 'divider', mb: 3 }} />

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
                color: isActive ? accentColor : inactiveTextColor,
                textDecoration: 'none',
                fontSize: '0.82rem',
                fontWeight: isActive ? 700 : 500,
                fontFamily: '"Plus Jakarta Sans", sans-serif',
                transition: 'color 0.2s',
                borderBottom: isActive ? `1px solid ${accentColor}` : '1px solid transparent',
                paddingBottom: '1px',
              }}
              onMouseEnter={e => { if (!isActive) e.target.style.color = hoverTextColor; }}
              onMouseLeave={e => { if (!isActive) e.target.style.color = inactiveTextColor; }}
            >
              {label}
            </Link>
          );
        })}
      </Box>

      <Divider sx={{ borderColor: 'divider', mb: 2.5 }} />

      {/* Copyright */}
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: 'block', textAlign: 'center', opacity: 0.8 }}
      >
        © {new Date().getFullYear()} LyZov Cropper Studio. All rights reserved. &nbsp;·&nbsp; Built for label professionals worldwide.
      </Typography>
    </Box>
  );
}
