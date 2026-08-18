import mongoose from 'mongoose';
import Booking from './models/Booking.js';

async function test() {
  try {
    await mongoose.connect('mongodb://localhost:27017/nx-rental-app'); // Assuming local, or maybe it uses env
    const [
      pendingPickupsCount,
      ongoingTripsCount,
      activeRentalsCount,
      completedBookings
    ] = await Promise.all([
      Booking.countDocuments({ status: 'Reserved' }),
      Booking.countDocuments({ status: 'Ongoing' }),
      Booking.countDocuments({ status: { $in: ['Ongoing', 'Extended', 'Overdue'] } }),
      Booking.aggregate([
        { $match: { status: 'Completed' } },
        { $group: { _id: null, total: { $sum: "$settlement.actualBill" } } }
      ])
    ]);
    console.log({ pendingPickupsCount, ongoingTripsCount, activeRentalsCount, completedBookings });
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
test();
