import React, { useState } from 'react';
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
} from '@mui/material';
import { UploadCloud, FileSpreadsheet, CheckCircle2, ArrowRight, Sparkles, AlertTriangle } from 'lucide-react';
import { parseCsvText, computeFileHash } from '../utils/parser.js';
import { suggestColumnMappings, CANONICAL_FIELDS } from '../utils/mapper.js';
import { normalizeRows } from '../domain/pipeline.js';
import { saveLocalBatch, saveLocalRawRows, saveLocalOrderLines } from '../db/index.js';
import { pnlApi } from '../api/client.js';
import { usePnlAuth } from '../auth/AuthContext.jsx';

export default function IngestView({ onIngestComplete }) {
  const { user, setAuthModalOpen } = usePnlAuth();
  const [channel, setChannel] = useState('amazon');
  const [file, setFile] = useState(null);
  const [parsedData, setParsedData] = useState(null);
  const [mappings, setMappings] = useState({});
  const [fileHash, setFileHash] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState('');

  const handleFileUpload = async (e) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setError('');
    setDuplicateWarning('');
    setLoading(true);

    try {
      setFile(uploadedFile);
      const text = await uploadedFile.text();
      const hash = await computeFileHash(text);
      setFileHash(hash);

      const parsed = parseCsvText(text);
      if (!parsed.headers.length) {
        throw new Error('Unable to extract headers from spreadsheet');
      }

      setParsedData(parsed);
      const suggestions = suggestColumnMappings(parsed.headers);
      setMappings(suggestions);
    } catch (err) {
      setError(err.message || 'File parsing failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadSampleFile = () => {
    const sampleCsv = `Order Id,Order Date,Seller SKU,Title,Quantity,Item Price,Promotion Discount,Shipping Price,Order Status
402-8921102-1928301,2026-10-14,TSHIRT-SLIM-BLK,"Men Slim Fit Cotton T-Shirt (Black)",2,1198.00,100.00,0,Shipped
402-7719201-9812402,2026-10-13,WIRELESS-EARBUDS,"Pro Active Noise-Cancelling Bluetooth Earbuds",1,2499.00,250.00,0,Shipped
402-1102938-4491820,2026-10-10,PHONE-CASE-CLR,"Shockproof Hybrid Armor Phone Case (Clear)",1,199.00,50.00,0,Shipped
402-9918274-1234981,2026-10-07,SMART-WATCH-STRAP,"Silicone Breathable Sport Strap for Smartwatch",1,399.00,40.00,0,Shipped
402-5544332-9988112,2026-10-06,HOODIE-WNT-GRY,"Fleece Winter Pullover Hoodie (Heather Grey)",1,1699.00,0,0,Returned
,2026-10-05,TSHIRT-SLIM-BLK,"Damaged Row Without Order ID",1,499.00,0,0,Shipped
402-8921102-1928301,2026-10-14,TSHIRT-SLIM-BLK,"Duplicate Row of Line 1",2,1198.00,100.00,0,Shipped`;

    setFile({ name: 'Amazon_Sample_MTR_Export.csv' });
    setChannel('amazon');
    setFileHash('hash_sample_amz_export_demo');
    const parsed = parseCsvText(sampleCsv);
    setParsedData(parsed);
    const suggestions = suggestColumnMappings(parsed.headers);
    setMappings(suggestions);
  };

  const handleProcessImport = async () => {
    if (!parsedData || !file) return;

    // Free guest exploration allows sample demo; real files require 1-Month Free Trial login
    if (!user && file.name !== 'Amazon_Sample_MTR_Export.csv') {
      setError('Please sign in or create an account for your 1-Month Free Trial to import and reconcile real store files.');
      setAuthModalOpen(true);
      return;
    }

    // Verify required mappings
    for (const reqField of CANONICAL_FIELDS.filter(f => f.required)) {
      if (!mappings[reqField.key]) {
        setError(`Please map the required field: ${reqField.label}`);
        return;
      }
    }

    setLoading(true);
    setError('');

    try {
      const template = {
        currency: 'INR',
        columnMap: mappings,
      };

      const normResult = normalizeRows({
        rawRows: parsedData.rows,
        channelId: channel,
        template,
        dedupStrategy: 'keep_first',
      });

      const batchObj = {
        id: `batch_${Date.now()}`,
        channelId: channel,
        fileName: file.name,
        fileHash,
        rowCountRaw: parsedData.rows.length,
        rowCountAccepted: normResult.acceptedCount,
        rowCountRejected: normResult.rejectedCount,
        importedAt: Date.now(),
      };

      // 1. Save locally in IndexedDB (Privacy & Speed)
      await saveLocalBatch(batchObj);
      await saveLocalRawRows(parsedData.rows.map((r, i) => ({ id: `raw_${batchObj.id}_${i + 1}`, batchId: batchObj.id, rowIndex: i + 1, rawValues: r })));
      await saveLocalOrderLines(normResult.accepted);

      // 2. Sync to MongoDB if connected
      try {
        await pnlApi.createBatch({
          channelId: channel,
          fileName: file.name,
          fileHash,
          rowCountRaw: parsedData.rows.length,
          rawRows: parsedData.rows.slice(0, 5000), // sync sample to server
        });
        await pnlApi.saveOrders(batchObj.id, normResult.accepted);
      } catch (apiErr) {
        console.warn('MongoDB sync notice (working with local database):', apiErr.message);
      }

      if (onIngestComplete) {
        onIngestComplete(normResult);
      }
    } catch (err) {
      setError(err.message || 'Failed to process import');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, color: '#f8fafc', mb: 0.5 }}>
          Import Sales & Orders Export
        </Typography>
        <Typography variant="body2" sx={{ color: '#94a3b8' }}>
          Drop any raw CSV/XLSX export. Everything is parsed safely on your machine without server leaks.
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3, borderRadius: '10px' }}>{error}</Alert>}
      {duplicateWarning && <Alert severity="warning" sx={{ mb: 3, borderRadius: '10px' }}>{duplicateWarning}</Alert>}

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
                <MenuItem value="amazon">Amazon (MTR / Order Report)</MenuItem>
                <MenuItem value="flipkart">Flipkart (Sales Report)</MenuItem>
                <MenuItem value="meesho">Meesho (Orders Export)</MenuItem>
                <MenuItem value="shopify">Shopify (Orders CSV)</MenuItem>
                <MenuItem value="woocommerce">WooCommerce</MenuItem>
                <MenuItem value="custom">Custom Marketplace / Store</MenuItem>
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
                Supports .CSV, .TSV (Any format, multi-thousand rows)
              </Typography>
            </Box>

            <Button
              variant="outlined"
              size="small"
              onClick={handleLoadSampleFile}
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
              ⚡ Quick Demo: Load Sample Amazon Export
            </Button>

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
                    2. Column Mapping
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                    Auto-suggested matches shown below. Adjust if necessary.
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
                  Analyze & Normalize
                </Button>
              </Box>

              <Grid container spacing={2}>
                {CANONICAL_FIELDS.map((field) => (
                  <Grid size={{ xs: 12, sm: 6 }} key={field.key}>
                    <FormControl fullWidth size="small">
                      <InputLabel sx={{ color: field.required ? '#00c9ff' : '#94a3b8' }}>
                        {field.label} {field.required && '*'}
                      </InputLabel>
                      <Select
                        value={mappings[field.key] || ''}
                        label={`${field.label} ${field.required ? '*' : ''}`}
                        onChange={(e) => setMappings({ ...mappings, [field.key]: e.target.value })}
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
    </Box>
  );
}
