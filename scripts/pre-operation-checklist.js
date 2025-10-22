#!/usr/bin/env node

/**
 * APEX ARBITRAGE SYSTEM - PROFESSIONAL PRE-OPERATION CHECKLIST
 * ==============================================================
 * 
 * This script performs a comprehensive pre-flight check before live operations:
 * ✅ Verifies all required environment variables
 * ✅ Validates system wallet configuration
 * ✅ Checks native gas token balances on all configured chains
 * ✅ Activates only chains with sufficient gas balance
 * ✅ Verifies RPC connectivity for each chain
 * ✅ Validates safety parameters and limits
 * ✅ Generates a comprehensive operational readiness report
 * 
 * Run with: node scripts/pre-operation-checklist.js
 * Or via npm: npm run precheck
 */

import chalk from 'chalk';
import { ethers } from 'ethers';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Console formatting helpers
const log = {
    header: (text) => console.log(chalk.bold.cyan(`\n${'='.repeat(70)}\n${text}\n${'='.repeat(70)}\n`)),
    section: (text) => console.log(chalk.bold.blue(`\n${'─'.repeat(70)}\n${text}\n${'─'.repeat(70)}`)),
    success: (text) => console.log(chalk.green(`✅ ${text}`)),
    error: (text) => console.log(chalk.red(`❌ ${text}`)),
    warning: (text) => console.log(chalk.yellow(`⚠️  ${text}`)),
    info: (text) => console.log(chalk.cyan(`ℹ️  ${text}`)),
    detail: (text) => console.log(chalk.gray(`   ${text}`)),
    space: () => console.log()
};

// Chain configuration with native tokens
const CHAINS = {
    POLYGON: {
        name: 'Polygon',
        chainId: 137,
        nativeToken: 'MATIC',
        rpcUrlKey: 'POLYGON_RPC_URL',
        minGasBalance: 1.0, // Minimum MATIC balance for operations
        decimals: 18
    },
    ETHEREUM: {
        name: 'Ethereum',
        chainId: 1,
        nativeToken: 'ETH',
        rpcUrlKey: 'ETHEREUM_RPC_URL',
        minGasBalance: 0.05, // Minimum ETH balance for operations
        decimals: 18
    },
    ARBITRUM: {
        name: 'Arbitrum',
        chainId: 42161,
        nativeToken: 'ETH',
        rpcUrlKey: 'ARBITRUM_RPC_URL',
        minGasBalance: 0.01, // Minimum ETH balance for operations
        decimals: 18
    },
    OPTIMISM: {
        name: 'Optimism',
        chainId: 10,
        nativeToken: 'ETH',
        rpcUrlKey: 'OPTIMISM_RPC_URL',
        minGasBalance: 0.01, // Minimum ETH balance for operations
        decimals: 18
    },
    BASE: {
        name: 'Base',
        chainId: 8453,
        nativeToken: 'ETH',
        rpcUrlKey: 'BASE_RPC_URL',
        minGasBalance: 0.01, // Minimum ETH balance for operations
        decimals: 18
    },
    BSC: {
        name: 'BSC',
        chainId: 56,
        nativeToken: 'BNB',
        rpcUrlKey: 'BSC_RPC_URL',
        minGasBalance: 0.05, // Minimum BNB balance for operations
        decimals: 18
    }
};

// Required environment variables
const REQUIRED_ENV_VARS = [
    'MODE',
    'MIN_PROFIT_USD',
    'MAX_GAS_PRICE_GWEI',
    'SLIPPAGE_BPS',
    'MAX_DAILY_LOSS',
    'MAX_CONSECUTIVE_FAILURES'
];

// Results tracking
const results = {
    criticalErrors: [],
    warnings: [],
    activeChains: [],
    inactiveChains: [],
    walletAddress: null,
    totalGasBalanceUSD: 0
};

/**
 * Step 1: Verify required environment variables
 */
async function verifyEnvironmentVariables() {
    log.section('STEP 1: Environment Variables Verification');
    
    let allPresent = true;
    
    // Check MODE
    const mode = process.env.MODE?.toUpperCase();
    if (!mode) {
        log.error('MODE environment variable is not set');
        results.criticalErrors.push('MODE not configured');
        allPresent = false;
    } else if (!['LIVE', 'DEV', 'SIM'].includes(mode)) {
        log.error(`Invalid MODE: ${mode}. Must be LIVE, DEV, or SIM`);
        results.criticalErrors.push('Invalid MODE value');
        allPresent = false;
    } else {
        log.success(`Mode: ${mode}`);
        
        if (mode === 'LIVE') {
            log.warning('LIVE MODE ENABLED - Real transactions will be executed!');
        } else {
            log.info(`${mode} mode - Transactions will be simulated`);
        }
    }
    
    // Check other required variables
    for (const varName of REQUIRED_ENV_VARS.filter(v => v !== 'MODE')) {
        const value = process.env[varName];
        if (!value) {
            log.error(`${varName} is not set`);
            results.criticalErrors.push(`${varName} not configured`);
            allPresent = false;
        } else {
            log.success(`${varName}: ${value}`);
        }
    }
    
    // Check RPC URLs for at least one chain
    const hasAnyRpc = Object.values(CHAINS).some(chain => process.env[chain.rpcUrlKey]);
    if (!hasAnyRpc) {
        log.error('No RPC URLs configured for any chain');
        results.criticalErrors.push('No chain RPC URLs configured');
        allPresent = false;
    }
    
    log.space();
    return allPresent;
}

/**
 * Step 2: Verify wallet configuration
 */
async function verifyWallet() {
    log.section('STEP 2: System Wallet Verification');
    
    const privateKey = process.env.PRIVATE_KEY;
    
    if (!privateKey) {
        log.error('PRIVATE_KEY is not configured');
        results.criticalErrors.push('No wallet private key configured');
        
        const mode = process.env.MODE?.toUpperCase();
        if (mode === 'LIVE') {
            log.error('PRIVATE_KEY is REQUIRED for LIVE mode');
            return false;
        } else {
            log.warning('PRIVATE_KEY recommended even for DEV/SIM mode testing');
            return true;
        }
    }
    
    try {
        // Validate private key format and derive wallet
        const wallet = new ethers.Wallet(privateKey);
        results.walletAddress = wallet.address;
        
        log.success(`Wallet configured successfully`);
        log.detail(`Address: ${wallet.address}`);
        log.space();
        
        return true;
    } catch (error) {
        log.error(`Invalid private key format: ${error.message}`);
        results.criticalErrors.push('Invalid wallet private key');
        return false;
    }
}

/**
 * Step 3: Check RPC connectivity and native gas balances for all chains
 */
async function verifyChainBalances() {
    log.section('STEP 3: Chain Connectivity & Native Gas Balance Check');
    
    if (!results.walletAddress) {
        log.warning('Skipping balance check - no valid wallet configured');
        return true;
    }
    
    const chainChecks = [];
    
    for (const [chainKey, chainConfig] of Object.entries(CHAINS)) {
        const rpcUrl = process.env[chainConfig.rpcUrlKey];
        
        if (!rpcUrl || rpcUrl.includes('YOUR_API_KEY')) {
            log.warning(`${chainConfig.name}: No valid RPC URL configured - INACTIVE`);
            results.inactiveChains.push({
                name: chainConfig.name,
                reason: 'No RPC URL'
            });
            continue;
        }
        
        chainChecks.push(checkChainBalance(chainKey, chainConfig, rpcUrl));
    }
    
    // Execute all chain checks in parallel
    await Promise.all(chainChecks);
    
    log.space();
    return true;
}

/**
 * Check balance for a specific chain
 */
async function checkChainBalance(chainKey, chainConfig, rpcUrl) {
    try {
        // Create provider with timeout
        const provider = new ethers.JsonRpcProvider(rpcUrl, chainConfig.chainId, {
            timeout: 10000
        });
        
        // Test connectivity
        const network = await provider.getNetwork();
        
        // Get wallet balance
        const balance = await provider.getBalance(results.walletAddress);
        const balanceFormatted = ethers.formatEther(balance);
        const balanceNum = parseFloat(balanceFormatted);
        
        // Estimate gas price for cost calculations
        const feeData = await provider.getFeeData();
        const gasPrice = feeData.gasPrice ? ethers.formatUnits(feeData.gasPrice, 'gwei') : 'N/A';
        
        // Determine if chain is active
        const isActive = balanceNum >= chainConfig.minGasBalance;
        
        if (isActive) {
            log.success(`${chainConfig.name}: ACTIVE`);
            log.detail(`Balance: ${balanceNum.toFixed(4)} ${chainConfig.nativeToken}`);
            log.detail(`Gas Price: ${gasPrice} Gwei`);
            log.detail(`Chain ID: ${network.chainId}`);
            
            results.activeChains.push({
                name: chainConfig.name,
                balance: balanceNum,
                token: chainConfig.nativeToken,
                gasPrice: gasPrice,
                chainId: network.chainId.toString()
            });
        } else {
            log.warning(`${chainConfig.name}: INACTIVE - Insufficient gas balance`);
            log.detail(`Balance: ${balanceNum.toFixed(4)} ${chainConfig.nativeToken} (min required: ${chainConfig.minGasBalance})`);
            log.detail(`Gas Price: ${gasPrice} Gwei`);
            
            results.inactiveChains.push({
                name: chainConfig.name,
                reason: 'Insufficient gas balance',
                balance: balanceNum,
                minRequired: chainConfig.minGasBalance,
                token: chainConfig.nativeToken
            });
        }
        
    } catch (error) {
        log.error(`${chainConfig.name}: Connection failed`);
        log.detail(`Error: ${error.message}`);
        
        results.inactiveChains.push({
            name: chainConfig.name,
            reason: `RPC connection error: ${error.message}`
        });
    }
}

/**
 * Step 4: Verify safety parameters
 */
async function verifySafetyParameters() {
    log.section('STEP 4: Safety Parameters Verification');
    
    const params = {
        minProfitUSD: parseFloat(process.env.MIN_PROFIT_USD || 0),
        maxGasPriceGwei: parseFloat(process.env.MAX_GAS_PRICE_GWEI || 0),
        slippageBps: parseFloat(process.env.SLIPPAGE_BPS || 0),
        maxDailyLoss: parseFloat(process.env.MAX_DAILY_LOSS || 0),
        maxConsecutiveFailures: parseInt(process.env.MAX_CONSECUTIVE_FAILURES || 0)
    };
    
    let allValid = true;
    
    // Validate minimum profit
    if (params.minProfitUSD < 1) {
        log.error(`MIN_PROFIT_USD too low: ${params.minProfitUSD} (recommended: >= $5)`);
        results.criticalErrors.push('MIN_PROFIT_USD too low');
        allValid = false;
    } else if (params.minProfitUSD < 5) {
        log.warning(`MIN_PROFIT_USD is low: $${params.minProfitUSD} (recommended: >= $5)`);
        results.warnings.push('MIN_PROFIT_USD below recommended threshold');
    } else {
        log.success(`Min Profit Threshold: $${params.minProfitUSD}`);
    }
    
    // Validate gas price
    if (params.maxGasPriceGwei < 10) {
        log.error(`MAX_GAS_PRICE_GWEI too low: ${params.maxGasPriceGwei} (may miss opportunities)`);
        results.warnings.push('MAX_GAS_PRICE_GWEI very low');
    } else if (params.maxGasPriceGwei > 500) {
        log.warning(`MAX_GAS_PRICE_GWEI very high: ${params.maxGasPriceGwei} Gwei (may lead to high costs)`);
        results.warnings.push('MAX_GAS_PRICE_GWEI very high');
    } else {
        log.success(`Max Gas Price: ${params.maxGasPriceGwei} Gwei`);
    }
    
    // Validate slippage
    if (params.slippageBps < 10 || params.slippageBps > 1000) {
        log.warning(`SLIPPAGE_BPS unusual: ${params.slippageBps} bps (${(params.slippageBps / 100).toFixed(2)}%)`);
        results.warnings.push('SLIPPAGE_BPS outside normal range');
    } else {
        log.success(`Slippage Tolerance: ${params.slippageBps} bps (${(params.slippageBps / 100).toFixed(2)}%)`);
    }
    
    // Validate daily loss limit
    if (params.maxDailyLoss < 10) {
        log.warning(`MAX_DAILY_LOSS is very low: $${params.maxDailyLoss}`);
        results.warnings.push('MAX_DAILY_LOSS very low');
    } else {
        log.success(`Max Daily Loss Limit: $${params.maxDailyLoss}`);
    }
    
    // Validate failure threshold
    if (params.maxConsecutiveFailures < 3) {
        log.warning(`MAX_CONSECUTIVE_FAILURES is low: ${params.maxConsecutiveFailures}`);
        results.warnings.push('MAX_CONSECUTIVE_FAILURES very low');
    } else {
        log.success(`Max Consecutive Failures: ${params.maxConsecutiveFailures}`);
    }
    
    log.space();
    return allValid;
}

/**
 * Step 5: Generate operational readiness report
 */
async function generateReport() {
    log.header('PRE-OPERATION CHECKLIST - FINAL REPORT');
    
    const mode = process.env.MODE?.toUpperCase();
    
    // Display mode
    console.log(chalk.bold.yellow('EXECUTION MODE'));
    if (mode === 'LIVE') {
        console.log(chalk.red.bold(`  🔴 ${mode} MODE - REAL TRANSACTIONS WILL BE EXECUTED`));
    } else if (mode === 'DEV') {
        console.log(chalk.yellow.bold(`  🟡 ${mode} MODE - SIMULATION ONLY (DRY-RUN)`));
    } else {
        console.log(chalk.blue.bold(`  🔵 ${mode} MODE - SIMULATION/BACKTESTING`));
    }
    log.space();
    
    // Display wallet info
    if (results.walletAddress) {
        console.log(chalk.bold.yellow('SYSTEM WALLET'));
        console.log(chalk.white(`  Address: ${results.walletAddress}`));
        log.space();
    }
    
    // Display active chains
    console.log(chalk.bold.yellow('ACTIVE CHAINS (Ready for Operations)'));
    if (results.activeChains.length === 0) {
        console.log(chalk.red('  ❌ NO ACTIVE CHAINS - CANNOT PROCEED'));
        log.space();
    } else {
        results.activeChains.forEach(chain => {
            console.log(chalk.green(`  ✅ ${chain.name.padEnd(15)} | Balance: ${chain.balance.toFixed(4)} ${chain.token} | Gas: ${chain.gasPrice} Gwei`));
        });
        log.space();
    }
    
    // Display inactive chains
    if (results.inactiveChains.length > 0) {
        console.log(chalk.bold.yellow('INACTIVE CHAINS (Not Operational)'));
        results.inactiveChains.forEach(chain => {
            console.log(chalk.gray(`  ⚫ ${chain.name.padEnd(15)} | Reason: ${chain.reason}`));
            if (chain.balance !== undefined) {
                console.log(chalk.gray(`     Current: ${chain.balance.toFixed(4)} ${chain.token}, Required: ${chain.minRequired} ${chain.token}`));
            }
        });
        log.space();
    }
    
    // Display warnings
    if (results.warnings.length > 0) {
        console.log(chalk.bold.yellow('⚠️  WARNINGS'));
        results.warnings.forEach(warning => {
            console.log(chalk.yellow(`  • ${warning}`));
        });
        log.space();
    }
    
    // Display critical errors
    if (results.criticalErrors.length > 0) {
        console.log(chalk.bold.red('❌ CRITICAL ERRORS'));
        results.criticalErrors.forEach(error => {
            console.log(chalk.red(`  • ${error}`));
        });
        log.space();
    }
    
    // Final verdict
    log.header('OPERATIONAL READINESS ASSESSMENT');
    
    const hasErrors = results.criticalErrors.length > 0;
    const hasActiveChains = results.activeChains.length > 0;
    const hasWallet = results.walletAddress !== null;
    
    if (hasErrors) {
        console.log(chalk.red.bold('🛑 SYSTEM NOT READY FOR OPERATIONS'));
        console.log(chalk.red('\nCritical errors must be resolved before proceeding.'));
        console.log(chalk.yellow('\nPlease:'));
        console.log(chalk.yellow('  1. Fix all critical errors listed above'));
        console.log(chalk.yellow('  2. Review and update your .env configuration'));
        console.log(chalk.yellow('  3. Run this checklist again to verify'));
        log.space();
        return false;
    }
    
    if (!hasActiveChains) {
        console.log(chalk.red.bold('🛑 NO ACTIVE CHAINS AVAILABLE'));
        console.log(chalk.red('\nAt least one chain must have sufficient gas balance.'));
        console.log(chalk.yellow('\nPlease:'));
        console.log(chalk.yellow('  1. Fund your wallet with native gas tokens'));
        console.log(chalk.yellow('  2. Ensure RPC URLs are properly configured'));
        console.log(chalk.yellow('  3. Run this checklist again to verify'));
        log.space();
        return false;
    }
    
    if (results.warnings.length > 0) {
        console.log(chalk.yellow.bold('✅ SYSTEM READY WITH WARNINGS'));
        console.log(chalk.yellow(`\nSystem is operational but ${results.warnings.length} warning(s) were found.`));
        console.log(chalk.yellow('Review warnings above before proceeding.'));
    } else {
        console.log(chalk.green.bold('✅ SYSTEM FULLY OPERATIONAL'));
        console.log(chalk.green('\nAll checks passed successfully!'));
    }
    
    console.log(chalk.cyan('\nOperational Summary:'));
    console.log(chalk.white(`  • Mode: ${mode}`));
    console.log(chalk.white(`  • Active Chains: ${results.activeChains.length}`));
    console.log(chalk.white(`  • Wallet: ${hasWallet ? 'Configured' : 'Not Configured'}`));
    console.log(chalk.white(`  • Critical Errors: ${results.criticalErrors.length}`));
    console.log(chalk.white(`  • Warnings: ${results.warnings.length}`));
    
    log.space();
    
    if (mode === 'LIVE' && hasActiveChains && !hasErrors) {
        console.log(chalk.red.bold('⚠️  FINAL WARNING FOR LIVE MODE ⚠️'));
        console.log(chalk.red('You are about to run in LIVE mode with real funds.'));
        console.log(chalk.red('Ensure you have:'));
        console.log(chalk.red('  • Thoroughly tested in DEV mode'));
        console.log(chalk.red('  • Verified all safety parameters'));
        console.log(chalk.red('  • Confirmed sufficient gas balances'));
        console.log(chalk.red('  • Set appropriate risk limits'));
        log.space();
    }
    
    console.log(chalk.cyan('You can now start the system with:'));
    console.log(chalk.white('  npm start'));
    log.space();
    
    return !hasErrors && hasActiveChains;
}

/**
 * Main execution
 */
async function main() {
    log.header('APEX ARBITRAGE SYSTEM - PRE-OPERATION CHECKLIST');
    
    console.log(chalk.cyan('This comprehensive checklist verifies:'));
    console.log(chalk.white('  ✓ Required environment variables'));
    console.log(chalk.white('  ✓ System wallet configuration'));
    console.log(chalk.white('  ✓ Native gas token balances'));
    console.log(chalk.white('  ✓ Chain connectivity and activation'));
    console.log(chalk.white('  ✓ Safety parameters and limits'));
    log.space();
    
    console.log(chalk.gray('Starting comprehensive system checks...'));
    log.space();
    
    try {
        // Run all checks
        await verifyEnvironmentVariables();
        await verifyWallet();
        await verifyChainBalances();
        await verifySafetyParameters();
        
        // Generate final report
        const isReady = await generateReport();
        
        // Exit with appropriate code
        process.exit(isReady ? 0 : 1);
        
    } catch (error) {
        log.error(`Fatal error during checklist execution: ${error.message}`);
        console.error(error);
        process.exit(1);
    }
}

// Execute main function
main().catch(error => {
    console.error(chalk.red('Unhandled error:'), error);
    process.exit(1);
});
