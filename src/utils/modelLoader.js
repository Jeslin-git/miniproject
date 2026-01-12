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
 * Load a single GLB model
 * @param {string} modelName - Name of the model to load
 * @returns {Promise<THREE.Group>} Promise that resolves to the loaded model
 */
export function loadModel(modelName) {
    return new Promise((resolve, reject) => {
        const definition = MODEL_DEFINITIONS[modelName];

        if (!definition) {
            console.warn(`Model "${modelName}" not found in definitions. Available models:`, Object.keys(MODEL_DEFINITIONS));
            reject(new Error(`Model "${modelName}" not found in definitions`));
            return;
        }

        console.log(`Loading model: ${modelName} from ${definition.path}`);

        // Check cache first
        if (modelCache.has(modelName)) {
            console.log(`Using cached model: ${modelName}`);
            const cachedModel = modelCache.get(modelName).clone();
            cachedModel.userData.type = definition.type;
            resolve(cachedModel);
            return;
        }

        // Load the model
        loader.load(
            definition.path,
            (gltf) => {
                console.log(`Successfully loaded GLTF for ${modelName}`);
                const model = gltf.scene;

                // Apply scale
                model.scale.setScalar(definition.scale);

                // Set userData
                model.userData.type = definition.type;
                model.userData.originalScale = definition.scale;

                // Cache the original
                modelCache.set(modelName, model.clone());

                console.log(`Model ${modelName} ready for use`);
                resolve(model);
            },
            (progress) => {
                const percent = (progress.loaded / progress.total * 100).toFixed(1);
                console.log(`Loading ${modelName}: ${percent}%`);
            },
            (error) => {
                console.error(`Error loading model ${modelName}:`, error);
                console.error(`Failed path: ${definition.path}`);
                reject(error);
            }
        );
    });
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
export function preloadModels(modelNames = ['table', 'chair', 'sofa']) {
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