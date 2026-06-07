import mongoose from 'mongoose';

// Cache the connection promise so serverless warm invocations reuse it
let connectionPromise: Promise<void> | null = null;

const _connect = async (): Promise<void> => {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI environment variable is not defined');

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
  });

  console.log(`MongoDB connected: ${mongoose.connection.host}`);

  mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err);
    connectionPromise = null; // allow retry on next request
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB disconnected');
    connectionPromise = null;
  });
};

const connectDB = (): Promise<void> => {
  // Already connected — return immediately
  if (mongoose.connection.readyState === 1) return Promise.resolve();
  // Reuse in-progress connection attempt (handles concurrent cold starts)
  if (!connectionPromise) connectionPromise = _connect();
  return connectionPromise;
};

export default connectDB;
