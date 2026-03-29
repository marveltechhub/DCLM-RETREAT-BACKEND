import 'dotenv/config';
import app from './app.js';
import { connectDb } from './config/db.js';
import { initCloudinary } from './config/cloudinary.js';

const port = process.env.PORT || 5000;

async function main() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16) {
    console.warn('Warning: Set JWT_SECRET to a strong value (16+ chars) in production.');
  }
  initCloudinary();
  await connectDb();
  app.listen(port, () => {
    console.log(`API listening on http://localhost:${port}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
