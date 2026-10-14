import React, { useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { Box, Typography, Chip, Tooltip, IconButton, Button } from '@mui/material';
import { Scissors, ShieldCheck, Sun, Moon } from 'lucide-react';
import { AppContext } from '../context/AppContext';
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
  const { theme, toggleTheme } = useContext(AppContext);

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
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default', color: 'text.primary' }}>
      {/* Sticky Navbar – identical to homepage */}
      <Box
        component="header"
        sx={{
          py: 2,
          px: { xs: 2, sm: 3, md: 4 },
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: theme === 'dark' ? 'rgba(7,10,18,0.85)' : 'rgba(255,255,255,0.88)',
          backdropFilter: 'blur(16px)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1.5,
          width: '100%',
        }}
      >
        <Link to="/" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: 12 }}>
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #00c9ff 0%, #a78bfa 100%)',
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
              sx={{ letterSpacing: '-0.5px', lineHeight: 1.1, fontSize: { xs: '1rem', sm: '1.15rem' }, color: 'text.primary' }}
            >
              LyZov <span style={{ color: theme === 'dark' ? '#00c9ff' : '#0284c7' }}>Cropper</span> Studio
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
              Batch PDF Label Cropper &amp; Thermal Printer
            </Typography>
          </Box>
        </Link>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Chip
            icon={<ShieldCheck size={14} color={theme === 'dark' ? '#00c9ff' : '#0284c7'} />}
            label="100% Client-Side • No Uploads to Server"
            size="small"
            sx={{
              bgcolor: theme === 'dark' ? 'rgba(0,201,255,0.1)' : 'rgba(2,132,199,0.1)',
              color: theme === 'dark' ? '#00c9ff' : '#0284c7',
              border: '1px solid',
              borderColor: theme === 'dark' ? 'rgba(0,201,255,0.25)' : 'rgba(2,132,199,0.25)',
              fontWeight: 600,
              display: { xs: 'none', md: 'inline-flex' },
            }}
          />

          <Button
            component={Link}
            to="/cropper"
            variant="contained"
            size="small"
            sx={{
              background: 'linear-gradient(135deg, #00c9ff 0%, #0077ff 100%)',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.8rem',
              borderRadius: 2,
              textTransform: 'none',
              px: 1.8,
              py: 0.6,
            }}
          >
            Open Cropper
          </Button>

          {/* Theme Toggle Button */}
          <Tooltip title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
            <IconButton
              type="button"
              onClick={toggleTheme}
              size="small"
              aria-label="Toggle light and dark theme"
              sx={{
                color: 'text.primary',
                bgcolor: theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: '10px',
                p: 0.8,
                transition: 'all 0.2s ease',
                '&:hover': {
                  bgcolor: theme === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
                  borderColor: theme === 'dark' ? '#00c9ff' : '#0284c7',
                },
              }}
            >
              {theme === 'dark' ? <Sun size={17} color="#f5a623" /> : <Moon size={17} color="#0284c7" />}
            </IconButton>
          </Tooltip>
        </Box>
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
