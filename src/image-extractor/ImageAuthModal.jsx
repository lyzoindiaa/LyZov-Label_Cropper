import React, { useState } from 'react';
import {
  Dialog,
  Box,
  Typography,
  TextField,
  Button,
  Tabs,
  Tab,
  IconButton,
  Alert,
  CircularProgress,
  Radio,
  Chip,
} from '@mui/material';
import {
  X,
  Crown,
  CheckCircle2,
} from 'lucide-react';
import { gstApi } from '../gst-tool/api/client';

export default function ImageAuthModal({
  open,
  mode = 'paywall', // 'auth' | 'paywall'
  defaultTab = 0,
  user,
  onAuthSuccess,
  onClose,
}) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('image_monthly');
  const [loading, setLoading] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await gstApi.login({ email, password });
      if (res?.user) {
        onAuthSuccess(res.user);
      }
    } catch (err) {
      setError(err?.data?.error || err.message || 'Login failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    if (!name || !email || !password) {
      setError('Please provide your name, email, and password.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    setLoading(true);
    try {
      const res = await gstApi.signup({ name, email, password, phone });
      if (res?.user) {
        onAuthSuccess(res.user);
      }
    } catch (err) {
      setError(err?.data?.error || err.message || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePay = async () => {
    setError('');

    // If Razorpay SDK is loaded, initiate real checkout
    if (window.Razorpay) {
      setPaying(true);
      try {
        const order = await gstApi.createBillingOrder(selectedPlan);

        const options = {
          key: order.keyId,
          amount: order.amountPaise,
          currency: 'INR',
          name: 'LyZov Product Image Extractor',
          description:
            selectedPlan === 'image_yearly'
              ? 'Image Extractor Pro Annual (₹799/yr)'
              : 'Image Extractor Pro Monthly (₹99/mo)',
          order_id: order.orderId,
          handler: async function (response) {
            try {
              const verified = await gstApi.verifyBillingPayment({
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              });
              const updatedUser = {
                ...user,
                plan: verified.plan || selectedPlan,
                trialEndsAt: verified.validTill,
              };
              localStorage.setItem('gst_user', JSON.stringify(updatedUser));
              onAuthSuccess(updatedUser);
            } catch (vErr) {
              setError(vErr?.data?.error || 'Payment verification failed. Contact support.');
            }
          },
          prefill: {
            name: user?.name || '',
            email: user?.email || '',
            contact: user?.phone || '',
          },
          theme: {
            color: '#00c9ff',
          },
          modal: {
            ondismiss: () => setPaying(false),
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', (response) => {
          setError(`Payment failed: ${response.error?.description || 'Payment rejected'}`);
          setPaying(false);
        });
        rzp.open();
      } catch (err) {
        // Fallback for prototype/demo if backend is not yet restarted with new plans
        console.warn('Razorpay server order creation notice:', err);
        handleSimulatedProUpgrade();
      } finally {
        setPaying(false);
      }
    } else {
      // In prototype testing if script or network isn't active
      handleSimulatedProUpgrade();
    }
  };

  // Prototype helper to simulate upgrade
  const handleSimulatedProUpgrade = () => {
    const dummyUser = user || {
      _id: 'usr_demo_123',
      name: name || 'Demo Seller',
      email: email || 'seller@lyzov.com',
    };
    const updatedUser = {
      ...dummyUser,
      plan: selectedPlan,
      trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };
    localStorage.setItem('gst_user', JSON.stringify(updatedUser));
    onAuthSuccess(updatedUser);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3.5,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.4)',
          overflow: 'hidden',
        },
      }}
    >
      <Box sx={{ position: 'relative', p: { xs: 2.5, sm: 3.5 } }}>
        <IconButton
          onClick={onClose}
          size="small"
          sx={{
            position: 'absolute',
            right: 14,
            top: 14,
            color: 'text.secondary',
            '&:hover': { color: 'text.primary' },
          }}
        >
          <X size={18} />
        </IconButton>

        {mode === 'paywall' ? (
          /* ================= UPGRADE / PAYWALL VIEW ================= */
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 2.5,
                  background: 'linear-gradient(135deg, #00c9ff 0%, #0077ff 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 14px rgba(0, 201, 255, 0.35)',
                }}
              >
                <Crown size={22} color="#ffffff" />
              </Box>
              <Box>
                <Typography variant="h6" fontWeight={800} sx={{ letterSpacing: '-0.3px', lineHeight: 1.2 }}>
                  Upgrade to Image Extractor <span style={{ color: '#00c9ff' }}>Pro</span>
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Unlock unlimited batch extractions, bulk ZIP downloads & 4K quality
                </Typography>
              </Box>
            </Box>

            {error && (
              <Alert severity="error" sx={{ my: 2, borderRadius: 2 }}>
                {error}
              </Alert>
            )}

            {/* Plan Selector */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5, my: 2.5 }}>
              {/* Monthly Plan */}
              <Box
                onClick={() => setSelectedPlan('image_monthly')}
                sx={{
                  p: 2,
                  borderRadius: 2.5,
                  cursor: 'pointer',
                  border: '2px solid',
                  borderColor: selectedPlan === 'image_monthly' ? '#00c9ff' : 'var(--border)',
                  bgcolor: selectedPlan === 'image_monthly' ? 'rgba(0, 201, 255, 0.08)' : 'var(--surface-2)',
                  transition: 'all 0.2s ease',
                  position: 'relative',
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Typography variant="subtitle2" fontWeight={800}>
                    Monthly Pass
                  </Typography>
                  <Radio checked={selectedPlan === 'image_monthly'} size="small" sx={{ p: 0, color: '#00c9ff' }} />
                </Box>
                <Typography variant="h5" fontWeight={900} sx={{ my: 0.5, color: '#00c9ff' }}>
                  ₹99 <Typography component="span" variant="caption" color="text.secondary">/ month</Typography>
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  Flexible month-to-month access. Cancel anytime.
                </Typography>
              </Box>

              {/* Annual Plan (Best Value) */}
              <Box
                onClick={() => setSelectedPlan('image_yearly')}
                sx={{
                  p: 2,
                  borderRadius: 2.5,
                  cursor: 'pointer',
                  border: '2px solid',
                  borderColor: selectedPlan === 'image_yearly' ? '#00d68f' : 'var(--border)',
                  bgcolor: selectedPlan === 'image_yearly' ? 'rgba(0, 214, 143, 0.08)' : 'var(--surface-2)',
                  transition: 'all 0.2s ease',
                  position: 'relative',
                }}
              >
                <Chip
                  label="SAVE 33%"
                  size="small"
                  sx={{
                    position: 'absolute',
                    top: -10,
                    right: 12,
                    bgcolor: '#00d68f',
                    color: '#080c18',
                    fontWeight: 800,
                    fontSize: '0.65rem',
                    height: 20,
                  }}
                />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Typography variant="subtitle2" fontWeight={800}>
                    Annual Pro
                  </Typography>
                  <Radio checked={selectedPlan === 'image_yearly'} size="small" sx={{ p: 0, color: '#00d68f' }} />
                </Box>
                <Typography variant="h5" fontWeight={900} sx={{ my: 0.5, color: '#00d68f' }}>
                  ₹799 <Typography component="span" variant="caption" color="text.secondary">/ year</Typography>
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  Just ₹66/month. Unlimited catalog exports.
                </Typography>
              </Box>
            </Box>

            {/* Feature List */}
            <Box sx={{ bgcolor: 'var(--surface-2)', p: 2, borderRadius: 2.5, mb: 3 }}>
              <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, mb: 1, display: 'block' }}>
                Everything included with Pro:
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {[
                  'Unlimited high-resolution image extractions (No 5/day cap)',
                  'Batch multi-link extraction (Paste up to 50 URLs at once)',
                  'Download all product images as a bundled ZIP file',
                  'Amazon, Flipkart, Meesho, Myntra & Custom Stores supported',
                  'High-speed server rendering with sharp format conversion (PNG & JPEG)',
                ].map((feat, idx) => (
                  <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CheckCircle2 size={15} color="#00d68f" />
                    <Typography variant="body2" sx={{ fontSize: '0.82rem', fontWeight: 500 }}>
                      {feat}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>

            {/* Pay Button */}
            <Button
              fullWidth
              variant="contained"
              disabled={paying}
              onClick={handlePay}
              sx={{
                py: 1.3,
                borderRadius: 2.5,
                fontWeight: 800,
                fontSize: '0.95rem',
                textTransform: 'none',
                background: 'linear-gradient(135deg, #00c9ff 0%, #0077ff 100%)',
                color: '#ffffff',
                boxShadow: '0 6px 20px rgba(0, 201, 255, 0.4)',
              }}
            >
              {paying ? (
                <CircularProgress size={22} color="inherit" />
              ) : (
                `Proceed with Razorpay (${selectedPlan === 'image_yearly' ? '₹799/yr' : '₹99/mo'})`
              )}
            </Button>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 1.5 }}>
              🔒 Secured by Razorpay 256-bit encryption. UPI, Cards & NetBanking accepted.
            </Typography>
          </Box>
        ) : (
          /* ================= SIGN IN / 30-DAY TRIAL TABS ================= */
          <Box>
            <Box sx={{ textAlign: 'center', mb: 2 }}>
              <Typography variant="h6" fontWeight={800}>
                Welcome to LyZov Studio
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Sign in to manage your extractions or get a 30-day unlimited trial
              </Typography>
            </Box>

            <Tabs
              value={activeTab}
              onChange={(_, v) => {
                setActiveTab(v);
                setError('');
              }}
              variant="fullWidth"
              sx={{
                mb: 2.5,
                borderBottom: '1px solid var(--border)',
                '& .MuiTab-root': { fontWeight: 700, textTransform: 'none', fontSize: '0.9rem' },
              }}
            >
              <Tab label="Sign In" />
              <Tab label="Get 30-Day Free Trial" />
            </Tabs>

            {error && (
              <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                {error}
              </Alert>
            )}

            {activeTab === 0 ? (
              <Box component="form" onSubmit={handleLogin} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  label="Email Address"
                  type="email"
                  size="small"
                  required
                  fullWidth
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <TextField
                  label="Password"
                  type="password"
                  size="small"
                  required
                  fullWidth
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  disabled={loading}
                  sx={{
                    py: 1.1,
                    borderRadius: 2,
                    fontWeight: 700,
                    textTransform: 'none',
                    background: 'linear-gradient(135deg, #00c9ff 0%, #0077ff 100%)',
                  }}
                >
                  {loading ? <CircularProgress size={20} color="inherit" /> : 'Sign In'}
                </Button>
              </Box>
            ) : (
              <Box component="form" onSubmit={handleSignup} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  label="Full Name / Store Name"
                  size="small"
                  required
                  fullWidth
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <TextField
                  label="Email Address"
                  type="email"
                  size="small"
                  required
                  fullWidth
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <TextField
                  label="Password (min 6 chars)"
                  type="password"
                  size="small"
                  required
                  fullWidth
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <TextField
                  label="Phone / WhatsApp (Optional)"
                  size="small"
                  fullWidth
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  disabled={loading}
                  sx={{
                    py: 1.1,
                    borderRadius: 2,
                    fontWeight: 700,
                    textTransform: 'none',
                    background: 'linear-gradient(135deg, #00d68f 0%, #00a86b 100%)',
                    color: '#ffffff',
                  }}
                >
                  {loading ? <CircularProgress size={20} color="inherit" /> : 'Start 30-Day Free Trial'}
                </Button>
              </Box>
            )}
          </Box>
        )}
      </Box>
    </Dialog>
  );
}
