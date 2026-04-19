const fs = require('fs');
let data = fs.readFileSync('src/lib/valuationEngine.js', 'utf8');
data = data.replace(/\\\`/g, '`').replace(/\\\$/g, '$');
fs.writeFileSync('src/lib/valuationEngine.js', data);
console.log('Fixed syntax escapes in valuationEngine.js');
