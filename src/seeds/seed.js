import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI required');
    process.exit(1);
  }
  await mongoose.connect(uri);
  const dbName = mongoose.connection?.db?.databaseName || '(unknown)';
  console.log('Connected — database:', dbName);

  const email = (process.env.SEED_SUPER_ADMIN_EMAIL || 'superadmin@dclm.local').toLowerCase().trim();
  const password = process.env.SEED_SUPER_ADMIN_PASSWORD || 'SeedAdmin123!';

  const forceReset =
    process.env.SEED_FORCE_RESET === '1' ||
    process.env.SEED_FORCE_RESET === 'true' ||
    process.argv.includes('--reset');

  const existing = await User.findOne({ email });

  if (existing) {
    if (forceReset && existing.role === 'super_admin') {
      existing.passwordHash = await bcrypt.hash(password, 12);
      existing.isActive = true;
      existing.name = existing.name || 'Super Admin';
      await existing.save();
      console.log('Reset super admin password for:', email);
      console.log('  Log in with SEED_SUPER_ADMIN_PASSWORD from .env (or default SeedAdmin123!)');
      await mongoose.disconnect();
      return;
    }
    console.log('Super admin already exists:', email);
    console.log('  Login still fails? Run: npm run seed:reset');
    console.log('  Or set SEED_FORCE_RESET=1 once, then npm run seed');
    await mongoose.disconnect();
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await User.create({
    name: 'Super Admin',
    email,
    passwordHash,
    role: 'super_admin',
    location: null,
  });

  console.log('Created super admin');
  console.log('  Email:', email);
  console.log('  Password:', password);
  await mongoose.disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
