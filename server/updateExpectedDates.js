import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import dns from 'dns';
import Booking from './models/Booking.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Explicitly set DNS servers (matching db.js) to fix local connection issues
dns.setServers([
  "8.8.8.8",
  "8.8.4.4",
]);

dotenv.config({ path: path.join(__dirname, '.env') });

const updateDates = async () => {
  let uri = process.env.MONGODB_URI;
  if (uri) {
    uri = uri.replace(/^["']|["']$/g, '').trim();
  }

  if (!uri) {
    console.error('MONGODB_URI is missing in .env');
    process.exit(1);
  }

  try {
    await mongoose.connect(uri);
    console.log('Connected to MongoDB.');

    const bookings = await Booking.find({});
    let updatedCount = 0;

    for (const booking of bookings) {
      if (booking.rentalPeriod && booking.rentalPeriod.startDate) {
        const start = new Date(booking.rentalPeriod.startDate);
        
        // Ensure start is a valid date
        if (!isNaN(start.getTime())) {
          // Calculate booked time in milliseconds using only durationHours
          // (durationDays in the frontend is just Math.ceil(durationHours / 24))
          const hours = booking.durationHours || 0;
          const durationMs = hours * 60 * 60 * 1000;
          
          if (durationMs > 0) {
            const expectedEnd = new Date(start.getTime() + durationMs);
            
            // Check if extensions pushed the expectedEnd further
            let finalExpectedEnd = expectedEnd;
            if (booking.extensions && booking.extensions.length > 0) {
              // Find the max newEndDateTime from extensions
              const maxExtensionEnd = new Date(Math.max(...booking.extensions.map(e => new Date(e.newEndDateTime).getTime())));
              if (!isNaN(maxExtensionEnd.getTime()) && maxExtensionEnd > expectedEnd) {
                finalExpectedEnd = maxExtensionEnd;
              }
            }

            // Update fields using collection.updateOne to bypass validation of other existing fields
            await Booking.collection.updateOne(
              { _id: booking._id },
              {
                $set: {
                  'rentalPeriod.expectedEndDate': finalExpectedEnd,
                  expectedDropDate: finalExpectedEnd,
                  expectedReturnDate: finalExpectedEnd
                }
              }
            );
            updatedCount++;
            console.log(`Updated booking ${booking.bookingId} - New Expected End: ${finalExpectedEnd.toISOString()}`);
          }
        }
      }
    }

    console.log(`\nSuccessfully updated ${updatedCount} bookings.`);
  } catch (err) {
    console.error('Error updating bookings:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
    process.exit(0);
  }
};

updateDates();
