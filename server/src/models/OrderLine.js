import mongoose from 'mongoose';

const orderLineSchema = new mongoose.Schema({
  uploadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Upload',
    required: true,
    index: true,
  },
  businessId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business',
    required: true,
    index: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  period: {
    type: String, // MMYYYY
    required: true,
    index: true,
  },
  platform: {
    type: String,
    enum: ['amazon', 'flipkart'],
    required: true,
  },
  orderId: {
    type: String,
    default: '',
  },
  invoiceNumber: {
    type: String,
    required: true,
  },
  invoiceDate: {
    type: Date,
    required: true,
  },
  type: {
    type: String,
    enum: ['sale', 'return', 'cancellation'],
    default: 'sale',
  },
  buyerGstin: {
    type: String,
    default: '',
    uppercase: true,
    trim: true,
  },
  shipFromState: {
    type: String, // 2-digit code
    required: true,
  },
  placeOfSupply: {
    type: String, // 2-digit code
    required: true,
  },
  hsn: {
    type: String,
    default: '',
    trim: true,
  },
  description: {
    type: String,
    default: '',
  },
  quantity: {
    type: Number,
    default: 1,
  },
  uqc: {
    type: String,
    default: 'OTH',
  },
  // Amounts stored in Paise (1 INR = 100 paise) to avoid floating-point inaccuracies
  taxableValuePaise: {
    type: Number,
    required: true,
  },
  gstRate: {
    type: Number, // Percentage, e.g., 18
    required: true,
  },
  igstPaise: {
    type: Number,
    default: 0,
  },
  cgstPaise: {
    type: Number,
    default: 0,
  },
  sgstPaise: {
    type: Number,
    default: 0,
  },
  cessPaise: {
    type: Number,
    default: 0,
  },
  invoiceValuePaise: {
    type: Number,
    required: true,
  },
  platformGstin: {
    type: String, // ETIN for Table 14
    default: '',
  },
  sourceRow: {
    type: Number, // Row index in original upload file for error tracing
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Indexes for fast aggregation
orderLineSchema.index({ businessId: 1, period: 1 });
orderLineSchema.index({ businessId: 1, period: 1, buyerGstin: 1 });
orderLineSchema.index({ businessId: 1, period: 1, placeOfSupply: 1, gstRate: 1 });

export const OrderLine = mongoose.model('OrderLine', orderLineSchema);
