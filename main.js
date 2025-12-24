import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb); // Sky blue

// Camera setup
const camera = new THREE.PerspectiveCamera(
    75,                                   // Field of view
    window.innerWidth / window.innerHeight, // Aspect ratio
    0.1,                                  // Near plane
    1000                                  // Far plane
);
camera.position.set(0, 2, 5); // Position camera above and back

// Renderer setup
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true; // Enable shadows
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; // Smooth movement
controls.dampingFactor = 0.05;
controls.maxPolarAngle = Math.PI / 2; // Prevent going below ground

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(5, 10, 5);
directionalLight.castShadow = true;
scene.add(directionalLight);

// Ground plane
const groundGeometry = new THREE.PlaneGeometry(20, 20);
const groundMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x228b22, // Forest green
    roughness: 0.8 
});
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2; // Rotate to be horizontal
ground.receiveShadow = true;
scene.add(ground);

// Test cube
// const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
// const cubeMaterial = new THREE.MeshStandardMaterial({ color: 0xff6347 }); // Tomato red
// const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
// cube.position.y = 0.5; // Place on ground
// cube.castShadow = true;
// scene.add(cube);

// spawn cubes dynamically

// Object storage
const sceneObjects = []; // Keep track of spawned objects

/**
 * Spawns a cube at specified position
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate (height)
 * @param {number} z - Z coordinate
 * @param {number} color - Hex color (e.g., 0xff0000 for red)
 */
function spawnCube(x = 0, y = 0.5, z = 0, color = 0xff6347) {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({ color: color });
    const cube = new THREE.Mesh(geometry, material);
    
    cube.position.set(x, y, z);
    cube.castShadow = true;
    
    scene.add(cube);
    sceneObjects.push(cube);
    
    console.log(`Cube spawned at (${x}, ${y}, ${z})`);
    
    return cube;
}

// Expose function globally so other files can use it
window.spawnCube = spawnCube;

function clearScene() {
    sceneObjects.forEach(obj => {
        scene.remove(obj);
        obj.geometry.dispose();
        obj.material.dispose();
    });
    sceneObjects.length = 0;
    console.log('Scene cleared');
}

window.clearScene = clearScene;

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    controls.update(); // Required for damping
    
    renderer.render(scene, camera);
}

animate();

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});