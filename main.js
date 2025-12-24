import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

/* ======================
   SCENE SETUP
====================== */
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

/* ======================
   LIGHTING
====================== */
scene.add(new THREE.AmbientLight(0xffffff, 0.5));

const sunLight = new THREE.DirectionalLight(0xffffff, 1);
sunLight.position.set(10, 20, 10);
sunLight.castShadow = true;
scene.add(sunLight);

scene.add(new THREE.HemisphereLight(0x87ceeb, 0x228b22, 0.3));

/* ======================
   GROUND
====================== */
const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 20),
    new THREE.MeshStandardMaterial({ color: 0x228b22, roughness: 0.8 })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

/* ======================
   OBJECT MANAGEMENT
====================== */
const sceneObjects = [];

function spawnObject(type = 'cube', x = 0, y = 0.5, z = 0, color = 0xff6347) {
    let geometry;

    switch (type) {
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
            return;
    }

    const mesh = new THREE.Mesh(
        geometry,
        new THREE.MeshStandardMaterial({ color })
    );

    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.userData.type = type;

    scene.add(mesh);
    sceneObjects.push(mesh);

    console.log(`${type} spawned at`, mesh.position);
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

/* ======================
   ANIMATION LOOP
====================== */
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}
animate();

/* ======================
   RESIZE HANDLER
====================== */
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
