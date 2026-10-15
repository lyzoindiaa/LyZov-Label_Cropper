import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  Chip,
  IconButton,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import {
  X,
  Receipt,
  Crown,
  Calendar,
  CheckCircle2,
  Sparkles,
  CreditCard,
  User as UserIcon,
  Mail,
  Phone,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { gstApi } from '../gst-tool/api/client';

export default function CropperInvoicesModal({
  open,
  onClose,
  user,
  onUpgradeClick,
  theme = 'dark',
}) {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadInvoices = async () => {
    if (!open) return;
    setLoading(true);
    setError('');
    try {
      const res = await gstApi.getInvoices();
      if (res?.invoices) {
        setInvoices(res.invoices);
      }
    } catch (err) {
      console.error('Failed to load invoices', err);
      setError('Unable to load invoices. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadInvoices();
    }
  }, [open]);

  if (!user) return null;

  const isPro = ['cropper_monthly', 'cropper_yearly', 'starter', 'pro'].includes(user.plan);
  const isTrial = user.plan === 'trial';
  const expiryDate = user.trialEndsAt ? new Date(user.trialEndsAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }) : 'Unlimited';

  const planName = user.plan === 'cropper_yearly'
    ? 'Label Cropper Pro Annual (₹999/yr)'
    : user.plan === 'cropper_monthly'
    ? 'Label Cropper Pro Monthly (₹99/mo)'
    : user.plan === 'starter'
    ? 'GST Tool Starter (₹149/mo)'
    : user.plan === 'pro'
    ? 'GST Tool Pro (₹499/mo)'
    : '30-Day Free Trial';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            bgcolor: 'background.paper',
            backgroundImage: 'none',
            borderRadius: 3.5,
            border: '1px solid',
            borderColor: 'divider',
            overflow: 'hidden',
          },
        },
      }}
    >
      {/* Dialog Header */}
      <DialogTitle
        sx={{
          p: { xs: 2, sm: 2.5 },
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: theme === 'dark' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #00c9ff 0%, #0077ff 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(0, 201, 255, 0.35)',
            }}
          >
            <Receipt size={20} color="#ffffff" />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={800} sx={{ fontSize: '1.05rem', lineHeight: 1.2 }}>
              My Subscription &amp; Payments
            </Typography>
            <Typography variant="caption" color="text.secondary">
              View your active plan, expiration date, and payment receipts
            </Typography>
          </Box>
        </Box>

        <IconButton size="small" onClick={onClose} sx={{ color: 'text.secondary' }}>
          <X size={18} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: { xs: 2, sm: 3 }, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        {/* Active Subscription Banner Card */}
        <Box
          sx={{
            p: 2.5,
            borderRadius: 2.5,
            background: isPro
              ? 'linear-gradient(135deg, rgba(0, 214, 143, 0.12) 0%, rgba(0, 201, 255, 0.08) 100%)'
              : 'linear-gradient(135deg, rgba(0, 201, 255, 0.12) 0%, rgba(167, 139, 250, 0.08) 100%)',
            border: '1px solid',
            borderColor: isPro ? 'rgba(0, 214, 143, 0.3)' : 'rgba(0, 201, 255, 0.3)',
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'stretch', sm: 'center' },
            gap: 2,
          }}
        >
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Chip
                icon={isPro ? <Crown size={13} color="#00d68f" /> : <Sparkles size={13} color="#00c9ff" />}
                label={isPro ? 'PRO ACTIVE' : 'FREE TRIAL'}
                size="small"
                sx={{
                  bgcolor: isPro ? 'rgba(0, 214, 143, 0.2)' : 'rgba(0, 201, 255, 0.2)',
                  color: isPro ? '#00d68f' : '#00c9ff',
                  fontWeight: 800,
                  fontSize: '0.72rem',
                }}
              />
              <Typography variant="subtitle1" fontWeight={800}>
                {planName}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', mt: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                <Calendar size={14} color="#8896b3" />
                <Typography variant="caption" color="text.secondary">
                  Valid until: <b>{expiryDate}</b>
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                <CheckCircle2 size={14} color="#00d68f" />
                <Typography variant="caption" color="text.secondary">
                  Unlimited Label Cropping &amp; Thermal Printing
                </Typography>
              </Box>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            {user.plan !== 'cropper_yearly' && (
              <Button
                variant="contained"
                size="small"
                onClick={() => {
                  onClose();
                  onUpgradeClick?.('cropper_yearly');
                }}
                sx={{
                  background: 'linear-gradient(135deg, #00c9ff 0%, #0077ff 100%)',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.78rem',
                  textTransform: 'none',
                  borderRadius: 2,
                  px: 1.8,
                  py: 0.8,
                  boxShadow: '0 4px 14px rgba(0, 201, 255, 0.35)',
                  whiteSpace: 'nowrap',
                }}
              >
                {isPro ? 'Upgrade to Annual ₹999/yr' : 'Upgrade to Pro ₹99/mo'}
              </Button>
            )}
          </Box>
        </Box>

        {/* User Details Mini Bar */}
        <Box
          sx={{
            p: 1.5,
            px: 2,
            borderRadius: 2,
            bgcolor: theme === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
            border: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 1.5,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
              <UserIcon size={14} color="#8896b3" />
              <Typography variant="caption" fontWeight={600}>
                {user.name || 'Seller'}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
              <Mail size={14} color="#8896b3" />
              <Typography variant="caption" color="text.secondary">
                {user.email}
              </Typography>
            </Box>
            {user.phone && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                <Phone size={14} color="#8896b3" />
                <Typography variant="caption" color="text.secondary">
                  {user.phone}
                </Typography>
              </Box>
            )}
          </Box>

          <Tooltip title="Refresh Invoices">
            <IconButton size="small" onClick={loadInvoices} disabled={loading}>
              <RefreshCw size={14} className={loading ? 'spin' : ''} />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Payment History & Invoices Table */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
              <CreditCard size={16} color={theme === 'dark' ? '#00c9ff' : '#0284c7'} />
              Payment History ({invoices.length})
            </Typography>
          </Box>

          {loading ? (
            <Box sx={{ p: 4, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <CircularProgress size={28} color="primary" />
            </Box>
          ) : invoices.length === 0 ? (
            <Box
              sx={{
                p: 4,
                textAlign: 'center',
                borderRadius: 2.5,
                border: '1px dashed',
                borderColor: 'divider',
                bgcolor: theme === 'dark' ? 'rgba(255, 255, 255, 0.01)' : 'rgba(0, 0, 0, 0.01)',
              }}
            >
              <Receipt size={32} color="#8896b3" style={{ opacity: 0.6, marginBottom: 8 }} />
              <Typography variant="body2" fontWeight={600} gutterBottom>
                No Payment Records Found
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ maxWidth: 360, display: 'block', mx: 'auto' }}>
                You are currently on the free trial. When you upgrade to Label Cropper Pro, your official GST receipts and invoices will be listed here.
              </Typography>
            </Box>
          ) : (
            <TableContainer
              component={Paper}
              sx={{
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'transparent',
                backgroundImage: 'none',
                boxShadow: 'none',
              }}
            >
              <Table size="small">
                <TableHead sx={{ bgcolor: theme === 'dark' ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Invoice #</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Plan</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Amount</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Payment ID</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', textAlign: 'right' }}>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {invoices.map((inv) => {
                    const invDate = new Date(inv.date).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    });

                    const labelPlan = inv.plan === 'cropper_yearly'
                      ? 'Cropper Annual'
                      : inv.plan === 'cropper_monthly'
                      ? 'Cropper Monthly'
                      : inv.plan === 'starter'
                      ? 'GST Starter'
                      : inv.plan === 'pro'
                      ? 'GST Pro'
                      : inv.plan;

                    return (
                      <TableRow key={inv.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                        <TableCell sx={{ fontSize: '0.75rem', fontWeight: 600, fontFamily: 'monospace' }}>
                          {inv.invoiceNumber}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                          {invDate}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.75rem', fontWeight: 600 }}>
                          {labelPlan}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.75rem', fontWeight: 700, color: 'text.primary' }}>
                          ₹{inv.amount}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.72rem', color: 'text.secondary', fontFamily: 'monospace' }}>
                          {inv.paymentId || '—'}
                        </TableCell>
                        <TableCell sx={{ textAlign: 'right' }}>
                          <Chip
                            label="Paid"
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              bgcolor: 'rgba(0, 214, 143, 0.15)',
                              color: '#00d68f',
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2, px: 3, borderTop: '1px solid', borderColor: 'divider' }}>
        <Button onClick={onClose} sx={{ color: 'text.secondary', textTransform: 'none', fontWeight: 600 }}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
