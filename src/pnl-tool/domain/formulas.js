/**
 * Core P&L Financial Formulas
 * Pure functions matching section 3.3 of Master Build Plan:
 *
 * netRevenue   = grossSales - discounts + shippingCharged - refundAmount
 * totalFees    = sum(feeComponents)
 * cogsTotal    = (cogsUnit + packagingCost + otherUnitCost) * (quantity - returnQuantityRestocked)
 * contribution = netRevenue - totalFees - cogsTotal
 * marginPct    = contribution / netRevenue (undefined if netRevenue <= 0 -> null)
 */

import { Money } from './money.js';

export function calculateNetRevenue({
  grossSales,
  discounts = Money.zero(grossSales.currency),
  shippingCharged = Money.zero(grossSales.currency),
  refundAmount = Money.zero(grossSales.currency),
  taxCollected = Money.zero(grossSales.currency),
  taxTreatment = 'pass_through', // 'pass_through' excludes tax from revenue; 'inclusive' includes
}) {
  let net = grossSales.subtract(discounts).add(shippingCharged).subtract(refundAmount);
  if (taxTreatment === 'inclusive') {
    net = net.add(taxCollected);
  }
  return net;
}

export function calculateTotalFees(feeComponents = {}) {
  let total = null;
  for (const [key, fee] of Object.entries(feeComponents)) {
    if (!fee) continue;
    const feeMoney = fee instanceof Money ? fee : (fee.amount !== undefined ? new Money(fee.amount, fee.currency) : null);
    if (!feeMoney) continue;
    if (!total) {
      total = new Money(feeMoney.amount, feeMoney.currency);
    } else {
      total = total.add(feeMoney);
    }
  }
  return total || Money.zero('INR');
}

export function calculateCogsTotal({
  cogsUnit = Money.zero('INR'),
  packagingCost = Money.zero(cogsUnit.currency),
  otherUnitCost = Money.zero(cogsUnit.currency),
  quantity = 1,
  returnQuantityRestocked = 0,
}) {
  const effectiveQty = Math.max(0, quantity - returnQuantityRestocked);
  const totalUnitCost = cogsUnit.add(packagingCost).add(otherUnitCost);
  return totalUnitCost.multiply(effectiveQty);
}

export function calculateContribution({
  netRevenue,
  totalFees,
  cogsTotal,
}) {
  return netRevenue.subtract(totalFees).subtract(cogsTotal);
}

export function calculateMarginPct(contribution, netRevenue) {
  if (!netRevenue || netRevenue.isZero() || netRevenue.isNegative()) {
    return null; // Undefined / N/A
  }
  // percentage rounded to 2 decimal places e.g. 24.55%
  return Math.round((contribution.amount / netRevenue.amount) * 10000) / 100;
}

/**
 * Derives full ProfitLine from canonical OrderLine and Product costs
 */
export function deriveProfitLine(orderLine, cogsData = null) {
  const currency = orderLine.currency || 'INR';
  const grossSales = orderLine.grossSales instanceof Money ? orderLine.grossSales : Money.fromMinor(orderLine.grossSales || 0, currency);
  const discounts = orderLine.discounts instanceof Money ? orderLine.discounts : Money.fromMinor(orderLine.discounts || 0, currency);
  const shippingCharged = orderLine.shippingCharged instanceof Money ? orderLine.shippingCharged : Money.fromMinor(orderLine.shippingCharged || 0, currency);
  const refundAmount = orderLine.refundAmount instanceof Money ? orderLine.refundAmount : Money.fromMinor(orderLine.refundAmount || 0, currency);

  const netRevenue = calculateNetRevenue({
    grossSales,
    discounts,
    shippingCharged,
    refundAmount,
  });

  const totalFees = calculateTotalFees(orderLine.fees || {});

  let cogsUnit = Money.zero(currency);
  let packagingCost = Money.zero(currency);
  let otherUnitCost = Money.zero(currency);
  let cogsSource = 'missing';

  if (cogsData && cogsData.cogsUnit !== undefined) {
    cogsUnit = cogsData.cogsUnit instanceof Money ? cogsData.cogsUnit : Money.fromMinor(cogsData.cogsUnit, currency);
    packagingCost = cogsData.packagingCost instanceof Money ? cogsData.packagingCost : Money.fromMinor(cogsData.packagingCost || 0, currency);
    otherUnitCost = cogsData.otherUnitCost instanceof Money ? cogsData.otherUnitCost : Money.fromMinor(cogsData.otherUnitCost || 0, currency);
    cogsSource = cogsData.source || 'product_master';
  }

  const quantity = Number(orderLine.quantity) || 1;
  const returnQuantityRestocked = Number(orderLine.returnQuantityRestocked) || 0;

  const cogsTotal = calculateCogsTotal({
    cogsUnit,
    packagingCost,
    otherUnitCost,
    quantity,
    returnQuantityRestocked,
  });

  const contribution = calculateContribution({
    netRevenue,
    totalFees,
    cogsTotal,
  });

  const marginPct = calculateMarginPct(contribution, netRevenue);

  const missingFields = [];
  if (cogsSource === 'missing') missingFields.push('COGS');
  if (orderLine.feeStatus === 'missing') missingFields.push('FEES');

  const completeness = missingFields.length === 0 ? 'complete' : 'partial';

  return {
    id: `profit_${orderLine.id || Math.random().toString(36).substring(2, 9)}`,
    orderLineId: orderLine.id,
    orderId: orderLine.orderId,
    sku: orderLine.sku,
    channelId: orderLine.channelId,
    orderDate: orderLine.orderDate,
    status: orderLine.status,
    currency,
    netRevenue,
    totalFees,
    cogsTotal,
    contribution,
    marginPct,
    completeness,
    missingFields,
    traceRefs: {
      batchId: orderLine.batchId,
      sourceRowIndex: orderLine.sourceRowIndex,
      rawRowId: orderLine.rawRowId,
    },
  };
}
