import mongoose from 'mongoose';

const blogPostSchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    excerpt: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      enum: ['Shipping & Printing', 'E-Commerce', 'GST & Taxes', 'General'],
      default: 'Shipping & Printing',
      index: true,
    },
    readTime: {
      type: String,
      default: '5 min read',
    },
    publishedAt: {
      type: Date,
      default: Date.now,
    },
    author: {
      name: { type: String, default: 'LyZov' },
      role: { type: String, default: 'E-Commerce Logistics Specialist' },
      avatar: { type: String, default: '📦' },
    },
    tags: [{ type: String, trim: true }],
    featured: {
      type: Boolean,
      default: false,
    },
    isPublished: {
      type: Boolean,
      default: true,
      index: true,
    },
    views: {
      type: Number,
      default: 0,
    },
    // Flexible block structure allowing headings, paragraphs, callouts, steps, tables
    content: [
      {
        type: {
          type: String,
          enum: ['intro', 'heading', 'paragraph', 'callout', 'steps', 'table', 'code'],
          required: true,
        },
        text: String,
        variant: String, // e.g. 'tip', 'warning', 'info'
        title: String,
        headers: [String],
        rows: [[String]],
        items: [
          {
            title: String,
            desc: String,
          },
        ],
      },
    ],
  },
  {
    timestamps: true,
  }
);

export const BlogPost = mongoose.model('BlogPost', blogPostSchema);
