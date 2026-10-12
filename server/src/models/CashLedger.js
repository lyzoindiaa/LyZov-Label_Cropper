import mongoose from 'mongoose';

const cashLedgerSchema = new mongoose.Schema({
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
  // Section 52 TCS credit available from Amazon/Flipkart
  tcsCredits: {
    igstPaise: { type: Number, default: 0 },
    cgstPaise: { type: Number, default: 0 },
    sgstPaise: { type: Number, default: 0 },
  },
  // Electronic Cash Ledger available balance
  cashBalance: {
    igstPaise: { type: Number, default: 0 },
    cgstPaise: { type: Number, default: 0 },
    sgstPaise: { type: Number, default: 0 },
    cessPaise: { type: Number, default: 0 },
  },
  notes: {
    type: String,
    default: '',
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

cashLedgerSchema.index({ businessId: 1, period: 1 }, { unique: true });

export const CashLedger = mongoose.model('CashLedger', cashLedgerSchema);
