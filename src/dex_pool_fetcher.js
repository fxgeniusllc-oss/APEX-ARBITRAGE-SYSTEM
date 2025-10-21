/**
 * APEX Dynamic DEX Pool Fetcher
 * Fetches and caches pool data from multiple DEXs across chains
 * Supports Uniswap V2/V3, SushiSwap, QuickSwap, Balancer, Curve, and more
 */

const { ethers } = require('ethers');
const fs = require('fs').promises;
const path = require('path');
const chalk = require('chalk');
require('dotenv').config();

// Import SDK pool loader
const { loadPoolsFromSDK } = require('./sdk_pool_loader');

/**
 * DEX configurations for supported protocols
 */
const DEX_CONFIGS = {
    polygon: {
        quickswap: {
            factory: '0x5757371414417b8C6CAad45bAeF941aBc7d3Ab32',
            router: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff',
            type: 'uniswap-v2'
        },
        sushiswap: {
            factory: '0xc35DADB65012eC5796536bD9864eD8773aBc74C4',
            router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
            type: 'uniswap-v2'
        },
        uniswapv3: {
            factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
            router: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
            quoter: '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6',
            type: 'uniswap-v3'
        },
        balancer: {
            vault: '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
            type: 'balancer-v2'
        },
        curve: {
            registry: '0x094d12e5b541784701FD8d65F11fc0598FBC6332',
            type: 'curve'
        }
    },
    ethereum: {
        uniswapv2: {
            factory: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
            router: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
            type: 'uniswap-v2'
        },
        uniswapv3: {
            factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
            router: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
            quoter: '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6',
            type: 'uniswap-v3'
        },
        sushiswap: {
            factory: '0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac',
            router: '0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F',
            type: 'uniswap-v2'
        },
        balancer: {
            vault: '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
            type: 'balancer-v2'
        }
    },
    arbitrum: {
        uniswapv3: {
            factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
            router: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
            quoter: '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6',
            type: 'uniswap-v3'
        },
        sushiswap: {
            factory: '0xc35DADB65012eC5796536bD9864eD8773aBc74C4',
            router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
            type: 'uniswap-v2'
        },
        balancer: {
            vault: '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
            type: 'balancer-v2'
        }
    }
};

/**
 * Uniswap V2 Factory ABI (minimal)
 */
const UNISWAP_V2_FACTORY_ABI = [
    'function allPairsLength() external view returns (uint)',
    'function allPairs(uint) external view returns (address)',
    'function getPair(address tokenA, address tokenB) external view returns (address pair)'
];

/**
 * Uniswap V2 Pair ABI (minimal)
 */
const UNISWAP_V2_PAIR_ABI = [
    'function token0() external view returns (address)',
    'function token1() external view returns (address)',
    'function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
    'function totalSupply() external view returns (uint)'
];

/**
 * Balancer Vault ABI (minimal)
 */
const BALANCER_VAULT_ABI = [
    'function getPoolTokens(bytes32 poolId) external view returns (address[] tokens, uint256[] balances, uint256 lastChangeBlock)'
];

class DexPoolFetcher {
    constructor() {
        this.providers = {};
        this.poolCache = new Map();
        this.lastUpdate = new Map();
        this.cacheExpiry = 300000; // 5 minutes
        this.isRunning = false;
        this.stats = {
            totalPools: 0,
            lastFetchTime: 0,
            fetchCount: 0,
            errors: 0
        };
    }

    /**
     * Initialize providers for all configured chains
     */
    async initialize() {
        console.log(chalk.cyan('🔗 Initializing DEX Pool Fetcher...'));

        // Initialize providers for each chain
        const chains = ['polygon', 'ethereum', 'arbitrum'];
        
        for (const chain of chains) {
            const rpcVar = `${chain.toUpperCase()}_RPC_URL`;
            const rpcUrl = process.env[rpcVar];
            
            if (!rpcUrl) {
                console.log(chalk.yellow(`⚠️  ${chain}: No RPC URL found, skipping`));
                continue;
            }

            try {
                this.providers[chain] = new ethers.JsonRpcProvider(rpcUrl);
                const network = await this.providers[chain].getNetwork();
                console.log(chalk.green(`✅ ${chain}: Connected (Chain ID: ${network.chainId})`));
            } catch (error) {
                console.log(chalk.red(`❌ ${chain}: Connection failed - ${error.message}`));
            }
        }

        console.log(chalk.green('✅ DEX Pool Fetcher initialized'));
    }

    /**
     * Fetch pools from Uniswap V2-style DEXs
     */
    async fetchUniswapV2Pools(chain, dexName, config, limit = 100) {
        const provider = this.providers[chain];
        if (!provider) {
            console.log(chalk.yellow(`⚠️  No provider for ${chain}`));
            return [];
        }

        try {
            const factory = new ethers.Contract(config.factory, UNISWAP_V2_FACTORY_ABI, provider);
            const pairCount = await factory.allPairsLength();
            const totalPairs = Number(pairCount);

            console.log(chalk.cyan(`📊 ${dexName} on ${chain}: ${totalPairs} pairs found`));

            const pools = [];
            const batchSize = Math.min(limit, 50);
            
            // Fetch most recent pairs (they tend to have better liquidity)
            const startIndex = Math.max(0, totalPairs - limit);
            
            for (let i = startIndex; i < Math.min(startIndex + limit, totalPairs); i += batchSize) {
                const batch = [];
                const end = Math.min(i + batchSize, Math.min(startIndex + limit, totalPairs));
                
                for (let j = i; j < end; j++) {
                    batch.push(factory.allPairs(j));
                }

                const pairAddresses = await Promise.all(batch);
                
                for (const pairAddress of pairAddresses) {
                    const pair = new ethers.Contract(pairAddress, UNISWAP_V2_PAIR_ABI, provider);
                    
                    try {
                        const [token0, token1, reserves] = await Promise.all([
                            pair.token0(),
                            pair.token1(),
                            pair.getReserves()
                        ]);

                        pools.push({
                            address: pairAddress,
                            token0,
                            token1,
                            reserve0: reserves[0].toString(),
                            reserve1: reserves[1].toString(),
                            dex: dexName,
                            chain,
                            type: 'uniswap-v2',
                            timestamp: Date.now()
                        });
                    } catch (error) {
                        // Skip invalid pairs
                        continue;
                    }
                }
            }

            return pools;
        } catch (error) {
            console.log(chalk.red(`❌ Error fetching ${dexName} pools: ${error.message}`));
            this.stats.errors++;
            return [];
        }
    }

    /**
     * Fetch pools from all configured DEXs
     */
    async fetchAllPools() {
        console.log(chalk.cyan('🔄 Fetching pools from all DEXs...'));
        const startTime = Date.now();

        const allPools = [];

        for (const [chain, dexes] of Object.entries(DEX_CONFIGS)) {
            if (!this.providers[chain]) {
                continue;
            }

            for (const [dexName, config] of Object.entries(dexes)) {
                console.log(chalk.blue(`📡 Fetching ${dexName} pools on ${chain}...`));

                try {
                    let pools = [];

                    if (config.type === 'uniswap-v2') {
                        pools = await this.fetchUniswapV2Pools(chain, dexName, config, 100);
                    } else if (config.type === 'uniswap-v3') {
                        // Use SDK loader for Uniswap V3
                        console.log(chalk.blue(`🔧 Using SDK loader for ${dexName}`));
                        try {
                            pools = await loadPoolsFromSDK(chain, dexName, config);
                        } catch (error) {
                            console.log(chalk.yellow(`⚠️  SDK loader failed, skipping ${dexName}`));
                        }
                    } else if (config.type === 'balancer-v2') {
                        console.log(chalk.blue(`🔧 Balancer pools require specialized fetcher`));
                        // Balancer pools handled by Python fetcher
                    }

                    if (pools.length > 0) {
                        allPools.push(...pools);
                        const cacheKey = `${chain}:${dexName}`;
                        this.poolCache.set(cacheKey, pools);
                        this.lastUpdate.set(cacheKey, Date.now());
                        console.log(chalk.green(`✅ Cached ${pools.length} ${dexName} pools`));
                    }
                } catch (error) {
                    console.log(chalk.red(`❌ Error fetching ${dexName}: ${error.message}`));
                    this.stats.errors++;
                }
            }
        }

        const fetchTime = Date.now() - startTime;
        this.stats.totalPools = allPools.length;
        this.stats.lastFetchTime = fetchTime;
        this.stats.fetchCount++;

        console.log(chalk.green(`✅ Fetched ${allPools.length} pools in ${fetchTime}ms`));

        // Save to file for Python integration
        await this.savePools(allPools);

        return allPools;
    }

    /**
     * Get cached pools for a specific DEX/chain
     */
    getCachedPools(chain, dex) {
        const cacheKey = `${chain}:${dex}`;
        const pools = this.poolCache.get(cacheKey);
        const lastUpdate = this.lastUpdate.get(cacheKey);

        if (!pools || !lastUpdate) {
            return null;
        }

        // Check if cache is expired
        if (Date.now() - lastUpdate > this.cacheExpiry) {
            return null;
        }

        return pools;
    }

    /**
     * Save pools to JSON file for Python integration
     */
    async savePools(pools) {
        try {
            const dataDir = path.join(__dirname, '../data');
            await fs.mkdir(dataDir, { recursive: true });

            const filePath = path.join(dataDir, 'dex_pools.json');
            await fs.writeFile(filePath, JSON.stringify({
                pools,
                timestamp: Date.now(),
                stats: this.stats
            }, null, 2));

            console.log(chalk.green(`💾 Saved ${pools.length} pools to ${filePath}`));
        } catch (error) {
            console.log(chalk.red(`❌ Error saving pools: ${error.message}`));
        }
    }

    /**
     * Display statistics
     */
    displayStats() {
        console.log(chalk.cyan('\n📊 DEX Pool Fetcher Statistics:'));
        console.log(chalk.white(`   Total Pools: ${chalk.green(this.stats.totalPools)}`));
        console.log(chalk.white(`   Fetch Count: ${chalk.green(this.stats.fetchCount)}`));
        console.log(chalk.white(`   Last Fetch Time: ${chalk.green(this.stats.lastFetchTime)}ms`));
        console.log(chalk.white(`   Errors: ${chalk.red(this.stats.errors)}`));
        console.log(chalk.white(`   Cache Size: ${chalk.green(this.poolCache.size)} entries`));
    }

    /**
     * Start continuous pool fetching
     */
    async start() {
        console.log(chalk.bold.green('🚀 Starting DEX Pool Fetcher...'));
        
        await this.initialize();
        this.isRunning = true;

        const updateInterval = parseInt(process.env.POOL_UPDATE_INTERVAL) || 300000; // 5 minutes default

        while (this.isRunning) {
            try {
                await this.fetchAllPools();
                this.displayStats();
                
                console.log(chalk.cyan(`⏳ Waiting ${updateInterval / 1000}s before next update...`));
                await new Promise(resolve => setTimeout(resolve, updateInterval));
            } catch (error) {
                console.log(chalk.red(`❌ Error in main loop: ${error.message}`));
                this.stats.errors++;
                await new Promise(resolve => setTimeout(resolve, 10000));
            }
        }
    }

    /**
     * Stop the fetcher
     */
    stop() {
        console.log(chalk.yellow('🛑 Stopping DEX Pool Fetcher...'));
        this.isRunning = false;
    }
}

// Run if executed directly
if (require.main === module) {
    const fetcher = new DexPoolFetcher();
    
    // Handle shutdown signals
    process.on('SIGINT', () => {
        fetcher.stop();
        process.exit(0);
    });

    process.on('SIGTERM', () => {
        fetcher.stop();
        process.exit(0);
    });

    fetcher.start().catch(error => {
        console.error(chalk.red('Fatal error:'), error);
        process.exit(1);
    });
}

module.exports = { DexPoolFetcher };
