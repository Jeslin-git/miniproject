import * as THREE from 'three';

// --- TABLE GENERATOR ---
export function createTable(width, height, depth) {
    const tableGroup = new THREE.Group();
    const material = new THREE.MeshStandardMaterial({ color: 0x5d4037 });

    // Top
    const top = new THREE.Mesh(new THREE.BoxGeometry(width, 0.1, depth), material);
    top.position.y = height;
    tableGroup.add(top);

    // 4 Legs
    const legGeom = new THREE.BoxGeometry(0.1, height, 0.1);
    const legCoords = [
        [width/2 - 0.1, height/2, depth/2 - 0.1],
        [-width/2 + 0.1, height/2, depth/2 - 0.1],
        [width/2 - 0.1, height/2, -depth/2 + 0.1],
        [-width/2 + 0.1, height/2, -depth/2 + 0.1]
    ];

    legCoords.forEach(c => {
        const leg = new THREE.Mesh(legGeom, material);
        leg.position.set(c[0], c[1], c[2]);
        tableGroup.add(leg);
    });

    return tableGroup;
}

// --- CHAIR GENERATOR ---
export function createChair(size = 1) {
    const chairGroup = new THREE.Group();
    const material = new THREE.MeshStandardMaterial({ color: 0x795548 });

    // Seat
    const seat = new THREE.Mesh(new THREE.BoxGeometry(size, 0.1, size), material);
    seat.position.y = size * 0.5;
    chairGroup.add(seat);

    // Backrest
    const back = new THREE.Mesh(new THREE.BoxGeometry(size, size, 0.1), material);
    back.position.set(0, size, -size * 0.45);
    chairGroup.add(back);

    // 4 Small Legs
    const legGeom = new THREE.BoxGeometry(0.1, size * 0.5, 0.1);
    for(let i=0; i<4; i++) {
        const leg = new THREE.Mesh(legGeom, material);
        // Position legs at corners
        leg.position.set(
            (i < 2 ? 1 : -1) * (size * 0.4),
            size * 0.25,
            (i % 2 === 0 ? 1 : -1) * (size * 0.4)
        );
        chairGroup.add(leg);
    }

    return chairGroup;
}