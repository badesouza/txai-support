/**
 * Firestore Database Seed Script
 * 
 * This script is compiled and runs automatically on container startup.
 * It is idempotent - safe to run multiple times.
 */

// Load environment variables from .env.local files
import dotenv from 'dotenv';
import path from 'path';

// Load root .env.local first (shared config like GCP_PROJECT_ID)
dotenv.config({ path: path.resolve(__dirname, '../../../.env.local') });
// Then load backend-specific .env.local (overrides root values if duplicated)
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });
// Fallback to .env if neither .env.local exists
dotenv.config();

import { initializeFirebase, getFirestore } from '../lib/firebase';
import { UserRepository } from '../repositories';
import bcrypt from 'bcryptjs';

async function seed() {
  console.log('🌱 Starting Firestore seed...');

  try {
    // Initialize Firebase
    initializeFirebase();
    getFirestore(); // Initialize Firestore connection
    console.log('✅ Firebase initialized');

    // Check if admin user exists
    const existingAdmin = await UserRepository.findByEmail('admin@txai.com');
    
    if (existingAdmin) {
      console.log('ℹ️ Admin user already exists, skipping seed');
      return;
    }

    // Create admin user - password from environment (default to admin123)
    const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'admin123';
    
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    
    const adminUser = await UserRepository.create({
      name: 'Admin',
      email: 'admin@txai.com',
      password: hashedPassword,
      phone: '5511999999999',
      profile: 'ADMIN'
    });

    console.log('✅ Admin user created:', {
      id: adminUser.id,
      email: adminUser.email,
      name: adminUser.name
    });

    console.log('🎉 Seed completed successfully!');
    console.log('');
    console.log('Default admin created:');
    console.log('  Email: admin@txai.com');
    console.log('  Password: (from ADMIN_DEFAULT_PASSWORD env var, default admin123)');

  } catch (error) {
    console.error('❌ Seed failed:', error);
    // Don't exit with error - allow server to start anyway
    // The seed might fail if Firestore isn't ready yet
  }
}

// Export for programmatic use
export { seed };

// Run if called directly
if (require.main === module) {
  seed()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

