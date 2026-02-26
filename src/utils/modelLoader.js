import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { searchPolyPizza, getBestMatch } from './polyPizzaAPI.js';

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

/**
 * Load a GLB model from a direct URL
 * @param {string} url - Direct URL to .glb file
 * @param {Object} options - Loading options
 * @returns {Promise<THREE.Group>} Promise that resolves to the loaded model
 */
export function loadModelFromUrl(url, options = {}) {
    const {
        scale = 1,
        type = 'external',
        enableCache = true,
        onProgress = null
    } = options;

    return new Promise((resolve, reject) => {
        console.log(`📥 Loading model from URL: ${url}`);

        // Check cache using URL as key
        const cacheKey = `url_${url}`;
        if (enableCache && modelCache.has(cacheKey)) {
            console.log(`✅ Using cached model from URL`);
            const cachedModel = modelCache.get(cacheKey).clone();
            resolve(cachedModel);
            return;
        }

        loader.load(
            url,
            (gltf) => {
                console.log(`✅ Successfully loaded model from URL`);
                const model = gltf.scene;

                // Apply scale
                model.scale.setScalar(scale);

                // Set userData
                model.userData.type = type;
                model.userData.originalScale = scale;
                model.userData.source = 'poly_pizza';
                model.userData.downloadUrl = url;

                // Enable shadows on all meshes
                model.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });

                // Cache if enabled
                if (enableCache) {
                    modelCache.set(cacheKey, model.clone());
                }

                resolve(model);
            },
            (progress) => {
                if (progress.lengthComputable) {
                    const percent = (progress.loaded / progress.total * 100).toFixed(1);
                    console.log(`📊 Download: ${percent}%`);

                    if (onProgress) {
                        onProgress(percent);
                    }
                }
            },
            (error) => {
                console.error(`❌ Error loading model from URL:`, error);
                reject(error);
            }
        );
    });
}

/**
 * Load a model using the hybrid approach:
 * 1. Check local MODEL_DEFINITIONS
 * 2. Try Poly.pizza if not found locally
 * 3. Reject if both fail (trigger procedural fallback)
 * 
 * @param {string} modelName - Name of the model to load
 * @param {Object} options - Loading options
 * @returns {Promise<THREE.Group>} Promise that resolves to the loaded model
 */
export async function loadModel(modelName, options = {}) {
    const {
        tryPolyPizza = true,
        scale = null,
        onProgress = null
    } = options;

    // STEP 1: Try local definitions first
    const definition = MODEL_DEFINITIONS[modelName];

    if (definition) {
        // If path is null, this is a procedural model - reject to trigger fallback
        if (!definition.path) {
            console.log(`📐 Model "${modelName}" uses procedural generation`);
            throw new Error(`PROCEDURAL_GENERATION_REQUIRED`);
        }

        // Local model exists - load it
        console.log(`📦 Loading local model: ${modelName}`);
        return loadLocalModel(modelName, definition);
    }

    // STEP 2: Model not in local definitions - try Poly.pizza
    if (tryPolyPizza) {
        console.log(`🌐 Model "${modelName}" not found locally, trying Poly.pizza...`);

        try {
            const polyModel = await loadFromPolyPizza(modelName, {
                scale: scale || 1,
                onProgress: onProgress
            });

            return polyModel;

        } catch (polyError) {
            console.warn(`⚠️ Poly.pizza failed for "${modelName}":`, polyError.message);
            // Fall through to procedural
        }
    }

    // STEP 3: Both failed - trigger procedural generation
    console.log(`❌ No model source found for "${modelName}" - triggering procedural fallback`);
    throw new Error(`PROCEDURAL_GENERATION_REQUIRED`);
}

/**
 * Load a local model from MODEL_DEFINITIONS
 * @param {string} modelName - Model name
 * @param {Object} definition - Model definition
 * @returns {Promise<THREE.Group>}
 */
function loadLocalModel(modelName, definition) {
    return new Promise((resolve, reject) => {
        console.log(`Loading local model: ${modelName} from ${definition.path}`);

        // Check cache first
        if (modelCache.has(modelName)) {
            console.log(` Using cached model: ${modelName}`);
            const cachedModel = modelCache.get(modelName).clone();
            cachedModel.userData.type = definition.type;
            resolve(cachedModel);
            return;
        }

        // Load model
        loader.load(
            definition.path,
            (gltf) => {
                console.log(`Successfully loaded local GLTF: ${modelName}`);
                const model = gltf.scene;

                // Apply scale
                model.scale.setScalar(definition.scale);

                // Set userData
                model.userData.type = definition.type;
                model.userData.originalScale = definition.scale;
                model.userData.source = 'local';

                // Enable shadows
                model.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });

                // Cache the original
                modelCache.set(modelName, model.clone());

                console.log(`Local model ${modelName} ready`);
                resolve(model);
            },
            (progress) => {
                const percent = (progress.loaded / progress.total * 100).toFixed(1);
                console.log(`Loading ${modelName}: ${percent}%`);
            },
            (error) => {
                console.error(`❌ Error loading local model ${modelName}:`, error);
                reject(error);
            }
        );
    });
}

/**
 * Load a model from Poly.pizza
 * @param {string} keyword - Search keyword
 * @param {Object} options - Loading options
 * @returns {Promise<THREE.Group>}
 */
async function loadFromPolyPizza(keyword, options = {}) {
    const {
        scale = 1,
        onProgress = null
    } = options;

    console.log(`Searching Poly.pizza for: "${keyword}"`);

    // Search for models
    const models = await searchPolyPizza(keyword, 5);

    if (models.length === 0) {
        throw new Error(`No models found on Poly.pizza for "${keyword}"`);
    }

    // Get best match
    const bestMatch = getBestMatch(models, keyword);

    if (!bestMatch || !bestMatch.downloadUrl) {
        throw new Error(`No valid download URL for "${keyword}"`);
    }

    console.log(`📥 Loading from Poly.pizza: "${bestMatch.name}" by ${bestMatch.author}`);

    // Load the model
    const model = await loadModelFromUrl(bestMatch.downloadUrl, {
        scale: scale,
        type: keyword,
        enableCache: true,
        onProgress: onProgress
    });

    // Add Poly.pizza metadata
    model.userData.polyPizza = {
        modelName: bestMatch.name,
        author: bestMatch.author,
        license: bestMatch.license,
        originalUrl: bestMatch.downloadUrl,
        thumbnailUrl: bestMatch.thumbnailUrl
    };

    console.log(`Poly.pizza model loaded: "${bestMatch.name}"`);

    return model;
}

/**
 * Prepare a loaded model (auto-scale, center, etc.)
 * @param {THREE.Group} model - Loaded model
 * @param {Object} options - Preparation options
 * @returns {THREE.Group} Prepared model
 */
export function prepareModel(model, options = {}) {
    const {
        autoScale = true,
        targetSize = 2.0,
        centerModel = true,
        enableShadows = true
    } = options;

    // Calculate bounding box
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    console.log(`📏 Model size: ${size.x.toFixed(2)} x ${size.y.toFixed(2)} x ${size.z.toFixed(2)}`);

    // Auto-scale to target size
    if (autoScale) {
        const maxDimension = Math.max(size.x, size.y, size.z);
        if (maxDimension > 0) {
            const scaleFactor = targetSize / maxDimension;
            const currentScale = model.scale.x;
            model.scale.setScalar(currentScale * scaleFactor);
            console.log(`🔧 Auto-scaled by: ${scaleFactor.toFixed(2)}x`);
        }
    }

    // Center model
    if (centerModel) {
        // Recalculate after scaling
        const newBox = new THREE.Box3().setFromObject(model);
        const newCenter = newBox.getCenter(new THREE.Vector3());
        model.position.sub(newCenter);
    }

    // Enable shadows
    if (enableShadows) {
        model.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
    }

    return model;
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
 * Get a list of available local model names
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
    console.log('🔄 Preloading models:', modelNames);
    loadModels(modelNames).then(() => {
        console.log('✅ Models preloaded successfully');
    }).catch(error => {
        console.error('❌ Error preloading models:', error);
    });
}

/**
 * Clear the model cache (useful for memory management)
 */
export function clearModelCache() {
    modelCache.clear();
    console.log('🗑️ Model cache cleared');
}