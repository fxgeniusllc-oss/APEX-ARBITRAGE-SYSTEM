/**
 * APEX System Configuration
 * Centralized configuration management
 */

export const CHAINS = {
    POLYGON: {
        name: 'Polygon',
        chainId: 137,
        nativeCurrency: 'MATIC',
        rpcUrl: process.env.POLYGON_RPC_URL,
        wssUrl: process.env.POLYGON_WSS_URL,
        explorerUrl: 'https://polygonscan.com'
    },
    ETHEREUM: {
        name: 'Ethereum',
        chainId: 1,
        nativeCurrency: 'ETH',
        rpcUrl: process.env.ETHEREUM_RPC_URL,
        wssUrl: process.env.ETHEREUM_WSS_URL,
        explorerUrl: 'https://etherscan.io'
    },
    ARBITRUM: {
        name: 'Arbitrum',
        chainId: 42161,
        nativeCurrency: 'ETH',
        rpcUrl: process.env.ARBITRUM_RPC_URL,
        explorerUrl: 'https://arbiscan.io'
    },
    OPTIMISM: {
        name: 'Optimism',
        chainId: 10,
        nativeCurrency: 'ETH',
        rpcUrl: process.env.OPTIMISM_RPC_URL,
        explorerUrl: 'https://optimistic.etherscan.io'
    },
    BASE: {
        name: 'Base',
        chainId: 8453,
        nativeCurrency: 'ETH',
        rpcUrl: process.env.BASE_RPC_URL,
        explorerUrl: 'https://basescan.org'
    },
    BSC: {
        name: 'BSC',
        chainId: 56,
        nativeCurrency: 'BNB',
        rpcUrl: process.env.BSC_RPC_URL,
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

export const ML_CONFIG = {
    confidenceThreshold: parseFloat(process.env.ML_CONFIDENCE_THRESHOLD) || 0.8,
    enableFiltering: process.env.ENABLE_ML_FILTERING === 'true',
    modelPaths: {
        xgboost: process.env.XGBOOST_MODEL_PATH || 'data/models/xgboost_model.json',
        onnx: process.env.ONNX_MODEL_PATH || 'data/models/onnx_model.onnx'
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

export const SAFETY_CONFIG = {
    minProfitUSD: parseFloat(process.env.MIN_PROFIT_USD) || 5,
    maxGasPriceGwei: parseFloat(process.env.MAX_GAS_PRICE_GWEI) || 100,
    slippageBps: parseFloat(process.env.SLIPPAGE_BPS) || 50,
    // Maximum daily loss allowed, in USD
    maxDailyLossUSD: parseFloat(process.env.MAX_DAILY_LOSS_USD) || 50,
    maxConsecutiveFailures: parseInt(process.env.MAX_CONSECUTIVE_FAILURES) || 5,
    minTimeBetweenTrades: parseInt(process.env.MIN_TIME_BETWEEN_TRADES) || 30000
};

export const SYSTEM_CONFIG = {
    scanInterval: parseInt(process.env.SCAN_INTERVAL) || 60000,
    enableCrossChain: process.env.ENABLE_CROSS_CHAIN === 'true',
    enableMempoolMonitoring: process.env.ENABLE_MEMPOOL_MONITORING === 'true',
    enableMicroRaptorBots: process.env.ENABLE_MICRO_RAPTOR_BOTS === 'true',
    raptorBotCount: parseInt(process.env.RAPTOR_BOT_COUNT) || 4,
    rustEngineEnabled: process.env.RUST_ENGINE_ENABLED !== 'false'
};
