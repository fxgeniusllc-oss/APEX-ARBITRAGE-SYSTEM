/**
 * Tests for DEX Adapters
 */

const { test, describe } = require('node:test');
const assert = require('node:assert');
const {
    UniswapAdapter,
    SushiSwapAdapter,
    QuickSwapAdapter,
    CurveAdapter,
    BalancerAdapter,
    AaveFlashLoanAdapter,
    createAdapter,
    UNISWAP_V2_ROUTER_ABI,
    UNISWAP_V3_ROUTER_ABI,
    CURVE_REGISTRY_ABI,
    CURVE_POOL_ABI,
    BALANCER_VAULT_ABI,
    AAVE_V3_POOL_ABI
} = require('../src/adapters/index');

describe('Adapter ABIs', () => {
    test('Uniswap V2 Router ABI should be defined', () => {
        assert.ok(Array.isArray(UNISWAP_V2_ROUTER_ABI));
        assert.ok(UNISWAP_V2_ROUTER_ABI.length > 10);
    });

    test('Uniswap V3 Router ABI should be defined', () => {
        assert.ok(Array.isArray(UNISWAP_V3_ROUTER_ABI));
        assert.ok(UNISWAP_V3_ROUTER_ABI.length > 0);
    });

    test('Curve Registry ABI should be defined', () => {
        assert.ok(Array.isArray(CURVE_REGISTRY_ABI));
        assert.ok(CURVE_REGISTRY_ABI.length > 5);
    });

    test('Curve Pool ABI should be defined', () => {
        assert.ok(Array.isArray(CURVE_POOL_ABI));
        assert.ok(CURVE_POOL_ABI.length > 5);
    });

    test('Balancer Vault ABI should be defined', () => {
        assert.ok(Array.isArray(BALANCER_VAULT_ABI));
        assert.ok(BALANCER_VAULT_ABI.length > 5);
    });

    test('Aave V3 Pool ABI should be defined', () => {
        assert.ok(Array.isArray(AAVE_V3_POOL_ABI));
        assert.ok(AAVE_V3_POOL_ABI.length > 10);
    });
});

describe('Adapter Classes', () => {
    test('UniswapAdapter should be a class', () => {
        assert.strictEqual(typeof UniswapAdapter, 'function');
        assert.ok(UniswapAdapter.prototype);
    });

    test('SushiSwapAdapter should be a class', () => {
        assert.strictEqual(typeof SushiSwapAdapter, 'function');
        assert.ok(SushiSwapAdapter.prototype);
    });

    test('QuickSwapAdapter should be a class', () => {
        assert.strictEqual(typeof QuickSwapAdapter, 'function');
        assert.ok(QuickSwapAdapter.prototype);
    });

    test('CurveAdapter should be a class', () => {
        assert.strictEqual(typeof CurveAdapter, 'function');
        assert.ok(CurveAdapter.prototype);
    });

    test('BalancerAdapter should be a class', () => {
        assert.strictEqual(typeof BalancerAdapter, 'function');
        assert.ok(BalancerAdapter.prototype);
    });

    test('AaveFlashLoanAdapter should be a class', () => {
        assert.strictEqual(typeof AaveFlashLoanAdapter, 'function');
        assert.ok(AaveFlashLoanAdapter.prototype);
    });
});

describe('Adapter Factory', () => {
    test('createAdapter should be a function', () => {
        assert.strictEqual(typeof createAdapter, 'function');
    });

    test('createAdapter should throw for unknown DEX type', () => {
        assert.throws(
            () => createAdapter('unknown-dex', null, {}),
            /Unknown DEX type/
        );
    });
});

describe('Adapter Instantiation', () => {
    const mockProvider = {
        getNetwork: async () => ({ chainId: 1n })
    };

    const mockConfigV2 = {
        router: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
        factory: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
        type: 'uniswap-v2'
    };

    const mockConfigV3 = {
        router: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
        quoter: '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6',
        factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
        type: 'uniswap-v3'
    };

    test('UniswapAdapter V2 can be instantiated', () => {
        const adapter = new UniswapAdapter(mockProvider, mockConfigV2);
        assert.ok(adapter);
        assert.strictEqual(adapter.version, 'v2');
    });

    test('UniswapAdapter V3 can be instantiated', () => {
        const adapter = new UniswapAdapter(mockProvider, mockConfigV3);
        assert.ok(adapter);
        assert.strictEqual(adapter.version, 'v3');
    });

    test('SushiSwapAdapter can be instantiated', () => {
        const adapter = new SushiSwapAdapter(mockProvider, mockConfigV2);
        assert.ok(adapter);
        assert.ok(adapter.router);
    });

    test('QuickSwapAdapter can be instantiated', () => {
        const adapter = new QuickSwapAdapter(mockProvider, mockConfigV2);
        assert.ok(adapter);
        assert.ok(adapter.router);
    });

    test('CurveAdapter can be instantiated', () => {
        const curveConfig = {
            registry: '0x90E00ACe148ca3b23Ac1bC8C240C2a7Dd9c2d7f5'
        };
        const adapter = new CurveAdapter(mockProvider, curveConfig);
        assert.ok(adapter);
        assert.ok(adapter.registry);
    });

    test('BalancerAdapter can be instantiated', () => {
        const balancerConfig = {
            vault: '0xBA12222222228d8Ba445958a75a0704d566BF2C8'
        };
        const adapter = new BalancerAdapter(mockProvider, balancerConfig);
        assert.ok(adapter);
        assert.ok(adapter.vault);
    });

    test('AaveFlashLoanAdapter can be instantiated', () => {
        const aaveConfig = {
            pool: '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2'
        };
        const adapter = new AaveFlashLoanAdapter(mockProvider, aaveConfig);
        assert.ok(adapter);
        assert.ok(adapter.pool);
    });
});

describe('Adapter Methods', () => {
    const mockProvider = {
        getNetwork: async () => ({ chainId: 1n })
    };

    const mockConfigV2 = {
        router: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
        factory: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
        type: 'uniswap-v2'
    };

    test('UniswapAdapter has required methods', () => {
        const adapter = new UniswapAdapter(mockProvider, mockConfigV2);
        assert.ok(typeof adapter.getAmountsOut === 'function');
        assert.ok(typeof adapter.swapExactTokensForTokens === 'function');
        assert.ok(typeof adapter.getFactory === 'function');
        assert.ok(typeof adapter.getWETH === 'function');
    });

    test('SushiSwapAdapter has required methods', () => {
        const adapter = new SushiSwapAdapter(mockProvider, mockConfigV2);
        assert.ok(typeof adapter.getAmountsOut === 'function');
        assert.ok(typeof adapter.swapExactTokensForTokens === 'function');
        assert.ok(typeof adapter.getFactory === 'function');
        assert.ok(typeof adapter.addLiquidity === 'function');
        assert.ok(typeof adapter.removeLiquidity === 'function');
    });

    test('CurveAdapter has required methods', () => {
        const curveConfig = {
            registry: '0x90E00ACe148ca3b23Ac1bC8C240C2a7Dd9c2d7f5'
        };
        const adapter = new CurveAdapter(mockProvider, curveConfig);
        assert.ok(typeof adapter.getPoolCount === 'function');
        assert.ok(typeof adapter.getPoolByIndex === 'function');
        assert.ok(typeof adapter.getQuote === 'function');
        assert.ok(typeof adapter.exchange === 'function');
        assert.ok(typeof adapter.addLiquidity === 'function');
    });

    test('BalancerAdapter has required methods', () => {
        const balancerConfig = {
            vault: '0xBA12222222228d8Ba445958a75a0704d566BF2C8'
        };
        const adapter = new BalancerAdapter(mockProvider, balancerConfig);
        assert.ok(typeof adapter.getPoolTokens === 'function');
        assert.ok(typeof adapter.swap === 'function');
        assert.ok(typeof adapter.batchSwap === 'function');
        assert.ok(typeof adapter.joinPool === 'function');
        assert.ok(typeof adapter.exitPool === 'function');
        assert.ok(typeof adapter.flashLoan === 'function');
    });

    test('AaveFlashLoanAdapter has required methods', () => {
        const aaveConfig = {
            pool: '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2'
        };
        const adapter = new AaveFlashLoanAdapter(mockProvider, aaveConfig);
        assert.ok(typeof adapter.flashLoan === 'function');
        assert.ok(typeof adapter.flashLoanSimple === 'function');
        assert.ok(typeof adapter.getFlashLoanPremiumTotal === 'function');
        assert.ok(typeof adapter.getUserAccountData === 'function');
        assert.ok(typeof adapter.getReservesList === 'function');
    });
});
