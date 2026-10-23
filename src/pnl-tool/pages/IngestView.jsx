import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Alert,
  Chip,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import { UploadCloud, FileSpreadsheet, CheckCircle2, ArrowRight, Sparkles, AlertTriangle, Package, Calendar } from 'lucide-react';
import { parseCsvText, parseXlsxFile, isXlsxFile, computeFileHash } from '../utils/parser.js';
import { suggestColumnMappings, CANONICAL_FIELDS } from '../utils/mapper.js';
import { normalizeRows } from '../domain/pipeline.js';
import {
  openLocalDb,
  saveLocalBatch,
  saveLocalRawRows,
  saveLocalOrderLines,
  upsertOrderItems,
  checkFileHash,
  getLocalProducts,
  saveLocalProduct,
  getLocalSkuAliases,
  getLocalOrderLines,
} from '../db/index.js';
import { pnlApi } from '../api/client.js';
import { usePnlAuth } from '../auth/AuthContext.jsx';
import { normalizeSkuKey } from '../domain/sku.js';

export default function IngestView({ onIngestComplete, sellerId = 'default_seller' }) {
  const { user, setAuthModalOpen } = usePnlAuth();
  const [channel, setChannel] = useState('flipkart');
  const [file, setFile] = useState(null);
  const [parsedData, setParsedData] = useState(null);
  const [mappings, setMappings] = useState({});
  const [fileHash, setFileHash] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState('');
  const [showAllColumns, setShowAllColumns] = useState(false);
  const [detectedPeriod, setDetectedPeriod] = useState('');

  // Quick SKU Cost entry modal
  const [quickCostModalOpen, setQuickCostModalOpen] = useState(false);
  const [missingSkusToFix, setMissingSkusToFix] = useState([]);
  const [enteredCosts, setEnteredCosts] = useState({});
  const [pendingNormResult, setPendingNormResult] = useState(null);

  const missingRequired = parsedData
    ? CANONICAL_FIELDS.filter((f) => f.required && !mappings[f.key])
    : [];
  const visibleFields = showAllColumns ? CANONICAL_FIELDS : missingRequired;

  const handleFileUpload = async (e) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setError('');
    setDuplicateWarning('');
    setLoading(true);

    try {
      setFile(uploadedFile);
      const xlsx = isXlsxFile(uploadedFile);
      const text = xlsx ? null : await uploadedFile.text();
      const hash = await computeFileHash(xlsx ? uploadedFile : text);
      setFileHash(hash);

      // Check if file hash has already been imported
      const existingImport = await checkFileHash(hash, sellerId);
      if (existingImport) {
        setDuplicateWarning(
          `Already imported on ${new Date(existingImport.uploadedAt || Date.now()).toLocaleDateString()} (${existingImport.rowsAdded || existingImport.rowCountAccepted || 0} rows). Re-uploading this identical file will make no changes.`
        );
      }

      const parsed = xlsx ? await parseXlsxFile(uploadedFile) : parseCsvText(text);
      if (!parsed.headers.length) {
        throw new Error('Unable to extract headers from spreadsheet');
      }

      setParsedData(parsed);
      const suggestions = suggestColumnMappings(parsed.headers);
      setMappings(suggestions);

      // Auto-detect channel if headers indicate Flipkart or Amazon
      const headerStr = parsed.headers.join(' ').toLowerCase();
      if (headerStr.includes('fsn') || headerStr.includes('order item id') || headerStr.includes('event type')) {
        setChannel('flipkart');
      } else if (headerStr.includes('amazon') || headerStr.includes('seller sku') || headerStr.includes('asin')) {
        setChannel('amazon');
      } else if (headerStr.includes('sub order no') || headerStr.includes('supplier sku')) {
        setChannel('meesho');
      }
    } catch (err) {
      setError(err.message || 'File parsing failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadSampleAugust = async () => {
    try {
      const res = await fetch('/samples/pnl/Flipkart_Sales_2026_08_August.csv');
      const text = await res.text();
      setFile({ name: 'Flipkart_Sales_2026_08_August.csv' });
      setChannel('flipkart');
      const hash = await computeFileHash(text);
      setFileHash(hash);
      const existing = await checkFileHash(hash, sellerId);
      if (existing) {
        setDuplicateWarning(`Already imported on ${new Date(existing.uploadedAt).toLocaleDateString()} (${existing.rowsAdded || 0} rows).`);
      } else {
        setDuplicateWarning('');
      }
      const parsed = parseCsvText(text);
      setParsedData(parsed);
      const suggestions = suggestColumnMappings(parsed.headers);
      setMappings(suggestions);
    } catch (e) {
      setError('Failed to fetch sample August file');
    }
  };

  const handleLoadSampleSeptember = async () => {
    try {
      const res = await fetch('/samples/pnl/Flipkart_Sales_2026_09_September.csv');
      const text = await res.text();
      setFile({ name: 'Flipkart_Sales_2026_09_September.csv' });
      setChannel('flipkart');
      const hash = await computeFileHash(text);
      setFileHash(hash);
      const existing = await checkFileHash(hash, sellerId);
      if (existing) {
        setDuplicateWarning(`Already imported on ${new Date(existing.uploadedAt).toLocaleDateString()} (${existing.rowsAdded || 0} rows).`);
      } else {
        setDuplicateWarning('');
      }
      const parsed = parseCsvText(text);
      setParsedData(parsed);
      const suggestions = suggestColumnMappings(parsed.headers);
      setMappings(suggestions);
    } catch (e) {
      setError('Failed to fetch sample September file');
    }
  };

  const handleProcessImport = async () => {
    if (!parsedData || !file) return;

    // Verify required mappings
    for (const reqField of CANONICAL_FIELDS.filter((f) => f.required)) {
      if (!mappings[reqField.key]) {
        setError(`Please map the required field: ${reqField.label}`);
        return;
      }
    }

    setLoading(true);
    setError('');

    try {
      // 1. Fetch current product master & aliases
      const localProducts = await getLocalProducts(sellerId);
      const cogsMap = {};
      localProducts.forEach((p) => {
        if (p.skuKey) cogsMap[p.skuKey] = p;
        if (p.sku) cogsMap[p.sku.toUpperCase()] = p;
      });

      const aliasesMap = await getLocalSkuAliases(sellerId);

      // 2. Build existing sales map for cross-month return linking
      const allExisting = await getLocalOrderLines();
      const existingSales = new Map();
      allExisting.forEach((line) => {
        if (line.orderItemId && line.status !== 'returned') {
          existingSales.set(line.orderItemId, line.period || (line.orderDate ? line.orderDate.slice(0, 7) : 'prior'));
        }
      });

      const template = {
        currency: 'INR',
        columnMap: mappings,
      };

      const normResult = normalizeRows({
        rawRows: parsedData.rows,
        channelId: channel,
        sellerId,
        batchId: `batch_${Date.now()}`,
        template,
        cogsMap,
        aliasesMap,
        existingSales,
        dedupStrategy: 'keep_first',
      });

      const detected = normResult.periodsDetected.length > 0 ? normResult.periodsDetected[0] : 'all';
      setDetectedPeriod(detected);

      const batchObj = {
        id: `batch_${Date.now()}`,
        sellerId,
        channelId: channel,
        fileName: file.name,
        fileHash,
        period: normResult.periodsDetected.join(', ') || 'unknown',
        rowCountRaw: parsedData.rows.length,
        rowCountAccepted: normResult.acceptedCount,
        rowCountRejected: normResult.rejectedCount,
        uploadedAt: Date.now(),
      };

      // 3. Upsert order items by deterministic natural key into IndexedDB
      const upsertStats = await upsertOrderItems({
        items: normResult.accepted,
        importRecord: batchObj,
      });

      // Save raw rows for audit drilldown
      await saveLocalBatch(batchObj);
      await saveLocalRawRows(
        parsedData.rows.map((r, i) => ({
          id: `raw_${batchObj.id}_${i + 1}`,
          batchId: batchObj.id,
          rowIndex: i + 1,
          rawValues: r,
        }))
      );

      // Check if any SKUs are missing product costs
      const missing = Array.from(
        new Set(
          normResult.accepted
            .filter((l) => l.cogsSource === 'missing')
            .map((l) => ({ sku: l.sku, skuKey: l.skuKey, title: l.productTitle }))
        )
      );

      if (missing.length > 0) {
        setMissingSkusToFix(missing);
        setPendingNormResult({ ...normResult, upsertStats, batchObj });
        setQuickCostModalOpen(true);
      } else {
        if (onIngestComplete) {
          onIngestComplete({ ...normResult, upsertStats, batchObj });
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to process import');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveQuickCosts = async () => {
    // Save each entered cost
    for (const item of missingSkusToFix) {
      const costStr = enteredCosts[item.skuKey] || enteredCosts[item.sku];
      if (costStr) {
        const costPaise = Math.round(parseFloat(costStr) * 100);
        await saveLocalProduct({
          sellerId,
          sku: item.sku,
          skuKey: item.skuKey,
          title: item.title,
          costPaise,
          cogsUnitPaise: costPaise,
        });
      }
    }

    setQuickCostModalOpen(false);
    if (onIngestComplete && pendingNormResult) {
      onIngestComplete(pendingNormResult);
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, color: '#f8fafc', mb: 0.5 }}>
          Import Sales & Orders Export
        </Typography>
        <Typography variant="body2" sx={{ color: '#94a3b8' }}>
          Drop any raw Flipkart, Amazon, or marketplace export. Files are tagged by period (YYYY-MM) and upserted safely without duplicates.
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3, borderRadius: '10px' }}>{error}</Alert>}
      {duplicateWarning && (
        <Alert severity="warning" sx={{ mb: 3, borderRadius: '10px' }}>
          {duplicateWarning}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Step 1: Channel & File Upload */}
        <Grid size={{ xs: 12, md: parsedData ? 4 : 12 }}>
          <Box className="pnl-card" sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#00c9ff' }}>
              1. Select Channel & File
            </Typography>

            <FormControl fullWidth size="small">
              <InputLabel sx={{ color: '#94a3b8' }}>Sales Channel</InputLabel>
              <Select
                value={channel}
                label="Sales Channel"
                onChange={(e) => setChannel(e.target.value)}
                sx={{ color: '#f8fafc', bgcolor: 'rgba(255,255,255,0.03)' }}
              >
                <MenuItem value="flipkart">Flipkart (Sales / Event Report)</MenuItem>
                <MenuItem value="amazon">Amazon (MTR / Order Report)</MenuItem>
                <MenuItem value="meesho">Meesho (Orders Export)</MenuItem>
                <MenuItem value="shopify">Shopify (Orders CSV)</MenuItem>
                <MenuItem value="woocommerce">WooCommerce</MenuItem>
              </Select>
            </FormControl>

            <Box
              component="label"
              sx={{
                border: '2px dashed rgba(0, 201, 255, 0.35)',
                borderRadius: '12px',
                p: 4,
                textAlign: 'center',
                cursor: 'pointer',
                bgcolor: 'rgba(0, 201, 255, 0.02)',
                transition: 'all 0.2s ease',
                '&:hover': { bgcolor: 'rgba(0, 201, 255, 0.06)', borderColor: '#00c9ff' },
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 1.5,
              }}
            >
              <input type="file" accept=".csv,.tsv,.xlsx" hidden onChange={handleFileUpload} />
              <UploadCloud size={36} color="#00c9ff" />
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#f8fafc' }}>
                {file ? file.name : 'Click or Drag Sales Export Here'}
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b' }}>
                Supports .XLSX, .CSV, .TSV directly from Flipkart or Amazon
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Button
                variant="outlined"
                size="small"
                onClick={handleLoadSampleAugust}
                startIcon={<Sparkles size={14} color="#00c9ff" />}
                sx={{
                  borderColor: 'rgba(0, 201, 255, 0.4)',
                  color: '#00c9ff',
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  borderRadius: '8px',
                  py: 0.8,
                  '&:hover': { bgcolor: 'rgba(0, 201, 255, 0.1)', borderColor: '#00c9ff' },
                }}
              >
                ⚡ Load Sample: August 2026 (6 Orders)
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={handleLoadSampleSeptember}
                startIcon={<Sparkles size={14} color="#ffb703" />}
                sx={{
                  borderColor: 'rgba(255, 183, 3, 0.4)',
                  color: '#ffb703',
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  borderRadius: '8px',
                  py: 0.8,
                  '&:hover': { bgcolor: 'rgba(255, 183, 3, 0.1)', borderColor: '#ffb703' },
                }}
              >
                ⚡ Load Sample: September 2026 (Sales + Prior Month Return)
              </Button>
            </Box>

            {parsedData && (
              <Box sx={{ p: 2, bgcolor: 'rgba(0, 214, 143, 0.08)', borderRadius: '8px', border: '1px solid rgba(0, 214, 143, 0.25)' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <CheckCircle2 size={16} color="#00d68f" />
                  <Typography variant="body2" sx={{ fontWeight: 700, color: '#00d68f' }}>
                    Parsed Successfully
                  </Typography>
                </Box>
                <Typography variant="caption" sx={{ color: '#cbd5e1' }}>
                  {parsedData.rows.length.toLocaleString()} rows detected across {parsedData.headers.length} columns.
                </Typography>
              </Box>
            )}
          </Box>
        </Grid>

        {/* Step 2: Column Mapper */}
        {parsedData && (
          <Grid size={{ xs: 12, md: 8 }}>
            <Box className="pnl-card">
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#00c9ff' }}>
                    2. Check Your Columns
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                    Columns matched automatically. You do not need to rename or touch anything.
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  onClick={handleProcessImport}
                  disabled={loading}
                  endIcon={loading ? <CircularProgress size={16} color="inherit" /> : <ArrowRight size={16} />}
                  sx={{
                    background: 'linear-gradient(135deg, #00c9ff 0%, #0088ff 100%)',
                    textTransform: 'none',
                    fontWeight: 700,
                    borderRadius: '8px',
                    px: 3,
                  }}
                >
                  Analyze & Upsert
                </Button>
              </Box>

              {missingRequired.length === 0 && !showAllColumns && (
                <Alert severity="success" sx={{ borderRadius: '10px' }}>
                  All required columns were matched. Click "Analyze &amp; Upsert" to import safely.
                </Alert>
              )}
              {missingRequired.length > 0 && (
                <Alert severity="warning" sx={{ borderRadius: '10px', mb: 2 }}>
                  We couldn't find {missingRequired.map((f) => f.label).join(', ')} in your file.
                  Please select the corresponding column from your file below.
                </Alert>
              )}

              <Grid container spacing={2} sx={{ mt: missingRequired.length === 0 ? 1.5 : 0 }}>
                {visibleFields.map((field) => (
                  <Grid size={{ xs: 12, sm: 6 }} key={field.key}>
                    <FormControl fullWidth size="small">
                      <InputLabel sx={{ color: field.required ? '#00c9ff' : '#94a3b8' }}>
                        {field.label} {field.required && '*'}
                      </InputLabel>
                      <Select
                        value={mappings[field.key] || ''}
                        label={`${field.label} ${field.required ? '*' : ''}`}
                        onChange={(e) => {
                          setMappings({ ...mappings, [field.key]: e.target.value });
                          setError('');
                        }}
                        sx={{ color: '#f8fafc', bgcolor: 'rgba(255,255,255,0.03)' }}
                      >
                        <MenuItem value="">
                          <em>None / Not in file</em>
                        </MenuItem>
                        {parsedData.headers.map((h, i) => (
                          <MenuItem key={i} value={h}>
                            {h}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                ))}
              </Grid>

              <Button
                size="small"
                onClick={() => setShowAllColumns((v) => !v)}
                sx={{ mt: 2, textTransform: 'none', color: '#94a3b8' }}
              >
                {showAllColumns ? 'Hide column details' : 'Review / change matched columns (optional)'}
              </Button>

              {/* Sample Preview */}
              <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                  Raw File Preview (First 3 Rows)
                </Typography>
                <Box sx={{ overflowX: 'auto', mt: 1 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        {parsedData.headers.slice(0, 6).map((h, i) => (
                          <TableCell key={i} sx={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600 }}>
                            {h}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {parsedData.rows.slice(0, 3).map((row, ri) => (
                        <TableRow key={ri}>
                          {parsedData.headers.slice(0, 6).map((h, ci) => (
                            <TableCell key={ci} sx={{ color: '#cbd5e1', fontSize: '0.8rem' }}>
                              {String(row[h] || '')}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              </Box>
            </Box>
          </Grid>
        )}
      </Grid>

      {/* Quick Cost Setup Modal for Non-Technical Sellers */}
      <Dialog
        open={quickCostModalOpen}
        onClose={() => setQuickCostModalOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { bgcolor: '#0f172a', color: '#f8fafc', borderRadius: '14px', border: '1px solid rgba(0, 201, 255, 0.25)' } }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 1 }}>
          <Package size={20} color="#00c9ff" />
          Type Unit Cost for New SKUs
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: '#94a3b8', mb: 2.5 }}>
            We extracted these new SKUs from your sales file. Simply type your product cost (what you paid per unit) so we can calculate exact profit.
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: '360px', overflowY: 'auto', pr: 1 }}>
            {missingSkusToFix.map((item) => (
              <Box
                key={item.skuKey}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  p: 1.5,
                  bgcolor: 'rgba(255,255,255,0.03)',
                  borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <Box sx={{ maxWidth: '65%' }}>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: '#f8fafc' }}>
                    {item.sku}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#64748b', display: 'block', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {item.title}
                  </Typography>
                </Box>
                <TextField
                  size="small"
                  label="Cost (₹)"
                  placeholder="e.g. 114"
                  type="number"
                  value={enteredCosts[item.skuKey] || ''}
                  onChange={(e) => setEnteredCosts({ ...enteredCosts, [item.skuKey]: e.target.value })}
                  sx={{
                    width: '120px',
                    '& .MuiInputBase-input': { color: '#00c9ff', fontWeight: 700 },
                    '& .MuiInputLabel-root': { color: '#94a3b8' },
                  }}
                />
              </Box>
            ))}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setQuickCostModalOpen(false)} sx={{ color: '#94a3b8' }}>
            Skip for Now
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveQuickCosts}
            sx={{
              background: 'linear-gradient(135deg, #00c9ff 0%, #0088ff 100%)',
              fontWeight: 700,
              textTransform: 'none',
              px: 3,
            }}
          >
            Save Costs &amp; View Dashboard
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
