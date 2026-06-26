/**
 * Database Seed Script
 *
 * Idempotent - safe to run multiple times.
 */

import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });
dotenv.config();

import { initializeDatabase } from '../lib/db';
import { migrate } from '../db/migrate';
import { UserRepository } from '../repositories';
import bcrypt from 'bcryptjs';

async function seed() {
  console.log('🌱 Starting database seed...');

  try {
    initializeDatabase();
    await migrate();

    const existingAdmin = await UserRepository.findByEmail('admin@txai.com');

    if (existingAdmin) {
      console.log('ℹ️ Admin user already exists, skipping seed');
      return;
    }

    const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'admin123';
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    const adminUser = await UserRepository.create({
      name: 'Admin',
      email: 'admin@txai.com',
      password: hashedPassword,
      phone: '5511999999999',
      profile: 'ADMIN',
    });

    console.log('✅ Admin user created:', {
      id: adminUser.id,
      email: adminUser.email,
      name: adminUser.name,
    });

    console.log('🎉 Seed completed successfully!');
    console.log('');
    console.log('Default admin created:');
    console.log('  Email: admin@txai.com');
    console.log('  Password: (from ADMIN_DEFAULT_PASSWORD env var, default admin123)');
  } catch (error) {
    console.error('❌ Seed failed:', error);
  }
}

export { seed };

if (require.main === module) {
  seed()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
