/**
 * Aave V3 Flash Loan Adapter
 * Provides interface for executing flash loans on Aave V3
 */

import { ethers } from 'ethers';
import chalk from 'chalk';

/**
 * Aave V3 Pool ABI (from dex_pool_fetcher)
 */
const AAVE_V3_POOL_ABI = [
    'function flashLoan(address receiverAddress, address[] assets, uint256[] amounts, uint256[] interestRateModes, address onBehalfOf, bytes params, uint16 referralCode) external',
    'function flashLoanSimple(address receiverAddress, address asset, uint256 amount, bytes params, uint16 referralCode) external',
    'function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external',
    'function withdraw(address asset, uint256 amount, address to) external returns (uint256)',
    'function borrow(address asset, uint256 amount, uint256 interestRateMode, uint16 referralCode, address onBehalfOf) external',
    'function repay(address asset, uint256 amount, uint256 interestRateMode, address onBehalfOf) external returns (uint256)',
    'function getUserAccountData(address user) external view returns (uint256 totalCollateralBase, uint256 totalDebtBase, uint256 availableBorrowsBase, uint256 currentLiquidationThreshold, uint256 ltv, uint256 healthFactor)',
    'function getReserveData(address asset) external view returns (tuple(uint256 configuration, uint128 liquidityIndex, uint128 currentLiquidityRate, uint128 variableBorrowIndex, uint128 currentVariableBorrowRate, uint128 currentStableBorrowRate, uint40 lastUpdateTimestamp, uint16 id, address aTokenAddress, address stableDebtTokenAddress, address variableDebtTokenAddress, address interestRateStrategyAddress, uint128 accruedToTreasury, uint128 unbacked, uint128 isolationModeTotalDebt))',
    'function getReservesList() external view returns (address[])',
    'function FLASHLOAN_PREMIUM_TOTAL() external view returns (uint128)',
    'function FLASHLOAN_PREMIUM_TO_PROTOCOL() external view returns (uint128)'
];

/**
 * Aave Flash Loan Receiver Interface
 */
const AAVE_FLASHLOAN_RECEIVER_ABI = [
    'function executeOperation(address[] assets, uint256[] amounts, uint256[] premiums, address initiator, bytes params) external returns (bool)'
];

class AaveFlashLoanAdapter {
    constructor(provider, config) {
        this.provider = provider;
        this.config = config;
        this.pool = new ethers.Contract(config.pool, AAVE_V3_POOL_ABI, provider);
    }

    /**
     * Execute flash loan
     */
    async flashLoan(receiverAddress, assets, amounts, interestRateModes, onBehalfOf, params, referralCode, signer) {
        try {
            const poolWithSigner = this.pool.connect(signer);
            const tx = await poolWithSigner.flashLoan(
                receiverAddress,
                assets,
                amounts,
                interestRateModes,
                onBehalfOf,
                params,
                referralCode
            );
            return await tx.wait();
        } catch (error) {
            console.log(chalk.red(`Aave: Error executing flash loan: ${error.message}`));
            throw error;
        }
    }

    /**
     * Execute simple flash loan (single asset)
     */
    async flashLoanSimple(receiverAddress, asset, amount, params, referralCode, signer) {
        try {
            const poolWithSigner = this.pool.connect(signer);
            const tx = await poolWithSigner.flashLoanSimple(
                receiverAddress,
                asset,
                amount,
                params,
                referralCode
            );
            return await tx.wait();
        } catch (error) {
            console.log(chalk.red(`Aave: Error executing simple flash loan: ${error.message}`));
            throw error;
        }
    }

    /**
     * Get flash loan premium (fee)
     */
    async getFlashLoanPremiumTotal() {
        try {
            return await this.pool.FLASHLOAN_PREMIUM_TOTAL();
        } catch (error) {
            console.log(chalk.red(`Aave: Error getting flash loan premium: ${error.message}`));
            throw error;
        }
    }

    /**
     * Get protocol fee for flash loans
     */
    async getFlashLoanPremiumToProtocol() {
        try {
            return await this.pool.FLASHLOAN_PREMIUM_TO_PROTOCOL();
        } catch (error) {
            console.log(chalk.red(`Aave: Error getting protocol premium: ${error.message}`));
            throw error;
        }
    }

    /**
     * Get user account data
     */
    async getUserAccountData(userAddress) {
        try {
            return await this.pool.getUserAccountData(userAddress);
        } catch (error) {
            console.log(chalk.red(`Aave: Error getting user account data: ${error.message}`));
            throw error;
        }
    }

    /**
     * Get reserve data for an asset
     */
    async getReserveData(asset) {
        try {
            return await this.pool.getReserveData(asset);
        } catch (error) {
            console.log(chalk.red(`Aave: Error getting reserve data: ${error.message}`));
            throw error;
        }
    }

    /**
     * Get list of all reserves
     */
    async getReservesList() {
        try {
            return await this.pool.getReservesList();
        } catch (error) {
            console.log(chalk.red(`Aave: Error getting reserves list: ${error.message}`));
            throw error;
        }
    }

    /**
     * Supply asset to Aave
     */
    async supply(asset, amount, onBehalfOf, referralCode, signer) {
        try {
            const poolWithSigner = this.pool.connect(signer);
            const tx = await poolWithSigner.supply(
                asset,
                amount,
                onBehalfOf,
                referralCode
            );
            return await tx.wait();
        } catch (error) {
            console.log(chalk.red(`Aave: Error supplying asset: ${error.message}`));
            throw error;
        }
    }

    /**
     * Withdraw asset from Aave
     */
    async withdraw(asset, amount, to, signer) {
        try {
            const poolWithSigner = this.pool.connect(signer);
            const tx = await poolWithSigner.withdraw(asset, amount, to);
            return await tx.wait();
        } catch (error) {
            console.log(chalk.red(`Aave: Error withdrawing asset: ${error.message}`));
            throw error;
        }
    }

    /**
     * Borrow asset from Aave
     */
    async borrow(asset, amount, interestRateMode, referralCode, onBehalfOf, signer) {
        try {
            const poolWithSigner = this.pool.connect(signer);
            const tx = await poolWithSigner.borrow(
                asset,
                amount,
                interestRateMode,
                referralCode,
                onBehalfOf
            );
            return await tx.wait();
        } catch (error) {
            console.log(chalk.red(`Aave: Error borrowing asset: ${error.message}`));
            throw error;
        }
    }

    /**
     * Repay borrowed asset
     */
    async repay(asset, amount, interestRateMode, onBehalfOf, signer) {
        try {
            const poolWithSigner = this.pool.connect(signer);
            const tx = await poolWithSigner.repay(
                asset,
                amount,
                interestRateMode,
                onBehalfOf
            );
            return await tx.wait();
        } catch (error) {
            console.log(chalk.red(`Aave: Error repaying asset: ${error.message}`));
            throw error;
        }
    }
}

export {
    AaveFlashLoanAdapter,
    AAVE_V3_POOL_ABI,
    AAVE_FLASHLOAN_RECEIVER_ABI
};
