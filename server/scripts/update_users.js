import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('Error: MONGODB_URI is not defined in server/.env');
  process.exit(1);
}

async function updateUsers() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected successfully.\n');

    // ── Update Admin ──────────────────────────────────────────────
    const admin = await User.findOne({ role: 'admin' });
    if (admin) {
      admin.username = 'Rideyourbike@gmail.com';
      admin.password = 'ryb@0001';
      await admin.save(); // triggers pre-save hook to hash password
      console.log('✅ Admin updated:');
      console.log('   Username: Rideyourbike@gmail.com');
      console.log('   Password: ryb@0001\n');
    } else {
      console.log('⚠️  No admin found. Creating one...');
      await User.create({
        name: 'Super Admin',
        username: 'Rideyourbike@gmail.com',
        password: 'ryb@0001',
        role: 'admin'
      });
      console.log('✅ Admin created: Rideyourbike@gmail.com / ryb@0001\n');
    }

    // ── Update Worker 1 ───────────────────────────────────────────
    const worker1 = await User.findOne({ username: '9876543210' });
    if (worker1) {
      worker1.username = 'worker1@gmail.com';
      worker1.password = 'ryb@w1';
      await worker1.save();
      console.log('✅ Worker 1 updated:');
      console.log('   Username: worker1@gmail.com');
      console.log('   Password: ryb@w1\n');
    } else {
      console.log('⚠️  Worker 1 (9876543210) not found, skipped.');
    }

    // ── Update Worker 2 ───────────────────────────────────────────
    const worker2 = await User.findOne({ username: '9898986363' });
    if (worker2) {
      worker2.username = 'worker2@gmail.com';
      worker2.password = 'ryb@w2';
      await worker2.save();
      console.log('✅ Worker 2 updated:');
      console.log('   Username: worker2@gmail.com');
      console.log('   Password: ryb@w2\n');
    } else {
      console.log('⚠️  Worker 2 (9898986363) not found, skipped.');
    }

    console.log('══════════════════════════════════════');
    console.log('All user credentials updated successfully!');
    console.log('══════════════════════════════════════');
  } catch (error) {
    console.error('Failed to update users:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

updateUsers();
