import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  Button,
  Grid,
  Chip,
  IconButton,
  Alert,
} from '@mui/material';
import { X, CheckCircle2, Zap, Crown, Shield, Clock, CreditCard } from 'lucide-react';
import { usePnlAuth } from '../auth/AuthContext.jsx';
import { pnlApi } from '../api/client.js';

export default function PricingModal({ open, onClose }) {
  const { user, setUser, trialDaysRemaining, isPro, isEnterprise } = usePnlAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubscribe = async (planId) => {
    setError('');
    setLoading(true);
    try {
      // 1. Create Razorpay order on backend
      const orderData = await pnlApi.createOrder(planId);

      // 2. Open real Razorpay checkout if script loaded, otherwise simulate smooth dev payment
      if (typeof window !== 'undefined' && window.Razorpay && orderData.keyId && !orderData.keyId.includes('placeholder')) {
        const options = {
          key: orderData.keyId,
          amount: orderData.amountPaise,
          currency: orderData.currency,
          name: 'LyZov P&L Analyzer',
          description: orderData.plan.name,
          order_id: orderData.orderId,
          handler: async (response) => {
            try {
              const verifyRes = await pnlApi.verifyPayment({
                planId,
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              });
              setUser(verifyRes.user);
              setSuccessMsg(verifyRes.message || 'Payment successful!');
              setTimeout(() => onClose(), 1500);
            } catch (err) {
              setError(err.message || 'Payment verification failed');
            }
          },
          prefill: {
            email: user?.email || '',
            name: user?.name || '',
          },
          theme: { color: '#00c9ff' },
        };
        const rzp = new window.Razorpay(options);
        rzp.open();
      } else {
        // Fallback simulated payment for local development
        const verifyRes = await pnlApi.verifyPayment({
          planId,
          razorpayOrderId: orderData.orderId,
          razorpayPaymentId: `pay_${Date.now()}`,
          razorpaySignature: 'simulated_dev_signature',
        });
        setUser(verifyRes.user);
        setSuccessMsg(verifyRes.message || 'Plan activated successfully!');
        setTimeout(() => onClose(), 1500);
      }
    } catch (err) {
      setError(err.message || 'Checkout failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          background: '#0b1120',
          color: '#f8fafc',
          borderRadius: '20px',
          border: '1px solid rgba(255, 255, 255, 0.12)',
        },
      }}
    >
      <DialogContent sx={{ p: { xs: 3, md: 5 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#f8fafc' }}>
              Choose Your Growth Plan
            </Typography>
            <Typography variant="body2" sx={{ color: '#94a3b8' }}>
              Every account includes a full 30-Day Free Trial. Upgrade anytime for unlimited access.
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small" sx={{ color: '#94a3b8' }}>
            <X size={20} />
          </IconButton>
        </Box>

        {/* Free trial countdown pill */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            p: 1.5,
            mb: 4,
            bgcolor: 'rgba(0, 201, 255, 0.08)',
            border: '1px solid rgba(0, 201, 255, 0.25)',
            borderRadius: '10px',
          }}
        >
          <Clock size={18} color="#00c9ff" />
          <Typography variant="body2" sx={{ color: '#cbd5e1' }}>
            {user?.plan === 'trial'
              ? `You are on the 1-Month Free Trial: ${trialDaysRemaining} days remaining.`
              : `Current Active Plan: ${user?.plan === 'enterprise_499' ? 'Enterprise (₹499/mo)' : 'Pro (₹199/mo)'}`}
          </Typography>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 3, borderRadius: '8px' }}>{error}</Alert>}
        {successMsg && <Alert severity="success" sx={{ mb: 3, borderRadius: '8px' }}>{successMsg}</Alert>}

        <Grid container spacing={3}>
          {/* Plan 1: Pro Seller Plan */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Box
              sx={{
                p: 3.5,
                height: '100%',
                bgcolor: 'rgba(15, 23, 42, 0.8)',
                border: user?.plan === 'pro_199' ? '2px solid #00c9ff' : '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.2s ease',
                '&:hover': { borderColor: '#00c9ff' },
              }}
            >
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#f8fafc' }}>
                    Pro Seller
                  </Typography>
                  <Zap size={20} color="#00c9ff" />
                </Box>
                <Typography variant="body2" sx={{ color: '#94a3b8', mb: 2 }}>
                  For multi-channel e-commerce sellers scaling their stores.
                </Typography>

                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 3 }}>
                  <Typography variant="h3" sx={{ fontWeight: 800, color: '#00c9ff' }}>
                    ₹199
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#64748b' }}>
                    / month
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 4 }}>
                  {[
                    'Unlimited Orders & Channels',
                    'Profit-Change Waterfall Bridge',
                    'Price & Return What-If Simulators',
                    'Universal CSV / XLSX Mapping',
                    'Data Quality Audit & Flag Drill-down',
                  ].map((feat, i) => (
                    <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                      <CheckCircle2 size={16} color="#00d68f" />
                      <Typography variant="body2" sx={{ color: '#cbd5e1' }}>
                        {feat}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>

              <Button
                variant="contained"
                onClick={() => handleSubscribe('pro_199')}
                disabled={loading || user?.plan === 'pro_199'}
                fullWidth
                sx={{
                  py: 1.2,
                  bgcolor: user?.plan === 'pro_199' ? 'rgba(255,255,255,0.1)' : '#00c9ff',
                  color: user?.plan === 'pro_199' ? '#94a3b8' : '#080c15',
                  fontWeight: 700,
                  textTransform: 'none',
                  borderRadius: '10px',
                  '&:hover': { bgcolor: '#0284c7', color: '#fff' },
                }}
              >
                {user?.plan === 'pro_199' ? 'Current Active Plan' : 'Subscribe for ₹199/mo'}
              </Button>
            </Box>
          </Grid>

          {/* Plan 2: Enterprise / CA Plan */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Box
              sx={{
                p: 3.5,
                height: '100%',
                bgcolor: 'rgba(15, 23, 42, 0.8)',
                border: user?.plan === 'enterprise_499' ? '2px solid #ffb703' : '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
                transition: 'all 0.2s ease',
                '&:hover': { borderColor: '#ffb703' },
              }}
            >
              <Chip
                label="POPULAR FOR AGENCIES"
                size="small"
                sx={{
                  position: 'absolute',
                  top: -12,
                  right: 24,
                  bgcolor: '#ffb703',
                  color: '#080c15',
                  fontWeight: 800,
                  fontSize: '0.7rem',
                }}
              />

              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#f8fafc' }}>
                    Enterprise / CA
                  </Typography>
                  <Crown size={20} color="#ffb703" />
                </Box>
                <Typography variant="body2" sx={{ color: '#94a3b8', mb: 2 }}>
                  For high-volume sellers, accounting agencies, and CAs.
                </Typography>

                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 3 }}>
                  <Typography variant="h3" sx={{ fontWeight: 800, color: '#ffb703' }}>
                    ₹499
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#64748b' }}>
                    / month
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 4 }}>
                  {[
                    'Everything in Pro Plan',
                    'Multi-Store Client Portfolios',
                    'Priority 100k+ Row Background Worker',
                    'Automated Settlement Reconciliation',
                    'PDF & Excel Export with Assumptions',
                    'Dedicated WhatsApp & Phone Support',
                  ].map((feat, i) => (
                    <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                      <CheckCircle2 size={16} color="#00d68f" />
                      <Typography variant="body2" sx={{ color: '#cbd5e1' }}>
                        {feat}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>

              <Button
                variant="contained"
                onClick={() => handleSubscribe('enterprise_499')}
                disabled={loading || user?.plan === 'enterprise_499'}
                fullWidth
                sx={{
                  py: 1.2,
                  bgcolor: user?.plan === 'enterprise_499' ? 'rgba(255,255,255,0.1)' : '#ffb703',
                  color: '#080c15',
                  fontWeight: 700,
                  textTransform: 'none',
                  borderRadius: '10px',
                  '&:hover': { bgcolor: '#fb8500', color: '#fff' },
                }}
              >
                {user?.plan === 'enterprise_499' ? 'Current Active Plan' : 'Subscribe for ₹499/mo'}
              </Button>
            </Box>
          </Grid>
        </Grid>

        <Box sx={{ mt: 4, pt: 2, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, color: '#64748b' }}>
            <Shield size={16} color="#00d68f" />
            <Typography variant="caption">Secured by Razorpay</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, color: '#64748b' }}>
            <CreditCard size={16} color="#00c9ff" />
            <Typography variant="caption">UPI, Cards, NetBanking, EMI</Typography>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
