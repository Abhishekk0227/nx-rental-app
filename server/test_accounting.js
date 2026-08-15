import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, 'server', '.env') });

import Booking from './models/Booking.js';

async function testAccounting() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/nx-rental');
    const date = '2026-08-15';
    let query = {};
    const matchedBookings = await Booking.find(query);
    console.log(`Found ${matchedBookings.length} bookings.`);
    
    // Copy parseMixedRef
    const parseMixedRef = (refStr = '') => {
      const cashMatch = refStr.match(/Cash:\s*([\d.]+)/i);
      const onlineMatch = refStr.match(/Online:\s*([\d.]+)/i);
      const vikasMatch = refStr.match(/Vikas:\s*([\d.]+)/i);
      return {
        cash: parseFloat(cashMatch?.[1]) || 0,
        online: parseFloat(onlineMatch?.[1]) || 0,
        vikas: parseFloat(vikasMatch?.[1]) || 0
      };
    };

    // Copy getPaymentSplit
    const getPaymentSplit = (p) => {
      let cash = 0, online = 0, vikas = 0;
      if (p.mode === 'Cash') cash = p.cashAmount || p.amount || 0;
      else if (p.mode === 'Vikas') vikas = p.vikasAmount || p.amount || 0;
      else if (['UPI', 'Online', 'Bank Transfer'].includes(p.mode)) online = p.onlineAmount || p.amount || 0;
      else if (p.mode === 'Mixed') {
        if (p.cashAmount || p.onlineAmount || p.vikasAmount) {
          cash = p.cashAmount || 0;
          online = p.onlineAmount || 0;
          vikas = p.vikasAmount || 0;
        } else {
          const split = parseMixedRef(p.reference || '');
          cash = split.cash;
          online = split.online;
          vikas = split.vikas;
        }
      } else if (p.mode?.includes('Refund')) {
        cash = -(p.cashAmount || 0);
        online = -(p.onlineAmount || 0);
        vikas = -(p.vikasAmount || 0);
      }
      return { cash, online, vikas };
    };

    const rentalCollections = { cash: 0, online: 0, vikas: 0, total: 0 };
    for (let b of matchedBookings) {
      const todayPayments = b.paymentCollection?.filter(p => {
        return new Date(p.timestamp).toLocaleDateString('en-CA') === date;
      }) || [];
      for (const p of todayPayments) {
        const { cash, online, vikas } = getPaymentSplit(p);
        rentalCollections.cash += cash;
        rentalCollections.online += online;
        rentalCollections.vikas += vikas;
        rentalCollections.total += cash + online + vikas;
      }
    }
    console.log("Rental Collections:", rentalCollections);
  } catch(e) {
    console.error("Crash:", e);
  } finally {
    mongoose.disconnect();
  }
}
setTimeout(() => testAccounting(), 1000);
