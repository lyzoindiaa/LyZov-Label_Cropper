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
  History,
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
import SEOHead from '../components/SEOHead.jsx';
import BridgeView from './pages/BridgeView.jsx';
import AdminView from './pages/AdminView.jsx';
import ImportHistoryView from './pages/ImportHistoryView.jsx';

import {
  getRowsByPeriod,
  getDistinctPeriods,
  getLocalMonthlyExpenses,
  clearLocalDatabase,
} from './db/index.js';

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

  const currentSellerId = user?.id || user?._id || 'default_seller';

  const [activeTab, setActiveTab] = useState('dashboard');
  const [orders, setOrders] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [availablePeriods, setAvailablePeriods] = useState([]);
  const [monthlyExpenses, setMonthlyExpenses] = useState([]);
  const [auditResult, setAuditResult] = useState(null);
  const [missingSkus, setMissingSkus] = useState([]);

  // User menu anchor
  const [anchorEl, setAnchorEl] = useState(null);

  // Load user data from local database partitioned by period
  const loadPeriodData = async (periodToLoad, seller = currentSellerId) => {
    try {
      const distinct = await getDistinctPeriods(seller);
      setAvailablePeriods(distinct);

      let targetPeriod = periodToLoad;
      if (!targetPeriod || (targetPeriod === 'all' && distinct.length > 0 && selectedPeriod === 'all')) {
        // default to latest month if available
        targetPeriod = distinct.length > 0 ? distinct[0] : 'all';
      }
      setSelectedPeriod(targetPeriod);

      const rows = await getRowsByPeriod(seller, targetPeriod);
      setOrders(rows || []);

      const expenses = await getLocalMonthlyExpenses(seller, targetPeriod);
      setMonthlyExpenses(expenses || []);

      const missing = Array.from(
        new Set((rows || []).filter((l) => l.cogsSource === 'missing').map((l) => l.sku))
      );
      setMissingSkus(missing);
    } catch (err) {
      console.warn('LocalDB period load notice:', err);
    }
  };

  useEffect(() => {
    loadPeriodData(selectedPeriod, currentSellerId);
  }, [currentSellerId]);

  const handlePeriodChange = (newPeriod) => {
    setSelectedPeriod(newPeriod);
    loadPeriodData(newPeriod, currentSellerId);
  };

  const handleClearData = async () => {
    await clearLocalDatabase();
    setOrders([]);
    setAvailablePeriods([]);
    setSelectedPeriod('all');
    setMonthlyExpenses([]);
    setAuditResult(null);
    setMissingSkus([]);
  };

  const handleIngestComplete = async (normResult) => {
    setAuditResult(normResult);
    const periods = normResult.periodsDetected || [];
    const latestPeriod = periods.length > 0 ? periods[0] : selectedPeriod;

    // Reload distinct periods and switch to the newly uploaded month
    await loadPeriodData(latestPeriod, currentSellerId);
    setActiveTab('dashboard');
  };

  const handleExpensesUpdated = () => {
    loadPeriodData(selectedPeriod, currentSellerId);
  };

  const navItems = [
    { key: 'dashboard', label: 'Dashboard', icon: <BarChart3 size={16} /> },
    { key: 'ingest', label: 'Import Sales', icon: <UploadCloud size={16} /> },
    { key: 'quality', label: 'Data Quality', icon: <ShieldCheck size={16} /> },
    { key: 'products', label: 'Products & Costs', icon: <Package size={16} /> },
    { key: 'history', label: 'Import History', icon: <History size={16} /> },
    { key: 'rules', label: 'Fee Cards', icon: <Layers size={16} /> },
    { key: 'bridge', label: 'Profit Simulators', icon: <GitCommit size={16} /> },
    ...(isAdmin ? [{ key: 'admin', label: 'Admin Console', icon: <ShieldAlert size={16} /> }] : []),
  ];

  return (
    <Box className="pnl-container">
      <SEOHead
        title="Seller P&L Analyzer & Marketplace Profit Calculator | LyZov"
        description="Analyze exact net margins, fees, returns, and profits across Flipkart, Amazon, and Meesho. Idempotent period-scoped analytics for Indian marketplace sellers."
        canonical="https://tools.lyzov.com/pnl"
      />

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
              LyZov <span style={{ color: '#00c9ff' }}>Seller P&amp;L</span>
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.72rem' }}>
              Zero Data Mixing &bull; Period Partitioned
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

        {/* Right Section: Subscription / Trial & User */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
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
            {isEnterprise ? 'Enterprise Plan' : isPro ? 'Pro Plan' : `Free Trial (${trialDaysRemaining}d)`}
          </Button>

          {user ? (
            <>
              <Button
                size="small"
                onClick={(e) => setAnchorEl(e.currentTarget)}
                startIcon={<UserIcon size={16} />}
                sx={{ color: '#f8fafc', fontWeight: 600, textTransform: 'none', borderRadius: '8px' }}
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
                  Manage Subscription
                </MenuItem>
                {isAdmin && (
                  <MenuItem onClick={() => { setAnchorEl(null); setActiveTab('admin'); }} sx={{ fontSize: '0.85rem' }}>
                    Admin Console
                  </MenuItem>
                )}
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

      {/* Main Workspace Router */}
      <Box sx={{ maxWidth: 1440, mx: 'auto', mt: 2 }}>
        {activeTab === 'dashboard' && (
          <DashboardView
            orders={orders}
            selectedPeriod={selectedPeriod}
            onPeriodChange={handlePeriodChange}
            availablePeriods={availablePeriods}
            monthlyExpenses={monthlyExpenses}
            onExpensesUpdated={handleExpensesUpdated}
            onNavigateTab={setActiveTab}
            sellerId={currentSellerId}
          />
        )}
        {activeTab === 'ingest' && (
          <IngestView onIngestComplete={handleIngestComplete} sellerId={currentSellerId} />
        )}
        {activeTab === 'quality' && <QualityView auditResult={auditResult} />}
        {activeTab === 'products' && (
          <ProductsView missingSkus={missingSkus} sellerId={currentSellerId} />
        )}
        {activeTab === 'history' && (
          <ImportHistoryView
            onImportDeleted={() => loadPeriodData(selectedPeriod, currentSellerId)}
            sellerId={currentSellerId}
          />
        )}
        {activeTab === 'rules' && <RulesView />}
        {activeTab === 'bridge' && <BridgeView orders={orders} />}
        {activeTab === 'admin' && (isAdmin ? <AdminView /> : <DashboardView orders={orders} onNavigateTab={setActiveTab} />)}
      </Box>

      {/* Modals */}
      <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} />
      <PricingModal open={pricingModalOpen} onClose={() => setPricingModalOpen(false)} />
    </Box>
  );
}

class PnlErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('LyZov P&L ErrorBoundary caught:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ p: 4, maxWidth: 800, mx: 'auto', mt: 8, bgcolor: '#0f172a', border: '1px solid #ef4444', borderRadius: 3, color: '#f8fafc' }}>
          <Typography variant="h5" sx={{ color: '#ef4444', fontWeight: 800, mb: 2 }}>
            P&amp;L Analyzer Encountered an Error
          </Typography>
          <Typography variant="body2" sx={{ color: '#94a3b8', mb: 2, fontFamily: 'monospace', bgcolor: '#020617', p: 2, borderRadius: 2, whiteSpace: 'pre-wrap' }}>
            {this.state.error?.message || String(this.state.error)}
          </Typography>
          <Button
            variant="contained"
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            sx={{ background: 'linear-gradient(135deg, #00c9ff, #92fe9d)', color: '#020617', fontWeight: 700 }}
          >
            Reload Application
          </Button>
        </Box>
      );
    }
    return this.props.children;
  }
}

export default function PnlApp() {
  return (
    <PnlErrorBoundary>
      <PnlAuthProvider>
        <PnlAppContent />
      </PnlAuthProvider>
    </PnlErrorBoundary>
  );
}
