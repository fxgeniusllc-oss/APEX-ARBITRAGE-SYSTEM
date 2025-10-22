/**
 * APEX System Configuration
 * Centralized configuration management for entire system
 * Loads and validates all environment variables
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables from .env file
dotenv.config();

/**
 * Helper function to get required environment variable
 * @param {string} key - Environment variable key
 * @param {string} defaultValue - Default value if not set
 * @returns {string} - Environment variable value
 */
function getEnv(key, defaultValue = undefined) {
    const value = process.env[key];
    if (value === undefined && defaultValue === undefined) {
        console.warn(`⚠️  Environment variable ${key} is not set`);
    }
    return value || defaultValue;
}

/**
 * Helper function to get required environment variable with validation
 * @param {string} key - Environment variable key
 * @throws {Error} - If variable is not set
 * @returns {string} - Environment variable value
 */
function getRequiredEnv(key) {
    const value = process.env[key];
    if (!value) {
        throw new Error(`Required environment variable ${key} is not set. Please check your .env file.`);
    }
    return value;
}

/**
 * Helper function to parse boolean environment variable
 * @param {string} key - Environment variable key
 * @param {boolean} defaultValue - Default value if not set
 * @returns {boolean} - Parsed boolean value
 */
function getBoolEnv(key, defaultValue = false) {
    const value = process.env[key];
    if (value === undefined) return defaultValue;
    return value.toLowerCase() === 'true' || value === '1';
}

/**
 * Helper function to parse integer environment variable
 * @param {string} key - Environment variable key
 * @param {number} defaultValue - Default value if not set
 * @returns {number} - Parsed integer value
 */
function getIntEnv(key, defaultValue = 0) {
    const value = process.env[key];
    if (value === undefined) return defaultValue;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Helper function to parse float environment variable
 * @param {string} key - Environment variable key
 * @param {number} defaultValue - Default value if not set
 * @returns {number} - Parsed float value
 */
function getFloatEnv(key, defaultValue = 0.0) {
    const value = process.env[key];
    if (value === undefined) return defaultValue;
    const parsed = parseFloat(value);
    return isNaN(parsed) ? defaultValue : parsed;
}

// Execution Mode Configuration
export const MODE = {
    LIVE: 'LIVE',
    DEV: 'DEV',
    SIM: 'SIM'
};

export const CURRENT_MODE = (getEnv('MODE', 'DEV')).toUpperCase();

// Validate mode
if (!Object.values(MODE).includes(CURRENT_MODE)) {
    throw new Error(`Invalid MODE: ${CURRENT_MODE}. Must be one of: LIVE, DEV, SIM`);
}

// Mode descriptions for clarity
export const MODE_DESCRIPTIONS = {
    [MODE.LIVE]: 'LIVE MODE - Executes real arbitrage transactions on-chain (PRODUCTION)',
    [MODE.DEV]: 'DEV MODE - Runs all logic with real data but simulates transactions (dry-run)',
    [MODE.SIM]: 'SIM MODE - Simulation mode for backtesting and strategy testing with real market data'
};

// Network/Chain Configuration
export const CHAINS = {
    POLYGON: {
        name: 'Polygon',
        chainId: 137,
        nativeCurrency: 'MATIC',
        rpcUrl: getEnv('POLYGON_RPC_URL'),
        wssUrl: getEnv('POLYGON_WSS_URL'),
        explorerUrl: 'https://polygonscan.com'
    },
    ETHEREUM: {
        name: 'Ethereum',
        chainId: 1,
        nativeCurrency: 'ETH',
        rpcUrl: getEnv('ETHEREUM_RPC_URL'),
        wssUrl: getEnv('ETHEREUM_WSS_URL'),
        explorerUrl: 'https://etherscan.io'
    },
    ARBITRUM: {
        name: 'Arbitrum',
        chainId: 42161,
        nativeCurrency: 'ETH',
        rpcUrl: getEnv('ARBITRUM_RPC_URL'),
        explorerUrl: 'https://arbiscan.io'
    },
    OPTIMISM: {
        name: 'Optimism',
        chainId: 10,
        nativeCurrency: 'ETH',
        rpcUrl: getEnv('OPTIMISM_RPC_URL'),
        explorerUrl: 'https://optimistic.etherscan.io'
    },
    BASE: {
        name: 'Base',
        chainId: 8453,
        nativeCurrency: 'ETH',
        rpcUrl: getEnv('BASE_RPC_URL'),
        explorerUrl: 'https://basescan.org'
    },
    BSC: {
        name: 'BSC',
        chainId: 56,
        nativeCurrency: 'BNB',
        rpcUrl: getEnv('BSC_RPC_URL'),
        explorerUrl: 'https://bscscan.com'
    }
};

export const DEXES = {
    POLYGON: [
        {
            name: 'QuickSwap',
            router: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff',
            factory: '0x5757371414417b8C6CAad45bAeF941aBc7d3Ab32',
            type: 'v2',
            fee: 0.003
        },
        {
            name: 'SushiSwap',
            router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
            factory: '0xc35DADB65012eC5796536bD9864eD8773aBc74C4',
            type: 'v2',
            fee: 0.003
        },
        {
            name: 'Uniswap V3',
            router: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
            factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
            type: 'v3',
            fee: 0.003
        },
        {
            name: 'Kyber',
            router: '0x546C79662E028B661dFB4767664d0273184E4dD1',
            type: 'aggregator',
            fee: 0.002
        },
        {
            name: 'DODO',
            router: '0xa222f0c183AFA73a8Bc1AFb48D34C88c9Bf7A174',
            type: 'pmm',
            fee: 0.003
        }
    ],
    ETHEREUM: [
        {
            name: 'Uniswap V2',
            router: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
            factory: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
            type: 'v2',
            fee: 0.003
        },
        {
            name: 'Uniswap V3',
            router: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
            factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
            type: 'v3',
            fee: 0.003
        },
        {
            name: 'SushiSwap',
            router: '0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F',
            factory: '0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac',
            type: 'v2',
            fee: 0.003
        }
    ]
};

export const TOKENS = {
    POLYGON: {
        USDC: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
        USDT: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
        DAI: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063',
        WMATIC: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
        WETH: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
        WBTC: '0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6'
    },
    ETHEREUM: {
        USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
        DAI: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
        WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
        WBTC: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599'
    }
};

export const BALANCER_VAULT = '0xBA12222222228d8Ba445958a75a0704d566BF2C8';

export const ARBITRAGE_ROUTES = [
    {
        id: 'usdc_usdt_2hop',
        tokens: ['USDC', 'USDT', 'USDC'],
        dexes: ['quickswap', 'sushiswap'],
        chain: 'POLYGON',
        type: 'stablecoin',
        priority: 1,
        testAmounts: [500, 1000, 2000, 5000]
    },
    {
        id: 'wmatic_usdc_2hop',
        tokens: ['WMATIC', 'USDC', 'WMATIC'],
        dexes: ['quickswap', 'sushiswap'],
        chain: 'POLYGON',
        type: 'volatile',
        priority: 2,
        testAmounts: [100, 500, 1000]
    },
    {
        id: 'usdc_wmatic_weth_3hop',
        tokens: ['USDC', 'WMATIC', 'WETH', 'USDC'],
        dexes: ['quickswap', 'uniswap_v3', 'sushiswap'],
        chain: 'POLYGON',
        type: 'triangle',
        priority: 2,
        testAmounts: [1000, 2000, 5000]
    },
    {
        id: 'usdc_wmatic_weth_dai_4hop',
        tokens: ['USDC', 'WMATIC', 'WETH', 'DAI', 'USDC'],
        dexes: ['quickswap', 'uniswap_v3', 'sushiswap', 'quickswap'],
        chain: 'POLYGON',
        type: 'complex',
        priority: 3,
        testAmounts: [2000, 5000, 10000]
    }
];

// ML Model Configuration
export const ML_CONFIG = {
    confidenceThreshold: getFloatEnv('ML_CONFIDENCE_THRESHOLD', 0.8),
    enableFiltering: getBoolEnv('ENABLE_ML_FILTERING', true),
    modelPaths: {
        xgboost: getEnv('XGBOOST_MODEL_PATH', 'data/models/xgboost_model.json'),
        onnx: getEnv('ONNX_MODEL_PATH', 'data/models/onnx_model.onnx')
    },
    features: [
        'profit_usd',
        'profit_ratio',
        'route_complexity',
        'gas_estimate',
        'confidence_score',
        'time_of_day',
        'dex_count',
        'amount_size',
        'is_2hop',
        'is_3hop'
    ]
};

// Safety and Execution Parameters
export const SAFETY_CONFIG = {
    minProfitUSD: getFloatEnv('MIN_PROFIT_USD', 5),
    maxGasPriceGwei: getFloatEnv('MAX_GAS_PRICE_GWEI', 100),
    slippageBps: getFloatEnv('SLIPPAGE_BPS', 50),
    maxDailyLossUSD: getFloatEnv('MAX_DAILY_LOSS_USD', 50),
    maxConsecutiveFailures: getIntEnv('MAX_CONSECUTIVE_FAILURES', 5),
    minTimeBetweenTrades: getIntEnv('MIN_TIME_BETWEEN_TRADES', 30000)
};

// System Configuration
export const SYSTEM_CONFIG = {
    scanInterval: getIntEnv('SCAN_INTERVAL', 60000),
    enableCrossChain: getBoolEnv('ENABLE_CROSS_CHAIN', true),
    enableMempoolMonitoring: getBoolEnv('ENABLE_MEMPOOL_MONITORING', true),
    enableMicroRaptorBots: getBoolEnv('ENABLE_MICRO_RAPTOR_BOTS', true),
    raptorBotCount: getIntEnv('RAPTOR_BOT_COUNT', 4),
    rustEngineEnabled: getBoolEnv('RUST_ENGINE_ENABLED', true)
};

// Private Key Configuration (for wallet/transaction signing)
export const WALLET_CONFIG = {
    privateKey: getEnv('PRIVATE_KEY', '')
};

// Hybrid AI Engine Configuration
export const AI_ENGINE_CONFIG = {
    liveTrading: getBoolEnv('LIVE_TRADING', false),
    modelPath: getEnv('AI_MODEL_PATH', './data/models/lstm_omni.onnx'),
    threshold: getFloatEnv('AI_THRESHOLD', 0.78),
    enginePort: getIntEnv('AI_ENGINE_PORT', 8001),
    rustEngineUrl: getEnv('RUST_ENGINE_URL', 'http://localhost:7000')
};

// BloXroute Configuration
export const BLOXROUTE_CONFIG = {
    authToken: getEnv('BLOXROUTE_AUTH_TOKEN', ''),
    gatewayUrl: getEnv('BLOXROUTE_GATEWAY_URL', 'https://api.blxrbdn.com'),
    enabled: getBoolEnv('ENABLE_BLOXROUTE', false)
};

// Merkle Tree Batch Processing Configuration
export const BATCH_PROCESSING_CONFIG = {
    processorAddress: getEnv('BATCH_PROCESSOR_ADDRESS', '0x0000000000000000000000000000000000000000'),
    enabled: getBoolEnv('ENABLE_BATCH_PROCESSING', false),
    minBatchSize: getIntEnv('MIN_BATCH_SIZE', 5),
    maxBatchSize: getIntEnv('MAX_BATCH_SIZE', 50)
};

// Redis Configuration
export const REDIS_CONFIG = {
    host: getEnv('REDIS_HOST', '127.0.0.1'),
    port: getIntEnv('REDIS_PORT', 6379)
};

// Prometheus Metrics Configuration
export const PROMETHEUS_CONFIG = {
    port: getIntEnv('PROMETHEUS_PORT', 9090)
};

// Multi-Chain Bridge Configuration
export const BRIDGE_CONFIG = {
    enableLayerZero: getBoolEnv('ENABLE_LAYER_ZERO_BRIDGE', true),
    enableAcross: getBoolEnv('ENABLE_ACROSS_BRIDGE', true)
};

// Telegram Monitoring & Alerts Configuration
export const TELEGRAM_CONFIG = {
    botToken: getEnv('TELEGRAM_BOT_TOKEN', ''),
    chatId: getEnv('TELEGRAM_CHAT_ID', ''),
    enabled: getBoolEnv('ENABLE_TELEGRAM_ALERTS', false)
};

// MEV Protection Configuration
export const MEV_CONFIG = {
    usePrivateRelay: getBoolEnv('USE_PRIVATE_RELAY', true),
    flashbotsRelayUrl: getEnv('FLASHBOTS_RELAY_URL', 'https://relay.flashbots.net'),
    edenRelayUrl: getEnv('EDEN_RELAY_URL', 'https://api.edennetwork.io/v1/rpc')
};

// Database Configuration
export const DATABASE_CONFIG = {
    path: getEnv('DB_PATH', 'data/apex.db')
};

// Logging Configuration
export const LOGGING_CONFIG = {
    level: getEnv('LOG_LEVEL', 'info'),
    directory: getEnv('LOG_DIR', 'logs')
};

// Mode-aware execution configuration
export const EXECUTION_CONFIG = {
    mode: CURRENT_MODE,
    // All modes collect and process real live DEX data
    collectRealData: true,
    // Only LIVE mode executes actual transactions
    executeTransactions: CURRENT_MODE === MODE.LIVE,
    // DEV and SIM modes simulate transactions
    simulateTransactions: CURRENT_MODE === MODE.DEV || CURRENT_MODE === MODE.SIM,
    // SIM mode can use historical data for backtesting
    allowHistoricalData: CURRENT_MODE === MODE.SIM,
    // Additional safety checks for LIVE mode
    requireConfirmation: CURRENT_MODE === MODE.LIVE,
    // Log all opportunities in DEV/SIM modes for analysis
    logAllOpportunities: CURRENT_MODE !== MODE.LIVE,
    // Dry-run indicator
    dryRun: CURRENT_MODE !== MODE.LIVE
};

/**
 * Check if system should execute real transactions
 * @returns {boolean} True if in LIVE mode, false otherwise
 */
export function shouldExecuteRealTransactions() {
    return EXECUTION_CONFIG.executeTransactions;
}

/**
 * Get execution mode display string
 * @returns {string} Mode display string with description
 */
export function getModeDisplay() {
    const emoji = {
        [MODE.LIVE]: '🔴',
        [MODE.DEV]: '🟡',
        [MODE.SIM]: '🔵'
    };
    return `${emoji[CURRENT_MODE]} ${CURRENT_MODE} MODE - ${MODE_DESCRIPTIONS[CURRENT_MODE]}`;
}

/**
 * Validate that all required configuration is present
 * @throws {Error} If required configuration is missing
 */
export function validateConfig() {
    const errors = [];
    
    // Check RPC URLs for critical chains
    if (!CHAINS.POLYGON.rpcUrl) {
        errors.push('POLYGON_RPC_URL is required');
    }
    if (!CHAINS.ETHEREUM.rpcUrl) {
        errors.push('ETHEREUM_RPC_URL is required');
    }
    
    // Validate MODE
    if (!Object.values(MODE).includes(CURRENT_MODE)) {
        errors.push(`Invalid MODE: ${CURRENT_MODE}. Must be one of: ${Object.values(MODE).join(', ')}`);
    }
    
    // Validate private key in LIVE mode
    if (CURRENT_MODE === MODE.LIVE && !WALLET_CONFIG.privateKey) {
        errors.push('PRIVATE_KEY is required in LIVE mode');
    }
    
    // Validate safety parameters
    if (SAFETY_CONFIG.minProfitUSD < 0) {
        errors.push('MIN_PROFIT_USD must be non-negative');
    }
    if (SAFETY_CONFIG.maxGasPriceGwei <= 0) {
        errors.push('MAX_GAS_PRICE_GWEI must be positive');
    }
    
    if (errors.length > 0) {
        throw new Error(`Configuration validation failed:\n${errors.map(e => `  - ${e}`).join('\n')}`);
    }
    
    return true;
}

/**
 * Get all configuration as a single object (for logging/debugging)
 * Note: Sensitive values are redacted
 * @returns {object} Complete configuration object with sensitive values redacted
 */
export function getConfig() {
    return {
        mode: CURRENT_MODE,
        chains: Object.keys(CHAINS).reduce((acc, key) => {
            acc[key] = {
                ...CHAINS[key],
                rpcUrl: CHAINS[key].rpcUrl ? '***' : undefined,
                wssUrl: CHAINS[key].wssUrl ? '***' : undefined
            };
            return acc;
        }, {}),
        dexes: DEXES,
        tokens: TOKENS,
        ml: ML_CONFIG,
        safety: SAFETY_CONFIG,
        system: SYSTEM_CONFIG,
        ai: {
            ...AI_ENGINE_CONFIG,
            modelPath: AI_ENGINE_CONFIG.modelPath
        },
        bloxroute: {
            ...BLOXROUTE_CONFIG,
            authToken: BLOXROUTE_CONFIG.authToken ? '***' : undefined
        },
        batchProcessing: BATCH_PROCESSING_CONFIG,
        redis: REDIS_CONFIG,
        prometheus: PROMETHEUS_CONFIG,
        bridge: BRIDGE_CONFIG,
        telegram: {
            ...TELEGRAM_CONFIG,
            botToken: TELEGRAM_CONFIG.botToken ? '***' : undefined,
            chatId: TELEGRAM_CONFIG.chatId ? '***' : undefined
        },
        mev: MEV_CONFIG,
        database: DATABASE_CONFIG,
        logging: LOGGING_CONFIG,
        execution: EXECUTION_CONFIG,
        wallet: {
            privateKey: WALLET_CONFIG.privateKey ? '***' : undefined
        }
    };
}

/**
 * Export all configuration modules for easy access
 */
export const CONFIG = {
    MODE,
    CURRENT_MODE,
    MODE_DESCRIPTIONS,
    CHAINS,
    DEXES,
    TOKENS,
    BALANCER_VAULT,
    ARBITRAGE_ROUTES,
    ML_CONFIG,
    SAFETY_CONFIG,
    SYSTEM_CONFIG,
    WALLET_CONFIG,
    AI_ENGINE_CONFIG,
    BLOXROUTE_CONFIG,
    BATCH_PROCESSING_CONFIG,
    REDIS_CONFIG,
    PROMETHEUS_CONFIG,
    BRIDGE_CONFIG,
    TELEGRAM_CONFIG,
    MEV_CONFIG,
    DATABASE_CONFIG,
    LOGGING_CONFIG,
    EXECUTION_CONFIG
};

// Export helper functions
export {
    getEnv,
    getRequiredEnv,
    getBoolEnv,
    getIntEnv,
    getFloatEnv
};
