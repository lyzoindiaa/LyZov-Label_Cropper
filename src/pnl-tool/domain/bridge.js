/**
 * Profit-Change Waterfall Bridge & Decision Simulators
 * Mathematically decomposes profit movement between two periods and simulates price/return changes.
 */

import { Money } from './money.js';

export function computeWaterfallBridge(periodA, periodB) {
  // Period A (baseline), Period B (comparison)
  const revA = periodA.netRevenue || 0;
  const revB = periodB.netRevenue || 0;
  const feesA = periodA.totalFees || 0;
  const feesB = periodB.totalFees || 0;
  const cogsA = periodA.cogsTotal || 0;
  const cogsB = periodB.cogsTotal || 0;
  const profitA = periodA.contribution || (revA - feesA - cogsA);
  const profitB = periodB.contribution || (revB - feesB - cogsB);

  const totalDelta = profitB - profitA;

  const unitsA = Math.max(1, periodA.units || 1);
  const unitsB = Math.max(1, periodB.units || 1);
  const unitContribA = profitA / unitsA;

  // 1. Volume driver
  const volumeDelta = Math.round((unitsB - unitsA) * unitContribA);

  // 2. Revenue / Price driver (excluding volume)
  const grossDelta = (periodB.grossSales || revB) - (periodA.grossSales || revA);
  const priceDelta = Math.round(grossDelta - ((unitsB - unitsA) * ((periodA.grossSales || revA) / unitsA)));

  // 3. Discount driver
  const discountDelta = -Math.round((periodB.discounts || 0) - (periodA.discounts || 0));

  // 4. Fee driver (cost increase reduces profit)
  const feeDelta = -(feesB - feesA);

  // 5. COGS driver (cost increase reduces profit)
  const cogsDelta = -(cogsB - cogsA);

  // 6. Return impact
  const returnDelta = -Math.round((periodB.refundAmount || 0) - (periodA.refundAmount || 0));

  // 7. Residual ensures mathematical exactness: totalDelta === sum(drivers)
  const sumKnown = volumeDelta + priceDelta + discountDelta + feeDelta + cogsDelta + returnDelta;
  const residual = totalDelta - sumKnown;

  return {
    profitA,
    profitB,
    totalDelta,
    drivers: [
      { name: 'Volume Change', impact: volumeDelta, positive: volumeDelta >= 0 },
      { name: 'Selling Price / ASP', impact: priceDelta, positive: priceDelta >= 0 },
      { name: 'Discounts Impact', impact: discountDelta, positive: discountDelta >= 0 },
      { name: 'Marketplace Fees', impact: feeDelta, positive: feeDelta >= 0 },
      { name: 'Product Costs (COGS)', impact: cogsDelta, positive: cogsDelta >= 0 },
      { name: 'Returns & Refunds', impact: returnDelta, positive: returnDelta >= 0 },
      { name: 'Residual / Mix', impact: residual, positive: residual >= 0 },
    ],
  };
}

export function simulatePriceChange({
  currentPricePaise,
  newPricePaise,
  cogsPaise,
  feePercent = 15, // standard marketplace commission %
  fixedFeePaise = 2000, // ₹20 fixed fee
  returnRatePct = 10, // 10% returns
}) {
  const currentPrice = currentPricePaise / 100;
  const newPrice = newPricePaise / 100;
  const cogs = cogsPaise / 100;
  const fixedFee = fixedFeePaise / 100;

  // At new price:
  const newCommission = (newPrice * feePercent) / 100;
  const newTotalFees = newCommission + fixedFee;
  const effectiveRevenue = newPrice * (1 - returnRatePct / 100);
  const newContribution = effectiveRevenue - newTotalFees - cogs;
  const newMarginPct = effectiveRevenue > 0 ? (newContribution / effectiveRevenue) * 100 : 0;

  // Break-even price where contribution = 0:
  // Price * (1 - returnRate) - Price * feePercent - fixedFee - cogs = 0
  const breakEvenPrice = (fixedFee + cogs) / (1 - (returnRatePct / 100) - (feePercent / 100));

  return {
    newPrice,
    newContribution: Math.round(newContribution * 100) / 100,
    newMarginPct: Math.round(newMarginPct * 10) / 10,
    breakEvenPrice: Math.round(breakEvenPrice * 100) / 100,
    isProfitable: newContribution > 0,
  };
}

export function simulateReturnRateChange({
  totalOrders,
  avgOrderValuePaise,
  currentReturnRatePct,
  deltaRatePct, // e.g. +3% or -2%
  avgReverseLogisticsPaise = 6000, // ₹60 reverse shipping
}) {
  const newReturnRate = Math.max(0, currentReturnRatePct + deltaRatePct);
  const additionalReturns = Math.round((totalOrders * deltaRatePct) / 100);
  const revenueLossPaise = additionalReturns * avgOrderValuePaise;
  const reverseShippingCostPaise = additionalReturns * avgReverseLogisticsPaise;
  const totalProfitImpactPaise = -(revenueLossPaise + reverseShippingCostPaise);

  return {
    currentReturnRatePct,
    newReturnRate,
    additionalReturns,
    profitImpactINR: Math.round(totalProfitImpactPaise / 100),
  };
}
