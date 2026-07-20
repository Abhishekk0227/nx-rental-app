/**
 * seedDB.js — Run this once to seed vehicles into MongoDB Atlas
 * Usage: node seedDB.js (from server/ directory)
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { seedVehicles } from './seeds/vehicles.js';
import Vehicle from './models/Vehicle.js';
import Booking from './models/Booking.js';
import Settlement from './models/Settlement.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in .env');
  process.exit(1);
}

async function seedDB() {
  try {
    console.log('🔌 Connecting to MongoDB Atlas...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected! Database:', mongoose.connection.name);
    console.log('📍 Host:', mongoose.connection.host);

    // ── 1. Create indexes / ensure collections exist ─────────────────────────
    console.log('\n📦 Creating collections & indexes...');
    await Vehicle.createIndexes();
    await Booking.createIndexes();
    await Settlement.createIndexes();
    console.log('✅ Collections & indexes ready: vehicles, bookings, settlements');

    // ── 2. Check existing vehicles ────────────────────────────────────────────
    const existingCount = await Vehicle.countDocuments();
    console.log(`\n🚗 Existing vehicles in DB: ${existingCount}`);

    if (existingCount > 0) {
      console.log('ℹ️  Vehicles already exist. Skipping seed to avoid duplicates.');
      console.log('   To force re-seed, manually drop the vehicles collection first.');
    } else {
      // ── 3. Seed Vehicles ──────────────────────────────────────────────────
      console.log(`\n🌱 Seeding ${seedVehicles.length} vehicles...`);
      const result = await Vehicle.insertMany(seedVehicles, { ordered: false });
      console.log(`✅ Successfully inserted ${result.length} vehicles!`);
      result.forEach(v => console.log(`   • ${v.vehicleId} — ${v.name} (${v.regNumber})`));
    }

    // ── 4. Summary ────────────────────────────────────────────────────────────
    const totalVehicles  = await Vehicle.countDocuments();
    const totalBookings  = await Booking.countDocuments();
    const totalSettlements = await Settlement.countDocuments();

    console.log('\n📊 Database Summary:');
    console.log(`   🚗 Vehicles:    ${totalVehicles}`);
    console.log(`   📋 Bookings:    ${totalBookings}`);
    console.log(`   💰 Settlements: ${totalSettlements}`);
    console.log('\n🎉 Database setup complete!');

  } catch (err) {
    console.error('❌ Error:', err.message);
    if (err.code === 11000) {
      console.error('   Duplicate key error — some records may already exist');
    }
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB.');
  }
}

seedDB();
