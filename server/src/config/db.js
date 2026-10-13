import mongoose from 'mongoose';

export async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/gst_tool';
  
  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 2000,
    });
    console.log(`✓ MongoDB Connected: ${conn.connection.host}`);
    return true;
  } catch (error) {
    console.warn(`! MongoDB Connection Warning: ${error.message}`);
    console.warn('  (Running without local MongoDB: Connect to MongoDB Atlas or local mongod for data persistence)');
    return false;
  }
}
