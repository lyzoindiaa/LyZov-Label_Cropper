import React, { useEffect, useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Box, Typography, Tooltip, IconButton, Button } from '@mui/material';
import { Sparkles, Sun, Moon, Scissors, FileText, ArrowRight } from 'lucide-react';
import { AppContext } from '../context/AppContext';
import Footer from './Footer';

/**
 * PageLayout – shared unified wrapper for all informational & blog pages.
 * Matches the official LyZov Tools header and emerald green design system.
 */
export default function PageLayout({ title, description, maxWidth = 1000, children }) {
  const { theme, toggleTheme } = useContext(AppContext);
  const location = useLocation();

  const emerald = theme === 'dark' ? '#00d68f' : '#00a86b';

  useEffect(() => {
    const siteName = 'LyZov Tools';
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
      {/* Unified Navbar Header – Identical to localhost:5173 */}
      <Box
        component="header"
        sx={{
          py: 1.5,
          px: { xs: 2, sm: 3, md: 5 },
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: theme === 'dark' ? 'rgba(8,12,24,0.94)' : 'rgba(255,255,255,0.94)',
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
        {/* Brand: LyZov Tools (matches Hub exactly) */}
        <Link to="/" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #00c9ff 0%, #a78bfa 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(0, 201, 255, 0.35)',
              flexShrink: 0,
            }}
          >
            <Sparkles size={18} color="#0a0f1e" />
          </Box>
          <Box>
            <Typography
              variant="h6"
              fontWeight={800}
              sx={{ letterSpacing: '-0.3px', lineHeight: 1.15, fontSize: { xs: '1.05rem', sm: '1.15rem' }, color: 'text.primary' }}
            >
              LyZov <span style={{ color: emerald }}>Tools</span>
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.68rem', lineHeight: 1 }}>
              tools.lyzov.com
            </Typography>
          </Box>
        </Link>

        {/* Center / Right Links */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 1.5 } }}>
          <Button
            component={Link}
            to="/blog"
            size="small"
            sx={{
              color: location.pathname.startsWith('/blog') ? emerald : 'text.secondary',
              fontWeight: 700,
              fontSize: '0.85rem',
              textTransform: 'none',
              borderRadius: 2,
              px: 1.5,
              py: 0.6,
              bgcolor: location.pathname.startsWith('/blog') ? (theme === 'dark' ? 'rgba(0, 214, 143, 0.1)' : 'rgba(0, 168, 107, 0.08)') : 'transparent',
              '&:hover': {
                color: emerald,
                bgcolor: theme === 'dark' ? 'rgba(0, 214, 143, 0.08)' : 'rgba(0, 168, 107, 0.06)',
              },
            }}
          >
            Blog &amp; Guides
          </Button>

          <Button
            component={Link}
            to="/cropper"
            variant="outlined"
            size="small"
            startIcon={<Scissors size={14} />}
            sx={{
              borderColor: 'divider',
              color: 'text.primary',
              fontWeight: 700,
              fontSize: '0.82rem',
              borderRadius: '8px',
              textTransform: 'none',
              px: 1.6,
              py: 0.55,
              '&:hover': {
                borderColor: emerald,
                color: emerald,
              },
            }}
          >
            Cropper
          </Button>

          <Button
            component={Link}
            to="/gst-tool"
            variant="contained"
            size="small"
            startIcon={<FileText size={14} />}
            sx={{
              background: 'linear-gradient(135deg, #00d68f 0%, #00a86b 100%)',
              color: '#0a0f1e',
              fontWeight: 800,
              fontSize: '0.82rem',
              borderRadius: '8px',
              textTransform: 'none',
              px: 1.8,
              py: 0.55,
              boxShadow: '0 4px 14px rgba(0, 214, 143, 0.35)',
              display: { xs: 'none', sm: 'inline-flex' },
              '&:hover': {
                background: 'linear-gradient(135deg, #00e89d 0%, #00b875 100%)',
              },
            }}
          >
            GST Tool
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
                borderRadius: '8px',
                p: 0.8,
                '&:hover': {
                  borderColor: emerald,
                },
              }}
            >
              {theme === 'dark' ? <Sun size={16} color="#f5a623" /> : <Moon size={16} color="#0284c7" />}
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
          maxWidth,
          mx: 'auto',
          px: { xs: 2, sm: 3, md: 4 },
          py: { xs: 4, md: 5 },
        }}
      >
        {children}
      </Box>

      <Footer />
    </Box>
  );
}
