/**
 * Tests for Dynamic Pool Fetcher
 */

const { test, describe } = require('node:test');
const assert = require('node:assert');
const { DexPoolFetcher } = require('../src/dex_pool_fetcher');
const { 
    loadPoolsFromSDK, 
    filterByLiquidity, 
    sortByLiquidity,
    COMMON_TOKENS,
    UNISWAP_V3_FEES 
} = require('../src/sdk_pool_loader');

describe('DexPoolFetcher', () => {
    test('should initialize without errors', () => {
        const fetcher = new DexPoolFetcher();
        assert.ok(fetcher);
        assert.strictEqual(fetcher.isRunning, false);
        assert.strictEqual(fetcher.stats.totalPools, 0);
    });

    test('should have correct cache expiry time', () => {
        const fetcher = new DexPoolFetcher();
        assert.strictEqual(fetcher.cacheExpiry, 300000); // 5 minutes
    });

    test('should initialize with empty cache', () => {
        const fetcher = new DexPoolFetcher();
        assert.strictEqual(fetcher.poolCache.size, 0);
        assert.strictEqual(fetcher.lastUpdate.size, 0);
    });

    test('should return null for non-existent cached pools', () => {
        const fetcher = new DexPoolFetcher();
        const cached = fetcher.getCachedPools('polygon', 'quickswap');
        assert.strictEqual(cached, null);
    });

    test('should track statistics correctly', () => {
        const fetcher = new DexPoolFetcher();
        assert.strictEqual(fetcher.stats.fetchCount, 0);
        assert.strictEqual(fetcher.stats.errors, 0);
        assert.strictEqual(fetcher.stats.lastFetchTime, 0);
    });
});

describe('SDK Pool Loader', () => {
    test('should have common tokens defined', () => {
        assert.ok(COMMON_TOKENS);
        assert.ok(COMMON_TOKENS.polygon);
        assert.ok(COMMON_TOKENS.ethereum);
        assert.ok(COMMON_TOKENS.arbitrum);
    });

    test('should have correct token addresses for Polygon', () => {
        const polygon = COMMON_TOKENS.polygon;
        assert.ok(polygon.WMATIC);
        assert.ok(polygon.USDC);
        assert.ok(polygon.USDT);
        assert.strictEqual(polygon.WMATIC, '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270');
    });

    test('should have Uniswap V3 fee tiers defined', () => {
        assert.ok(Array.isArray(UNISWAP_V3_FEES));
        assert.strictEqual(UNISWAP_V3_FEES.length, 3);
        assert.ok(UNISWAP_V3_FEES.includes(500));
        assert.ok(UNISWAP_V3_FEES.includes(3000));
        assert.ok(UNISWAP_V3_FEES.includes(10000));
    });

    test('should filter pools by liquidity', () => {
        const pools = [
            { liquidity: '1000000' },
            { liquidity: '500' },
            { liquidity: '2000000' }
        ];
        
        const filtered = filterByLiquidity(pools, 0);
        assert.strictEqual(filtered.length, 3);
    });

    test('should sort pools by liquidity descending', () => {
        const pools = [
            { liquidity: '1000' },
            { liquidity: '5000' },
            { liquidity: '2000' }
        ];
        
        const sorted = sortByLiquidity(pools, true);
        assert.strictEqual(sorted[0].liquidity, '5000');
        assert.strictEqual(sorted[2].liquidity, '1000');
    });

    test('should sort pools by liquidity ascending', () => {
        const pools = [
            { liquidity: '1000' },
            { liquidity: '5000' },
            { liquidity: '2000' }
        ];
        
        const sorted = sortByLiquidity(pools, false);
        assert.strictEqual(sorted[0].liquidity, '1000');
        assert.strictEqual(sorted[2].liquidity, '5000');
    });

    test('loadPoolsFromSDK should be a function', () => {
        assert.strictEqual(typeof loadPoolsFromSDK, 'function');
    });
});

describe('Integration', () => {
    test('DexPoolFetcher can be instantiated and has required methods', () => {
        const fetcher = new DexPoolFetcher();
        assert.ok(typeof fetcher.initialize === 'function');
        assert.ok(typeof fetcher.fetchAllPools === 'function');
        assert.ok(typeof fetcher.getCachedPools === 'function');
        assert.ok(typeof fetcher.savePools === 'function');
        assert.ok(typeof fetcher.displayStats === 'function');
        assert.ok(typeof fetcher.start === 'function');
        assert.ok(typeof fetcher.stop === 'function');
    });
});
