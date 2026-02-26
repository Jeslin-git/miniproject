// src/test_integration.js
import { spawnObject } from './main.js';

export async function runIntegrationTests() {
    console.log('🧪 Starting Integration Tests...\n');

    const tests = [
        {
            name: 'Local Model Test',
            keyword: 'sofa',
            expectedSource: 'local',
            position: { x: 0, y: 0.5, z: 0 }
        },
        {
            name: 'Poly.pizza Test',
            keyword: 'bookshelf',  // Not in local definitions
            expectedSource: 'poly_pizza',
            position: { x: 2, y: 0.5, z: 0 }
        },
        {
            name: 'Procedural Test',
            keyword: 'table',
            expectedSource: 'procedural',
            position: { x: -2, y: 0.5, z: 0 }
        },
        {
            name: 'Primitive Fallback Test',
            keyword: 'unknown_extinct_creature',
            expectedSource: 'primitive',
            position: { x: 4, y: 0.5, z: 0 }
        }
    ];

    let passed = 0;
    let failed = 0;

    for (const test of tests) {
        console.log(`\n🧪 Running: ${test.name}`);
        console.log(`   Keyword: "${test.keyword}"`);
        console.log(`   Expected source: ${test.expectedSource}`);

        try {
            const obj = await spawnObject(test.keyword, test.position);

            if (!obj) {
                console.error(`❌ FAILED: No object returned`);
                failed++;
                continue;
            }

            const actualSource = obj.userData.sourceType;

            if (actualSource === test.expectedSource) {
                console.log(`✅ PASSED: Source matched (${actualSource})`);
                passed++;
            } else {
                console.error(`❌ FAILED: Expected "${test.expectedSource}" but got "${actualSource}"`);
                failed++;
            }

        } catch (error) {
            console.error(`❌ FAILED: Exception thrown:`, error.message);
            failed++;
        }

        // Wait a bit between tests
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`\n🏁 Test Results:`);
    console.log(`   ✅ Passed: ${passed}/${tests.length}`);
    console.log(`   ❌ Failed: ${failed}/${tests.length}`);

    return { passed, failed, total: tests.length };
}

// Auto-run if in test mode
if (typeof window !== 'undefined' && window.location.search.includes('test=true')) {
    runIntegrationTests();
}
