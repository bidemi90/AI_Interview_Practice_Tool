import mongoose from 'mongoose';
import { env } from './environment.js';

export async function connectDatabase() {
  if (!env.mongodbUri) {
    throw new Error('MONGODB_URI is required to start the API.');
  }

  await mongoose.connect(env.mongodbUri);
  console.log('MongoDB connected.');
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
}

