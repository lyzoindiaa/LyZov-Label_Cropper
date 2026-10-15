import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  TextField,
  Button,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
  Divider,
  Chip,
  IconButton,
} from '@mui/material';
import {
  Scissors,
  CheckCircle2,
  Sparkles,
  Lock,
  Zap,
  ShieldCheck,
  CreditCard,
  LogOut,
  X,
} from 'lucide-react';
import { gstApi, setAuthSession } from '../gst-tool/api/client';

export default function CropperAuthModal({
  open,
  mode = 'auth', // 'auth' | 'paywall'
  defaultTab = 0, // 0 = Login, 1 = Signup
  user,
  onAuthSuccess,
  onClose,
  canDismiss = false,
}) {
  const [tab, setTab] = useState(defaultTab); // 0 = Login, 1 = Signup
  const [selectedPlan, setSelectedPlan] = useState('cropper_monthly'); // 'cropper_monthly' | 'cropper_yearly'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [paying, setPaying] = useState(false);

  React.useEffect(() => {
    if (open) {
      setTab(defaultTab);
      setError('');
    }
  }, [open, defaultTab]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Please enter your email and password');
      return;
    }
    setLoading(true);
    try {
      const res = await gstApi.login({ email, password });
      if (res?.user) {
        onAuthSuccess(res.user);
      }
    } catch (err) {
      setError(err?.data?.error || err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    if (!name || !email || !password) {
      setError('Please fill in your name, email, and password');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
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

    // SECURITY: Razorpay checkout script must be loaded before payment can proceed.
    // If it isn't available (ad-blocker, offline, slow network), we stop here.
    // The old code had a mock-verify fallback here that granted Pro access for free.
    if (!window.Razorpay) {
      setError(
        'Payment gateway failed to load. Please disable any ad-blockers, reload the page, and try again.'
      );
      return;
    }

    setPaying(true);
    try {
      const order = await gstApi.createBillingOrder(selectedPlan);

      const options = {
        key: order.keyId,
        amount: order.amountPaise,
        currency: 'INR',
        name: 'LyZov Label Cropper',
        description: selectedPlan === 'cropper_yearly'
          ? 'Label Cropper Pro Annual (₹999/yr)'
          : 'Label Cropper Pro Monthly (₹99/mo)',
        order_id: order.orderId,
        handler: async function (response) {
          try {
            // All three Razorpay fields are required — backend enforces HMAC verification
            const verified = await gstApi.verifyBillingPayment({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            const updatedUser = {
              ...user,
              plan: verified.plan,
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
        setError(`Payment failed: ${response.error?.description || 'Unknown error'}`);
        setPaying(false);
      });
      rzp.open();
    } catch (err) {
      setError(err?.data?.error || err.message || 'Payment processing failed');
      setPaying(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={canDismiss ? onClose : undefined}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            bgcolor: 'background.paper',
            color: 'text.primary',
            borderRadius: 4,
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: '0 24px 60px rgba(0, 0, 0, 0.35)',
            overflow: 'hidden',
            m: { xs: 1.5, sm: 2 },
          },
        },
      }}
    >
      {/* Top Banner Header */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, rgba(0, 201, 255, 0.2) 0%, rgba(255, 110, 199, 0.2) 100%)',
          p: { xs: 2.5, sm: 3 },
          borderBottom: '1px solid',
          borderColor: 'divider',
          position: 'relative',
        }}
      >
        {canDismiss && (
          <IconButton
            onClick={onClose}
            size="small"
            sx={{ position: 'absolute', top: 12, right: 12, color: 'text.secondary' }}
          >
            <X size={18} />
          </IconButton>
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #00c9ff 0%, #a78bfa 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(0, 201, 255, 0.4)',
            }}
          >
            <Scissors size={22} color="#ffffff" />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={800} sx={{ letterSpacing: '-0.5px' }}>
              LyZov <span style={{ color: '#00c9ff' }}>Cropper</span> Studio
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
              Batch PDF Shipping Label Cropper &amp; Thermal Printer
            </Typography>
          </Box>
        </Box>

        {mode === 'auth' ? (
          <Box sx={{ mt: 1.5, display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
            <Chip
              icon={<Sparkles size={14} color="#00c9ff" />}
              label="30 Days Unlimited Free Trial Included"
              size="small"
              sx={{
                bgcolor: 'rgba(0, 201, 255, 0.15)',
                color: '#00c9ff',
                fontWeight: 700,
                border: '1px solid rgba(0, 201, 255, 0.3)',
              }}
            />
            <Chip
              label="Then only ₹99/month"
              size="small"
              sx={{
                bgcolor: 'rgba(255, 255, 255, 0.08)',
                color: '#e2e8f0',
                fontWeight: 600,
              }}
            />
          </Box>
        ) : (
          <Box sx={{ mt: 1 }}>
            <Chip
              icon={<Lock size={14} color="#ff4d6d" />}
              label="30-Day Free Trial Expired"
              size="small"
              sx={{
                bgcolor: 'rgba(255, 77, 109, 0.15)',
                color: '#ff4d6d',
                fontWeight: 700,
                border: '1px solid rgba(255, 77, 109, 0.3)',
              }}
            />
          </Box>
        )}
      </Box>

      <DialogContent sx={{ p: { xs: 2.5, sm: 3 } }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* MODE: AUTHENTICATION (Login / Sign Up) */}
        {mode === 'auth' && (
          <Box>
            <Tabs
              value={tab}
              onChange={(_, v) => {
                setTab(v);
                setError('');
              }}
              variant="fullWidth"
              sx={{
                mb: 2.5,
                bgcolor: 'rgba(255, 255, 255, 0.03)',
                borderRadius: 2.5,
                p: 0.5,
                '& .MuiTabs-indicator': { display: 'none' },
                '& .MuiTab-root': {
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  minHeight: 40,
                  color: 'text.secondary',
                  '&.Mui-selected': {
                    bgcolor: 'rgba(0, 201, 255, 0.15)',
                    color: '#00c9ff',
                    border: '1px solid rgba(0, 201, 255, 0.3)',
                  },
                },
              }}
            >
              <Tab label="Sign In" />
              <Tab label="Create Account (Free Trial)" />
            </Tabs>

            {/* TAB 0: LOGIN */}
            {tab === 0 && (
              <Box component="form" onSubmit={handleLogin} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Sign in with your email and password to access the label cropper.
                </Typography>
                <TextField
                  label="Email Address"
                  type="email"
                  size="small"
                  fullWidth
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seller@example.com"
                  required
                />
                <TextField
                  label="Password"
                  type="password"
                  size="small"
                  fullWidth
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <Lock size={16} />}
                  sx={{
                    mt: 1,
                    py: 1.2,
                    fontWeight: 800,
                    fontSize: '0.95rem',
                    borderRadius: 2.5,
                    background: 'linear-gradient(135deg, #00c9ff 0%, #0077ff 100%)',
                    boxShadow: '0 4px 16px rgba(0, 201, 255, 0.35)',
                    textTransform: 'none',
                  }}
                >
                  {loading ? 'Signing In...' : 'Sign In & Start Cropping'}
                </Button>
              </Box>
            )}

            {/* TAB 1: SIGNUP */}
            {tab === 1 && (
              <Box component="form" onSubmit={handleSignup} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'rgba(0, 201, 255, 0.08)', border: '1px solid rgba(0, 201, 255, 0.2)' }}>
                  <Typography variant="caption" sx={{ color: '#00c9ff', fontWeight: 700, display: 'block', mb: 0.3 }}>
                    🎉 30-Day Free Trial Activates Automatically
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem', lineHeight: 1.3 }}>
                    Full unlimited access for 30 days. No credit card required upfront. Pay only ₹99/month after your trial ends.
                  </Typography>
                </Box>

                <TextField
                  label="Full Name / Store Name"
                  size="small"
                  fullWidth
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. LyZov Fashion"
                  required
                />
                <TextField
                  label="Email Address"
                  type="email"
                  size="small"
                  fullWidth
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seller@example.com"
                  required
                />
                <TextField
                  label="Create Password (min 6 chars)"
                  type="password"
                  size="small"
                  fullWidth
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
                <TextField
                  label="Phone / WhatsApp (Optional)"
                  size="small"
                  fullWidth
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                />

                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <Sparkles size={16} />}
                  sx={{
                    mt: 1,
                    py: 1.2,
                    fontWeight: 800,
                    fontSize: '0.95rem',
                    borderRadius: 2.5,
                    background: 'linear-gradient(135deg, #00c9ff 0%, #0077ff 100%)',
                    boxShadow: '0 4px 18px rgba(0, 201, 255, 0.35)',
                    textTransform: 'none',
                  }}
                >
                  {loading ? 'Creating Account...' : 'Start Free 30-Day Trial'}
                </Button>
              </Box>
            )}

            <Divider sx={{ my: 2.5, borderColor: 'divider' }} />

            {/* Feature Checklist */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1 }}>
              {[
                'Amazon 4"×6" & 2-Page Auto-Extract',
                'Flipkart 3.22"×5.13" Precision Crop',
                'Meesho & Free Adjust Presets',
                'Batch Thermal Printer Ready',
              ].map((feat, idx) => (
                <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                  <CheckCircle2 size={14} color="#00c9ff" />
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
                    {feat}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        )}

        {/* MODE: PAYWALL (Trial Expired -> ₹99/month Subscription) */}
        {mode === 'paywall' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Box sx={{ textAlign: 'center', pt: 1 }}>
              <Typography variant="h5" fontWeight={800} gutterBottom>
                Upgrade to Continue Cropping
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 440, mx: 'auto' }}>
                Your 30-day free trial has expired. Subscribe to <b>Label Cropper Pro</b> for only <b>₹99 / month</b> to keep cropping unlimited marketplace shipping labels.
              </Typography>
            </Box>

            {/* Plan Selector: Monthly (₹99) vs Annual (₹999) */}
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
              <Box
                onClick={() => setSelectedPlan('cropper_monthly')}
                sx={{
                  p: 2,
                  borderRadius: 2.5,
                  cursor: 'pointer',
                  border: selectedPlan === 'cropper_monthly' ? '2px solid #00c9ff' : '1px solid rgba(255,255,255,0.1)',
                  bgcolor: selectedPlan === 'cropper_monthly' ? 'rgba(0, 201, 255, 0.12)' : 'rgba(255,255,255,0.02)',
                  textAlign: 'center',
                  transition: 'all 0.2s',
                }}
              >
                <Typography variant="caption" sx={{ color: '#00c9ff', fontWeight: 800, display: 'block' }}>
                  MONTHLY
                </Typography>
                <Typography variant="h5" fontWeight={900} sx={{ my: 0.5, color: '#ffffff' }}>
                  ₹99
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  per month
                </Typography>
              </Box>

              <Box
                onClick={() => setSelectedPlan('cropper_yearly')}
                sx={{
                  p: 2,
                  borderRadius: 2.5,
                  cursor: 'pointer',
                  border: selectedPlan === 'cropper_yearly' ? '2px solid #00d68f' : '1px solid rgba(255,255,255,0.1)',
                  bgcolor: selectedPlan === 'cropper_yearly' ? 'rgba(0, 214, 143, 0.12)' : 'rgba(255,255,255,0.02)',
                  textAlign: 'center',
                  position: 'relative',
                  transition: 'all 0.2s',
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    top: -9,
                    right: 8,
                    background: '#00d68f',
                    color: '#081420',
                    fontSize: '0.62rem',
                    fontWeight: 900,
                    padding: '1px 6px',
                    borderRadius: 4,
                  }}
                >
                  SAVE 16%
                </span>
                <Typography variant="caption" sx={{ color: '#00d68f', fontWeight: 800, display: 'block' }}>
                  ANNUAL (1 YEAR)
                </Typography>
                <Typography variant="h5" fontWeight={900} sx={{ my: 0.5, color: '#ffffff' }}>
                  ₹999
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  ₹83/mo billed yearly
                </Typography>
              </Box>
            </Box>

            {/* Benefits List */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.2, px: 1 }}>
              {[
                'Unlimited batch PDF label cropping every day',
                'Auto 1st-page extraction for Amazon 2-page labels',
                'Exact 3.22" × 5.13" Flipkart shipping label preset',
                'Thermal printer format & high-res ZIP output',
                '100% fast, client-side, secure processing',
              ].map((benefit, i) => (
                <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                  <CheckCircle2 size={16} color="#00c9ff" style={{ flexShrink: 0 }} />
                  <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                    {benefit}
                  </Typography>
                </Box>
              ))}
            </Box>

            <Button
              variant="contained"
              fullWidth
              size="large"
              disabled={paying}
              onClick={handlePay}
              startIcon={paying ? <CircularProgress size={18} color="inherit" /> : <CreditCard size={18} />}
              sx={{
                py: 1.5,
                fontWeight: 900,
                fontSize: '1rem',
                borderRadius: 2.5,
                background: selectedPlan === 'cropper_yearly'
                  ? 'linear-gradient(135deg, #00d68f 0%, #0077ff 100%)'
                  : 'linear-gradient(135deg, #00c9ff 0%, #0077ff 100%)',
                boxShadow: '0 6px 22px rgba(0, 201, 255, 0.45)',
                textTransform: 'none',
              }}
            >
              {paying ? 'Processing Payment...' : `Pay ${selectedPlan === 'cropper_yearly' ? '₹999 / Year' : '₹99 / Month'} & Activate Pro`}
            </Button>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Logged in as: <b>{user?.email}</b>
              </Typography>
              <Button
                size="small"
                startIcon={<LogOut size={13} />}
                onClick={() => {
                  gstApi.logout();
                  window.location.reload();
                }}
                sx={{ color: '#ff4d6d', textTransform: 'none', fontSize: '0.75rem' }}
              >
                Log Out
              </Button>
            </Box>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}
