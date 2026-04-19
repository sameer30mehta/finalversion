const fs = require('fs');
let data = fs.readFileSync('src/pages/Dashboard.jsx', 'utf8');
data = data.replace(/\\\`/g, '`').replace(/\\\$/g, '$');
fs.writeFileSync('src/pages/Dashboard.jsx', data);
console.log('Fixed syntax escapes in Dashboard.jsx');
