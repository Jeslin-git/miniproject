import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createTable, createChair, createSofa, createArmchair, createOfficeChair, createBed, createLamp, createPlant, createCar, createFoodItem, createTool, createElectronics, createHuman, createDragon, createAnimal, createCarpet, generateProceduralTable, generateProceduralChair, generateProceduralBox } from './utils/generators.js';
import { world, CANNON } from './components/physics.js';
import { loadModel, prepareModel, loadModelFromUrl, preloadModels, getAvailableModels } from './utils/modelLoader.js';
import { split, parseClause } from './utils/voice.js';
import { VoiceManager } from './utils/voiceManager.js';
import { GeminiNLP } from '../scripts/geminiNLP.js';
import { supabase } from './lib/supabase.js';


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
/**
 * Create preview model for sidebar/UI
 * Uses the same hybrid logic but without adding to scene
 * 
 * @param {string} type - Object type
 * @returns {Promise<THREE.Object3D>} Preview model
 */
const createModelForType = async (type) => {
    console.log(`👁️ Creating preview for: "${type}"`);
    const normalizedType = type.toLowerCase().trim().split(' ')[0];

    try {
        // Try to load actual model
        const model = await loadModel(normalizedType, {
            tryPolyPizza: false,  // Don't use Poly.pizza for previews (faster)
            scale: 0.8  // Slightly smaller for preview
        });

        const preview = prepareModel(model, {
            autoScale: true,
            targetSize: 1.5,
            centerModel: true,
            enableShadows: false  // Previews don't need shadows
        });

        return preview;

    } catch (error) {
        console.log(`Preview fallback for "${normalizedType}": ${error.message}`);
        // Fallback to procedural or primitive for preview
        if (error.message === 'PROCEDURAL_GENERATION_REQUIRED') {
            return spawnProceduralObject(normalizedType, { x: 0, y: 0, z: 0 }, {
                color: 0xcccccc,  // Gray for preview
                scale: 0.8
            });
        } else {
            return spawnPrimitiveObject(normalizedType, { x: 0, y: 0, z: 0 }, {
                color: 0xcccccc,
                scale: 0.8
            });
        }
    }
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

    // Snapshot initial placement position so it survives physics drift
    previewObject.userData.savedPosition = {
        x: previewObject.position.x,
        y: previewObject.position.y,
        z: previewObject.position.z
    };
    previewObject.userData.savedRotation = {
        x: previewObject.rotation.x,
        y: previewObject.rotation.y,
        z: previewObject.rotation.z
    };

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
    triggerAutoSave();
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

// --- Sidebar Search ---
const mainSearch = document.getElementById('main-search');
if (mainSearch) {
    mainSearch.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        const gridItems = document.querySelectorAll('.grid-item');
        const categories = document.querySelectorAll('.category-container');

        if (!query) {
            // Reset to default state
            gridItems.forEach(item => item.style.display = '');
            categories.forEach(cat => cat.style.display = '');
            // Close all dropdowns unless they were open before
            // For now, just let user manage their states or keep them as is
            return;
        }

        categories.forEach(cat => {
            const grid = cat.querySelector('.dropdown-content');
            const items = cat.querySelectorAll('.grid-item');
            const header = cat.querySelector('.category-header');
            let hasMatch = false;

            items.forEach(item => {
                const type = item.dataset.type.toLowerCase();
                const name = item.querySelector('span').textContent.toLowerCase();
                const isMatch = type.includes(query) || name.includes(query);

                item.style.display = isMatch ? '' : 'none';
                if (isMatch) hasMatch = true;
            });

            // If category header matches, show all its items
            if (header.textContent.toLowerCase().includes(query)) {
                hasMatch = true;
                items.forEach(item => item.style.display = '');
            }

            if (hasMatch) {
                cat.style.display = '';
                // Auto-expand if match found
                if (grid && !grid.classList.contains('open')) {
                    grid.classList.add('open');
                    header.classList.add('active');
                }
            } else {
                cat.style.display = 'none';
            }
        });
    });
}

// --- 4. SPAWNING LOGIC (Three + Cannon sync) ---
/**
 * Normalize keyword by removing common adjectives and leading/trailing whitespace.
 * Ensures "beautiful sofa" -> "sofa" for model matching.
 * 
 * @param {string} keyword - Raw keyword
 * @returns {string} Normalized keyword
 */
function normalizeKeyword(keyword) {
    if (!keyword) return '';

    // Convert to lowercase and trim
    let normalized = keyword.toLowerCase().trim();

    // List of common adjectives/filler to strip
    const adjectives = [
        'beautiful', 'pretty', 'cute', 'elegant', 'modern', 'vintage', 'old', 'new',
        'fancy', 'simple', 'big', 'small', 'tiny', 'large', 'huge', 'a', 'an', 'the',
        'comfy', 'comfortable', 'cool', 'awesome', 'great', 'nice', 'some', 'insert', 'spawn', 'add', 'put'
    ];

    // Split into words
    let words = normalized.split(/\s+/);

    // Filter out filler words
    if (words.length > 1) {
        words = words.filter(word => !adjectives.includes(word));
    }

    if (words.length === 0) return normalized.split(/\s+/)[0] || '';

    // Join remaining words to check for combined names like "officechair"
    let result = words.join('');

    // Check for specific library model names
    if (result.includes('office') && result.includes('chair')) return 'officechair';
    if (result.includes('arm') && result.includes('chair')) return 'armchair';
    if (result.includes('bed')) return 'bed';
    if (result.includes('sofa') || result.includes('couch')) return 'sofa';
    if (result.includes('lamp') || result.includes('light')) return 'lamp';
    if (result.includes('plant') || result.includes('tree')) return 'plant';
    if (result.includes('table') || result.includes('desk')) return 'table';
    if (result.includes('chair') || result.includes('seat')) return 'chair';

    // Fallback: take the longest word that isn't an adjective
    return words[words.length - 1];
}

/**
 * Spawn object using procedural generation
 * @param {string} keyword - Object type keyword
 * @param {Object} position - {x, y, z} position
 * @param {Object} props - Additional properties (color, scale, etc.)
 * @returns {THREE.Group|THREE.Mesh} Generated object
 */
function spawnProceduralObject(keyword, position, props = {}) {
    console.log(`📐 Procedural generation: "${keyword}"`);

    const {
        color = 0x8B4513,    // Default brown
        scale = 1.0,
        rotation = { x: 0, y: 0, z: 0 }
    } = props;

    let mesh;
    const keywordLower = keyword.toLowerCase();

    // Map keywords to procedural generators
    switch (keywordLower) {
        case 'table':
        case 'desk':
            mesh = generateProceduralTable({
                width: 2 * (typeof scale === 'number' ? scale : 1),
                height: 0.75 * (typeof scale === 'number' ? scale : 1),
                depth: 1 * (typeof scale === 'number' ? scale : 1),
                color: color,
                legThickness: 0.1 * (typeof scale === 'number' ? scale : 1)
            });
            break;

        case 'chair':
        case 'seat':
            mesh = generateProceduralChair({
                seatHeight: 0.5 * (typeof scale === 'number' ? scale : 1),
                backHeight: 1.0 * (typeof scale === 'number' ? scale : 1),
                seatWidth: 0.5 * (typeof scale === 'number' ? scale : 1),
                color: color,
                hasArmrests: false
            });
            break;

        case 'box':
        case 'crate':
        case 'cube':
            mesh = generateProceduralBox({
                size: 1 * (typeof scale === 'number' ? scale : 1),
                color: color
            });
            break;

        default:
            console.warn(`⚠️ No procedural generator for "${keyword}" - using primitive fallback`);
            return spawnPrimitiveObject(keyword, position, props);
    }

    // Position the mesh
    mesh.position.set(position.x, position.y, position.z);

    // Apply rotation if specified
    mesh.rotation.set(rotation.x || 0, rotation.y || 0, rotation.z || 0);

    // Set metadata
    mesh.userData = {
        ...mesh.userData,
        type: 'procedural',
        keyword: keyword,
        color: color, // Store color for persistence
        spawnTime: Date.now(),
        id: `procedural_${placedObjects.length}`,
        source: 'procedural_generation',
        props: props
    };

    // Enable shadows
    mesh.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });

    console.log(`✅ Procedural "${keyword}" created`);
    return mesh;
}

/**
 * Ultimate fallback - spawn primitive geometric shapes
 * @param {string} keyword - Object type keyword
 * @param {Object} position - {x, y, z} position
 * @param {Object} props - Additional properties
 * @returns {THREE.Mesh} Primitive mesh
 */
function spawnPrimitiveObject(keyword, position, props = {}) {
    console.log(`🔷 Primitive fallback: "${keyword}"`);

    const {
        color = 0xff6347,    // Tomato red (to indicate fallback)
        scale = 1.0,
        rotation = { x: 0, y: 0, z: 0 }
    } = props;

    let geometry;
    const keywordLower = keyword.toLowerCase();
    const finalScale = typeof scale === 'number' ? scale : 1;

    // Intelligent primitive shape selection based on keyword
    if (keywordLower.includes('ball') || keywordLower.includes('sphere')) {
        geometry = new THREE.SphereGeometry(0.5 * finalScale, 32, 32);
    } else if (keywordLower.includes('cylinder') || keywordLower.includes('tube')) {
        geometry = new THREE.CylinderGeometry(0.5 * finalScale, 0.5 * finalScale, 1 * finalScale, 32);
    } else if (keywordLower.includes('cone') || keywordLower.includes('pyramid')) {
        geometry = new THREE.ConeGeometry(0.5 * finalScale, 1 * finalScale, 32);
    } else {
        // Default to cube
        geometry = new THREE.BoxGeometry(1 * finalScale, 1 * finalScale, 1 * finalScale);
    }

    const material = new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.7,
        metalness: 0.3
    });

    const mesh = new THREE.Mesh(geometry, material);

    // Position the mesh
    mesh.position.set(position.x, position.y, position.z);

    // Apply rotation
    mesh.rotation.set(rotation.x || 0, rotation.y || 0, rotation.z || 0);

    // Enable shadows
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    // Set metadata
    mesh.userData = {
        type: 'primitive',
        keyword: keyword,
        color: color, // Store color for persistence
        spawnTime: Date.now(),
        id: `primitive_${placedObjects.length}`,
        source: 'primitive_fallback',
        props: props
    };

    console.warn(`⚠️ Using primitive shape for "${keyword}"`);
    return mesh;
}

/**
 * Master spawn function with 3-tier hybrid approach:
 * 1. Local models → 2. Poly.pizza → 3. Procedural → 4. Primitive
 * 
 * @param {string} keyword - Object type keyword
 * @param {Object} propsOrPosition - Either props object (legacy) or position {x, y, z}
 * @param {Object} props - Additional properties (color, scale, rotation, etc.)
 * @returns {Promise<THREE.Object3D>} Spawned object
 */
export const spawnObject = async (keyword, propsOrPosition = {}, props = {}) => {
    // Handle legacy call: spawnObject(type, props) where props might contain position
    let position = { x: 0, y: 0, z: 0 };
    let finalProps = {};

    if (propsOrPosition.x !== undefined || propsOrPosition.y !== undefined || propsOrPosition.z !== undefined) {
        // New signature: spawnObject(keyword, position, props)
        position = propsOrPosition;
        finalProps = props;
    } else {
        // Legacy/Direct props call: spawnObject(keyword, props)
        finalProps = propsOrPosition;
        position = finalProps.position || {
            x: Math.random() * 4 - 2,
            y: 2 + Math.random() * 2,
            z: Math.random() * 4 - 2
        };
    }

    const {
        color, // No default here, so procedural can use its default
        scale = 1.0,
        rotation = { x: 0, y: 0, z: 0 },
        autoScale = true,
        targetSize = 2.0,
        enablePhysics = true
    } = finalProps;

    // Normalize keyword (strip "beautiful", "a", etc.)
    const normalizedKeyword = normalizeKeyword(keyword);
    console.log(`🎯 Spawning: "${keyword}" (normalized: "${normalizedKeyword}") at (${position.x}, ${position.y}, ${position.z})`);

    let spawnedObject = null;
    let sourceType = 'unknown';

    try {
        // ============================================
        // TIER 1 & 2: Try loadModel (Local + Poly.pizza)
        // ============================================
        updateStatus(`🔍 Loading "${normalizedKeyword}"...`);

        // Final normalization for local library names
        let modelType = normalizedKeyword;
        if (modelType.includes('chair')) {
            if (modelType.includes('office')) modelType = 'officechair';
            else if (modelType.includes('arm')) modelType = 'armchair';
            else modelType = 'chair';
        }

        const model = await loadModel(modelType, {
            tryPolyPizza: true,
            scale: scale,
            onProgress: (percent) => {
                console.log(`Progress for "${normalizedKeyword}": ${percent}%`);
            }
        });

        // Model loaded successfully from local or Poly.pizza
        console.log(`✅ Model loaded from: ${model.userData.source}`);
        sourceType = model.userData.source;

        // ============================================
        // Prepare the model (auto-scale, center)
        // ============================================
        const preparedModel = prepareModel(model, {
            autoScale: autoScale,
            targetSize: targetSize,
            centerModel: true,
            enableShadows: true
        });

        spawnedObject = preparedModel;

        // Success message with source
        const sourceName = model.userData.source === 'poly_pizza'
            ? `Poly.pizza: ${model.userData.polyPizza?.modelName || normalizedKeyword}`
            : 'Local Library';

        updateStatus(`✅ "${normalizedKeyword}" loaded (${sourceName})`);

    } catch (error) {
        console.log(`⚠️ Model load failed for "${normalizedKeyword}": ${error.message}`);

        // ============================================
        // TIER 3: Procedural Generation
        // ============================================
        if (error.message === 'PROCEDURAL_GENERATION_REQUIRED') {
            console.log(`📐 Attempting procedural generation for "${normalizedKeyword}"`);

            try {
                spawnedObject = spawnProceduralObject(normalizedKeyword, position, {
                    color: color,
                    scale: scale,
                    rotation: rotation
                });
                sourceType = 'procedural';
                updateStatus(`✅ "${normalizedKeyword}" created (Procedural)`);

            } catch (procError) {
                console.warn(`⚠️ Procedural generation unavailable for "${normalizedKeyword}"`);

                // ============================================
                // TIER 4: Primitive Fallback
                // ============================================
                spawnedObject = spawnPrimitiveObject(normalizedKeyword, position, {
                    color: color,
                    scale: scale,
                    rotation: rotation
                });
                sourceType = 'primitive';
                updateStatus(`⚠️ "${normalizedKeyword}" using fallback shape`);
            }
        } else {
            // Unexpected error - go straight to primitive
            console.error(`❌ Unexpected error: ${error.message}`);
            spawnedObject = spawnPrimitiveObject(normalizedKeyword, position, {
                color: color,
                scale: scale,
                rotation: rotation
            });
            sourceType = 'primitive';
            updateStatus(`❌ Error - using fallback for "${normalizedKeyword}"`);
        }
    }

    // ============================================
    // FINAL POSITIONING & SCENE INTEGRATION
    // ============================================

    if (!spawnedObject) {
        console.error(`❌ Failed to spawn "${normalizedKeyword}"`);
        return null;
    }

    // Apply position
    spawnedObject.position.set(position.x, position.y, position.z);

    // Apply rotation if not already set
    if (spawnedObject.rotation.x === 0 && spawnedObject.rotation.y === 0) {
        spawnedObject.rotation.set(rotation.x || 0, rotation.y || 0, rotation.z || 0);
    }

    // Store comprehensive metadata
    spawnedObject.userData = {
        ...spawnedObject.userData,
        keyword: normalizedKeyword,
        originalKeyword: keyword,
        sourceType: sourceType,
        color: color, // Ensure color is saved
        spawnPosition: { ...position },
        spawnRotation: { ...rotation },
        originalProps: { ...finalProps }
    };

    // ============================================
    // APPLY COLOR TO MESHES
    // ============================================
    if (color !== undefined && color !== 0xffffff) {
        spawnedObject.traverse((child) => {
            if (child.isMesh) {
                // If it's a single material
                if (child.material.color && typeof color === 'number') {
                    child.material.color.setHex(color);
                } else if (child.material.color && typeof color === 'string') {
                    child.material.color.set(color);
                }
            }
        });
    }

    // Add to scene & physics
    scene.add(spawnedObject);
    addPhysicsBodyForModel(spawnedObject);
    placedObjects.push(spawnedObject);

    console.log(`✅ Successfully spawned "${normalizedKeyword}" (${sourceType})`);
    triggerAutoSave();

    return spawnedObject;
};

function deleteObjectByType(type) {
    if (!type) return false;

    const normalized = normalizeKeyword(type);

    // Find LAST placed matching object
    for (let i = placedObjects.length - 1; i >= 0; i--) {
        const ud = placedObjects[i].userData;
        if (ud.keyword === normalized || ud.type === normalized || ud.originalKeyword === normalized) {
            const model = placedObjects[i];
            if (model.userData.body) {
                world.removeBody(model.userData.body);
            }
            scene.remove(model);
            placedObjects.splice(i, 1);
            updateStatus(`Deleted ${normalized}`);
            triggerAutoSave();
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

    // Snapshot the final user-placed position so saveProject reads this, not the live physics pos
    selectedObject.userData.savedPosition = {
        x: selectedObject.position.x,
        y: selectedObject.position.y,
        z: selectedObject.position.z
    };
    selectedObject.userData.savedRotation = {
        x: selectedObject.rotation.x,
        y: selectedObject.rotation.y,
        z: selectedObject.rotation.z
    };
    triggerAutoSave();
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

    // Keep snapshot up to date so saveProject uses the latest rotation
    selectedObject.userData.savedRotation = {
        x: selectedObject.rotation.x,
        y: selectedObject.rotation.y,
        z: selectedObject.rotation.z
    };

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
    triggerAutoSave();
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
    triggerAutoSave();
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
    triggerAutoSave();
};

// Color picker -> apply to all meshes of selected object (supports multi-material)
document.getElementById('prop-color').oninput = (e) => {
    if (!selectedObject) return;
    const hex = e.target.value;
    // Persist to userData so saveProject can read it
    selectedObject.userData.color = hex;
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
    triggerAutoSave();
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
        triggerAutoSave();
    }
};

// --- 6. VOICE SYSTEM ---
// Load Gemini API key from server (.env) and initialize VoiceManager
let geminiAPI = null;
window.geminiAPI = null;
let voiceManager = null;

const initVoiceSystem = async () => {
    try {
        const res = await fetch('/api/config');
        if (res.ok) {
            const cfg = await res.json();
            if (cfg && cfg.geminiKey) {
                geminiAPI = new GeminiNLP(cfg.geminiKey);
                window.geminiAPI = geminiAPI;
                console.log('Gemini key loaded from server');
            } else {
                console.warn('No Gemini key provided by server; continuing without AI key');
            }
        } else {
            console.warn('Failed to fetch config:', res.status);
        }
    } catch (err) {
        console.error('Error fetching config:', err);
    }

    voiceManager = new VoiceManager({
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
            triggerAutoSave();
        },
        updateStatus: updateStatus,
        geminiAPI: geminiAPI
    });
    window.voiceManager = voiceManager;

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
};

initVoiceSystem();

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

            // Execute Gemini commands (multi-command support)
            if (parsed.commands && Array.isArray(parsed.commands) && parsed.commands.length > 0) {
                for (const cmd of parsed.commands) {
                    if ((cmd.action === 'insert' || cmd.action === 'place') && cmd.object) {
                        await spawnObject(cmd.object, cmd);
                        updateStatus(`Spawned ${cmd.object}`);
                    } else if (cmd.action === 'delete' && cmd.object) {
                        const success = deleteObjectByType(cmd.object);
                        updateStatus(success ? `Deleted ${cmd.object}` : `No ${cmd.object} found`);
                        if (success) triggerAutoSave(); // Added triggerAutoSave
                    } else if (cmd.action === 'clear') {
                        placedObjects.forEach(obj => {
                            if (obj.userData.body) world.removeBody(obj.userData.body);
                            scene.remove(obj);
                        });
                        placedObjects = [];
                        updateStatus("Scene Cleared");
                        triggerAutoSave();
                    }
                }
                return;
            }

            // Fallback for single command format from Gemini
            if (parsed.action && parsed.object) {
                await spawnObject(parsed.object, parsed);
                updateStatus(`Spawned ${parsed.object}`);
                return;
            }
        } catch (error) {
            console.error('Gemini API error:', error);
            updateStatus('AI processing failed, using fallback');
        }
    }

    // Fallback to local regex-based parsing
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

    for (const cmd of results) {
        if (cmd.action === 'insert' && cmd.object) {
            await spawnObject(cmd.object);
            updateStatus(`Spawned ${cmd.object}`);
        } else if (cmd.action === 'delete' && cmd.object) {
            const success = deleteObjectByType(cmd.object);
            updateStatus(success ? `Deleted ${cmd.object}` : `No ${cmd.object} found`);
        } else if (cmd.action === 'clear') {
            placedObjects.forEach(obj => {
                if (obj.userData.body) world.removeBody(obj.userData.body);
                scene.remove(obj);
            });
            placedObjects = [];
            updateStatus("Scene Cleared");
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
// Save functionality is now handled by saveProject() in the AUTO-SAVE section

// Load project data on workspace load
window.loadWorkspace = async () => {
    const currentProjectId = localStorage.getItem('currentProject');
    if (!currentProjectId) {
        console.warn('No project ID found in localStorage');
        return;
    }

    updateStatus("Loading Project...");

    try {
        const { data: project, error } = await supabase
            .from('projects')
            .select('*')
            .eq('id', currentProjectId)
            .single();

        if (error) throw error;
        if (project) {
            console.log('Project fetched from Supabase:', project.name);
            const projectNameEl = document.getElementById('project-name');
            if (projectNameEl) {
                projectNameEl.textContent = project.name;
            }

            // Load project data if available
            if (project.data && project.data.objects) {
                // Clear existing objects first to avoid duplicates on reload
                placedObjects.forEach(obj => {
                    if (obj.userData.body) world.removeBody(obj.userData.body);
                    scene.remove(obj);
                });
                placedObjects = [];

                console.log(`Spawning ${project.data.objects.length} objects...`);

                // Spawn objects sequentially to maintain order and ensure physics bodies match positions
                for (const objData of project.data.objects) {
                    await spawnObject(objData.type, objData);
                }

                updateStatus("Project Loaded");
            } else {
                updateStatus("Empty Project Ready");
            }
        }
    } catch (error) {
        console.error('Error loading project:', error);
        updateStatus("Load Failed: " + error.message);
    }
};

// --- AUTO-SAVE LOGIC ---
let autoSaveTimeout = null;
const AUTO_SAVE_DELAY = 3000; // 3 seconds

const triggerAutoSave = () => {
    if (autoSaveTimeout) clearTimeout(autoSaveTimeout);
    autoSaveTimeout = setTimeout(saveProject, AUTO_SAVE_DELAY);
};

const saveProject = async () => {
    const currentProjectId = localStorage.getItem('currentProject');
    if (!currentProjectId) return;

    const data = placedObjects.map(obj => {
        // Use the user-placed snapshot position to avoid physics drift corrupting the save
        const pos = obj.userData.savedPosition || { x: obj.position.x, y: obj.position.y, z: obj.position.z };
        const rot = obj.userData.savedRotation || { x: obj.rotation.x, y: obj.rotation.y, z: obj.rotation.z };

        // CRITICAL: Use userData.keyword which is the model name (table, sofa, armchair)
        // rather than userData.type which might be "procedural" or "primitive"
        const finalType = obj.userData.keyword || obj.userData.type || 'unknown';

        return {
            type: finalType,
            position: pos,
            scale: { x: obj.scale.x, y: obj.scale.y, z: obj.scale.z },
            rotation: rot,
            baseHeight: obj.userData.baseHeight,
            baseWidth: obj.userData.baseWidth,
            baseDepth: obj.userData.baseDepth,
            color: obj.userData.color,
            material: obj.userData.material
        };
    });

    try {
        console.log('Auto-saving project...');
        const { error } = await supabase
            .from('projects')
            .update({
                data: { objects: data },
                updated_at: new Date().toISOString()
            })
            .eq('id', currentProjectId);

        if (error) throw error;
        updateStatus("Project Saved");
    } catch (error) {
        console.error('Error auto-saving:', error);
        updateStatus("Save Failed");
    }
};

// Update existing save button to use the same logic
if (document.getElementById('save-btn')) {
    document.getElementById('save-btn').onclick = async () => {
        updateStatus("Saving...");
        await saveProject();
    };
}

// Workspace Logout
if (document.getElementById('logout-btn')) {
    document.getElementById('logout-btn').onclick = async () => {
        if (confirm('Are you sure you want to sign out?')) {
            const { error } = await supabase.auth.signOut();
            if (error) {
                alert('Logout failed: ' + error.message);
            } else {
                localStorage.removeItem('currentProject');
                window.location.href = '/#login';
            }
        }
    };
}

// --- 9. ANIMATION LOOP (PHYSICS + RENDER) ---
let lastTime;
function animate(time) {
    requestAnimationFrame(animate);
    if (lastTime !== undefined) {
        const delta = (time - lastTime) / 1000;
        world.step(1 / 60, delta, 3);
        placedObjects.forEach(obj => {
            if (obj.userData.body) {
                obj.position.copy(obj.userData.body.position);
                obj.quaternion.copy(obj.userData.body.quaternion);
            }
        });
    }
    lastTime = time;
    controls.update();
    renderer.render(scene, camera);
}
animate();

// Preload common models
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

        // Persist material choice to userData so saveProject can restore it
        selectedObject.userData.material = choice;
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
        triggerAutoSave();
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

// --- 10. HELP MODAL LOGIC ---
const helpModal = document.getElementById('help-modal');
const helpBtn = document.getElementById('help-btn');
const closeHelpBtn = document.getElementById('close-help-btn');
const helpOkBtn = document.getElementById('help-ok-btn');

if (helpBtn && helpModal) {
    helpBtn.onclick = () => {
        helpModal.classList.remove('hidden');
    };
}

const hideHelp = () => {
    if (helpModal) {
        helpModal.classList.add('hidden');
    }
};

if (closeHelpBtn) closeHelpBtn.onclick = hideHelp;
if (helpOkBtn) helpOkBtn.onclick = hideHelp;

// Initialize Workspace
// (Removed initialization call from main.js to favor workspace.html onload)

// Close on outside click
window.onclick = (event) => {
    if (event.target === helpModal) {
        hideHelp();
    }
};

// --- INITIALIZATION ---
console.log('Workspace main.js loaded. Triggering load...');
window.loadWorkspace();
