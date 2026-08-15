const fs = require('fs');
const file = 'client/src/components/BookedVehicles.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add state variable
content = content.replace(
  "const [dropOnlineReceived, setDropOnlineReceived] = useState(0);",
  "const [dropOnlineReceived, setDropOnlineReceived] = useState(0);\n  const [dropVikasReceived, setDropVikasReceived] = useState(0);"
);

// 2. Reset Vikas state
content = content.replace(
  /setDropOnlineReceived\(reqVal\);\s*setDropCashReceived\(0\);/g,
  "setDropOnlineReceived(reqVal);\n          setDropVikasReceived(0);\n          setDropCashReceived(0);"
);

content = content.replace(
  /setDropCashReceived\(reqVal\);\s*setDropOnlineReceived\(0\);/g,
  "setDropCashReceived(reqVal);\n            setDropOnlineReceived(0);\n            setDropVikasReceived(0);"
);

content = content.replace(
  /setDropCashReceived\(0\);\s*setDropOnlineReceived\(0\);/g,
  "setDropCashReceived(0);\n        setDropOnlineReceived(0);\n        setDropVikasReceived(0);"
);

// 3. mixed details & sum check
content = content.replace(
  /const sum = Number\(dropCashReceived\) \+ Number\(dropOnlineReceived\);/g,
  "const sum = Number(dropCashReceived) + Number(dropOnlineReceived) + Number(dropVikasReceived);"
);

content = content.replace(
  "mixedDetails = `Cash: ${dropCashReceived}, Online: ${dropOnlineReceived}`;",
  "mixedDetails = `Cash: ${dropCashReceived}, Online: ${dropOnlineReceived}, Vikas: ${dropVikasReceived}`;"
);

content = content.replace(
  /alert\(`Mixed mixed error: Cash Amount \(\₹\$\{dropCashReceived\}\) \+ Online Amount \(\₹\$\{dropOnlineReceived\}\) must equal/g,
  "alert(`Mixed mixed error: Cash Amount (₹${dropCashReceived}) + Online Amount (₹${dropOnlineReceived}) + Vikas Amount (₹${dropVikasReceived}) must equal"
);

// 4. addPayment obj
content = content.replace(
  /onlineAmount:\s*dropPaymentMethod === 'Mixed' \? Number\(dropOnlineReceived\) : \['UPI', 'Online', 'Card'\]\.includes\(dropPaymentMethod\) \? reqVal : 0,/g,
  "onlineAmount: dropPaymentMethod === 'Mixed' ? Number(dropOnlineReceived) : ['UPI', 'Online', 'Card'].includes(dropPaymentMethod) ? reqVal : 0,\n      vikasAmount: dropPaymentMethod === 'Mixed' ? Number(dropVikasReceived) : ['Vikas'].includes(dropPaymentMethod) ? reqVal : 0,"
);

// 5. financialTransaction obj
content = content.replace(
  /onlineSplit:\s*dropPaymentMethod === 'Mixed' \? Number\(dropOnlineReceived\) : \['UPI', 'Online', 'Card'\]\.includes\(dropPaymentMethod\) \? reqVal : 0,/g,
  "onlineSplit: dropPaymentMethod === 'Mixed' ? Number(dropOnlineReceived) : ['UPI', 'Online', 'Card'].includes(dropPaymentMethod) ? reqVal : 0,\n        vikasSplit: dropPaymentMethod === 'Mixed' ? Number(dropVikasReceived) : ['Vikas'].includes(dropPaymentMethod) ? reqVal : 0,"
);

// 6. JSX inputs
content = content.replace(
  /Number\(dropCashReceived\) \+ Number\(dropOnlineReceived\)/g,
  "Number(dropCashReceived) + Number(dropOnlineReceived) + Number(dropVikasReceived)"
);

const dropOnlineInputJSX = `                            <div>
                              <label>Online Amount (₹)</label>
                              <input
                                type="text" inputMode="numeric"
                                className="form-control"
                                value={dropOnlineReceived}
                                onChange={e => setDropOnlineReceived(Number(e.target.value))}
                                required
                              />
                            </div>`;

const dropVikasInputJSX = `                            <div>
                              <label>Vikas Amount (₹)</label>
                              <input
                                type="text" inputMode="numeric"
                                className="form-control"
                                value={dropVikasReceived}
                                onChange={e => setDropVikasReceived(Number(e.target.value))}
                                required
                              />
                            </div>`;

content = content.replace(new RegExp(dropOnlineInputJSX.replace(/[.*+?^${}()|[\\]\\]/g, '\\\\$&'), 'g'), `${dropOnlineInputJSX}\n${dropVikasInputJSX}`);

fs.writeFileSync(file, content);
console.log('Update applied');
