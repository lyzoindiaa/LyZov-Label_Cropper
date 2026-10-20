import mongoose from 'mongoose';

const productCacheSchema = new mongoose.Schema({
  urlHash: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  platform: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    default: 'E-Commerce Product',
  },
  dimensions: {
    type: String,
    default: 'Original Resolution',
  },
  imageUrl: {
    type: String,
    required: true,
  },
  images: {
    type: [String],
    default: [],
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
  quality: {
    type: Number,
    default: 90,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    // TTL index: automatically deletes document 24 hours after creation
    expires: 86400,
  },
});

export const ProductCache = mongoose.model('ProductCache', productCacheSchema);
