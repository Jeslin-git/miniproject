# Mission: PyScape Core Upgrade Optimization
Objective: Implement a dynamic, fully responsive 3D workspace with fluid physics configurations and mobile WebXR capabilities.

## Architecture Guidelines
- Keep the main canvas structure flat. All elements must spawn flatly in the `scene` array and handle unique physics rigid bodies (`CANNON.Body`) to maintain separate raycast selection and manipulation vectors.
- Enforce grid coordinate boundaries and snapping criteria natively inside the spatial routines.

## Task 1: Responsive Layout Engine (Target: src/utils/roomPresets.js & main.js)
- Build a relative mapping mechanism (`DYNAMIC_ROOM_PRESETS`) tracking structural coordinates as fractional anchoring weights (-0.5 to 0.5) instead of fixed dimensions.
- Orchestrate `window.spawnDynamicRoom` to sequentially instantiate floors/walls with a physics mass of 0 (static).
- Iterate through furniture anchors, compute absolute world coordinate positioning matrices, and forward them safely to the standard `spawnObject` subroutine.
- Update `processTextCommand` with dynamic regex lookarounds matching phrases like "10 by 8" or "12x10" to pass numeric argument pairs to the room initialization layer.

## Task 2: Touch-Responsive Dashboard Deck (Target: src/pages/dashboard.js & src/dashboard.css)
- Implement state-tracked pagination arrays utilizing `currentPage` and screen-width dynamic row sizing selectors (4 cards on mobile displays, 6 on desktop layouts).
- Use a fluid grid structure leveraging CSS Grid's `repeat(auto-fill, minmax(280px, 1fr))` configuration rules for card rendering parameters.
- Provide touch-friendly page nav buttons and number toggles satisfying minimum touch targets (44px vertical bounds for handheld screens).

## Task 3: Zero-G / Viscous Antigravity Layer (Target: src/main.js)
- Add a global variable `antigravityMode` and hook it up to a runtime method `window.setAntigravityMode(enabled)`.
- When enabled, toggle `world.gravity.set(0, 0.2, 0)` and inject high dampening characteristics (`linearDamping = 0.85`, `angularDamping = 0.85`) across tracking entities to simulate viscosity.
- Enforce a protective boundary loop tracking ceiling coordinate thresholds (`obj.position.y > 6.0`) to suppress runaway vertical drift.
- Wire up matching string patterns ("zero gravity", "antigravity on/off") inside the prompt routing array.

## Task 4: Immersive WebXR Camera Mode Pass-Through (Target: src/main.js)
- Configure `WebGLRenderer` with `alpha: true` and toggle `renderer.xr.enabled = true`.
- Transition the tick handler logic from custom frame wrappers over to the unified `renderer.setAnimationLoop` execution method.
- Add an activation toggle linked to the `.ar-badge` wrapper. Check `navigator.xr.isSessionSupported('immersive-ar')` to handle the session initialization.
- When an active session executes, swap `renderer.setClearColor(0x000000, 0)` and suppress visibility on the structural walls/floors to cleanly float individual assets directly over real floors.
