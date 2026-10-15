import React, { useEffect, useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Box, Typography, Chip, Tooltip, IconButton, Button } from '@mui/material';
import { Scissors, ShieldCheck, Sun, Moon, ArrowRight, Sparkles } from 'lucide-react';
import { AppContext } from '../context/AppContext';
import Footer from './Footer';

const NAV_PAGES = [
  { label: 'Blog & Guides', path: '/blog' },
  { label: 'How to Use', path: '/how-to-use' },
  { label: 'FAQ', path: '/faq' },
  { label: 'About Us', path: '/about' },
  { label: 'Contact', path: '/contact' },
  { label: 'Privacy Policy', path: '/privacy-policy' },
  { label: 'Terms', path: '/terms' },
  { label: 'Disclaimer', path: '/disclaimer' },
];

/**
 * PageLayout – shared wrapper for all informational/legal pages.
 *
 * Props:
 *  - title       (string)  – browser <title> suffix
 *  - description (string)  – meta description content
 *  - maxWidth    (number)  – container max width (default: 1240)
 *  - children               – page body content
 */
export default function PageLayout({ title, description, maxWidth = 1240, children }) {
  const { theme, toggleTheme } = useContext(AppContext);
  const location = useLocation();

  useEffect(() => {
    const siteName = 'LyZov Cropper Studio';
    document.title = title ? `${title} | ${siteName}` : siteName;

    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'description';
      document.head.appendChild(meta);
    }
    if (description) meta.setAttribute('content', description);

    window.scrollTo(0, 0);
  }, [title, description]);

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default', color: 'text.primary' }}>
      {/* Sticky Header Navbar */}
      <Box
        component="header"
        sx={{
          py: 1.5,
          px: { xs: 2, sm: 3, md: 5 },
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: theme === 'dark' ? 'rgba(8,12,24,0.92)' : 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(20px)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
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

        {/* Center Quick Links (Desktop) */}
        <Box sx={{ display: { xs: 'none', lg: 'flex' }, alignItems: 'center', gap: 1 }}>
          {NAV_PAGES.slice(0, 4).map((p) => {
            const active = location.pathname === p.path;
            return (
              <Button
                key={p.path}
                component={Link}
                to={p.path}
                size="small"
                sx={{
                  color: active ? (theme === 'dark' ? '#00c9ff' : '#0284c7') : 'text.secondary',
                  bgcolor: active ? (theme === 'dark' ? 'rgba(0,201,255,0.1)' : 'rgba(2,132,199,0.08)') : 'transparent',
                  fontWeight: active ? 700 : 500,
                  fontSize: '0.82rem',
                  textTransform: 'none',
                  borderRadius: 2,
                  px: 1.5,
                  py: 0.5,
                  '&:hover': {
                    bgcolor: theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                    color: 'text.primary',
                  },
                }}
              >
                {p.label}
              </Button>
            );
          })}
        </Box>

        {/* Right Actions */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Chip
            icon={<ShieldCheck size={14} color={theme === 'dark' ? '#00c9ff' : '#0284c7'} />}
            label="100% Client-Side"
            size="small"
            sx={{
              bgcolor: theme === 'dark' ? 'rgba(0,201,255,0.1)' : 'rgba(2,132,199,0.1)',
              color: theme === 'dark' ? '#00c9ff' : '#0284c7',
              border: '1px solid',
              borderColor: theme === 'dark' ? 'rgba(0,201,255,0.25)' : 'rgba(2,132,199,0.25)',
              fontWeight: 700,
              fontSize: '0.72rem',
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
              fontWeight: 800,
              fontSize: '0.82rem',
              borderRadius: 2.2,
              textTransform: 'none',
              px: 2,
              py: 0.7,
              boxShadow: '0 4px 14px rgba(0,201,255,0.3)',
              '&:hover': {
                boxShadow: '0 6px 20px rgba(0,201,255,0.45)',
              },
            }}
          >
            Launch Studio <ArrowRight size={15} style={{ marginLeft: 5 }} />
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

      {/* Sub-Navigation Pill Strip for Quick Navigation across Pages */}
      <Box
        sx={{
          bgcolor: theme === 'dark' ? 'rgba(14,22,40,0.6)' : 'rgba(241,245,249,0.7)',
          borderBottom: '1px solid',
          borderColor: 'divider',
          py: 1,
          px: { xs: 2, sm: 3, md: 5 },
          overflowX: 'auto',
          whiteSpace: 'nowrap',
          display: 'flex',
          gap: 1,
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        }}
      >
        <Box sx={{ maxWidth, width: '100%', mx: 'auto', display: 'flex', gap: 1, alignItems: 'center' }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, mr: 1, display: { xs: 'none', sm: 'inline-block' } }}>
            PAGES:
          </Typography>
          {NAV_PAGES.map((p) => {
            const active = location.pathname === p.path;
            return (
              <Button
                key={p.path}
                component={Link}
                to={p.path}
                size="small"
                sx={{
                  color: active ? '#ffffff' : 'text.secondary',
                  background: active ? 'linear-gradient(135deg, #00c9ff 0%, #0077ff 100%)' : 'transparent',
                  fontWeight: active ? 700 : 500,
                  fontSize: '0.78rem',
                  textTransform: 'none',
                  borderRadius: '20px',
                  px: 1.6,
                  py: 0.35,
                  minWidth: 'auto',
                  border: active ? 'none' : '1px solid transparent',
                  '&:hover': {
                    bgcolor: active ? undefined : (theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'),
                    borderColor: active ? undefined : 'divider',
                    color: 'text.primary',
                  },
                }}
              >
                {p.label}
              </Button>
            );
          })}
        </Box>
      </Box>

      {/* Page Content – Wide container utilizing modern large screens */}
      <Box
        component="main"
        sx={{
          flex: 1,
          width: '100%',
          maxWidth,
          mx: 'auto',
          px: { xs: 2, sm: 3, md: 5 },
          py: { xs: 4, md: 6 },
        }}
      >
        {children}
      </Box>

      <Footer />
    </Box>
  );
}
