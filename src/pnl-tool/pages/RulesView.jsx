import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Grid,
  Chip,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Dialog,
  DialogContent,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
} from '@mui/material';
import { HelpCircle, Plus, Sparkles, X, ShieldAlert } from 'lucide-react';
import { pnlApi } from '../api/client.js';

export default function RulesView() {
  const [rules, setRules] = useState([
    { id: 'r1', channelId: 'amazon', name: 'Standard Referral Commission', component: 'commission', calc: 'percent', params: { percent: 15 }, priority: 1, isActive: true },
    { id: 'r2', channelId: 'amazon', name: 'Fixed Closing Fee', component: 'fixedFee', calc: 'flat', params: { flatPaise: 2500 }, priority: 2, isActive: true },
    { id: 'r3', channelId: 'flipkart', name: 'Marketplace Commission', component: 'commission', calc: 'percent', params: { percent: 12 }, priority: 1, isActive: true },
    { id: 'r4', channelId: 'meesho', name: 'Zero Commission Policy', component: 'commission', calc: 'percent', params: { percent: 0 }, priority: 1, isActive: true },
  ]);

  const [explainModal, setExplainModal] = useState(null);
  const [openAddModal, setOpenAddModal] = useState(false);
  const [channelId, setChannelId] = useState('amazon');
  const [ruleName, setRuleName] = useState('');
  const [component, setComponent] = useState('commission');
  const [calc, setCalc] = useState('percent');
  const [paramValue, setParamValue] = useState('');

  const loadRules = async () => {
    try {
      const res = await pnlApi.getRules();
      if (res.rules && res.rules.length) setRules(res.rules);
    } catch {}
  };

  useEffect(() => {
    loadRules();
  }, []);

  const handleAddRule = async (e) => {
    e.preventDefault();
    const newRule = {
      channelId,
      name: ruleName,
      component,
      calc,
      params: calc === 'percent' ? { percent: parseFloat(paramValue) } : { flatPaise: Math.round(parseFloat(paramValue) * 100) },
      priority: 5,
      isActive: true,
    };

    setRules(prev => [...prev, { ...newRule, id: `r_${Date.now()}` }]);
    setOpenAddModal(false);
    pnlApi.saveRule(newRule).catch(() => {});
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#f8fafc', mb: 0.5 }}>
            Fee Cards & Rule Engine
          </Typography>
          <Typography variant="body2" sx={{ color: '#94a3b8' }}>
            Data-driven marketplace fee definitions. Explainable arithmetic with zero black boxes.
          </Typography>
        </Box>
        <Button
          variant="contained"
          onClick={() => { setRuleName(''); setParamValue(''); setOpenAddModal(true); }}
          startIcon={<Plus size={16} />}
          sx={{ background: 'linear-gradient(135deg, #00c9ff 0%, #0088ff 100%)', textTransform: 'none', fontWeight: 700, borderRadius: '8px' }}
        >
          Add Channel Rule
        </Button>
      </Box>

      {/* Rules Table */}
      <Box className="pnl-card">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ color: '#64748b' }}>Channel</TableCell>
              <TableCell sx={{ color: '#64748b' }}>Rule Name</TableCell>
              <TableCell sx={{ color: '#64748b' }}>Component</TableCell>
              <TableCell sx={{ color: '#64748b' }}>Calculation Type</TableCell>
              <TableCell sx={{ color: '#64748b' }}>Rate / Amount</TableCell>
              <TableCell sx={{ color: '#64748b' }}>Priority</TableCell>
              <TableCell sx={{ color: '#64748b' }}>Explain</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rules.map((r, i) => (
              <TableRow key={i}>
                <TableCell>
                  <Chip label={r.channelId.toUpperCase()} size="small" sx={{ bgcolor: 'rgba(0, 201, 255, 0.1)', color: '#00c9ff', fontWeight: 700, fontSize: '0.75rem' }} />
                </TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#f8fafc' }}>{r.name}</TableCell>
                <TableCell sx={{ color: '#cbd5e1', textTransform: 'capitalize' }}>{r.component}</TableCell>
                <TableCell sx={{ color: '#94a3b8', textTransform: 'capitalize' }}>{r.calc}</TableCell>
                <TableCell sx={{ color: '#00d68f', fontWeight: 700 }}>
                  {r.calc === 'percent' ? `${r.params?.percent || 0}%` : `₹${((r.params?.flatPaise || 0) / 100).toFixed(2)}`}
                </TableCell>
                <TableCell sx={{ color: '#64748b' }}>#{r.priority || 1}</TableCell>
                <TableCell>
                  <Button
                    size="small"
                    startIcon={<HelpCircle size={14} />}
                    onClick={() => setExplainModal(r)}
                    sx={{ color: '#00c9ff', textTransform: 'none', fontSize: '0.75rem' }}
                  >
                    Explain
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>

      {/* "Explain This Fee" Modal */}
      <Dialog
        open={Boolean(explainModal)}
        onClose={() => setExplainModal(null)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { background: '#090e18', color: '#f8fafc', borderRadius: '16px', border: '1px solid rgba(0, 201, 255, 0.2)' } }}
      >
        <DialogContent sx={{ p: 3 }}>
          {explainModal && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#00c9ff' }}>
                  Rule Arithmetic Breakdown
                </Typography>
                <IconButton onClick={() => setExplainModal(null)} size="small" sx={{ color: '#94a3b8' }}>
                  <X size={18} />
                </IconButton>
              </Box>

              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#f8fafc', mb: 1 }}>
                {explainModal.name}
              </Typography>
              <Typography variant="body2" sx={{ color: '#94a3b8', mb: 3 }}>
                Channel: <strong>{explainModal.channelId.toUpperCase()}</strong> | Component: <strong>{explainModal.component}</strong>
              </Typography>

              <Box sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.03)', borderRadius: '8px', mb: 2 }}>
                <Typography variant="caption" sx={{ color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>
                  Formula Applied
                </Typography>
                <Typography variant="body2" sx={{ color: '#00d68f', fontFamily: 'monospace', mt: 0.5, fontWeight: 600 }}>
                  {explainModal.calc === 'percent'
                    ? `Fee = GrossSales × (${explainModal.params?.percent} ÷ 100)`
                    : `Fee = Flat Rate (₹${(explainModal.params?.flatPaise || 0) / 100})`}
                </Typography>
              </Box>

              <Typography variant="caption" sx={{ color: '#64748b' }}>
                Every fee evaluated through this engine is strictly deterministic and free from hidden charges.
              </Typography>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Rule Dialog */}
      <Dialog
        open={openAddModal}
        onClose={() => setOpenAddModal(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { background: '#0f172a', color: '#f8fafc', borderRadius: '16px' } }}
      >
        <DialogContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#00c9ff' }}>
              Add Channel Fee Rule
            </Typography>
            <IconButton onClick={() => setOpenAddModal(false)} size="small" sx={{ color: '#94a3b8' }}>
              <X size={18} />
            </IconButton>
          </Box>

          <Box component="form" onSubmit={handleAddRule} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl fullWidth size="small">
              <InputLabel sx={{ color: '#94a3b8' }}>Channel</InputLabel>
              <Select value={channelId} label="Channel" onChange={(e) => setChannelId(e.target.value)} sx={{ color: '#fff' }}>
                <MenuItem value="amazon">Amazon</MenuItem>
                <MenuItem value="flipkart">Flipkart</MenuItem>
                <MenuItem value="meesho">Meesho</MenuItem>
                <MenuItem value="shopify">Shopify</MenuItem>
                <MenuItem value="woocommerce">WooCommerce</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Rule Name *"
              value={ruleName}
              onChange={(e) => setRuleName(e.target.value)}
              required
              size="small"
              fullWidth
              slotProps={{ input: { sx: { color: '#f8fafc' } } }}
            />

            <FormControl fullWidth size="small">
              <InputLabel sx={{ color: '#94a3b8' }}>Component</InputLabel>
              <Select value={component} label="Component" onChange={(e) => setComponent(e.target.value)} sx={{ color: '#fff' }}>
                <MenuItem value="commission">Commission</MenuItem>
                <MenuItem value="fixedFee">Fixed Closing Fee</MenuItem>
                <MenuItem value="shippingFee">Shipping / Fulfillment Fee</MenuItem>
                <MenuItem value="collectionFee">Payment Gateway / Collection Fee</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth size="small">
              <InputLabel sx={{ color: '#94a3b8' }}>Calculation Type</InputLabel>
              <Select value={calc} label="Calculation Type" onChange={(e) => setCalc(e.target.value)} sx={{ color: '#fff' }}>
                <MenuItem value="percent">Percentage (%) of Gross Sales</MenuItem>
                <MenuItem value="flat">Flat Amount (₹)</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label={calc === 'percent' ? 'Percentage (%)' : 'Amount in Rupees (₹)'}
              type="number"
              step="0.01"
              value={paramValue}
              onChange={(e) => setParamValue(e.target.value)}
              required
              size="small"
              fullWidth
              slotProps={{ input: { sx: { color: '#f8fafc' } } }}
            />

            <Button
              type="submit"
              variant="contained"
              sx={{ mt: 1, py: 1.2, background: 'linear-gradient(135deg, #00c9ff 0%, #0088ff 100%)', fontWeight: 700, borderRadius: '8px' }}
            >
              Save Rule
            </Button>
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
