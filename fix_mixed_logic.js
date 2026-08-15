const fs = require('fs');

const fBooking = 'client/src/components/BookingForm.jsx';
let bStr = fs.readFileSync(fBooking, 'utf8');

// For depositCash
bStr = bStr.replace(
  /onChange=\{e => setDepositCash\(e\.target\.value === '' \? '' : Number\(e\.target\.value\.replace\(\/\[\^0-9\.\-\]\/g, ''\)\)\)\}/g,
  "onChange={e => {\n                    const val = e.target.value === '' ? '' : Number(e.target.value.replace(/[^0-9.-]/g, ''));\n                    setDepositCash(val);\n                    if (val !== '') setDepositOnline(Math.max(0, securityDeposit - Number(val)));\n                  }}"
);

// For depositOnline
bStr = bStr.replace(
  /onChange=\{e => setDepositOnline\(e\.target\.value === '' \? '' : Number\(e\.target\.value\.replace\(\/\[\^0-9\.\-\]\/g, ''\)\)\)\}/g,
  "onChange={e => {\n                    const val = e.target.value === '' ? '' : Number(e.target.value.replace(/[^0-9.-]/g, ''));\n                    setDepositOnline(val);\n                    if (val !== '') setDepositCash(Math.max(0, securityDeposit - Number(val)));\n                  }}"
);

// For mixedCash
bStr = bStr.replace(
  /onChange=\{e => setMixedCash\(e\.target\.value === '' \? '' : \(e\.target\.value === '' \? '' : Number\(e\.target\.value\.replace\(\/\[\^0-9\.\-\]\/g, ''\)\)\)\)\}/g,
  "onChange={e => {\n                    const val = e.target.value === '' ? '' : Number(e.target.value.replace(/[^0-9.-]/g, ''));\n                    setMixedCash(val);\n                    if (val !== '') {\n                      const b = calculateBill();\n                      setMixedOnline(Math.max(0, b.grossTotal - Number(val)));\n                    }\n                  }}"
);

// For mixedOnline
bStr = bStr.replace(
  /onChange=\{e => setMixedOnline\(e\.target\.value === '' \? '' : \(e\.target\.value === '' \? '' : Number\(e\.target\.value\.replace\(\/\[\^0-9\.\-\]\/g, ''\)\)\)\)\}/g,
  "onChange={e => {\n                    const val = e.target.value === '' ? '' : Number(e.target.value.replace(/[^0-9.-]/g, ''));\n                    setMixedOnline(val);\n                    if (val !== '') {\n                      const b = calculateBill();\n                      setMixedCash(Math.max(0, b.grossTotal - Number(val)));\n                    }\n                  }}"
);

fs.writeFileSync(fBooking, bStr);
console.log('BookingForm mixed logic updated');

const fBooked = 'client/src/components/BookedVehicles.jsx';
let vStr = fs.readFileSync(fBooked, 'utf8');

// For dropCashReceived
vStr = vStr.replace(
  /onChange=\{e => setDropCashReceived\(Number\(e\.target\.value\)\)\}/g,
  "onChange={e => {\n                                  const val = Number(e.target.value);\n                                  setDropCashReceived(val);\n                                  setDropOnlineReceived(Math.max(0, Number((reqVal - val).toFixed(2))));\n                                }}"
);

// For dropOnlineReceived
vStr = vStr.replace(
  /onChange=\{e => setDropOnlineReceived\(Number\(e\.target\.value\)\)\}/g,
  "onChange={e => {\n                                  const val = Number(e.target.value);\n                                  setDropOnlineReceived(val);\n                                  setDropCashReceived(Math.max(0, Number((reqVal - val).toFixed(2))));\n                                }}"
);

// For editMixedCash in Edit Booking modal (if it exists)
vStr = vStr.replace(
  /onChange=\{e => setEditMixedCash\(Number\(e\.target\.value\)\)\}/g,
  "onChange={e => {\n                              const val = Number(e.target.value);\n                              setEditMixedCash(val);\n                              setEditMixedOnline(Math.max(0, Number((editMoneyReceived - val).toFixed(2))));\n                            }}"
);

vStr = vStr.replace(
  /onChange=\{e => setEditMixedOnline\(Number\(e\.target\.value\)\)\}/g,
  "onChange={e => {\n                              const val = Number(e.target.value);\n                              setEditMixedOnline(val);\n                              setEditMixedCash(Math.max(0, Number((editMoneyReceived - val).toFixed(2))));\n                            }}"
);


fs.writeFileSync(fBooked, vStr);
console.log('BookedVehicles mixed logic updated');
