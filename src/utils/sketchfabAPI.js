// src/utils/sketchfabAPI.js
// Sketchfab API integration (more reliable than Poly.pizza)

const SKETCHFAB_API_BASE = 'https://api.sketchfab.com/v3';
const SEARCH_CACHE = new Map();
const CACHE_DURATION = 5 * 60 * 1000;

// Get your free API key from: https://sketchfab.com/settings/password
const API_KEY = import.meta.env.VITE_SKETCHFAB_API_KEY || '';

/**
 * Search Sketchfab for downloadable 3D models
 * @param {string} keyword - Search term
 * @param {number} limit - Max results (default: 5)
 * @returns {Promise<Array>} Array of models
 */
export async function searchSketchfab(keyword, limit = 5) {
    try {
        console.log(`🔍 Sketchfab: Searching for "${keyword}"`);

        // Check cache
        const cacheKey = `${keyword}_${limit}`;
        const cached = SEARCH_CACHE.get(cacheKey);

        if (cached && (Date.now() - cached.timestamp < CACHE_DURATION)) {
            console.log(`✅ Using cached results for "${keyword}"`);
            return cached.models;
        }

        // Build search URL with filters
        const params = new URLSearchParams({
            q: keyword,
            type: 'models',
            downloadable: 'true',  // Only downloadable models
            count: limit,
            sort_by: '-relevance'
        });

        const url = `${SKETCHFAB_API_BASE}/search?${params}`;

        const headers = {
            'Accept': 'application/json'
        };

        if (API_KEY) {
            headers['Authorization'] = `Token ${API_KEY}`;
        }

        const response = await fetch(url, {
            method: 'GET',
            headers: headers
        });

        if (!response.ok) {
            throw new Error(`Sketchfab API returned ${response.status}`);
        }

        const data = await response.json();
        const results = data.results || [];

        console.log(`✅ Found ${results.length} models for "${keyword}"`);

        // Transform to unified format
        const models = results.map(model => ({
            name: model.name,
            downloadUrl: model.uid ? `https://sketchfab.com/models/${model.uid}/download` : null,
            thumbnailUrl: model.thumbnails?.images?.[0]?.url || null,
            author: model.user?.displayName || 'Unknown',
            license: model.license?.label || 'Unknown',
            uid: model.uid,
            viewCount: model.viewCount || 0
        }));

        // Cache results
        SEARCH_CACHE.set(cacheKey, {
            models: models,
            timestamp: Date.now()
        });

        return models;

    } catch (error) {
        console.error(`❌ Sketchfab search failed for "${keyword}":`, error.message);
        return [];
    }
}

/**
 * Get best match from Sketchfab results
 */
export function getBestMatch(models, keyword) {
    if (!models || models.length === 0) return null;

    const keywordLower = keyword.toLowerCase();

    const scoredModels = models.map((model, index) => {
        const nameLower = model.name.toLowerCase();
        let score = 0;

        if (nameLower === keywordLower) score += 100;
        if (nameLower.startsWith(keywordLower)) score += 50;
        if (nameLower.includes(keywordLower)) score += 30;

        // Bonus for popular models
        if (model.viewCount > 1000) score += 10;
        if (index === 0) score += 5;

        return { ...model, relevanceScore: score };
    });

    scoredModels.sort((a, b) => b.relevanceScore - a.relevanceScore);
    return scoredModels[0];
}

export function clearSearchCache() {
    SEARCH_CACHE.clear();
}