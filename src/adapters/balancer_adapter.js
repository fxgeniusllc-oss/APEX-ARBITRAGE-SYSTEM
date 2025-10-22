/**
 * Balancer V2 DEX Adapter
 * Provides unified interface for interacting with Balancer protocol
 * Balancer supports multi-token pools with customizable weights
 */

const { ethers } = require('ethers');
const chalk = require('chalk');

/**
 * Balancer Vault ABI
 */
const BALANCER_VAULT_ABI = [
    'function getPoolTokens(bytes32 poolId) external view returns (address[] tokens, uint256[] balances, uint256 lastChangeBlock)',
    'function getPool(bytes32 poolId) external view returns (address, uint8)',
    'function registerPool(uint8 specialization) external returns (bytes32)',
    'function registerTokens(bytes32 poolId, address[] tokens, address[] assetManagers) external',
    'function deregisterTokens(bytes32 poolId, address[] tokens) external',
    'function joinPool(bytes32 poolId, address sender, address recipient, tuple(address[] assets, uint256[] maxAmountsIn, bytes userData, bool fromInternalBalance) request) external payable',
    'function exitPool(bytes32 poolId, address sender, address recipient, tuple(address[] assets, uint256[] minAmountsOut, bytes userData, bool toInternalBalance) request) external',
    'function swap(tuple(bytes32 poolId, uint8 kind, address assetIn, address assetOut, uint256 amount, bytes userData) singleSwap, tuple(address sender, bool fromInternalBalance, address recipient, bool toInternalBalance) funds, uint256 limit, uint256 deadline) external payable returns (uint256)',
    'function batchSwap(uint8 kind, tuple(bytes32 poolId, uint256 assetInIndex, uint256 assetOutIndex, uint256 amount, bytes userData)[] swaps, address[] assets, tuple(address sender, bool fromInternalBalance, address recipient, bool toInternalBalance) funds, int256[] limits, uint256 deadline) external payable returns (int256[] assetDeltas)',
    'function queryBatchSwap(uint8 kind, tuple(bytes32 poolId, uint256 assetInIndex, uint256 assetOutIndex, uint256 amount, bytes userData)[] swaps, address[] assets, tuple(address sender, bool fromInternalBalance, address recipient, bool toInternalBalance) funds) external returns (int256[])',
    'function flashLoan(address recipient, address[] tokens, uint256[] amounts, bytes userData) external',
    'function manageUserBalance(tuple(uint8 kind, address asset, uint256 amount, address sender, address recipient)[] ops) external payable',
    'function getInternalBalance(address user, address[] tokens) external view returns (uint256[] balances)',
    'function setPaused(bool paused) external',
    'function WETH() external view returns (address)',
    'function getAuthorizer() external view returns (address)',
    'function setAuthorizer(address newAuthorizer) external',
    'function hasApprovedRelayer(address user, address relayer) external view returns (bool)',
    'function setRelayerApproval(address sender, address relayer, bool approved) external',
    'function getProtocolFeesCollector() external view returns (address)',
    'event Swap(bytes32 indexed poolId, address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut)',
    'event PoolBalanceChanged(bytes32 indexed poolId, address indexed liquidityProvider, address[] tokens, int256[] deltas, uint256[] protocolFeeAmounts)',
    'event PoolBalanceManaged(bytes32 indexed poolId, address indexed assetManager, address indexed token, int256 cashDelta, int256 managedDelta)',
    'event FlashLoan(address indexed recipient, address indexed token, uint256 amount, uint256 feeAmount)'
];

/**
 * Balancer Pool ABI (Weighted Pool)
 */
const BALANCER_POOL_ABI = [
    'function getPoolId() external view returns (bytes32)',
    'function getVault() external view returns (address)',
    'function name() external view returns (string)',
    'function symbol() external view returns (string)',
    'function decimals() external view returns (uint8)',
    'function totalSupply() external view returns (uint256)',
    'function balanceOf(address account) external view returns (uint256)',
    'function getSwapFeePercentage() external view returns (uint256)',
    'function getNormalizedWeights() external view returns (uint256[])',
    'function getLastInvariant() external view returns (uint256, uint256)',
    'function getRate() external view returns (uint256)',
    'function onSwap(tuple(uint8 kind, address tokenIn, address tokenOut, uint256 amount, bytes32 poolId, uint256 lastChangeBlock, address from, address to, bytes userData) request, uint256 balanceTokenIn, uint256 balanceTokenOut) external view returns (uint256)',
    'event SwapFeePercentageChanged(uint256 swapFeePercentage)'
];

/**
 * Balancer Queries ABI (for simulating operations)
 */
const BALANCER_QUERIES_ABI = [
    'function querySwap(tuple(bytes32 poolId, uint8 kind, address assetIn, address assetOut, uint256 amount, bytes userData) singleSwap, tuple(address sender, bool fromInternalBalance, address recipient, bool toInternalBalance) funds) external returns (uint256)',
    'function queryBatchSwap(uint8 kind, tuple(bytes32 poolId, uint256 assetInIndex, uint256 assetOutIndex, uint256 amount, bytes userData)[] swaps, address[] assets, tuple(address sender, bool fromInternalBalance, address recipient, bool toInternalBalance) funds) external returns (int256[] assetDeltas)',
    'function queryJoin(bytes32 poolId, address sender, address recipient, tuple(address[] assets, uint256[] maxAmountsIn, bytes userData, bool fromInternalBalance) request) external returns (uint256 bptOut, uint256[] amountsIn)',
    'function queryExit(bytes32 poolId, address sender, address recipient, tuple(address[] assets, uint256[] minAmountsOut, bytes userData, bool toInternalBalance) request) external returns (uint256 bptIn, uint256[] amountsOut)'
];

class BalancerAdapter {
    constructor(provider, config) {
        this.provider = provider;
        this.config = config;
        this.vaultContract = null;
        this.initialized = false;
    }

    /**
     * Initialize the adapter with contract instances
     */
    async initialize() {
        try {
            if (this.config.vault) {
                this.vaultContract = new ethers.Contract(
                    this.config.vault,
                    BALANCER_VAULT_ABI,
                    this.provider
                );
            }

            this.initialized = true;
            console.log(chalk.green('✅ Balancer adapter initialized'));
        } catch (error) {
            console.log(chalk.red(`❌ Failed to initialize Balancer adapter: ${error.message}`));
            throw error;
        }
    }

    /**
     * Get pool tokens and balances
     */
    async getPoolTokens(poolId) {
        if (!this.initialized) {
            await this.initialize();
        }

        if (!this.vaultContract) {
            throw new Error('Vault contract not initialized');
        }

        try {
            const [tokens, balances, lastChangeBlock] = await this.vaultContract.getPoolTokens(poolId);
            
            return {
                tokens,
                balances: balances.map(b => b.toString()),
                lastChangeBlock: lastChangeBlock.toString()
            };
        } catch (error) {
            console.log(chalk.yellow(`⚠️  Failed to get pool tokens: ${error.message}`));
            return null;
        }
    }

    /**
     * Get pool address from pool ID
     */
    async getPool(poolId) {
        if (!this.initialized) {
            await this.initialize();
        }

        if (!this.vaultContract) {
            throw new Error('Vault contract not initialized');
        }

        try {
            const [poolAddress, specialization] = await this.vaultContract.getPool(poolId);
            return { poolAddress, specialization };
        } catch (error) {
            console.log(chalk.yellow(`⚠️  Failed to get pool: ${error.message}`));
            return null;
        }
    }

    /**
     * Get pool info including tokens, balances, and weights
     */
    async getPoolInfo(poolId) {
        try {
            const poolData = await this.getPool(poolId);
            if (!poolData) return null;

            const tokenData = await this.getPoolTokens(poolId);
            if (!tokenData) return null;

            const pool = new ethers.Contract(
                poolData.poolAddress,
                BALANCER_POOL_ABI,
                this.provider
            );

            // Try to get pool-specific info (may fail for some pool types)
            let swapFee = null;
            let weights = null;
            let totalSupply = null;

            try {
                swapFee = await pool.getSwapFeePercentage();
            } catch (e) {
                // Not all pools have swap fees
            }

            try {
                weights = await pool.getNormalizedWeights();
            } catch (e) {
                // Not all pools have weights (e.g., stable pools)
            }

            try {
                totalSupply = await pool.totalSupply();
            } catch (e) {
                // Some pools might not expose totalSupply
            }

            return {
                poolId,
                address: poolData.poolAddress,
                specialization: poolData.specialization,
                tokens: tokenData.tokens,
                balances: tokenData.balances,
                swapFee: swapFee ? swapFee.toString() : null,
                weights: weights ? weights.map(w => w.toString()) : null,
                totalSupply: totalSupply ? totalSupply.toString() : null,
                dex: 'balancer',
                type: 'balancer-v2'
            };
        } catch (error) {
            console.log(chalk.yellow(`⚠️  Failed to get pool info: ${error.message}`));
            return null;
        }
    }

    /**
     * Execute a single swap
     */
    async swap(poolId, tokenIn, tokenOut, amount, minAmountOut, recipient, deadline) {
        if (!this.initialized) {
            await this.initialize();
        }

        if (!this.vaultContract) {
            throw new Error('Vault contract not initialized');
        }

        try {
            const singleSwap = {
                poolId,
                kind: 0, // GIVEN_IN
                assetIn: tokenIn,
                assetOut: tokenOut,
                amount,
                userData: '0x'
            };

            const funds = {
                sender: recipient,
                fromInternalBalance: false,
                recipient,
                toInternalBalance: false
            };

            const tx = await this.vaultContract.swap(
                singleSwap,
                funds,
                minAmountOut,
                deadline
            );

            return await tx.wait();
        } catch (error) {
            console.log(chalk.red(`❌ Swap failed: ${error.message}`));
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
            console.log(chalk.red(`❌ Batch swap failed: ${error.message}`));
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
