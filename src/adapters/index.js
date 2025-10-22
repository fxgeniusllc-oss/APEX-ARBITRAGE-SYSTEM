/**
 * Adapter Index
 * Central export point for all DEX adapters
 */

const { UniswapAdapter, UNISWAP_V2_ROUTER_ABI, UNISWAP_V3_ROUTER_ABI, UNISWAP_V3_QUOTER_ABI } = require('./uniswap_adapter');
const { SushiSwapAdapter } = require('./sushiswap_adapter');
const { QuickSwapAdapter } = require('./quickswap_adapter');
const { CurveAdapter, CURVE_REGISTRY_ABI, CURVE_POOL_ABI } = require('./curve_adapter');
const { BalancerAdapter, BALANCER_VAULT_ABI, BALANCER_POOL_ABI } = require('./balancer_adapter');
const { AaveFlashLoanAdapter, AAVE_V3_POOL_ABI, AAVE_FLASHLOAN_RECEIVER_ABI } = require('./aave_flashloan_adapter');

/**
 * Create adapter instance based on DEX type
 */
function createAdapter(dexType, provider, config) {
    const adapters = {
        'uniswap-v2': UniswapAdapter,
        'uniswap-v3': UniswapAdapter,
        'sushiswap': SushiSwapAdapter,
        'quickswap': QuickSwapAdapter,
        'curve': CurveAdapter,
        'balancer-v2': BalancerAdapter,
        'aave': AaveFlashLoanAdapter
    };

    const AdapterClass = adapters[dexType];
    if (!AdapterClass) {
        throw new Error(`Unknown DEX type: ${dexType}`);
    }

    return new AdapterClass(provider, config);
}

module.exports = {
    // Adapters
    UniswapAdapter,
    SushiSwapAdapter,
    QuickSwapAdapter,
    CurveAdapter,
    BalancerAdapter,
    AaveFlashLoanAdapter,
    
    // ABIs
    UNISWAP_V2_ROUTER_ABI,
    UNISWAP_V3_ROUTER_ABI,
    UNISWAP_V3_QUOTER_ABI,
    CURVE_REGISTRY_ABI,
    CURVE_POOL_ABI,
    BALANCER_VAULT_ABI,
    BALANCER_POOL_ABI,
    AAVE_V3_POOL_ABI,
    AAVE_FLASHLOAN_RECEIVER_ABI,
    
    // Factory
    createAdapter
};
