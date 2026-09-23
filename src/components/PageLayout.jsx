import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Box, Typography, Chip } from '@mui/material';
import { Scissors, ShieldCheck } from 'lucide-react';
import Footer from './Footer';

/**
 * PageLayout – shared wrapper for all informational/legal pages.
 *
 * Props:
 *  - title       (string)  – browser <title> suffix
 *  - description (string)  – meta description content
 *  - children               – page body content
 */
export default function PageLayout({ title, description, children }) {
  useEffect(() => {
    const siteName = 'LyZov Cropper Studio';
    document.title = title ? `${title} | ${siteName}` : siteName;

    // Update or create meta description
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'description';
      document.head.appendChild(meta);
    }
    if (description) meta.setAttribute('content', description);

    // Scroll to top on navigation
    window.scrollTo(0, 0);
  }, [title, description]);

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', bgcolor: '#070a12' }}>
      {/* Sticky Navbar – identical to homepage */}
      <Box
        component="header"
        sx={{
          py: 2,
          px: { xs: 2, sm: 3, md: 4 },
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          bgcolor: 'rgba(7,10,18,0.85)',
          backdropFilter: 'blur(16px)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
        }}
      >
        <Link to="/" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: 12 }}>
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #00c9ff 0%, #ff6ec7 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(0,201,255,0.35)',
              flexShrink: 0,
            }}
          >
            <Scissors size={20} color="#ffffff" />
          </Box>
          <Box>
            <Typography
              variant="h6"
              fontWeight={800}
              sx={{ letterSpacing: '-0.5px', lineHeight: 1.1, fontSize: '1.15rem', color: '#f1f5f9' }}
            >
              LyZov <span style={{ color: '#00c9ff' }}>Cropper</span> Studio
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Batch PDF Label Cropper &amp; Thermal Printer
            </Typography>
          </Box>
        </Link>

        <Chip
          icon={<ShieldCheck size={14} color="#00c9ff" />}
          label="100% Client-Side • No Uploads to Server"
          size="small"
          sx={{
            bgcolor: 'rgba(0,201,255,0.1)',
            color: '#00c9ff',
            border: '1px solid rgba(0,201,255,0.25)',
            fontWeight: 600,
            display: { xs: 'none', sm: 'inline-flex' },
          }}
        />
      </Box>

      {/* Page Content */}
      <Box
        component="main"
        sx={{
          flex: 1,
          width: '100%',
          maxWidth: 860,
          mx: 'auto',
          px: { xs: 2, sm: 3, md: 4 },
          py: { xs: 4, md: 6 },
        }}
      >
        {children}
      </Box>

      <Footer />
    </Box>
  );
}
