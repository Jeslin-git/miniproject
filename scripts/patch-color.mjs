import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const file = path.join(__dirname, '..', 'src', 'main.js');
let s = fs.readFileSync(file, 'utf8');

// If a prop-color handler already exists, do nothing
if (/getElementById\('prop-color'\)\.oninput/.test(s)) {
  console.log('Color handler already present.');
  process.exit(0);
}

// Find the end of prop-width handler to insert color handler after it
const anchor = "document.getElementById('prop-width')";
const i = s.indexOf(anchor);
if (i === -1) {
  console.error('Could not find prop-width handler anchor. Aborting.');
  process.exit(1);
}
// Find the end of the handler block (first occurrence of \n}; after anchor)
const tail = s.slice(i);
const endIdx = tail.indexOf('\n};');
let insertAt = -1;
if (endIdx !== -1) {
  insertAt = i + endIdx + 3; // position after the closing brace and semicolon
} else {
  // fallback: append at end
  insertAt = s.length;
}

const colorBlock = `
\n// Color picker -> apply to all meshes of selected object (supports multi-material)
document.getElementById('prop-color').oninput = (e) => {
  if (!selectedObject) return;
  const hex = e.target.value;
  selectedObject.traverse((c) => {
    if (c.isMesh) {
      const materials = Array.isArray(c.material) ? c.material : [c.material];
      materials.forEach(m => {
        if (m && m.color && typeof m.color.set === 'function') {
          m.color.set(hex);
          m.needsUpdate = true;
        }
      });
    }
  });
};
`;

s = s.slice(0, insertAt) + colorBlock + s.slice(insertAt);

fs.writeFileSync(file, s, 'utf8');
console.log('Inserted prop-color handler after width handler.');
