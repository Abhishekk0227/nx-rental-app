const fs = require('fs');
const filePath = 'client/src/components/DailyHisab.jsx';

if (fs.existsSync(filePath)) {
  let content = fs.readFileSync(filePath, 'utf8');

  // 1. Remove Cd from ui
  content = content.replace(/ \| Cd: \{\(customRound\(depCard \+ rentalCard\)\)\.toLocaleString\('en-IN'\)\}/g, '');
  content = content.replace(/ \| Cd: \{\(customRound\(refundCard\)\)\.toLocaleString\('en-IN'\)\}/g, '');
  content = content.replace(/ \| Cd: \{\(customRound\(additionalCard\)\)\.toLocaleString\('en-IN'\)\}/g, '');
  content = content.replace(/ \| Cd: 0/g, '');
  content = content.replace(/ \| Cd: \{r\.card\}/g, '');
  content = content.replace(/ \| Cd: \{d\.card\}/g, '');
  content = content.replace(/ \| Cd: \{ref\.card\}/g, '');

  // 2. Fix 401 Unauthorized handling
  const fetchBlock = `      const response = await fetch(url);
      if (response.status === 401) {
        alert('Session expired or unauthorized. Please log in again.');
        // If there is a global logout handler, call it here. For now, we clear the local state to prevent showing 0s without notice.
        setHisabData({
          summary: { totalBookings: 0, rentalCollections: { cash: 0, online: 0, vikas: 0, total: 0 }, depositCollections: { cash: 0, online: 0, vikas: 0, total: 0 }, depositRefunds: { cash: 0, online: 0, vikas: 0, total: 0 }, totalRevenue: 0, totalOutstanding: 0 },
          matchedBookingsList: [], settledRecords: [], recordsHandoverDetails: { amountGivenByWorker: 0, totalCashHandledByWorker: 0 }
        });
        return;
      }
      if (response.ok) {`;
      
  content = content.replace(/      const response = await fetch\(url\);\n      if \(response\.ok\) \{/g, fetchBlock);

  fs.writeFileSync(filePath, content);
  console.log('DailyHisab.jsx updated successfully.');
} else {
  console.log('File not found');
}
