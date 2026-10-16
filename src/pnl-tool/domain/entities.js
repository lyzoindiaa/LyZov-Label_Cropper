/**
 * Canonical Domain Entities & Validators
 * Defines the canonical shapes for Channel, ImportBatch, RawRow, OrderLine, Product, Template, FeeRuleSet, ProfitLine
 */

import { Money } from './money.js';

export function createChannel({
  id = `ch_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
  name,
  type = 'marketplace', // 'marketplace' | 'store' | 'other'
  country = 'IN',
  defaultCurrency = 'INR',
}) {
  if (!name) throw new Error('Channel name is required');
  return {
    id,
    name,
    type,
    country,
    defaultCurrency,
    createdAt: Date.now(),
  };
}

export function createImportBatch({
  id = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
  channelId,
  templateId,
  fileName,
  fileHash,
  rowCountRaw = 0,
  rowCountAccepted = 0,
  rowCountRejected = 0,
  periodStart = null,
  periodEnd = null,
}) {
  return {
    id,
    channelId,
    templateId,
    fileName,
    fileHash,
    importedAt: Date.now(),
    rowCountRaw,
    rowCountAccepted,
    rowCountRejected,
    periodStart,
    periodEnd,
  };
}

export function createRawRow({
  batchId,
  rowIndex,
  rawValues,
}) {
  return {
    id: `raw_${batchId}_${rowIndex}`,
    batchId,
    rowIndex,
    rawValues, // original untouched values
  };
}

export function createOrderLine({
  id = `line_${Date.now()}_${Math.random().toString(36).substr(2, 7)}`,
  batchId,
  sourceRowIndex,
  channelId,
  orderId,
  orderLineId = '',
  orderDate,
  settlementDate = null,
  sku,
  productTitle = '',
  quantity = 1,
  status = 'delivered', // 'delivered' | 'shipped' | 'returned' | 'cancelled' | 'rto' | 'unknown'
  currency = 'INR',
  grossSales = 0,
  discounts = 0,
  shippingCharged = 0,
  taxCollected = 0,
  fees = {},
  feeStatus = 'reported', // 'reported' | 'computed' | 'missing'
  refundAmount = 0,
  returnQuantity = 0,
  returnQuantityRestocked = 0,
  returnReason = '',
  cogsUnit = null,
  cogsSource = 'missing', // 'product_master' | 'override' | 'missing'
  flags = [],
}) {
  return {
    id,
    batchId,
    sourceRowIndex,
    channelId,
    orderId,
    orderLineId,
    orderDate,
    settlementDate,
    sku: (sku || '').trim().toUpperCase(),
    productTitle,
    quantity: Number(quantity) || 1,
    status,
    currency,
    grossSales: typeof grossSales === 'number' ? grossSales : (grossSales?.amount || 0),
    discounts: typeof discounts === 'number' ? discounts : (discounts?.amount || 0),
    shippingCharged: typeof shippingCharged === 'number' ? shippingCharged : (shippingCharged?.amount || 0),
    taxCollected: typeof taxCollected === 'number' ? taxCollected : (taxCollected?.amount || 0),
    fees,
    feeStatus,
    refundAmount: typeof refundAmount === 'number' ? refundAmount : (refundAmount?.amount || 0),
    returnQuantity: Number(returnQuantity) || 0,
    returnQuantityRestocked: Number(returnQuantityRestocked) || 0,
    returnReason,
    cogsUnit,
    cogsSource,
    flags,
  };
}

export function createProduct({
  sku,
  title = '',
  cogsUnitPaise = 0,
  currency = 'INR',
  packagingCostPaise = 0,
  otherUnitCostPaise = 0,
  aliases = [],
  effectiveFrom = null,
  effectiveTo = null,
}) {
  if (!sku) throw new Error('Product SKU is required');
  return {
    sku: sku.trim().toUpperCase(),
    title: title || sku,
    cogsUnitPaise: Math.round(Number(cogsUnitPaise) || 0),
    currency: (currency || 'INR').toUpperCase(),
    packagingCostPaise: Math.round(Number(packagingCostPaise) || 0),
    otherUnitCostPaise: Math.round(Number(otherUnitCostPaise) || 0),
    aliases: aliases.map(a => a.trim().toUpperCase()),
    effectiveFrom,
    effectiveTo,
    updatedAt: Date.now(),
  };
}
