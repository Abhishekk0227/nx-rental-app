import mongoose from 'mongoose';
import Booking from './models/Booking.js';
import dotenv from 'dotenv';
dotenv.config({path: './.env'});

mongoose.connect(process.env.MONGO_URI).then(async () => {
  try {
    const bookings = await Booking.find({}).sort({ createdAt: -1 }).limit(10);
    console.log("Found bookings:", bookings.length);
    for (const b of bookings) {
        let changed = false;
        if (!b.baseFare) {
          if (b.selectedPlan && b.selectedPlan.rate) {
            b.baseFare = b.selectedPlan.rate;
            changed = true;
          }
        }
        if (!b.advancePaid && b.settlement && b.settlement.previousPaid > 0) {
          b.advancePaid = b.settlement.previousPaid;
          changed = true;
        }
        if (!b.securityDeposit && b.settlement && b.settlement.depositCollected > 0) {
          b.securityDeposit = b.settlement.depositCollected;
          changed = true;
        }
        if (changed) {
          await b.save();
        }
      }
      console.log("Success");
  } catch (err) {
      console.error("ERROR", err);
  } finally {
      process.exit();
  }
});
