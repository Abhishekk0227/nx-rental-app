import express from 'express';
import Booking from '../models/Booking.js';
import Settlement from '../models/Settlement.js';
import { customRound } from '../utils/billingEngine.js';
import {
  isDbConnected,
  getBookings,
  getSettlements,
  addSettlement
} from '../memoryDb.js';

const router = express.Router();

// ─── Utilities ────────────────────────────────────────────────────────────────

/** Return YYYY-MM-DD string for a date value, or '' if invalid */
const safeDateStr = (dateVal) => {
  if (!dateVal) return '';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return '';
  }
};

/** Parse mixed payment reference string → { cash, online, vikas } */
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

/**
 * Get cash/online/vikas mixed for a single payment entry.
 * Uses stored cashAmount/onlineAmount/vikasAmount first (reliable),
 * falls back to parsing Mixed reference string.
 */
const getPaymentSplit = (p) => {
  let cash = 0, online = 0, card = 0, vikas = 0;

  if (p.mode === 'Cash') {
    cash = p.cashAmount || p.amount || 0;
  } else if (p.mode === 'Card') {
    card = p.cardAmount || p.amount || 0;
  } else if (p.mode === 'Vikas') {
    vikas = p.vikasAmount || p.amount || 0;
  } else if (['UPI', 'Online', 'Bank Transfer'].includes(p.mode)) {
    online = p.onlineAmount || p.amount || 0;
  } else if (p.mode === 'Mixed') {
    // Use stored splits if available (set during normalization)
    if (p.cashAmount || p.onlineAmount || p.cardAmount || p.vikasAmount) {
      cash = p.cashAmount || 0;
      online = p.onlineAmount || 0;
      card = p.cardAmount || 0;
      vikas = p.vikasAmount || 0;
    } else {
      // Fallback to parsing reference string
      const split = parseMixedRef(p.reference || '');
      cash = split.cash;
      online = split.online;
      card = split.card || 0;
      vikas = split.vikas;
    }
  } else if (p.mode?.includes('Refund')) {
    // Refund modes — treated as negative cash/online
    cash = -(p.cashAmount || 0);
    online = -(p.onlineAmount || 0);
    card = -(p.cardAmount || 0);
    vikas = -(p.vikasAmount || 0);
  }

  return { cash, online, card, vikas };
};

// ─── GET /api/accounting ────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  const { date, workerId, vehicleId, zoneId } = req.query;
  const targetDate = date || new Date().toISOString().slice(0, 10);

  try {
    let allBookings;
    if (isDbConnected()) {
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      const filter = {
        $or: [
          { createdAt: { $gte: startOfDay, $lte: endOfDay } },
          { 'paymentCollection.timestamp': { $gte: startOfDay, $lte: endOfDay } },
          { 'revisions.timestamp': { $gte: startOfDay, $lte: endOfDay } },
          { status: { $in: ['Ongoing', 'Extended', 'Reserved', 'Overdue'] } },
          { 'rentalPeriod.actualReturnDate': { $gte: startOfDay, $lte: endOfDay } },
          { 'rentalPeriod.actualPickupDate': { $gte: startOfDay, $lte: endOfDay } }
        ]
      };
      if (zoneId) filter.zoneId = zoneId;
      allBookings = await Booking.find(filter).lean();
    } else {
      allBookings = getBookings();
    }

    let totalBookings = 0;
    let totalRevenue = 0;
    let totalOutstanding = 0;

    const rentalCollections = { cash: 0, online: 0, vikas: 0, total: 0 };
    const depositCollections = { cash: 0, online: 0, vikas: 0, total: 0 };
    const depositRefunds = { cash: 0, online: 0, vikas: 0, total: 0 };
    let totalCashHandledByWorker = 0;

    const matchedBookingsList = [];

    for (const b of allBookings) {
      // ── Filter: only bookings with activity on targetDate ─────────────────
      const todayPayments = (b.paymentCollection || []).filter(
        p => safeDateStr(p.timestamp) === targetDate
      );
      const todayRevisions = (b.revisions || []).filter(
        r => safeDateStr(r.timestamp) === targetDate
      );

      // Refund activity: completed refund or revisions with refund on targetDate
      const returnDateStr = safeDateStr(b.actualReturnDate || b.rentalPeriod?.actualReturnDate);
      const isRefundToday =
        (b.refundDetails && Number(b.refundDetails.amount) > 0 && (returnDateStr === targetDate || safeDateStr(b.refundDetails?.timestamp) === targetDate || safeDateStr(b.updatedAt) === targetDate)) ||
        todayRevisions.some(r => r.refundDetails && Number(r.refundDetails.amount) > 0);

      if (todayPayments.length === 0 && todayRevisions.length === 0 && !isRefundToday) {
        continue;
      }

      // ── Filter: worker ─────────────────────────────────────────────────────
      const workerFilter = workerId && workerId !== 'All';

      if (workerFilter) {
        // Check payments attributed to this worker (workerId stored directly on payment)
        const hasPaymentByWorker = todayPayments.some(p => p.workerId === workerId);
        const hasRevisionByWorker = todayRevisions.some(r => r.operator === workerId);
        let hasRefundByWorker = false;
        if (isRefundToday) {
          const dropOffRev = (b.revisions || []).find(
            r => r.actionType === 'DropOff' && safeDateStr(r.timestamp) === targetDate
          );
          const refundOp = dropOffRev?.operator || b.workerId || 'System';
          hasRefundByWorker = refundOp === workerId;
        }
        if (!hasPaymentByWorker && !hasRevisionByWorker && !hasRefundByWorker) {
          continue;
        }
      }

      // ── Filter: vehicle ────────────────────────────────────────────────────
      if (vehicleId && vehicleId !== 'All' && b.vehicleId !== vehicleId) {
        continue;
      }

      totalBookings++;

      // ── Revenue from snapshot fields (primary source of truth) ─────────────
      const revenueContrib = Number(b.rentalCost) || Number(b.baseFare) || 0;
      const outstandingContrib = Number(b.outstandingRent) || 0;
      totalRevenue += revenueContrib;
      totalOutstanding += outstandingContrib;

      // ── Rental payment splits for today ────────────────────────────────────
      for (const p of todayPayments) {
        const pWorker = p.workerId && p.workerId !== 'System' ? p.workerId : b.workerId;
        if (workerFilter && pWorker !== workerId) continue;

        const { cash, online, card, vikas } = getPaymentSplit(p);
        rentalCollections.cash += cash;
        rentalCollections.online += online;
        rentalCollections.card = (rentalCollections.card || 0) + card;
        rentalCollections.vikas += vikas;
        rentalCollections.total += cash + online + card + vikas;

        if (!workerFilter || pWorker === workerId) {
          totalCashHandledByWorker += cash;
        }
      }

      // ── Deposit collections from revisions today ───────────────────────────
      for (const rev of todayRevisions) {
        const revOp = rev.operator && rev.operator !== 'System' ? rev.operator : b.workerId;
        if (workerFilter && revOp !== workerId) continue;
        if (!rev.depositDetails || (rev.depositDetails.difference || 0) <= 0) continue;

        const diff = rev.depositDetails.difference || 0;
        const mode = rev.depositDetails.mode || '';
        let cash = 0, online = 0, card = 0, vikas = 0;

        if (mode === 'Cash') {
          cash = diff;
        } else if (mode === 'Card') {
          card = diff;
        } else if (mode === 'Vikas') {
          vikas = diff;
        } else if (['UPI', 'Online'].includes(mode)) {
          online = diff;
        } else if (mode === 'Mixed') {
          // Use snapshot paymentBreakdown delta to get accurate mixed split
          const snapshot = rev.financialSnapshotAfterChange?.paymentBreakdown || {};
          const prevRev = (b.revisions || []).find(r => r.revisionNumber === rev.revisionNumber - 1);
          const prevSnapshot = prevRev?.financialSnapshotAfterChange?.paymentBreakdown || {};
          cash = Math.max(0, (snapshot.depositCash || 0) - (prevSnapshot.depositCash || 0));
          online = Math.max(0, (snapshot.depositOnline || 0) - (prevSnapshot.depositOnline || 0));
          card = Math.max(0, (snapshot.depositCard || 0) - (prevSnapshot.depositCard || 0));
          vikas = Math.max(0, (snapshot.depositVikas || 0) - (prevSnapshot.depositVikas || 0));

          if (cash === 0 && online === 0 && card === 0 && vikas === 0) {
            const split = parseMixedRef(rev.depositDetails?.remarks || '');
            cash = split.cash || 0;
            online = split.online || 0;
            card = split.card || 0;
            vikas = split.vikas || 0;
          }
        }

        depositCollections.cash += cash;
        depositCollections.online += online;
        depositCollections.card = (depositCollections.card || 0) + card;
        depositCollections.vikas += vikas;
        depositCollections.total += cash + online + card + vikas;
        totalCashHandledByWorker += cash;
      }

      // ── Deposit refund today ───────────────────────────────────────────────
      if (isRefundToday) {
        const dropOffRev = (b.revisions || []).find(
          r => r.actionType === 'DropOff' && safeDateStr(r.timestamp) === targetDate
        );
        const refundOp = dropOffRev?.operator && dropOffRev.operator !== 'System' ? dropOffRev.operator : b.workerId || 'System';
        if (!workerFilter || refundOp === workerId) {
          const refundAmt = Number(b.refundDetails?.amount) || 0;
          const method = b.refundDetails?.method || '';
          let cash = 0, online = 0, card = 0, vikas = 0;

          if (method === 'Cash') cash = refundAmt;
          else if (method === 'Card') card = refundAmt;
          else if (method === 'Vikas') vikas = refundAmt;
          else if (['UPI', 'Online'].includes(method)) online = refundAmt;
          else if (method === 'Mixed') {
            const split = parseMixedRef(b.refundDetails?.notes || '');
            cash = split.cash; online = split.online; card = split.card || 0; vikas = split.vikas;
          }

          depositRefunds.cash += cash;
          depositRefunds.online += online;
          depositRefunds.card = (depositRefunds.card || 0) + card;
          depositRefunds.vikas += vikas;
          depositRefunds.total += cash + online + card + vikas;
          totalCashHandledByWorker -= cash; // refund is outgoing cash
        }
      }

      matchedBookingsList.push({
        bookingId: b.bookingId,
        customerName: b.customer?.name || '—',
        vehicleId: b.vehicleId,
        vehicleName: b.vehicleDetails?.name || '—',
        status: b.status,
        rentalCost: revenueContrib,
        rentalPaid: Number(b.rentalPaid) || 0,
        outstanding: outstandingContrib,
        depositHeld: Number(b.depositHeld) || 0,
        collectAmount: Number(b.collectAmount) || 0,
        refundAmount: Number(b.refundAmount) || 0,
        workerId: b.workerId || b.revisions?.[0]?.operator || 'System',
        createdBy: b.revisions?.[0]?.operator || b.workerId || 'System',
        dropOperator: b.dropDetails?.operator || b.workerId || 'System'
      });
    }

    // ── Worker settlement record ───────────────────────────────────────────
    let depositToAdmin = 0;
    let workerBalance = totalCashHandledByWorker;

    if (date && workerId && workerId !== 'All') {
      const settlementRecord = isDbConnected()
        ? await Settlement.findOne({ date, workerId })
        : getSettlements().find(s => s.date === date && s.workerId === workerId);

      if (settlementRecord) {
        depositToAdmin = settlementRecord.depositToAdmin;
        workerBalance = settlementRecord.balance;
      }
    }

    res.json({
      summary: {
        totalBookings,
        totalRevenue: Math.round(totalRevenue),
        totalOutstanding: Math.round(totalOutstanding),
        rentalCollections: {
          cash: Math.round(rentalCollections.cash),
          online: Math.round(rentalCollections.online),
          card: Math.round(rentalCollections.card || 0),
          vikas: Math.round(rentalCollections.vikas),
          total: Math.round(rentalCollections.total)
        },
        depositCollections: {
          cash: Math.round(depositCollections.cash),
          online: Math.round(depositCollections.online),
          card: Math.round(depositCollections.card || 0),
          vikas: Math.round(depositCollections.vikas),
          total: Math.round(depositCollections.total)
        },
        depositRefunds: {
          cash: Math.round(depositRefunds.cash),
          online: Math.round(depositRefunds.online),
          card: Math.round(depositRefunds.card || 0),
          vikas: Math.round(depositRefunds.vikas),
          total: Math.round(depositRefunds.total)
        },
        netCashCollection: Math.round(rentalCollections.cash + depositCollections.cash - depositRefunds.cash),
        netCollection: Math.round(rentalCollections.total + depositCollections.total - depositRefunds.total)
      },
      bookings: matchedBookingsList.map(b => ({
        ...b,
        rentalCost: Math.round(b.rentalCost),
        rentalPaid: Math.round(b.rentalPaid),
        outstanding: Math.round(b.outstanding),
        depositHeld: Math.round(b.depositHeld),
        collectAmount: Math.round(b.collectAmount),
        refundAmount: Math.round(b.refundAmount)
      })),
      workerSettlement: {
        workerId: workerId || 'All',
        date: date || '',
        totalCashHandled: customRound(totalCashHandledByWorker),
        depositToAdmin,
        balance: customRound(workerBalance)
      }
    });
  } catch (error) {
    console.error('[Accounting] Error computing daily summary:', error.message);
    res.status(500).json({ message: error.message });
  }
});

// ─── GET settlements list ─────────────────────────────────────────────────────
router.get('/settlements', async (req, res) => {
  try {
    if (isDbConnected()) {
      const settlements = await Settlement.find().sort({ createdAt: -1 });
      return res.json(settlements);
    }
    res.json(getSettlements().slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── POST record worker deposit to admin ──────────────────────────────────────
router.post('/settle', async (req, res) => {
  const { date, workerId, depositAmount, remarks } = req.body;

  if (!date || !workerId || depositAmount === undefined) {
    return res.status(400).json({ message: 'date, workerId, and depositAmount are required.' });
  }

  try {
    const allBookings = isDbConnected() ? await Booking.find(req.query.zoneId ? { zoneId: req.query.zoneId } : {}).lean() : getBookings();

    // Calculate total cash this worker collected on this date
    // Use workerId stored directly on each payment entry (reliable — no fuzzy timestamp matching)
    let totalCashCollected = 0;

    for (const b of allBookings) {
      // Rental cash payments by this worker today
      for (const p of b.paymentCollection || []) {
        const pWorker = p.workerId && p.workerId !== 'System' ? p.workerId : b.workerId;
        if (safeDateStr(p.timestamp) === date && pWorker === workerId) {
          const { cash } = getPaymentSplit(p);
          totalCashCollected += cash;
        }
      }

      // Deposit cash collected via revisions by this worker today
      for (const rev of b.revisions || []) {
        const revOp = rev.operator && rev.operator !== 'System' ? rev.operator : b.workerId;
        if (
          safeDateStr(rev.timestamp) === date &&
          revOp === workerId &&
          rev.depositDetails?.difference > 0
        ) {
          if (rev.depositDetails?.mode === 'Cash') {
            totalCashCollected += rev.depositDetails.difference;
          } else if (rev.depositDetails?.mode === 'Mixed') {
            const snapshot = rev.financialSnapshotAfterChange?.paymentBreakdown || {};
            const prevRev = (b.revisions || []).find(r => r.revisionNumber === rev.revisionNumber - 1);
            const prevSnapshot = prevRev?.financialSnapshotAfterChange?.paymentBreakdown || {};
            let cash = Math.max(0, (snapshot.depositCash || 0) - (prevSnapshot.depositCash || 0));
            if (cash === 0) {
              const split = parseMixedRef(rev.depositDetails?.remarks || rev.depositDetails?.reference || '');
              cash = split.cash || 0;
            }
            totalCashCollected += cash;
          }
        }
      }

      // Deduct cash refunds processed by this worker today
      const returnDateStr = safeDateStr(b.actualReturnDate || b.rentalPeriod?.actualReturnDate);
      const isRefundToday = b.refundDetails?.status === 'Completed' && returnDateStr === date;

      if (isRefundToday) {
        const dropOffRev = (b.revisions || []).find(
          r => r.actionType === 'DropOff' && safeDateStr(r.timestamp) === date
        );
        const refundOp = dropOffRev?.operator && dropOffRev.operator !== 'System' ? dropOffRev.operator : b.workerId || 'System';
        if (refundOp === workerId) {
          if (b.refundDetails?.method === 'Cash') {
            totalCashCollected -= Number(b.refundDetails.amount) || 0;
          } else if (b.refundDetails?.method === 'Mixed') {
            const split = parseMixedRef(b.refundDetails?.notes || '');
            totalCashCollected -= (split.cash || 0);
          }
        }
      }
    }

    if (isDbConnected()) {
      let settlement = await Settlement.findOne({ date, workerId });
      if (!settlement) {
        settlement = new Settlement({ date, workerId, cashCollected: 0, depositToAdmin: 0 });
      }
      settlement.cashCollected = customRound(totalCashCollected);
      settlement.depositToAdmin += Number(depositAmount);
      if (remarks) settlement.remarks = remarks;
      const saved = await settlement.save();
      return res.json(saved);
    }

    const saved = addSettlement({
      date,
      workerId,
      cashCollected: customRound(totalCashCollected),
      depositAmount: Number(depositAmount),
      remarks
    });
    res.json(saved);
  } catch (error) {
    console.error('[Accounting] Error recording settlement:', error.message);
    res.status(400).json({ message: error.message });
  }
});

export default router;
