/**
 * Curve Finance DEX Adapter
 * Provides unified interface for interacting with Curve protocol
 * Curve specializes in stablecoin swaps with low slippage
 */

import { ethers } from 'ethers';
import chalk from 'chalk';

/**
 * Curve Registry ABI
 */
const CURVE_REGISTRY_ABI = [
    'function pool_count() external view returns (uint256)',
    'function pool_list(uint256) external view returns (address)',
    'function get_pool_from_lp_token(address) external view returns (address)',
    'function get_lp_token(address) external view returns (address)',
    'function get_n_coins(address) external view returns (uint256[2])',
    'function get_coins(address) external view returns (address[8])',
    'function get_underlying_coins(address) external view returns (address[8])',
    'function get_decimals(address) external view returns (uint256[8])',
    'function get_underlying_decimals(address) external view returns (uint256[8])',
    'function get_rates(address) external view returns (uint256[8])',
    'function get_gauges(address) external view returns (address[10], int128[10])',
    'function get_balances(address) external view returns (uint256[8])',
    'function get_underlying_balances(address) external view returns (uint256[8])',
    'function get_virtual_price_from_lp_token(address) external view returns (uint256)',
    'function get_A(address) external view returns (uint256)',
    'function get_fees(address) external view returns (uint256[2])',
    'function get_admin_balances(address) external view returns (uint256[8])',
    'function get_coin_indices(address pool, address from, address to) external view returns (int128, int128, bool)'
];

/**
 * Curve Pool ABI
 */
const CURVE_POOL_ABI = [
    'function coins(uint256) external view returns (address)',
    'function underlying_coins(uint256) external view returns (address)',
    'function balances(uint256) external view returns (uint256)',
    'function get_virtual_price() external view returns (uint256)',
    'function calc_token_amount(uint256[] amounts, bool is_deposit) external view returns (uint256)',
    'function add_liquidity(uint256[] amounts, uint256 min_mint_amount) external',
    'function remove_liquidity(uint256 _amount, uint256[] min_amounts) external',
    'function remove_liquidity_imbalance(uint256[] amounts, uint256 max_burn_amount) external',
    'function calc_withdraw_one_coin(uint256 _token_amount, int128 i) external view returns (uint256)',
    'function remove_liquidity_one_coin(uint256 _token_amount, int128 i, uint256 min_amount) external',
    'function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external',
    'function exchange_underlying(int128 i, int128 j, uint256 dx, uint256 min_dy) external',
    'function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256)',
    'function get_dy_underlying(int128 i, int128 j, uint256 dx) external view returns (uint256)',
    'function A() external view returns (uint256)',
    'function A_precise() external view returns (uint256)',
    'function fee() external view returns (uint256)',
    'function admin_fee() external view returns (uint256)',
    'function admin_balances(uint256) external view returns (uint256)',
    'function owner() external view returns (address)',
    'function lp_token() external view returns (address)',
    'event TokenExchange(address indexed buyer, int128 sold_id, uint256 tokens_sold, int128 bought_id, uint256 tokens_bought)',
    'event TokenExchangeUnderlying(address indexed buyer, int128 sold_id, uint256 tokens_sold, int128 bought_id, uint256 tokens_bought)',
    'event AddLiquidity(address indexed provider, uint256[] token_amounts, uint256[] fees, uint256 invariant, uint256 token_supply)',
    'event RemoveLiquidity(address indexed provider, uint256[] token_amounts, uint256[] fees, uint256 token_supply)',
    'event RemoveLiquidityOne(address indexed provider, uint256 token_amount, uint256 coin_amount)',
    'event RemoveLiquidityImbalance(address indexed provider, uint256[] token_amounts, uint256[] fees, uint256 invariant, uint256 token_supply)'
];

/**
 * Curve Factory ABI
 */
const CURVE_FACTORY_ABI = [
    'function pool_count() external view returns (uint256)',
    'function pool_list(uint256) external view returns (address)',
    'function get_n_coins(address) external view returns (uint256)',
    'function get_coins(address) external view returns (address[4])',
    'function get_balances(address) external view returns (uint256[4])',
    'function get_coin_indices(address, address, address) external view returns (int128, int128)',
    'function get_decimals(address) external view returns (uint256[4])',
    'function get_underlying_decimals(address) external view returns (uint256[4])',
    'function get_fees(address) external view returns (uint256, uint256)',
    'function get_admin_balances(address) external view returns (uint256[4])',
    'function get_A(address) external view returns (uint256)'
];

class CurveAdapter {
    constructor(provider, config) {
        this.provider = provider;
        this.config = config;
        this.registryContract = null;
        this.initialized = false;
    }

    /**
     * Initialize the adapter with contract instances
     */
    async initialize() {
        try {
            if (this.config.registry) {
                this.registryContract = new ethers.Contract(
                    this.config.registry,
                    CURVE_REGISTRY_ABI,
                    this.provider
                );
            }

            this.initialized = true;
            console.log(chalk.green('✅ Curve adapter initialized'));
        } catch (error) {
            console.log(chalk.red(`❌ Failed to initialize Curve adapter: ${error.message}`));
            throw error;
        }
    }

    /**
     * Get all pools from registry
     */
    async getAllPools(limit = 50) {
        if (!this.initialized) {
            await this.initialize();
        }

        if (!this.registryContract) {
            console.log(chalk.yellow('⚠️  No registry contract configured'));
            return [];
        }

        const pools = [];

        try {
            const poolCount = await this.registryContract.pool_count();
            const totalPools = Number(poolCount);
            const maxPools = Math.min(limit, totalPools);

            for (let i = 0; i < maxPools; i++) {
                try {
                    const poolAddress = await this.registryContract.pool_list(i);
                    const poolInfo = await this.getPoolInfo(poolAddress);
                    
                    if (poolInfo) {
                        pools.push(poolInfo);
                    }
                } catch (error) {
                    // Skip pools that fail to load
                    continue;
                }
            }
        } catch (error) {
            console.log(chalk.red(`❌ Error fetching pools: ${error.message}`));
        }

        return pools;
    }

    /**
     * Get pool info
     */
    async getPoolInfo(poolAddress) {
        try {
            const pool = new ethers.Contract(poolAddress, CURVE_POOL_ABI, this.provider);
            
            // Get basic pool info
            const [virtualPrice, A, fee] = await Promise.all([
                pool.get_virtual_price().catch(() => 0n),
                pool.A().catch(() => 0n),
                pool.fee().catch(() => 0n)
            ]);

            // Get coins - Curve pools can have 2-4 coins
            const coins = [];
            const balances = [];
            
            for (let i = 0; i < 4; i++) {
                try {
                    const coin = await pool.coins(i);
                    const balance = await pool.balances(i);
                    coins.push(coin);
                    balances.push(balance.toString());
                } catch {
                    // No more coins
                    break;
                }
            }

            return {
                address: poolAddress,
                coins,
                balances,
                virtualPrice: virtualPrice.toString(),
                amplificationCoefficient: A.toString(),
                fee: fee.toString(),
                dex: 'curve',
                type: 'curve'
            };
        } catch (error) {
            console.log(chalk.yellow(`⚠️  Failed to get pool info: ${error.message}`));
            return null;
        }
    }

    /**
     * Get exchange rate between two tokens
     */
    async getExchangeRate(poolAddress, i, j, amount) {
        try {
            const pool = new ethers.Contract(poolAddress, CURVE_POOL_ABI, this.provider);
            const dy = await pool.get_dy(i, j, amount);
            return dy;
        } catch (error) {
            console.log(chalk.yellow(`⚠️  Failed to get exchange rate: ${error.message}`));
            return null;
        }
    }

    /**
     * Execute a swap
     */
    async exchange(poolAddress, i, j, dx, minDy) {
        try {
            const pool = new ethers.Contract(poolAddress, CURVE_POOL_ABI, this.provider);
            const tx = await pool.exchange(i, j, dx, minDy);
            return await tx.wait();
        } catch (error) {
            console.log(chalk.red(`❌ Exchange failed: ${error.message}`));
            throw error;
        }
    }

    /**
     * Get coin indices for a swap
     */
    async getCoinIndices(poolAddress, from, to) {
        if (!this.registryContract) {
            throw new Error('Registry contract not initialized');
        }

        try {
            const [i, j, isUnderlying] = await this.registryContract.get_coin_indices(
                poolAddress,
                from,
                to
            );
            return { i, j, isUnderlying };
        } catch (error) {
            console.log(chalk.yellow(`⚠️  Failed to get coin indices: ${error.message}`));
            return null;
        }
    }

    /**
     * Get pool coins
     */
    async getCoins(poolAddress) {
        try {
            const pool = new ethers.Contract(poolAddress, CURVE_POOL_ABI, this.provider);
            const coins = [];
            
            for (let i = 0; i < 8; i++) {
                try {
                    const coin = await pool.coins(i);
                    if (coin === ethers.ZeroAddress) break;
                    coins.push(coin);
                } catch {
                    break;
                }
            }
            
            return coins;
        } catch (error) {
            console.log(chalk.yellow(`⚠️  Failed to get coins: ${error.message}`));
            return [];
        }
    }

    /**
     * Get pool balances
     */
    async getBalances(poolAddress) {
        try {
            const pool = new ethers.Contract(poolAddress, CURVE_POOL_ABI, this.provider);
            const balances = [];
            
            for (let i = 0; i < 8; i++) {
                try {
                    const balance = await pool.balances(i);
                    balances.push(balance.toString());
                } catch {
                    break;
                }
            }
            
            return balances;
        } catch (error) {
            console.log(chalk.yellow(`⚠️  Failed to get balances: ${error.message}`));
            return [];
        }
    }

    /**
     * Calculate expected output for a given input
     */
    async calculateSwapOutput(poolAddress, fromCoin, toCoin, amount) {
        try {
            const indices = await this.getCoinIndices(poolAddress, fromCoin, toCoin);
            if (!indices) return null;

            const pool = new ethers.Contract(poolAddress, CURVE_POOL_ABI, this.provider);
            
            if (indices.isUnderlying) {
                return await pool.get_dy_underlying(indices.i, indices.j, amount);
            } else {
                return await pool.get_dy(indices.i, indices.j, amount);
            }
        } catch (error) {
            console.log(chalk.yellow(`⚠️  Failed to calculate swap output: ${error.message}`));
            return null;
        }
    }
}

export { CurveAdapter };
