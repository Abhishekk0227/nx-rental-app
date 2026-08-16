import React, { useState, useEffect, useRef } from 'react';
import { Bike, X, User, MapPin, Key, Calendar, Tag, Shield, Banknote, BarChart2, FileText, Camera, StickyNote, Info, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { customRound } from '../utils/billingEngine';

export default function BookingForm({ vehicle, onConfirmBooking, onCancel, currentWorker }) {
  // Section 1: Customer Information
  const [fullName, setFullName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [altPhoneNumber, setAltPhoneNumber] = useState('');
  const [showOptionalDetails, setShowOptionalDetails] = useState(false);
  const [email, setEmail] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');

  // Section 2: Vehicle Handover
  const v = vehicle || {};
  const [startMeter, setStartMeter] = useState(v.meterReading || 0);
  const [includeFuel, setIncludeFuel] = useState(false);

  // Section 3: Rental Period
  const getDefaultDates = () => {
    const now = new Date();
    now.setSeconds(0);
    now.setMilliseconds(0);

    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);

    const formatLocal = (d) => {
      const tzOffset = d.getTimezoneOffset() * 60000;
      return new Date(d - tzOffset).toISOString().slice(0, 16);
    };
    return { pickup: formatLocal(now), drop: formatLocal(tomorrow) };
  };

  const dates = getDefaultDates();
  const [pickupDate, setPickupDate] = useState(dates.pickup);
  const [expectedDropDate, setExpectedDropDate] = useState(dates.drop);

  const vehicleCat = (v.category || v.type || '').toLowerCase();
  const isScooty = vehicleCat === 'scooty';
  const isCar = vehicleCat === 'car';
  const isBike = vehicleCat === 'bike' || vehicleCat === 'ev';

  // Vehicle-level minimum booking hours (set in Vehicle Management → Settings tab)
  // 0 means no minimum enforced
  const minBookingHours = v.bookingConfig?.minBookingHours || 0;

  // Bike Hourly: user-entered hours (starts at minBookingHours or 1)
  const [bikeHourlyDuration, setBikeHourlyDuration] = useState(Math.max(1, minBookingHours));

  // Section 4: Select Plan
  const [selectedPlanType, setSelectedPlanType] = useState('24-Hour');
  const [planRate, setPlanRate] = useState(0);
  const [planKmLimit, setPlanKmLimit] = useState(0);
  const [planExtraKm, setPlanExtraKm] = useState(0);
  const [planExtraHour, setPlanExtraHour] = useState(0);
  const [planFuelChargePerKm, setPlanFuelChargePerKm] = useState(2);

  const addHoursToDateString = (dateStr, hours) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    d.setHours(d.getHours() + hours);
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d - tzOffset).toISOString().slice(0, 16);
  };

  const getHoursDifference = (startStr, endStr) => {
    if (!startStr || !endStr) return 0;
    const start = new Date(startStr);
    const end = new Date(endStr);
    const diffMs = end.getTime() - start.getTime();
    if (isNaN(diffMs) || diffMs <= 0) return 0;
    return Math.ceil(diffMs / (1000 * 60 * 60));
  };

  const getPlanDuration = (planType, fuel) => {
    if (planType === 'Hourly') {
      if (isBike) return Math.max(1, minBookingHours); // Bike: use vehicle minimum (default 1)
      if (fuel) return Math.max(1, minBookingHours);    // Scooty with fuel: use vehicle minimum
      return Math.max(1, minBookingHours);               // Scooty without fuel: use vehicle minimum
    }
    if (planType === '12-Hour') {
      return 12;
    }
    if (planType === '24-Hour') {
      return 24;
    }
    return 24; // Default
  };

  const handlePlanChange = (planType) => {
    if (isCar && planType === 'Hourly') return;
    setSelectedPlanType(planType);
    if (isBike && planType === 'Hourly') {
      // Use user-entered hours for bike hourly
      const newDropDate = addHoursToDateString(pickupDate, bikeHourlyDuration);
      setExpectedDropDate(newDropDate);
    } else {
      const duration = getPlanDuration(planType, includeFuel);
      const newDropDate = addHoursToDateString(pickupDate, duration);
      setExpectedDropDate(newDropDate);
    }
  };

  const handlePickupDateChange = (val) => {
    setPickupDate(val);
    if (isBike && selectedPlanType === 'Hourly') {
      // Re-apply user-entered hours from the new pickup time
      const newDropDate = addHoursToDateString(val, bikeHourlyDuration);
      setExpectedDropDate(newDropDate);
    } else {
      const duration = getPlanDuration(selectedPlanType, includeFuel);
      const newDropDate = addHoursToDateString(val, duration);
      setExpectedDropDate(newDropDate);
    }
  };

  const handleDropDateChange = (val) => {
    setExpectedDropDate(val);
    const diffHours = getHoursDifference(pickupDate, val);
    if (diffHours <= 0) return;

    let targetPlan = '24-Hour';
    if (isCar) {
      if (diffHours <= 12) {
        targetPlan = '12-Hour';
      } else {
        targetPlan = '24-Hour';
      }
    } else if (isBike) {
      // Bike: no minimum, auto-detect plan from hours
      if (diffHours <= 12) {
        targetPlan = 'Hourly';
      } else if (diffHours <= 24) {
        targetPlan = '12-Hour';
      } else {
        targetPlan = '24-Hour';
      }
    } else if (isScooty && includeFuel) {
      targetPlan = 'Hourly';
    } else {
      // Scooty without fuel
      if (diffHours <= 5) {
        targetPlan = 'Hourly';
      } else if (diffHours <= 12) {
        targetPlan = '12-Hour';
      } else {
        targetPlan = '24-Hour';
      }
    }
    setSelectedPlanType(targetPlan);
  };

  // Handler for bike hourly duration input
  const handleBikeHourlyDurationChange = (val) => {
    // Enforce vehicle-level minimum booking hours
    const hrs = Math.max(minBookingHours > 0 ? minBookingHours : 1, Number(val) || 1);
    setBikeHourlyDuration(hrs);
    const newDropDate = addHoursToDateString(pickupDate, hrs);
    setExpectedDropDate(newDropDate);
  };

  const handleIncludeFuelChange = (checked) => {
    // Only applies to Scooty
    if (!isScooty) return;
    setIncludeFuel(checked);
    if (checked) {
      // Force Hourly plan and ALWAYS set drop to pickup + 1 hour
      // (minBookingHours is ignored when fuel is included — billing is per actual hour)
      setSelectedPlanType('Hourly');
      const newDropDate = addHoursToDateString(pickupDate, 1);
      setExpectedDropDate(newDropDate);
    } else {
      // Scooty without fuel: restore vehicle-configured minimum hours
      if (selectedPlanType === 'Hourly') {
        const newDropDate = addHoursToDateString(pickupDate, Math.max(1, minBookingHours));
        setExpectedDropDate(newDropDate);
      }
    }
  };

  // Reset includeFuel if vehicle category is not Scooty
  useEffect(() => {
    if (!isScooty) {
      setIncludeFuel(false);
    }
  }, [vehicle, isScooty]);

  // Sync plan parameters when plan type or vehicle changes
  useEffect(() => {
    const plans = v.pricingPlans || {};
    if (isBike) {
      if (selectedPlanType === 'Hourly') {
        const rateField = plans.hourly?.rate || v.perHourRate || 100;
        setPlanRate(rateField);
        setPlanExtraKm(plans.hourly?.extraKmCharge || 8);
        setPlanExtraHour(rateField);
      } else if (selectedPlanType === '12-Hour') {
        const p = plans.twelveHour || {};
        setPlanRate(p.baseRate || 1200);
        setPlanExtraKm(p.extraKmCharge || 8);
        setPlanExtraHour(p.extraHourCharge || plans.hourly?.rate || 100);
      } else if (selectedPlanType === '24-Hour') {
        const p = plans.twentyFourHour || {};
        setPlanRate(p.baseRate || v.perDayRate || 2400);
        setPlanExtraKm(p.extraKmCharge || 8);
        setPlanExtraHour(p.extraHourCharge || plans.hourly?.rate || 100);
      }
    } else if (isCar) {
      if (selectedPlanType === '12-Hour') {
        const p = plans.twelveHour || {};
        setPlanRate(p.baseRate || 2500);
        setPlanExtraKm(p.extraKmCharge || 12);
        setPlanExtraHour(p.extraHourCharge || 200);
      } else if (selectedPlanType === '24-Hour') {
        const p = plans.twentyFourHour || {};
        setPlanRate(p.baseRate || v.perDayRate || 4500);
        setPlanExtraKm(p.extraKmCharge || 12);
        setPlanExtraHour(p.extraHourCharge || 200);
      }
    } else {
      // Scooty
      if (selectedPlanType === 'Hourly') {
        const isScootyFuel = isScooty && includeFuel;
        const rateField = isScootyFuel
          ? (plans.hourly?.withFuel || v.perHourRate || 60)
          : (plans.hourly?.rate || v.perHourRate || 40);

        setPlanRate(rateField);
        setPlanExtraKm(plans.hourly?.extraKmCharge || 5);
        setPlanExtraHour(rateField);
        // Save fuelChargePerKm so drop-off can use the correct per-km rate for this vehicle
        setPlanFuelChargePerKm(plans.hourly?.fuelChargePerKm ?? 2);
      } else if (selectedPlanType === '12-Hour') {
        const p = plans.twelveHour || {};
        setPlanRate(p.baseRate || 350);
        setPlanExtraKm(p.extraKmCharge || 5);
        setPlanExtraHour(p.extraHourCharge || 40);
      } else if (selectedPlanType === '24-Hour') {
        const p = plans.twentyFourHour || {};
        setPlanRate(p.baseRate || v.perDayRate || 500);
        setPlanExtraKm(p.extraKmCharge || 5);
        setPlanExtraHour(p.extraHourCharge || 30);
      }
    }
  }, [selectedPlanType, v, includeFuel, isScooty, isBike, isCar]);

  // Section 5: Add-ons
  const [helmetsCount, setHelmetsCount] = useState(0);
  const helmetsPrice = 50;

  const getDefaultDeposit = () => {
    const isB = vehicleCat === 'bike';
    const isC = vehicleCat === 'car';
    if (isC) return v.depositSettings?.amount ?? v.securityDeposit ?? 5000;
    if (isB) return v.depositSettings?.amount ?? v.securityDeposit ?? 3000;
    return v.depositSettings?.amount ?? v.securityDeposit ?? 1000;
  };

  const [securityDeposit, setSecurityDeposit] = useState(getDefaultDeposit());

  useEffect(() => {
    setSecurityDeposit(getDefaultDeposit());
  }, [vehicle]);

  // Deposit Payment mode details (Cash, Online, Mixed)
  const [depositMethod, setDepositMethod] = useState('Cash'); // 'Cash' | 'Online' | 'Mixed'
  const [depositCash, setDepositCash] = useState(vehicle.depositSettings?.amount ?? vehicle.securityDeposit ?? 200);
  const [depositOnline, setDepositOnline] = useState(0);
  const [depositVikas, setDepositVikas] = useState(0);

  // Sync deposit mode values when securityDeposit or depositMethod changes
  useEffect(() => {
    if (depositMethod === 'Cash') {
      setDepositCash(securityDeposit);
      setDepositOnline(0);
      setDepositVikas(0);
    } else if (depositMethod === 'Online') {
      setDepositCash(0);
      setDepositOnline(securityDeposit);
      setDepositVikas(0);
    } else if (depositMethod === 'Vikas') {
      setDepositCash(0);
      setDepositOnline(0);
      setDepositVikas(securityDeposit);
    } else if (depositMethod === 'Mixed') {
      // For Mixed mode, ensure Cash + Online equals total deposit
      if (depositCash + depositOnline !== securityDeposit) {
        setDepositCash(securityDeposit);
        setDepositOnline(0);
      }
    }
  }, [securityDeposit, depositMethod]);

  const handleDepositCashChange = (val) => {
    const cash = Math.min(securityDeposit, Math.max(0, val));
    setDepositCash(cash);
    setDepositOnline(securityDeposit - cash);
  };

  const handleDepositOnlineChange = (val) => {
    const online = Math.min(securityDeposit, Math.max(0, val));
    setDepositOnline(online);
    setDepositCash(securityDeposit - online);
  };

  // Section 6: Payment Collection
  const [paymentMethod, setPaymentMethod] = useState('Cash'); // 'Cash' | 'UPI' | 'Vikas' | 'Mixed'
  const [cashReceived, setCashReceived] = useState(0);
  const [vikasReceived, setVikasReceived] = useState(0);
  const [upiTxnId, setUpiTxnId] = useState('');
  const [upiAmount, setUpiAmount] = useState(0);
  const [mixedCash, setMixedCash] = useState(0);
  const [mixedOnline, setMixedOnline] = useState(0);

  // Discount settings
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountType, setDiscountType] = useState('₹'); // '₹' | '%'

  // Payment section collapsible
  const [showPaymentSection, setShowPaymentSection] = useState(false);

  // Section 7: Billing Summary Collapsible accordion
  const [showBillingSummary, setShowBillingSummary] = useState(false);

  // Section 8: Customer Documents Upload & Camera
  const [showDocuments, setShowDocuments] = useState(false);
  const [docAadhaarFront, setDocAadhaarFront] = useState('');
  const [docAadhaarBack, setDocAadhaarBack] = useState('');
  const [docLicense, setDocLicense] = useState('');
  const [docRegistration, setDocRegistration] = useState('');

  // Camera settings
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [activeDocType, setActiveDocType] = useState(''); // 'aadhaarFront' | 'aadhaarBack' | 'dl' | 'registration'
  const videoRef = useRef(null);

  // Section 9: Notes
  const [bookingNotes, setBookingNotes] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');

  // ----------------------------------------------------
  // WEBCAM LOGIC FOR DOCS
  // ----------------------------------------------------
  useEffect(() => {
    if (cameraActive && cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [cameraActive, cameraStream]);

  const startCamera = async (docType) => {
    setActiveDocType(docType);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setCameraStream(stream);
      setCameraActive(true);
    } catch (err) {
      console.warn("Camera hardware access denied. Running simulation.", err);
      setCameraActive(true);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setCameraActive(false);
  };

  const captureDocSnapshot = () => {
    if (cameraStream && videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

      let width = canvas.width;
      let height = canvas.height;
      if (width > 1200) { height = Math.round((height * 1200) / width); width = 1200; }
      if (height > 1200) { width = Math.round((width * 1200) / height); height = 1200; }

      const compCanvas = document.createElement('canvas');
      compCanvas.width = width;
      compCanvas.height = height;
      const compCtx = compCanvas.getContext('2d');
      compCtx.drawImage(canvas, 0, 0, width, height);

      const base64Str = compCanvas.toDataURL('image/jpeg', 0.7);
      saveDocImage(base64Str);
      stopCamera();
    } else {
      // Simulate doc scan
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 400;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, 640, 400);
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 4;
      ctx.strokeRect(20, 20, 600, 360);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText(`${(activeDocType || 'Doc').toUpperCase()} DOCUMENT MOCK SCAN`, 50, 80);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px sans-serif';
      ctx.fillText(`Customer Name: ${fullName || 'Guest'}`, 50, 130);
      ctx.fillText(`Timestamp: ${new Date().toLocaleString()}`, 50, 160);

      ctx.fillStyle = '#334155';
      ctx.fillRect(400, 200, 180, 120);
      ctx.strokeStyle = '#64748b';
      ctx.strokeRect(400, 200, 180, 120);
      ctx.fillStyle = '#f8fafc';
      ctx.fillText("PHOTO ID", 450, 260);

      const base64Str = canvas.toDataURL('image/jpeg', 0.7);
      saveDocImage(base64Str);
      setCameraActive(false);
    }
  };

  const saveDocImage = (base64Str) => {
    if (activeDocType === 'aadhaarFront') setDocAadhaarFront(base64Str);
    if (activeDocType === 'aadhaarBack') setDocAadhaarBack(base64Str);
    if (activeDocType === 'dl') setDocLicense(base64Str);
    if (activeDocType === 'registration') setDocRegistration(base64Str);
  };

  const clearDocImage = (docType) => {
    if (docType === 'aadhaarFront') setDocAadhaarFront('');
    if (docType === 'aadhaarBack') setDocAadhaarBack('');
    if (docType === 'dl') setDocLicense('');
    if (docType === 'registration') setDocRegistration('');
  };

  const handleDocFileChange = (e, docType) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('File size exceeds 5MB limit. Please upload a smaller image.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          if (width > 1200) { height = Math.round((height * 1200) / width); width = 1200; }
          if (height > 1200) { width = Math.round((width * 1200) / height); height = 1200; }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);

          if (docType === 'aadhaarFront') setDocAadhaarFront(compressedBase64);
          if (docType === 'aadhaarBack') setDocAadhaarBack(compressedBase64);
          if (docType === 'dl') setDocLicense(compressedBase64);
          if (docType === 'registration') setDocRegistration(compressedBase64);
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    }
  };

  // ----------------------------------------------------
  // COMPUTATIONAL ENGINE WITH DETAILED BUSINESS LOGIC
  // ----------------------------------------------------
  const calculateBilling = () => {
    let hours = 0;
    let days = 0;
    let durationText = '';
    let isMinBilling = false;
    let kmLimit = 0;

    if (!pickupDate || !expectedDropDate) {
      return { durationText: '0 Hour(s)', cost: 0, deposit: 0, helmets: 0, grossTotal: 0, moneyReceived: 0, outstanding: 0, discountVal: 0, isMinBilling: false, kmLimit: 0, actualHours: 0, effectiveHours: 0 };
    }

    const start = new Date(pickupDate);
    const end = new Date(expectedDropDate);
    const diffMs = end.getTime() - start.getTime();

    if (isNaN(diffMs) || diffMs <= 0) {
      return { durationText: '0 Hour(s)', cost: 0, deposit: 0, helmets: 0, grossTotal: 0, moneyReceived: 0, outstanding: 0, discountVal: 0, isMinBilling: false, kmLimit: 0, actualHours: 0, effectiveHours: 0 };
    }

    // Actual hours from date diff
    hours = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60)));

    // Effective hours = max(actual, minimum) when Hourly plan and minimum is configured
    // Exception: Scooty WITH fuel → no minimum (fuel-included is always per-actual-hour)
    let effectiveHours = hours;
    const skipMinimum = isScooty && includeFuel;
    if (selectedPlanType === 'Hourly' && minBookingHours > 0 && hours < minBookingHours && !skipMinimum) {
      effectiveHours = minBookingHours;
      isMinBilling = true;
    }

    // Duration text — shows effective (charged) hours, with note when minimum applies
    days = Math.ceil(effectiveHours / 24);
    if (isMinBilling) {
      durationText = `${effectiveHours} Hour(s) (Min ${minBookingHours}h Charged)`;
    } else {
      durationText = effectiveHours >= 24 ? `${days} Day(s) (${effectiveHours} hr)` : `${effectiveHours} Hour(s)`;
    }

    // Cost is always based on effectiveHours for Hourly plan
    let cost = 0;
    if (selectedPlanType === 'Hourly') {
      cost = effectiveHours * planRate;
    } else if (selectedPlanType === '12-Hour') {
      // Count number of 12-hour slots; extra hours after last full slot billed at planExtraHour
      const fullSlots = Math.floor(hours / 12);
      const remainingHours = hours % 12;
      cost = fullSlots * planRate;
      if (remainingHours > 0) {
        // Grace period: if vehicle config has grace, apply it
        const graceMins = vehicle.pricingPlans?.twelveHour?.gracePeriod || 0;
        const graceHours = graceMins / 60;
        if (remainingHours > graceHours) {
          cost += remainingHours * planExtraHour;
        }
      }
      // Minimum 1 slot
      if (cost === 0) cost = planRate;
    } else if (selectedPlanType === '24-Hour') {
      // Count number of 24-hour day slots; extra hours after last full day billed at planExtraHour
      const fullDays = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      cost = fullDays * planRate;
      if (remainingHours > 0) {
        // Grace period: if vehicle config has grace, apply it
        const graceMins = vehicle.pricingPlans?.twentyFourHour?.gracePeriod || 0;
        const graceHours = graceMins / 60;
        if (remainingHours > graceHours) {
          cost += remainingHours * planExtraHour;
        }
      }
      // Minimum 1 day
      if (cost === 0) cost = planRate;
    }

    // KM Limit — uses effectiveHours so it matches what is charged
    if (isBike || isCar) {
      kmLimit = effectiveHours * 10;
    } else if (isScooty) {
      if (includeFuel) {
        kmLimit = 0; // Fuel-included: no free KM (fuel surcharge applies per KM)
      } else {
        if (selectedPlanType === 'Hourly') {
          kmLimit = effectiveHours * 10;
        } else if (selectedPlanType === '12-Hour') {
          kmLimit = 120;
        } else if (selectedPlanType === '24-Hour') {
          kmLimit = 240;
        }
      }
    } else {
      kmLimit = effectiveHours * 10;
    }

    // Rule: Helmet 1 unit free, extra units ₹50/each
    const helmets = helmetsCount > 1 ? (helmetsCount - 1) * helmetsPrice : 0;
    const deposit = Number(securityDeposit) || 0;

    // Rule: Discount applies strictly to the rental cost (before addons or deposit)
    let discVal = 0;
    if (discountType === '₹') {
      discVal = Number(discountAmount) || 0;
    } else {
      discVal = (cost * (Number(discountAmount) || 0)) / 100;
    }

    // Ensure discount doesn't exceed cost itself
    discVal = Math.min(cost, discVal);
    const costAfterDiscount = cost - discVal;

    const grossTotal = customRound(costAfterDiscount + helmets + deposit);

    // Payments received calculation
    let moneyReceived = 0;
    if (paymentMethod === 'Cash') {
      moneyReceived = Number(cashReceived) || 0;
    } else if (paymentMethod === 'UPI') {
      moneyReceived = Number(upiAmount) || 0;
    } else if (paymentMethod === 'Vikas') {
      moneyReceived = Number(vikasReceived) || 0;
    } else if (paymentMethod === 'Mixed') {
      moneyReceived = (Number(mixedCash) || 0) + (Number(mixedOnline) || 0);
    }

    const outstanding = Math.max(0, customRound(grossTotal - moneyReceived));

    return {
      durationText,
      cost: customRound(cost),
      deposit: customRound(deposit),
      helmets: customRound(helmets),
      grossTotal,
      moneyReceived: customRound(moneyReceived),
      outstanding,
      discountVal: customRound(discVal),
      isMinBilling,
      kmLimit
    };
  };

  const bill = calculateBilling();
  const rentalCostTotal = customRound(Math.max(0, bill.cost - bill.discountVal) + bill.helmets);
  const depositCollected = customRound(Number(depositCash) + Number(depositOnline));
  const totalBookingValue = customRound(rentalCostTotal + bill.deposit);
  const totalCollected = customRound(bill.moneyReceived + depositCollected);
  const pendingCollection = Math.max(0, customRound(totalBookingValue - totalCollected));

  // ----------------------------------------------------
  // SUBMIT HANDLER
  // ----------------------------------------------------
  const handleCheckoutSubmit = (e) => {
    e.preventDefault();

    if (!fullName.trim()) return alert("Full Name is required.");
    if (!phoneNumber.trim() || phoneNumber.length < 10) return alert("Please enter a valid 10-digit phone number.");

    const start = new Date(pickupDate);
    const end = new Date(expectedDropDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return alert("Please enter valid pickup and expected return dates.");
    }
    if (end <= start) {
      return alert("Expected Return Date & Time must be after pickup Date & Time.");
    }

    const durationHours = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60)));
    // Enforce vehicle-configured minimum booking duration
    // Exception: Scooty with fuel included is always per-actual-hour (min 1h), skip minimum check
    const skipMinCheck = isScooty && includeFuel;
    if (!skipMinCheck && minBookingHours > 0 && durationHours < minBookingHours) {
      return alert(`Minimum booking duration for this vehicle is ${minBookingHours} hour(s).`);
    }

    // Validate mixed deposit mixed matches
    if (depositMethod === 'Mixed') {
      const sum = Number(depositCash) + Number(depositOnline);
      if (sum !== Number(securityDeposit)) {
        return alert(`Mixed Deposit Error: Cash (₹${depositCash}) + Online (₹${depositOnline}) must equal required Security Deposit (₹${securityDeposit}).`);
      }
    }

    const rentalCostTotal = Math.max(0, bill.cost - bill.discountVal) + bill.helmets;
    const outstandingRentalCost = Math.max(0, rentalCostTotal - bill.moneyReceived);
    const depositCollected = Number(depositCash) + Number(depositOnline) + Number(depositVikas);

    const isFuture = new Date(pickupDate) > new Date();
    const initialStatus = isFuture ? 'Reserved' : 'Ongoing';

    const finalPayload = {
      customer: {
        name: fullName,
        fatherName,
        phone: phoneNumber,
        alternatePhone: altPhoneNumber,
        email,
        drivingLicense: docLicense ? 'Scan Attached' : '',
        aadhaar: docAadhaarFront ? 'Scan Attached' : '',
        docAadhaarFront: docAadhaarFront || '',
        docAadhaarBack: docAadhaarBack || '',
        docLicense: docLicense || '',
        docRegistration: docRegistration || '',
        address: { street: streetAddress, city, state, pincode }
      },
      baseFare: bill.cost,
      discount: bill.discountVal,
      advancePaid: bill.moneyReceived,
      securityDeposit: depositCollected,
      vehicleId: vehicle.vehicleId,
      rentalPeriod: {
        startDate: new Date(pickupDate),
        expectedEndDate: new Date(expectedDropDate),
        ...(initialStatus === 'Ongoing' && { actualPickupDate: new Date(pickupDate) })
      },
      ...(initialStatus === 'Ongoing' && { actualPickupDate: new Date(pickupDate) }),
      handover: {
        startMeter: Number(startMeter),
        fuelIncluded: includeFuel
      },
      selectedPlan: {
        planType: selectedPlanType,
        rate: planRate,
        kmLimit: bill.kmLimit,
        extraKmCharge: planExtraKm,
        extraHourCharge: planExtraHour,
        ...(isScooty && includeFuel ? { fuelChargePerKm: planFuelChargePerKm } : {})
      },
      addons: {
        helmetsCount: Number(helmetsCount),
        helmetsPrice: helmetsPrice,
        otherAccessories: bookingNotes
      },
      paymentCollection: [
        {
          mode: paymentMethod,
          amount: bill.moneyReceived,
          cashAmount: paymentMethod === 'Mixed' ? Number(mixedCash) : (paymentMethod === 'Cash' ? bill.moneyReceived : 0),
          onlineAmount: paymentMethod === 'Mixed' ? Number(mixedOnline) : (['UPI', 'Online', 'Bank Transfer'].includes(paymentMethod) ? bill.moneyReceived : 0),
          vikasAmount: paymentMethod === 'Vikas' ? bill.moneyReceived : 0,
          transactionId: paymentMethod === 'UPI' ? upiTxnId : '',
          reference: paymentMethod === 'Mixed' ? `Cash: ${mixedCash}, Online: ${mixedOnline}` : 'Advance Checkout',
          timestamp: new Date().toISOString()
        }
      ],
      accessoriesChecklist: {
        helmetCount: Number(helmetsCount),
        toolkit: true,
        spareTyre: false,
        firstAid: true
      },
      settlement: {
        totalBill: 0,
        actualBill: 0,
        previousPaid: bill.moneyReceived,
        depositCollected: depositCollected,
        depositRefund: 0,
        depositRefundMode: '',
        depositRefundReason: '',
        remainingToPay: outstandingRentalCost
      },
      // Save details about security deposit split
      depositDetails: {
        mode: depositMethod,
        cashAmount: Number(depositCash),
        onlineAmount: Number(depositOnline),
        vikasAmount: Number(depositVikas)
      },
      status: initialStatus,
      workerId: currentWorker || 'System',
      revisions: [{
        revisionNumber: 1,
        actionType: 'Create',
        description: initialStatus === 'Ongoing'
          ? `Booking created and handover completed immediately for ${fullName}. Vehicle: ${vehicle?.name} (${vehicle?.regNumber}).`
          : `Booking created and reserved for ${fullName}. Vehicle: ${vehicle?.name} (${vehicle?.regNumber}).`,
        operator: currentWorker || 'System',
        timestamp: new Date().toISOString(),
        reason: initialStatus === 'Ongoing' ? 'Immediate Handover' : 'Initial Reservation',
        oldValues: {
          rentalCost: 0,
          deposit: 0,
          bookingValue: 0,
          rentalPaid: 0,
          depositCollected: 0,
          outstandingRent: 0,
          pendingDeposit: 0
        },
        newValues: {
          rentalCost: rentalCostTotal,
          deposit: depositCollected,
          bookingValue: rentalCostTotal + depositCollected,
          rentalPaid: bill.moneyReceived,
          depositCollected: depositCollected,
          outstandingRent: outstandingRentalCost,
          pendingDeposit: 0
        },
        difference: {
          rentalCost: rentalCostTotal,
          deposit: depositCollected,
          bookingValue: rentalCostTotal + depositCollected,
          rentalPaid: bill.moneyReceived,
          depositCollected: depositCollected
        },
        financialSnapshotAfterChange: {
          rentalCost: rentalCostTotal,
          depositHeld: depositCollected,
          bookingValue: rentalCostTotal + depositCollected,
          rentalPaid: bill.moneyReceived,
          depositCollected: depositCollected,
          outstandingRent: outstandingRentalCost,
          pendingDeposit: 0,
          paymentBreakdown: {
            rentalCash: paymentMethod === 'Cash' ? bill.moneyReceived : paymentMethod === 'Mixed' ? Number(mixedCash || 0) : 0,
            rentalOnline: ['UPI', 'Online', 'Bank Transfer'].includes(paymentMethod) ? bill.moneyReceived : paymentMethod === 'Mixed' ? Number(mixedOnline || 0) : 0,
            rentalVikas: paymentMethod === 'Vikas' ? bill.moneyReceived : 0,
            depositCash: depositMethod === 'Cash' ? depositCollected : depositMethod === 'Mixed' ? Number(depositCash || 0) : 0,
            depositOnline: ['Online', 'UPI'].includes(depositMethod) ? depositCollected : depositMethod === 'Mixed' ? Number(depositOnline || 0) : 0,
            depositVikas: depositMethod === 'Vikas' ? depositCollected : 0
          }
        },
        vehicleDetails: {
          newVehicleId: vehicle.vehicleId,
          newVehicleName: vehicle?.name,
          newVehicleReg: vehicle?.regNumber,
          newPricing: rentalCostTotal,
          newDeposit: depositCollected
        },
        depositDetails: {
          mode: depositMethod,
          difference: depositCollected
        }
      }],

      // Legacy compatibility mappings
      customerName: fullName,
      customerPhone: phoneNumber,
      customerIdProof: docAadhaarFront ? 'Aadhaar Scan Attached' : 'Details Provided',
      pickupDate: new Date(pickupDate).toISOString(),
      expectedDropDate: new Date(expectedDropDate).toISOString(),
      zoneId: vehicle?.zoneId,
      perDayRate: selectedPlanType.includes('24') ? planRate : 0,
      perHourRate: selectedPlanType.includes('Hour') ? planRate : 0,
      durationHours: durationHours,
      durationDays: Math.ceil(durationHours / 24),
      finalAmount: outstandingRentalCost,
      paymentMethod,
      settled: outstandingRentalCost === 0
    };

    onConfirmBooking(finalPayload);
  };

  return (
    <div className="booking-form-wrap animate-slide-up">

      {/* COMPACT HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Bike size={22} color="#6366f1" />
          <div>
            <h3 style={{ fontSize: '0.98rem', margin: 0, color: '#1e293b', fontWeight: 700 }}>{vehicle.name}</h3>
            <span style={{ fontSize: '0.72rem', color: '#64748b' }}><code>{vehicle.regNumber}</code></span>
          </div>
        </div>
        <button className="fo-btn-outline" onClick={onCancel} style={{ borderRadius: '50%', width: '28px', height: '28px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={14} /></button>
      </div>

      <form onSubmit={handleCheckoutSubmit}>

        {/* SECTION 1: CUSTOMER INFORMATION */}
        <div className="bform-section-box">
          <h4 className="bform-section-title"><User size={13} /> Customer Information</h4>
          <div className="grid-2col" style={{ gap: '8px', marginBottom: '8px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Full Name *</label>
              <input type="text" className="form-control" placeholder="Full Name" value={fullName} onChange={e => setFullName(e.target.value)} required />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Father's Name (Optional)</label>
              <input type="text" className="form-control" placeholder="Father's Name" value={fatherName} onChange={e => setFatherName(e.target.value)} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Phone Number *</label>
              <input type="tel" className="form-control" placeholder="Phone Number (10 digits)" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value.replace(/[^0-9]/g, ''))} required />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Alternate Number (Optional)</label>
              <input type="tel" className="form-control" placeholder="Alternate Number" value={altPhoneNumber} onChange={e => setAltPhoneNumber(e.target.value.replace(/[^0-9]/g, ''))} />
            </div>
          </div>

          <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '7px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ width: '100%', padding: '5px 10px', fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              onClick={() => setShowOptionalDetails(!showOptionalDetails)}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><MapPin size={12} /> Optional Details (Email & Address)</span>
              {showOptionalDetails ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
            {showOptionalDetails && (
              <div className="animate-fade" style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Email Address</label>
                  <input type="email" className="form-control" placeholder="name@domain.com" value={email} onChange={e => setEmail(e.target.value)} />
                </div>
                <div className="grid-2col" style={{ gap: '8px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Street Address</label>
                    <input type="text" className="form-control" placeholder="Street Address" value={streetAddress} onChange={e => setStreetAddress(e.target.value)} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>City</label>
                    <input type="text" className="form-control" value={city} onChange={e => setCity(e.target.value)} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>State</label>
                    <input type="text" className="form-control" value={state} onChange={e => setState(e.target.value)} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Pincode</label>
                    <input type="text" className="form-control" value={pincode} onChange={e => setPincode(e.target.value)} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* SECTION 2: VEHICLE HANDOVER (compact inline) */}
        <div className="bform-section-box">
          <div style={{ display: 'grid', gridTemplateColumns: isScooty ? '1fr 1fr' : '1fr', gap: '10px', alignItems: 'end' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label><Key size={11} style={{ marginRight: 3 }} />Start Meter Reading (KM) *</label>
              <input
                type="text" inputMode="numeric"
                className="form-control"
                value={startMeter === '' ? '' : startMeter}
                onChange={e => setStartMeter(e.target.value === '' ? '' : (e.target.value === '' ? '' : Number(e.target.value.replace(/[^0-9.-]/g, ''))))}
                required
              />
            </div>
            {isScooty && (
              <label style={{ display: 'flex', alignItems: 'center', gap: '7px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, color: '#1e293b', paddingBottom: '6px' }}>
                <input
                  type="checkbox"
                  checked={includeFuel}
                  onChange={e => handleIncludeFuelChange(e.target.checked)}
                  style={{ width: '15px', height: '15px', accentColor: '#6366f1' }}
                />
                Include Fuel in Rental
                <span style={{ fontSize: '0.65rem', color: '#6366f1', fontWeight: 'normal' }}>Locks to Hourly+Surcharge</span>
              </label>
            )}
          </div>
        </div>

        {/* SECTION 3: RENTAL PERIOD */}
        <div className="bform-section-box">
          <h4 className="bform-section-title"><Calendar size={13} /> Rental Period</h4>
          <div className="grid-2col" style={{ gap: '8px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Start Date & Time</label>
              <input type="datetime-local" className="form-control" value={pickupDate} onChange={e => handlePickupDateChange(e.target.value)} required />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>End Date & Time</label>
              <input type="datetime-local" className="form-control" value={expectedDropDate} onChange={e => handleDropDateChange(e.target.value)} required />
            </div>
          </div>

          {isBike && selectedPlanType === 'Hourly' && (
            <div style={{ marginTop: '8px', padding: '7px 10px', background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '7px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <label style={{ fontSize: '0.78rem', color: '#6d28d9', fontWeight: 600, margin: 0, whiteSpace: 'nowrap' }}>⏱ Duration (hrs)</label>
              <input
                type="text" inputMode="numeric"
                min="1"
                className="form-control"
                style={{ width: '75px', marginBottom: 0, textAlign: 'center', fontWeight: 'bold' }}
                value={bikeHourlyDuration}
                onChange={e => handleBikeHourlyDurationChange(e.target.value)}
              />
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                Return by: <strong style={{ color: '#1e293b' }}>{expectedDropDate ? new Date(expectedDropDate).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true }) : '—'}</strong>
              </span>
            </div>
          )}
        </div>

        {/* SECTION 4: SELECT PLAN */}
        <div className="bform-section-box">
          <h4 className="bform-section-title"><Tag size={13} /> Select Plan</h4>
          {(() => {
            const getCardRate = (type) => {
              if (type === selectedPlanType) return planRate;
              if (type === 'Hourly') return (isScooty && includeFuel) ? (vehicle.pricingPlans?.hourly?.withFuel || vehicle.perHourRate || 60) : isBike ? (vehicle.pricingPlans?.hourly?.rate || vehicle.perHourRate || 100) : (vehicle.pricingPlans?.hourly?.rate || vehicle.perHourRate || 40);
              if (type === '12-Hour') return isCar ? (vehicle.pricingPlans?.twelveHour?.baseRate || 2500) : isBike ? (vehicle.pricingPlans?.twelveHour?.baseRate || 1200) : (vehicle.pricingPlans?.twelveHour?.baseRate || 350);
              if (type === '24-Hour') return isCar ? (vehicle.pricingPlans?.twentyFourHour?.baseRate || 4500) : isBike ? (vehicle.pricingPlans?.twentyFourHour?.baseRate || 2400) : (vehicle.pricingPlans?.twentyFourHour?.baseRate || 500);
              return 0;
            };
            const availablePlans = [
              { type: 'Hourly', label: 'Hourly', rate: getCardRate('Hourly'), limit: (isScooty && includeFuel) ? `₹${vehicle.pricingPlans?.hourly?.fuelChargePerKm || 2}/KM surcharge` : `10 KM/hr Limit`, disabled: isCar },
              { type: '12-Hour', label: '12 Hour', rate: getCardRate('12-Hour'), limit: isCar || isBike ? `10 KM/hr Limit` : `${vehicle.pricingPlans?.twelveHour?.kmLimit || 60} KM Limit`, disabled: isScooty && includeFuel },
              { type: '24-Hour', label: '24 Hour', rate: getCardRate('24-Hour'), limit: isCar || isBike ? `10 KM/hr Limit` : `${vehicle.pricingPlans?.twentyFourHour?.kmLimit || 120} KM Limit`, disabled: isScooty && includeFuel }
            ].filter(plan => !plan.disabled);

            return (
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${availablePlans.length}, 1fr)`, gap: '6px' }}>
                {availablePlans.map(plan => (
                  <label
                    key={plan.type}
                    style={{
                      border: '1.5px solid ' + (selectedPlanType === plan.type ? '#6d28d9' : '#e5e7eb'),
                      background: selectedPlanType === plan.type ? 'rgba(99,102,241,0.08)' : '#f8f9fb',
                      padding: '7px 8px',
                      borderRadius: '7px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '6px',
                      margin: 0
                    }}
                  >
                    <input
                      type="radio"
                      name="pricing_plan_select"
                      checked={selectedPlanType === plan.type}
                      onChange={() => handlePlanChange(plan.type)}
                      style={{ marginTop: '2px', accentColor: '#6366f1', cursor: 'pointer' }}
                    />
                    <div>
                      <strong style={{ display: 'block', fontSize: '0.8rem', color: '#1e293b' }}>{plan.label}</strong>
                      <span style={{ fontSize: '0.72rem', color: '#6d28d9', fontWeight: 'bold' }}>₹{plan.rate}</span>
                      <span style={{ display: 'block', fontSize: '0.62rem', color: '#64748b' }}>{plan.limit}</span>
                    </div>
                  </label>
                ))}
              </div>
            );
          })()}
        </div>

        {/* SECTION 5: ADD-ONS & DEPOSIT */}
        <div className="bform-section-box">
          <h4 className="bform-section-title"><Shield size={13} /> Add-ons &amp; Deposit Details</h4>

          {/* Row 1: Helmet | Security Deposit */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '12px', marginBottom: '10px' }}>

            {/* Helmet */}
            <div>
              <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '5px' }}>Helmet Quantity (1 Free!)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button type="button" className="btn btn-secondary"
                  style={{ width: '30px', height: '30px', padding: 0, borderRadius: '6px', fontSize: '1rem', fontWeight: 700 }}
                  onClick={() => setHelmetsCount(Math.max(0, helmetsCount - 1))}>−</button>
                <strong style={{ fontSize: '1rem', minWidth: '20px', textAlign: 'center', color: '#1e293b' }}>{helmetsCount}</strong>
                <button type="button" className="btn btn-secondary"
                  style={{ width: '30px', height: '30px', padding: 0, borderRadius: '6px', fontSize: '1rem', fontWeight: 700 }}
                  onClick={() => setHelmetsCount(helmetsCount + 1)}>+</button>
              </div>
              <span style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'block', marginTop: '3px' }}>Additional units ₹50/each</span>
            </div>

            {/* Security Deposit */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Security Deposit (₹)</label>
              <input
                type="text" inputMode="numeric"
                className="form-control"
                value={securityDeposit === '' ? '' : securityDeposit}
                onChange={e => setSecurityDeposit(e.target.value === '' ? '' : (e.target.value === '' ? '' : Number(e.target.value.replace(/[^0-9.-]/g, ''))))}
              />
            </div>
          </div>

          {/* Row 2: Deposit Collection Mode */}
          <div style={{ background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: '7px', padding: '8px 10px' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1e293b', display: 'block', marginBottom: '6px' }}>Deposit Collection Mode</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginBottom: '8px' }}>
              {['Cash', 'Online', 'Vikas', 'Mixed'].map(mode => (
                <button key={mode} type="button"
                  style={{
                    padding: '6px 0',
                    fontSize: '0.8rem',
                    borderRadius: '6px',
                    border: depositMethod === mode ? '1.5px solid #6366f1' : '1px solid #e2e8f0',
                    background: depositMethod === mode ? '#6366f1' : '#fff',
                    color: depositMethod === mode ? '#fff' : '#64748b',
                    fontWeight: depositMethod === mode ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                  onClick={() => setDepositMethod(mode)}>{mode}
                </button>
              ))}
            </div>

            {/* Amount input based on mode */}
            {depositMethod === 'Cash' && (
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Cash Amount Received for Deposit (₹)</label>
                <input type="text" inputMode="numeric" className="form-control" value={depositCash} disabled />
              </div>
            )}
            {depositMethod === 'Online' && (
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Online Amount Received for Deposit (₹)</label>
                <input type="text" inputMode="numeric" className="form-control" value={depositOnline} disabled />
              </div>
            )}
            {depositMethod === 'Vikas' && (
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Vikas Amount Received for Deposit (₹)</label>
                <input type="text" inputMode="numeric" className="form-control" value={depositVikas} disabled />
              </div>
            )}
            {depositMethod === 'Mixed' && (
              <div className="grid-2col" style={{ gap: '8px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Cash ₹</label>
                  <input type="text" inputMode="numeric" className="form-control" value={depositCash} onChange={e => {
                    const val = e.target.value === '' ? '' : Number(e.target.value.replace(/[^0-9.-]/g, ''));
                    setDepositCash(val);
                    if (val !== '') setDepositOnline(Math.max(0, securityDeposit - Number(val)));
                  }} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Online ₹</label>
                  <input type="text" inputMode="numeric" className="form-control" value={depositOnline} onChange={e => {
                    const val = e.target.value === '' ? '' : Number(e.target.value.replace(/[^0-9.-]/g, ''));
                    setDepositOnline(val);
                    if (val !== '') setDepositCash(Math.max(0, securityDeposit - Number(val)));
                  }} />
                </div>
              </div>
            )}
          </div>
        </div>




        {/* SECTION 6: PAYMENT COLLECTION (collapsible) */}
        <div className="bform-section-box">
          {/* Collapsible header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => setShowPaymentSection(v => !v)}>
            <h4 className="bform-section-title" style={{ margin: 0 }}><Banknote size={13} /> Payment Collection</h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {!showPaymentSection && (
                <span style={{ fontSize: '0.78rem', color: '#059669', fontWeight: 600 }}>{paymentMethod} · ₹{bill.moneyReceived}</span>
              )}
              <button type="button" style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '2px', color: '#64748b' }}>
                {showPaymentSection ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            </div>
          </div>

          {showPaymentSection && (
            <div className="animate-fade">
              {/* Mode tabs */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '5px', margin: '6px 0' }}>
                {['Cash', 'UPI', 'Vikas', 'Mixed'].map(mode => (
                  <button key={mode} type="button"
                    style={{ padding: '5px 6px', fontSize: '0.73rem', borderRadius: '6px', border: paymentMethod === mode ? '1.5px solid #10b981' : '1px solid #e5e7eb', background: paymentMethod === mode ? 'rgba(16,185,129,0.1)' : '#f8f9fb', color: paymentMethod === mode ? '#059669' : '#64748b', fontWeight: paymentMethod === mode ? 600 : 400, cursor: 'pointer' }}
                    onClick={() => setPaymentMethod(mode)}>
                    {mode === 'UPI' ? 'Online' : mode}
                  </button>
                ))}
              </div>

              {/* Payment fields */}
              {paymentMethod === 'Cash' && (
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Cash Amount Received (₹)</label>
                  <input type="text" inputMode="numeric" className="form-control" value={cashReceived === '' ? '' : cashReceived} onChange={e => setCashReceived(e.target.value === '' ? '' : (e.target.value === '' ? '' : Number(e.target.value.replace(/[^0-9.-]/g, ''))))} />
                </div>
              )}
              {paymentMethod === 'UPI' && (
                <div className="grid-2col" style={{ gap: '6px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}><label>Amount (₹)</label><input type="text" inputMode="numeric" className="form-control" value={upiAmount === '' ? '' : upiAmount} onChange={e => setUpiAmount(e.target.value === '' ? '' : (e.target.value === '' ? '' : Number(e.target.value.replace(/[^0-9.-]/g, ''))))} /></div>
                  <div className="form-group" style={{ marginBottom: 0 }}><label>Online Txn ID</label><input type="text" className="form-control" placeholder="TXN100028" value={upiTxnId} onChange={e => setUpiTxnId(e.target.value)} /></div>
                </div>
              )}
              {paymentMethod === 'Vikas' && (
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Vikas Amount Received (₹)</label>
                  <input type="text" inputMode="numeric" className="form-control" value={vikasReceived === '' ? '' : vikasReceived} onChange={e => setVikasReceived(e.target.value === '' ? '' : (e.target.value === '' ? '' : Number(e.target.value.replace(/[^0-9.-]/g, ''))))} />
                </div>
              )}
              {paymentMethod === 'Mixed' && (
                <div className="grid-2col" style={{ gap: '6px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}><label>Cash (₹)</label><input type="text" inputMode="numeric" className="form-control" value={mixedCash === '' ? '' : mixedCash} onChange={e => {
                    const val = e.target.value === '' ? '' : Number(e.target.value.replace(/[^0-9.-]/g, ''));
                    setMixedCash(val);
                    if (val !== '') {
                      const b = calculateBill();
                      setMixedOnline(Math.max(0, b.grossTotal - Number(val)));
                    }
                  }} /></div>
                  <div className="form-group" style={{ marginBottom: 0 }}><label>Online (₹)</label><input type="text" inputMode="numeric" className="form-control" value={mixedOnline === '' ? '' : mixedOnline} onChange={e => {
                    const val = e.target.value === '' ? '' : Number(e.target.value.replace(/[^0-9.-]/g, ''));
                    setMixedOnline(val);
                    if (val !== '') {
                      const b = calculateBill();
                      setMixedCash(Math.max(0, b.grossTotal - Number(val)));
                    }
                  }} /></div>
                </div>
              )}

              {/* Discount inline */}
              <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px solid #e5e7eb', display: 'flex', gap: '6px', alignItems: 'flex-end' }}>
                <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                  <label>Discount (optional)</label>
                  <input type="text" inputMode="numeric" className="form-control" value={discountAmount === '' ? '' : discountAmount} onChange={e => setDiscountAmount(e.target.value === '' ? 0 : Math.max(0, (e.target.value === '' ? '' : Number(e.target.value.replace(/[^0-9.-]/g, '')))))} placeholder="0" />
                </div>
                <div className="form-group" style={{ marginBottom: 0, width: '80px', flexShrink: 0 }}>
                  <label>Type</label>
                  <select className="form-control" value={discountType} onChange={e => setDiscountType(e.target.value)}>
                    <option value="₹">₹ Flat</option>
                    <option value="%">% Off</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* SECTION 7: BILLING SUMMARY (collapsible) */}
        <div className="bform-section-box">
          <button
            type="button"
            style={{ width: '100%', padding: '2px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'transparent', border: 'none', color: '#1e293b', cursor: 'pointer' }}
            onClick={() => setShowBillingSummary(!showBillingSummary)}
          >
            <h4 className="bform-section-title" style={{ margin: 0 }}><BarChart2 size={13} /> Billing Summary</h4>
            <span style={{ fontSize: '0.88rem', color: '#6d28d9', fontWeight: 700 }}>₹{totalBookingValue} {showBillingSummary ? '▲' : '▼'}</span>
          </button>

          {showBillingSummary && (
            <div className="animate-fade" style={{ marginTop: '10px', background: '#f8f9fb', borderRadius: '7px', padding: '10px', border: '1px solid #e5e7eb', fontSize: '0.78rem' }}>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>

                <div style={{ flex: '1 1 200px' }}>
                  <div style={{ fontWeight: 600, color: '#6d28d9', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e5e7eb', paddingBottom: '3px', marginBottom: '5px' }}>Rental</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', margin: '3px 0' }}><span style={{ color: '#64748b' }}>Duration:</span><strong style={{ color: '#1e293b' }}>{bill.durationText || 'N/A'}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', margin: '3px 0' }}><span style={{ color: '#64748b' }}>Incl. KM:</span><strong>{bill.kmLimit} KM</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', margin: '3px 0' }}><span style={{ color: '#64748b' }}>Base Fare:</span><span>₹{bill.cost}{bill.isMinBilling && <span style={{ fontSize: '0.62rem', color: '#f59e0b', marginLeft: 3 }}>({minBookingHours}h min)</span>}</span></div>
                  {bill.discountVal > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', margin: '3px 0', color: '#10b981' }}><span>Discount:</span><span>-₹{bill.discountVal}</span></div>}
                  <div style={{ display: 'flex', justifyContent: 'space-between', margin: '3px 0' }}><span style={{ color: '#64748b' }}>Helmets:</span><span>₹{bill.helmets}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', margin: '5px 0 0 0', borderTop: '1px solid #e5e7eb', paddingTop: '4px', fontWeight: 700, color: '#1e293b' }}><span>Rental Total:</span><strong>₹{rentalCostTotal}</strong></div>
                </div>

                <div style={{ width: '1px', background: '#e5e7eb', flexShrink: 0 }} />

                <div style={{ flex: '1 1 200px' }}>
                  <div style={{ fontWeight: 600, color: '#6d28d9', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e5e7eb', paddingBottom: '3px', marginBottom: '5px' }}>Collection</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', margin: '3px 0' }}><span style={{ color: '#64748b' }}>Rental Paid:</span><strong style={{ color: '#10b981' }}>₹{bill.moneyReceived}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', margin: '3px 0' }}><span style={{ color: '#64748b' }}>Deposit:</span><strong style={{ color: '#60a5fa' }}>₹{bill.deposit}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', margin: '3px 0' }}><span style={{ color: '#64748b' }}>Total Collected:</span><strong style={{ color: '#10b981' }}>₹{totalCollected}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', margin: '5px 0 0 0', borderTop: '1px solid #e5e7eb', paddingTop: '4px', fontWeight: 700, color: pendingCollection > 0 ? '#f59e0b' : '#10b981' }}><span>Pending:</span><span>₹{pendingCollection}</span></div>
                </div>

              </div>

              {isScooty && includeFuel && (
                <div style={{ marginTop: '7px', display: 'flex', justifyContent: 'space-between', padding: '5px 8px', borderRadius: '5px', background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)', color: '#3b82f6', fontSize: '0.73rem' }}>
                  <span>Per KM Fuel Surcharge (at return):</span>
                  <strong>₹{vehicle.pricingPlans?.hourly?.fuelChargePerKm || 2}/KM</strong>
                </div>
              )}
              {depositCollected < bill.deposit && (
                <div style={{ marginTop: '6px', padding: '5px 8px', borderRadius: '5px', background: 'rgba(239,68,68,0.08)', color: '#ef4444', fontSize: '0.72rem', border: '1px solid rgba(239,68,68,0.15)' }}>
                  <AlertTriangle size={12} style={{ marginRight: 4 }} />Warning: Deposit collected (₹{depositCollected}) is less than required (₹{bill.deposit}).
                </div>
              )}
            </div>
          )}
        </div>

        {/* SECTION 8: DOCUMENTS (collapsible) */}
        <div className="bform-section-box">
          <button
            type="button"
            style={{ width: '100%', padding: '2px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'transparent', border: 'none', color: '#1e293b', cursor: 'pointer' }}
            onClick={() => setShowDocuments(!showDocuments)}
          >
            <h4 className="bform-section-title" style={{ margin: 0 }}><FileText size={13} /> Upload Customer Documents (Optional)</h4>
            {showDocuments ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>

          {showDocuments && (
            <div className="animate-fade" style={{ marginTop: '10px' }}>
              <div className="grid-2col" style={{ gap: '8px' }}>
                {[
                  { id: 'aadhaarFront', label: 'Aadhaar Front', stateVal: docAadhaarFront },
                  { id: 'aadhaarBack', label: 'Aadhaar Back', stateVal: docAadhaarBack },
                  { id: 'dl', label: 'Driving License', stateVal: docLicense },
                  { id: 'registration', label: 'Registration', stateVal: docRegistration }
                ].map(doc => (
                  <div key={doc.id} style={{ border: '1px solid #e5e7eb', padding: '8px', borderRadius: '7px', background: '#f8f9fb' }}>
                    <div style={{ fontSize: '0.73rem', fontWeight: 600, marginBottom: '5px', color: '#1e293b' }}>{doc.label}</div>
                    {doc.stateVal ? (
                      <div style={{ position: 'relative', height: '70px', borderRadius: '4px', overflow: 'hidden', marginBottom: '6px', background: '#000' }}>
                        <img src={doc.stateVal} alt={doc.label} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        <button type="button" style={{ position: 'absolute', top: '2px', right: '2px', background: 'rgba(239,68,68,0.85)', border: 'none', borderRadius: '50%', width: '18px', height: '18px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => clearDocImage(doc.id)}><X size={9} /></button>
                      </div>
                    ) : (
                      <div style={{ height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed #d1d5db', borderRadius: '4px', color: '#94a3b8', fontSize: '0.68rem', marginBottom: '6px' }}>No Scan</div>
                    )}
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button type="button" className="btn btn-secondary" style={{ flex: 1, padding: '3px 5px', fontSize: '0.68rem', height: '24px' }} onClick={() => document.getElementById(`doc-file-${doc.id}`).click()}>Browse File</button>
                      <input id={`doc-file-${doc.id}`} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleDocFileChange(e, doc.id)} />

                      <button type="button" style={{ flex: 1, padding: '3px 5px', fontSize: '0.68rem', height: '24px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: '#059669', borderRadius: '5px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }} onClick={() => document.getElementById(`doc-cam-${doc.id}`).click()}><Camera size={11} /> Take Photo</button>
                      <input id={`doc-cam-${doc.id}`} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={e => handleDocFileChange(e, doc.id)} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* SECTION 9: NOTES (single compact textarea) */}
        <div className="bform-section-box" style={{ marginBottom: '14px' }}>
          <h4 className="bform-section-title"><StickyNote size={13} /> Additional Notes (Optional)</h4>
          <textarea
            className="form-control"
            rows="2"
            placeholder="Any special instructions, damages, or notes..."
            value={bookingNotes}
            onChange={e => setBookingNotes(e.target.value)}
          />
        </div>

        {/* FOOTER BUTTONS */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #e5e7eb', paddingTop: '12px' }}>
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            <X size={13} /> Cancel
          </button>
          <button type="submit" className="fo-btn-primary">
            Create Booking &amp; Handover Vehicle
          </button>
        </div>

      </form>
    </div>
  );
}
