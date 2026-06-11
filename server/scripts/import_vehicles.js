/**
 * ================================================================
 * PRODUCTION DATA IMPORTER
 * Maps onlinestore.vehicles.json → current CarRental Vehicle schema
 * ================================================================
 * Run: node scripts/import_vehicles.js
 */

import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
import { readFileSync } from "fs";
import mongoose from "mongoose";
import Vehicle from "../models/Vehicle.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

// ── Path to your JSON file ──────────────────────────────────────
const JSON_FILE = path.join(
  __dirname,
  "../../onlinestore.vehicles.json"
);

// ── Category mapping (onlinestore → Vehicle.js enum) ───────────
const categoryMap = {
  bike: "Bike",
  scooty: "Scooty",
  car: "Car",
  ev: "EV",
  EV: "EV",
  Bike: "Bike",
  Scooty: "Scooty",
  Car: "Car",
};

// ── Status mapping ──────────────────────────────────────────────
const statusMap = {
  active: "Active",
  Active: "Active",
  reserved: "Reserved",
  Reserved: "Reserved",
  available: "Available",
  Available: "Available",
  booked: "Booked",
  Booked: "Booked",
  maintenance: "Maintenance",
  Maintenance: "Maintenance",
  inactive: "Inactive",
  Inactive: "Inactive",
  ongoing: "Ongoing",
  Ongoing: "Ongoing",
};

// ── Resolve MongoDB Extended JSON ($oid / $date) ────────────────
function resolveOid(val) {
  if (!val) return undefined;
  if (typeof val === "object" && val.$oid) return val.$oid;
  return val;
}

// ── Main field mapper ───────────────────────────────────────────
function mapVehicle(src, index) {
  const cat = categoryMap[src.category] || "Bike";
  const status = statusMap[src.status] || "Active";

  // availability flag
  const availableForBooking =
    src.availability === "available" || src.availability === "Available";

  return {
    // Identity
    name: src.name || "Unknown Vehicle",
    brand: src.companyName || src.brand || "Unknown",
    regNumber: src.vehicleNo || src.regNumber || `REG-IMPORT-${index}`,
    category: cat,
    fuelType: src.type || src.fuelType || "Petrol",
    seatingCapacity: src.seatingCapacity || 2,
    color: src.color || "Black",
    meterReading: src.meterReading || 0,
    fuelCapacity: src.fuelCapacity || 0,
    mileage: src.mileage || 0,
    description: src.description || "",
    status: status,

    // Pricing plans — mapped from rate12hr / rateHourly / rate24hr
    pricingPlans: {
      hourly: {
        rate: src.rateHourly?.ratePerHour || 0,
        freeKm: src.rateHourly?.kmFreePerHour || 0,
        fuelChargePerKm: src.rateHourly?.fuelChargesperkm || 0,
        extraKmCharge: src.rateHourly?.extraChargePerKm || 0,
        withFuel: src.rateHourly?.withFuelPerHour || 0,
        withoutFuel: src.rateHourly?.withoutFuelPerHour || 0,
      },
      twelveHour: {
        baseRate: src.rate12hr?.baseRate || 0,
        ratePerHour: src.rate12hr?.ratePerHour || 0,
        kmLimit: src.rate12hr?.kmLimit || 0,
        fuelChargePerKm: src.rate12hr?.fuelChargesperkm || 0,
        extraKmCharge: src.rate12hr?.extraChargePerKm || 0,
        extraHourCharge: src.rate12hr?.extraChargePerHour || 0,
        gracePeriod: src.rate12hr?.gracePeriodMinutes || 0,
        withFuel: src.rate12hr?.withFuelPerHour || 0,
        withoutFuel: src.rate12hr?.withoutFuelPerHour || 0,
      },
      twentyFourHour: {
        baseRate: src.rate24hr?.baseRate || 0,
        ratePerHour: src.rate24hr?.ratePerHour || 0,
        kmLimit: src.rate24hr?.kmLimit || 0,
        fuelChargePerKm: src.rate24hr?.fuelChargesperkm || 0,
        extraKmCharge: src.rate24hr?.extraChargePerKm || 0,
        extraHourCharge: src.rate24hr?.extraChargePerHour || 0,
        gracePeriod: src.rate24hr?.gracePeriodMinutes || 0,
        withFuel: src.rate24hr?.withFuelPerHour || 0,
        withoutFuel: src.rate24hr?.withoutFuelPerHour || 0,
      },
      weekly: {
        baseRate: 0,
        kmLimit: 0,
        extraKmCharge: 0,
        extraDayCharge: 0,
        gracePeriod: 0,
      },
      monthly: {
        baseRate: 0,
        kmLimit: 0,
        extraKmCharge: 0,
        extraDayCharge: 0,
      },
    },

    // Deposit & Payment
    depositSettings: {
      requireDeposit: src.requiresDeposit ?? false,
      amount: src.depositAmount || 0,
    },
    paymentSettings: {
      advanceRequired: src.requiredPaymentPercentage
        ? src.requiredPaymentPercentage > 0
        : false,
      percentage: src.requiredPaymentPercentage || 50,
      acceptedModes: ["Cash", "UPI", "Card"],
    },

    // Booking config
    bookingConfig: {
      bufferTime: src.minBufferTime || 30,
      minBookingHours: 0,
      status: "Active",
      bookingEnabled: true,
      instantBooking: !(src.requiresApproval || src.requireConfirmation),
    },

    // Location
    locationDetails: {
      currentZone: src.zoneCenterName?.trim() || src.zoneCode || "Main Zone",
      currentBranch: src.zoneCenterAddress || "Main Branch",
      parkingLocation: "",
      gps: {
        lat: src.locationGeo?.coordinates?.[1] || 0,
        lng: src.locationGeo?.coordinates?.[0] || 0,
      },
    },

    // Documents (onlinestore stores status strings, not URLs — default to '')
    documents: {
      rcUrl: "",
      insuranceUrl: "",
      pucUrl: "",
      fitnessUrl: "",
    },

    // Images — use the first vehicleImage as front
    images: {
      front: src.vehicleImages?.[0] || "",
      back: src.vehicleImages?.[1] || "",
      left: src.vehicleImages?.[2] || "",
      right: src.vehicleImages?.[3] || "",
      interior: "",
      document: "",
      other: "",
    },

    // Availability
    availability: {
      availableForBooking,
      reason: availableForBooking ? "" : src.availability || "",
    },

    // Maintenance & audit
    maintenanceRecords: [],
    auditLogs: [],
    assignedWorker: "Unassigned",
  };
}

// ── Entry Point ─────────────────────────────────────────────────
async function run() {
  console.log("🔗  Connecting to MongoDB...");
  const maskedUri = process.env.MONGODB_URI?.replace(/:([^@]+)@/, ":****@");
  console.log("   URI:", maskedUri);

  await mongoose.connect(process.env.MONGODB_URI);
  console.log("✅  Connected!\n");

  // Read and parse JSON
  console.log("📂  Reading JSON file:", JSON_FILE);
  const raw = readFileSync(JSON_FILE, "utf-8");
  const data = JSON.parse(raw);
  console.log(`📋  Total records in JSON: ${data.length}\n`);

  let inserted = 0;
  let skipped = 0;
  const errors = [];

  for (let i = 0; i < data.length; i++) {
    const src = data[i];
    try {
      const mapped = mapVehicle(src, i + 1);

      // Use insertOne with validation (goes through the pre-save hook for vehicleId)
      const vehicle = new Vehicle(mapped);
      await vehicle.save();
      inserted++;
      process.stdout.write(`\r✅  Inserted: ${inserted}  |  Skipped: ${skipped}  |  Errors: ${errors.length}`);
    } catch (err) {
      skipped++;
      const regNo = src.vehicleNo || src.regNumber || `record-${i + 1}`;
      errors.push({ record: regNo, error: err.message });
      process.stdout.write(`\r✅  Inserted: ${inserted}  |  Skipped: ${skipped}  |  Errors: ${errors.length}`);
    }
  }

  console.log("\n\n═══════════════════════════════════════");
  console.log(`📊  IMPORT SUMMARY`);
  console.log(`═══════════════════════════════════════`);
  console.log(`   Total in JSON : ${data.length}`);
  console.log(`   ✅ Inserted   : ${inserted}`);
  console.log(`   ⏭️  Skipped   : ${skipped}`);
  console.log(`   ❌ Errors     : ${errors.length}`);
  console.log(`═══════════════════════════════════════`);

  if (errors.length > 0) {
    console.log("\n❌  Failed records:");
    errors.forEach((e) => console.log(`   - ${e.record}: ${e.error}`));
  }

  await mongoose.disconnect();
  console.log("\n🏁  Done! Disconnected from MongoDB.");
  process.exit(0);
}

run().catch((err) => {
  console.error("❌  Fatal error:", err.message);
  process.exit(1);
});
