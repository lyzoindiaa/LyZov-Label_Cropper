import mongoose from 'mongoose';
import { User } from '../models/User.js';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/gst_tool');
  const user = await User.findOneAndUpdate(
    { email: 'admin@lyzov.com' },
    { $set: { role: 'admin', plan: 'pro' } },
    { new: true }
  );
  console.log('Admin user updated:', user?.email, 'Role:', user?.role);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch(console.error);
