const fs = require('fs');
const file = 'client/src/components/DailyHisab.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /additionalCard = split\.card;/g,
  'additionalCard = split.card;\n                additionalVikas = split.vikas;'
);

content = content.replace(
  /let refundCard = 0;/g,
  'let refundCard = 0;\n          let refundVikas = 0;'
);

content = content.replace(
  /refundCard \+= split\.card;/g,
  'refundCard += split.card;\n                  refundVikas += split.vikas;'
);

content = content.replace(
  /} else if \(r\.method === 'Card'\) \{\s*refundCard \+= r\.amount;\s*}/g,
  '} else if (r.method === \'Card\') {\n                  refundCard += r.amount;\n                } else if (r.method === \'Vikas\') {\n                  refundVikas += r.amount;\n                }'
);

content = content.replace(
  /C: \{\(customRound\(refundCash\)\)\.toLocaleString\('en-IN'\)\} \| O: \{\(customRound\(refundOnline\)\)\.toLocaleString\('en-IN'\)\} \| Cd: \{\(customRound\(refundCard\)\)\.toLocaleString\('en-IN'\)\}/g,
  'C: {(customRound(refundCash)).toLocaleString(\'en-IN\')} | O: {(customRound(refundOnline)).toLocaleString(\'en-IN\')} | Cd: {(customRound(refundCard)).toLocaleString(\'en-IN\')} | V: {(customRound(refundVikas)).toLocaleString(\'en-IN\')}'
);

content = content.replace(
  /C: \{\(customRound\(additionalCash\)\)\.toLocaleString\('en-IN'\)\} \| O: \{\(customRound\(additionalOnline\)\)\.toLocaleString\('en-IN'\)\} \| Cd: \{\(customRound\(additionalCard\)\)\.toLocaleString\('en-IN'\)\}/g,
  'C: {(customRound(additionalCash)).toLocaleString(\'en-IN\')} | O: {(customRound(additionalOnline)).toLocaleString(\'en-IN\')} | Cd: {(customRound(additionalCard)).toLocaleString(\'en-IN\')} | V: {(customRound(additionalVikas)).toLocaleString(\'en-IN\')}'
);

content = content.replace(
  /C: 0 \| O: 0 \| Cd: 0/g,
  'C: 0 | O: 0 | Cd: 0 | V: 0'
);

fs.writeFileSync(file, content);
console.log('Done');
