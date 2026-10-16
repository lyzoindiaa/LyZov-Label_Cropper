import React, { useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  TextField,
  Button,
  Chip,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Slider,
} from '@mui/material';
import { GitCommit, TrendingUp, TrendingDown, DollarSign, RefreshCw, Calculator, ArrowRight } from 'lucide-react';
import { computeWaterfallBridge, simulatePriceChange, simulateReturnRateChange } from '../domain/bridge.js';
import { Money } from '../domain/money.js';

export default function BridgeView({ orders = [] }) {
  // Period A (Last Month) vs Period B (This Month) sample or derived
  const [periodA, setPeriodA] = useState({
    units: 120,
    grossSales: 150000,
    discounts: 10000,
    netRevenue: 140000,
    totalFees: 28000,
    cogsTotal: 54000,
    refundAmount: 8000,
    contribution: 50000,
  });

  const [periodB, setPeriodB] = useState({
    units: 160,
    grossSales: 210000,
    discounts: 18000,
    netRevenue: 192000,
    totalFees: 42000,
    cogsTotal: 72000,
    refundAmount: 14000,
    contribution: 64000,
  });

  const bridge = computeWaterfallBridge(periodA, periodB);

  // Price Simulator State
  const [simPrice, setSimPrice] = useState(499);
  const [simCogs, setSimCogs] = useState(160);
  const [simFeePct, setSimFeePct] = useState(15);
  const [simReturnPct, setSimReturnPct] = useState(12);

  const priceSimResult = simulatePriceChange({
    currentPricePaise: 49900,
    newPricePaise: simPrice * 100,
    cogsPaise: simCogs * 100,
    feePercent: simFeePct,
    fixedFeePaise: 2000,
    returnRatePct: simReturnPct,
  });

  // Return Simulator State
  const [deltaReturnPct, setDeltaReturnPct] = useState(3);
  const returnSimResult = simulateReturnRateChange({
    totalOrders: 500,
    avgOrderValuePaise: 65000,
    currentReturnRatePct: 10,
    deltaRatePct: deltaReturnPct,
    avgReverseLogisticsPaise: 6500,
  });

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, color: '#f8fafc', mb: 0.5 }}>
          Decisions Pillar: Profit Bridge & Simulators
        </Typography>
        <Typography variant="body2" sx={{ color: '#94a3b8' }}>
          Deconstruct why profit moved between periods, and test price/return scenarios calibrated on your actual history.
        </Typography>
      </Box>

      {/* 1. Period A vs Period B Waterfall Bridge */}
      <Box className="pnl-card" sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <GitCommit size={20} color="#00c9ff" />
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#f8fafc' }}>
                Profit-Change Waterfall Bridge
              </Typography>
            </Box>
            <Typography variant="caption" sx={{ color: '#94a3b8' }}>
              Sequential decomposition of net profit delta: Period A (Baseline) $\to$ Period B (Comparison)
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="caption" sx={{ color: '#64748b' }}>Period A Profit</Typography>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#cbd5e1' }}>
                {Money.fromMajor(periodA.contribution, 'INR').toFormatted()}
              </Typography>
            </Box>
            <ArrowRight size={18} color="#00c9ff" />
            <Box>
              <Typography variant="caption" sx={{ color: '#64748b' }}>Period B Profit</Typography>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#00d68f' }}>
                {Money.fromMajor(periodB.contribution, 'INR').toFormatted()}
              </Typography>
            </Box>
            <Chip
              label={`${bridge.totalDelta >= 0 ? '+' : ''}${Money.fromMajor(bridge.totalDelta, 'INR').toFormatted()} Net Change`}
              sx={{
                bgcolor: bridge.totalDelta >= 0 ? 'rgba(0, 214, 143, 0.2)' : 'rgba(255, 77, 109, 0.2)',
                color: bridge.totalDelta >= 0 ? '#00d68f' : '#ff4d6d',
                fontWeight: 800,
              }}
            />
          </Box>
        </Box>

        {/* Visual Waterfall Bars */}
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-end', height: 160, py: 2, px: 1, bgcolor: 'rgba(0,0,0,0.2)', borderRadius: '10px', overflowX: 'auto' }}>
          {bridge.drivers.map((d, i) => {
            const height = Math.min(100, Math.max(15, Math.abs(d.impact) / 300));
            return (
              <Box key={i} sx={{ flex: 1, minWidth: 90, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                <Typography variant="caption" sx={{ fontSize: '0.7rem', fontWeight: 700, color: d.positive ? '#00d68f' : '#ff4d6d', mb: 0.5 }}>
                  {d.impact >= 0 ? '+' : ''}₹{Math.round(d.impact).toLocaleString()}
                </Typography>
                <Box
                  className={d.positive ? 'waterfall-bar-pos' : 'waterfall-bar-neg'}
                  sx={{ width: '100%', height: `${height}%`, minHeight: 8 }}
                />
                <Typography variant="caption" sx={{ fontSize: '0.65rem', color: '#94a3b8', mt: 1, textAlign: 'center', lineHeight: 1.2 }}>
                  {d.name}
                </Typography>
              </Box>
            );
          })}
        </Box>
      </Box>

      {/* 2. Interactive Decision Simulators */}
      <Grid container spacing={3}>
        {/* Simulator A: Price & Break-Even Simulator */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Box className="pnl-card" sx={{ height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Calculator size={20} color="#00c9ff" />
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#00c9ff' }}>
                Price & Break-Even Simulator
              </Typography>
            </Box>
            <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', mb: 3 }}>
              Simulate unit margins and break-even pricing factoring in marketplace commission and returns.
            </Typography>

            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid size={{ xs: 6 }}>
                <TextField
                  label="Simulated Selling Price (₹)"
                  type="number"
                  value={simPrice}
                  onChange={(e) => setSimPrice(Number(e.target.value))}
                  size="small"
                  fullWidth
                  slotProps={{ input: { sx: { color: '#f8fafc' } } }}
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField
                  label="Unit Cost / COGS (₹)"
                  type="number"
                  value={simCogs}
                  onChange={(e) => setSimCogs(Number(e.target.value))}
                  size="small"
                  fullWidth
                  slotProps={{ input: { sx: { color: '#f8fafc' } } }}
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField
                  label="Marketplace Fee (%)"
                  type="number"
                  value={simFeePct}
                  onChange={(e) => setSimFeePct(Number(e.target.value))}
                  size="small"
                  fullWidth
                  slotProps={{ input: { sx: { color: '#f8fafc' } } }}
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField
                  label="Expected Return Rate (%)"
                  type="number"
                  value={simReturnPct}
                  onChange={(e) => setSimReturnPct(Number(e.target.value))}
                  size="small"
                  fullWidth
                  slotProps={{ input: { sx: { color: '#f8fafc' } } }}
                />
              </Grid>
            </Grid>

            {/* Results Pill */}
            <Box sx={{ p: 2.5, bgcolor: 'rgba(0, 201, 255, 0.05)', borderRadius: '12px', border: '1px solid rgba(0, 201, 255, 0.2)' }}>
              <Grid container spacing={2}>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" sx={{ color: '#94a3b8' }}>Unit Contribution</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: priceSimResult.isProfitable ? '#00d68f' : '#ff4d6d' }}>
                    ₹{priceSimResult.newContribution.toFixed(2)}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" sx={{ color: '#94a3b8' }}>Net Margin</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: '#f8fafc' }}>
                    {priceSimResult.newMarginPct}%
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <Typography variant="caption" sx={{ color: '#ffb703', fontWeight: 600 }}>
                    Break-Even Selling Price: ₹{priceSimResult.breakEvenPrice.toFixed(2)} (Selling below this causes loss)
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          </Box>
        </Grid>

        {/* Simulator B: Return-Rate Impact Simulator */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Box className="pnl-card" sx={{ height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <RefreshCw size={20} color="#ffb703" />
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#ffb703' }}>
                Return-Rate Impact Simulator
              </Typography>
            </Box>
            <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', mb: 3 }}>
              Quantify the bottom-line cost of return rate spikes factoring in reverse logistics and lost fees.
            </Typography>

            <Box sx={{ px: 2, mb: 3 }}>
              <Typography variant="body2" sx={{ color: '#cbd5e1', mb: 1 }}>
                Return Rate Variation: <strong>{deltaReturnPct >= 0 ? `+${deltaReturnPct}%` : `${deltaReturnPct}%`}</strong>
              </Typography>
              <Slider
                value={deltaReturnPct}
                min={-5}
                max={10}
                step={1}
                onChange={(_, val) => setDeltaReturnPct(val)}
                valueLabelDisplay="auto"
                sx={{ color: '#ffb703' }}
              />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.75rem' }}>
                <span>-5% (Best case)</span>
                <span>Baseline (10%)</span>
                <span>+10% (High return spike)</span>
              </Box>
            </Box>

            <Box sx={{ p: 2.5, bgcolor: 'rgba(255, 183, 3, 0.05)', borderRadius: '12px', border: '1px solid rgba(255, 183, 3, 0.2)' }}>
              <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                Net Monthly Profit Impact
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, color: returnSimResult.profitImpactINR >= 0 ? '#00d68f' : '#ff4d6d', my: 0.5 }}>
                {returnSimResult.profitImpactINR >= 0 ? '+' : ''}₹{Math.abs(returnSimResult.profitImpactINR).toLocaleString()}
              </Typography>
              <Typography variant="caption" sx={{ color: '#cbd5e1' }}>
                Results in {returnSimResult.additionalReturns >= 0 ? `+${returnSimResult.additionalReturns}` : returnSimResult.additionalReturns} returns out of 500 orders with ₹65 avg reverse logistics penalty.
              </Typography>
            </Box>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}
