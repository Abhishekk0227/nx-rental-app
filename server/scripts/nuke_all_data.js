/**
 * ⚠️  DANGER ZONE — PRODUCTION DATA WIPE ⚠️
 * Deletes ALL documents from every collection in the DB.
 * Run: node scripts/nuke_all_data.js
 */

import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
import mongoose from "mongoose";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("❌  MONGODB_URI not found in .env");
  process.exit(1);
}

async function nukeAll() {
  console.log("🔗  Connecting to MongoDB...");
  console.log("   URI (masked):", MONGODB_URI.replace(/:([^@]+)@/, ":****@"));

  await mongoose.connect(MONGODB_URI);
  console.log("✅  Connected!\n");

  const db = mongoose.connection.db;

  const collections = await db.listCollections().toArray();
  const collectionNames = collections.map((c) => c.name);

  if (collectionNames.length === 0) {
    console.log("📭  No collections found — DB is already empty!");
    await mongoose.disconnect();
    process.exit(0);
  }

  console.log("📋  Collections found:", collectionNames.join(", "));
  console.log("");

  let totalDeleted = 0;

  for (const name of collectionNames) {
    const result = await db.collection(name).deleteMany({});
    console.log(`🗑️   ${name}: deleted ${result.deletedCount} documents`);
    totalDeleted += result.deletedCount;
  }

  console.log("\n✅  DONE! Total documents deleted:", totalDeleted);
  console.log("📭  Database is completely empty and ready for fresh data.");

  await mongoose.disconnect();
  process.exit(0);
}

nukeAll().catch((err) => {
  console.error("❌  Error:", err.message);
  process.exit(1);
});
