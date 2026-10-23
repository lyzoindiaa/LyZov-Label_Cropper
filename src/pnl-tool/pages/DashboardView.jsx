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
  IconButton,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Percent,
  RefreshCw,
  AlertTriangle,
  FileSpreadsheet,
  Layers,
  ArrowUpRight,
  Calendar,
  Save,
  CheckCircle2,
} from 'lucide-react';
import { Money } from '../domain/money.js';
import DrilldownModal from '../components/DrilldownModal.jsx';
import { saveLocalMonthlyExpense } from '../db/index.js';

export default function DashboardView({
  orders = [],
  selectedPeriod = 'all',
  onPeriodChange,
  availablePeriods = [],
  monthlyExpenses = [],
  onExpensesUpdated,
  onNavigateTab,
  sellerId = 'default_seller',
}) {
  const [drilldownState, setDrilldownState] = useState({ open: false, title: '', lines: [] });
  const [selectedChannel, setSelectedChannel] = useState('all');

  // Ad spend and overheads form state
  const currentAdSpendObj = monthlyExpenses.find((e) => e.type === 'ad_spend');
  const currentOverheadObj = monthlyExpenses.find((e) => e.type === 'overhead');

  const [adSpendInput, setAdSpendInput] = useState(
    currentAdSpendObj ? String(currentAdSpendObj.amountPaise / 100) : ''
  );
  const [overheadInput, setOverheadInput] = useState(
    currentOverheadObj ? String(currentOverheadObj.amountPaise / 100) : ''
  );
  const [expenseSavedNotice, setExpenseSavedNotice] = useState(false);

  const filteredOrders = selectedChannel === 'all'
    ? orders
    : orders.filter((o) => (o.channelId || '').toLowerCase() === selectedChannel.toLowerCase());

  // Segregate earlier-month returns vs current-month sales
  const earlierMonthReturns = filteredOrders.filter(
    (o) => o.isUnmatchedReturn || (o.originalSalePeriod && selectedPeriod !== 'all' && o.originalSalePeriod !== selectedPeriod)
  );
  const earlierMonthReturnAmount = earlierMonthReturns.reduce((acc, o) => acc + (o.refundAmount || 0), 0);

  // Calculate aggregates from filtered orders
  const totalGross = filteredOrders.reduce((acc, o) => acc + (o.grossSales || 0), 0);
  const totalDiscounts = filteredOrders.reduce((acc, o) => acc + (o.discounts || 0), 0);
  const totalShippingCharged = filteredOrders.reduce((acc, o) => acc + (o.shippingCharged || 0), 0);
  const totalRefunds = filteredOrders.reduce((acc, o) => acc + (o.refundAmount || 0), 0);

  // Default fee-card rates per channel
  const FEE_CARD = {
    flipkart: { pct: 12, flatPaise: 0 },
    amazon: { pct: 15, flatPaise: 2500 },
    meesho: { pct: 0, flatPaise: 0 },
  };
  const lineFee = (o) => {
    if (o.feesTotal) return o.feesTotal;
    if (!(o.grossSales > 0)) return 0;
    const card = FEE_CARD[(o.channelId || '').toLowerCase()] || { pct: 12, flatPaise: 0 };
    return Math.round(((o.grossSales - (o.discounts || 0)) * card.pct) / 100) + card.flatPaise;
  };

  const lineCogs = (o) =>
    o.status === 'returned' || !o.cogsUnitPaise ? 0 : o.cogsUnitPaise * (o.quantity || 1);
  const lineNetRevenue = (o) =>
    (o.grossSales || 0) - (o.discounts || 0) + (o.shippingCharged || 0) - (o.refundAmount || 0);

  const netRevenuePaise = totalGross - totalDiscounts + totalShippingCharged - totalRefunds;
  const totalFeesPaise = filteredOrders.reduce((acc, o) => acc + lineFee(o), 0);
  const totalCogsPaise = filteredOrders.reduce((acc, o) => acc + lineCogs(o), 0);

  const missingCogsSkus = Array.from(
    new Set(filteredOrders.filter((o) => o.status !== 'returned' && !o.cogsUnitPaise).map((o) => o.sku))
  );

  const netContributionPaise = netRevenuePaise - totalFeesPaise - totalCogsPaise;

  // Monthly operating expenses (Ad spend, overheads)
  const adSpendPaise = currentAdSpendObj ? currentAdSpendObj.amountPaise : Math.round(parseFloat(adSpendInput || '0') * 100);
  const overheadPaise = currentOverheadObj ? currentOverheadObj.amountPaise : Math.round(parseFloat(overheadInput || '0') * 100);
  const netProfitAfterExpensesPaise = netContributionPaise - adSpendPaise - overheadPaise;

  const marginPct = netRevenuePaise > 0 ? ((netProfitAfterExpensesPaise / netRevenuePaise) * 100).toFixed(1) : 0;

  const totalUnits = filteredOrders
    .filter((o) => o.status !== 'returned' && o.status !== 'rto')
    .reduce((acc, o) => acc + (o.quantity || 1), 0);
  const returnUnits = filteredOrders
    .filter((o) => o.status === 'returned' || o.status === 'rto')
    .reduce((acc, o) => acc + (o.quantity || 1), 0);
  const returnRatePct = totalUnits > 0 ? ((returnUnits / totalUnits) * 100).toFixed(1) : 0;

  // Group by channel
  const channelMap = {};
  orders.forEach((o) => {
    const ch = o.channelId || 'unknown';
    if (!channelMap[ch]) {
      channelMap[ch] = { channelId: ch, count: 0, revenue: 0, profit: 0, lines: [] };
    }
    const rev = lineNetRevenue(o);
    const profit = rev - lineFee(o) - lineCogs(o);
    if (o.status !== 'returned') channelMap[ch].count += 1;
    channelMap[ch].revenue += rev;
    channelMap[ch].profit += profit;
    channelMap[ch].lines.push(o);
  });
  const channelBreakdown = Object.values(channelMap);

  // Group by SKU
  const skuMap = {};
  filteredOrders.forEach((o) => {
    const s = o.sku || 'UNKNOWN';
    if (!skuMap[s]) {
      skuMap[s] = { sku: s, title: o.productTitle || s, units: 0, revenue: 0, profit: 0, hasCogs: false, lines: [] };
    }
    const rev = lineNetRevenue(o);
    if (o.cogsUnitPaise) skuMap[s].hasCogs = true;

    if (o.status !== 'returned') skuMap[s].units += o.quantity || 1;
    skuMap[s].revenue += rev;
    skuMap[s].profit += rev - lineFee(o) - lineCogs(o);
    skuMap[s].lines.push(o);
  });
  const skuList = Object.values(skuMap);
  const lossMakers = skuList.filter((s) => s.profit < 0);

  const openDrill = (title, lines) => {
    setDrilldownState({ open: true, title, lines });
  };

  const handleSaveExpenses = async () => {
    const periodToSave = selectedPeriod && selectedPeriod !== 'all' ? selectedPeriod : availablePeriods[0] || '2026-10';
    const adPaise = Math.round(parseFloat(adSpendInput || '0') * 100);
    const ovPaise = Math.round(parseFloat(overheadInput || '0') * 100);

    await saveLocalMonthlyExpense({
      sellerId,
      period: periodToSave,
      type: 'ad_spend',
      amountPaise: adPaise,
    });

    await saveLocalMonthlyExpense({
      sellerId,
      period: periodToSave,
      type: 'overhead',
      amountPaise: ovPaise,
    });

    setExpenseSavedNotice(true);
    setTimeout(() => setExpenseSavedNotice(false), 3000);

    if (onExpensesUpdated) {
      onExpensesUpdated();
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      {/* Top Header with Month / Period Selector */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#f8fafc', mb: 0.5 }}>
            Monthly Profit &amp; Loss Dashboard
          </Typography>
          <Typography variant="body2" sx={{ color: '#94a3b8' }}>
            Data is strictly partitioned by month. Totals are computed on-demand with zero data leakage.
          </Typography>
        </Box>

        {/* Period Dropdown */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>
            Period:
          </Typography>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <Select
              value={selectedPeriod}
              onChange={(e) => onPeriodChange?.(e.target.value)}
              sx={{
                bgcolor: 'rgba(0, 201, 255, 0.08)',
                color: '#00c9ff',
                fontWeight: 700,
                border: '1px solid rgba(0, 201, 255, 0.3)',
                borderRadius: '8px',
              }}
            >
              <MenuItem value="all">All Months</MenuItem>
              {availablePeriods.map((p) => (
                <MenuItem key={p} value={p}>
                  📅 {p}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Box>

      {/* Data Health Alert: Missing Costs Warning */}
      {missingCogsSkus.length > 0 && (
        <Alert
          severity="warning"
          sx={{ mb: 3, borderRadius: '10px' }}
          action={
            <Button color="inherit" size="small" onClick={() => onNavigateTab?.('products')} sx={{ fontWeight: 700 }}>
              Fix Costs
            </Button>
          }
        >
          <strong>{missingCogsSkus.length} SKUs</strong> in this period have no product cost entered.
          They are not counted at zero; profit calculations will be incomplete until costs are saved.
        </Alert>
      )}

      {/* Earlier Month Returns Callout */}
      {earlierMonthReturns.length > 0 && (
        <Alert severity="info" sx={{ mb: 3, borderRadius: '10px' }}>
          <strong>{earlierMonthReturns.length} return rows</strong> (-₹{(earlierMonthReturnAmount / 100).toLocaleString()})
          belong to orders from earlier months. They are separated below to avoid distorting this month's sales margins.
        </Alert>
      )}

      {/* Channel Quick Filter Bar */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3.5, flexWrap: 'wrap' }}>
        <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, textTransform: 'uppercase', mr: 1 }}>
          Filter Channel:
        </Typography>
        {['all', 'flipkart', 'amazon', 'meesho', 'shopify'].map((ch) => {
          const isSelected = selectedChannel === ch;
          const count = ch === 'all' ? orders.length : orders.filter((o) => (o.channelId || '').toLowerCase() === ch).length;
          return (
            <Chip
              key={ch}
              label={`${ch === 'all' ? 'All Channels' : ch.toUpperCase()} (${count})`}
              clickable
              onClick={() => setSelectedChannel(ch)}
              size="small"
              sx={{
                bgcolor: isSelected ? 'rgba(0, 201, 255, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                color: isSelected ? '#00c9ff' : '#94a3b8',
                border: isSelected ? '1px solid #00c9ff' : '1px solid rgba(255, 255, 255, 0.08)',
                fontWeight: isSelected ? 800 : 500,
                fontSize: '0.78rem',
              }}
            />
          );
        })}
      </Box>

      {/* KPI Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Box className="pnl-card" onClick={() => openDrill('Net Revenue Orders', filteredOrders)} sx={{ cursor: 'pointer' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600 }}>
                NET REVENUE
              </Typography>
              <DollarSign size={18} color="#00c9ff" />
            </Box>
            <Typography variant="h4" className="pnl-kpi-value">
              {Money.fromMinor(netRevenuePaise, 'INR').format()}
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748b' }}>
              Gross ₹{(totalGross / 100).toLocaleString()} - Refunds ₹{(totalRefunds / 100).toLocaleString()}
            </Typography>
          </Box>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Box className="pnl-card">
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600 }}>
                PRODUCT COGS &amp; FEES
              </Typography>
              <TrendingDown size={18} color="#ef4444" />
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#f8fafc' }}>
              {Money.fromMinor(totalFeesPaise + totalCogsPaise, 'INR').format()}
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748b' }}>
              COGS ₹{(totalCogsPaise / 100).toLocaleString()} + Fees ₹{(totalFeesPaise / 100).toLocaleString()}
            </Typography>
          </Box>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Box className="pnl-card">
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600 }}>
                NET PROFIT (AFTER EXPENSES)
              </Typography>
              <TrendingUp size={18} color={netProfitAfterExpensesPaise >= 0 ? '#10b981' : '#ef4444'} />
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 800, color: netProfitAfterExpensesPaise >= 0 ? '#10b981' : '#ef4444' }}>
              {Money.fromMinor(netProfitAfterExpensesPaise, 'INR').format()}
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748b' }}>
              Margin: {marginPct}% (Ad Spend: ₹{(adSpendPaise / 100).toLocaleString()})
            </Typography>
          </Box>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Box className="pnl-card">
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600 }}>
                RETURN RATE
              </Typography>
              <Percent size={18} color="#f59e0b" />
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#f59e0b' }}>
              {returnRatePct}%
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748b' }}>
              {returnUnits} returns out of {totalUnits} delivered units
            </Typography>
          </Box>
        </Grid>
      </Grid>

      {/* Monthly Expenses (Ad Spend & Overheads) Widget */}
      <Box className="pnl-card" sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#00c9ff' }}>
              Monthly Ad Spend &amp; Operating Expenses ({selectedPeriod})
            </Typography>
            <Typography variant="caption" sx={{ color: '#94a3b8' }}>
              Type your ad spend and miscellaneous costs once per month. They are deducted from your gross margin.
            </Typography>
          </Box>
          <Button
            variant="contained"
            size="small"
            onClick={handleSaveExpenses}
            startIcon={<Save size={14} />}
            sx={{ background: 'linear-gradient(135deg, #00c9ff 0%, #0088ff 100%)', textTransform: 'none', fontWeight: 700 }}
          >
            Save Month Expenses
          </Button>
        </Box>

        {expenseSavedNotice && (
          <Alert severity="success" sx={{ mb: 2, py: 0.5, borderRadius: '8px' }}>
            Expenses saved for {selectedPeriod}!
          </Alert>
        )}

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              size="small"
              label="Marketplace Ad Spend (₹)"
              placeholder="e.g. 5000"
              type="number"
              value={adSpendInput}
              onChange={(e) => setAdSpendInput(e.target.value)}
              sx={{ '& .MuiInputBase-input': { color: '#00c9ff', fontWeight: 700 }, '& .MuiInputLabel-root': { color: '#94a3b8' } }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              size="small"
              label="Other Overhead / Misc Expenses (₹)"
              placeholder="e.g. 2000"
              type="number"
              value={overheadInput}
              onChange={(e) => setOverheadInput(e.target.value)}
              sx={{ '& .MuiInputBase-input': { color: '#f8fafc' }, '& .MuiInputLabel-root': { color: '#94a3b8' } }}
            />
          </Grid>
        </Grid>
      </Box>

      {/* Loss-Making SKUs Table */}
      <Box className="pnl-card" sx={{ mb: 4, p: 0, overflow: 'hidden' }}>
        <Box sx={{ p: 2.5, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#f8fafc' }}>
            Loss-Making Products ({lossMakers.length})
          </Typography>
          <Typography variant="caption" sx={{ color: '#94a3b8' }}>
            Only SKUs with a known product cost can be judged. These products had negative contribution after fees and COGS.
          </Typography>
        </Box>
        <Table>
          <TableHead sx={{ bgcolor: 'rgba(255,255,255,0.02)' }}>
            <TableRow>
              <TableCell sx={{ color: '#94a3b8' }}>SKU</TableCell>
              <TableCell sx={{ color: '#94a3b8' }}>Units Sold</TableCell>
              <TableCell sx={{ color: '#94a3b8' }}>Net Revenue</TableCell>
              <TableCell sx={{ color: '#94a3b8' }}>Net Loss</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {lossMakers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} sx={{ textAlign: 'center', py: 4, color: '#10b981' }}>
                  🎉 No loss-making products detected for this period!
                </TableCell>
              </TableRow>
            ) : (
              lossMakers.slice(0, 10).map((s) => (
                <TableRow key={s.sku}>
                  <TableCell sx={{ color: '#f8fafc', fontWeight: 700 }}>{s.sku}</TableCell>
                  <TableCell sx={{ color: '#cbd5e1' }}>{s.units}</TableCell>
                  <TableCell sx={{ color: '#00c9ff' }}>{Money.fromMinor(s.revenue, 'INR').format()}</TableCell>
                  <TableCell sx={{ color: '#ef4444', fontWeight: 700 }}>{Money.fromMinor(s.profit, 'INR').format()}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Box>

      {/* Drilldown Modal */}
      <DrilldownModal
        open={drilldownState.open}
        onClose={() => setDrilldownState({ open: false, title: '', lines: [] })}
        title={drilldownState.title}
        lines={drilldownState.lines}
      />
    </Box>
  );
}
