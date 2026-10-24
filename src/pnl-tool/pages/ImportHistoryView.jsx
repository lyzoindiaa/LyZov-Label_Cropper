import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Button,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
} from '@mui/material';
import { RotateCcw, Trash2, Calendar, FileText, CheckCircle2, ShieldCheck, AlertTriangle } from 'lucide-react';
import { getLocalImports, deleteLocalImport } from '../db/index.js';

export default function ImportHistoryView({ onImportDeleted, sellerId = 'default_seller' }) {
  const [imports, setImports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [notice, setNotice] = useState('');

  const loadImports = async () => {
    setLoading(true);
    try {
      const data = await getLocalImports(sellerId);
      setImports(data);
    } catch (err) {
      console.error('Failed to load imports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadImports();
  }, [sellerId]);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteLocalImport(deleteTarget.id);
      setNotice(`Import "${deleteTarget.fileName}" was removed successfully. Its rows have been undone.`);
      setDeleteTarget(null);
      await loadImports();
      if (onImportDeleted) {
        onImportDeleted(deleteTarget.id);
      }
    } catch (err) {
      console.error('Delete import failed:', err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#f8fafc', mb: 0.5 }}>
            Import History & Audit Trail
          </Typography>
          <Typography variant="body2" sx={{ color: '#94a3b8' }}>
            Every file uploaded is tracked by cryptographic hash and period. You can safely undo or delete any import here.
          </Typography>
        </Box>
        <Button
          variant="outlined"
          size="small"
          onClick={loadImports}
          startIcon={<RotateCcw size={15} />}
          sx={{ borderColor: 'rgba(255,255,255,0.15)', color: '#94a3b8' }}
        >
          Refresh
        </Button>
      </Box>

      {notice && (
        <Alert severity="success" sx={{ mb: 3, borderRadius: '10px' }} onClose={() => setNotice('')}>
          {notice}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress size={32} sx={{ color: '#00c9ff' }} />
        </Box>
      ) : imports.length === 0 ? (
        <Box className="pnl-card" sx={{ textAlign: 'center', py: 8 }}>
          <FileText size={42} color="#64748b" style={{ margin: '0 auto 16px' }} />
          <Typography variant="h6" sx={{ color: '#f8fafc', fontWeight: 700, mb: 1 }}>
            No Imports Found
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748b' }}>
            Upload your first Flipkart or marketplace sales file to see its audit history here.
          </Typography>
        </Box>
      ) : (
        <Box className="pnl-card" sx={{ p: 0, overflow: 'hidden' }}>
          <Table>
            <TableHead sx={{ bgcolor: 'rgba(255,255,255,0.02)' }}>
              <TableRow>
                <TableCell sx={{ color: '#94a3b8', fontWeight: 600 }}>File Name</TableCell>
                <TableCell sx={{ color: '#94a3b8', fontWeight: 600 }}>Period (Month)</TableCell>
                <TableCell sx={{ color: '#94a3b8', fontWeight: 600 }}>Rows Added</TableCell>
                <TableCell sx={{ color: '#94a3b8', fontWeight: 600 }}>Rows Updated</TableCell>
                <TableCell sx={{ color: '#94a3b8', fontWeight: 600 }}>Rows Skipped</TableCell>
                <TableCell sx={{ color: '#94a3b8', fontWeight: 600 }}>Uploaded At</TableCell>
                <TableCell sx={{ color: '#94a3b8', fontWeight: 600 }} align="right">
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {imports.map((imp) => (
                <TableRow key={imp.id} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                  <TableCell sx={{ color: '#f8fafc', fontWeight: 600 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <FileText size={16} color="#00c9ff" />
                      <span>{imp.fileName}</span>
                    </Box>
                    <Typography variant="caption" sx={{ color: '#64748b', fontFamily: 'monospace' }}>
                      Hash: {(imp.fileHash || '').slice(0, 12)}...
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      icon={<Calendar size={13} />}
                      label={imp.period || 'Multi-month'}
                      size="small"
                      sx={{ bgcolor: 'rgba(0, 201, 255, 0.1)', color: '#00c9ff', fontWeight: 700 }}
                    />
                  </TableCell>
                  <TableCell sx={{ color: '#10b981', fontWeight: 700 }}>+{imp.rowsAdded || 0}</TableCell>
                  <TableCell sx={{ color: '#f59e0b', fontWeight: 600 }}>{imp.rowsUpdated || 0}</TableCell>
                  <TableCell sx={{ color: '#64748b' }}>{imp.rowsSkipped || 0}</TableCell>
                  <TableCell sx={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                    {new Date(imp.uploadedAt || Date.now()).toLocaleString()}
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Delete and undo this import">
                      <IconButton
                        size="small"
                        onClick={() => setDeleteTarget(imp)}
                        sx={{ color: '#ef4444', '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.1)' } }}
                      >
                        <Trash2 size={16} />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      )}

      {/* Confirmation Dialog */}
      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => !deleting && setDeleteTarget(null)}
        PaperProps={{ sx: { bgcolor: '#0f172a', color: '#f8fafc', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.1)' } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Confirm Import Rollback</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: '#cbd5e1', mb: 2 }}>
            Are you sure you want to delete and undo import <strong>{deleteTarget?.fileName}</strong>?
          </Typography>
          <Alert severity="warning" sx={{ borderRadius: '8px' }}>
            This will remove all rows introduced by this upload ({deleteTarget?.rowsAdded || 0} rows) and restore any previously updated rows. Other months will remain completely unchanged.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeleteTarget(null)} disabled={deleting} sx={{ color: '#94a3b8' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteConfirm}
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={16} color="inherit" /> : <Trash2 size={16} />}
          >
            {deleting ? 'Undoing...' : 'Delete Import'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
