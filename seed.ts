import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from './models/User';

dotenv.config();

const seed = async () => {
  try {
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/panache2k26';
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Super Admin Credentials
    const SUPERADMIN_NAME = process.env.SUPERADMIN_NAME || 'Super Admin';
    const SUPERADMIN_EMAIL = process.env.SUPERADMIN_EMAIL?.toLowerCase() || 'superadmin@panache.com';
    const SUPERADMIN_PASSWORD = process.env.SUPERADMIN_PASSWORD || 'SuperSecurePass123';
    
    // Check if superadmin exists
    let superAdmin = await User.findOne({ email: SUPERADMIN_EMAIL });
    if (!superAdmin) {
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(SUPERADMIN_PASSWORD, salt);

      superAdmin = new User({
        name: SUPERADMIN_NAME,
        email: SUPERADMIN_EMAIL,
        passwordHash: hash,
        role: 'superadmin',
      });

      await superAdmin.save();
      console.log('✅ Successfully created Super Admin:');
      console.log(`Email: ${SUPERADMIN_EMAIL}`);
      console.log(`Password: ${SUPERADMIN_PASSWORD}`);
    } else {
      console.log('ℹ️ Super Admin already exists.');
    }

    // Test Admin Credentials
    const TEST_ADMIN_EMAIL = 'admin@panache.com';
    const TEST_ADMIN_PASSWORD = 'Admin@123';
    
    let testAdmin = await User.findOne({ email: TEST_ADMIN_EMAIL });
    if (!testAdmin) {
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(TEST_ADMIN_PASSWORD, salt);

      testAdmin = new User({
        name: 'Test Admin',
        email: TEST_ADMIN_EMAIL,
        passwordHash: hash,
        role: 'admin',
      });

      await testAdmin.save();
      console.log('✅ Successfully created Test Admin:');
      console.log(`Email: ${TEST_ADMIN_EMAIL}`);
      console.log(`Password: ${TEST_ADMIN_PASSWORD}`);
    } else {
      console.log('ℹ️ Test Admin already exists.');
    }

    mongoose.disconnect();
    console.log('🛑 Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

seed();
