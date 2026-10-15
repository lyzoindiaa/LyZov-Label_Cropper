import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  IconButton,
  Chip,
  Collapse,
} from '@mui/material';
import { X, ChevronDown, ChevronRight, FileSearch, Hash } from 'lucide-react';
import { Money } from '../domain/money.js';

export default function DrilldownModal({ open, onClose, title = 'Audit Drill-Down', lines = [] }) {
  const [expandedRow, setExpandedRow] = useState(null);

  const toggleRow = (id) => {
    setExpandedRow(prev => prev === id ? null : id);
  };

  const totalRevenue = lines.reduce((acc, l) => acc + (l.netRevenue?.amount || l.grossSales || 0), 0);
  const totalContribution = lines.reduce((acc, l) => acc + (l.contribution?.amount || 0), 0);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          background: '#090d16',
          color: '#f8fafc',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.12)',
        },
      }}
    >
      <DialogContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <FileSearch size={22} color="#00c9ff" />
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#f8fafc' }}>
              {title}
            </Typography>
            <Chip
              label={`${lines.length} contributing order lines`}
              size="small"
              sx={{ bgcolor: 'rgba(0, 201, 255, 0.1)', color: '#00c9ff', fontWeight: 600 }}
            />
          </Box>
          <IconButton onClick={onClose} size="small" sx={{ color: '#94a3b8' }}>
            <X size={18} />
          </IconButton>
        </Box>

        <Box sx={{ display: 'flex', gap: 3, mb: 3, p: 2, bgcolor: 'rgba(255,255,255,0.02)', borderRadius: '10px' }}>
          <Box>
            <Typography variant="caption" sx={{ color: '#94a3b8' }}>Aggregate Revenue</Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#00c9ff' }}>
              {Money.fromMinor(totalRevenue, 'INR').toFormatted()}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" sx={{ color: '#94a3b8' }}>Aggregate Profit</Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: totalContribution >= 0 ? '#00d68f' : '#ff4d6d' }}>
              {Money.fromMinor(totalContribution, 'INR').toFormatted()}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ maxHeight: '60vh', overflowY: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ '& th': { color: '#64748b', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.08)' } }}>
                <TableCell width={40}></TableCell>
                <TableCell>Order ID</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>SKU</TableCell>
                <TableCell>Qty</TableCell>
                <TableCell>Net Revenue</TableCell>
                <TableCell>Fees</TableCell>
                <TableCell>COGS</TableCell>
                <TableCell>Profit</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {lines.map((line) => {
                const isExpanded = expandedRow === line.id;
                const netRev = line.netRevenue instanceof Money ? line.netRevenue : Money.fromMinor(line.grossSales || 0, line.currency);
                const fees = line.totalFees instanceof Money ? line.totalFees : Money.fromMinor(line.feesTotal || 0, line.currency);
                const cogs = line.cogsTotal instanceof Money ? line.cogsTotal : Money.fromMinor(line.cogsUnitPaise || 0, line.currency);
                const contrib = line.contribution instanceof Money ? line.contribution : netRev.subtract(fees).subtract(cogs);

                return (
                  <React.Fragment key={line.id}>
                    <TableRow
                      hover
                      onClick={() => toggleRow(line.id)}
                      sx={{
                        cursor: 'pointer',
                        '& td': { color: '#cbd5e1', borderBottom: '1px solid rgba(255,255,255,0.04)' },
                      }}
                    >
                      <TableCell>
                        {isExpanded ? <ChevronDown size={14} color="#00c9ff" /> : <ChevronRight size={14} color="#64748b" />}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#f8fafc !important' }}>{line.orderId}</TableCell>
                      <TableCell>{line.orderDate}</TableCell>
                      <TableCell><Chip label={line.sku} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.05)', color: '#f8fafc', fontSize: '0.75rem' }} /></TableCell>
                      <TableCell>{line.quantity || 1}</TableCell>
                      <TableCell>{netRev.toFormatted()}</TableCell>
                      <TableCell>{fees.toFormatted()}</TableCell>
                      <TableCell>{cogs.toFormatted()}</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: contrib.isPositive() ? '#00d68f !important' : '#ff4d6d !important' }}>
                        {contrib.toFormatted()}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={line.status || 'delivered'}
                          size="small"
                          sx={{
                            fontSize: '0.7rem',
                            bgcolor: line.status === 'returned' ? 'rgba(255,77,109,0.15)' : 'rgba(0,214,143,0.15)',
                            color: line.status === 'returned' ? '#ff4d6d' : '#00d68f',
                          }}
                        />
                      </TableCell>
                    </TableRow>

                    {/* Expandable Source Row Trace Inspector */}
                    <TableRow>
                      <TableCell colSpan={10} sx={{ p: 0, borderBottom: isExpanded ? '1px solid rgba(255,255,255,0.08)' : 'none' }}>
                        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                          <Box sx={{ p: 2.5, bgcolor: '#060911', borderLeft: '3px solid #00c9ff', m: 1, borderRadius: '6px' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                              <Hash size={14} color="#00c9ff" />
                              <Typography variant="caption" sx={{ fontWeight: 700, color: '#00c9ff', textTransform: 'uppercase' }}>
                                Raw Source Row #{line.sourceRowIndex || line.traceRefs?.sourceRowIndex || 'N/A'} (Batch: {line.batchId || 'N/A'})
                              </Typography>
                            </Box>
                            <Typography variant="body2" sx={{ color: '#94a3b8', fontSize: '0.8rem', mb: 1 }}>
                              <strong>Product Title:</strong> {line.productTitle || 'N/A'}
                            </Typography>
                            {line.flags && line.flags.length > 0 && (
                              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                                {line.flags.map((f, fi) => (
                                  <Chip key={fi} label={`${f.code}: ${f.message}`} size="small" sx={{ bgcolor: 'rgba(255,183,3,0.15)', color: '#ffb703', fontSize: '0.75rem' }} />
                                ))}
                              </Box>
                            )}
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
