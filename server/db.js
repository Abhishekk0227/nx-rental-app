import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import dns from 'dns';

dns.setServers(["8.8.8.8", "8.8.4.4"]);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure env variables are loaded from server/.env as well
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config();

/**
 * connectDB — safe to call multiple times.
 * - If already connected (readyState 1): returns immediately.
 * - If currently connecting (readyState 2): waits for promise.
 * - Otherwise: initiates connection with auto-retry.
 */
const connectDB = async (retries = 3) => {
  if (mongoose.connection.readyState === 1) return;

  if (mongoose.connection.readyState === 2) {
    await new Promise((resolve, reject) => {
      mongoose.connection.once('connected', resolve);
      mongoose.connection.once('error', reject);
    });
    return;
  }

  let uri = process.env.MONGODB_URI;
  if (uri) {
    // Strip surrounding quotes if present
    uri = uri.replace(/^["']|["']$/g, '').trim();
  }

  if (!uri) {
    console.error('[DB] MONGODB_URI is not set. Cannot connect to MongoDB.');
    if (process.env.DISABLE_MEMORY_FALLBACK === 'true') {
      console.error('[DB] DISABLE_MEMORY_FALLBACK is true. Exiting.');
      process.exit(1);
    }
    console.warn('[DB] Falling back to In-Memory mode.');
    return;
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      mongoose.set('bufferCommands', false);

      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 30000, // 30s for Atlas connections
        connectTimeoutMS: 30000,
        socketTimeoutMS: 45000,
      });

      const { host, name } = mongoose.connection;
      console.log(`[DB] MongoDB Connected: ${host || 'unknown'} — DB: ${name || 'unknown'}`);

      if (!mongoose.connection.listenerCount('disconnected')) {
        mongoose.connection.on('disconnected', () => {
          console.warn('[DB] MongoDB disconnected.');
        });
        mongoose.connection.on('reconnected', () => {
          console.log('[DB] MongoDB reconnected successfully.');
        });
        mongoose.connection.on('error', (err) => {
          console.error(`[DB] MongoDB connection error: ${err.message}`);
        });
      }

      return; // Success!
    } catch (error) {
      console.error(`[DB] MongoDB Connection Attempt ${attempt}/${retries} Failed: ${error.message}`);
      if (attempt < retries) {
        console.log(`[DB] Retrying connection in ${attempt * 2}s...`);
        await new Promise(res => setTimeout(res, attempt * 2000));
      } else {
        if (process.env.DISABLE_MEMORY_FALLBACK === 'true') {
          console.error('[DB] DISABLE_MEMORY_FALLBACK is true. Exiting.');
          process.exit(1);
        }
        console.warn('[DB] All connection attempts failed. Running in In-Memory Fallback Mode.');
      }
    }
  }
};

export default connectDB;
