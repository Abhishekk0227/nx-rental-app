import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("MONGODB_URI not found in .env");
  process.exit(1);
}

const vehicleSchema = new mongoose.Schema({}, { strict: false });
const Vehicle = mongoose.model('Vehicle', vehicleSchema);

async function run() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB.");

    const vehicles = await Vehicle.find({});
    console.log(`Found ${vehicles.length} vehicles.`);

    let updatedCount = 0;

    for (const v of vehicles) {
      const cat = (v.category || v.type || '').toLowerCase();
      let range = 5000;
      if (cat === 'scooty') range = 2000;
      else if (cat === 'bike' || cat === 'ev') range = 3000;
      else if (cat === 'car') range = 5000;

      const meter = Number(v.meterReading) || 0;
      
      const updateData = {
        lastServiceKm: meter,
        maintenanceIntervalKm: range,
        nextServiceKm: meter + range,
        availability: { availableForBooking: true, reason: '' }
      };

      if (v.status === 'Maintenance') {
        updateData.status = 'Available';
      }

      if (v.maintenanceRecords && Array.isArray(v.maintenanceRecords)) {
        updateData.maintenanceRecords = v.maintenanceRecords.map(rec => {
          if (rec.status === 'Pending' || rec.status === 'In Progress') {
            return { ...rec, status: 'Completed', completedDate: new Date().toISOString() };
          }
          return rec;
        });
      }

      await Vehicle.updateOne({ _id: v._id }, { $set: updateData });
      updatedCount++;
      console.log(`Updated ${v.name} (${v.regNumber || v.vehicleId}) [${v.category}]: Meter=${meter}, Range=+${range}KM, NextService=${meter + range}KM, Status=${updateData.status || v.status}`);
    }

    console.log(`Successfully updated ${updatedCount} vehicles in database.`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("Error updating vehicles:", err);
    process.exit(1);
  }
}

run();
