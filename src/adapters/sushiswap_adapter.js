/**
 * SushiSwap Adapter
 * SushiSwap uses Uniswap V2 compatible contracts
 */

const { ethers } = require('ethers');
const chalk = require('chalk');
const { UNISWAP_V2_ROUTER_ABI } = require('./uniswap_adapter');

class SushiSwapAdapter {
    constructor(provider, config) {
        this.provider = provider;
        this.config = config;
        this.router = new ethers.Contract(config.router, UNISWAP_V2_ROUTER_ABI, provider);
    }

    /**
     * Get quote for swap
     */
    async getAmountsOut(amountIn, path) {
        try {
            return await this.router.getAmountsOut(amountIn, path);
        } catch (error) {
            console.log(chalk.red(`SushiSwap: Error getting amounts out: ${error.message}`));
            throw error;
        }
    }

    /**
     * Get amounts in for desired output
     */
    async getAmountsIn(amountOut, path) {
        try {
            return await this.router.getAmountsIn(amountOut, path);
        } catch (error) {
            console.log(chalk.red(`SushiSwap: Error getting amounts in: ${error.message}`));
            throw error;
        }
    }

    /**
     * Execute swap
     */
    async swapExactTokensForTokens(amountIn, amountOutMin, path, to, deadline, signer) {
        try {
            const routerWithSigner = this.router.connect(signer);
            const tx = await routerWithSigner.swapExactTokensForTokens(
                amountIn,
                amountOutMin,
                path,
                to,
                deadline
            );
            return await tx.wait();
        } catch (error) {
            console.log(chalk.red(`SushiSwap: Error executing swap: ${error.message}`));
            throw error;
        }
    }

    /**
     * Execute reverse swap (exact output)
     */
    async swapTokensForExactTokens(amountOut, amountInMax, path, to, deadline, signer) {
        try {
            const routerWithSigner = this.router.connect(signer);
            const tx = await routerWithSigner.swapTokensForExactTokens(
                amountOut,
                amountInMax,
                path,
                to,
                deadline
            );
            return await tx.wait();
        } catch (error) {
            console.log(chalk.red(`SushiSwap: Error executing reverse swap: ${error.message}`));
            throw error;
        }
    }

    /**
     * Get factory address
     */
    async getFactory() {
        return await this.router.factory();
    }

    /**
     * Get WETH address
     */
    async getWETH() {
        return await this.router.WETH();
    }

    /**
     * Add liquidity
     */
    async addLiquidity(tokenA, tokenB, amountADesired, amountBDesired, amountAMin, amountBMin, to, deadline, signer) {
        try {
            const routerWithSigner = this.router.connect(signer);
            const tx = await routerWithSigner.addLiquidity(
                tokenA,
                tokenB,
                amountADesired,
                amountBDesired,
                amountAMin,
                amountBMin,
                to,
                deadline
            );
            return await tx.wait();
        } catch (error) {
            console.log(chalk.red(`SushiSwap: Error adding liquidity: ${error.message}`));
            throw error;
        }
    }

    /**
     * Remove liquidity
     */
    async removeLiquidity(tokenA, tokenB, liquidity, amountAMin, amountBMin, to, deadline, signer) {
        try {
            const routerWithSigner = this.router.connect(signer);
            const tx = await routerWithSigner.removeLiquidity(
                tokenA,
                tokenB,
                liquidity,
                amountAMin,
                amountBMin,
                to,
                deadline
            );
            return await tx.wait();
        } catch (error) {
            console.log(chalk.red(`SushiSwap: Error removing liquidity: ${error.message}`));
            throw error;
        }
    }
}

module.exports = {
    SushiSwapAdapter
};
