#!/usr/bin/env node

/**
 * APEX System Configuration Validator
 * Validates that all required environment variables are properly configured
 * Run this before starting the system to ensure proper setup
 */

import chalk from 'chalk';
import { 
    validateConfig,
    getConfig,
    getModeDisplay,
    CURRENT_MODE,
    MODE
} from '../src/utils/config.js';

console.log(chalk.bold.cyan('\n========================================'));
console.log(chalk.bold.cyan('APEX SYSTEM CONFIGURATION VALIDATOR'));
console.log(chalk.bold.cyan('========================================\n'));

console.log(getModeDisplay());
console.log();

// Run validation
try {
    const isValid = validateConfig();
    
    if (isValid) {
        console.log(chalk.green('✅ Configuration validation passed!\n'));
        
        // Display configuration summary (with sensitive data redacted)
        console.log(chalk.cyan('Configuration Summary:'));
        console.log(chalk.gray('─────────────────────────────────────────\n'));
        
        const config = getConfig();
        
        // Display execution mode
        console.log(chalk.yellow('Execution Mode:'));
        console.log(`  ${config.mode}\n`);
        
        // Display chain configuration
        console.log(chalk.yellow('Configured Chains:'));
        Object.entries(config.chains).forEach(([key, chain]) => {
            const status = chain.rpcUrl ? chalk.green('✓') : chalk.red('✗');
            console.log(`  ${status} ${chain.name} (${chain.chainId})`);
        });
        console.log();
        
        // Display safety parameters
        console.log(chalk.yellow('Safety Parameters:'));
        console.log(`  Min Profit: $${config.safety.minProfitUSD}`);
        console.log(`  Max Gas Price: ${config.safety.maxGasPriceGwei} Gwei`);
        console.log(`  Slippage: ${config.safety.slippageBps} bps (${(config.safety.slippageBps / 100).toFixed(2)}%)`);
        console.log(`  Max Daily Loss: $${config.safety.maxDailyLossUSD}`);
        console.log();
        
        // Display ML configuration
        console.log(chalk.yellow('ML Configuration:'));
        console.log(`  Confidence Threshold: ${config.ml.confidenceThreshold}`);
        console.log(`  ML Filtering: ${config.ml.enableFiltering ? chalk.green('Enabled') : chalk.gray('Disabled')}`);
        console.log();
        
        // Display advanced features
        console.log(chalk.yellow('Advanced Features:'));
        console.log(`  Cross-Chain: ${config.system.enableCrossChain ? chalk.green('Enabled') : chalk.gray('Disabled')}`);
        console.log(`  Mempool Monitoring: ${config.system.enableMempoolMonitoring ? chalk.green('Enabled') : chalk.gray('Disabled')}`);
        console.log(`  Rust Engine: ${config.system.rustEngineEnabled ? chalk.green('Enabled') : chalk.gray('Disabled')}`);
        console.log(`  BloXroute: ${config.bloxroute.enabled ? chalk.green('Enabled') : chalk.gray('Disabled')}`);
        console.log(`  Telegram Alerts: ${config.telegram.enabled ? chalk.green('Enabled') : chalk.gray('Disabled')}`);
        console.log();
        
        // Display execution configuration
        console.log(chalk.yellow('Execution Configuration:'));
        console.log(`  Execute Real Transactions: ${config.execution.executeTransactions ? chalk.red('YES') : chalk.green('NO (Dry-run)')}`);
        console.log(`  Simulate Transactions: ${config.execution.simulateTransactions ? chalk.green('YES') : chalk.gray('NO')}`);
        console.log();
        
        // Display warnings
        if (config.mode === MODE.LIVE) {
            console.log(chalk.red.bold('⚠️  WARNING: LIVE MODE ENABLED'));
            console.log(chalk.red('   This will execute REAL transactions on-chain'));
            console.log(chalk.red('   Ensure you have tested thoroughly in DEV mode first!\n'));
        }
        
        if (!config.wallet.privateKey) {
            console.log(chalk.yellow('⚠️  No private key configured'));
            console.log(chalk.gray('   Required for LIVE mode, optional for DEV/SIM\n'));
        }
        
        console.log(chalk.green('✅ System is ready to start!\n'));
        process.exit(0);
    }
} catch (error) {
    console.log(chalk.red('❌ Configuration validation failed!\n'));
    console.log(chalk.red(error.message));
    console.log();
    console.log(chalk.yellow('Please check your .env file and ensure all required variables are set.'));
    console.log(chalk.gray('Refer to .env.example for configuration template.\n'));
    process.exit(1);
}
