import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Divider,
  Tooltip,
} from '@mui/material';
import {
  BarChart3,
  UploadCloud,
  ShieldCheck,
  Package,
  Layers,
  GitCommit,
  ShieldAlert,
  Crown,
  User as UserIcon,
  LogOut,
  Sparkles,
  RotateCcw,
  Trash2,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';

import './pnl.css';
import { PnlAuthProvider, usePnlAuth } from './auth/AuthContext.jsx';
import AuthModal from './auth/AuthModal.jsx';
import PricingModal from './billing/PricingModal.jsx';

import DashboardView from './pages/DashboardView.jsx';
import IngestView from './pages/IngestView.jsx';
import QualityView from './pages/QualityView.jsx';
import ProductsView from './pages/ProductsView.jsx';
import RulesView from './pages/RulesView.jsx';
import BridgeView from './pages/BridgeView.jsx';
import AdminView from './pages/AdminView.jsx';

import { getLocalOrderLines, seedLocalDatabase, clearLocalDatabase } from './db/index.js';
import { DEMO_AUDIT_REPORT } from './db/seedData.js';

function PnlAppContent() {
  const {
    user,
    logout,
    authModalOpen,
    setAuthModalOpen,
    pricingModalOpen,
    setPricingModalOpen,
    trialDaysRemaining,
    isPro,
    isEnterprise,
    isAdmin,
  } = usePnlAuth();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [orders, setOrders] = useState([]);
  const [auditResult, setAuditResult] = useState(DEMO_AUDIT_REPORT);
  const [missingSkus, setMissingSkus] = useState([]);
  const [isDemoMode, setIsDemoMode] = useState(true);

  // User menu anchor
  const [anchorEl, setAnchorEl] = useState(null);

  // Load or auto-seed on startup
  const initAppDatabase = async (force = false) => {
    try {
      const data = await seedLocalDatabase(force);
      setOrders(data.orders || []);
      setAuditResult(data.audit || DEMO_AUDIT_REPORT);
      const missing = Array.from(
        new Set((data.orders || []).filter(l => l.cogsSource === 'missing').map(l => l.sku))
      );
      setMissingSkus(missing);
      setIsDemoMode(true);
    } catch (err) {
      console.warn('LocalDB initialization notice:', err);
    }
  };

  useEffect(() => {
    initAppDatabase(false);
  }, []);

  const handleReloadDemo = async () => {
    await initAppDatabase(true);
  };

  const handleClearData = async () => {
    await clearLocalDatabase();
    setOrders([]);
    setAuditResult(null);
    setMissingSkus([]);
    setIsDemoMode(false);
  };

  const handleIngestComplete = (normResult) => {
    setOrders(normResult.accepted);
    setAuditResult(normResult);
    const missing = Array.from(
      new Set(normResult.accepted.filter(l => l.cogsSource === 'missing').map(l => l.sku))
    );
    setMissingSkus(missing);
    setIsDemoMode(false);
    setActiveTab('quality');
  };

  const navItems = [
    { key: 'dashboard', label: 'Dashboard', icon: <BarChart3 size={16} /> },
    { key: 'ingest', label: 'Import Sales', icon: <UploadCloud size={16} /> },
    { key: 'quality', label: 'Data Quality', icon: <ShieldCheck size={16} /> },
    { key: 'products', label: 'Products & COGS', icon: <Package size={16} /> },
    { key: 'rules', label: 'Fee Cards', icon: <Layers size={16} /> },
    { key: 'bridge', label: 'Profit Bridge & Simulators', icon: <GitCommit size={16} /> },
    { key: 'admin', label: 'Admin Console', icon: <ShieldAlert size={16} />, adminOnly: false },
  ];

  return (
    <Box className="pnl-container">
      {/* Top Application Header */}
      <Box
        sx={{
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          bgcolor: 'rgba(8, 12, 24, 0.95)',
          backdropFilter: 'blur(20px)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          px: { xs: 2, md: 4 },
          py: 1.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        {/* Brand */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: '11px',
              background: 'linear-gradient(135deg, #00c9ff 0%, #0077ff 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 20px rgba(0, 201, 255, 0.45)',
            }}
          >
            <Sparkles size={20} color="#fff" />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#f8fafc', lineHeight: 1.1, letterSpacing: '-0.3px' }}>
              LyZov <span style={{ color: '#00c9ff' }}>P&L Analyzer</span>
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.72rem' }}>
              Private Multi-Channel Financial Intelligence
            </Typography>
          </Box>
        </Box>

        {/* Navigation Tabs */}
        <Box sx={{ display: 'flex', gap: 0.6, overflowX: 'auto', py: 0.5 }}>
          {navItems.map((item) => {
            const isActive = activeTab === item.key;
            return (
              <Button
                key={item.key}
                onClick={() => setActiveTab(item.key)}
                startIcon={item.icon}
                sx={{
                  color: isActive ? '#00c9ff' : '#94a3b8',
                  bgcolor: isActive ? 'rgba(0, 201, 255, 0.12)' : 'transparent',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '0.82rem',
                  textTransform: 'none',
                  borderRadius: '10px',
                  px: 1.8,
                  py: 0.8,
                  transition: 'all 0.2s ease',
                  '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.05)', color: '#f8fafc' },
                }}
              >
                {item.label}
              </Button>
            );
          })}
        </Box>

        {/* Right Section: Trial/Subscription Badge & Auth */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {/* Subscription / Trial Pill */}
          <Button
            size="small"
            onClick={() => setPricingModalOpen(true)}
            startIcon={isPro || isEnterprise ? <Crown size={15} color="#ffb703" /> : <Sparkles size={15} color="#00c9ff" />}
            sx={{
              bgcolor: isEnterprise ? 'rgba(255, 183, 3, 0.15)' : isPro ? 'rgba(0, 201, 255, 0.15)' : 'rgba(0, 201, 255, 0.08)',
              color: isEnterprise ? '#ffb703' : '#00c9ff',
              border: '1px solid rgba(0, 201, 255, 0.25)',
              borderRadius: '20px',
              px: 1.8,
              py: 0.5,
              textTransform: 'none',
              fontWeight: 700,
              fontSize: '0.75rem',
            }}
          >
            {isEnterprise ? 'Enterprise Plan (₹499)' : isPro ? 'Pro Plan (₹199)' : `1-Mo Free Trial (${trialDaysRemaining}d left)`}
          </Button>

          {/* User Profile / Login */}
          {user ? (
            <>
              <Button
                size="small"
                onClick={(e) => setAnchorEl(e.currentTarget)}
                startIcon={<UserIcon size={16} />}
                sx={{
                  color: '#f8fafc',
                  bgcolor: 'rgba(255,255,255,0.05)',
                  borderRadius: '8px',
                  textTransform: 'none',
                  fontSize: '0.8rem',
                }}
              >
                {user.name || user.email.split('@')[0]}
              </Button>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={() => setAnchorEl(null)}
                PaperProps={{
                  sx: { background: '#0f172a', color: '#f8fafc', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)' },
                }}
              >
                <Box sx={{ px: 2, py: 1 }}>
                  <Typography variant="caption" sx={{ color: '#94a3b8' }}>Signed in as</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: '#00c9ff' }}>{user.email}</Typography>
                </Box>
                <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />
                <MenuItem onClick={() => { setAnchorEl(null); setPricingModalOpen(true); }} sx={{ fontSize: '0.85rem' }}>
                  Manage Subscription (₹199 / ₹499)
                </MenuItem>
                <MenuItem onClick={() => { setAnchorEl(null); setActiveTab('admin'); }} sx={{ fontSize: '0.85rem' }}>
                  Admin Dashboard
                </MenuItem>
                <MenuItem onClick={() => { setAnchorEl(null); logout(); }} sx={{ color: '#ff4d6d', fontSize: '0.85rem' }}>
                  Sign Out
                </MenuItem>
              </Menu>
            </>
          ) : (
            <Button
              variant="contained"
              size="small"
              onClick={() => setAuthModalOpen(true)}
              sx={{
                background: 'linear-gradient(135deg, #00c9ff 0%, #0088ff 100%)',
                fontWeight: 700,
                textTransform: 'none',
                borderRadius: '8px',
                px: 2,
              }}
            >
              Sign In / Trial
            </Button>
          )}
        </Box>
      </Box>

      {/* Demo Store & Data Control Banner */}
      <Box className="pnl-demo-banner">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Chip
            label={isDemoMode ? 'SAMPLE DATA LOADED' : 'USER DATA ACTIVE'}
            size="small"
            sx={{
              bgcolor: isDemoMode ? 'rgba(0, 201, 255, 0.2)' : 'rgba(0, 214, 143, 0.2)',
              color: isDemoMode ? '#00c9ff' : '#00d68f',
              fontWeight: 800,
              fontSize: '0.7rem',
              letterSpacing: '0.5px',
            }}
          />
          <Typography variant="body2" sx={{ color: '#cbd5e1', fontSize: '0.82rem' }}>
            {isDemoMode
              ? 'Multi-channel store dataset populated in IndexedDB (Amazon, Flipkart, Meesho, Shopify). All tabs, drill-downs, and simulators are interactive.'
              : 'Displaying your imported dataset. All numbers computed locally.'}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Button
            size="small"
            onClick={handleReloadDemo}
            startIcon={<RotateCcw size={14} />}
            sx={{
              color: '#00c9ff',
              bgcolor: 'rgba(0, 201, 255, 0.08)',
              textTransform: 'none',
              fontSize: '0.78rem',
              fontWeight: 600,
              borderRadius: '8px',
              px: 1.5,
              '&:hover': { bgcolor: 'rgba(0, 201, 255, 0.16)' },
            }}
          >
            Reset / Reload Demo Data
          </Button>

          <Button
            size="small"
            onClick={handleClearData}
            startIcon={<Trash2 size={14} />}
            sx={{
              color: '#94a3b8',
              textTransform: 'none',
              fontSize: '0.78rem',
              borderRadius: '8px',
              px: 1.2,
              '&:hover': { color: '#ff4d6d' },
            }}
          >
            Clear Data
          </Button>
        </Box>
      </Box>

      {/* Main Workspace Router */}
      <Box sx={{ maxWidth: 1440, mx: 'auto', mt: 1 }}>
        {activeTab === 'dashboard' && <DashboardView orders={orders} />}
        {activeTab === 'ingest' && <IngestView onIngestComplete={handleIngestComplete} onPreloadDemo={handleReloadDemo} />}
        {activeTab === 'quality' && <QualityView auditResult={auditResult} />}
        {activeTab === 'products' && <ProductsView missingSkus={missingSkus} />}
        {activeTab === 'rules' && <RulesView />}
        {activeTab === 'bridge' && <BridgeView orders={orders} />}
        {activeTab === 'admin' && <AdminView />}
      </Box>

      {/* Modals */}
      <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} />
      <PricingModal open={pricingModalOpen} onClose={() => setPricingModalOpen(false)} />
    </Box>
  );
}

export default function PnlApp() {
  return (
    <PnlAuthProvider>
      <PnlAppContent />
    </PnlAuthProvider>
  );
}
