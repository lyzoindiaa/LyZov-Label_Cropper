import mongoose from 'mongoose';

const uploadSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  businessId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business',
    required: true,
    index: true,
  },
  platform: {
    type: String,
    enum: ['amazon', 'flipkart'],
    required: true,
  },
  period: {
    type: String, // MMYYYY e.g., '092026'
    required: true,
    match: [/^(0[1-9]|1[0-2])20[0-9]{2}$/, 'Period must be in MMYYYY format'],
  },
  originalFileName: {
    type: String,
    required: true,
  },
  storedFilePath: {
    type: String,
    required: true,
  },
  fileHash: {
    type: String, // SHA-256 to prevent duplicate upload
    required: true,
    index: true,
  },
  status: {
    type: String,
    enum: ['uploaded', 'processing', 'parsed', 'failed'],
    default: 'uploaded',
  },
  rowCount: {
    type: Number,
    default: 0,
  },
  errorSummary: {
    type: [String],
    default: [],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

uploadSchema.index({ businessId: 1, period: 1, platform: 1 });

export const Upload = mongoose.model('Upload', uploadSchema);
