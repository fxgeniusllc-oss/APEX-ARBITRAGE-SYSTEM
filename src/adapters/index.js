/**
 * DEX Adapters Index
 * Central export file for all DEX adapters
 */

const { UniswapAdapter } = require('./uniswap_adapter');
const { SushiSwapAdapter } = require('./sushiswap_adapter');
const { QuickSwapAdapter } = require('./quickswap_adapter');
const { CurveAdapter } = require('./curve_adapter');
const { BalancerAdapter } = require('./balancer_adapter');
const { AaveFlashLoanAdapter } = require('./aave_flashloan_adapter');

/**
 * Adapter Factory - Creates appropriate adapter based on DEX type
 */
class AdapterFactory {
    /**
     * Create an adapter instance
     * @param {string} dexType - Type of DEX (uniswapv2, uniswapv3, sushiswap, etc.)
     * @param {object} provider - Ethers provider instance
     * @param {object} config - DEX configuration
     * @returns {object} Adapter instance
     */
    static createAdapter(dexType, provider, config) {
        switch (dexType.toLowerCase()) {
            case 'uniswapv2':
            case 'uniswap-v2':
                return new UniswapAdapter(provider, { ...config, version: 'v2' });
            
            case 'uniswapv3':
            case 'uniswap-v3':
                return new UniswapAdapter(provider, { ...config, version: 'v3' });
            
            case 'sushiswap':
                return new SushiSwapAdapter(provider, config);
            
            case 'quickswap':
                return new QuickSwapAdapter(provider, config);
            
            case 'curve':
                return new CurveAdapter(provider, config);
            
            case 'balancer':
            case 'balancer-v2':
                return new BalancerAdapter(provider, config);
            
            case 'aave':
            case 'aave-v2':
                return new AaveFlashLoanAdapter(provider, { ...config, version: 'v2' });
            
            case 'aave-v3':
                return new AaveFlashLoanAdapter(provider, { ...config, version: 'v3' });
            
            default:
                throw new Error(`Unsupported DEX type: ${dexType}`);
        }
    }

    /**
     * Get list of supported DEX types
     * @returns {Array<string>} List of supported DEX types
     */
    static getSupportedDexTypes() {
        return [
            'uniswapv2',
            'uniswapv3',
            'sushiswap',
            'quickswap',
            'curve',
            'balancer',
            'aave-v2',
            'aave-v3'
        ];
    }

    /**
     * Check if a DEX type is supported
     * @param {string} dexType - DEX type to check
     * @returns {boolean} True if supported, false otherwise
     */
    static isSupported(dexType) {
        return this.getSupportedDexTypes().includes(dexType.toLowerCase());
    }
}

/**
 * Adapter Manager - Manages multiple adapter instances
 */
class AdapterManager {
    constructor() {
        this.adapters = new Map();
    }

    /**
     * Register an adapter
     * @param {string} name - Adapter name/identifier
     * @param {object} adapter - Adapter instance
     */
    registerAdapter(name, adapter) {
        this.adapters.set(name, adapter);
    }

    /**
     * Get an adapter by name
     * @param {string} name - Adapter name/identifier
     * @returns {object|null} Adapter instance or null
     */
    getAdapter(name) {
        return this.adapters.get(name) || null;
    }

    /**
     * Initialize all registered adapters
     * @returns {Promise<Object>} Results of initialization
     */
    async initializeAll() {
        const results = {};
        
        for (const [name, adapter] of this.adapters.entries()) {
            try {
                await adapter.initialize();
                results[name] = { success: true };
            } catch (error) {
                results[name] = { success: false, error: error.message };
            }
        }
        
        return results;
    }

    /**
     * Get all adapter names
     * @returns {Array<string>} List of adapter names
     */
    getAdapterNames() {
        return Array.from(this.adapters.keys());
    }

    /**
     * Check if an adapter is registered
     * @param {string} name - Adapter name
     * @returns {boolean} True if registered, false otherwise
     */
    hasAdapter(name) {
        return this.adapters.has(name);
    }

    /**
     * Remove an adapter
     * @param {string} name - Adapter name
     * @returns {boolean} True if removed, false if not found
     */
    removeAdapter(name) {
        return this.adapters.delete(name);
    }

    /**
     * Clear all adapters
     */
    clearAll() {
        this.adapters.clear();
    }
}

module.exports = {
    // Individual adapters
    UniswapAdapter,
    SushiSwapAdapter,
    QuickSwapAdapter,
    CurveAdapter,
    BalancerAdapter,
    AaveFlashLoanAdapter,
    
    // Utilities
    AdapterFactory,
    AdapterManager
};
