import * as CANNON from 'cannon-es';

console.log('✅ Cannon.js loaded successfully!', CANNON);

// --- PHYSICS WORLD SETUP ---
const world = new CANNON.World();
world.gravity.set(0, -9.82, 0); // Earth‑like gravity

// Enable generic sleep mechanics to prevent jitter & sliding
world.allowSleep = true;
world.defaultContactMaterial.friction = 0.5; // Stronger friction
world.defaultContactMaterial.restitution = 0.1; // Minimal bounciness

// Ground plane (y = 0), aligned with Three.js grid
const groundBody = new CANNON.Body({
    mass: 0, // static
    shape: new CANNON.Plane()
});
groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
world.addBody(groundBody);

export { world, CANNON };
