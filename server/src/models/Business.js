import mongoose from 'mongoose';
import { GST_STATE_CODES } from '../config/constants.js';

const businessSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  legalName: {
    type: String,
    required: [true, 'Legal business name is required'],
    trim: true,
  },
  tradeName: {
    type: String,
    trim: true,
    default: '',
  },
  gstin: {
    type: String,
    required: [true, 'GSTIN is required'],
    trim: true,
    uppercase: true,
    match: [/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GSTIN format'],
  },
  stateCode: {
    type: String,
    required: true,
    validate: {
      validator: (v) => !!GST_STATE_CODES[v],
      message: (props) => `${props.value} is not a valid GST state code`,
    },
  },
  stateName: {
    type: String,
    default: function () {
      return GST_STATE_CODES[this.stateCode] || '';
    },
  },
  filingFrequency: {
    type: String,
    enum: ['monthly', 'quarterly'],
    default: 'monthly',
  },
  isDefault: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Compound unique index: A user cannot add the same GSTIN twice
businessSchema.index({ userId: 1, gstin: 1 }, { unique: true });

export const Business = mongoose.model('Business', businessSchema);
