import React, { useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Chip,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Button,
} from '@mui/material';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, Download, ShieldCheck } from 'lucide-react';
import { QualityFlags } from '../domain/flags.js';
import { usePnlAuth } from '../auth/AuthContext.jsx';

export default function QualityView({ auditResult }) {
  const { user, setAuthModalOpen } = usePnlAuth();
  const result = {
    rawCount: auditResult?.rawCount || 0,
    acceptedCount: auditResult?.acceptedCount || 0,
    rejectedCount: auditResult?.rejectedCount || 0,
    isReconciled: auditResult?.isReconciled !== false,
    flagCounts: auditResult?.flagCounts || {},
    rejected: auditResult?.rejected || [],
  };

  const handleDownloadRejected = () => {
    if (!user) {
      setAuthModalOpen(true);
      return;
    }
    if (!result.rejected.length) return;
    const csvContent = 'data:text/csv;charset=utf-8,' +
      ['Row Index,Reason,Raw Data', ...result.rejected.map(r => `${r.rowIndex},"${r.reason}","${JSON.stringify(r.rawValues).replace(/"/g, '""')}"`)].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `rejected_rows_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, color: '#f8fafc', mb: 0.5 }}>
          Data Quality & Audit Reconciliation
        </Typography>
        <Typography variant="body2" sx={{ color: '#94a3b8' }}>
          Strict reconciliation guarantee: Every row is accepted, accepted with warnings, or rejected with a clear explanation.
        </Typography>
      </Box>

      {/* Reconciliation KPI Banner */}
      <Box className="pnl-card" sx={{ mb: 4, bgcolor: 'rgba(15, 23, 42, 0.9)', border: result.isReconciled ? '1px solid rgba(0, 214, 143, 0.3)' : '1px solid #ff4d6d' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <ShieldCheck size={28} color="#00d68f" />
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#f8fafc' }}>
                Reconciliation Balance: {result.isReconciled ? '100% Balanced' : 'Mismatch Detected'}
              </Typography>
              <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                Raw Input Rows ({result.rawCount}) = Accepted ({result.acceptedCount}) + Rejected ({result.rejectedCount})
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Chip label={`Raw: ${result.rawCount}`} sx={{ bgcolor: 'rgba(255,255,255,0.05)', color: '#fff', fontWeight: 600 }} />
            <Chip label={`Accepted: ${result.acceptedCount}`} sx={{ bgcolor: 'rgba(0, 214, 143, 0.15)', color: '#00d68f', fontWeight: 600 }} />
            <Chip label={`Rejected: ${result.rejectedCount}`} sx={{ bgcolor: 'rgba(255, 77, 109, 0.15)', color: '#ff4d6d', fontWeight: 600 }} />
          </Box>
        </Box>
      </Box>

      {/* Flag Catalogue Breakdown */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {Object.values(QualityFlags).map((flag) => {
          const count = result.flagCounts[flag.code] || 0;
          return (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={flag.code}>
              <Box className="pnl-card" sx={{ p: 2.5, height: '100%', opacity: count > 0 ? 1 : 0.6 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {flag.severity === 'ERROR' && <AlertCircle size={18} color="#ff4d6d" />}
                    {flag.severity === 'WARNING' && <AlertTriangle size={18} color="#ffb703" />}
                    {flag.severity === 'INFO' && <Info size={18} color="#00c9ff" />}
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#f8fafc' }}>
                      {flag.code}
                    </Typography>
                  </Box>
                  <Chip
                    label={count}
                    size="small"
                    sx={{
                      fontWeight: 800,
                      bgcolor: count > 0 ? (flag.severity === 'ERROR' ? '#ff4d6d' : '#ffb703') : 'rgba(255,255,255,0.05)',
                      color: count > 0 ? '#080c15' : '#64748b',
                    }}
                  />
                </Box>
                <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', mb: 0.5 }}>
                  {flag.message}
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b', fontStyle: 'italic' }}>
                  Impact: {flag.impact}
                </Typography>
              </Box>
            </Grid>
          );
        })}
      </Grid>

      {/* Rejected Rows Table */}
      <Box className="pnl-card">
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#ff4d6d' }}>
              Rejected Rows Audit ({result.rejected.length})
            </Typography>
            <Typography variant="caption" sx={{ color: '#94a3b8' }}>
              Rows excluded from financial calculations with exact reasons.
            </Typography>
          </Box>
          {result.rejected.length > 0 && (
            <Button
              variant="outlined"
              size="small"
              onClick={handleDownloadRejected}
              startIcon={<Download size={14} />}
              sx={{ borderColor: '#ff4d6d', color: '#ff4d6d', textTransform: 'none', borderRadius: '8px' }}
            >
              Export Rejected Rows (.CSV)
            </Button>
          )}
        </Box>

        {result.rejected.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <CheckCircle2 size={32} color="#00d68f" style={{ margin: '0 auto 8px' }} />
            <Typography variant="body2" sx={{ color: '#cbd5e1' }}>
              No rows rejected. All source data parsed cleanly.
            </Typography>
          </Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ color: '#64748b' }}>Row #</TableCell>
                <TableCell sx={{ color: '#64748b' }}>Rejection Reason</TableCell>
                <TableCell sx={{ color: '#64748b' }}>Raw Snapshot</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {result.rejected.slice(0, 15).map((rej, ri) => (
                <TableRow key={ri}>
                  <TableCell sx={{ color: '#ff4d6d', fontWeight: 700 }}>#{rej.rowIndex}</TableCell>
                  <TableCell sx={{ color: '#cbd5e1' }}>{rej.reason}</TableCell>
                  <TableCell sx={{ color: '#94a3b8', fontSize: '0.75rem', fontFamily: 'monospace' }}>
                    {JSON.stringify(rej.rawValues).slice(0, 80)}...
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Box>
    </Box>
  );
}
