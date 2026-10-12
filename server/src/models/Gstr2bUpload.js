import mongoose from 'mongoose';

const gstr2bUploadSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  businessId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business',
    required: true,
    index: true,
  },
  period: {
    type: String, // MMYYYY
    required: true,
    index: true,
  },
  fileName: {
    type: String,
    required: true,
  },
  fileHash: {
    type: String,
    required: true,
  },
  fileSize: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ['PARSED', 'PROCESSED', 'FAILED'],
    default: 'PARSED',
  },
  supplierCount: {
    type: Number,
    default: 0,
  },
  invoiceCount: {
    type: Number,
    default: 0,
  },
  totalItcPaise: {
    igstPaise: { type: Number, default: 0 },
    cgstPaise: { type: Number, default: 0 },
    sgstPaise: { type: Number, default: 0 },
    cessPaise: { type: Number, default: 0 },
  },
  marketplaceFeeItcPaise: {
    igstPaise: { type: Number, default: 0 },
    cgstPaise: { type: Number, default: 0 },
    sgstPaise: { type: Number, default: 0 },
    cessPaise: { type: Number, default: 0 },
  },
  invoices: [{
    supplierGstin: { type: String, required: true, uppercase: true, trim: true },
    supplierName: { type: String, default: '' },
    invoiceNumber: { type: String, required: true },
    invoiceType: { type: String, default: 'R' }, // Regular, Deemed, etc.
    invoiceDate: { type: Date },
    invoiceValuePaise: { type: Number, default: 0 },
    pos: { type: String, default: '' },
    reverseCharge: { type: Boolean, default: false },
    taxableValuePaise: { type: Number, default: 0 },
    rate: { type: Number, default: 0 },
    igstPaise: { type: Number, default: 0 },
    cgstPaise: { type: Number, default: 0 },
    sgstPaise: { type: Number, default: 0 },
    cessPaise: { type: Number, default: 0 },
    isMarketplaceFee: { type: Boolean, default: false },
    marketplace: { type: String, enum: ['amazon', 'flipkart', 'meesho', 'other'], default: 'other' },
    eligibility: {
      type: String,
      enum: ['ELIGIBLE', 'INELIGIBLE', 'REVERSED'],
      default: 'ELIGIBLE',
    },
    ineligibilityReason: { type: String, default: '' },
  }],
  uploadedAt: {
    type: Date,
    default: Date.now,
  },
});

gstr2bUploadSchema.index({ businessId: 1, period: 1 });

export const Gstr2bUpload = mongoose.model('Gstr2bUpload', gstr2bUploadSchema);
