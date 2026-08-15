const fs = require('fs');
const file = 'client/src/components/DailyHisab.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/const mixed = parseMixedRef/g, 'const split = parseMixedRef');

fs.writeFileSync(file, content);
console.log('Fixed mixed variable bug');
