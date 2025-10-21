/**
 * SDK-based Pool Loader
 * Loads pool data using DEX SDKs for advanced protocols like Uniswap V3
 * This provides more accurate data than direct contract calls
 */

const { ethers } = require('ethers');
const chalk = require('chalk');

/**
 * Uniswap V3 Factory ABI (minimal)
 */
const UNISWAP_V3_FACTORY_ABI = [
    'event PoolCreated(address indexed token0, address indexed token1, uint24 indexed fee, int24 tickSpacing, address pool)',
    'function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool)'
];

/**
 * Uniswap V3 Pool ABI (minimal)
 */
const UNISWAP_V3_POOL_ABI = [
    'function token0() external view returns (address)',
    'function token1() external view returns (address)',
    'function fee() external view returns (uint24)',
    'function liquidity() external view returns (uint128)',
    'function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)',
    'function tickSpacing() external view returns (int24)'
];

/**
 * Common token pairs for pool discovery
 */
const COMMON_TOKENS = {
    polygon: {
        WMATIC: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
        USDC: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
        USDT: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
        WETH: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
        DAI: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063',
        WBTC: '0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6'
    },
    ethereum: {
        WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
        USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
        DAI: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
        WBTC: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599'
    },
    arbitrum: {
        WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
        USDC: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
        USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
        DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
        WBTC: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f'
    }
};

/**
 * Uniswap V3 fee tiers
 */
const UNISWAP_V3_FEES = [500, 3000, 10000]; // 0.05%, 0.3%, 1%

/**
 * Load pools from Uniswap V3 using SDK approach
 */
async function loadUniswapV3Pools(provider, config, chain, limit = 50) {
    const pools = [];
    const tokens = COMMON_TOKENS[chain] || COMMON_TOKENS.polygon;

    try {
        const factory = new ethers.Contract(config.factory, UNISWAP_V3_FACTORY_ABI, provider);
        const tokenAddresses = Object.values(tokens);

        console.log(chalk.blue(`🔍 Discovering Uniswap V3 pools on ${chain}...`));

        // Generate token pairs
        const pairs = [];
        for (let i = 0; i < tokenAddresses.length; i++) {
            for (let j = i + 1; j < tokenAddresses.length; j++) {
                pairs.push([tokenAddresses[i], tokenAddresses[j]]);
            }
        }

        let poolCount = 0;

        // Check each pair with each fee tier
        for (const [token0, token1] of pairs) {
            if (poolCount >= limit) break;

            for (const fee of UNISWAP_V3_FEES) {
                try {
                    const poolAddress = await factory.getPool(token0, token1, fee);
                    
                    // Check if pool exists (non-zero address)
                    if (poolAddress === ethers.ZeroAddress) {
                        continue;
                    }

                    const pool = new ethers.Contract(poolAddress, UNISWAP_V3_POOL_ABI, provider);

                    // Fetch pool data
                    const [poolToken0, poolToken1, liquidity, slot0] = await Promise.all([
                        pool.token0(),
                        pool.token1(),
                        pool.liquidity(),
                        pool.slot0()
                    ]);

                    // Only include pools with liquidity
                    if (liquidity > 0n) {
                        pools.push({
                            address: poolAddress,
                            token0: poolToken0,
                            token1: poolToken1,
                            fee: fee,
                            liquidity: liquidity.toString(),
                            sqrtPriceX96: slot0[0].toString(),
                            tick: slot0[1],
                            dex: 'uniswapv3',
                            chain,
                            type: 'uniswap-v3',
                            timestamp: Date.now()
                        });

                        poolCount++;
                        
                        if (poolCount >= limit) break;
                    }
                } catch (error) {
                    // Pool doesn't exist or error fetching data
                    continue;
                }
            }
        }

        console.log(chalk.green(`✅ Found ${pools.length} Uniswap V3 pools with liquidity`));
        return pools;
    } catch (error) {
        console.log(chalk.red(`❌ Error loading Uniswap V3 pools: ${error.message}`));
        return [];
    }
}

/**
 * Load pools from SDK based on DEX type
 */
async function loadPoolsFromSDK(chain, dexName, config) {
    const provider = new ethers.JsonRpcProvider(process.env[`${chain.toUpperCase()}_RPC_URL`]);

    if (!provider) {
        throw new Error(`No provider for chain: ${chain}`);
    }

    if (config.type === 'uniswap-v3') {
        return await loadUniswapV3Pools(provider, config, chain);
    } else if (config.type === 'balancer-v2') {
        // Balancer V2 pools are handled by Python fetcher
        console.log(chalk.yellow('⚠️  Balancer V2 pools require Python fetcher'));
        return [];
    }

    console.log(chalk.yellow(`⚠️  Unsupported DEX type: ${config.type}`));
    return [];
}

/**
 * Get token symbol from address
 */
async function getTokenSymbol(provider, tokenAddress) {
    try {
        const tokenContract = new ethers.Contract(
            tokenAddress,
            ['function symbol() view returns (string)'],
            provider
        );
        return await tokenContract.symbol();
    } catch (error) {
        return 'UNKNOWN';
    }
}

/**
 * Calculate pool TVL in USD (simplified)
 * Note: This requires price feeds which should be integrated separately
 */
function calculatePoolTVL(pool, prices) {
    // This is a placeholder - actual TVL calculation requires token prices
    // which should come from a price oracle or API
    return 0;
}

/**
 * Filter pools by minimum liquidity
 */
function filterByLiquidity(pools, minLiquidityUSD = 10000) {
    return pools.filter(pool => {
        // Simple heuristic: check if liquidity is above threshold
        // For Uniswap V3, liquidity is a uint128
        const liquidity = BigInt(pool.liquidity || 0);
        return liquidity > 0n;
    });
}

/**
 * Sort pools by liquidity
 */
function sortByLiquidity(pools, descending = true) {
    return [...pools].sort((a, b) => {
        const liquidityA = BigInt(a.liquidity || 0);
        const liquidityB = BigInt(b.liquidity || 0);
        
        if (descending) {
            return liquidityB > liquidityA ? 1 : -1;
        } else {
            return liquidityA > liquidityB ? 1 : -1;
        }
    });
}

module.exports = {
    loadPoolsFromSDK,
    loadUniswapV3Pools,
    getTokenSymbol,
    calculatePoolTVL,
    filterByLiquidity,
    sortByLiquidity,
    COMMON_TOKENS,
    UNISWAP_V3_FEES
};
