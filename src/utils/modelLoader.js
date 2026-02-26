// src/utils/modelLoader.js
// GLB model loading and management

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Initialize GLTF loader
const loader = new GLTFLoader();

// Cache for loaded models
const modelCache = new Map();

// Model definitions with paths and metadata (only for GLB models)
const MODEL_DEFINITIONS = {
    // Basic Furniture (procedural fallbacks - no GLB files)
    table: {
        path: null, // Use procedural generation
        scale: 1,
        type: 'table'
    },
    chair: {
        path: null, // Use procedural generation
        scale: 1,
        type: 'chair'
    },

    // Complex Furniture (GLB models)
    sofa: {
        path: '/assets/furniture/sofa.glb',
        scale: 1,
        type: 'sofa'
    },
    bed: {
        path: '/assets/furniture/simple_bed.glb',
        scale: 0.05,
        type: 'bed'
    },
    lamp: {
        path: '/assets/furniture/simple_table_lamp.glb',
        scale: 1,
        type: 'lamp'
    },
    plant: {
        path: '/assets/furniture/plant_pot.glb',
        scale: 1,
        type: 'plant'
    },
    drawer: {
        path: '/assets/furniture/bedside%20drawer.glb',
        scale: 1.2,
        type: 'drawer'
    },
    carpet: {
        path: '/assets/furniture/carpet_carpet.glb',
        scale: 0.02,
        type: 'carpet'
    },
    mattress: {
        path: '/assets/furniture/mattress.glb',
        scale: 0.3,
        type: 'mattress'
    },

    // Electronics
    computer: {
        path: '/assets/Electronics/computer.glb',
        scale: 0.0001,
        type: 'computer'
    },
    tv: {
        path: '/assets/Electronics/tv.glb',
        scale: 1,
        type: 'tv'
    }
};

export function loadModel(modelName) {
    return new Promise(async (resolve, reject) => {
        let definition = MODEL_DEFINITIONS[modelName];

        // 1. Check local definitions
        if (definition) {
            // Procedural models (defined but no path)
            if (!definition.path) {
                console.log(`Model "${modelName}" uses procedural generation - rejecting to trigger fallback`);
                reject(new Error(`Model "${modelName}" uses procedural generation`));
                return;
            }

            // Check cache
            if (modelCache.has(modelName)) {
                console.log(`Using cached model: ${modelName}`);
                const cachedModel = modelCache.get(modelName).clone();
                cachedModel.userData.type = definition.type;
                resolve(cachedModel);
                return;
            }

            console.log(`Loading local model: ${modelName} from ${definition.path}`);
            return doGLBDownload(modelName, definition.path, definition.scale, definition.type, resolve, reject);
        }

        // 2. Fallback to PolyPizza API if the model isn't known
        console.warn(`Model "${modelName}" not found in local definitions. Searching PolyPizza...`);

        let apiKey = window.polyPizzaKey;
        // Fallback to import.meta.env in case backend config fails to load
        if (!apiKey && typeof import.meta !== 'undefined' && import.meta.env) {
            apiKey = import.meta.env.VITE_POLY_PIZZA_API_KEY;
        }

        if (!apiKey) {
            reject(new Error(`Model "${modelName}" not found locally and no PolyPizza API Key available.`));
            return;
        }

        try {
            const response = await fetch(`https://api.poly.pizza/v1/search?keyword=${encodeURIComponent(modelName)}`, {
                method: 'GET',
                headers: {
                    'X-Auth-Token': apiKey
                }
            });

            if (!response.ok) {
                throw new Error(`PolyPizza API returned status: ${response.status}`);
            }

            const data = await response.json();

            if (!data.results || data.results.length === 0) {
                console.log(`No PolyPizza results found for ${modelName}. Rejecting to trigger procedural fallback (if applicable)`);
                reject(new Error(`Model "${modelName}" not found on PolyPizza.`));
                return;
            }

            // Grab the first viable GLB model
            const result = data.results[0];
            const downloadUrl = result.Download;

            if (!downloadUrl) {
                reject(new Error('PolyPizza result missing download URL'));
                return;
            }

            console.log(`Found "${modelName}" on PolyPizza. Downloading GLB from:`, downloadUrl);

            // For external models, default scale to 1 (users can adjust it) and use the search term as type
            doGLBDownload(modelName, downloadUrl, 1, modelName, resolve, reject);

        } catch (err) {
            console.error('Error fetching from PolyPizza:', err);
            reject(err);
        }
    });
}

function doGLBDownload(modelName, path, scale, type, resolve, reject) {
    loader.load(
        path,
        (gltf) => {
            console.log(`Successfully loaded GLTF for ${modelName}`);
            const model = gltf.scene;

            // Normalize size for external models so they don't spawn giant or microscopic
            if (path.includes('poly.pizza')) {
                const box = new THREE.Box3().setFromObject(model);
                const size = new THREE.Vector3();
                box.getSize(size);
                const maxDim = Math.max(size.x, size.y, size.z);
                if (maxDim > 0) {
                    const normalizeScale = 2.0 / maxDim; // Force max dimension to ~2 units
                    model.scale.setScalar(normalizeScale);
                    scale = normalizeScale;
                }
            } else {
                model.scale.setScalar(scale);
            }

            // Set userData
            model.userData.type = type;
            model.userData.originalScale = scale;

            // Cache the original
            modelCache.set(modelName, model.clone());

            console.log(`Model ${modelName} ready for use`);
            resolve(model);
        },
        (progress) => {
            if (progress.total > 0) {
                const percent = (progress.loaded / progress.total * 100).toFixed(1);
                console.log(`Loading ${modelName}: ${percent}%`);
            }
        },
        (error) => {
            console.error(`Error loading model ${modelName}:`, error);
            console.error(`Failed path: ${path}`);
            reject(error);
        }
    );
}

/**
 * Load multiple models at once
 * @param {string[]} modelNames - Array of model names to load
 * @returns {Promise<Object>} Promise that resolves to object with model names as keys
 */
export function loadModels(modelNames) {
    const promises = modelNames.map(name => loadModel(name));
    return Promise.all(promises).then(models => {
        const result = {};
        modelNames.forEach((name, index) => {
            result[name] = models[index];
        });
        return result;
    });
}

/**
 * Get a list of available model names
 * @returns {string[]} Array of available model names
 */
export function getAvailableModels() {
    return Object.keys(MODEL_DEFINITIONS);
}

/**
 * Get model definition by name
 * @param {string} modelName - Name of the model
 * @returns {Object|null} Model definition or null if not found
 */
export function getModelDefinition(modelName) {
    return MODEL_DEFINITIONS[modelName] || null;
}

/**
 * Preload commonly used models
 * @param {string[]} modelNames - Models to preload
 */
export function preloadModels(modelNames = ['sofa', 'lamp', 'plant']) {
    console.log('Preloading models:', modelNames);
    loadModels(modelNames).then(() => {
        console.log('Models preloaded successfully');
    }).catch(error => {
        console.error('Error preloading models:', error);
    });
}

/**
 * Clear the model cache (useful for memory management)
 */
export function clearModelCache() {
    modelCache.clear();
    console.log('Model cache cleared');
}