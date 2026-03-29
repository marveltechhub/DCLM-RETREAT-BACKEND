import mongoose from 'mongoose';

export async function connectDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not set');
  }
  mongoose.set('strictQuery', true);
  const opts = {};
  if (process.env.MONGODB_DB_NAME) {
    opts.dbName = process.env.MONGODB_DB_NAME;
  }
  await mongoose.connect(uri, opts);
  console.log('MongoDB connected —', mongoose.connection.name);
}
