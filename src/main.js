import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createTable, createChair, createSofa, createArmchair, createOfficeChair, createBed, createLamp, createPlant, createCar, createFoodItem, createTool, createElectronics, createHuman, createDragon, createAnimal, createCarpet } from './utils/generators.js';
import { world, CANNON } from './components/physics.js';
import { loadModel, preloadModels } from './utils/modelLoader.js';
import { split, parseClause } from './utils/voice.js';
import { VoiceManager } from './utils/voiceManager.js';

// Import Gemini NLP
import { GeminiNLP } from '../scripts/geminiNLP.js';


// --- 1. CORE SETUP (THREE) ---
const scene = new THREE.Scene();
const viewport = document.getElementById('viewport-container');
const canvas = document.getElementById('three-canvas');

console.log('Viewport found:', !!viewport);
console.log('Canvas found:', !!canvas);

if (!viewport || !canvas) {
    console.error('Critical elements not found!');
    console.log('Available elements:', document.querySelectorAll('#viewport-container, #three-canvas'));
}

const camera = new THREE.PerspectiveCamera(75, viewport.clientWidth / viewport.clientHeight, 0.1, 1000);
camera.position.set(5, 5, 5);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(viewport.clientWidth, viewport.clientHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setClearColor(0x111111);

console.log('Renderer initialized:', renderer);
console.log('Canvas size:', viewport.clientWidth, 'x', viewport.clientHeight);

const controls = new OrbitControls(camera, renderer.domElement);
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

scene.add(new THREE.GridHelper(20, 20, 0x444444, 0x222222));
scene.add(new THREE.AmbientLight(0xffffff, 0.8));
const sun = new THREE.DirectionalLight(0xffffff, 1);
sun.position.set(5, 10, 7);
scene.add(sun);

// This will store all spawned THREE objects
let placedObjects = [];
let selectedObject = null;
let lastPlacedObject = null;



// --- Preview state ---
let previewObject = null;
let previewType = null;
let previewRotationY = 0;
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0); // y = 0
const planeHit = new THREE.Vector3();
const GRID_SIZE = 1.0;                   // snap size
const PREVIEW_SCALE = 1.6;               // enlarge factor
const GHOST_TINT = 0x00ffff;             // cyan

const previewOverlay = document.getElementById('preview-overlay');
const btnPreviewConfirm = document.getElementById('preview-confirm');
const btnPreviewRotate = document.getElementById('preview-rotate');
const btnPreviewCancel = document.getElementById('preview-cancel');

// Keep original material props to restore after ghosting
const matState = new WeakMap(); // Material -> {opacity, transparent, depthWrite, color}

const applyGhostMaterial = (obj, asGhost) => {
    obj.traverse((c) => {
      if (!c.isMesh || !c.material) return;
      const mats = Array.isArray(c.material) ? c.material : [c.material];
      mats.forEach((m) => {
        if (!m) return;
        if (asGhost) {
          if (!matState.has(m)) {
            matState.set(m, {
              opacity: m.opacity,
              transparent: m.transparent,
              depthWrite: 'depthWrite' in m ? m.depthWrite : undefined,
              color: m.color && m.color.isColor ? m.color.getHex() : undefined,
            });
          }
          m.transparent = true;
          m.opacity = 0.5;
          if ('depthWrite' in m) m.depthWrite = false;
          if (m.color && m.color.setHex) m.color.setHex(GHOST_TINT);
        } else {
          const s = matState.get(m);
          if (s) {
            m.opacity = s.opacity;
            m.transparent = s.transparent;
            if (s.depthWrite !== undefined) m.depthWrite = s.depthWrite;
            if (s.color !== undefined && m.color && m.color.setHex) m.color.setHex(s.color);
            matState.delete(m);
          } else {
            m.opacity = 1.0; m.transparent = false; if ('depthWrite' in m) m.depthWrite = true;
          }
        }
        m.needsUpdate = true;
      });
    });
  };

// Build a model for preview using GLB if available, else procedural fallback
const createModelForType = async (normalizedType) => {
  let model;
  try {
    model = await loadModel(normalizedType);
    console.log(`Loaded GLB model (preview): ${normalizedType}`);
  } catch (error) {
    console.log(`GLB not found for ${normalizedType} (preview), using procedural:`, error.message);
    // Reuse your existing fallback mapping:
    if (normalizedType === 'table') model = createTable(1.5, 0.8, 0.8);
    else if (normalizedType === 'chair') model = createChair(0.7);
    else if (normalizedType === 'sofa') model = createSofa(2, 1, 1);
    else if (normalizedType === 'armchair') model = createArmchair(1);
    else if (normalizedType === 'office' || normalizedType === 'officechair' || normalizedType === 'office-chair') model = createOfficeChair(1);
    else if (normalizedType === 'bed') model = createBed(2, 0.6, 1.6);
    else if (normalizedType === 'lamp') model = createLamp(1.2);
    else if (normalizedType === 'plant' || normalizedType === 'plants') model = createPlant(1);
    else if (normalizedType === 'dog' || normalizedType === 'cat' || normalizedType === 'animal' || normalizedType === 'animals') model = createAnimal('animal');
    else if (normalizedType === 'car' || normalizedType === 'vehicle') model = createCar(1);
    else if (normalizedType === 'food' || normalizedType === 'apple' || normalizedType === 'banana') model = createFoodItem(normalizedType);
    else if (normalizedType === 'tool' || normalizedType === 'tools' || normalizedType === 'wrench') model = createTool('tool');
    else if (normalizedType === 'electronics' || normalizedType === 'computer' || normalizedType === 'tv') model = createElectronics(normalizedType);
    else if (normalizedType === 'carpet') model = createCarpet(2, 1.5);
    else if (normalizedType === 'human' || normalizedType === 'character') model = createHuman(1);
    else if (normalizedType === 'dragon' || normalizedType === 'fantasy') model = createDragon(1);
    else if (normalizedType === 'cube') {
      model = new THREE.Group();
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0xff4b2b }));
      mesh.position.y = 0.5;
      model.add(mesh);
      model.userData.type = 'cube';
    } else {
      model = new THREE.Group();
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0xff4b2b }));
      mesh.position.y = 0.5;
      model.add(mesh);
      model.userData.type = normalizedType || 'object';
    }
  }
  if (!model.userData.type) model.userData.type = normalizedType;
  return model;
};

const confirmPreview = () => {
    if (!previewObject) return;
  
    // restore materials and scale back
    applyGhostMaterial(previewObject, false);
    previewObject.scale.multiplyScalar(1 / PREVIEW_SCALE);
  
    // Store base dimensions for step-based scaling
    const bbox = new THREE.Box3().setFromObject(previewObject);
    const size = new THREE.Vector3();
    bbox.getSize(size);
    previewObject.userData.baseHeight = size.y;
    previewObject.userData.baseWidth = size.x;
    previewObject.userData.baseDepth = size.z;
  
    addPhysicsBodyForModel(previewObject);
    placedObjects.push(previewObject);
    selectedObject = previewObject;
    lastPlacedObject = previewObject;
  
    previewObject = null;
    previewType = null;
  
    if (previewOverlay) {
      previewOverlay.classList.add('hidden');
      previewOverlay.setAttribute('aria-hidden', 'true');
    }
  
    updateStatus('Object placed');
    document.getElementById('property-panel').classList.remove('hidden');
    updateLampUI(); updateMaterialUI(); updateCarpetUI();
    hideCompass(); // Hide compass when object is placed
  };
  
  const cancelPreview = () => {
    if (!previewObject) return;
    // Try to restore any ghosted mats before remove
    applyGhostMaterial(previewObject, false);
    scene.remove(previewObject);
    previewObject = null;
    previewType = null;
  
    if (previewOverlay) {
      previewOverlay.classList.add('hidden');
      previewOverlay.setAttribute('aria-hidden', 'true');
    }
  
    updateStatus('Preview cancelled');
    showCompass(); // Show compass when preview is cancelled
  };

const startPreview = async (type) => {
    if (previewObject) cancelPreview();
    const normalizedType = type.toLowerCase().trim().split(' ')[0];
    const model = await createModelForType(normalizedType);
  
    // Base position and enlarge
    const bbox = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3(); bbox.getSize(size);
    model.position.set(0, Math.max(0.01, size.y * 0.5), 0);
    model.scale.multiplyScalar(PREVIEW_SCALE);
  
    previewRotationY = 0;
    model.rotation.y = previewRotationY;
  
    applyGhostMaterial(model, true);
    scene.add(model);
  
    previewObject = model;
    previewType = normalizedType;
  
    if (previewOverlay) {
      previewOverlay.classList.remove('hidden');
      previewOverlay.setAttribute('aria-hidden', 'false');
    }
  
    updateStatus(`Previewing ${normalizedType}. Click Confirm or press R/Esc.`);
    hideCompass(); // Hide compass during preview
  };

  //raycasting
let isDragging = false;
let dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
let dragOffset = new THREE.Vector3();
let intersection = new THREE.Vector3();

// --- 1b. PHYSICS HELPERS (CANNON) ---
/**
 * Create a Cannon.js box body that roughly matches a Three.js object.
 * The body will be added to the shared physics world and attached to model.userData.body
 */
const addPhysicsBodyForModel = (model) => {
    // Compute bounding box in world space
    const bbox = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    bbox.getSize(size);

    // Fallback in case size couldn't be computed (very small / empty model)
    if (size.x === 0 && size.y === 0 && size.z === 0) {
        size.set(1, 1, 1);
    }

    const halfExtents = new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2);
    const shape = new CANNON.Box(halfExtents);

    const body = new CANNON.Body({
        mass: 1, // dynamic
        position: new CANNON.Vec3(model.position.x, model.position.y, model.position.z),
        shape
    });

    body.angularDamping = 0.9;
    body.linearDamping = 0.6;

    world.addBody(body);
    model.userData.body = body;
    return body;
};

// --- 2. INTERACTIVITY HELPERS ---
const updateStatus = (msg) => {
    document.getElementById('system-status').innerText = msg;
    document.getElementById('object-count').innerText = placedObjects.length;
};

// --- Compass Management ---
const compassElement = document.getElementById('holographic-compass');
const compassToggle = document.getElementById('compass-toggle');
let compassVisible = false;

const toggleCompass = () => {
    compassVisible = !compassVisible;
    if (compassVisible) {
        compassElement?.classList.remove('hidden');
        compassToggle?.classList.add('active');
    } else {
        compassElement?.classList.add('hidden');
        compassToggle?.classList.remove('active');
    }
};

const hideCompass = () => {
    if (compassVisible) {
        compassElement?.classList.add('hidden');
        compassVisible = false;
        compassToggle?.classList.remove('active');
    }
};

const showCompass = () => {
    if (compassVisible && !selectedObject) {
        compassElement?.classList.remove('hidden');
    }
};

// Setup compass toggle
if (compassToggle) {
    compassToggle.onclick = toggleCompass;
}

const deselectAll3D = () => {
    placedObjects.forEach(obj => {
        obj.traverse(child => {
            if (child.isMesh && child.material.emissive) {
                child.material.emissive.setHex(0x000000);
            }
        });
    });
};

// --- 3. UI DROPDOWNS ---
const setupDropdown = (btnId, gridId) => {
    const btn = document.getElementById(btnId);
    const grid = document.getElementById(gridId);
    if (btn && grid) {
        btn.onclick = () => {
            grid.classList.toggle('open');
            btn.classList.toggle('active');
        };
    }
};
setupDropdown('furniture-toggle', 'furniture-grid');
setupDropdown('electronics-toggle', 'electronics-grid');
setupDropdown('vehicles-toggle', 'vehicles-grid');
setupDropdown('characters-toggle', 'characters-grid');
setupDropdown('props-toggle', 'props-grid');

// --- 4. SPAWNING LOGIC (Three + Cannon sync) ---
const spawnObject = async (type, props = {}) => {
    const normalizedType = type
        .toLowerCase()
        .trim();
    
    // Improved type normalization to match object names better
    let finalType = normalizedType;
    if (normalizedType.includes('chair')) {
        if (normalizedType.includes('office') || normalizedType.includes('desk')) finalType = 'officechair';
        else if (normalizedType.includes('beautiful') || normalizedType.includes('arm')) finalType = 'armchair';
        else finalType = 'chair';
    } else if (normalizedType.includes('table') || normalizedType.includes('desk')) {
        finalType = 'table';
    }

    let model;

    try {
        // Try to load GLB model first
        model = await loadModel(finalType);
        console.log(`Loaded GLB model: ${finalType}`);
    } catch (error) {
        console.log(`GLB model not found for ${finalType}, using procedural geometry:`, error.message);

        // Fallback to procedural geometry
        if (finalType === 'table') {
            model = createTable(1.5, 0.8, 0.8);
        } else if (finalType === 'chair') {
            model = createChair(0.7);
        } else if (finalType === 'sofa') {
            model = createSofa(2, 1, 1);
        } else if (finalType === 'armchair') {
            model = createArmchair(1);
        } else if (finalType === 'officechair') {
            model = createOfficeChair(1);
        } else if (finalType === 'bed') {
            model = createBed(2, 0.6, 1.6);
        } else if (finalType === 'lamp') {
            model = createLamp(1.2);
        } else if (finalType === 'plant') {
            model = createPlant(1);
        } else if (finalType === 'animal') {
            model = createAnimal('animal');
        } else if (finalType === 'car') {
            model = createCar(1);
        } else if (finalType === 'food') {
            model = createFoodItem(finalType);
        } else if (finalType === 'tool') {
            model = createTool('tool');
        } else if (finalType === 'electronics') {
            model = createElectronics(finalType);
        } else if (finalType === 'carpet') {
            model = createCarpet(2, 1.5);
        } else if (finalType === 'human') {
            model = createHuman(1);
        } else if (finalType === 'dragon') {
            model = createDragon(1);
        } else if (finalType === 'cube') {
            model = new THREE.Group();
            const mesh = new THREE.Mesh(
                new THREE.BoxGeometry(1, 1, 1),
                new THREE.MeshStandardMaterial({ color: 0xff4b2b })
            );
            mesh.position.y = 0.5;
            model.add(mesh);
            model.userData.type = 'cube';
        } else {
            // Generic cube for unknown objects
            model = new THREE.Group();
            const mesh = new THREE.Mesh(
                new THREE.BoxGeometry(1, 1, 1),
                new THREE.MeshStandardMaterial({ color: 0xff4b2b })
            );
            mesh.position.y = 0.5;
            model.add(mesh);
            model.userData.type = finalType || 'object';
        }
    }

    // Apply Gemini properties if provided
    if (props) {
        // Apply color
        if (props.color) {
            const colorValue = new THREE.Color(props.color);
            model.traverse(child => {
                if (child.isMesh && child.material) {
                    child.material.color.set(colorValue);
                }
            });
        }

        // Apply size
        if (props.size) {
            let scale = 1;
            if (props.size === 'small') scale = 0.5;
            else if (props.size === 'large') scale = 1.5;
            model.scale.set(scale, scale, scale);
        }

        // Apply material (basic mapping for now)
        if (props.material) {
            const presets = {
                wood: { color: 0x8d6e63, metalness: 0.05, roughness: 0.7 },
                metal: { color: 0xb0bec5, metalness: 0.90, roughness: 0.2 },
                plastic: { color: 0xcfd8dc, metalness: 0.00, roughness: 0.4 },
                glass: { color: 0x88ccee, metalness: 0.1, roughness: 0.1, opacity: 0.5, transparent: true },
            };
            const preset = presets[props.material.toLowerCase()];
            if (preset) {
                model.traverse(child => {
                    if (child.isMesh && child.material) {
                        child.material.color.set(preset.color);
                        if (preset.metalness !== undefined) child.material.metalness = preset.metalness;
                        if (preset.roughness !== undefined) child.material.roughness = preset.roughness;
                        if (preset.opacity !== undefined) {
                            child.material.opacity = preset.opacity;
                            child.material.transparent = preset.transparent;
                        }
                    }
                });
            }
        }
    }


    // Ensure model has proper userData
    if (!model.userData.type) {
        model.userData.type = normalizedType || type;
    }
    
    // Store base dimensions for step-based scaling
    const bbox = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    bbox.getSize(size);
    model.userData.baseHeight = size.y;
    model.userData.baseWidth = size.x;
    model.userData.baseDepth = size.z;

    // Position randomly above the ground so gravity can act
    model.position.set(Math.random() * 4 - 2, 2 + Math.random() * 2, Math.random() * 4 - 2);

    // Add to scene & physics
    scene.add(model);
    addPhysicsBodyForModel(model);
    placedObjects.push(model);
    updateStatus(`Spawned ${model.userData.type}`);

    return model;
};

function deleteObjectByType(type) {
    if (!type) return false;

    const normalized = type.toLowerCase().trim().split(" ")[0];

    // Find LAST placed matching object
    for (let i = placedObjects.length - 1; i >= 0; i--) {
        if (placedObjects[i].userData.type === normalized) {
            const model = placedObjects[i];
            if (model.userData.body) {
                world.removeBody(model.userData.body);
            }
            scene.remove(model);
            placedObjects.splice(i, 1);
            updateStatus(`Deleted ${normalized}`);
            return true;
        }
    }

    return false;
}

// Setup grid item clicks with DOM ready check
function setupGridItems() {
    console.log('Setting up grid items...');
    const gridItems = document.querySelectorAll('.grid-item');
    console.log(`Found ${gridItems.length} grid items`);
    
    gridItems.forEach(item => {
        item.addEventListener('click', async (e) => {
            e.stopPropagation();
            console.log('Grid item clicked:', item.dataset.type);
            document.querySelectorAll('.grid-item').forEach(el => el.classList.remove('selected'));
            item.classList.add('selected');
            await startPreview(item.dataset.type);
        });
    });
}

// Wait for DOM to be ready before setting up grid items
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupGridItems);
} else {
    setupGridItems();
}

// --- 5. SELECTION & PROPERTIES ---
let clickTimeout = null;
let lastClickTime = 0;
const DOUBLE_CLICK_DELAY = 300;

renderer.domElement.addEventListener('pointerdown', (e) => {
    const rect = renderer.domElement.getBoundingClientRect();
    // If preview is active, confirm placement and stop normal selection flow
    if (previewObject) { confirmPreview(); return; }
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(placedObjects, true);

    if (intersects.length > 0) {
        let root = intersects[0].object;
        while (root.parent && root.parent !== scene) root = root.parent;

        const currentTime = Date.now();
        const isDoubleClick = (currentTime - lastClickTime) < DOUBLE_CLICK_DELAY && selectedObject === root;
        lastClickTime = currentTime;

        if (isDoubleClick) {
            // Double-click: Open property panel
            clearTimeout(clickTimeout);
            selectedObject = root;
            deselectAll3D();
            selectedObject.traverse(child => {
                if (child.isMesh) {
                    child.material.emissive = new THREE.Color(0x00ffff);
                    child.material.emissiveIntensity = 0.2;
                }
            });
            document.getElementById('property-panel').classList.remove('hidden');
            updateStatus("Editing Object");
            updateLampUI(); updateMaterialUI(); updateCarpetUI();
            hideCompass();
            return;
        }

        // Single-click: Select and enable dragging
        selectedObject = root;
        isDragging = true;
        disablePhysics(selectedObject);

        // Setup drag plane at object height
        dragPlane.setFromNormalAndCoplanarPoint(
            new THREE.Vector3(0, 1, 0),
            selectedObject.position
        );

        // Compute offset
        raycaster.ray.intersectPlane(dragPlane, intersection);
        dragOffset.copy(intersection).sub(selectedObject.position);

        deselectAll3D();
        selectedObject.traverse(child => {
            if (child.isMesh) {
                child.material.emissive = new THREE.Color(0x00ffff);
                child.material.emissiveIntensity = 0.2;
            }
        });

        // Clear any pending single-click timeout
        clearTimeout(clickTimeout);
        clickTimeout = setTimeout(() => {
            // Single click timeout - just selection, no property panel
        }, DOUBLE_CLICK_DELAY);

    } else {
        selectedObject = null;
        updateLampUI(); updateMaterialUI(); updateCarpetUI();
        deselectAll3D();
        document.getElementById('property-panel').classList.add('hidden');
        document.querySelectorAll('.grid-item').forEach(el => el.classList.remove('selected'));
        updateStatus("Ready");
        showCompass();
    }
});

renderer.domElement.addEventListener('pointermove', (e) => {
    if (!isDragging || !selectedObject) return;

    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    if (raycaster.ray.intersectPlane(dragPlane, intersection)) {
        const newPos = intersection.sub(dragOffset);

        selectedObject.position.copy(newPos);

        // Sync physics body immediately
        if (selectedObject.userData.body) {
            selectedObject.userData.body.position.copy(newPos);
            selectedObject.userData.body.velocity.set(0, 0, 0);
        }
    }
});

renderer.domElement.addEventListener('pointerup', () => {
    if (!isDragging || !selectedObject) return;

    enablePhysics(selectedObject);
    isDragging = false;
});

//keyboard rotation
window.addEventListener('keydown', (e) => {
    if (!selectedObject) return;

    const rotStep = 0.15;

    if (e.key === 'q') rotateSelected(rotStep);
    if (e.key === 'e') rotateSelected(-rotStep);
});

function rotateSelected(angle) {
    selectedObject.rotation.y += angle;

    if (selectedObject.userData.body) {
        selectedObject.userData.body.quaternion.copy(
            new CANNON.Quaternion(
                selectedObject.quaternion.x,
                selectedObject.quaternion.y,
                selectedObject.quaternion.z,
                selectedObject.quaternion.w
            )
        );
    }
}


document.getElementById('close-prop-btn').onclick = () => {
    document.getElementById('property-panel').classList.add('hidden');
    deselectAll3D();
    selectedObject = null;
    updateLampUI(); updateMaterialUI(); updateCarpetUI();
    showCompass(); // Show compass when property panel is closed
};

// Step-based scaling system
const SCALE_STEPS = {
    // Electronics: small steps to prevent distortion
    electronics: {
        height: [0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1],
        width: [0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3],
        depth: [0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05] // Keep thin
    },
    // Furniture: medium steps
    furniture: {
        height: [0.5, 0.7, 0.9, 1.1, 1.3, 1.5, 1.7, 2.0, 2.5, 3.0],
        width: [0.5, 0.7, 0.9, 1.1, 1.3, 1.5, 1.7, 2.0, 2.5, 3.0],
        depth: [0.5, 0.7, 0.9, 1.1, 1.3, 1.5, 1.7, 2.0, 2.5, 3.0]
    },
    // Default: general steps
    default: {
        height: [0.3, 0.5, 0.7, 0.9, 1.1, 1.3, 1.5, 1.8, 2.2, 2.6, 3.0],
        width: [0.3, 0.5, 0.7, 0.9, 1.1, 1.3, 1.5, 1.8, 2.2, 2.6, 3.0],
        depth: [0.3, 0.5, 0.7, 0.9, 1.1, 1.3, 1.5, 1.8, 2.2, 2.6, 3.0]
    }
};

function getScaleSteps(type) {
    const t = (type || '').toLowerCase();
    if (t === 'computer' || t === 'electronics' || t === 'tv' || t === 'laptop') {
        return SCALE_STEPS.electronics;
    }
    if (t === 'table' || t === 'chair' || t === 'sofa' || t === 'bed' || t === 'armchair' || t === 'officechair') {
        return SCALE_STEPS.furniture;
    }
    return SCALE_STEPS.default;
}

function findClosestStep(value, steps) {
    return steps.reduce((prev, curr) => 
        Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev
    );
}

function getStepIndex(value, steps) {
    const closest = findClosestStep(value, steps);
    return steps.indexOf(closest);
}

document.getElementById('prop-height').oninput = (e) => {
    if (!selectedObject) return;
    const t = (selectedObject.userData && selectedObject.userData.type) || '';
    const raw = parseFloat(e.target.value);
    
    if (isNaN(raw)) return;
    
    const steps = getScaleSteps(t);
    const currentBbox = new THREE.Box3().setFromObject(selectedObject);
    const currentSize = new THREE.Vector3();
    currentBbox.getSize(currentSize);
    
    // Get current scale factor
    const baseHeight = selectedObject.userData.baseHeight || currentSize.y;
    const currentScale = currentSize.y / baseHeight;
    
    // Find step index from slider value (0-1 range mapped to steps)
    const stepIndex = Math.round(raw * (steps.height.length - 1));
    const targetScale = steps.height[Math.max(0, Math.min(stepIndex, steps.height.length - 1))];
    
    // Apply step-based scaling
    if (!selectedObject.userData.baseHeight) {
        selectedObject.userData.baseHeight = currentSize.y;
        selectedObject.userData.baseWidth = currentSize.x;
        selectedObject.userData.baseDepth = currentSize.z;
    }
    
    selectedObject.scale.y = targetScale / selectedObject.userData.baseHeight;
    
    // For electronics, maintain aspect ratio
    if (t === 'computer' || t === 'electronics' || t === 'tv' || t === 'laptop') {
        const aspectRatio = selectedObject.userData.baseWidth / selectedObject.userData.baseHeight;
        selectedObject.scale.x = (targetScale * aspectRatio) / selectedObject.userData.baseWidth;
    }
};

document.getElementById('prop-width').oninput = (e) => {
    if (!selectedObject) return;
    const t = (selectedObject.userData && selectedObject.userData.type) || '';
    const raw = parseFloat(e.target.value);
    
    if (isNaN(raw)) return;
    
    const steps = getScaleSteps(t);
    const currentBbox = new THREE.Box3().setFromObject(selectedObject);
    const currentSize = new THREE.Vector3();
    currentBbox.getSize(currentSize);
    
    // Initialize base dimensions if needed
    if (!selectedObject.userData.baseHeight) {
        selectedObject.userData.baseHeight = currentSize.y;
        selectedObject.userData.baseWidth = currentSize.x;
        selectedObject.userData.baseDepth = currentSize.z;
    }
    
    // Find step index from slider value
    const stepIndex = Math.round(raw * (steps.width.length - 1));
    const targetScale = steps.width[Math.max(0, Math.min(stepIndex, steps.width.length - 1))];
    
    const isElectronics = t === 'computer' || t === 'electronics' || t === 'tv' || t === 'laptop';
    
    if (isElectronics) {
        // Electronics: only scale width, keep depth thin
        selectedObject.scale.x = targetScale / selectedObject.userData.baseWidth;
        // Depth stays at base (thin)
        if (steps.depth && steps.depth[0]) {
            selectedObject.scale.z = steps.depth[0] / selectedObject.userData.baseDepth;
        }
    } else {
        // Uniform scaling for other objects
        selectedObject.scale.x = targetScale / selectedObject.userData.baseWidth;
        selectedObject.scale.z = targetScale / selectedObject.userData.baseDepth;
    }
};

// Color picker -> apply to all meshes of selected object (supports multi-material)
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


const intensityGroup = document.getElementById('lamp-intensity-group');
const intensityInput = document.getElementById('prop-intensity');

function getLampLight(obj) {
    if (!obj) return null;
    let found = null;
    obj.traverse(n => {
        if (!found && (n.isPointLight || n.isLight)) found = n;
    });
    return found;
}

const updateLampUI = () => {
    if (!intensityGroup || !intensityInput) return;

    const isLamp = selectedObject && selectedObject.userData && selectedObject.userData.type === 'lamp';
    const light =
        (selectedObject && selectedObject.userData && selectedObject.userData.light) ||
        getLampLight(selectedObject);

    if (selectedObject && (light || isLamp)) {
        // cache discovered light if any
        if (light) {
            selectedObject.userData = selectedObject.userData || {};
            selectedObject.userData.light = light;
            intensityInput.value = Number(light.intensity ?? 1.2).toFixed(1);
        }
        intensityGroup.classList.remove('hidden');
    } else {
        intensityGroup.classList.add('hidden');
    }
};

if (intensityInput) {
    intensityInput.oninput = (e) => {
        if (!selectedObject) return;

        let light =
            (selectedObject.userData && selectedObject.userData.light) ||
            getLampLight(selectedObject);

        // If the selected object is a lamp but has no light, create one on-demand
        if (!light && selectedObject.userData?.type === 'lamp') {
            light = new THREE.PointLight(0xffffff, 1.2, 5);
            // Try to position near the top of the lamp
            const bbox = new THREE.Box3().setFromObject(selectedObject);
            const size = new THREE.Vector3();
            bbox.getSize(size);
            const y = bbox.max.y - size.y * 0.15;
            light.position.set(0, Number.isFinite(y) ? y : 1, 0);
            selectedObject.add(light);
            selectedObject.userData = selectedObject.userData || {};
            selectedObject.userData.light = light;
        }

        if (light) {
            light.intensity = parseFloat(e.target.value);
            selectedObject.userData.light = light; // cache
        }
    };
}

// --- Carpet UI (image upload) ---
const carpetGroup = document.getElementById('carpet-image-group');
const carpetInput = document.getElementById('prop-carpet-image');

const updateCarpetUI = () => {
    if (!carpetGroup) return;
    const isCarpet = selectedObject && selectedObject.userData && selectedObject.userData.type === 'carpet';
    if (isCarpet) {
        carpetGroup.classList.remove('hidden');
    } else {
        carpetGroup.classList.add('hidden');
    }
};

if (carpetInput) {
    carpetInput.onchange = (e) => {
        if (!selectedObject) return;
        const isCarpet = selectedObject.userData && selectedObject.userData.type === 'carpet';
        const file = e.target.files && e.target.files[0];
        if (!isCarpet || !file) return;

        const url = URL.createObjectURL(file);
        const loader = new THREE.TextureLoader();
        loader.load(url, (tex) => {
            tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
            // Apply texture to all meshes within the carpet group
            selectedObject.traverse((c) => {
                if (c.isMesh) {
                    const mats = Array.isArray(c.material) ? c.material : [c.material];
                    mats.forEach((m) => {
                        if (!m) return;
                        m.map = tex;
                        m.color && m.color.set(0xffffff); // avoid tinting the texture
                        m.needsUpdate = true;
                    });
                }
            });
            updateStatus('Carpet image applied');
        }, undefined, (err) => {
            console.error('Failed to load carpet image', err);
            updateStatus('Failed to load carpet image');
        });
    };
}

document.getElementById('delete-obj-btn').onclick = () => {
    if (selectedObject) {
        if (selectedObject.userData.body) {
            world.removeBody(selectedObject.userData.body);
        }
        scene.remove(selectedObject);
        placedObjects = placedObjects.filter(o => o !== selectedObject);
        selectedObject = null;
        updateLampUI(); updateMaterialUI(); updateCarpetUI();
        document.getElementById('property-panel').classList.add('hidden');
        updateStatus("Object Deleted");
        updateLampUI(); updateMaterialUI(); updateCarpetUI();
        showCompass(); // Show compass when object is deleted
    }
};

// --- 6. VOICE SYSTEM ---
// Initialize Gemini NLP with your API key
const geminiAPI = new GeminiNLP('AIzaSyCYC-10Hpg7noEFrcWUx7BKNzlQNm-bPuI'); // <- REPLACE THIS WITH YOUR KEY
window.geminiAPI = geminiAPI;

const voiceManager = new VoiceManager({
    spawnObject: spawnObject,
    deleteObjectByType: deleteObjectByType,
    clearScene: () => {
        placedObjects.forEach(obj => {
            if (obj.userData.body) {
                world.removeBody(obj.userData.body);
            }
            scene.remove(obj);
        });
        placedObjects = [];
        updateStatus("Scene Cleared");
    },
    updateStatus: updateStatus,
    geminiAPI: geminiAPI
});

// Mic button click handler with debugging
const micBtn = document.getElementById('mic-trigger');
console.log('Mic button found:', !!micBtn);
if (micBtn) {
    micBtn.onclick = () => {
        console.log('Mic button clicked');
        if (!voiceManager.isSupported()) {
            console.log('Voice recognition not supported');
            const voicePopup = document.getElementById('voice-popup');
            const cmdDisplay = document.getElementById('command-display');
            if (voicePopup && cmdDisplay) {
                cmdDisplay.innerText = "Voice recognition not supported in this browser. Please use Chrome or Edge.";
                voicePopup.classList.remove('hidden');
                setTimeout(() => voicePopup.classList.add('hidden'), 3000);
            }
            return;
        }

        console.log('Starting voice recognition...');
        voiceManager.startListening();
    };
} else {
    console.error('Microphone button not found!');
}

// --- 7. TEXT COMMAND SYSTEM ---
const textCommandInput = document.getElementById('text-command-input');
console.log('Text command input found:', !!textCommandInput);

const processTextCommand = async (command) => {
    console.log('Processing text command:', command);
    if (!command || !command.trim()) return;
    
    // Use Gemini NLP for text commands if available
    if (window.geminiAPI) {
        try {
            const parsed = await window.geminiAPI.parseCommand(command);
            console.log('Gemini understood:', parsed);
            
            if (parsed.error) {
                updateStatus(`Error: ${parsed.error}`);
                return;
            }
            
            // Execute Gemini commands if they exist and are valid
            if (parsed.commands && Array.isArray(parsed.commands) && parsed.commands.length > 0) {
                for (const cmd of parsed.commands) {
                    if (cmd.action === 'insert' && cmd.object) {
                        await spawnObject(cmd.object, cmd);
                        updateStatus(`Spawned ${cmd.object}`);
                    } else if (cmd.action === 'delete' && cmd.object) {
                        const success = deleteObjectByType(cmd.object);
                        if (success) {
                            updateStatus(`Deleted ${cmd.object}`);
                        } else {
                            updateStatus(`No ${cmd.object} found`);
                        }
                    } else if (cmd.action === 'clear') {
                        placedObjects.forEach(obj => {
                            if (obj.userData.body) {
                                world.removeBody(obj.userData.body);
                            }
                            scene.remove(obj);
                        });
                        placedObjects = [];
                        updateStatus("Scene Cleared");
                    }
                }
                return;
            }
            
            // Fallback for single command format
            if (parsed.action && parsed.object) {
                await spawnObject(parsed.object, parsed);
                updateStatus(`Spawned ${parsed.object}`);
            }
        } catch (error) {
            console.error('Gemini API error:', error);
            updateStatus('AI processing failed, using fallback');
        }
    } else {
        // Fallback to simple parsing if Gemini not available
        const clauses = split(command);
        const results = [];
        
        clauses.forEach(clause => {
            const parsed = parseClause(clause);
            if (parsed) results.push(parsed);
        });
        
        if (results.length === 0) {
            updateStatus("Command not recognized");
            return;
        }
        
        // Execute commands
        for (const cmd of results) {
            if (cmd.action === 'insert' && cmd.object) {
                await spawnObject(cmd.object);
                updateStatus(`Spawned ${cmd.object}`);
            } else if (cmd.action === 'delete' && cmd.object) {
                const success = deleteObjectByType(cmd.object);
                if (success) {
                    updateStatus(`Deleted ${cmd.object}`);
                } else {
                    updateStatus(`No ${cmd.object} found`);
                }
            } else if (cmd.action === 'clear') {
                placedObjects.forEach(obj => {
                    if (obj.userData.body) {
                        world.removeBody(obj.userData.body);
                    }
                    scene.remove(obj);
                });
                placedObjects = [];
                updateStatus("Scene Cleared");
            }
        }
    }
};

if (textCommandInput) {
    textCommandInput.addEventListener('keydown', async (e) => {
        if (e.key === 'Enter') {
            const command = textCommandInput.value.trim();
            if (command) {
                await processTextCommand(command);
                textCommandInput.value = '';
            }
        }
    });
} else {
    console.error('Text command input not found!');
}

// --- 8. SAVE SYSTEM ---
document.getElementById('save-btn').onclick = () => {
    const currentProjectId = localStorage.getItem('currentProject');
    const data = placedObjects.map(obj => ({
        type: obj.userData.type,
        position: { x: obj.position.x, y: obj.position.y, z: obj.position.z },
        scale: { x: obj.scale.x, y: obj.scale.y, z: obj.scale.z },
        rotation: { x: obj.rotation.x, y: obj.rotation.y, z: obj.rotation.z },
        baseHeight: obj.userData.baseHeight,
        baseWidth: obj.userData.baseWidth,
        baseDepth: obj.userData.baseDepth
    }));
    
    if (currentProjectId) {
        // Save to project
        const projects = JSON.parse(localStorage.getItem('projects') || '[]');
        const project = projects.find(p => p.id === currentProjectId);
        if (project) {
            project.data = { objects: data };
            project.modified = Date.now();
            localStorage.setItem('projects', JSON.stringify(projects));
            updateStatus("Project Saved");
            
            // Update project name in header if available
            const projectNameEl = document.getElementById('project-name');
            if (projectNameEl) {
                projectNameEl.textContent = project.name;
            }
            return;
        }
    }
    
    // Fallback: download as JSON
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'ar-scene.json';
    link.click();
    updateStatus("Scene Exported");
};

// Load project data on workspace load
window.loadWorkspace = () => {
    const currentProjectId = localStorage.getItem('currentProject');
    if (currentProjectId) {
        const projects = JSON.parse(localStorage.getItem('projects') || '[]');
        const project = projects.find(p => p.id === currentProjectId);
        if (project) {
            const projectNameEl = document.getElementById('project-name');
            if (projectNameEl) {
                projectNameEl.textContent = project.name;
            }
            // Load project data if available
            if (project.data && project.data.objects) {
                // Clear existing objects
                placedObjects.forEach(obj => {
                    if (obj.userData.body) world.removeBody(obj.userData.body);
                    scene.remove(obj);
                });
                placedObjects = [];
                
                // Load objects (async)
                project.data.objects.forEach(async (objData) => {
                    const model = await spawnObject(objData.type);
                    if (model) {
                        model.position.set(objData.position.x, objData.position.y, objData.position.z);
                        model.scale.set(objData.scale.x, objData.scale.y, objData.scale.z);
                        model.rotation.set(objData.rotation.x, objData.rotation.y, objData.rotation.z);
                        if (objData.baseHeight) {
                            model.userData.baseHeight = objData.baseHeight;
                            model.userData.baseWidth = objData.baseWidth;
                            model.userData.baseDepth = objData.baseDepth;
                        }
                    }
                });
                updateStatus("Project Loaded");
            }
        }
    }
};

// --- 9. ANIMATION LOOP (PHYSICS + RENDER) ---
let lastTime;

function animate(time) {
    requestAnimationFrame(animate);

    // Step physics world
    if (lastTime !== undefined) {
        const delta = (time - lastTime) / 1000; // ms → seconds
        const fixedTimeStep = 1 / 60;
        world.step(fixedTimeStep, delta, 3);

        // Sync Three.js meshes with Cannon.js bodies
        placedObjects.forEach(obj => {
            const body = obj.userData.body;
            if (body) {
                obj.position.copy(body.position);
                obj.quaternion.copy(body.quaternion);
            }
        });
    }
    lastTime = time;

    controls.update();
    renderer.render(scene, camera);
}

console.log('Starting animation loop...');
animate();

// Preload common models
console.log('Preloading models...');
preloadModels(['sofa', 'lamp', 'plant']);

window.onresize = () => {
    camera.aspect = viewport.clientWidth / viewport.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(viewport.clientWidth, viewport.clientHeight);
};

// --- Material UI ---
const materialGroup = document.getElementById('material-group');
const materialSelect = document.getElementById('prop-material');
const MATERIAL_TYPES = new Set(['table', 'chair', 'sofa', 'armchair', 'bed', 'tool', 'drawer']);

const updateMaterialUI = () => {
    if (!materialGroup || !materialSelect) return;
    const t = selectedObject && selectedObject.userData && selectedObject.userData.type;
    if (t && MATERIAL_TYPES.has(String(t))) {
        materialGroup.classList.remove('hidden');
    } else {
        materialGroup.classList.add('hidden');
    }
};

if (materialSelect) {
    materialSelect.oninput = (e) => {
        const choice = e.target.value; // wood | plastic | metal
        const t = selectedObject && selectedObject.userData && selectedObject.userData.type;
        if (!selectedObject || !t || !MATERIAL_TYPES.has(String(t))) return;

        const presets = {
            wood: { color: 0x8d6e63, metalness: 0.05, roughness: 0.7 },
            plastic: { color: 0xcfd8dc, metalness: 0.00, roughness: 0.4 },
            metal: { color: 0xb0bec5, metalness: 0.90, roughness: 0.2 },
        };
        const p = presets[choice] || presets.wood;

        selectedObject.traverse((c) => {
            if (c.isMesh) {
                const mats = Array.isArray(c.material) ? c.material : [c.material];
                mats.forEach((m) => {
                    if (!m) return;
                    if (m.color && m.color.setHex) m.color.setHex(p.color);
                    if ('metalness' in m) m.metalness = p.metalness;
                    if ('roughness' in m) m.roughness = p.roughness;
                    m.needsUpdate = true;
                });
            }
        });
    };
}

//raycasting physics enable/disable

function disablePhysics(obj) {
    if (!obj?.userData?.body) return;
    const body = obj.userData.body;
    body.type = CANNON.Body.KINEMATIC;
    body.velocity.set(0, 0, 0);
    body.angularVelocity.set(0, 0, 0);
}

function enablePhysics(obj) {
    if (!obj?.userData?.body) return;
    const body = obj.userData.body;
    body.type = CANNON.Body.DYNAMIC;
    body.wakeUp();
}

// Initialize voice system is already done above in section 6

window.placeObject = async ({ type, color, scale, position }) => {
  await startPreview(type);
  if (previewObject) {
    if (color) {
      previewObject.traverse((obj) => {
        if (obj.isMesh && obj.material && obj.material.setHex) {
          obj.material.setHex(color);
        }
      });
    }
    if (scale) {
      previewObject.scale.set(scale, scale, scale);
    }
    if (position) {
      previewObject.position.copy(position);
    }
    confirmPreview();
  }
};
