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
  IconButton,
} from '@mui/material';
import { X, ShieldCheck, Sparkles, Lock, Mail, User, Building } from 'lucide-react';
import { usePnlAuth } from './AuthContext.jsx';

export default function AuthModal({ open, onClose }) {
  const { login, register, loading } = usePnlAuth();
  const [tab, setTab] = useState(0); // 0: Login, 1: Register
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (tab === 0) {
        await login(email, password);
      } else {
        await register({ email, password, name, businessName });
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Operation failed');
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          background: '#0f172a',
          color: '#f8fafc',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        },
      }}
    >
      <DialogContent sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Sparkles size={22} color="#00c9ff" />
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#00c9ff' }}>
              LyZov P&L Analyzer
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small" sx={{ color: '#94a3b8' }}>
            <X size={18} />
          </IconButton>
        </Box>

        <Typography variant="body2" sx={{ color: '#94a3b8', mb: 3 }}>
          {tab === 0 ? 'Sign in to access your financial records' : 'Start your 30-Day Free Trial (No Card Required)'}
        </Typography>

        <Tabs
          value={tab}
          onChange={(_, val) => { setTab(val); setError(''); }}
          variant="fullWidth"
          sx={{
            mb: 3,
            '& .MuiTab-root': { color: '#94a3b8', textTransform: 'none', fontWeight: 600 },
            '& .Mui-selected': { color: '#00c9ff !important' },
            '& .MuiTabs-indicator': { backgroundColor: '#00c9ff' },
          }}
        >
          <Tab label="Sign In" />
          <Tab label="Create Account (1 Mo Free)" />
        </Tabs>

        {error && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: '8px', fontSize: '0.85rem' }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {tab === 1 && (
            <>
              <TextField
                label="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                size="small"
                fullWidth
                slotProps={{
                  input: {
                    startAdornment: <User size={16} color="#64748b" style={{ marginRight: 8 }} />,
                    sx: { color: '#f8fafc', bgcolor: 'rgba(255,255,255,0.03)' },
                  },
                }}
              />
              <TextField
                label="Business / Store Name"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                size="small"
                fullWidth
                slotProps={{
                  input: {
                    startAdornment: <Building size={16} color="#64748b" style={{ marginRight: 8 }} />,
                    sx: { color: '#f8fafc', bgcolor: 'rgba(255,255,255,0.03)' },
                  },
                }}
              />
            </>
          )}

          <TextField
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            size="small"
            fullWidth
            slotProps={{
              input: {
                startAdornment: <Mail size={16} color="#64748b" style={{ marginRight: 8 }} />,
                sx: { color: '#f8fafc', bgcolor: 'rgba(255,255,255,0.03)' },
              },
            }}
          />

          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            size="small"
            fullWidth
            slotProps={{
              input: {
                startAdornment: <Lock size={16} color="#64748b" style={{ marginRight: 8 }} />,
                sx: { color: '#f8fafc', bgcolor: 'rgba(255,255,255,0.03)' },
              },
            }}
          />

          <Button
            type="submit"
            variant="contained"
            disabled={loading}
            sx={{
              mt: 1,
              py: 1.2,
              background: 'linear-gradient(135deg, #00c9ff 0%, #0284c7 100%)',
              fontWeight: 600,
              textTransform: 'none',
              borderRadius: '8px',
            }}
          >
            {loading ? 'Please wait...' : tab === 0 ? 'Sign In' : 'Activate 30-Day Free Trial'}
          </Button>

          {tab === 0 && (
            <Button
              type="button"
              variant="outlined"
              size="small"
              onClick={() => {
                setEmail('admin@lyzov.com');
                setPassword('admin123');
              }}
              sx={{
                borderColor: 'rgba(255, 183, 3, 0.4)',
                color: '#ffb703',
                fontSize: '0.75rem',
                textTransform: 'none',
                borderRadius: '8px',
                py: 0.6,
                '&:hover': {
                  borderColor: '#ffb703',
                  bgcolor: 'rgba(255, 183, 3, 0.1)',
                },
              }}
            >
              👑 Fill Master Admin Demo (admin@lyzov.com)
            </Button>
          )}

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mt: 1 }}>
            <ShieldCheck size={14} color="#00d68f" />
            <Typography variant="caption" sx={{ color: '#64748b' }}>
              Your financial data stays private on your device.
            </Typography>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
