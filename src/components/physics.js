import * as CANNON from 'cannon-es';

// 1. The Console Log Test
console.log('✅ Cannon.js loaded successfully!', CANNON);

// 2. Create the Physics World (Basic Setup)
const world = new CANNON.World();
world.gravity.set(0, -9.82, 0); // Earth gravity

export { world, CANNON };