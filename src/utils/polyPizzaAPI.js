// src/utils/polyPizzaAPI.js
// Poly.pizza API integration with CORS proxy fallback

// Primary endpoint uses the Vite proxy during development to avoid CORS
const POLY_PIZZA_API_BASE = '/poly-pizza-proxy/api';
// Original absolute base for CORS proxy fallbacks
const ORIGINAL_API_BASE = 'https://poly.pizza/api';

// CORS proxy fallback (when SSL fails)
const CORS_PROXIES = [
    'https://corsproxy.io/?',           // Option 1
    'https://api.allorigins.win/raw?url=',  // Option 2
    'https://cors-anywhere.herokuapp.com/', // Option 3 (requires activation)
];

const SEARCH_CACHE = new Map();
const CACHE_DURATION = 5 * 60 * 1000;

/**
 * Search for 3D models on Poly.pizza with automatic fallback
 * @param {string} keyword - Search term
 * @param {number} limit - Maximum results
 * @returns {Promise<Array>} Array of model objects
 */
export async function searchPolyPizza(keyword, limit = 5) {
    try {
        console.log(`🔍 Poly.pizza: Searching for "${keyword}"`);

        // Check cache first
        const cacheKey = `${keyword}_${limit}`;
        const cached = SEARCH_CACHE.get(cacheKey);

        if (cached && (Date.now() - cached.timestamp < CACHE_DURATION)) {
            console.log(`✅ Using cached results for "${keyword}"`);
            return cached.models;
        }

        // Try direct connection first (via proxy)
        const proxyUrl = `${POLY_PIZZA_API_BASE}/search?q=${encodeURIComponent(keyword)}&limit=${limit}`;
        const absoluteUrl = `${ORIGINAL_API_BASE}/search?q=${encodeURIComponent(keyword)}&limit=${limit}`;

        let models = await tryFetchWithFallback(proxyUrl, absoluteUrl, keyword);

        if (!models || models.length === 0) {
            console.warn(`⚠️ No models found for "${keyword}"`);
            return [];
        }

        console.log(`✅ Found ${models.length} models for "${keyword}"`);

        // Cache results
        SEARCH_CACHE.set(cacheKey, {
            models: models,
            timestamp: Date.now()
        });

        return models;

    } catch (error) {
        console.error(`❌ Poly.pizza search failed for "${keyword}":`, error.message);
        return [];
    }
}

/**
 * Try fetching with automatic CORS proxy fallback
 * @param {string} proxyUrl - Proxy URL (for direct fetch)
 * @param {string} absoluteUrl - Absolute URL (for CORS proxies)
 * @param {string} keyword - Search keyword (for logging)
 * @returns {Promise<Array>} Models array
 */
async function tryFetchWithFallback(proxyUrl, absoluteUrl, keyword) {
    // Attempt 1: Direct fetch via proxy
    try {
        console.log(`📡 Attempt 1: Proxy fetch`);
        const response = await fetch(proxyUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            },
            // Add timeout
            signal: AbortSignal.timeout(5000)
        });

        if (response.ok) {
            const data = await response.json();
            console.log(`✅ Proxy fetch successful`);
            return data.models || data.results || [];
        } else {
            console.warn(`⚠️ Proxy fetch failed: ${response.status}`);
        }
    } catch (directError) {
        console.warn(`⚠️ Proxy fetch error: ${directError.message}`);
    }

    // Attempt 2-4: Try CORS proxies
    for (let i = 0; i < CORS_PROXIES.length; i++) {
        try {
            const proxy = CORS_PROXIES[i];
            const proxiedUrl = proxy + encodeURIComponent(absoluteUrl);

            console.log(`📡 Attempt ${i + 2}: Using CORS proxy ${i + 1}`);

            const response = await fetch(proxiedUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                },
                signal: AbortSignal.timeout(5000)
            });

            if (response.ok) {
                const data = await response.json();
                console.log(`✅ CORS proxy ${i + 1} successful`);
                return data.models || data.results || [];
            }
        } catch (proxyError) {
            console.warn(`⚠️ CORS proxy ${i + 1} failed: ${proxyError.message}`);
        }
    }

    // All attempts failed
    console.error(`❌ All fetch attempts failed for "${keyword}"`);
    return [];
}

/**
 * Get the best matching model from search results
 */
export function getBestMatch(models, keyword) {
    if (!models || models.length === 0) {
        console.warn(`No models to match for "${keyword}"`);
        return null;
    }

    const keywordLower = keyword.toLowerCase();

    const scoredModels = models.map((model, index) => {
        const nameLower = (model.name || model.title || '').toLowerCase();
        let score = 0;

        if (nameLower === keywordLower) score += 100;
        if (nameLower.startsWith(keywordLower)) score += 50;
        if (nameLower.includes(keywordLower)) score += 30;

        const keywordRegex = new RegExp(`\\b${keywordLower}\\b`, 'i');
        if (keywordRegex.test(nameLower)) score += 20;

        if (index === 0) score += 10;

        return { ...model, relevanceScore: score };
    });

    scoredModels.sort((a, b) => b.relevanceScore - a.relevanceScore);

    const bestMatch = scoredModels[0];
    console.log(`🎯 Best match: "${bestMatch.name}" (score: ${bestMatch.relevanceScore})`);

    return bestMatch;
}

/**
 * Get multiple model suggestions
 */
export async function getModelSuggestions(keyword, count = 3) {
    const models = await searchPolyPizza(keyword, count);
    return models.slice(0, count);
}

/**
 * Test Poly.pizza connectivity
 */
export async function testPolyPizzaConnection() {
    try {
        const proxyUrl = `${POLY_PIZZA_API_BASE}/search?q=cube&limit=1`;
        const absoluteUrl = `${ORIGINAL_API_BASE}/search?q=cube&limit=1`;
        const models = await tryFetchWithFallback(proxyUrl, absoluteUrl, 'cube');
        return models && models.length > 0;
    } catch (error) {
        console.error('Poly.pizza connection test failed:', error);
        return false;
    }
}

/**
 * Clear search cache
 */
export function clearSearchCache() {
    SEARCH_CACHE.clear();
    console.log('🗑️ Poly.pizza search cache cleared');
}