/**
 * Aave Flash Loan Adapter
 * Provides unified interface for requesting flash loans from Aave protocol
 * Supports both Aave V2 and V3
 */

const { ethers } = require('ethers');
const chalk = require('chalk');

/**
 * Aave V2 Lending Pool ABI
 */
const AAVE_V2_LENDING_POOL_ABI = [
    'function flashLoan(address receiverAddress, address[] assets, uint256[] amounts, uint256[] modes, address onBehalfOf, bytes params, uint16 referralCode) external',
    'function getReserveData(address asset) external view returns (tuple(uint256 configuration, uint128 liquidityIndex, uint128 variableBorrowIndex, uint128 currentLiquidityRate, uint128 currentVariableBorrowRate, uint128 currentStableBorrowRate, uint40 lastUpdateTimestamp, address aTokenAddress, address stableDebtTokenAddress, address variableDebtTokenAddress, address interestRateStrategyAddress, uint8 id))',
    'function getReservesList() external view returns (address[])',
    'function getUserAccountData(address user) external view returns (uint256 totalCollateralETH, uint256 totalDebtETH, uint256 availableBorrowsETH, uint256 currentLiquidationThreshold, uint256 ltv, uint256 healthFactor)',
    'event FlashLoan(address indexed target, address indexed initiator, address indexed asset, uint256 amount, uint256 premium, uint16 referralCode)'
];

/**
 * Aave V3 Pool ABI
 */
const AAVE_V3_POOL_ABI = [
    'function flashLoan(address receiverAddress, address[] assets, uint256[] amounts, uint256[] interestRateModes, address onBehalfOf, bytes params, uint16 referralCode) external',
    'function flashLoanSimple(address receiverAddress, address asset, uint256 amount, bytes params, uint16 referralCode) external',
    'function getReserveData(address asset) external view returns (tuple(uint256 configuration, uint128 liquidityIndex, uint128 currentLiquidityRate, uint128 variableBorrowIndex, uint128 currentVariableBorrowRate, uint128 currentStableBorrowRate, uint40 lastUpdateTimestamp, uint16 id, address aTokenAddress, address stableDebtTokenAddress, address variableDebtTokenAddress, address interestRateStrategyAddress, uint128 accruedToTreasury, uint128 unbacked, uint128 isolationModeTotalDebt))',
    'function getReservesList() external view returns (address[])',
    'function getUserAccountData(address user) external view returns (uint256 totalCollateralBase, uint256 totalDebtBase, uint256 availableBorrowsBase, uint256 currentLiquidationThreshold, uint256 ltv, uint256 healthFactor)',
    'function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external',
    'function withdraw(address asset, uint256 amount, address to) external returns (uint256)',
    'function borrow(address asset, uint256 amount, uint256 interestRateMode, uint16 referralCode, address onBehalfOf) external',
    'function repay(address asset, uint256 amount, uint256 interestRateMode, address onBehalfOf) external returns (uint256)',
    'event FlashLoan(address indexed target, address indexed initiator, address indexed asset, uint256 amount, uint8 interestRateMode, uint256 premium, uint16 referralCode)'
];

/**
 * Aave V2 Lending Pool Address Provider ABI
 */
const AAVE_V2_PROVIDER_ABI = [
    'function getLendingPool() external view returns (address)',
    'function getPriceOracle() external view returns (address)',
    'function getLendingPoolCollateralManager() external view returns (address)',
    'function getPoolAdmin() external view returns (address)',
    'function getAddress(bytes32 id) external view returns (address)'
];

/**
 * Aave V3 Pool Address Provider ABI
 */
const AAVE_V3_PROVIDER_ABI = [
    'function getPool() external view returns (address)',
    'function getPriceOracle() external view returns (address)',
    'function getACLManager() external view returns (address)',
    'function getPoolDataProvider() external view returns (address)',
    'function getAddress(bytes32 id) external view returns (address)'
];

/**
 * Aave Flash Loan Receiver Interface
 */
const FLASH_LOAN_RECEIVER_ABI = [
    'function executeOperation(address[] assets, uint256[] amounts, uint256[] premiums, address initiator, bytes params) external returns (bool)',
    'function ADDRESSES_PROVIDER() external view returns (address)',
    'function POOL() external view returns (address)'
];

class AaveFlashLoanAdapter {
    constructor(provider, config) {
        this.provider = provider;
        this.config = config;
        this.version = config.version || 'v3'; // v2 or v3
        this.poolContract = null;
        this.providerContract = null;
        this.initialized = false;
        
        // Flash loan fee (0.09% for Aave)
        this.FLASH_LOAN_FEE = 9; // 9 basis points = 0.09%
    }

    /**
     * Initialize the adapter with contract instances
     */
    async initialize() {
        try {
            if (this.version === 'v2') {
                if (this.config.addressProvider) {
                    this.providerContract = new ethers.Contract(
                        this.config.addressProvider,
                        AAVE_V2_PROVIDER_ABI,
                        this.provider
                    );
                    const poolAddress = await this.providerContract.getLendingPool();
                    this.poolContract = new ethers.Contract(
                        poolAddress,
                        AAVE_V2_LENDING_POOL_ABI,
                        this.provider
                    );
                } else if (this.config.lendingPool) {
                    this.poolContract = new ethers.Contract(
                        this.config.lendingPool,
                        AAVE_V2_LENDING_POOL_ABI,
                        this.provider
                    );
                }
            } else if (this.version === 'v3') {
                if (this.config.addressProvider) {
                    this.providerContract = new ethers.Contract(
                        this.config.addressProvider,
                        AAVE_V3_PROVIDER_ABI,
                        this.provider
                    );
                    const poolAddress = await this.providerContract.getPool();
                    this.poolContract = new ethers.Contract(
                        poolAddress,
                        AAVE_V3_POOL_ABI,
                        this.provider
                    );
                } else if (this.config.pool) {
                    this.poolContract = new ethers.Contract(
                        this.config.pool,
                        AAVE_V3_POOL_ABI,
                        this.provider
                    );
                }
            }

            this.initialized = true;
            console.log(chalk.green(`✅ Aave ${this.version} flash loan adapter initialized`));
        } catch (error) {
            console.log(chalk.red(`❌ Failed to initialize Aave adapter: ${error.message}`));
            throw error;
        }
    }

    /**
     * Request a flash loan
     */
    async flashLoan(receiverAddress, assets, amounts, params = '0x', referralCode = 0) {
        if (!this.initialized) {
            await this.initialize();
        }

        if (!this.poolContract) {
            throw new Error('Pool contract not initialized');
        }

        try {
            // modes: 0 = no debt, 1 = stable debt, 2 = variable debt
            const modes = new Array(assets.length).fill(0);

            const tx = await this.poolContract.flashLoan(
                receiverAddress,
                assets,
                amounts,
                modes,
                receiverAddress, // onBehalfOf
                params,
                referralCode
            );

            return await tx.wait();
        } catch (error) {
            console.log(chalk.red(`❌ Flash loan failed: ${error.message}`));
            throw error;
        }
    }

    /**
     * Request a simple flash loan (V3 only)
     */
    async flashLoanSimple(receiverAddress, asset, amount, params = '0x', referralCode = 0) {
        if (!this.initialized) {
            await this.initialize();
        }

        if (this.version !== 'v3') {
            throw new Error('flashLoanSimple only available in Aave V3');
        }

        if (!this.poolContract) {
            throw new Error('Pool contract not initialized');
        }

        try {
            const tx = await this.poolContract.flashLoanSimple(
                receiverAddress,
                asset,
                amount,
                params,
                referralCode
            );

            return await tx.wait();
        } catch (error) {
            console.log(chalk.red(`❌ Simple flash loan failed: ${error.message}`));
            throw error;
        }
    }

    /**
     * Get reserve data for an asset
     */
    async getReserveData(asset) {
        if (!this.initialized) {
            await this.initialize();
        }

        if (!this.poolContract) {
            throw new Error('Pool contract not initialized');
        }

        try {
            const data = await this.poolContract.getReserveData(asset);
            return data;
        } catch (error) {
            console.log(chalk.yellow(`⚠️  Failed to get reserve data: ${error.message}`));
            return null;
        }
    }

    /**
     * Get list of all reserves
     */
    async getReservesList() {
        if (!this.initialized) {
            await this.initialize();
        }

        if (!this.poolContract) {
            throw new Error('Pool contract not initialized');
        }

        try {
            return await this.poolContract.getReservesList();
        } catch (error) {
            console.log(chalk.yellow(`⚠️  Failed to get reserves list: ${error.message}`));
            return [];
        }
    }

    /**
     * Get user account data
     */
    async getUserAccountData(userAddress) {
        if (!this.initialized) {
            await this.initialize();
        }

        if (!this.poolContract) {
            throw new Error('Pool contract not initialized');
        }

        try {
            const data = await this.poolContract.getUserAccountData(userAddress);
            return {
                totalCollateral: data[0].toString(),
                totalDebt: data[1].toString(),
                availableBorrows: data[2].toString(),
                currentLiquidationThreshold: data[3].toString(),
                ltv: data[4].toString(),
                healthFactor: data[5].toString()
            };
        } catch (error) {
            console.log(chalk.yellow(`⚠️  Failed to get user account data: ${error.message}`));
            return null;
        }
    }

    /**
     * Calculate flash loan fee
     */
    calculateFlashLoanFee(amount) {
        const amountBN = BigInt(amount);
        const fee = (amountBN * BigInt(this.FLASH_LOAN_FEE)) / BigInt(10000);
        return fee;
    }

    /**
     * Calculate total amount to repay (amount + fee)
     */
    calculateRepayAmount(amount) {
        const amountBN = BigInt(amount);
        const fee = this.calculateFlashLoanFee(amount);
        return amountBN + fee;
    }

    /**
     * Get available liquidity for an asset
     */
    async getAvailableLiquidity(asset) {
        if (!this.initialized) {
            await this.initialize();
        }

        try {
            const reserveData = await this.getReserveData(asset);
            if (!reserveData) return null;

            // Get aToken contract to check available liquidity
            const aTokenAddress = reserveData.aTokenAddress;
            const aToken = new ethers.Contract(
                aTokenAddress,
                ['function totalSupply() external view returns (uint256)'],
                this.provider
            );

            const totalSupply = await aToken.totalSupply();
            return totalSupply.toString();
        } catch (error) {
            console.log(chalk.yellow(`⚠️  Failed to get available liquidity: ${error.message}`));
            return null;
        }
    }

    /**
     * Check if flash loan is available for given assets and amounts
     */
    async isFlashLoanAvailable(assets, amounts) {
        for (let i = 0; i < assets.length; i++) {
            const liquidity = await this.getAvailableLiquidity(assets[i]);
            if (!liquidity) return false;
            
            if (BigInt(liquidity) < BigInt(amounts[i])) {
                console.log(chalk.yellow(`⚠️  Insufficient liquidity for ${assets[i]}`));
                return false;
            }
        }
        return true;
    }

    /**
     * Get pool address
     */
    getPoolAddress() {
        if (!this.poolContract) {
            throw new Error('Pool contract not initialized');
        }
        return this.poolContract.target;
    }
}

module.exports = { AaveFlashLoanAdapter };
