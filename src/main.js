import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { createTable, createChair } from './utils/generators.js';
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
        await spawnObject(item.dataset.type);
    });
});

// --- 5. SELECTION & PROPERTIES ---
renderer.domElement.addEventListener('pointerdown', (e) => {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(placedObjects, true);

    if (intersects.length > 0) {
        let root = intersects[0].object;
        while (root.parent && root.parent !== scene) root = root.parent;
        
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
    } else {
        selectedObject = null;
        deselectAll3D();
        document.getElementById('property-panel').classList.add('hidden');
        document.querySelectorAll('.grid-item').forEach(el => el.classList.remove('selected'));
        updateStatus("Ready");
    }
});

document.getElementById('close-prop-btn').onclick = () => {
    document.getElementById('property-panel').classList.add('hidden');
    deselectAll3D();
    selectedObject = null;
};

document.getElementById('prop-height').oninput = (e) => { 
    if (selectedObject) selectedObject.scale.y = e.target.value;
};

document.getElementById('prop-width').oninput = (e) => { 
    if (selectedObject) {
        selectedObject.scale.x = e.target.value; 
        selectedObject.scale.z = e.target.value; 
    }
};

document.getElementById('prop-color').oninput = (e) => {
    if (selectedObject) {
        selectedObject.traverse(c => { 
            if (c.isMesh) c.material.color.set(e.target.value);
        });
    }
};

document.getElementById('delete-obj-btn').onclick = () => {
    if (selectedObject) {
        if (selectedObject.userData.body) {
            world.removeBody(selectedObject.userData.body);
        }
        scene.remove(selectedObject);
        placedObjects = placedObjects.filter(o => o !== selectedObject);
        selectedObject = null;
        document.getElementById('property-panel').classList.add('hidden');
        updateStatus("Object Deleted");
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

animate();

// Preload common models
preloadModels(['table', 'chair', 'sofa']);

window.onresize = () => {
    camera.aspect = viewport.clientWidth / viewport.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(viewport.clientWidth, viewport.clientHeight);
};