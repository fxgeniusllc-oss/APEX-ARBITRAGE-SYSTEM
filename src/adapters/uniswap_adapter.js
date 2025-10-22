/**
 * Uniswap V2/V3 DEX Adapter
 * Provides unified interface for interacting with Uniswap protocols
 */

const { ethers } = require('ethers');
const chalk = require('chalk');

/**
 * Uniswap V2 Factory ABI
 */
const UNISWAP_V2_FACTORY_ABI = [
    'function allPairsLength() external view returns (uint)',
    'function allPairs(uint) external view returns (address)',
    'function getPair(address tokenA, address tokenB) external view returns (address pair)',
    'function createPair(address tokenA, address tokenB) external returns (address pair)',
    'function feeTo() external view returns (address)',
    'function feeToSetter() external view returns (address)',
    'event PairCreated(address indexed token0, address indexed token1, address pair, uint)'
];

/**
 * Uniswap V2 Pair ABI
 */
const UNISWAP_V2_PAIR_ABI = [
    'function factory() external view returns (address)',
    'function token0() external view returns (address)',
    'function token1() external view returns (address)',
    'function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
    'function price0CumulativeLast() external view returns (uint)',
    'function price1CumulativeLast() external view returns (uint)',
    'function kLast() external view returns (uint)',
    'function totalSupply() external view returns (uint)',
    'function swap(uint amount0Out, uint amount1Out, address to, bytes calldata data) external',
    'function skim(address to) external',
    'function sync() external'
];

/**
 * Uniswap V2 Router ABI
 */
const UNISWAP_V2_ROUTER_ABI = [
    'function factory() external pure returns (address)',
    'function WETH() external pure returns (address)',
    'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
    'function swapTokensForExactTokens(uint amountOut, uint amountInMax, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
    'function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)',
    'function getAmountsIn(uint amountOut, address[] calldata path) external view returns (uint[] memory amounts)',
    'function quote(uint amountA, uint reserveA, uint reserveB) external pure returns (uint amountB)',
    'function getAmountOut(uint amountIn, uint reserveIn, uint reserveOut) external pure returns (uint amountOut)',
    'function getAmountIn(uint amountOut, uint reserveIn, uint reserveOut) external pure returns (uint amountIn)'
];

/**
 * Uniswap V3 Factory ABI
 */
const UNISWAP_V3_FACTORY_ABI = [
    'function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool)',
    'function createPool(address tokenA, address tokenB, uint24 fee) external returns (address pool)',
    'event PoolCreated(address indexed token0, address indexed token1, uint24 indexed fee, int24 tickSpacing, address pool)'
];

/**
 * Uniswap V3 Pool ABI
 */
const UNISWAP_V3_POOL_ABI = [
    'function token0() external view returns (address)',
    'function token1() external view returns (address)',
    'function fee() external view returns (uint24)',
    'function liquidity() external view returns (uint128)',
    'function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)',
    'function tickSpacing() external view returns (int24)',
    'function swap(address recipient, bool zeroForOne, int256 amountSpecified, uint160 sqrtPriceLimitX96, bytes calldata data) external returns (int256 amount0, int256 amount1)',
    'function observe(uint32[] secondsAgos) external view returns (int56[] tickCumulatives, uint160[] secondsPerLiquidityCumulativeX128s)'
];

/**
 * Uniswap V3 Quoter ABI
 */
const UNISWAP_V3_QUOTER_ABI = [
    'function quoteExactInputSingle(address tokenIn, address tokenOut, uint24 fee, uint256 amountIn, uint160 sqrtPriceLimitX96) external returns (uint256 amountOut)',
    'function quoteExactInput(bytes memory path, uint256 amountIn) external returns (uint256 amountOut)'
];

class UniswapAdapter {
    constructor(provider, config) {
        this.provider = provider;
        this.config = config;
        this.version = config.version || 'v2'; // v2 or v3
        this.factoryContract = null;
        this.routerContract = null;
        this.quoterContract = null;
        this.initialized = false;
    }

    /**
     * Initialize the adapter with contract instances
     */
    async initialize() {
        try {
            if (this.version === 'v2') {
                this.factoryContract = new ethers.Contract(
                    this.config.factory,
                    UNISWAP_V2_FACTORY_ABI,
                    this.provider
                );
                this.routerContract = new ethers.Contract(
                    this.config.router,
                    UNISWAP_V2_ROUTER_ABI,
                    this.provider
                );
            } else if (this.version === 'v3') {
                this.factoryContract = new ethers.Contract(
                    this.config.factory,
                    UNISWAP_V3_FACTORY_ABI,
                    this.provider
                );
                if (this.config.quoter) {
                    this.quoterContract = new ethers.Contract(
                        this.config.quoter,
                        UNISWAP_V3_QUOTER_ABI,
                        this.provider
                    );
                }
            }

            this.initialized = true;
            console.log(chalk.green(`✅ Uniswap ${this.version} adapter initialized`));
        } catch (error) {
            console.log(chalk.red(`❌ Failed to initialize Uniswap adapter: ${error.message}`));
            throw error;
        }
    }

    /**
     * Get pool/pair address for two tokens
     */
    async getPool(token0, token1, fee = null) {
        if (!this.initialized) {
            await this.initialize();
        }

        try {
            if (this.version === 'v2') {
                return await this.factoryContract.getPair(token0, token1);
            } else if (this.version === 'v3') {
                if (!fee) {
                    throw new Error('Fee tier required for Uniswap V3');
                }
                return await this.factoryContract.getPool(token0, token1, fee);
            }
        } catch (error) {
            console.log(chalk.yellow(`⚠️  Failed to get pool: ${error.message}`));
            return null;
        }
    }

    /**
     * Get all pairs/pools
     */
    async getAllPools(limit = 100) {
        if (!this.initialized) {
            await this.initialize();
        }

        const pools = [];

        try {
            if (this.version === 'v2') {
                const pairCount = await this.factoryContract.allPairsLength();
                const totalPairs = Number(pairCount);
                const startIndex = Math.max(0, totalPairs - limit);

                for (let i = startIndex; i < Math.min(startIndex + limit, totalPairs); i++) {
                    const pairAddress = await this.factoryContract.allPairs(i);
                    const pair = new ethers.Contract(pairAddress, UNISWAP_V2_PAIR_ABI, this.provider);

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
                        type: 'uniswap-v2'
                    });
                }
            }
            // V3 requires different approach (event-based or using subgraph)
        } catch (error) {
            console.log(chalk.red(`❌ Error fetching pools: ${error.message}`));
        }

        return pools;
    }

    /**
     * Get reserves for a pool
     */
    async getReserves(poolAddress) {
        if (this.version === 'v2') {
            const pair = new ethers.Contract(poolAddress, UNISWAP_V2_PAIR_ABI, this.provider);
            const reserves = await pair.getReserves();
            return {
                reserve0: reserves[0].toString(),
                reserve1: reserves[1].toString(),
                blockTimestampLast: reserves[2]
            };
        } else if (this.version === 'v3') {
            const pool = new ethers.Contract(poolAddress, UNISWAP_V3_POOL_ABI, this.provider);
            const [liquidity, slot0] = await Promise.all([
                pool.liquidity(),
                pool.slot0()
            ]);
            return {
                liquidity: liquidity.toString(),
                sqrtPriceX96: slot0[0].toString(),
                tick: slot0[1]
            };
        }
    }

    /**
     * Get quote for a swap
     */
    async getAmountOut(amountIn, path) {
        if (!this.initialized) {
            await this.initialize();
        }

        try {
            if (this.version === 'v2' && this.routerContract) {
                const amounts = await this.routerContract.getAmountsOut(amountIn, path);
                return amounts[amounts.length - 1];
            } else if (this.version === 'v3' && this.quoterContract) {
                // For V3, we need to encode the path with fees
                // Simplified version - actual implementation needs proper path encoding
                return null;
            }
        } catch (error) {
            console.log(chalk.yellow(`⚠️  Failed to get quote: ${error.message}`));
            return null;
        }
    }

    /**
     * Execute a swap
     */
    async swap(amountIn, amountOutMin, path, to, deadline) {
        if (!this.initialized) {
            await this.initialize();
        }

        try {
            if (this.version === 'v2' && this.routerContract) {
                const tx = await this.routerContract.swapExactTokensForTokens(
                    amountIn,
                    amountOutMin,
                    path,
                    to,
                    deadline
                );
                return await tx.wait();
            }
        } catch (error) {
            console.log(chalk.red(`❌ Swap failed: ${error.message}`));
            throw error;
        }
    }

    /**
     * Get pool info
     */
    async getPoolInfo(poolAddress) {
        try {
            if (this.version === 'v2') {
                const pair = new ethers.Contract(poolAddress, UNISWAP_V2_PAIR_ABI, this.provider);
                const [token0, token1, reserves, totalSupply] = await Promise.all([
                    pair.token0(),
                    pair.token1(),
                    pair.getReserves(),
                    pair.totalSupply()
                ]);

                return {
                    address: poolAddress,
                    token0,
                    token1,
                    reserve0: reserves[0].toString(),
                    reserve1: reserves[1].toString(),
                    totalSupply: totalSupply.toString(),
                    type: 'uniswap-v2'
                };
            } else if (this.version === 'v3') {
                const pool = new ethers.Contract(poolAddress, UNISWAP_V3_POOL_ABI, this.provider);
                const [token0, token1, fee, liquidity, slot0] = await Promise.all([
                    pool.token0(),
                    pool.token1(),
                    pool.fee(),
                    pool.liquidity(),
                    pool.slot0()
                ]);

                return {
                    address: poolAddress,
                    token0,
                    token1,
                    fee,
                    liquidity: liquidity.toString(),
                    sqrtPriceX96: slot0[0].toString(),
                    tick: slot0[1],
                    type: 'uniswap-v3'
                };
            }
        } catch (error) {
            console.log(chalk.red(`❌ Failed to get pool info: ${error.message}`));
            return null;
        }
    }

    /**
     * Calculate price from reserves (V2)
     */
    calculatePrice(reserve0, reserve1, decimals0 = 18, decimals1 = 18) {
        if (this.version !== 'v2') {
            throw new Error('calculatePrice only applicable for V2');
        }

        const r0 = BigInt(reserve0);
        const r1 = BigInt(reserve1);
        
        if (r0 === 0n || r1 === 0n) {
            return 0;
        }

        const price = Number(r1) / Number(r0) * Math.pow(10, decimals0 - decimals1);
        return price;
    }
}

module.exports = { UniswapAdapter };
