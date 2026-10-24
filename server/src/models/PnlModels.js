import mongoose from 'mongoose';

// 1. P&L User & Subscription Schema
const pnlUserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  name: { type: String, default: '' },
  businessName: { type: String, default: '' },
  role: { type: String, enum: ['seller', 'admin'], default: 'seller' },
  plan: { type: String, enum: ['trial', 'pro_199', 'enterprise_499'], default: 'trial' },
  trialStartedAt: { type: Date, default: Date.now },
  trialEndsAt: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 Days Free Trial
  },
  subscriptionStatus: { type: String, enum: ['active', 'expired', 'cancelled'], default: 'active' },
  subscriptionExpiresAt: { type: Date, default: null },
  lastLoginAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
});

// 2. Import Batch / Audit Schema
const pnlBatchSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'PnlUser', required: true, index: true },
  channelId: { type: String, required: true, index: true },
  templateId: { type: String, default: '' },
  fileName: { type: String, required: true },
  fileHash: { type: String, required: true, index: true },
  period: { type: String, default: null, index: true },
  rowCountRaw: { type: Number, default: 0 },
  rowCountAccepted: { type: Number, default: 0 },
  rowCountRejected: { type: Number, default: 0 },
  rowsAdded: { type: Number, default: 0 },
  rowsUpdated: { type: Number, default: 0 },
  rowsSkipped: { type: Number, default: 0 },
  periodStart: { type: String, default: null },
  periodEnd: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
});

// 3. Raw Row Schema (Ensures complete auditability back to raw inputs)
const pnlRawRowSchema = new mongoose.Schema({
  batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'PnlBatch', required: true, index: true },
  rowIndex: { type: Number, required: true },
  rawValues: { type: mongoose.Schema.Types.Mixed, required: true },
});

// 4. Canonical Order Line Schema (Partitioned by period with uniqueKey upsert)
const pnlOrderLineSchema = new mongoose.Schema({
  batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'PnlBatch', required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'PnlUser', required: true, index: true },
  uniqueKey: { type: String, required: true, index: true },
  period: { type: String, required: true, index: true },
  sourceRowIndex: { type: Number, required: true },
  channelId: { type: String, required: true, index: true },
  orderId: { type: String, required: true, index: true },
  orderItemId: { type: String, default: '', index: true },
  orderLineId: { type: String, default: '' },
  orderDate: { type: String, required: true, index: true },
  settlementDate: { type: String, default: null },
  sku: { type: String, required: true, uppercase: true, trim: true, index: true },
  skuKey: { type: String, index: true },
  productTitle: { type: String, default: '' },
  quantity: { type: Number, default: 1 },
  status: { type: String, default: 'delivered', index: true },
  eventType: { type: String, default: 'sale' },
  eventSubType: { type: String, default: 'main' },
  currency: { type: String, default: 'INR' },
  grossSalesPaise: { type: Number, default: 0 },
  discountsPaise: { type: Number, default: 0 },
  shippingChargedPaise: { type: Number, default: 0 },
  taxCollectedPaise: { type: Number, default: 0 },
  fees: { type: mongoose.Schema.Types.Mixed, default: {} },
  feeStatus: { type: String, default: 'reported' },
  refundAmountPaise: { type: Number, default: 0 },
  returnQuantity: { type: Number, default: 0 },
  returnQuantityRestocked: { type: Number, default: 0 },
  cogsUnitPaise: { type: Number, default: null },
  cogsSource: { type: String, default: 'missing' },
  isUnmatchedReturn: { type: Boolean, default: false },
  originalSalePeriod: { type: String, default: null },
  flags: { type: Array, default: [] },
  createdAt: { type: Date, default: Date.now },
});
pnlOrderLineSchema.index({ userId: 1, uniqueKey: 1 }, { unique: true });
pnlOrderLineSchema.index({ userId: 1, period: 1 });

// 5. Product Master Schema
const pnlProductSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'PnlUser', required: true, index: true },
  sku: { type: String, required: true, uppercase: true, trim: true },
  skuKey: { type: String, required: true, index: true },
  title: { type: String, default: '' },
  cogsUnitPaise: { type: Number, default: 0 },
  costPaise: { type: Number, default: 0 },
  currency: { type: String, default: 'INR' },
  packagingCostPaise: { type: Number, default: 0 },
  otherUnitCostPaise: { type: Number, default: 0 },
  gstRate: { type: Number, default: 5 },
  aliases: [{ type: String, uppercase: true, trim: true }],
  effectiveFrom: { type: Date, default: null },
  effectiveTo: { type: Date, default: null },
  updatedAt: { type: Date, default: Date.now },
});
pnlProductSchema.index({ userId: 1, skuKey: 1 }, { unique: true });

// 6. Mapping Template Schema
const pnlTemplateSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'PnlUser', default: null, index: true },
  channelId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  version: { type: Number, default: 1 },
  fileType: { type: String, default: 'csv' },
  headerRow: { type: Number, default: 1 },
  columnMap: { type: mongoose.Schema.Types.Mixed, default: {} },
  valueMaps: { type: mongoose.Schema.Types.Mixed, default: {} },
  dateFormats: { type: [String], default: ['YYYY-MM-DD', 'DD/MM/YYYY'] },
  currency: { type: String, default: 'INR' },
  isSystemTemplate: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

// 7. Channel Fee Rule Schema
const pnlFeeRuleSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'PnlUser', default: null, index: true },
  channelId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  component: { type: String, required: true },
  calc: { type: String, enum: ['percent', 'flat', 'tiered'], default: 'percent' },
  params: { type: mongoose.Schema.Types.Mixed, default: {} },
  priority: { type: Number, default: 10 },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

// 8. Razorpay Payment Schema
const pnlPaymentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'PnlUser', required: true, index: true },
  plan: { type: String, required: true },
  amountINR: { type: Number, required: true },
  amountPaise: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  razorpayOrderId: { type: String, required: true },
  razorpayPaymentId: { type: String, required: true },
  razorpaySignature: { type: String, required: true },
  status: { type: String, enum: ['success', 'failed'], default: 'success' },
  createdAt: { type: Date, default: Date.now },
});

// 9. Monthly Expenses Schema (Ad spend, overheads per period)
const pnlExpenseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'PnlUser', required: true, index: true },
  period: { type: String, required: true, index: true },
  type: { type: String, required: true }, // 'ad_spend', 'overhead', 'other'
  amountPaise: { type: Number, default: 0 },
  notes: { type: String, default: '' },
  updatedAt: { type: Date, default: Date.now },
});
pnlExpenseSchema.index({ userId: 1, period: 1, type: 1 }, { unique: true });

// 10. SKU Aliases Schema
const pnlSkuAliasSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'PnlUser', required: true, index: true },
  aliasKey: { type: String, required: true, index: true },
  originalAlias: { type: String, default: '' },
  targetSkuKey: { type: String, required: true, index: true },
  targetSku: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
});
pnlSkuAliasSchema.index({ userId: 1, aliasKey: 1 }, { unique: true });

export const PnlUser = mongoose.model('PnlUser', pnlUserSchema);
export const PnlBatch = mongoose.model('PnlBatch', pnlBatchSchema);
export const PnlRawRow = mongoose.model('PnlRawRow', pnlRawRowSchema);
export const PnlOrderLine = mongoose.model('PnlOrderLine', pnlOrderLineSchema);
export const PnlProduct = mongoose.model('PnlProduct', pnlProductSchema);
export const PnlTemplate = mongoose.model('PnlTemplate', pnlTemplateSchema);
export const PnlFeeRule = mongoose.model('PnlFeeRule', pnlFeeRuleSchema);
export const PnlPayment = mongoose.model('PnlPayment', pnlPaymentSchema);
export const PnlExpense = mongoose.model('PnlExpense', pnlExpenseSchema);
export const PnlSkuAlias = mongoose.model('PnlSkuAlias', pnlSkuAliasSchema);
