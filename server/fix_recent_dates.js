import mongoose from 'mongoose';
import Booking from './models/Booking.js';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGODB_URI) 
  .then(async () => {
    const bookings = await Booking.find({ createdAt: { $gte: new Date(Date.now() - 48 * 60 * 60 * 1000) } });
    let fixed = 0;
    for (let b of bookings) {
      if (b.rentalPeriod?.startDate && b.rentalPeriod?.expectedEndDate) {
        const diffMs = new Date(b.rentalPeriod.expectedEndDate).getTime() - new Date(b.rentalPeriod.startDate).getTime();
        const diffHours = diffMs / (1000 * 60 * 60);
        
        // If it's a fractional hour like 17.5 instead of 12, or exactly 5.5 hours longer
        if (diffHours % 1 !== 0 || diffHours > 12) {
          console.log(`Fixing booking ${b.bookingId} - duration is ${diffHours}`);
          // Subtract 5.5 hours (19800000 ms)
          const newEnd = new Date(new Date(b.rentalPeriod.expectedEndDate).getTime() - 5.5 * 60 * 60 * 1000);
          b.rentalPeriod.expectedEndDate = newEnd;
          b.expectedReturnDate = newEnd;
          b.expectedDropDate = newEnd;
          b.markModified('rentalPeriod');
          await b.save();
          fixed++;
        }
      }
    }
    console.log('Fixed', fixed, 'bookings');
    process.exit(0);
  });