import mongoose from 'mongoose';

const conversionLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  ip: {
    type: String,
    default: '',
  },
  platform: {
    type: String,
    required: true,
  },
  sourceUrl: {
    type: String,
    required: true,
  },
  format: {
    type: String,
    enum: ['png', 'jpeg'],
    default: 'png',
  },
  status: {
    type: String,
    enum: ['SUCCESS', 'INVALID_URL', 'UNSUPPORTED_PLATFORM', 'NOT_FOUND', 'BLOCKED', 'TIMEOUT', 'FAILED'],
    required: true,
  },
  latencyMs: {
    type: Number,
    default: 0,
  },
  cached: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

conversionLogSchema.index({ userId: 1, createdAt: -1 });
conversionLogSchema.index({ platform: 1, createdAt: -1 });

export const ConversionLog = mongoose.model('ConversionLog', conversionLogSchema);
