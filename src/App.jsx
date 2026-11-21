import React, { Suspense, lazy, useContext, useMemo, useState } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import {
  CssBaseline,
  ThemeProvider,
  createTheme,
  Box,
  Typography,
  Chip,
  Button,
  Tooltip,
  IconButton,
  Menu,
  MenuItem,
  Divider,
  CircularProgress,
  ListSubheader,
} from '@mui/material';
import {
  Scissors,
  Crown,
  LogOut,
  User as UserIcon,
  Sparkles,
  Sun,
  Moon,
  Receipt,
  ChevronDown,
  LayoutGrid,
  FileSpreadsheet,
  TrendingUp,
  Image as ImageIcon,
  BookOpen,
  Maximize2,
  Minimize2,
  RefreshCw,
  Wand2,
  Layers,
  FileType2,
  FileOutput,
} from 'lucide-react';
import { AppProvider, AppContext } from './context/AppContext';
import CropperAuthModal from './components/CropperAuthModal';
import CropperInvoicesModal from './components/CropperInvoicesModal';
import GstApp from './gst-tool/GstApp';
import PnlApp from './pnl-tool/PnlApp';
import SimpleCropperPage from './components/SimpleCropperPage';
import Footer from './components/Footer';
import SEOHead from './components/SEOHead';
import ToolSeoSection from './components/ToolSeoSection';
import { TOOL_SEO, buildToolPageSchema } from './data/seoMetadata';

// Informational pages
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import TermsPage from './pages/TermsPage';
import DisclaimerPage from './pages/DisclaimerPage';
import HowToUsePage from './pages/HowToUsePage';
import FaqPage from './pages/FaqPage';
import HubPage from './pages/HubPage';
import BlogListPage from './pages/BlogListPage';
import BlogPostPage from './pages/BlogPostPage';
import ProductImageTool from './image-extractor/ProductImageTool';

// Phase 1 Utility Tools (code-split per tool for fast initial page loads)
const ImageResizerPage = lazy(() => import('./pages/tools/ImageResizerPage'));
const ImageCompressorPage = lazy(() => import('./pages/tools/ImageCompressorPage'));
const ImageConverterPage = lazy(() => import('./pages/tools/ImageConverterPage'));
const BackgroundRemoverPage = lazy(() => import('./pages/tools/BackgroundRemoverPage'));
const MergePdfPage = lazy(() => import('./pages/tools/MergePdfPage'));
const PdfToWordPage = lazy(() => import('./pages/tools/PdfToWordPage'));
const WordToPdfPage = lazy(() => import('./pages/tools/WordToPdfPage'));
const ProductDescriptionPage = lazy(() => import('./pages/tools/ProductDescriptionPage'));

const getAppTheme = (mode = 'dark') =>
  createTheme({
    palette: {
      mode,
      primary: { main: mode === 'dark' ? '#00c9ff' : '#0284c7' },
      secondary: { main: mode === 'dark' ? '#00d68f' : '#00a86b' },
      background: {
        default: mode === 'dark' ? '#080c18' : '#f8fafc',
        paper: mode === 'dark' ? '#0e1628' : '#ffffff',
      },
      text: {
        primary: mode === 'dark' ? '#f0f4ff' : '#0f172a',
        secondary: mode === 'dark' ? '#8896b3' : '#64748b',
      },
      divider: mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
    },
    typography: {
      fontFamily: '"Plus Jakarta Sans", "Inter", -apple-system, sans-serif',
    },
    shape: {
      borderRadius: 12,
    },
    components: {
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
        },
      },
    },
  });

function MainContent() {
  const {
    user,
    setUser,
    isTrialExpired,
    daysLeftInTrial,
    authModalOpen,
    setAuthModalOpen,
    authModalMode,
    setAuthModalMode,
    authModalDefaultTab,
    setAuthModalDefaultTab,
    invoicesModalOpen,
    setInvoicesModalOpen,
    logoutUser,
    GUEST_DAILY_LIMIT,
    guestUsage,
    theme,
    toggleTheme,
  } = useContext(AppContext);

  const [toolsAnchorEl, setToolsAnchorEl] = useState(null);
  const toolsMenuOpen = Boolean(toolsAnchorEl);

  const cropperSeo = TOOL_SEO['/cropper'];
  const cropperSchema = useMemo(() => buildToolPageSchema(cropperSeo), [cropperSeo]);

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
        title={cropperSeo.title}
        description={cropperSeo.description}
        keywords={cropperSeo.keywords}
        canonical="https://tools.lyzov.com/cropper"
        schema={cropperSchema}
      />
      {/* Top Navbar */}
      <Box
        component="header"
        sx={{
          py: 1.2,
          px: { xs: 1.5, sm: 2.5, md: 4 },
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: theme === 'dark' ? 'rgba(7, 10, 18, 0.95)' : 'rgba(255, 255, 255, 0.95)',
          backdropFilter: { xs: 'none', md: 'blur(16px)' },
          position: 'sticky',
          top: 0,
          zIndex: 100,
          display: 'flex',
          flexWrap: 'nowrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1.5,
          width: '100%',
          maxWidth: '100%',
          boxSizing: 'border-box',
        }}
      >
        <Box
          component={Link}
          to="/cropper"
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: { xs: 1, sm: 1.5 },
            textDecoration: 'none',
            color: 'inherit',
            flexShrink: 0,
          }}
        >
          <Box
            sx={{
              width: { xs: 32, sm: 36 },
              height: { xs: 32, sm: 36 },
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #00c9ff 0%, #a78bfa 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(0, 201, 255, 0.35)',
              flexShrink: 0,
            }}
          >
            <Scissors size={18} color="#ffffff" />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="h6"
              fontWeight={800}
              sx={{
                letterSpacing: '-0.5px',
                lineHeight: 1.1,
                fontSize: { xs: '0.88rem', sm: '1.15rem' },
                color: 'text.primary',
                whiteSpace: 'nowrap',
              }}
            >
              LyZov <span style={{ color: theme === 'dark' ? '#00c9ff' : '#0284c7' }}>Cropper</span><Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}> Studio</Box>
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                display: { xs: 'none', md: 'block' },
                lineHeight: 1,
                fontSize: '0.7rem',
                whiteSpace: 'nowrap',
              }}
            >
              Batch PDF Label Cropper &amp; Thermal Printer
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.6, sm: 1.2 }, flexShrink: 0, flexWrap: 'nowrap' }}>
          {/* User Auth & 30-Day Trial Status */}
          {user ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.6, sm: 1 }, flexWrap: 'nowrap' }}>
              {user.plan === 'trial' ? (
                <Tooltip title={isTrialExpired ? 'Your 30-day trial has expired. Subscribe to continue!' : `${daysLeftInTrial} days remaining in your free trial. Click to view subscription.`}>
                  <Chip
                    icon={<Sparkles size={13} color={isTrialExpired ? '#ff4d6d' : '#00c9ff'} />}
                    label={isTrialExpired ? 'Trial Expired' : `Trial: ${daysLeftInTrial}d left`}
                    size="small"
                    onClick={() => {
                      setAuthModalMode('paywall');
                      setAuthModalOpen(true);
                    }}
                    sx={{
                      bgcolor: isTrialExpired ? 'rgba(255, 77, 109, 0.15)' : 'rgba(0, 201, 255, 0.12)',
                      color: isTrialExpired ? '#ff4d6d' : '#00c9ff',
                      border: `1px solid ${isTrialExpired ? 'rgba(255, 77, 109, 0.35)' : 'rgba(0, 201, 255, 0.3)'}`,
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontSize: '0.72rem',
                    }}
                  />
                </Tooltip>
              ) : (
                <Tooltip title="View your active subscription & payment receipts">
                  <Chip
                    icon={<Crown size={13} color="#00d68f" />}
                    label={user.plan === 'cropper_yearly' ? 'Pro Annual' : user.plan === 'cropper_monthly' ? 'Pro Monthly' : 'Pro Active'}
                    size="small"
                    onClick={() => setInvoicesModalOpen(true)}
                    sx={{
                      bgcolor: 'rgba(0, 214, 143, 0.12)',
                      color: '#00d68f',
                      border: '1px solid rgba(0, 214, 143, 0.3)',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontSize: '0.72rem',
                    }}
                  />
                </Tooltip>
              )}

              {user.plan === 'trial' && (
                <Button
                  size="small"
                  variant="contained"
                  onClick={() => {
                    setAuthModalMode('paywall');
                    setAuthModalOpen(true);
                  }}
                  sx={{
                    background: 'linear-gradient(135deg, #00c9ff 0%, #0077ff 100%)',
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: '0.75rem',
                    py: 0.4,
                    px: 1.2,
                    borderRadius: 2,
                    textTransform: 'none',
                    whiteSpace: 'nowrap',
                    display: { xs: 'none', sm: 'inline-flex' },
                  }}
                >
                  Upgrade ₹99/mo
                </Button>
              )}

              {/* Direct Invoices & Payment History Button for Label Cropper */}
              <Tooltip title="View payment receipts & subscription history">
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<Receipt size={14} />}
                  onClick={() => setInvoicesModalOpen(true)}
                  sx={{
                    color: theme === 'dark' ? '#00c9ff' : '#0284c7',
                    borderColor: theme === 'dark' ? 'rgba(0, 201, 255, 0.4)' : 'rgba(2, 132, 199, 0.4)',
                    fontWeight: 700,
                    fontSize: '0.74rem',
                    borderRadius: 2,
                    py: 0.4,
                    px: 1.1,
                    textTransform: 'none',
                    whiteSpace: 'nowrap',
                    display: { xs: 'none', md: 'inline-flex' },
                    '&:hover': {
                      bgcolor: theme === 'dark' ? 'rgba(0, 201, 255, 0.1)' : 'rgba(2, 132, 199, 0.1)',
                      borderColor: theme === 'dark' ? '#00c9ff' : '#0284c7',
                    },
                  }}
                >
                  Invoices
                </Button>
              </Tooltip>

              <Tooltip title="Account settings & invoices">
                <Chip
                  avatar={<UserIcon size={13} color="#94a3b8" />}
                  label={user.name ? user.name.split(' ')[0] : 'Seller'}
                  size="small"
                  onClick={() => setInvoicesModalOpen(true)}
                  sx={{
                    bgcolor: theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                    color: 'text.primary',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '0.72rem',
                    display: { xs: 'none', sm: 'inline-flex' },
                  }}
                />
              </Tooltip>

              <Tooltip title="Log Out">
                <IconButton
                  size="small"
                  onClick={logoutUser}
                  sx={{
                    color: '#94a3b8',
                    p: 0.6,
                    '&:hover': { color: '#ff4d6d' },
                  }}
                >
                  <LogOut size={16} />
                </IconButton>
              </Tooltip>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.6, sm: 1 }, flexWrap: 'nowrap' }}>
              <Tooltip title="You can crop up to 5 labels today for free without signing in!">
                <Chip
                  icon={<Sparkles size={12} color="#00c9ff" />}
                  label={`Guest: ${Math.max(0, (GUEST_DAILY_LIMIT || 5) - (guestUsage?.count || 0))}/5 free`}
                  size="small"
                  sx={{
                    bgcolor: 'rgba(0, 201, 255, 0.1)',
                    color: '#00c9ff',
                    border: '1px solid rgba(0, 201, 255, 0.25)',
                    fontWeight: 700,
                    fontSize: '0.72rem',
                    height: 26,
                    display: { xs: 'none', md: 'inline-flex' },
                  }}
                />
              </Tooltip>

              {/* Direct Sign In button for returning users (hidden on xs to save space) */}
              <Button
                variant="text"
                size="small"
                onClick={() => {
                  setAuthModalMode('auth');
                  setAuthModalDefaultTab(0);
                  setAuthModalOpen(true);
                }}
                sx={{
                  color: 'text.primary',
                  fontWeight: 700,
                  fontSize: { xs: '0.75rem', sm: '0.8rem' },
                  borderRadius: 2,
                  textTransform: 'none',
                  px: { xs: 1, sm: 1.4 },
                  py: 0.5,
                  minWidth: 'auto',
                  whiteSpace: 'nowrap',
                  display: { xs: 'none', sm: 'inline-flex' },
                  '&:hover': {
                    color: theme === 'dark' ? '#00c9ff' : '#0284c7',
                  },
                }}
              >
                Sign In
              </Button>

              <Button
                variant="contained"
                size="small"
                onClick={() => {
                  setAuthModalMode('auth');
                  setAuthModalDefaultTab(1);
                  setAuthModalOpen(true);
                }}
                sx={{
                  background: 'linear-gradient(135deg, #00c9ff 0%, #0077ff 100%)',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: { xs: '0.72rem', sm: '0.8rem' },
                  borderRadius: 2,
                  textTransform: 'none',
                  px: { xs: 1, sm: 1.6 },
                  py: 0.45,
                  whiteSpace: 'nowrap',
                  boxShadow: '0 4px 14px rgba(0, 201, 255, 0.35)',
                }}
              >
                <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Get 30-Day </Box>Free Trial
              </Button>
            </Box>
          )}

          {/* More Tools Dropdown Menu */}
          <Button
            variant="outlined"
            size="small"
            onClick={(e) => setToolsAnchorEl(e.currentTarget)}
            endIcon={
              <ChevronDown
                size={14}
                style={{
                  transform: toolsMenuOpen ? 'rotate(180deg)' : 'none',
                  transition: 'transform 0.2s',
                }}
              />
            }
            sx={{
              color: 'text.secondary',
              borderColor: 'divider',
              fontWeight: 700,
              fontSize: { xs: '0.74rem', sm: '0.8rem' },
              borderRadius: 2,
              textTransform: 'none',
              px: { xs: 1, sm: 1.4 },
              py: 0.5,
              whiteSpace: 'nowrap',
              '&:hover': {
                borderColor: theme === 'dark' ? '#00c9ff' : '#0284c7',
                color: theme === 'dark' ? '#00c9ff' : '#0284c7',
                bgcolor: theme === 'dark' ? 'rgba(0, 201, 255, 0.08)' : 'rgba(2, 132, 199, 0.08)',
              },
            }}
          >
            Tools
          </Button>
          <Menu
            anchorEl={toolsAnchorEl}
            open={toolsMenuOpen}
            onClose={() => setToolsAnchorEl(null)}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            slotProps={{
              paper: {
                sx: {
                  mt: 1,
                  minWidth: 220,
                  borderRadius: 2.5,
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: theme === 'dark' ? '#0e1628' : '#ffffff',
                  boxShadow: theme === 'dark' ? '0 12px 32px rgba(0,0,0,0.6)' : '0 12px 32px rgba(0,0,0,0.1)',
                },
              },
            }}
          >
            <MenuItem
              component={Link}
              to="/"
              onClick={() => setToolsAnchorEl(null)}
              sx={{ py: 1, px: 2, gap: 1.5, fontSize: '0.84rem', fontWeight: 700 }}
            >
              <LayoutGrid size={16} color={theme === 'dark' ? '#00c9ff' : '#0284c7'} />
              All Tools Hub
            </MenuItem>
            <Divider sx={{ my: 0.5 }} />
            <ListSubheader sx={{ bgcolor: 'transparent', fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', lineHeight: '26px', px: 2 }}>
              Image Tools
            </ListSubheader>
            <MenuItem component={Link} to="/image-resizer" onClick={() => setToolsAnchorEl(null)} sx={{ py: 0.85, px: 2, gap: 1.5, fontSize: '0.83rem', fontWeight: 600 }}>
              <Maximize2 size={15} color="#00c9ff" />
              Image Resizer
            </MenuItem>
            <MenuItem component={Link} to="/image-compressor" onClick={() => setToolsAnchorEl(null)} sx={{ py: 0.85, px: 2, gap: 1.5, fontSize: '0.83rem', fontWeight: 600 }}>
              <Minimize2 size={15} color="#00d68f" />
              Image Compressor
            </MenuItem>
            <MenuItem component={Link} to="/image-converter" onClick={() => setToolsAnchorEl(null)} sx={{ py: 0.85, px: 2, gap: 1.5, fontSize: '0.83rem', fontWeight: 600 }}>
              <RefreshCw size={15} color="#a78bfa" />
              Image Converter
            </MenuItem>
            <MenuItem component={Link} to="/background-remover" onClick={() => setToolsAnchorEl(null)} sx={{ py: 0.85, px: 2, gap: 1.5, fontSize: '0.83rem', fontWeight: 600 }}>
              <Wand2 size={15} color="#ec4899" />
              Background Remover
            </MenuItem>
            <ListSubheader sx={{ bgcolor: 'transparent', fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', lineHeight: '26px', px: 2, mt: 0.5 }}>
              PDF &amp; Documents
            </ListSubheader>
            <MenuItem component={Link} to="/merge-pdf" onClick={() => setToolsAnchorEl(null)} sx={{ py: 0.85, px: 2, gap: 1.5, fontSize: '0.83rem', fontWeight: 600 }}>
              <Layers size={15} color="#00c9ff" />
              Merge PDF
            </MenuItem>
            <MenuItem component={Link} to="/pdf-to-word" onClick={() => setToolsAnchorEl(null)} sx={{ py: 0.85, px: 2, gap: 1.5, fontSize: '0.83rem', fontWeight: 600 }}>
              <FileType2 size={15} color="#4a9eff" />
              PDF to Word
            </MenuItem>
            <MenuItem component={Link} to="/word-to-pdf" onClick={() => setToolsAnchorEl(null)} sx={{ py: 0.85, px: 2, gap: 1.5, fontSize: '0.83rem', fontWeight: 600 }}>
              <FileOutput size={15} color="#f5a623" />
              Word to PDF
            </MenuItem>
            <ListSubheader sx={{ bgcolor: 'transparent', fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', lineHeight: '26px', px: 2, mt: 0.5 }}>
              Seller Tools
            </ListSubheader>
            <MenuItem
              component={Link}
              to="/gst-tool"
              onClick={() => setToolsAnchorEl(null)}
              sx={{ py: 0.85, px: 2, gap: 1.5, fontSize: '0.83rem', fontWeight: 600 }}
            >
              <FileSpreadsheet size={15} color="#00d68f" />
              GST Return Tool
            </MenuItem>
            <MenuItem
              component={Link}
              to="/pnl"
              onClick={() => setToolsAnchorEl(null)}
              sx={{ py: 0.85, px: 2, gap: 1.5, fontSize: '0.83rem', fontWeight: 600 }}
            >
              <TrendingUp size={15} color="#00c9ff" />
              P&amp;L Analyzer
            </MenuItem>
            <MenuItem
              component={Link}
              to="/image-extractor"
              onClick={() => setToolsAnchorEl(null)}
              sx={{ py: 0.85, px: 2, gap: 1.5, fontSize: '0.83rem', fontWeight: 600 }}
            >
              <ImageIcon size={15} color="#ec4899" />
              Image Extractor
            </MenuItem>
            <MenuItem
              component={Link}
              to="/product-description"
              onClick={() => setToolsAnchorEl(null)}
              sx={{ py: 0.85, px: 2, gap: 1.5, fontSize: '0.83rem', fontWeight: 600 }}
            >
              <Sparkles size={15} color="#ec4899" />
              Product Description Generator
            </MenuItem>
            <Divider sx={{ my: 0.5 }} />
            <MenuItem
              component={Link}
              to="/blog"
              onClick={() => setToolsAnchorEl(null)}
              sx={{ py: 0.9, px: 2, gap: 1.5, fontSize: '0.83rem', fontWeight: 600 }}
            >
              <BookOpen size={15} color="#a78bfa" />
              Seller Guides &amp; Blog
            </MenuItem>
          </Menu>

          {/* Theme Toggle Button */}
          <Tooltip title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
            <IconButton
              id="themeToggle"
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

      {/* Simplified automatic label & invoice cropper */}
      <SimpleCropperPage />

      {/* SEO Overview, FAQ & Related Tools */}
      <Box sx={{ width: '100%', maxWidth: 960, mx: 'auto', px: { xs: 1.5, sm: 3 }, pb: 5, boxSizing: 'border-box' }}>
        <ToolSeoSection toolSeo={cropperSeo} />
      </Box>

      {/* Cropper Invoices & Subscription Management Modal */}
      <CropperInvoicesModal
        open={invoicesModalOpen}
        onClose={() => setInvoicesModalOpen(false)}
        user={user}
        theme={theme}
        onUpgradeClick={(plan) => {
          setInvoicesModalOpen(false);
          setAuthModalMode('paywall');
          setAuthModalOpen(true);
        }}
      />

      {/* Cropper Auth & 30-Day Paywall Modal */}
      <CropperAuthModal
        open={authModalOpen}
        mode={authModalMode}
        defaultTab={authModalDefaultTab}
        user={user}
        onAuthSuccess={(u) => {
          setUser(u);
          setAuthModalOpen(false);
        }}
        onClose={() => setAuthModalOpen(false)}
        canDismiss={true}
      />

      {/* Footer – present on all pages for AdSense/navigation compliance */}
      <Footer />
    </Box>
  );
}

function NotFoundPage() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default',
        color: 'text.primary',
      }}
    >
      <SEOHead
        title="Page Not Found | LyZov Tools"
        description="The requested page could not be found on LyZov Tools."
        noIndex={true}
      />
      <Box
        component="main"
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          px: 3,
          py: 8,
        }}
      >
        <Typography variant="h2" sx={{ fontWeight: 900, mb: 1, fontSize: { xs: '2.5rem', sm: '3.5rem' } }}>
          404
        </Typography>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 1.5 }}>
          Page Not Found
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 480, mb: 3.5 }}>
          The link you followed may be outdated or moved. Explore all free browser tools from our hub.
        </Typography>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Button component={Link} to="/" variant="contained" sx={{ fontWeight: 700, textTransform: 'none', borderRadius: 2 }}>
            Go to All Tools Hub
          </Button>
          <Button component={Link} to="/cropper" variant="outlined" sx={{ fontWeight: 700, textTransform: 'none', borderRadius: 2 }}>
            Open Label Cropper
          </Button>
          <Button component={Link} to="/blog" variant="outlined" sx={{ fontWeight: 700, textTransform: 'none', borderRadius: 2 }}>
            Browse Guides
          </Button>
        </Box>
      </Box>
      <Footer />
    </Box>
  );
}

function ToolSuspenseFallback() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        bgcolor: 'background.default',
        color: 'text.secondary',
      }}
    >
      <CircularProgress size={34} />
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        Loading tool...
      </Typography>
    </Box>
  );
}

function ThemedApp() {
  const { theme } = useContext(AppContext);
  const muiTheme = useMemo(() => getAppTheme(theme || 'light'), [theme]);

  return (
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />
      <Suspense fallback={<ToolSuspenseFallback />}>
        <Routes>
          {/* Hub — shown when visiting the root URL */}
          <Route path="/" element={<HubPage />} />
          {/* Image Tools */}
          <Route path="/image-resizer" element={<ImageResizerPage />} />
          <Route path="/image-compressor" element={<ImageCompressorPage />} />
          <Route path="/image-converter" element={<ImageConverterPage />} />
          <Route path="/background-remover" element={<BackgroundRemoverPage />} />
          {/* PDF & Document Tools */}
          <Route path="/merge-pdf" element={<MergePdfPage />} />
          <Route path="/pdf-to-word" element={<PdfToWordPage />} />
          <Route path="/word-to-pdf" element={<WordToPdfPage />} />
          {/* Label Cropper — full tool, moved to /cropper */}
          <Route path="/cropper" element={<MainContent />} />
          {/* GST Tool — lives at /gst-tool/* */}
          <Route path="/gst-tool/*" element={<GstApp />} />
          {/* LyZov P&L Analyzer — lives at /pnl and /pnl/* */}
          <Route path="/pnl" element={<PnlApp />} />
          <Route path="/pnl/*" element={<PnlApp />} />
          {/* Product Image Extractor — lives at /image-extractor */}
          <Route path="/image-extractor" element={<ProductImageTool />} />
          {/* Rich Product Description & Listing Generator */}
          <Route path="/product-description" element={<ProductDescriptionPage />} />
          {/* Informational pages */}
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/disclaimer" element={<DisclaimerPage />} />
          <Route path="/how-to-use" element={<HowToUsePage />} />
          <Route path="/faq" element={<FaqPage />} />
          {/* Blog & Guides */}
          <Route path="/blog" element={<BlogListPage />} />
          <Route path="/blog/:slug" element={<BlogPostPage />} />
          {/* Fallback */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </ThemeProvider>
  );
}

export default function App() {
  return (
    <AppProvider>
      <ThemedApp />
    </AppProvider>
  );
}
