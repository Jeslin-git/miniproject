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
        [width / 2 - 0.1, height / 2, depth / 2 - 0.1],
        [-width / 2 + 0.1, height / 2, depth / 2 - 0.1],
        [width / 2 - 0.1, height / 2, -depth / 2 + 0.1],
        [-width / 2 + 0.1, height / 2, -depth / 2 + 0.1]
    ];

    legCoords.forEach(c => {
        const leg = new THREE.Mesh(legGeom, material);
        leg.position.set(c[0], c[1], c[2]);
        tableGroup.add(leg);
    });

    tableGroup.userData.type = 'table';
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
    for (let i = 0; i < 4; i++) {
        const leg = new THREE.Mesh(legGeom, material);
        // Position legs at corners
        leg.position.set(
            (i < 2 ? 1 : -1) * (size * 0.4),
            size * 0.25,
            (i % 2 === 0 ? 1 : -1) * (size * 0.4)
        );
        chairGroup.add(leg);
    }

    chairGroup.userData.type = 'chair';
    return chairGroup;
}

// --- ARMCHAIR (procedural proxy) ---
export function createArmchair(size = 1) {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0x8d6e63 });

    // Seat base
    const seat = new THREE.Mesh(new THREE.BoxGeometry(size * 1.2, size * 0.2, size * 1.0), mat);
    seat.position.y = size * 0.5;
    g.add(seat);

    // Backrest (curved proxy via two boxes)
    const back = new THREE.Mesh(new THREE.BoxGeometry(size * 1.2, size * 0.7, size * 0.2), mat);
    back.position.set(0, size * 0.95, -size * 0.4);
    g.add(back);

    // Arms
    const armGeom = new THREE.BoxGeometry(size * 0.2, size * 0.5, size * 1.0);
    const armL = new THREE.Mesh(armGeom, mat);
    armL.position.set(-size * 0.65, size * 0.8, 0);
    const armR = armL.clone();
    armR.position.x = size * 0.65;
    g.add(armL, armR);

    g.userData.type = 'armchair';
    return g;
}

// --- OFFICE CHAIR (procedural proxy) ---
export function createOfficeChair(size = 1) {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0x455a64 });

    // Seat & back
    const seat = new THREE.Mesh(new THREE.BoxGeometry(size * 0.8, size * 0.15, size * 0.8), mat);
    seat.position.y = size * 0.7;
    g.add(seat);

    const back = new THREE.Mesh(new THREE.BoxGeometry(size * 0.8, size * 0.9, size * 0.15), mat);
    back.position.set(0, size * 1.2, -size * 0.33);
    g.add(back);

    // Gas lift
    const lift = new THREE.Mesh(new THREE.CylinderGeometry(size * 0.06, size * 0.06, size * 0.6, 16), mat);
    lift.position.y = size * 0.4;
    g.add(lift);

    // Base + wheels
    const base = new THREE.Mesh(new THREE.CylinderGeometry(size * 0.15, size * 0.15, size * 0.05, 16), mat);
    base.position.y = size * 0.15;
    g.add(base);
    const wheelGeom = new THREE.SphereGeometry(size * 0.07, 12, 12);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
    for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2;
        const w = new THREE.Mesh(wheelGeom, wheelMat);
        w.position.set(Math.cos(angle) * size * 0.35, size * 0.05, Math.sin(angle) * size * 0.35);
        g.add(w);
    }

    g.userData.type = 'officechair';
    return g;
}

// --- SOFA (procedural proxy if GLB missing) ---
export function createSofa(width = 2, height = 1, depth = 1) {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0x6d4c41 });
    const base = new THREE.Mesh(new THREE.BoxGeometry(width, height * 0.3, depth), mat);
    base.position.y = height * 0.5;
    g.add(base);
    const back = new THREE.Mesh(new THREE.BoxGeometry(width, height * 0.6, depth * 0.2), mat);
    back.position.set(0, height * 0.9, -depth * 0.4);
    g.add(back);
    // Cushions
    const cushionGeom = new THREE.BoxGeometry(width * 0.45, height * 0.2, depth * 0.9);
    const c1 = new THREE.Mesh(cushionGeom, mat);
    const c2 = new THREE.Mesh(cushionGeom, mat);
    c1.position.set(-width * 0.25, height * 0.65, 0);
    c2.position.set(width * 0.25, height * 0.65, 0);
    g.add(c1, c2);
    g.userData.type = 'sofa';
    return g;
}

// --- BED (procedural proxy if GLB missing) ---
export function createBed(width = 2, height = 0.6, depth = 1.6) {
    const g = new THREE.Group();
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x8e6e53 });
    const mattressMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee });
    const frame = new THREE.Mesh(new THREE.BoxGeometry(width, height * 0.2, depth), frameMat);
    frame.position.y = height * 0.2;
    // Slightly smaller mattress so it clearly fits inside the frame
    const mattress = new THREE.Mesh(new THREE.BoxGeometry(width * 0.85, height * 0.18, depth * 0.85), mattressMat);
    mattress.position.y = height * 0.4;
    const headboard = new THREE.Mesh(new THREE.BoxGeometry(width, height * 0.8, depth * 0.1), frameMat);
    headboard.position.set(0, height * 0.7, -depth * 0.45);
    g.add(frame, mattress, headboard);
    g.userData.type = 'bed';
    return g;
}

// --- LAMP (decorative, with point light) ---
export function createLamp(height = 1.2) {
    const g = new THREE.Group();
    const standMat = new THREE.MeshStandardMaterial({ color: 0x999999 });
    const shadeMat = new THREE.MeshStandardMaterial({ color: 0xfff3e0 });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.05, 16), standMat);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, height * 0.8, 16), standMat);
    pole.position.y = height * 0.4;
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.3, 16), shadeMat);
    shade.position.y = height * 0.85;
    shade.rotation.x = Math.PI; // upside down cone
    const light = new THREE.PointLight(0xffffff, 1.2, 5);
    light.position.y = height * 0.8;
    g.add(base, pole, shade, light);
    g.userData.type = 'lamp';
    g.userData.light = light; // allow external intensity customization
    return g;
}

// --- PLANT (procedural proxy) ---
export function createPlant(height = 1) {
    const g = new THREE.Group();
    const potMat = new THREE.MeshStandardMaterial({ color: 0x6d4c41 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x388e3c });
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 0.3, 16), potMat);
    pot.position.y = 0.15;
    g.add(pot);
    for (let i = 0; i < 6; i++) {
        const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.5, 12), leafMat);
        leaf.position.set((Math.random() - 0.5) * 0.3, 0.45 + Math.random() * 0.4, (Math.random() - 0.5) * 0.3);
        leaf.rotation.z = (Math.random() - 0.5) * 0.6;
        g.add(leaf);
    }
    g.userData.type = 'plant';
    return g;
}

// --- CAR (procedural proxy) ---
export function createCar(scale = 1) {
    const g = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1565c0 });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.6 * scale, 0.4 * scale, 0.8 * scale), bodyMat);
    body.position.y = 0.3 * scale;
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(0.9 * scale, 0.35 * scale, 0.75 * scale), bodyMat);
    cabin.position.set(0, 0.6 * scale, 0);
    g.add(body, cabin);
    const tireGeom = new THREE.CylinderGeometry(0.18 * scale, 0.18 * scale, 0.3 * scale, 16);
    for (let sx of [-0.6, 0.6]) {
        for (let sz of [-0.35, 0.35]) {
            const t = new THREE.Mesh(tireGeom, tireMat);
            t.rotation.z = Math.PI / 2;
            t.position.set(sx * scale, 0.18 * scale, sz * scale);
            g.add(t);
        }
    }
    g.userData.type = 'car';
    return g;
}

// --- FOOD ITEM (generic) ---
export function createFoodItem(kind = 'food') {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0xff7043 });
    const apple = new THREE.Mesh(new THREE.SphereGeometry(0.25, 24, 16), mat);
    apple.position.y = 0.25;
    g.add(apple);
    g.userData.type = kind || 'food';
    return g;
}

// --- TOOL (generic) ---
export function createTool(kind = 'tool') {
    const g = new THREE.Group();
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.6, 0.1), new THREE.MeshStandardMaterial({ color: 0x8d6e63 }));
    handle.position.y = 0.3;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.15, 0.15), new THREE.MeshStandardMaterial({ color: 0xb0bec5 }));
    head.position.set(0.15, 0.55, 0);
    g.add(handle, head);
    g.userData.type = kind || 'tool';
    return g;
}

// --- ELECTRONICS (generic proxy) ---
export function createElectronics(kind = 'electronics') {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0x263238 });
    const screen = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.6, 0.05), mat);
    screen.position.y = 0.6;
    const stand = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.6, 0.1), mat);
    stand.position.y = 0.3;
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.05, 0.3), mat);
    g.add(screen, stand, base);
    g.userData.type = kind || 'electronics';
    return g;
}

// --- HUMAN (simple proxy) ---
export function createHuman(scale = 1) {
    const g = new THREE.Group();
    const skin = new THREE.MeshStandardMaterial({ color: 0xffcc99 });
    const shirt = new THREE.MeshStandardMaterial({ color: 0x42a5f5 });
    const pants = new THREE.MeshStandardMaterial({ color: 0x263238 });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.15 * scale, 16, 12), skin);
    head.position.y = 1.6 * scale;
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.18 * scale, 0.22 * scale, 0.5 * scale, 12), shirt);
    torso.position.y = 1.25 * scale;
    const legs = new THREE.Mesh(new THREE.BoxGeometry(0.25 * scale, 0.6 * scale, 0.2 * scale), pants);
    legs.position.y = 0.75 * scale;
    g.add(head, torso, legs);
    g.userData.type = 'human';
    return g;
}

// --- DRAGON (stylized proxy) ---
export function createDragon(scale = 1) {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0x8e24aa });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.25 * scale, 0.8 * scale, 4, 12), mat);
    body.position.y = 0.6 * scale;
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.2 * scale, 0.4 * scale, 12), mat);
    head.position.set(0.4 * scale, 0.9 * scale, 0);
    head.rotation.z = -Math.PI / 2;
    // wings
    const wingGeom = new THREE.BoxGeometry(0.8 * scale, 0.02 * scale, 0.4 * scale);
    const wL = new THREE.Mesh(wingGeom, mat);
    const wR = new THREE.Mesh(wingGeom, mat);
    wL.position.set(0, 0.9 * scale, -0.3 * scale);
    wR.position.set(0, 0.9 * scale, 0.3 * scale);
    g.add(body, head, wL, wR);
    g.userData.type = 'dragon';
    return g;
}

// --- ANIMAL (generic: dog/cat) ---
export function createAnimal(kind = 'animal') {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0xa1887f });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.3, 0.3), mat);
    body.position.y = 0.35;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 0.25), mat);
    head.position.set(0.45, 0.5, 0);
    g.add(body, head);
    g.userData.type = kind || 'animal';
    return g;
}

// --- CARPET (flat plane, texture-ready) ---
export function createCarpet(width = 2, depth = 1.5) {
    const g = new THREE.Group();
    const geo = new THREE.PlaneGeometry(width, depth, 1, 1);
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2; // lay flat on ground
    mesh.position.y = 0.01; // slightly above ground to avoid z-fighting
    g.add(mesh);
    g.userData.type = 'carpet';
    return g;
}

// --- REFINED PROCEDURAL GENERATORS (3-TIER SYSTEM) ---

export function generateProceduralTable(options = {}) {
    const {
        width = 2,
        height = 0.75,
        depth = 1,
        color = 0x8B4513,
        legThickness = 0.1
    } = options;

    const tableGroup = new THREE.Group();
    const material = new THREE.MeshStandardMaterial({ color: color });

    // Top
    const top = new THREE.Mesh(new THREE.BoxGeometry(width, 0.1, depth), material);
    top.position.y = height;
    tableGroup.add(top);

    // 4 Legs
    const legGeom = new THREE.BoxGeometry(legThickness, height, legThickness);
    const legCoords = [
        [width / 2 - legThickness, height / 2, depth / 2 - legThickness],
        [-width / 2 + legThickness, height / 2, depth / 2 - legThickness],
        [width / 2 - legThickness, height / 2, -depth / 2 + legThickness],
        [-width / 2 + legThickness, height / 2, -depth / 2 + legThickness]
    ];

    legCoords.forEach(c => {
        const leg = new THREE.Mesh(legGeom, material);
        leg.position.set(c[0], c[1], c[2]);
        tableGroup.add(leg);
    });

    tableGroup.userData.type = 'table';
    return tableGroup;
}

export function generateProceduralChair(options = {}) {
    const {
        seatHeight = 0.5,
        backHeight = 1.0,
        seatWidth = 0.5,
        color = 0x8B4513,
        hasArmrests = false
    } = options;

    const chairGroup = new THREE.Group();
    const material = new THREE.MeshStandardMaterial({ color: color });

    // Seat
    const seat = new THREE.Mesh(new THREE.BoxGeometry(seatWidth, 0.1, seatWidth), material);
    seat.position.y = seatHeight;
    chairGroup.add(seat);

    // Backrest
    const back = new THREE.Mesh(new THREE.BoxGeometry(seatWidth, backHeight - seatHeight, 0.1), material);
    back.position.set(0, seatHeight + (backHeight - seatHeight) / 2, -seatWidth / 2 + 0.05);
    chairGroup.add(back);

    // Legs
    const legGeom = new THREE.BoxGeometry(0.08, seatHeight, 0.08);
    const legOffset = seatWidth / 2 - 0.05;
    const legPositions = [
        [legOffset, seatHeight / 2, legOffset],
        [-legOffset, seatHeight / 2, legOffset],
        [legOffset, seatHeight / 2, -legOffset],
        [-legOffset, seatHeight / 2, -legOffset]
    ];

    legPositions.forEach(p => {
        const leg = new THREE.Mesh(legGeom, material);
        leg.position.set(p[0], p[1], p[2]);
        chairGroup.add(leg);
    });

    if (hasArmrests) {
        const armGeom = new THREE.BoxGeometry(0.05, 0.3, seatWidth);
        const armL = new THREE.Mesh(armGeom, material);
        armL.position.set(-seatWidth / 2 - 0.025, seatHeight + 0.2, 0);
        const armR = new THREE.Mesh(armGeom, material);
        armR.position.set(seatWidth / 2 + 0.025, seatHeight + 0.2, 0);
        chairGroup.add(armL, armR);
    }

    chairGroup.userData.type = 'chair';
    return chairGroup;
}

export function generateProceduralBox(options = {}) {
    const {
        size = 1,
        color = 0x8B4513
    } = options;
    const geometry = new THREE.BoxGeometry(size, size, size);
    const material = new THREE.MeshStandardMaterial({ color: color });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = size / 2;
    mesh.userData.type = 'box';
    return mesh;
}
