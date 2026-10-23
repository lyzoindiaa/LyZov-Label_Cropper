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
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Alert,
  Tooltip,
} from '@mui/material';
import {
  Package,
  Plus,
  Edit2,
  Tag,
  AlertTriangle,
  CheckCircle2,
  X,
  Download,
  UploadCloud,
  Sparkles,
  Link2,
} from 'lucide-react';
import { Money } from '../domain/money.js';
import {
  getLocalProducts,
  saveLocalProduct,
  getLocalOrderLines,
  saveLocalSkuAlias,
  getLocalSkuAliases,
} from '../db/index.js';
import { pnlApi } from '../api/client.js';
import { usePnlAuth } from '../auth/AuthContext.jsx';
import {
  generateProductMasterTemplateCsv,
  parseProductMasterRows,
  normalizeSkuKey,
  formatDisplaySku,
} from '../domain/sku.js';
import { parseCsvText, parseXlsxFile, isXlsxFile } from '../utils/parser.js';

export default function ProductsView({ missingSkus = [], sellerId = 'default_seller' }) {
  const { user, setAuthModalOpen } = usePnlAuth();
  const [products, setProducts] = useState([]);
  const [aliases, setAliases] = useState({});
  const [openModal, setOpenModal] = useState(false);
  const [openAliasModal, setOpenAliasModal] = useState(false);
  const [openExtractModal, setOpenExtractModal] = useState(false);

  // Product edit form
  const [sku, setSku] = useState('');
  const [title, setTitle] = useState('');
  const [cogsINR, setCogsINR] = useState('');
  const [packagingINR, setPackagingINR] = useState('');
  const [gstRate, setGstRate] = useState('5');
  const [productAliases, setProductAliases] = useState('');
  const [error, setError] = useState('');
  const [successNotice, setSuccessNotice] = useState('');

  // Alias form
  const [aliasInput, setAliasInput] = useState('');
  const [targetSkuInput, setTargetSkuInput] = useState('');

  // Extract from sales data
  const [extractedSkus, setExtractedSkus] = useState([]);
  const [extractedCosts, setExtractedCosts] = useState({});

  const loadProductsAndAliases = async () => {
    try {
      const local = await getLocalProducts(sellerId);
      setProducts(local);
      const aliasMap = await getLocalSkuAliases(sellerId);
      setAliases(aliasMap);
    } catch (err) {
      console.warn('Failed to load products/aliases:', err);
    }
  };

  useEffect(() => {
    loadProductsAndAliases();
  }, [sellerId]);

  const handleDownloadTemplate = () => {
    const csvContent = generateProductMasterTemplateCsv();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Product_Master_Template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setSuccessNotice('Downloaded Product_Master_Template.csv with 1 example row.');
  };

  const handleUploadProductMaster = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setSuccessNotice('');

    try {
      const xlsx = isXlsxFile(file);
      const parsed = xlsx ? await parseXlsxFile(file) : parseCsvText(await file.text());
      const normalizedProducts = parseProductMasterRows(parsed.rows);

      if (normalizedProducts.length === 0) {
        throw new Error('No valid product rows found. Please check SKU column.');
      }

      for (const prod of normalizedProducts) {
        await saveLocalProduct({ ...prod, sellerId });
      }

      setSuccessNotice(`Successfully imported ${normalizedProducts.length} products from ${file.name}.`);
      await loadProductsAndAliases();
    } catch (err) {
      setError(err.message || 'Failed to upload product master file.');
    }
  };

  const handleOpenExtract = async () => {
    try {
      const allOrders = await getLocalOrderLines();
      const existingSkuKeys = new Set(products.map((p) => p.skuKey));

      const unconfiguredMap = new Map();
      allOrders.forEach((line) => {
        const key = line.skuKey || normalizeSkuKey(line.sku);
        if (key && !existingSkuKeys.has(key)) {
          if (!unconfiguredMap.has(key)) {
            unconfiguredMap.set(key, {
              sku: line.sku,
              skuKey: key,
              title: line.productTitle || line.sku,
            });
          }
        }
      });

      setExtractedSkus(Array.from(unconfiguredMap.values()));
      setOpenExtractModal(true);
    } catch (err) {
      setError('Failed to extract SKUs from sales data.');
    }
  };

  const handleSaveExtracted = async () => {
    for (const item of extractedSkus) {
      const costVal = extractedCosts[item.skuKey];
      if (costVal) {
        const costPaise = Math.round(parseFloat(costVal) * 100);
        await saveLocalProduct({
          sellerId,
          sku: item.sku,
          skuKey: item.skuKey,
          title: item.title,
          costPaise,
          cogsUnitPaise: costPaise,
          packagingCostPaise: 0,
          gstRate: 5,
        });
      }
    }
    setOpenExtractModal(false);
    setSuccessNotice('Extracted SKUs saved to Product Master.');
    await loadProductsAndAliases();
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!sku) {
      setError('SKU is required');
      return;
    }

    const costPaise = Math.round(parseFloat(cogsINR || '0') * 100);
    const packagingCostPaise = Math.round(parseFloat(packagingINR || '0') * 100);
    const skuKey = normalizeSkuKey(sku);
    const aliasList = productAliases.split(',').map((a) => a.trim()).filter(Boolean);

    const productObj = {
      sellerId,
      sku: formatDisplaySku(sku),
      skuKey,
      title: title || formatDisplaySku(sku),
      cogsUnitPaise: costPaise,
      costPaise,
      packagingCostPaise,
      gstRate: parseFloat(gstRate || '5'),
      aliases: aliasList,
      updatedAt: Date.now(),
    };

    try {
      await saveLocalProduct(productObj);
      // Also register any aliases entered
      for (const a of aliasList) {
        await saveLocalSkuAlias({ alias: a, targetSku: sku, sellerId });
      }

      setOpenModal(false);
      setSku('');
      setTitle('');
      setCogsINR('');
      setPackagingINR('');
      setProductAliases('');
      setSuccessNotice(`Saved product ${productObj.sku}.`);
      await loadProductsAndAliases();
    } catch (err) {
      setError(err.message || 'Failed to save product');
    }
  };

  const handleSaveAlias = async (e) => {
    e.preventDefault();
    if (!aliasInput || !targetSkuInput) {
      setError('Both Alias and Target SKU are required.');
      return;
    }

    try {
      await saveLocalSkuAlias({ alias: aliasInput, targetSku: targetSkuInput, sellerId });
      setAliasInput('');
      setTargetSkuInput('');
      setOpenAliasModal(false);
      setSuccessNotice('SKU alias mapped successfully.');
      await loadProductsAndAliases();
    } catch (err) {
      setError(err.message || 'Failed to save alias.');
    }
  };

  const handleEdit = (prod) => {
    setSku(prod.sku || prod.skuKey);
    setTitle(prod.title || '');
    setCogsINR(String((prod.cogsUnitPaise || prod.costPaise || 0) / 100));
    setPackagingINR(String((prod.packagingCostPaise || 0) / 100));
    setGstRate(String(prod.gstRate || 5));
    setProductAliases((prod.aliases || []).join(', '));
    setOpenModal(true);
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#f8fafc', mb: 0.5 }}>
            Product Master &amp; Cost Catalog
          </Typography>
          <Typography variant="body2" sx={{ color: '#94a3b8' }}>
            The one number only you know: what each unit cost you. Saved once, re-used every month.
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            onClick={handleDownloadTemplate}
            startIcon={<Download size={15} />}
            sx={{ borderColor: 'rgba(255,255,255,0.2)', color: '#cbd5e1', textTransform: 'none' }}
          >
            Download Template
          </Button>

          <Button
            component="label"
            variant="outlined"
            startIcon={<UploadCloud size={15} />}
            sx={{ borderColor: 'rgba(0, 201, 255, 0.4)', color: '#00c9ff', textTransform: 'none' }}
          >
            Upload File
            <input type="file" accept=".csv,.xlsx" hidden onChange={handleUploadProductMaster} />
          </Button>

          <Button
            variant="outlined"
            onClick={handleOpenExtract}
            startIcon={<Sparkles size={15} />}
            sx={{ borderColor: 'rgba(255, 183, 3, 0.4)', color: '#ffb703', textTransform: 'none' }}
          >
            Extract SKUs from Sales
          </Button>

          <Button
            variant="outlined"
            onClick={() => setOpenAliasModal(true)}
            startIcon={<Link2 size={15} />}
            sx={{ borderColor: 'rgba(255,255,255,0.2)', color: '#94a3b8', textTransform: 'none' }}
          >
            SKU Aliases
          </Button>

          <Button
            variant="contained"
            onClick={() => {
              setSku('');
              setTitle('');
              setCogsINR('');
              setPackagingINR('');
              setGstRate('5');
              setProductAliases('');
              setOpenModal(true);
            }}
            startIcon={<Plus size={16} />}
            sx={{ background: 'linear-gradient(135deg, #00c9ff 0%, #0088ff 100%)', textTransform: 'none', fontWeight: 700 }}
          >
            Add Single Product
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: '10px' }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {successNotice && (
        <Alert severity="success" sx={{ mb: 3, borderRadius: '10px' }} onClose={() => setSuccessNotice('')}>
          {successNotice}
        </Alert>
      )}

      {/* Product List Table */}
      <Box className="pnl-card" sx={{ p: 0, overflow: 'hidden' }}>
        <Table>
          <TableHead sx={{ bgcolor: 'rgba(255,255,255,0.02)' }}>
            <TableRow>
              <TableCell sx={{ color: '#94a3b8', fontWeight: 600 }}>SKU / Product</TableCell>
              <TableCell sx={{ color: '#94a3b8', fontWeight: 600 }}>Normalized Key</TableCell>
              <TableCell sx={{ color: '#94a3b8', fontWeight: 600 }}>Product Cost (₹)</TableCell>
              <TableCell sx={{ color: '#94a3b8', fontWeight: 600 }}>Packaging Cost</TableCell>
              <TableCell sx={{ color: '#94a3b8', fontWeight: 600 }}>GST Rate</TableCell>
              <TableCell sx={{ color: '#94a3b8', fontWeight: 600 }} align="right">
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} sx={{ textAlign: 'center', py: 6, color: '#64748b' }}>
                  No products added yet. Download the template or click "Extract SKUs from Sales".
                </TableCell>
              </TableRow>
            ) : (
              products.map((p) => (
                <TableRow key={p.skuKey || p.sku} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                  <TableCell sx={{ color: '#f8fafc', fontWeight: 700 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Package size={16} color="#00c9ff" />
                      <span>{p.sku || p.skuKey}</span>
                    </Box>
                    <Typography variant="caption" sx={{ color: '#64748b' }}>
                      {p.title}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ color: '#94a3b8', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                    {p.skuKey}
                  </TableCell>
                  <TableCell sx={{ color: '#00c9ff', fontWeight: 700 }}>
                    {Money.fromMinor(p.cogsUnitPaise || p.costPaise || 0).format()}
                  </TableCell>
                  <TableCell sx={{ color: '#cbd5e1' }}>
                    {Money.fromMinor(p.packagingCostPaise || 0).format()}
                  </TableCell>
                  <TableCell>
                    <Chip label={`${p.gstRate || 5}%`} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.05)', color: '#cbd5e1' }} />
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Edit Product">
                      <IconButton size="small" onClick={() => handleEdit(p)} sx={{ color: '#94a3b8' }}>
                        <Edit2 size={15} />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Box>

      {/* Add / Edit Product Modal */}
      <Dialog
        open={openModal}
        onClose={() => setOpenModal(false)}
        PaperProps={{ sx: { bgcolor: '#0f172a', color: '#f8fafc', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.1)' } }}
      >
        <form onSubmit={handleSaveProduct}>
          <DialogTitle sx={{ fontWeight: 700 }}>{sku ? 'Edit Product Cost' : 'Add New Product'}</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1, minWidth: '340px' }}>
            <TextField
              size="small"
              label="SKU (e.g. GANESHA_11)"
              required
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              sx={{ '& .MuiInputBase-input': { color: '#f8fafc' }, '& .MuiInputLabel-root': { color: '#94a3b8' } }}
            />
            <TextField
              size="small"
              label="Product Name / Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              sx={{ '& .MuiInputBase-input': { color: '#f8fafc' }, '& .MuiInputLabel-root': { color: '#94a3b8' } }}
            />
            <TextField
              size="small"
              label="Product Cost ₹ (What you paid per unit)"
              type="number"
              required
              value={cogsINR}
              onChange={(e) => setCogsINR(e.target.value)}
              sx={{ '& .MuiInputBase-input': { color: '#00c9ff', fontWeight: 700 }, '& .MuiInputLabel-root': { color: '#94a3b8' } }}
            />
            <TextField
              size="small"
              label="Packaging / Handling per unit ₹ (Default 0)"
              type="number"
              value={packagingINR}
              onChange={(e) => setPackagingINR(e.target.value)}
              sx={{ '& .MuiInputBase-input': { color: '#f8fafc' }, '& .MuiInputLabel-root': { color: '#94a3b8' } }}
            />
            <TextField
              size="small"
              label="GST Rate % (e.g. 5, 12, 18)"
              type="number"
              value={gstRate}
              onChange={(e) => setGstRate(e.target.value)}
              sx={{ '& .MuiInputBase-input': { color: '#f8fafc' }, '& .MuiInputLabel-root': { color: '#94a3b8' } }}
            />
            <TextField
              size="small"
              label="Typo Aliases (comma separated)"
              placeholder="e.g. Ganesah_11, Ganesha-11"
              value={productAliases}
              onChange={(e) => setProductAliases(e.target.value)}
              sx={{ '& .MuiInputBase-input': { color: '#f8fafc' }, '& .MuiInputLabel-root': { color: '#94a3b8' } }}
            />
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setOpenModal(false)} sx={{ color: '#94a3b8' }}>
              Cancel
            </Button>
            <Button variant="contained" type="submit" sx={{ bgcolor: '#00c9ff', color: '#000', fontWeight: 700 }}>
              Save Product
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* SKU Aliases Modal */}
      <Dialog
        open={openAliasModal}
        onClose={() => setOpenAliasModal(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { bgcolor: '#0f172a', color: '#f8fafc', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.1)' } }}
      >
        <form onSubmit={handleSaveAlias}>
          <DialogTitle sx={{ fontWeight: 700 }}>SKU Alias Mappings</DialogTitle>
          <DialogContent>
            <Typography variant="body2" sx={{ color: '#94a3b8', mb: 2 }}>
              Map spelling typos or marketplace variants (e.g. <code>Ganesah_21</code>) to your real SKU (<code>Ganesha_21</code>).
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
              <TextField
                size="small"
                label="Wrong / Variant SKU"
                required
                value={aliasInput}
                onChange={(e) => setAliasInput(e.target.value)}
                sx={{ flex: 1, '& .MuiInputBase-input': { color: '#f8fafc' }, '& .MuiInputLabel-root': { color: '#94a3b8' } }}
              />
              <TextField
                size="small"
                label="Canonical SKU"
                required
                value={targetSkuInput}
                onChange={(e) => setTargetSkuInput(e.target.value)}
                sx={{ flex: 1, '& .MuiInputBase-input': { color: '#00c9ff' }, '& .MuiInputLabel-root': { color: '#94a3b8' } }}
              />
              <Button variant="contained" type="submit" sx={{ bgcolor: '#00c9ff', color: '#000', fontWeight: 700 }}>
                Map
              </Button>
            </Box>

            <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              Active Aliases ({Object.keys(aliases).length})
            </Typography>
            <Box sx={{ mt: 1, maxHeight: '200px', overflowY: 'auto' }}>
              {Object.keys(aliases).length === 0 ? (
                <Typography variant="body2" sx={{ color: '#64748b' }}>No aliases mapped yet.</Typography>
              ) : (
                Object.entries(aliases).map(([aliasKey, targetKey]) => (
                  <Box key={aliasKey} sx={{ display: 'flex', justifyContent: 'space-between', p: 1, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <span style={{ color: '#f8fafc', fontFamily: 'monospace' }}>{aliasKey}</span>
                    <span style={{ color: '#00c9ff', fontFamily: 'monospace' }}>&rarr; {targetKey}</span>
                  </Box>
                ))
              )}
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setOpenAliasModal(false)} sx={{ color: '#94a3b8' }}>
              Close
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Extract SKUs from Sales Modal */}
      <Dialog
        open={openExtractModal}
        onClose={() => setOpenExtractModal(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { bgcolor: '#0f172a', color: '#f8fafc', borderRadius: '14px', border: '1px solid rgba(0, 201, 255, 0.25)' } }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>Extract SKUs from Uploaded Sales</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: '#94a3b8', mb: 2 }}>
            We found {extractedSkus.length} SKUs in your uploaded sales files that are missing from your product catalog. Enter their unit costs below to finish setting them up:
          </Typography>
          {extractedSkus.length === 0 ? (
            <Alert severity="success" sx={{ borderRadius: '8px' }}>
              All SKUs present in your uploaded sales files already have costs configured!
            </Alert>
          ) : (
            <Box sx={{ maxHeight: '360px', overflowY: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ color: '#94a3b8' }}>SKU</TableCell>
                    <TableCell sx={{ color: '#94a3b8' }}>Title</TableCell>
                    <TableCell sx={{ color: '#94a3b8' }} width="140px">
                      Product Cost (₹)
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {extractedSkus.map((item) => (
                    <TableRow key={item.skuKey}>
                      <TableCell sx={{ color: '#f8fafc', fontWeight: 700 }}>{item.sku}</TableCell>
                      <TableCell sx={{ color: '#94a3b8', fontSize: '0.8rem' }}>{item.title}</TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          type="number"
                          placeholder="e.g. 114"
                          value={extractedCosts[item.skuKey] || ''}
                          onChange={(e) => setExtractedCosts({ ...extractedCosts, [item.skuKey]: e.target.value })}
                          sx={{ '& .MuiInputBase-input': { color: '#00c9ff', fontWeight: 700, p: 0.8 } }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenExtractModal(false)} sx={{ color: '#94a3b8' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveExtracted}
            disabled={extractedSkus.length === 0}
            sx={{ background: 'linear-gradient(135deg, #00c9ff 0%, #0088ff 100%)', fontWeight: 700 }}
          >
            Save Costs to Catalog
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
