/**
 * Curve Finance Adapter
 * Provides interface for interacting with Curve stable swap pools
 */

const { ethers } = require('ethers');
const chalk = require('chalk');

/**
 * Curve Registry ABI (from dex_pool_fetcher)
 */
const CURVE_REGISTRY_ABI = [
    'function pool_count() external view returns (uint256)',
    'function pool_list(uint256) external view returns (address)',
    'function get_pool_from_lp_token(address) external view returns (address)',
    'function get_lp_token(address) external view returns (address)',
    'function get_n_coins(address) external view returns (uint256)',
    'function get_coins(address) external view returns (address[8])',
    'function get_balances(address) external view returns (uint256[8])',
    'function get_virtual_price_from_lp_token(address) external view returns (uint256)',
    'function get_A(address) external view returns (uint256)',
    'function get_fees(address) external view returns (uint256, uint256)'
];

/**
 * Curve Pool ABI (from dex_pool_fetcher)
 */
const CURVE_POOL_ABI = [
    'function coins(uint256) external view returns (address)',
    'function balances(uint256) external view returns (uint256)',
    'function get_virtual_price() external view returns (uint256)',
    'function get_dy(int128, int128, uint256) external view returns (uint256)',
    'function exchange(int128, int128, uint256, uint256) external payable returns (uint256)',
    'function add_liquidity(uint256[], uint256) external payable returns (uint256)',
    'function remove_liquidity(uint256, uint256[]) external returns (uint256[])',
    'function remove_liquidity_one_coin(uint256, int128, uint256) external returns (uint256)',
    'function A() external view returns (uint256)',
    'function fee() external view returns (uint256)'
];

class CurveAdapter {
    constructor(provider, config) {
        this.provider = provider;
        this.config = config;
        this.registry = new ethers.Contract(config.registry, CURVE_REGISTRY_ABI, provider);
    }

    /**
     * Get total number of pools
     */
    async getPoolCount() {
        try {
            return await this.registry.pool_count();
        } catch (error) {
            console.log(chalk.red(`Curve: Error getting pool count: ${error.message}`));
            throw error;
        }
    }

    /**
     * Get pool address by index
     */
    async getPoolByIndex(index) {
        try {
            return await this.registry.pool_list(index);
        } catch (error) {
            console.log(chalk.red(`Curve: Error getting pool by index: ${error.message}`));
            throw error;
        }
    }

    /**
     * Get pool coins
     */
    async getPoolCoins(poolAddress) {
        try {
            return await this.registry.get_coins(poolAddress);
        } catch (error) {
            console.log(chalk.red(`Curve: Error getting pool coins: ${error.message}`));
            throw error;
        }
    }

    /**
     * Get pool balances
     */
    async getPoolBalances(poolAddress) {
        try {
            return await this.registry.get_balances(poolAddress);
        } catch (error) {
            console.log(chalk.red(`Curve: Error getting pool balances: ${error.message}`));
            throw error;
        }
    }

    /**
     * Get quote for exchange
     */
    async getQuote(poolAddress, i, j, dx) {
        try {
            const pool = new ethers.Contract(poolAddress, CURVE_POOL_ABI, this.provider);
            return await pool.get_dy(i, j, dx);
        } catch (error) {
            console.log(chalk.red(`Curve: Error getting quote: ${error.message}`));
            throw error;
        }
    }

    /**
     * Execute exchange
     */
    async exchange(poolAddress, i, j, dx, minDy, signer) {
        try {
            const pool = new ethers.Contract(poolAddress, CURVE_POOL_ABI, this.provider);
            const poolWithSigner = pool.connect(signer);
            const tx = await poolWithSigner.exchange(i, j, dx, minDy);
            return await tx.wait();
        } catch (error) {
            console.log(chalk.red(`Curve: Error executing exchange: ${error.message}`));
            throw error;
        }
    }

    /**
     * Add liquidity to pool
     */
    async addLiquidity(poolAddress, amounts, minMintAmount, signer) {
        try {
            const pool = new ethers.Contract(poolAddress, CURVE_POOL_ABI, this.provider);
            const poolWithSigner = pool.connect(signer);
            const tx = await poolWithSigner.add_liquidity(amounts, minMintAmount);
            return await tx.wait();
        } catch (error) {
            console.log(chalk.red(`Curve: Error adding liquidity: ${error.message}`));
            throw error;
        }
    }

    /**
     * Remove liquidity from pool
     */
    async removeLiquidity(poolAddress, amount, minAmounts, signer) {
        try {
            const pool = new ethers.Contract(poolAddress, CURVE_POOL_ABI, this.provider);
            const poolWithSigner = pool.connect(signer);
            const tx = await poolWithSigner.remove_liquidity(amount, minAmounts);
            return await tx.wait();
        } catch (error) {
            console.log(chalk.red(`Curve: Error removing liquidity: ${error.message}`));
            throw error;
        }
    }

    /**
     * Remove liquidity in one coin
     */
    async removeLiquidityOneCoin(poolAddress, tokenAmount, i, minAmount, signer) {
        try {
            const pool = new ethers.Contract(poolAddress, CURVE_POOL_ABI, this.provider);
            const poolWithSigner = pool.connect(signer);
            const tx = await poolWithSigner.remove_liquidity_one_coin(tokenAmount, i, minAmount);
            return await tx.wait();
        } catch (error) {
            console.log(chalk.red(`Curve: Error removing liquidity one coin: ${error.message}`));
            throw error;
        }
    }

    /**
     * Get pool A parameter (amplification coefficient)
     */
    async getA(poolAddress) {
        try {
            const pool = new ethers.Contract(poolAddress, CURVE_POOL_ABI, this.provider);
            return await pool.A();
        } catch (error) {
            console.log(chalk.red(`Curve: Error getting A parameter: ${error.message}`));
            throw error;
        }
    }

    /**
     * Get pool fee
     */
    async getFee(poolAddress) {
        try {
            const pool = new ethers.Contract(poolAddress, CURVE_POOL_ABI, this.provider);
            return await pool.fee();
        } catch (error) {
            console.log(chalk.red(`Curve: Error getting fee: ${error.message}`));
            throw error;
        }
    }

    /**
     * Get virtual price
     */
    async getVirtualPrice(poolAddress) {
        try {
            const pool = new ethers.Contract(poolAddress, CURVE_POOL_ABI, this.provider);
            return await pool.get_virtual_price();
        } catch (error) {
            console.log(chalk.red(`Curve: Error getting virtual price: ${error.message}`));
            throw error;
        }
    }
}

module.exports = {
    CurveAdapter,
    CURVE_REGISTRY_ABI,
    CURVE_POOL_ABI
};
