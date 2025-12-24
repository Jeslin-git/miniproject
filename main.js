import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);
camera.position.set(0, 2, 5);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.maxPolarAngle = Math.PI / 2;

scene.add(new THREE.AmbientLight(0xffffff, 0.5));

const sunLight = new THREE.DirectionalLight(0xffffff, 1);
sunLight.position.set(10, 20, 10);
sunLight.castShadow = true;
scene.add(sunLight);

scene.add(new THREE.HemisphereLight(0x87ceeb, 0x228b22, 0.3));

const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 20),
    new THREE.MeshStandardMaterial({ color: 0x228b22, roughness: 0.8 })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);
const sceneObjects = [];

/**
 * Main object spawning function
 * @param {string} type - Object type: 'cube', 'sphere', 'cylinder'
 * @param {number} x - X position in world space
 * @param {number} y - Y position (height)
 * @param {number} z - Z position in world space
 * @param {number} color - Hex color code
 * @returns {THREE.Mesh|null} The spawned object or null if failed
 */

function spawnObject(type = 'cube', x = 0, y = 0.5, z = 0, color = 0xff6347) {
    // Validate object type
    if (!type || typeof type !== 'string') {
        console.error('Invalid type:', type);
        return null;
    }

    // Validate position values
    if ([x, y, z].some(v => typeof v !== 'number' || isNaN(v))) {
        console.error('Invalid position:', x, y, z);
        return null;
    }

    // Limit number of objects to avoid performance issues
    if (sceneObjects.length >= 50) {
        console.warn('Max objects reached. Clear scene first.');
        return null;
    }

    let geometry;

    switch (type.toLowerCase()) {
        case 'cube':
            geometry = new THREE.BoxGeometry(1, 1, 1);
            break;

        case 'sphere':
            geometry = new THREE.SphereGeometry(0.5, 32, 32);
            break;

        case 'cylinder':
            geometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 32);
            break;

        default:
            console.error('Unknown object type:', type);
            return null;
    }

    const material = new THREE.MeshStandardMaterial({ color });
    const mesh = new THREE.Mesh(geometry, material);

    mesh.position.set(x, y, z);
    mesh.castShadow = true;

    // Store metadata for future use (delete, filter, voice updates)
    mesh.userData = {
        type,
        createdAt: Date.now()
    };
    
    scene.add(mesh);
    sceneObjects.push(mesh);

    console.log(`${type} spawned at (${x}, ${y}, ${z})`);

    return mesh;
}


function getRandomPosition() {
    return {
        x: (Math.random() - 0.5) * 8,  // Random between -4 and 4
        y: 0.5,
        z: (Math.random() - 0.5) * 8
    };
}

function clearScene() {
    sceneObjects.forEach(obj => {
        scene.remove(obj);
        obj.geometry.dispose();
        obj.material.dispose();
    });
    sceneObjects.length = 0;
    console.log('Scene cleared');
}

window.spawnObject = spawnObject;
window.clearScene = clearScene;

/* ======================
   VOICE COMMAND HANDLER
====================== */
window.addEventListener('VOICE_COMMAND', (event) => {
    const { command, params = {} } = event.detail;
    console.log('Voice command:', command, params);
    handleVoiceCommand(command, params);
});

function handleVoiceCommand(command, params) {
    // Auto-randomize position if not provided
    if (params.x === undefined && params.y === undefined && params.z === undefined) {
        const pos = getRandomPosition();
        params.x = pos.x;
        params.y = pos.y;
        params.z = pos.z;
    }

    switch (command) {
        case 'PLACE_CUBE':
            spawnObject(
                'cube',
                params.x ?? 0,
                params.y ?? 0.5,
                params.z ?? 0,
                params.color ?? 0xff6347
            );
            break;

        case 'PLACE_OBJECT':
            spawnObject(
                params.type ?? 'cube',
                params.x ?? 0,
                params.y ?? 0.5,
                params.z ?? 0,
                params.color ?? 0xff6347
            );
            break;

        case 'CLEAR_SCENE':
            clearScene();
            break;

        default:
            console.warn('Unknown command:', command);
    }
}

let lastTime = performance.now();
let frames = 0;

function animate() {
    requestAnimationFrame(animate);
    
    // FPS counter
    frames++;
    const currentTime = performance.now();
    if (currentTime >= lastTime + 1000) {
        document.getElementById('fps').textContent = frames;
        frames = 0;
        lastTime = currentTime;
    }
    
    controls.update();
    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
