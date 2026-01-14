const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'src', 'main.js');
let s = fs.readFileSync(file, 'utf8');

// Normalize literal backtick CRLF artifacts to actual newlines
s = s.replace(/`r`n/g, '\n');

// Collapse duplicate consecutive update UI calls
s = s.replace(/(\s*updateLampUI\(\);\s*updateMaterialUI\(\);\s*\n){2,}/g, '\n        updateLampUI(); updateMaterialUI();\n');

// Remove UI update call immediately after selectedObject=null before deselect
s = s.replace(/selectedObject\s*=\s*null;\s*\n\s*updateLampUI\(\);\s*updateMaterialUI\(\);\s*\n\s*deselectAll3D\(\);/g,
  'selectedObject = null;\n        deselectAll3D();');

// Ensure selection branch line isn't carrying stray CRLF artifacts (handled above). Nothing else to do.

fs.writeFileSync(file, s, 'utf8');
console.log('Fixed main.js (normalized CRLF artifacts and cleaned duplicate UI updates).');
