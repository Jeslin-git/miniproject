import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const file = path.join(__dirname, '..', 'src', 'main.js');
let s = fs.readFileSync(file, 'utf8');

// Helper: safely replace first match
function replaceOnce(src, pattern, replacement) {
  const m = src.match(pattern);
  if (!m) return src;
  return src.replace(pattern, replacement);
}

// 1) Strengthen lamp intensity wiring: support GLB lamps without userData.light
// Inject getLampLight() helper before updateLampUI if not present
if (!/function\s+getLampLight\(/.test(s)) {
  const insertAnchor = /const\s+updateLampUI\s*=\s*\(\)\s*=>\s*\{/;
  if (insertAnchor.test(s)) {
    s = s.replace(insertAnchor, `function getLampLight(obj){\n  let found=null;\n  if(!obj) return null;\n  obj.traverse(n=>{ if(!found && (n.isPointLight || n.isLight)) found=n; });\n  return found;\n}\n\nconst updateLampUI = () => {`);
  }
}

// Rewrite updateLampUI body to use either userData.light or a discovered light
s = replaceOnce(
  s,
  /const\s+updateLampUI\s*=\s*\(\)\s*=>\s*\{[\s\S]*?\n\};/,
  `const updateLampUI = () => {\n  if (!intensityGroup || !intensityInput) return;\n  const light = (selectedObject && selectedObject.userData && selectedObject.userData.light) || getLampLight(selectedObject);\n  if (selectedObject && light) {\n    // cache for later\n    selectedObject.userData = selectedObject.userData || {};\n    selectedObject.userData.light = light;\n    intensityGroup.classList.remove('hidden');\n    intensityInput.value = Number(light.intensity ?? 1.2).toFixed(1);\n  } else {\n    intensityGroup.classList.add('hidden');\n  }\n};`
);

// Update intensityInput handler to also resolve light dynamically
s = replaceOnce(
  s,
  /if\s*\(intensityInput\)\s*\{[\s\S]*?\n\}\n/,
  `if (intensityInput) {\n  intensityInput.oninput = (e) => {\n    if (selectedObject) {\n      const light = (selectedObject.userData && selectedObject.userData.light) || getLampLight(selectedObject);\n      if (light) {\n        light.intensity = parseFloat(e.target.value);\n        // cache back\n        selectedObject.userData.light = light;\n      }\n    }\n  };\n}\n`
);

// 2) Tame width control for laptops/electronics (computer)
// Replace the prop-width handler to clamp values and limit electronics
s = replaceOnce(
  s,
  /document\.getElementById\('prop-width'\)\.oninput\s*=\s*\(e\)\s*=>\s*\{[\s\S]*?\n\};/,
  `document.getElementById('prop-width').oninput = (e) => {\n  if (selectedObject) {\n    const t = selectedObject.userData && selectedObject.userData.type;\n    const raw = parseFloat(e.target.value);\n    const clamped = Math.max(0.2, Math.min(2.0, isNaN(raw) ? 1 : raw));\n    const factor = (t === 'computer' || t === 'electronics' || t === 'laptop') ? Math.min(clamped, 1.4) : clamped;\n    selectedObject.scale.x = factor;\n    selectedObject.scale.z = factor;\n  }\n};`
);

fs.writeFileSync(file, s, 'utf8');
console.log('Applied lamp intensity and width control fixes to src/main.js');
