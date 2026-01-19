import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { createTable, createChair, createSofa, createArmchair, createOfficeChair, createBed, createLamp, createPlant, createCar, createFoodItem, createTool, createElectronics, createHuman, createDragon, createAnimal, createCarpet } from './utils/generators.js';
import { VoiceManager } from './utils/voiceManager.js';
import { loadModel, getAvailableModels, preloadModels } from './utils/modelLoader.js';
import { world, CANNON } from './components/physics.js';


// --- 1. CORE SETUP (THREE) ---
const scene = new THREE.Scene();
const viewport = document.getElementById('viewport-container');
const canvas = document.getElementById('three-canvas');

const camera = new THREE.PerspectiveCamera(75, viewport.clientWidth / viewport.clientHeight, 0.1, 1000);
camera.position.set(5, 5, 5);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(viewport.clientWidth, viewport.clientHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setClearColor(0x111111);

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
  
    addPhysicsBodyForModel(previewObject);
    placedObjects.push(previewObject);
    selectedObject = previewObject;
  
    previewObject = null;
    previewType = null;
  
    if (previewOverlay) {
      previewOverlay.classList.add('hidden');
      previewOverlay.setAttribute('aria-hidden', 'true');
    }
  
    updateStatus('Object placed');
    document.getElementById('property-panel').classList.remove('hidden');
    updateLampUI(); updateMaterialUI(); updateCarpetUI();
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
const spawnObject = async (type) => {
    const normalizedType = type
        .toLowerCase()
        .trim()
        .split(" ")[0];

    let model;

    try {
        // Try to load GLB model first
        model = await loadModel(normalizedType);
        console.log(`Loaded GLB model: ${normalizedType}`);
    } catch (error) {
        console.log(`GLB model not found for ${normalizedType}, using procedural geometry:`, error.message);

        // Fallback to procedural geometry
        if (normalizedType === 'table') {
            model = createTable(1.5, 0.8, 0.8);
        } else if (normalizedType === 'chair') {
            model = createChair(0.7);
        } else if (normalizedType === 'sofa') {
            model = createSofa(2, 1, 1);
        } else if (normalizedType === 'armchair') {
            model = createArmchair(1);
        } else if (normalizedType === 'office' || normalizedType === 'officechair' || normalizedType === 'office-chair') {
            model = createOfficeChair(1);
        } else if (normalizedType === 'bed') {
            model = createBed(2, 0.6, 1.6);
        } else if (normalizedType === 'lamp') {
            model = createLamp(1.2);
        } else if (normalizedType === 'plant' || normalizedType === 'plants') {
            model = createPlant(1);
        } else if (normalizedType === 'dog' || normalizedType === 'cat' || normalizedType === 'animal' || normalizedType === 'animals') {
            model = createAnimal('animal');
        } else if (normalizedType === 'car' || normalizedType === 'vehicle') {
            model = createCar(1);
        } else if (normalizedType === 'food' || normalizedType === 'apple' || normalizedType === 'banana') {
            model = createFoodItem(normalizedType);
        } else if (normalizedType === 'tool' || normalizedType === 'tools' || normalizedType === 'wrench') {
            model = createTool('tool');
        } else if (normalizedType === 'electronics' || normalizedType === 'computer' || normalizedType === 'tv') {
            model = createElectronics(normalizedType);
        } else if (normalizedType === 'carpet') {
            model = createCarpet(2, 1.5);
        }
        else if (normalizedType === 'human' || normalizedType === 'character') {
            model = createHuman(1);
        } else if (normalizedType === 'dragon' || normalizedType === 'fantasy') {
            model = createDragon(1);
        } else if (normalizedType === 'cube') {
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
            model.userData.type = normalizedType || 'object';
        }
    }


    // Ensure model has proper userData
    if (!model.userData.type) {
        model.userData.type = normalizedType || type;
    }

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

document.querySelectorAll('.grid-item').forEach(item => {
    item.addEventListener('click', async (e) => {
        e.stopPropagation();
        document.querySelectorAll('.grid-item').forEach(el => el.classList.remove('selected'));
        item.classList.add('selected');
        await startPreview(item.dataset.type);
    });
});

// --- 5. SELECTION & PROPERTIES ---
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

        selectedObject = root;

        // --- Start dragging ---
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

        renderer.domElement.addEventListener('pointermove', (e) => {
            if (!previewObject) return;
            const rect = renderer.domElement.getBoundingClientRect();
            mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
          
            raycaster.setFromCamera(mouse, camera);
            if (raycaster.ray.intersectPlane(groundPlane, planeHit)) {
              let x = planeHit.x;
              let z = planeHit.z;
              if (e.shiftKey) {
                x = Math.round(x / GRID_SIZE) * GRID_SIZE;
                z = Math.round(z / GRID_SIZE) * GRID_SIZE;
              }
              previewObject.position.x = x;
              previewObject.position.z = z;
              previewObject.rotation.y = previewRotationY;
            }
          });

    window.addEventListener('keydown', (e) => {
            if (!previewObject) return;
            if (e.key === 'Escape') {
              cancelPreview();
            } else if (e.key.toLowerCase() === 'r') {
              previewRotationY += Math.PI / 8;
            }
          });

          if (btnPreviewConfirm) btnPreviewConfirm.onclick = () => confirmPreview();
          if (btnPreviewRotate)  btnPreviewRotate.onclick  = () => { if (previewObject) previewRotationY += Math.PI / 8; };
          if (btnPreviewCancel)  btnPreviewCancel.onclick  = () => cancelPreview();

    document.getElementById('property-panel').classList.remove('hidden');
        updateStatus("Editing Object");
        updateLampUI(); updateMaterialUI(); updateCarpetUI();

    } else {
        selectedObject = null;
        updateLampUI(); updateMaterialUI(); updateCarpetUI();
        deselectAll3D();
        document.getElementById('property-panel').classList.add('hidden');
        document.querySelectorAll('.grid-item').forEach(el => el.classList.remove('selected'));
        updateStatus("Ready"); updateLampUI(); updateMaterialUI(); updateCarpetUI();
        updateLampUI(); updateMaterialUI(); updateCarpetUI();
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
};

document.getElementById('prop-height').oninput = (e) => {
    if (!selectedObject) return;
    const t = (selectedObject.userData && selectedObject.userData.type) || '';
    const raw = parseFloat(e.target.value);

    // General clamp for height
    const clamped = Math.max(0.2, Math.min(3.0, isNaN(raw) ? 1 : raw));

    // Heuristic: treat very thin objects as electronics (even if type is missing)
    // Compute bounding box aspect ratio
    const bbox = new THREE.Box3().setFromObject(selectedObject);
    const size = new THREE.Vector3();
    bbox.getSize(size);
    const thinByShape = Number.isFinite(size.x) && Number.isFinite(size.z) && size.z > 0 && (size.z / size.x) < 0.25;

    const isElectronics =
        t === 'computer' || t === 'electronics' || t === 'tv' || t === 'laptop' || thinByShape;

    const heightFactor = isElectronics ? Math.min(clamped, 1.1) : clamped;
    selectedObject.scale.y = heightFactor;
};

document.getElementById('prop-width').oninput = (e) => {
    if (!selectedObject) return;
    const t = (selectedObject.userData && selectedObject.userData.type) || '';
    const raw = parseFloat(e.target.value);

    // General clamp
    const clamped = Math.max(0.2, Math.min(2.0, isNaN(raw) ? 1 : raw));

    const bbox = new THREE.Box3().setFromObject(selectedObject);
    const size = new THREE.Vector3();
    bbox.getSize(size);
    const thinByShape = Number.isFinite(size.x) && Number.isFinite(size.z) && size.z > 0 && (size.z / size.x) < 0.25;

    const isElectronics =
        t === 'computer' || t === 'electronics' || t === 'tv' || t === 'laptop' || thinByShape;

    if (isElectronics) {
        // Stricter cap and only change width (X). Keep Z to preserve thinness.
        const widthFactor = Math.min(clamped, 1.3);
        selectedObject.scale.x = widthFactor;
        // selectedObject.scale.z remains unchanged to avoid making it thick
    } else {
        // Uniform scaling for general objects
        selectedObject.scale.x = clamped;
        selectedObject.scale.z = clamped;
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
    }
};

// --- 6. VOICE SYSTEM ---
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
    updateStatus: updateStatus
});

// Mic button click handler
const micBtn = document.getElementById('mic-trigger');
if (micBtn) {
    micBtn.onclick = () => {
        if (!voiceManager.isSupported()) {
            const voicePopup = document.getElementById('voice-popup');
            const cmdDisplay = document.getElementById('command-display');
            if (voicePopup && cmdDisplay) {
                cmdDisplay.innerText = "Voice recognition not supported in this browser. Please use Chrome or Edge.";
                voicePopup.classList.remove('hidden');
                setTimeout(() => voicePopup.classList.add('hidden'), 3000);
            }
            return;
        }

        voiceManager.startListening();
    };
} else {
    console.error('Microphone button not found!');
}

// --- 7. SAVE SYSTEM ---
document.getElementById('save-btn').onclick = () => {
    const data = placedObjects.map(obj => ({
        type: obj.userData.type,
        position: obj.position,
        scale: obj.scale
    }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'ar-scene.json';
    link.click();
    updateStatus("Scene Exported");
};

// --- 8. ANIMATION LOOP (PHYSICS + RENDER) ---
let lastTime;

function animate(time) {
    requestAnimationFrame(animate);

    // Step physics world
    if (lastTime !== undefined) {
        const delta = (time - lastTime) / 1000; // ms â†’ seconds
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

animate();

// Preload common models
preloadModels(['table', 'chair', 'sofa']);

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
