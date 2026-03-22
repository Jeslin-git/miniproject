import * as THREE from 'three';
import { CANNON } from '../components/physics.js';

// Predefined target scales in meters (approximate max dimension)
const TARGET_SCALES = {
    apple: 0.1,
    banana: 0.15,
    food: 0.15,
    cup: 0.12,
    mug: 0.12,
    plate: 0.25,
    bowl: 0.2,

    lamp: 0.5,
    plant: 0.8,
    plants: 0.8,
    book: 0.25,
    decor: 0.4,

    chair: 1.0,
    officechair: 1.1,
    armchair: 1.2,
    table: 1.5,
    desk: 1.5,
    sofa: 2.0,
    bed: 2.2,
    mattress: 2.0,
    drawer: 0.8,
    cabinet: 1.8,
    shelf: 2.0,
    carpet: 2.5,

    computer: 0.6,
    laptop: 0.4,
    tv: 1.2,
    electronics: 0.5,

    car: 4.5,
    vehicle: 4.5,

    dog: 0.6,
    cat: 0.3,
    animal: 0.5,
    human: 1.7,
    character: 1.7,
    dragon: 3.0,

    tool: 0.3,
    wrench: 0.25,
    hammer: 0.3,

    cube: 1.0,
    default: 1.0
};

/**
 * Normalizes a GLTF model's scale and aligns its pivot so its bottom-center
 * matches the Cannon.js body's center of mass.
 * 
 * @param {THREE.Group} model The loaded GLTF scene/group
 * @param {string} type The object's keyword/type
 * @returns {Object} { shape: CANNON.Box, size: THREE.Vector3 }
 */
export function normalizeAndAlignModel(model, type) {
    // 1. Reset any existing scale to compute true native bounding box
    model.scale.set(1, 1, 1);
    model.updateMatrixWorld(true);

    let bbox = new THREE.Box3().setFromObject(model);
    let size = new THREE.Vector3();
    bbox.getSize(size);

    // 2. Normalize Scale based on type
    const maxDim = Math.max(size.x, size.y, size.z);

    // Fallback to default scale if type not explicitly defined
    const normalizedType = (type || '').toLowerCase().trim();
    let targetScale = TARGET_SCALES[normalizedType];

    // Partial matching if exact match not found (e.g. "office chair" -> "officechair")
    if (!targetScale) {
        for (const [key, scale] of Object.entries(TARGET_SCALES)) {
            if (normalizedType.includes(key) || key.includes(normalizedType)) {
                targetScale = scale;
                break;
            }
        }
    }
    targetScale = targetScale || TARGET_SCALES.default;

    if (maxDim > 0 && maxDim !== targetScale) {
        const scaleFactor = targetScale / maxDim;
        // Apply uniform scaling to the root group
        model.scale.setScalar(scaleFactor);
        model.updateMatrixWorld(true);
    }

    // 3. Recompute bounding box after scaling
    bbox.setFromObject(model);
    bbox.getSize(size);

    // Fallback in case of empty model
    if (size.x === 0 && size.y === 0 && size.z === 0) {
        size.set(1, 1, 1);
    }

    const center = new THREE.Vector3();
    bbox.getCenter(center);

    // 4. Recenter the mesh geometry so the model's pivot (0,0,0) is exactly at its physical center.
    // This perfectly aligns the Three.js mesh with the Cannon.js Box's center of mass.
    // By doing this, model.position corresponds precisely to the Cannon body's position.

    // Offset all children inversely by the center of the bounding box
    model.children.forEach(child => {
        child.position.sub(center);
        child.updateMatrixWorld(true);
    });

    // 5. Create Cannon.js collision shape
    // Notice that now the Three.js mesh is centered at its root, so the Box shape
    // accurately wraps it around its local (0,0,0).
    const halfExtents = new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2);
    const shape = new CANNON.Box(halfExtents);

    return { shape, size };
}
