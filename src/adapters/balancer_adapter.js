/**
 * Balancer V2 Adapter
 * Provides interface for interacting with Balancer V2 Vault
 */

const { ethers } = require('ethers');
const chalk = require('chalk');

/**
 * Balancer Vault ABI (from dex_pool_fetcher)
 */
const BALANCER_VAULT_ABI = [
    'function getPoolTokens(bytes32 poolId) external view returns (address[] tokens, uint256[] balances, uint256 lastChangeBlock)',
    'function swap(tuple(bytes32 poolId, uint8 kind, address assetIn, address assetOut, uint256 amount, bytes userData) singleSwap, tuple(address sender, bool fromInternalBalance, address recipient, bool toInternalBalance) funds, uint256 limit, uint256 deadline) external payable returns (uint256)',
    'function batchSwap(uint8 kind, tuple(bytes32 poolId, uint256 assetInIndex, uint256 assetOutIndex, uint256 amount, bytes userData)[] swaps, address[] assets, tuple(address sender, bool fromInternalBalance, address recipient, bool toInternalBalance) funds, int256[] limits, uint256 deadline) external payable returns (int256[] assetDeltas)',
    'function joinPool(bytes32 poolId, address sender, address recipient, tuple(address[] assets, uint256[] maxAmountsIn, bytes userData, bool fromInternalBalance) request) external payable',
    'function exitPool(bytes32 poolId, address sender, address recipient, tuple(address[] assets, uint256[] minAmountsOut, bytes userData, bool toInternalBalance) request) external',
    'function flashLoan(address recipient, address[] tokens, uint256[] amounts, bytes userData) external',
    'function getPool(bytes32 poolId) external view returns (address, uint8)',
    'function getInternalBalance(address user, address[] tokens) external view returns (uint256[] balances)',
    'function WETH() external view returns (address)'
];

/**
 * Balancer Pool ABI
 */
const BALANCER_POOL_ABI = [
    'function getPoolId() external view returns (bytes32)',
    'function getSwapFeePercentage() external view returns (uint256)',
    'function totalSupply() external view returns (uint256)',
    'function balanceOf(address account) external view returns (uint256)',
    'function getRate() external view returns (uint256)'
];

class BalancerAdapter {
    constructor(provider, config) {
        this.provider = provider;
        this.config = config;
        this.vault = new ethers.Contract(config.vault, BALANCER_VAULT_ABI, provider);
    }

    /**
     * Get pool tokens and balances
     */
    async getPoolTokens(poolId) {
        try {
            return await this.vault.getPoolTokens(poolId);
        } catch (error) {
            console.log(chalk.red(`Balancer: Error getting pool tokens: ${error.message}`));
            throw error;
        }
    }

    /**
     * Get pool address from pool ID
     */
    async getPool(poolId) {
        try {
            return await this.vault.getPool(poolId);
        } catch (error) {
            console.log(chalk.red(`Balancer: Error getting pool: ${error.message}`));
            throw error;
        }
    }

    /**
     * Execute single swap
     */
    async swap(singleSwap, funds, limit, deadline, signer) {
        try {
            const vaultWithSigner = this.vault.connect(signer);
            const tx = await vaultWithSigner.swap(
                singleSwap,
                funds,
                limit,
                deadline
            );
            return await tx.wait();
        } catch (error) {
            console.log(chalk.red(`Balancer: Error executing swap: ${error.message}`));
            throw error;
        }
    }

    /**
     * Execute a batch swap across multiple pools
     */
    async batchSwap(swaps, assets, limits, deadline, recipient) {
        if (!this.initialized) {
            await this.initialize();
        }

        if (!this.vaultContract) {
            throw new Error('Vault contract not initialized');
        }

        try {
            const funds = {
                sender: recipient,
                fromInternalBalance: false,
                recipient,
                toInternalBalance: false
            };

            const tx = await this.vaultContract.batchSwap(
                0, // GIVEN_IN
                swaps,
                assets,
                funds,
                limits,
                deadline
            );
            return await tx.wait();
        } catch (error) {
            console.log(chalk.red(`Balancer: Error executing batch swap: ${error.message}`));
            throw error;
        }
    }

    /**
     * Request a flash loan from Balancer
     */
    async flashLoan(recipient, tokens, amounts, userData) {
        if (!this.initialized) {
            await this.initialize();
        }

        if (!this.vaultContract) {
            throw new Error('Vault contract not initialized');
        }

        try {
            const tx = await this.vaultContract.flashLoan(
                recipient,
                tokens,
                amounts,
                userData
            );

            return await tx.wait();
        } catch (error) {
            console.log(chalk.red(`❌ Flash loan failed: ${error.message}`));
            throw error;
        }
    }

    /**
     * Join a pool (add liquidity)
     */
    async joinPool(poolId, sender, recipient, assets, maxAmountsIn, userData) {
        if (!this.initialized) {
            await this.initialize();
        }

        if (!this.vaultContract) {
            throw new Error('Vault contract not initialized');
        }

        try {
            const request = {
                assets,
                maxAmountsIn,
                userData,
                fromInternalBalance: false
            };

            const tx = await this.vaultContract.joinPool(
                poolId,
                sender,
                recipient,
                request
            );

            return await tx.wait();
        } catch (error) {
            console.log(chalk.red(`❌ Join pool failed: ${error.message}`));
            throw error;
        }
    }

    /**
     * Exit a pool (remove liquidity)
     */
    async exitPool(poolId, sender, recipient, assets, minAmountsOut, userData) {
        if (!this.initialized) {
            await this.initialize();
        }

        if (!this.vaultContract) {
            throw new Error('Vault contract not initialized');
        }

        try {
            const request = {
                assets,
                minAmountsOut,
                userData,
                toInternalBalance: false
            };

            const tx = await this.vaultContract.exitPool(
                poolId,
                sender,
                recipient,
                request
            );

            return await tx.wait();
        } catch (error) {
            console.log(chalk.red(`❌ Exit pool failed: ${error.message}`));
            throw error;
        }
    }

    /**
     * Get WETH address from vault
     */
    async getWETH() {
        if (!this.initialized) {
            await this.initialize();
        }

        if (!this.vaultContract) {
            throw new Error('Vault contract not initialized');
        }

        try {
            return await this.vaultContract.WETH();
        } catch (error) {
            console.log(chalk.yellow(`⚠️  Failed to get WETH: ${error.message}`));
            return null;
        }
    }
}

module.exports = { BalancerAdapter };
