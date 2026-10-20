import React, { useContext, useState, useMemo } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import {
  CssBaseline,
  ThemeProvider,
  createTheme,
  Box,
  Typography,
  Tabs,
  Tab,
  Badge,
  Chip,
  Button,
  Tooltip,
  IconButton,
} from '@mui/material';
import {
  Scissors,
  Download,
  ShieldCheck,
  PanelLeftClose,
  PanelLeftOpen,
  Crown,
  LogOut,
  User as UserIcon,
  Sparkles,
  Sun,
  Moon,
  Receipt,
} from 'lucide-react';
import { AppProvider, AppContext } from './context/AppContext';
import CropperAuthModal from './components/CropperAuthModal';
import CropperInvoicesModal from './components/CropperInvoicesModal';
import GstApp from './gst-tool/GstApp';
import PnlApp from './pnl-tool/PnlApp';
import PdfUploader from './components/PdfUploader';
import PdfViewer from './components/PdfViewer';
import CropProcessor from './components/CropProcessor';
import DownloadPanel from './components/DownloadPanel';
import Footer from './components/Footer';
import SEOHead from './components/SEOHead';

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
    activeTab,
    setActiveTab,
    pdfFiles,
    croppedBlobs,
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', width: '100%', bgcolor: 'background.default', color: 'text.primary' }}>
      <SEOHead
        title="Free Batch Shipping Label Cropper & 4x6 Thermal Printer Tool | LyZov"
        description="Free, 100% private client-side batch PDF shipping label cropper for Meesho, Flipkart & Amazon. Crop 4x6 thermal labels instantly with zero uploads."
        canonical="https://tools.lyzov.com/cropper"
      />
      {/* Top Navbar */}
      <Box
        component="header"
        sx={{
          py: 1.5,
          px: { xs: 1.5, sm: 2.5, md: 4 },
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: theme === 'dark' ? 'rgba(7, 10, 18, 0.95)' : 'rgba(255, 255, 255, 0.95)',
          backdropFilter: { xs: 'none', md: 'blur(16px)' },
          position: 'sticky',
          top: 0,
          zIndex: 100,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1.5,
          width: '100%',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #00c9ff 0%, #a78bfa 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(0, 201, 255, 0.35)',
            }}
          >
            <Scissors size={20} color="#ffffff" />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={800} sx={{ letterSpacing: '-0.5px', lineHeight: 1.1, fontSize: { xs: '1rem', sm: '1.15rem' }, color: 'text.primary' }}>
              LyZov <span style={{ color: theme === 'dark' ? '#00c9ff' : '#0284c7' }}>Cropper</span> Studio
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
              Batch PDF Label Cropper &amp; Thermal Printer
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 1.5 }, flexWrap: 'wrap' }}>
          {/* User Auth & 30-Day Trial Status */}
          {user ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
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
                    py: 0.5,
                    px: 1.2,
                    borderRadius: 2,
                    textTransform: 'none',
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
                    fontSize: '0.75rem',
                    borderRadius: 2,
                    py: 0.4,
                    px: 1.2,
                    textTransform: 'none',
                    display: { xs: 'none', sm: 'inline-flex' },
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
                    display: { xs: 'none', md: 'inline-flex' },
                  }}
                />
              </Tooltip>

              <Tooltip title="Log Out">
                <Button
                  size="small"
                  onClick={logoutUser}
                  sx={{
                    color: '#94a3b8',
                    minWidth: 32,
                    p: 0.6,
                    '&:hover': { color: '#ff4d6d' },
                  }}
                >
                  <LogOut size={16} />
                </Button>
              </Tooltip>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Tooltip title="You can crop up to 5 labels today for free without signing in!">
                <Chip
                  icon={<Sparkles size={13} color="#00c9ff" />}
                  label={`Guest: ${Math.max(0, (GUEST_DAILY_LIMIT || 5) - (guestUsage?.count || 0))}/5 free today`}
                  size="small"
                  sx={{
                    bgcolor: 'rgba(0, 201, 255, 0.1)',
                    color: '#00c9ff',
                    border: '1px solid rgba(0, 201, 255, 0.25)',
                    fontWeight: 700,
                  }}
                />
              </Tooltip>

              {/* Direct Sign In button for returning users */}
              <Button
                variant="outlined"
                size="small"
                onClick={() => {
                  setAuthModalMode('auth');
                  setAuthModalDefaultTab(0);
                  setAuthModalOpen(true);
                }}
                sx={{
                  color: 'text.primary',
                  borderColor: 'divider',
                  fontWeight: 700,
                  fontSize: { xs: '0.72rem', sm: '0.8rem' },
                  borderRadius: 2,
                  textTransform: 'none',
                  px: { xs: 1.2, sm: 1.5 },
                  py: 0.5,
                  '&:hover': {
                    borderColor: theme === 'dark' ? '#00c9ff' : '#0284c7',
                    bgcolor: theme === 'dark' ? 'rgba(0, 201, 255, 0.08)' : 'rgba(2, 132, 199, 0.08)',
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
                  px: { xs: 1.2, sm: 1.8 },
                  py: 0.5,
                  boxShadow: '0 4px 14px rgba(0, 201, 255, 0.35)',
                }}
              >
                <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Get 30-Day </Box>Free Trial
              </Button>
            </Box>
          )}

          <Button
            component={Link}
            to="/blog"
            variant="text"
            size="small"
            sx={{
              color: 'text.secondary',
              fontWeight: 700,
              fontSize: '0.78rem',
              borderRadius: '10px',
              textTransform: 'none',
              px: 1.2,
              py: 0.6,
              '&:hover': { color: theme === 'dark' ? '#00c9ff' : '#0284c7' },
              display: { xs: 'none', md: 'inline-flex' },
            }}
          >
            Guides
          </Button>

          <Button
            component={Link}
            to="/"
            variant="outlined"
            size="small"
            sx={{
              color: 'text.secondary',
              borderColor: 'divider',
              fontWeight: 700,
              fontSize: '0.78rem',
              borderRadius: '10px',
              textTransform: 'none',
              px: 1.5,
              py: 0.6,
              '&:hover': { borderColor: theme === 'dark' ? '#00c9ff' : '#0284c7', color: theme === 'dark' ? '#00c9ff' : '#0284c7' },
              display: { xs: 'none', sm: 'inline-flex' },
            }}
          >
            ← All Tools
          </Button>

          <Button
            component={Link}
            to="/gst-tool"
            variant="contained"
            size="small"
            sx={{
              background: 'linear-gradient(135deg, #00d68f 0%, #f5a623 100%)',
              color: '#0a0f1e',
              fontWeight: 800,
              fontSize: '0.8rem',
              borderRadius: '10px',
              textTransform: 'none',
              px: 1.8,
              py: 0.6,
              boxShadow: '0 4px 14px rgba(0, 214, 143, 0.4)',
              display: { xs: 'none', sm: 'inline-flex' },
            }}
          >
            ✦ GST Tool
          </Button>

          <Button
            component={Link}
            to="/pnl"
            variant="contained"
            size="small"
            sx={{
              background: 'linear-gradient(135deg, #00c9ff 0%, #0088ff 100%)',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '0.8rem',
              borderRadius: '10px',
              textTransform: 'none',
              px: 1.8,
              py: 0.6,
              boxShadow: '0 4px 14px rgba(0, 201, 255, 0.4)',
              display: { xs: 'none', sm: 'inline-flex' },
            }}
          >
            ✦ P&L Analyzer
          </Button>

          <Button
            component={Link}
            to="/image-extractor"
            variant="contained"
            size="small"
            sx={{
              background: 'linear-gradient(135deg, #a78bfa 0%, #ec4899 100%)',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '0.8rem',
              borderRadius: '10px',
              textTransform: 'none',
              px: 1.8,
              py: 0.6,
              boxShadow: '0 4px 14px rgba(167, 139, 250, 0.4)',
              display: { xs: 'none', md: 'inline-flex' },
            }}
          >
            ✦ Image Extractor
          </Button>

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

      {/* Main Full-Width App Workspace */}
      <Box sx={{ width: '100%', px: { xs: 1, sm: 2, md: 3.5 }, mt: 2, flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Navigation Tabs Bar */}
        <Box
          sx={{
            mb: 2,
            borderBottom: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 1.5,
            width: '100%',
          }}
        >
          <Tabs
            value={activeTab}
            onChange={(_, val) => setActiveTab(val)}
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            textColor="primary"
            indicatorColor="primary"
            sx={{
              minHeight: 44,
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 700,
                fontSize: { xs: '0.82rem', sm: '0.92rem' },
                minWidth: { xs: 110, sm: 140 },
                py: 1,
              },
            }}
          >
            <Tab
              label="1. Inspect & Select Crop"
              icon={<Scissors size={18} />}
              iconPosition="start"
            />
            <Tab
              label={
                <Badge
                  badgeContent={croppedBlobs.length}
                  color="primary"
                  sx={{ '& .MuiBadge-badge': { fontWeight: 700 } }}
                >
                  2. Download &amp; Print
                </Badge>
              }
              icon={<Download size={18} />}
              iconPosition="start"
            />
          </Tabs>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {activeTab === 0 && (
              <Tooltip title={sidebarCollapsed ? 'Show Sidebar' : 'Hide Sidebar (Full Width View)'}>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={sidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
                  onClick={() => setSidebarCollapsed((c) => !c)}
                  sx={{
                    fontSize: '0.78rem',
                    color: 'text.secondary',
                    borderColor: 'divider',
                    textTransform: 'none',
                    display: { xs: 'none', md: 'inline-flex' },
                  }}
                >
                  {sidebarCollapsed ? 'Show Sidebar' : 'Full Width'}
                </Button>
              </Tooltip>
            )}

            {croppedBlobs.length > 0 && activeTab === 0 && (
              <Button
                size="small"
                variant="outlined"
                onClick={() => setActiveTab(1)}
                sx={{
                  color: theme === 'dark' ? '#00c9ff' : '#0284c7',
                  borderColor: theme === 'dark' ? 'rgba(0, 201, 255, 0.4)' : 'rgba(2, 132, 199, 0.4)',
                  textTransform: 'none',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                }}
              >
                View {croppedBlobs.length} Cropped Labels →
              </Button>
            )}
          </Box>
        </Box>

        {/* Tab 0: Editor and Upload View (Full-Width Flexbox) */}
        {activeTab === 0 && (
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              gap: 2.5,
              width: '100%',
              flex: 1,
              alignItems: 'stretch',
            }}
          >
            {/* Left Sidebar: Uploads & Processing */}
            {!sidebarCollapsed && (
              <Box
                sx={{
                  width: { xs: '100%', md: 360, lg: 400 },
                  flexShrink: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                }}
              >
                <PdfUploader />
                <CropProcessor />
              </Box>
            )}

            {/* Right Main View: PDF Canvas - expands across 100% full remaining width */}
            <Box
              sx={{
                flex: 1,
                minWidth: 0,
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <PdfViewer />
            </Box>
          </Box>
        )}

        {/* Tab 1: Export and Print Panel */}
        {activeTab === 1 && (
          <Box sx={{ width: '100%' }}>
            <DownloadPanel />
          </Box>
        )}
      </Box>

      {/* Mobile Sticky Quick Action Bar (360px - 640px) */}
      {pdfFiles.length > 0 && (
        <Box
          sx={{
            display: { xs: 'flex', md: 'none' },
            position: 'sticky',
            bottom: 0,
            py: 1.2,
            px: 2,
            pb: 'calc(10px + env(safe-area-inset-bottom, 0px))',
            bgcolor: theme === 'dark' ? 'rgba(7, 10, 18, 0.95)' : 'rgba(255, 255, 255, 0.95)',
            backdropFilter: { xs: 'none', md: 'blur(16px)' },
            borderTop: '1px solid',
            borderColor: 'divider',
            zIndex: 90,
            gap: 1.5,
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 -4px 16px rgba(0,0,0,0.1)',
            mt: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="caption" fontWeight={700}>
              {pdfFiles.length} {pdfFiles.length === 1 ? 'file' : 'files'}
            </Typography>
            {croppedBlobs.length > 0 && (
              <Chip
                size="small"
                label={`${croppedBlobs.length} ready`}
                sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700, bgcolor: 'rgba(0, 201, 255, 0.15)', color: theme === 'dark' ? '#00c9ff' : '#0284c7' }}
              />
            )}
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {activeTab === 0 && croppedBlobs.length > 0 ? (
              <Button
                size="small"
                variant="contained"
                onClick={() => setActiveTab(1)}
                sx={{
                  py: 0.8,
                  px: 1.5,
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  textTransform: 'none',
                  borderRadius: 2,
                  background: 'linear-gradient(135deg, #00c9ff 0%, #0077ff 100%)',
                  color: '#ffffff',
                }}
              >
                View Results →
              </Button>
            ) : activeTab === 1 ? (
              <Button
                size="small"
                variant="outlined"
                onClick={() => setActiveTab(0)}
                sx={{
                  py: 0.8,
                  px: 1.5,
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  textTransform: 'none',
                  borderRadius: 2,
                }}
              >
                ← Back to Editor
              </Button>
            ) : null}
          </Box>
        </Box>
      )}

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

function ThemedApp() {
  const { theme } = useContext(AppContext);
  const muiTheme = useMemo(() => getAppTheme(theme || 'light'), [theme]);

  return (
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />
      <Routes>
        {/* Hub — shown when visiting the root URL */}
        <Route path="/" element={<HubPage />} />
        {/* Label Cropper — full tool, moved to /cropper */}
        <Route path="/cropper" element={<MainContent />} />
        {/* GST Tool — lives at /gst-tool/* */}
        <Route path="/gst-tool/*" element={<GstApp />} />
        {/* LyZov P&L Analyzer — lives at /pnl and /pnl/* */}
        <Route path="/pnl" element={<PnlApp />} />
        <Route path="/pnl/*" element={<PnlApp />} />
        {/* Product Image Extractor — lives at /image-extractor */}
        <Route path="/image-extractor" element={<ProductImageTool />} />
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
      </Routes>
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
