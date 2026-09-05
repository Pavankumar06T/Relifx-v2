const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..', 'src');
let files = 0;
let bad = 0;

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p);
    else if (entry.name.endsWith('.js')) {
      files++;
      const text = fs.readFileSync(p, 'utf8');
      if (text.includes('\t')) {
        bad++;
        console.error(`Tabs found: ${p}`);
      }
    }
  }
}
walk(root);
if (bad) process.exit(1);
console.log(`Basic lint passed for ${files} JS files.`);
