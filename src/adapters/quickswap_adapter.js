/**
 * QuickSwap DEX Adapter
 * Provides unified interface for interacting with QuickSwap protocol on Polygon
 * QuickSwap is a fork of Uniswap V2 optimized for Polygon
 */

import { ethers } from 'ethers';
import chalk from 'chalk';

/**
 * QuickSwap Factory ABI
 */
const QUICKSWAP_FACTORY_ABI = [
    'function allPairsLength() external view returns (uint)',
    'function allPairs(uint) external view returns (address)',
    'function getPair(address tokenA, address tokenB) external view returns (address pair)',
    'function createPair(address tokenA, address tokenB) external returns (address pair)',
    'function feeTo() external view returns (address)',
    'function feeToSetter() external view returns (address)',
    'function setFeeTo(address) external',
    'function setFeeToSetter(address) external',
    'event PairCreated(address indexed token0, address indexed token1, address pair, uint)'
];

/**
 * QuickSwap Pair ABI
 */
const QUICKSWAP_PAIR_ABI = [
    'function name() external pure returns (string)',
    'function symbol() external pure returns (string)',
    'function decimals() external pure returns (uint8)',
    'function totalSupply() external view returns (uint)',
    'function balanceOf(address owner) external view returns (uint)',
    'function factory() external view returns (address)',
    'function token0() external view returns (address)',
    'function token1() external view returns (address)',
    'function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
    'function price0CumulativeLast() external view returns (uint)',
    'function price1CumulativeLast() external view returns (uint)',
    'function kLast() external view returns (uint)',
    'function mint(address to) external returns (uint liquidity)',
    'function burn(address to) external returns (uint amount0, uint amount1)',
    'function swap(uint amount0Out, uint amount1Out, address to, bytes calldata data) external',
    'function skim(address to) external',
    'function sync() external',
    'event Mint(address indexed sender, uint amount0, uint amount1)',
    'event Burn(address indexed sender, uint amount0, uint amount1, address indexed to)',
    'event Swap(address indexed sender, uint amount0In, uint amount1In, uint amount0Out, uint amount1Out, address indexed to)',
    'event Sync(uint112 reserve0, uint112 reserve1)'
];

/**
 * QuickSwap Router ABI
 */
const QUICKSWAP_ROUTER_ABI = [
    'function factory() external pure returns (address)',
    'function WETH() external pure returns (address)',
    'function addLiquidity(address tokenA, address tokenB, uint amountADesired, uint amountBDesired, uint amountAMin, uint amountBMin, address to, uint deadline) external returns (uint amountA, uint amountB, uint liquidity)',
    'function addLiquidityETH(address token, uint amountTokenDesired, uint amountTokenMin, uint amountETHMin, address to, uint deadline) external payable returns (uint amountToken, uint amountETH, uint liquidity)',
    'function removeLiquidity(address tokenA, address tokenB, uint liquidity, uint amountAMin, uint amountBMin, address to, uint deadline) external returns (uint amountA, uint amountB)',
    'function removeLiquidityETH(address token, uint liquidity, uint amountTokenMin, uint amountETHMin, address to, uint deadline) external returns (uint amountToken, uint amountETH)',
    'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
    'function swapTokensForExactTokens(uint amountOut, uint amountInMax, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
    'function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)',
    'function swapTokensForExactETH(uint amountOut, uint amountInMax, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
    'function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
    'function swapETHForExactTokens(uint amountOut, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)',
    'function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)',
    'function getAmountsIn(uint amountOut, address[] calldata path) external view returns (uint[] memory amounts)',
    'function quote(uint amountA, uint reserveA, uint reserveB) external pure returns (uint amountB)',
    'function getAmountOut(uint amountIn, uint reserveIn, uint reserveOut) external pure returns (uint amountOut)',
    'function getAmountIn(uint amountOut, uint reserveIn, uint reserveOut) external pure returns (uint amountIn)'
];

class QuickSwapAdapter {
    constructor(provider, config) {
        this.provider = provider;
        this.config = config;
        this.factoryContract = null;
        this.routerContract = null;
        this.initialized = false;
    }

    /**
     * Initialize the adapter with contract instances
     */
    async initialize() {
        try {
            this.factoryContract = new ethers.Contract(
                this.config.factory,
                QUICKSWAP_FACTORY_ABI,
                this.provider
            );
            
            this.routerContract = new ethers.Contract(
                this.config.router,
                QUICKSWAP_ROUTER_ABI,
                this.provider
            );

            this.initialized = true;
            console.log(chalk.green('✅ QuickSwap adapter initialized'));
        } catch (error) {
            console.log(chalk.red(`❌ Failed to initialize QuickSwap adapter: ${error.message}`));
            throw error;
        }
    }

    /**
     * Get pair address for two tokens
     */
    async getPair(token0, token1) {
        if (!this.initialized) {
            await this.initialize();
        }

        try {
            return await this.factoryContract.getPair(token0, token1);
        } catch (error) {
            console.log(chalk.yellow(`⚠️  Failed to get pair: ${error.message}`));
            return null;
        }
    }

    /**
     * Get all pairs
     */
    async getAllPairs(limit = 100) {
        if (!this.initialized) {
            await this.initialize();
        }

        const pairs = [];

        try {
            const pairCount = await this.factoryContract.allPairsLength();
            const totalPairs = Number(pairCount);
            const startIndex = Math.max(0, totalPairs - limit);

            for (let i = startIndex; i < Math.min(startIndex + limit, totalPairs); i++) {
                const pairAddress = await this.factoryContract.allPairs(i);
                const pair = new ethers.Contract(pairAddress, QUICKSWAP_PAIR_ABI, this.provider);

                const [token0, token1, reserves] = await Promise.all([
                    pair.token0(),
                    pair.token1(),
                    pair.getReserves()
                ]);

                pairs.push({
                    address: pairAddress,
                    token0,
                    token1,
                    reserve0: reserves[0].toString(),
                    reserve1: reserves[1].toString(),
                    dex: 'quickswap',
                    type: 'uniswap-v2'
                });
            }
        } catch (error) {
            console.log(chalk.red(`❌ Error fetching pairs: ${error.message}`));
        }

        return pairs;
    }

    /**
     * Get reserves for a pair
     */
    async getReserves(pairAddress) {
        const pair = new ethers.Contract(pairAddress, QUICKSWAP_PAIR_ABI, this.provider);
        const reserves = await pair.getReserves();
        return {
            reserve0: reserves[0].toString(),
            reserve1: reserves[1].toString(),
            blockTimestampLast: reserves[2]
        };
    }

    /**
     * Get quote for a swap
     */
    async getAmountOut(amountIn, path) {
        if (!this.initialized) {
            await this.initialize();
        }

        try {
            const amounts = await this.routerContract.getAmountsOut(amountIn, path);
            return amounts[amounts.length - 1];
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
            const tx = await this.routerContract.swapExactTokensForTokens(
                amountIn,
                amountOutMin,
                path,
                to,
                deadline
            );
            return await tx.wait();
        } catch (error) {
            console.log(chalk.red(`❌ Swap failed: ${error.message}`));
            throw error;
        }
    }

    /**
     * Get pair info
     */
    async getPairInfo(pairAddress) {
        try {
            const pair = new ethers.Contract(pairAddress, QUICKSWAP_PAIR_ABI, this.provider);
            const [token0, token1, reserves, totalSupply] = await Promise.all([
                pair.token0(),
                pair.token1(),
                pair.getReserves(),
                pair.totalSupply()
            ]);

            return {
                address: pairAddress,
                token0,
                token1,
                reserve0: reserves[0].toString(),
                reserve1: reserves[1].toString(),
                totalSupply: totalSupply.toString(),
                dex: 'quickswap',
                type: 'uniswap-v2'
            };
        } catch (error) {
            console.log(chalk.red(`❌ Failed to get pair info: ${error.message}`));
            return null;
        }
    }

    /**
     * Calculate price from reserves
     */
    calculatePrice(reserve0, reserve1, decimals0 = 18, decimals1 = 18) {
        const r0 = BigInt(reserve0);
        const r1 = BigInt(reserve1);
        
        if (r0 === 0n || r1 === 0n) {
            return 0;
        }

        const price = Number(r1) / Number(r0) * Math.pow(10, decimals0 - decimals1);
        return price;
    }

    /**
     * Get token info from pair
     */
    async getTokensFromPair(pairAddress) {
        try {
            const pair = new ethers.Contract(pairAddress, QUICKSWAP_PAIR_ABI, this.provider);
            const [token0, token1] = await Promise.all([
                pair.token0(),
                pair.token1()
            ]);
            return { token0, token1 };
        } catch (error) {
            console.log(chalk.red(`❌ Failed to get tokens: ${error.message}`));
            return null;
        }
    }
}

export { QuickSwapAdapter };
