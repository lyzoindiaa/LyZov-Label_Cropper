import React, { useContext, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  ListSubheader,
  Menu,
  MenuItem,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  BarChart2,
  ChevronDown,
  FileOutput,
  FileText,
  FileType2,
  Image as ImageIcon,
  Layers,
  LayoutGrid,
  Maximize2,
  Minimize2,
  Moon,
  RefreshCw,
  Scissors,
  ShieldCheck,
  Sparkles,
  Sun,
  Wand2,
} from 'lucide-react';
import { AppContext } from '../../context/AppContext';
import { TOOL_CATEGORIES, getToolsByCategory } from '../../data/toolsCatalog';
import Footer from '../Footer';
import SEOHead from '../SEOHead';

const ICON_MAP = {
  Maximize2,
  Minimize2,
  RefreshCw,
  Wand2,
  Layers,
  FileType2,
  FileOutput,
  Scissors,
  FileText,
  BarChart2,
  ImageIcon,
};

/**
 * Unified shell for all LyZov utility tools.
 * Matches the existing LyZov Tools dark/light header, typography, privacy pill, and footer.
 */
export default function ToolShell({
  title,
  seoTitle,
  description,
  canonical,
  privacyLabel = '100% Private · Processed locally in your browser',
  accentColor,
  icon: HeaderIcon,
  maxWidth = 920,
  children,
}) {
  const { theme, toggleTheme } = useContext(AppContext);
  const location = useLocation();
  const [toolsAnchorEl, setToolsAnchorEl] = useState(null);
  const toolsOpen = Boolean(toolsAnchorEl);

  const isDark = theme === 'dark';
  const accent = accentColor || (isDark ? '#00c9ff' : '#0284c7');

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        maxWidth: '100%',
        overflowX: 'clip',
        bgcolor: 'background.default',
        color: 'text.primary',
      }}
    >
      <SEOHead
        title={seoTitle || `${title} | LyZov Tools`}
        description={description}
        canonical={canonical}
      />

      {/* Sticky Top Navbar matching LyZov Tools */}
      <Box
        component="header"
        sx={{
          py: 1.25,
          px: { xs: 1.5, sm: 3, md: 5 },
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: isDark ? 'rgba(8, 12, 24, 0.94)' : 'rgba(255, 255, 255, 0.94)',
          backdropFilter: { xs: 'none', md: 'blur(18px)' },
          position: 'sticky',
          top: 0,
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1.5,
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        {/* Brand */}
        <Box
          component={Link}
          to="/"
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.2,
            textDecoration: 'none',
            color: 'inherit',
            flexShrink: 0,
          }}
        >
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
              sx={{
                fontWeight: 800,
                letterSpacing: '-0.35px',
                lineHeight: 1.15,
                fontSize: { xs: '0.96rem', sm: '1.12rem' },
                color: 'text.primary',
              }}
            >
              LyZov <span style={{ color: accent }}>Tools</span>
            </Typography>
            <Typography
              variant="caption"
              sx={{
                display: { xs: 'none', sm: 'block' },
                color: 'text.secondary',
                fontSize: '0.68rem',
                lineHeight: 1,
              }}
            >
              tools.lyzov.com
            </Typography>
          </Box>
        </Box>

        {/* Right Actions */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.75, sm: 1.25 } }}>
          <Button
            component={Link}
            to="/"
            size="small"
            startIcon={<LayoutGrid size={15} />}
            sx={{
              color: 'text.secondary',
              fontWeight: 700,
              fontSize: '0.82rem',
              textTransform: 'none',
              borderRadius: 2,
              px: 1.2,
              display: { xs: 'none', sm: 'inline-flex' },
              '&:hover': {
                color: accent,
                bgcolor: isDark ? 'rgba(0, 201, 255, 0.08)' : 'rgba(2, 132, 199, 0.06)',
              },
            }}
          >
            All Tools
          </Button>

          <Button
            variant="outlined"
            size="small"
            onClick={(e) => setToolsAnchorEl(e.currentTarget)}
            endIcon={
              <ChevronDown
                size={14}
                style={{
                  transform: toolsOpen ? 'rotate(180deg)' : 'none',
                  transition: 'transform 0.2s',
                }}
              />
            }
            sx={{
              color: 'text.primary',
              borderColor: 'divider',
              fontWeight: 700,
              fontSize: { xs: '0.76rem', sm: '0.82rem' },
              borderRadius: 2,
              textTransform: 'none',
              px: { xs: 1.1, sm: 1.5 },
              py: 0.55,
              '&:hover': {
                borderColor: accent,
                color: accent,
                bgcolor: isDark ? 'rgba(0, 201, 255, 0.08)' : 'rgba(2, 132, 199, 0.06)',
              },
            }}
          >
            Switch Tool
          </Button>

          <Menu
            anchorEl={toolsAnchorEl}
            open={toolsOpen}
            onClose={() => setToolsAnchorEl(null)}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            slotProps={{
              paper: {
                sx: {
                  mt: 1,
                  minWidth: 260,
                  maxHeight: '75vh',
                  borderRadius: 2.5,
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: isDark ? '#0e1628' : '#ffffff',
                  boxShadow: isDark
                    ? '0 14px 36px rgba(0, 0, 0, 0.65)'
                    : '0 14px 36px rgba(0, 0, 0, 0.12)',
                },
              },
            }}
          >
            <MenuItem
              component={Link}
              to="/"
              onClick={() => setToolsAnchorEl(null)}
              sx={{ py: 1, px: 2, gap: 1.2, fontSize: '0.84rem', fontWeight: 700 }}
            >
              <LayoutGrid size={16} color={accent} />
              All Tools Hub
            </MenuItem>
            <Divider sx={{ my: 0.5 }} />
            {TOOL_CATEGORIES.map((category) => [
              <ListSubheader
                key={`cat-${category.id}`}
                sx={{
                  bgcolor: 'transparent',
                  color: 'text.secondary',
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  lineHeight: '28px',
                  px: 2,
                }}
              >
                {category.name}
              </ListSubheader>,
              ...getToolsByCategory(category.id).map((tool) => {
                const IconComp = ICON_MAP[tool.iconName] || Sparkles;
                const active = location.pathname === tool.route;
                return (
                  <MenuItem
                    key={tool.id}
                    component={Link}
                    to={tool.route}
                    selected={active}
                    onClick={() => setToolsAnchorEl(null)}
                    sx={{
                      py: 0.9,
                      px: 2,
                      gap: 1.25,
                      fontSize: '0.84rem',
                      fontWeight: active ? 800 : 600,
                    }}
                  >
                    <IconComp size={15} color={tool.accent} />
                    <span>{tool.name}</span>
                  </MenuItem>
                );
              }),
            ])}
          </Menu>

          <Tooltip title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
            <IconButton
              id="themeToggle"
              type="button"
              onClick={toggleTheme}
              size="small"
              aria-label="Toggle light and dark theme"
              sx={{
                color: 'text.primary',
                bgcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: '10px',
                p: 0.8,
                '&:hover': {
                  borderColor: accent,
                },
              }}
            >
              {isDark ? <Sun size={17} color="#f5a623" /> : <Moon size={17} color="#0284c7" />}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Main Tool Workspace */}
      <Box
        component="main"
        sx={{
          flex: 1,
          width: '100%',
          maxWidth,
          minWidth: 0,
          mx: 'auto',
          px: { xs: 1.5, sm: 3 },
          py: { xs: 3, sm: 5 },
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
          boxSizing: 'border-box',
        }}
      >
        {/* Title, Short Explanation, Privacy Badge */}
        <Box sx={{ textAlign: 'center' }}>
          {HeaderIcon && (
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: '14px',
                mx: 'auto',
                mb: 1.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: `${accent}18`,
                border: `1px solid ${accent}40`,
              }}
            >
              <HeaderIcon size={24} color={accent} />
            </Box>
          )}
          <Typography
            variant="h4"
            component="h1"
            sx={{
              fontWeight: 800,
              letterSpacing: '-0.5px',
              fontSize: { xs: '1.6rem', sm: '2.15rem' },
              mb: 1,
              color: 'text.primary',
            }}
          >
            {title}
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: 'text.secondary',
              maxWidth: 600,
              mx: 'auto',
              mb: 1.8,
              fontSize: { xs: '0.92rem', sm: '1rem' },
              lineHeight: 1.6,
            }}
          >
            {description}
          </Typography>
          <Chip
            icon={<ShieldCheck size={13} color={accent} />}
            label={privacyLabel}
            size="small"
            sx={{
              bgcolor: isDark ? 'rgba(0,201,255,0.08)' : 'rgba(2,132,199,0.08)',
              color: accent,
              border: '1px solid',
              borderColor: isDark ? 'rgba(0,201,255,0.22)' : 'rgba(2,132,199,0.22)',
              fontWeight: 600,
              fontSize: '0.74rem',
              maxWidth: '100%',
            }}
          />
        </Box>

        {children}
      </Box>

      <Footer />
    </Box>
  );
}
