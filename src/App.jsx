import React, { useContext, useState } from 'react';
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
} from 'lucide-react';
import { AppProvider, AppContext } from './context/AppContext';
import CropperAuthModal from './components/CropperAuthModal';
import GstApp from './gst-tool/GstApp';
import PdfUploader from './components/PdfUploader';
import PdfViewer from './components/PdfViewer';
import CropProcessor from './components/CropProcessor';
import DownloadPanel from './components/DownloadPanel';
import Footer from './components/Footer';

// Informational pages
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import TermsPage from './pages/TermsPage';
import DisclaimerPage from './pages/DisclaimerPage';
import HowToUsePage from './pages/HowToUsePage';
import FaqPage from './pages/FaqPage';
import HubPage from './pages/HubPage';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#00c9ff' },
    secondary: { main: '#ff6ec7' },
    background: {
      default: '#070a12',
      paper: '#0d131f',
    },
    text: {
      primary: '#f1f5f9',
      secondary: '#94a3b8',
    },
  },
  typography: {
    fontFamily: '"Plus Jakarta Sans", "Inter", -apple-system, sans-serif',
  },
  shape: {
    borderRadius: 12,
  },
});

function MainContent() {
  const {
    activeTab,
    setActiveTab,
    croppedBlobs,
    user,
    setUser,
    isTrialExpired,
    daysLeftInTrial,
    authModalOpen,
    setAuthModalOpen,
    authModalMode,
    setAuthModalMode,
    logoutUser,
    GUEST_DAILY_LIMIT,
    guestUsage,
  } = useContext(AppContext);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', width: '100%' }}>
      {/* Top Navbar */}
      <Box
        component="header"
        sx={{
          py: 1.5,
          px: { xs: 1.5, sm: 2.5, md: 4 },
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          bgcolor: 'rgba(7, 10, 18, 0.85)',
          backdropFilter: 'blur(16px)',
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
              background: 'linear-gradient(135deg, #00c9ff 0%, #ff6ec7 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(0, 201, 255, 0.35)',
            }}
          >
            <Scissors size={20} color="#ffffff" />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={800} sx={{ letterSpacing: '-0.5px', lineHeight: 1.1, fontSize: { xs: '1rem', sm: '1.15rem' } }}>
              LyZov <span style={{ color: '#00c9ff' }}>Cropper</span> Studio
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
                <Tooltip title={isTrialExpired ? 'Your 30-day trial has expired. Subscribe to continue!' : `${daysLeftInTrial} days remaining in your free trial`}>
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
                <Chip
                  icon={<Crown size={13} color="#00d68f" />}
                  label="Pro Active"
                  size="small"
                  sx={{
                    bgcolor: 'rgba(0, 214, 143, 0.12)',
                    color: '#00d68f',
                    border: '1px solid rgba(0, 214, 143, 0.3)',
                    fontWeight: 700,
                  }}
                />
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

              <Chip
                avatar={<UserIcon size={13} color="#94a3b8" />}
                label={user.name ? user.name.split(' ')[0] : 'Seller'}
                size="small"
                sx={{
                  bgcolor: 'rgba(255,255,255,0.06)',
                  color: '#f1f5f9',
                  fontWeight: 600,
                  display: { xs: 'none', md: 'inline-flex' },
                }}
              />

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

              <Button
                variant="contained"
                size="small"
                onClick={() => {
                  setAuthModalMode('auth');
                  setAuthModalOpen(true);
                }}
                sx={{
                  background: 'linear-gradient(135deg, #00c9ff 0%, #ff6ec7 100%)',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.8rem',
                  borderRadius: 2,
                  textTransform: 'none',
                  px: 1.8,
                  py: 0.5,
                  boxShadow: '0 4px 14px rgba(0, 201, 255, 0.35)',
                }}
              >
                Get 30-Day Free Trial
              </Button>
            </Box>
          )}

          <Button
            component={Link}
            to="/"
            variant="outlined"
            size="small"
            sx={{
              color: '#94a3b8',
              borderColor: 'rgba(255,255,255,0.15)',
              fontWeight: 700,
              fontSize: '0.78rem',
              borderRadius: '10px',
              textTransform: 'none',
              px: 1.5,
              py: 0.6,
              '&:hover': { borderColor: '#00c9ff', color: '#00c9ff' },
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
            }}
          >
            ✦ GST Tool
          </Button>
        </Box>
      </Box>

      {/* Main Full-Width App Workspace */}
      <Box sx={{ width: '100%', px: { xs: 1, sm: 2, md: 3.5 }, mt: 2, flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Navigation Tabs Bar */}
        <Box
          sx={{
            mb: 2,
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
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
            textColor="secondary"
            indicatorColor="secondary"
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
                    borderColor: 'rgba(255,255,255,0.15)',
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
                  color: '#00c9ff',
                  borderColor: 'rgba(0, 201, 255, 0.4)',
                  textTransform: 'none',
                  fontWeight: 600,
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

      {/* Cropper Auth & 30-Day Paywall Modal */}
      <CropperAuthModal
        open={authModalOpen}
        mode={authModalMode}
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

export default function App() {
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <AppProvider>
        <Routes>
          {/* Hub — shown when visiting the root URL */}
          <Route path="/" element={<HubPage />} />
          {/* Label Cropper — full tool, moved to /cropper */}
          <Route path="/cropper" element={<MainContent />} />
          {/* GST Tool — lives at /gst-tool/* */}
          <Route path="/gst-tool/*" element={<GstApp />} />
          {/* Informational pages */}
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/disclaimer" element={<DisclaimerPage />} />
          <Route path="/how-to-use" element={<HowToUsePage />} />
          <Route path="/faq" element={<FaqPage />} />
        </Routes>
      </AppProvider>
    </ThemeProvider>
  );
}
