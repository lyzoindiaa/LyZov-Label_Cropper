import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Chip,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Button,
  Tabs,
  Tab,
  Alert,
  IconButton,
} from '@mui/material';
import {
  ShieldAlert,
  Users,
  CreditCard,
  Layers,
  Sparkles,
  RefreshCw,
  Plus,
  Clock,
  CheckCircle2,
  DollarSign,
} from 'lucide-react';
import { pnlApi } from '../api/client.js';
import { usePnlAuth } from '../auth/AuthContext.jsx';

export default function AdminView() {
  const { user } = usePnlAuth();
  const [activeTab, setActiveTab] = useState(0); // 0: Overview, 1: Users, 2: Payments, 3: Templates
  const [stats, setStats] = useState({
    totalUsers: 1,
    trialUsers: 1,
    proUsers: 0,
    enterpriseUsers: 0,
    totalRevenueINR: 0,
    mrrINR: 0,
    totalBatches: 0,
    totalOrders: 0,
  });
  const [usersList, setUsersList] = useState([]);
  const [paymentsList, setPaymentsList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadAdminData = async () => {
    setLoading(true);
    setError('');
    try {
      const s = await pnlApi.getAdminStats();
      setStats(s);

      const u = await pnlApi.getAdminUsers();
      if (u.users) setUsersList(u.users);

      const p = await pnlApi.getAdminPayments();
      if (p.payments) setPaymentsList(p.payments);
    } catch (err) {
      setError(err.message || 'Failed to load admin metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleExtendTrial = async (userId) => {
    try {
      await pnlApi.updateUserPlan(userId, { extendTrialDays: 30 });
      setMessage('Successfully extended user trial by 30 days');
      loadAdminData();
    } catch (err) {
      setError(err.message || 'Failed to extend trial');
    }
  };

  const handleSeedTemplates = async () => {
    try {
      const res = await pnlApi.seedTemplates();
      setMessage(`Successfully seeded ${res.count || 5} channel starter templates in MongoDB`);
    } catch (err) {
      setError(err.message || 'Failed to seed templates');
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <ShieldAlert size={24} color="#00c9ff" />
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#f8fafc' }}>
              Admin Management Console
            </Typography>
            <Chip label="Admin Access" size="small" sx={{ bgcolor: 'rgba(0, 201, 255, 0.2)', color: '#00c9ff', fontWeight: 800 }} />
          </Box>
          <Typography variant="body2" sx={{ color: '#94a3b8', mt: 0.5 }}>
            Manage registered sellers, trial periods, Razorpay subscriptions, and channel templates.
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            variant="outlined"
            size="small"
            onClick={loadAdminData}
            startIcon={<RefreshCw size={14} />}
            sx={{ borderColor: 'rgba(255,255,255,0.15)', color: '#cbd5e1', textTransform: 'none', borderRadius: '8px' }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            size="small"
            onClick={handleSeedTemplates}
            startIcon={<Sparkles size={14} />}
            sx={{ background: 'linear-gradient(135deg, #00c9ff 0%, #0088ff 100%)', textTransform: 'none', fontWeight: 700, borderRadius: '8px' }}
          >
            Seed Channel Templates
          </Button>
        </Box>
      </Box>

      {message && <Alert severity="success" sx={{ mb: 3, borderRadius: '10px' }}>{message}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 3, borderRadius: '10px' }}>{error}</Alert>}

      {/* Admin Metric Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Box className="pnl-card">
            <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600 }}>TOTAL SELLERS</Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#f8fafc', my: 0.5 }}>
              {stats.totalUsers || usersList.length}
            </Typography>
            <Typography variant="caption" sx={{ color: '#00c9ff' }}>
              {stats.trialUsers} on Free Trial · {stats.proUsers} Pro · {stats.enterpriseUsers} Enterprise
            </Typography>
          </Box>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Box className="pnl-card">
            <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600 }}>MONTHLY RECURRING REVENUE (MRR)</Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#00d68f', my: 0.5 }}>
              ₹{(stats.mrrINR || 0).toLocaleString()}
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748b' }}>
              From active ₹199 and ₹499 plans
            </Typography>
          </Box>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Box className="pnl-card">
            <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600 }}>TOTAL PAYMENTS COLLECTED</Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#ffb703', my: 0.5 }}>
              ₹{(stats.totalRevenueINR || 0).toLocaleString()}
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748b' }}>
              {paymentsList.length} Razorpay Transactions
            </Typography>
          </Box>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Box className="pnl-card">
            <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600 }}>FILES & ORDERS INGESTED</Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#00c9ff', my: 0.5 }}>
              {stats.totalOrders || 0}
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748b' }}>
              Across {stats.totalBatches || 0} batches
            </Typography>
          </Box>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onChange={(_, val) => setActiveTab(val)}
        sx={{
          mb: 3,
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          '& .MuiTab-root': { color: '#94a3b8', textTransform: 'none', fontWeight: 600 },
          '& .Mui-selected': { color: '#00c9ff !important' },
          '& .MuiTabs-indicator': { backgroundColor: '#00c9ff' },
        }}
      >
        <Tab label="User Accounts & Subscriptions" />
        <Tab label="Razorpay Transaction Logs" />
        <Tab label="Default Channel Templates" />
      </Tabs>

      {/* Tab 0: Users Table */}
      {activeTab === 0 && (
        <Box className="pnl-card">
          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#f8fafc', mb: 2 }}>
            Registered Users ({usersList.length})
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ color: '#64748b' }}>User</TableCell>
                <TableCell sx={{ color: '#64748b' }}>Business</TableCell>
                <TableCell sx={{ color: '#64748b' }}>Plan</TableCell>
                <TableCell sx={{ color: '#64748b' }}>Trial Expiry</TableCell>
                <TableCell sx={{ color: '#64748b' }}>Status</TableCell>
                <TableCell sx={{ color: '#64748b' }}>Admin Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {usersList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} sx={{ textAlign: 'center', color: '#64748b', py: 3 }}>
                    No users registered in MongoDB yet.
                  </TableCell>
                </TableRow>
              ) : (
                usersList.map((u) => {
                  const daysLeft = u.trialEndsAt
                    ? Math.max(0, Math.ceil((new Date(u.trialEndsAt) - new Date()) / (1000 * 60 * 60 * 24)))
                    : 0;

                  return (
                    <TableRow key={u._id}>
                      <TableCell sx={{ fontWeight: 600, color: '#f8fafc' }}>
                        {u.name || 'Anonymous'}<br />
                        <Typography variant="caption" sx={{ color: '#64748b' }}>{u.email}</Typography>
                      </TableCell>
                      <TableCell sx={{ color: '#cbd5e1' }}>{u.businessName || '-'}</TableCell>
                      <TableCell>
                        <Chip
                          label={u.plan.toUpperCase()}
                          size="small"
                          sx={{
                            bgcolor: u.plan === 'enterprise_499' ? 'rgba(255,183,3,0.2)' : u.plan === 'pro_199' ? 'rgba(0,201,255,0.2)' : 'rgba(255,255,255,0.05)',
                            color: u.plan === 'enterprise_499' ? '#ffb703' : u.plan === 'pro_199' ? '#00c9ff' : '#94a3b8',
                            fontWeight: 700,
                            fontSize: '0.75rem',
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ color: '#cbd5e1' }}>
                        {daysLeft > 0 ? `${daysLeft} days remaining` : 'Trial Expired'}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={u.subscriptionStatus}
                          size="small"
                          sx={{
                            bgcolor: u.subscriptionStatus === 'active' ? 'rgba(0,214,143,0.15)' : 'rgba(255,77,109,0.15)',
                            color: u.subscriptionStatus === 'active' ? '#00d68f' : '#ff4d6d',
                            fontSize: '0.7rem',
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => handleExtendTrial(u._id)}
                          sx={{ borderColor: 'rgba(0,201,255,0.3)', color: '#00c9ff', textTransform: 'none', fontSize: '0.75rem', borderRadius: '6px' }}
                        >
                          +30 Days Trial
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Box>
      )}

      {/* Tab 1: Payments Table */}
      {activeTab === 1 && (
        <Box className="pnl-card">
          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#f8fafc', mb: 2 }}>
            Razorpay Subscription Payments ({paymentsList.length})
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ color: '#64748b' }}>Date</TableCell>
                <TableCell sx={{ color: '#64748b' }}>User</TableCell>
                <TableCell sx={{ color: '#64748b' }}>Plan</TableCell>
                <TableCell sx={{ color: '#64748b' }}>Amount</TableCell>
                <TableCell sx={{ color: '#64748b' }}>Payment ID</TableCell>
                <TableCell sx={{ color: '#64748b' }}>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paymentsList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} sx={{ textAlign: 'center', color: '#64748b', py: 3 }}>
                    No Razorpay transactions recorded yet.
                  </TableCell>
                </TableRow>
              ) : (
                paymentsList.map((p, i) => (
                  <TableRow key={i}>
                    <TableCell sx={{ color: '#cbd5e1' }}>
                      {new Date(p.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell sx={{ color: '#f8fafc' }}>
                      {p.userId?.email || 'Customer'}
                    </TableCell>
                    <TableCell sx={{ color: '#00c9ff', fontWeight: 600 }}>{p.plan}</TableCell>
                    <TableCell sx={{ color: '#00d68f', fontWeight: 700 }}>₹{p.amountINR}</TableCell>
                    <TableCell sx={{ color: '#94a3b8', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                      {p.razorpayPaymentId}
                    </TableCell>
                    <TableCell>
                      <Chip label={p.status} size="small" sx={{ bgcolor: 'rgba(0,214,143,0.15)', color: '#00d68f', fontSize: '0.7rem' }} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Box>
      )}

      {/* Tab 2: Channel Templates */}
      {activeTab === 2 && (
        <Box className="pnl-card">
          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#f8fafc', mb: 1 }}>
            Standard Starter Channel Templates
          </Typography>
          <Typography variant="body2" sx={{ color: '#94a3b8', mb: 3 }}>
            These templates are automatically applied when sellers upload exports from Amazon, Flipkart, Meesho, Shopify, or WooCommerce.
          </Typography>

          <Grid container spacing={2}>
            {['Amazon MTR', 'Flipkart Sales Report', 'Meesho Orders Export', 'Shopify Orders CSV', 'WooCommerce'].map((name, i) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={i}>
                <Box sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#00c9ff' }}>
                      {name}
                    </Typography>
                    <Chip label="System Verified" size="small" sx={{ bgcolor: 'rgba(0,214,143,0.15)', color: '#00d68f', fontSize: '0.65rem' }} />
                  </Box>
                  <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                    Standard multi-column mapping with auto-status conversions.
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </Box>
  );
}
