/**
 * SDK-based Pool Loader
 * Loads pool data using DEX SDKs for advanced protocols like Uniswap V3
 * This provides more accurate data than direct contract calls
 */

import { ethers } from 'ethers';
import chalk from 'chalk';

/**
 * Uniswap V3 Factory ABI (comprehensive)
 */
const UNISWAP_V3_FACTORY_ABI = [
    'function owner() external view returns (address)',
    'function feeAmountTickSpacing(uint24) external view returns (int24)',
    'function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool)',
    'function createPool(address tokenA, address tokenB, uint24 fee) external returns (address pool)',
    'function setOwner(address _owner) external',
    'function enableFeeAmount(uint24 fee, int24 tickSpacing) external',
    'event OwnerChanged(address indexed oldOwner, address indexed newOwner)',
    'event PoolCreated(address indexed token0, address indexed token1, uint24 indexed fee, int24 tickSpacing, address pool)',
    'event FeeAmountEnabled(uint24 indexed fee, int24 indexed tickSpacing)'
];

/**
 * Uniswap V3 Pool ABI (comprehensive)
 */
const UNISWAP_V3_POOL_ABI = [
    'function factory() external view returns (address)',
    'function token0() external view returns (address)',
    'function token1() external view returns (address)',
    'function fee() external view returns (uint24)',
    'function tickSpacing() external view returns (int24)',
    'function maxLiquidityPerTick() external view returns (uint128)',
    'function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)',
    'function feeGrowthGlobal0X128() external view returns (uint256)',
    'function feeGrowthGlobal1X128() external view returns (uint256)',
    'function protocolFees() external view returns (uint128 token0, uint128 token1)',
    'function liquidity() external view returns (uint128)',
    'function ticks(int24 tick) external view returns (uint128 liquidityGross, int128 liquidityNet, uint256 feeGrowthOutside0X128, uint256 feeGrowthOutside1X128, int56 tickCumulativeOutside, uint160 secondsPerLiquidityOutsideX128, uint32 secondsOutside, bool initialized)',
    'function tickBitmap(int16 wordPosition) external view returns (uint256)',
    'function positions(bytes32 key) external view returns (uint128 liquidity, uint256 feeGrowthInside0LastX128, uint256 feeGrowthInside1LastX128, uint128 tokensOwed0, uint128 tokensOwed1)',
    'function observations(uint256 index) external view returns (uint32 blockTimestamp, int56 tickCumulative, uint160 secondsPerLiquidityCumulativeX128, bool initialized)',
    'function initialize(uint160 sqrtPriceX96) external',
    'function mint(address recipient, int24 tickLower, int24 tickUpper, uint128 amount, bytes calldata data) external returns (uint256 amount0, uint256 amount1)',
    'function collect(address recipient, int24 tickLower, int24 tickUpper, uint128 amount0Requested, uint128 amount1Requested) external returns (uint128 amount0, uint128 amount1)',
    'function burn(int24 tickLower, int24 tickUpper, uint128 amount) external returns (uint256 amount0, uint256 amount1)',
    'function swap(address recipient, bool zeroForOne, int256 amountSpecified, uint160 sqrtPriceLimitX96, bytes calldata data) external returns (int256 amount0, int256 amount1)',
    'function flash(address recipient, uint256 amount0, uint256 amount1, bytes calldata data) external',
    'function increaseObservationCardinalityNext(uint16 observationCardinalityNext) external',
    'function collectProtocol(address recipient, uint128 amount0Requested, uint128 amount1Requested) external returns (uint128 amount0, uint128 amount1)',
    'function setFeeProtocol(uint8 feeProtocol0, uint8 feeProtocol1) external',
    'event Initialize(uint160 sqrtPriceX96, int24 tick)',
    'event Mint(address sender, address indexed owner, int24 indexed tickLower, int24 indexed tickUpper, uint128 amount, uint256 amount0, uint256 amount1)',
    'event Collect(address indexed owner, address recipient, int24 indexed tickLower, int24 indexed tickUpper, uint128 amount0, uint128 amount1)',
    'event Burn(address indexed owner, int24 indexed tickLower, int24 indexed tickUpper, uint128 amount, uint256 amount0, uint256 amount1)',
    'event Swap(address indexed sender, address indexed recipient, int256 amount0, int256 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick)',
    'event Flash(address indexed sender, address indexed recipient, uint256 amount0, uint256 amount1, uint256 paid0, uint256 paid1)',
    'event IncreaseObservationCardinalityNext(uint16 observationCardinalityNextOld, uint16 observationCardinalityNextNew)',
    'event SetFeeProtocol(uint8 feeProtocol0Old, uint8 feeProtocol1Old, uint8 feeProtocol0New, uint8 feeProtocol1New)',
    'event CollectProtocol(address indexed sender, address indexed recipient, uint128 amount0, uint128 amount1)'
];

/**
 * Uniswap V3 Quoter ABI (comprehensive)
 */
const UNISWAP_V3_QUOTER_ABI = [
    'function quoteExactInputSingle(address tokenIn, address tokenOut, uint24 fee, uint256 amountIn, uint160 sqrtPriceLimitX96) external returns (uint256 amountOut)',
    'function quoteExactInput(bytes memory path, uint256 amountIn) external returns (uint256 amountOut)',
    'function quoteExactOutputSingle(address tokenIn, address tokenOut, uint24 fee, uint256 amountOut, uint160 sqrtPriceLimitX96) external returns (uint256 amountIn)',
    'function quoteExactOutput(bytes memory path, uint256 amountOut) external returns (uint256 amountIn)'
];

/**
 * Uniswap V3 Router ABI (comprehensive)
 */
const UNISWAP_V3_ROUTER_ABI = [
    'function exactInputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96) params) external payable returns (uint256 amountOut)',
    'function exactInput(tuple(bytes path, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum) params) external payable returns (uint256 amountOut)',
    'function exactOutputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountOut, uint256 amountInMaximum, uint160 sqrtPriceLimitX96) params) external payable returns (uint256 amountIn)',
    'function exactOutput(tuple(bytes path, address recipient, uint256 deadline, uint256 amountOut, uint256 amountInMaximum) params) external payable returns (uint256 amountIn)',
    'function factory() external view returns (address)',
    'function WETH9() external view returns (address)',
    'function refundETH() external payable',
    'function sweepToken(address token, uint256 amountMinimum, address recipient) external payable',
    'function unwrapWETH9(uint256 amountMinimum, address recipient) external payable',
    'function wrapETH(uint256 value) external payable'
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

export {
    loadPoolsFromSDK,
    loadUniswapV3Pools,
    getTokenSymbol,
    calculatePoolTVL,
    filterByLiquidity,
    sortByLiquidity,
    COMMON_TOKENS,
    UNISWAP_V3_FEES
};
