import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Grid,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TextField,
  Chip,
  Dialog,
  DialogContent,
  IconButton,
  Alert,
} from '@mui/material';
import { Package, Plus, Edit2, Tag, AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { Money } from '../domain/money.js';
import { getLocalProducts, saveLocalProduct } from '../db/index.js';
import { pnlApi } from '../api/client.js';

export default function ProductsView({ missingSkus = [] }) {
  const [products, setProducts] = useState([]);
  const [openModal, setOpenModal] = useState(false);
  const [sku, setSku] = useState('');
  const [title, setTitle] = useState('');
  const [cogsINR, setCogsINR] = useState('');
  const [packagingINR, setPackagingINR] = useState('');
  const [aliases, setAliases] = useState('');
  const [error, setError] = useState('');

  const loadProducts = async () => {
    try {
      // 1. Try from MongoDB
      const res = await pnlApi.getProducts();
      if (res.products && res.products.length) {
        setProducts(res.products);
        return;
      }
    } catch {}

    // 2. Fallback from local IndexedDB
    const local = await getLocalProducts();
    setProducts(local);
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!sku) {
      setError('SKU is required');
      return;
    }

    const cogsUnitPaise = Math.round(parseFloat(cogsINR || '0') * 100);
    const packagingCostPaise = Math.round(parseFloat(packagingINR || '0') * 100);
    const aliasList = aliases.split(',').map(a => a.trim()).filter(Boolean);

    const productObj = {
      sku: sku.trim().toUpperCase(),
      title: title || sku,
      cogsUnitPaise,
      packagingCostPaise,
      aliases: aliasList,
      updatedAt: Date.now(),
    };

    try {
      await saveLocalProduct(productObj);
      await pnlApi.saveProduct(productObj).catch(() => {});
      setOpenModal(false);
      setSku('');
      setTitle('');
      setCogsINR('');
      setPackagingINR('');
      setAliases('');
      loadProducts();
    } catch (err) {
      setError(err.message || 'Failed to save product');
    }
  };

  const handleEdit = (prod) => {
    setSku(prod.sku);
    setTitle(prod.title || '');
    setCogsINR(String((prod.cogsUnitPaise || 0) / 100));
    setPackagingINR(String((prod.packagingCostPaise || 0) / 100));
    setAliases((prod.aliases || []).join(', '));
    setOpenModal(true);
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#f8fafc', mb: 0.5 }}>
            Product Master & COGS Management
          </Typography>
          <Typography variant="body2" sx={{ color: '#94a3b8' }}>
            Maintain product costs, packaging fees, and cross-channel SKU aliases.
          </Typography>
        </Box>
        <Button
          variant="contained"
          onClick={() => { setSku(''); setTitle(''); setCogsINR(''); setPackagingINR(''); setAliases(''); setOpenModal(true); }}
          startIcon={<Plus size={16} />}
          sx={{ background: 'linear-gradient(135deg, #00c9ff 0%, #0088ff 100%)', textTransform: 'none', fontWeight: 700, borderRadius: '8px' }}
        >
          Add Product Cost
        </Button>
      </Box>

      {/* Missing COGS Worklist Banner if any */}
      {missingSkus.length > 0 && (
        <Box className="pnl-card" sx={{ mb: 4, border: '1px solid #ffb703', bgcolor: 'rgba(255, 183, 3, 0.05)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
            <AlertTriangle size={20} color="#ffb703" />
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#ffb703' }}>
              Action Required: Missing COGS Worklist ({missingSkus.length} SKUs)
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ color: '#cbd5e1', mb: 2 }}>
            These SKUs have sales in your imported files but no product cost recorded. Margins cannot be calculated until cost is provided.
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {missingSkus.map((s, i) => (
              <Chip
                key={i}
                label={`+ Add ${s}`}
                clickable
                onClick={() => { setSku(s); setOpenModal(true); }}
                sx={{ bgcolor: 'rgba(255, 183, 3, 0.2)', color: '#ffb703', fontWeight: 600, fontSize: '0.8rem' }}
              />
            ))}
          </Box>
        </Box>
      )}

      {/* Products Table */}
      <Box className="pnl-card">
        {products.length === 0 ? (
          <Box sx={{ p: 5, textAlign: 'center' }}>
            <Package size={36} color="#64748b" style={{ margin: '0 auto 12px' }} />
            <Typography variant="body1" sx={{ color: '#cbd5e1', fontWeight: 600 }}>
              No Product Costs Recorded
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b', mb: 2 }}>
              Add unit costs and packaging expenses to calculate exact net contributions.
            </Typography>
          </Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ color: '#64748b' }}>SKU</TableCell>
                <TableCell sx={{ color: '#64748b' }}>Title</TableCell>
                <TableCell sx={{ color: '#64748b' }}>Unit Cost (COGS)</TableCell>
                <TableCell sx={{ color: '#64748b' }}>Packaging Cost</TableCell>
                <TableCell sx={{ color: '#64748b' }}>Channel Aliases</TableCell>
                <TableCell sx={{ color: '#64748b' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {products.map((p) => (
                <TableRow key={p.sku}>
                  <TableCell sx={{ fontWeight: 700, color: '#f8fafc' }}>{p.sku}</TableCell>
                  <TableCell sx={{ color: '#cbd5e1' }}>{p.title || '-'}</TableCell>
                  <TableCell sx={{ color: '#00c9ff', fontWeight: 600 }}>
                    {Money.fromMinor(p.cogsUnitPaise || 0, 'INR').toFormatted()}
                  </TableCell>
                  <TableCell sx={{ color: '#94a3b8' }}>
                    {Money.fromMinor(p.packagingCostPaise || 0, 'INR').toFormatted()}
                  </TableCell>
                  <TableCell>
                    {p.aliases && p.aliases.length > 0 ? (
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {p.aliases.map((a, ai) => (
                          <Chip key={ai} label={a} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.05)', color: '#94a3b8', fontSize: '0.75rem' }} />
                        ))}
                      </Box>
                    ) : (
                      <Typography variant="caption" sx={{ color: '#64748b' }}>None</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <IconButton size="small" onClick={() => handleEdit(p)} sx={{ color: '#00c9ff' }}>
                      <Edit2 size={15} />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Box>

      {/* Add / Edit Dialog */}
      <Dialog
        open={openModal}
        onClose={() => setOpenModal(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { background: '#0f172a', color: '#f8fafc', borderRadius: '16px' } }}
      >
        <DialogContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#00c9ff' }}>
              Product Cost Details
            </Typography>
            <IconButton onClick={() => setOpenModal(false)} size="small" sx={{ color: '#94a3b8' }}>
              <X size={18} />
            </IconButton>
          </Box>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Box component="form" onSubmit={handleSave} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Product SKU *"
              value={sku}
              onChange={(e) => setSku(e.target.value.toUpperCase())}
              required
              size="small"
              fullWidth
              slotProps={{ input: { sx: { color: '#f8fafc', bgcolor: 'rgba(255,255,255,0.03)' } } }}
            />
            <TextField
              label="Product Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              size="small"
              fullWidth
              slotProps={{ input: { sx: { color: '#f8fafc', bgcolor: 'rgba(255,255,255,0.03)' } } }}
            />
            <TextField
              label="Unit Cost (₹) *"
              type="number"
              step="0.01"
              value={cogsINR}
              onChange={(e) => setCogsINR(e.target.value)}
              required
              size="small"
              fullWidth
              slotProps={{ input: { sx: { color: '#f8fafc', bgcolor: 'rgba(255,255,255,0.03)' } } }}
            />
            <TextField
              label="Packaging Cost (₹)"
              type="number"
              step="0.01"
              value={packagingINR}
              onChange={(e) => setPackagingINR(e.target.value)}
              size="small"
              fullWidth
              slotProps={{ input: { sx: { color: '#f8fafc', bgcolor: 'rgba(255,255,255,0.03)' } } }}
            />
            <TextField
              label="Channel SKU Aliases (Comma-separated)"
              value={aliases}
              onChange={(e) => setAliases(e.target.value)}
              placeholder="e.g. AMZ-SKU-1, FLIP-SKU-1"
              size="small"
              fullWidth
              slotProps={{ input: { sx: { color: '#f8fafc', bgcolor: 'rgba(255,255,255,0.03)' } } }}
            />

            <Button
              type="submit"
              variant="contained"
              sx={{ mt: 1, py: 1.2, background: 'linear-gradient(135deg, #00c9ff 0%, #0088ff 100%)', fontWeight: 700, borderRadius: '8px' }}
            >
              Save Product Cost
            </Button>
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
