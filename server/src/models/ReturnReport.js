import mongoose from 'mongoose';

const returnReportSchema = new mongoose.Schema({
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
  },
  version: {
    type: Number,
    default: 1,
  },
  totals: {
    totalInvoices: { type: Number, default: 0 },
    taxableValuePaise: { type: Number, default: 0 },
    igstPaise: { type: Number, default: 0 },
    cgstPaise: { type: Number, default: 0 },
    sgstPaise: { type: Number, default: 0 },
    cessPaise: { type: Number, default: 0 },
    totalTaxPaise: { type: Number, default: 0 },
    totalInvoiceValuePaise: { type: Number, default: 0 },
  },
  sectionCounts: {
    b2bCount: { type: Number, default: 0 },
    b2csCount: { type: Number, default: 0 },
    cdnrCount: { type: Number, default: 0 },
    hsnCount: { type: Number, default: 0 },
    table14Count: { type: Number, default: 0 },
  },
  validationIssues: [{
    type: { type: String }, // 'ERROR' | 'WARNING'
    field: { type: String },
    sourceRow: { type: Number },
    platform: { type: String },
    message: { type: String },
  }],
  jsonFilePath: {
    type: String,
    default: '',
  },
  excelFilePath: {
    type: String,
    default: '',
  },
  generatedAt: {
    type: Date,
    default: Date.now,
  },
});

returnReportSchema.index({ businessId: 1, period: 1 });

export const ReturnReport = mongoose.model('ReturnReport', returnReportSchema);
