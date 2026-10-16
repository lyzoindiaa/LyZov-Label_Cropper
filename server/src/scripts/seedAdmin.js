import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function seedAdmin() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/gst_tool';
  await mongoose.connect(mongoUri);

  const hash = await bcrypt.hash('Admin@LyZov2026!', 10);

  const res = await mongoose.connection.db.collection('users').findOneAndUpdate(
    { email: 'admin@lyzov.com' },
    {
      $set: {
        name: 'LyZov Admin',
        email: 'admin@lyzov.com',
        passwordHash: hash,
        role: 'admin',
        plan: 'pro',
        phone: '+91 9999999999',
        createdAt: new Date(),
        trialEndsAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      },
    },
    { upsert: true, returnDocument: 'after' }
  );

  console.log('SUCCESS: Admin user created/updated with email: admin@lyzov.com and role: admin');
  await mongoose.disconnect();
}

seedAdmin().catch(console.error);
