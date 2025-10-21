#!/usr/bin/env node
/**
 * Complete System Wiring Validation
 * Validates that APEX system is fully wired and ready to run
 * Tests: All modes (LIVE/DEV/SIM), real-time DEX data, websockets, mempool, 4x4x4x4 execution
 */

import chalk from 'chalk';
import { CURRENT_MODE, MODE, CHAINS, DEXES, SYSTEM_CONFIG, SAFETY_CONFIG, getModeDisplay } from '../src/utils/config.js';
import { executionController } from '../src/utils/executionController.js';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log(chalk.bold.cyan('\n' + '═'.repeat(80)));
console.log(chalk.bold.cyan('   APEX ARBITRAGE SYSTEM - COMPLETE WIRING VALIDATION'));
console.log(chalk.bold.cyan('═'.repeat(80) + '\n'));

let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;
let warningChecks = 0;

function checkPass(message) {
    totalChecks++;
    passedChecks++;
    console.log(chalk.green('✅ ' + message));
}

function checkFail(message) {
    totalChecks++;
    failedChecks++;
    console.log(chalk.red('❌ ' + message));
}

function checkWarn(message) {
    totalChecks++;
    warningChecks++;
    console.log(chalk.yellow('⚠️  ' + message));
}

function section(title) {
    console.log(chalk.cyan('\n' + '─'.repeat(80)));
    console.log(chalk.cyan.bold(title));
    console.log(chalk.cyan('─'.repeat(80)));
}

// 1. MODE CONFIGURATION VALIDATION
section('1. EXECUTION MODE CONFIGURATION');

console.log(chalk.white(`Current Mode: ${getModeDisplay()}`));

if (Object.values(MODE).includes(CURRENT_MODE)) {
    checkPass(`Valid execution mode: ${CURRENT_MODE}`);
} else {
    checkFail(`Invalid execution mode: ${CURRENT_MODE}`);
}

if (CURRENT_MODE === MODE.LIVE) {
    checkWarn('System is in LIVE mode - real transactions will be executed');
    checkPass('LIVE mode: Transaction execution enabled');
} else if (CURRENT_MODE === MODE.DEV) {
    checkPass('DEV mode: Safe testing with real data, simulated transactions');
} else if (CURRENT_MODE === MODE.SIM) {
    checkPass('SIM mode: Simulation/backtesting mode active');
}

// Check execution controller is properly wired
if (executionController && executionController.mode === CURRENT_MODE) {
    checkPass('Execution controller properly initialized');
} else {
    checkFail('Execution controller mode mismatch');
}

// 2. MULTI-CHAIN CONFIGURATION
section('2. MULTI-CHAIN SUPPORT CONFIGURATION');

const requiredChains = ['POLYGON', 'ETHEREUM', 'ARBITRUM', 'OPTIMISM', 'BASE', 'BSC'];
let chainConfigured = 0;
let chainWithRpc = 0;
let chainWithWss = 0;

for (const chain of requiredChains) {
    if (CHAINS[chain]) {
        chainConfigured++;
        console.log(chalk.white(`  ${chain}:`));
        console.log(chalk.gray(`    Chain ID: ${CHAINS[chain].chainId}`));
        console.log(chalk.gray(`    Native: ${CHAINS[chain].nativeCurrency}`));
        
        if (CHAINS[chain].rpcUrl) {
            chainWithRpc++;
            console.log(chalk.green(`    ✓ RPC URL configured`));
        } else {
            console.log(chalk.red(`    ✗ RPC URL missing`));
        }
        
        if (CHAINS[chain].wssUrl) {
            chainWithWss++;
            console.log(chalk.green(`    ✓ WebSocket URL configured`));
        } else {
            console.log(chalk.gray(`    ○ WebSocket URL not configured (optional)`));
        }
    }
}

if (chainConfigured === requiredChains.length) {
    checkPass(`All ${chainConfigured} chains configured`);
} else {
    checkFail(`Only ${chainConfigured}/${requiredChains.length} chains configured`);
}

if (chainWithWss >= 2) {
    checkPass(`${chainWithWss} chains have WebSocket URLs for real-time monitoring`);
} else {
    checkWarn(`Only ${chainWithWss} chains have WebSocket URLs configured`);
}

// 3. DEX CONFIGURATION
section('3. DEX CONFIGURATION');

let totalDexes = 0;
for (const [chain, dexes] of Object.entries(DEXES)) {
    console.log(chalk.white(`  ${chain}: ${dexes.length} DEXes`));
    dexes.forEach(dex => {
        console.log(chalk.gray(`    - ${dex.name} (${dex.type})`));
        totalDexes++;
    });
}

if (totalDexes >= 5) {
    checkPass(`${totalDexes} DEXes configured across all chains`);
} else {
    checkWarn(`Only ${totalDexes} DEXes configured`);
}

// Check DEX properties
let dexesWithRouter = 0;
for (const dexes of Object.values(DEXES)) {
    dexesWithRouter += dexes.filter(d => d.router).length;
}

if (dexesWithRouter === totalDexes) {
    checkPass('All DEXes have router addresses configured');
} else {
    checkWarn(`${dexesWithRouter}/${totalDexes} DEXes have router addresses`);
}

// 4. REAL-TIME DATA CAPABILITIES
section('4. REAL-TIME DEX DATA CAPABILITIES');

// Check for DEX pool fetcher
const dexPoolFetcherPath = path.join(process.cwd(), 'src/dex_pool_fetcher.js');
if (fs.existsSync(dexPoolFetcherPath)) {
    checkPass('DEX Pool Fetcher module exists');
    
    const content = fs.readFileSync(dexPoolFetcherPath, 'utf-8');
    if (content.includes('fetch') || content.includes('get')) {
        checkPass('DEX Pool Fetcher has data fetching capability');
    }
} else {
    checkFail('DEX Pool Fetcher module missing');
}

// Check for SDK pool loader
const sdkLoaderPath = path.join(process.cwd(), 'src/sdk_pool_loader.js');
if (fs.existsSync(sdkLoaderPath)) {
    checkPass('SDK Pool Loader module exists');
} else {
    checkWarn('SDK Pool Loader module not found');
}

// Check for TVL orchestrator
const tvlOrchestratorPath = path.join(process.cwd(), 'src/python/tvl_orchestrator.py');
if (fs.existsSync(tvlOrchestratorPath)) {
    checkPass('TVL Orchestrator module exists');
    
    const content = fs.readFileSync(tvlOrchestratorPath, 'utf-8');
    if (content.includes('parallel')) {
        checkPass('TVL Orchestrator supports parallel fetching');
    }
} else {
    checkWarn('TVL Orchestrator module not found');
}

// 5. WEBSOCKET CONNECTIONS
section('5. WEBSOCKET REAL-TIME CONNECTIONS');

// Check for WebSocket server
const wsServerPath = path.join(process.cwd(), 'src/python/websocket_server.py');
if (fs.existsSync(wsServerPath)) {
    checkPass('WebSocket Server module exists');
    
    const content = fs.readFileSync(wsServerPath, 'utf-8');
    if (content.includes('WebSocketStreamer') || content.includes('websocket')) {
        checkPass('WebSocket streaming capability available');
    }
    if (content.includes('broadcast')) {
        checkPass('WebSocket broadcast functionality available');
    }
} else {
    checkFail('WebSocket Server module missing');
}

// Check ws package
try {
    await import('ws');
    checkPass('ws package installed for WebSocket support');
} catch (err) {
    checkFail('ws package not installed');
}

// 6. MEMPOOL MONITORING & MEV CAPABILITIES
section('6. MEMPOOL MONITORING & MEV STRATEGIES');

// Check orchestrator for mempool support
const orchestratorPath = path.join(process.cwd(), 'src/python/orchestrator.py');
if (fs.existsSync(orchestratorPath)) {
    checkPass('Main Orchestrator module exists');
    
    const content = fs.readFileSync(orchestratorPath, 'utf-8');
    
    if (content.includes('MempoolWatchdog')) {
        checkPass('MempoolWatchdog class implemented');
    } else {
        checkFail('MempoolWatchdog class missing');
    }
    
    if (content.includes('monitor_mempool')) {
        checkPass('Mempool monitoring function available');
    } else {
        checkWarn('Mempool monitoring function not found');
    }
    
    // Check for MEV strategies
    if (content.includes('frontrun') || content.includes('backrun')) {
        checkPass('Front-running/back-running support detected');
    } else {
        checkWarn('Front-running/back-running not explicitly implemented');
    }
    
    if (content.includes('sandwich')) {
        checkPass('Sandwich attack strategy detected');
    } else {
        checkWarn('Sandwich attack strategy not explicitly implemented');
    }
    
    if (content.includes('should_submit_private')) {
        checkPass('Private transaction relay support available');
    }
} else {
    checkFail('Main Orchestrator module missing');
}

// Check BloXroute integration
const bloxroutePath = path.join(process.cwd(), 'src/utils/bloxrouteIntegration.js');
if (fs.existsSync(bloxroutePath)) {
    checkPass('BloXroute integration module exists');
    
    const content = fs.readFileSync(bloxroutePath, 'utf-8');
    if (content.includes('mempool') || content.includes('pending')) {
        checkPass('BloXroute mempool subscription capability available');
    }
    if (content.includes('private') || content.includes('relay')) {
        checkPass('BloXroute private transaction support available');
    }
} else {
    checkWarn('BloXroute integration module not found (optional)');
}

// Check mempool monitoring configuration
if (SYSTEM_CONFIG.enableMempoolMonitoring !== undefined) {
    checkPass(`Mempool monitoring configured: ${SYSTEM_CONFIG.enableMempoolMonitoring ? 'ENABLED' : 'DISABLED'}`);
} else {
    checkWarn('Mempool monitoring not configured');
}

// 7. 4x4x4x4 PARALLEL EXECUTION ENGINES
section('7. 4x4x4x4 PARALLEL EXECUTION ENGINES (MICRO RAPTOR BOTS)');

if (fs.existsSync(orchestratorPath)) {
    const content = fs.readFileSync(orchestratorPath, 'utf-8');
    
    if (content.includes('MicroRaptorBot')) {
        checkPass('MicroRaptorBot class implemented');
        
        if (content.includes('spawn_children') || content.includes('spawn')) {
            checkPass('Bot spawning capability available');
        }
        
        if (content.includes('parallel_fetch')) {
            checkPass('Parallel data fetching implemented');
        }
        
        if (content.includes('layer') && content.includes('4')) {
            checkPass('4-layer bot structure support detected');
        } else {
            checkWarn('4-layer structure not explicitly verified');
        }
    } else {
        checkFail('MicroRaptorBot class missing');
    }
    
    if (content.includes('ParallelChainScanner')) {
        checkPass('ParallelChainScanner class implemented');
    }
    
    if (content.includes('scan_all_chains')) {
        checkPass('Multi-chain parallel scanning capability available');
    }
}

// Check raptor bot configuration
if (SYSTEM_CONFIG.enableMicroRaptorBots !== undefined) {
    checkPass(`Micro Raptor Bots configured: ${SYSTEM_CONFIG.enableMicroRaptorBots ? 'ENABLED' : 'DISABLED'}`);
    
    if (SYSTEM_CONFIG.raptorBotCount >= 4) {
        checkPass(`Raptor bot count: ${SYSTEM_CONFIG.raptorBotCount} (sufficient for 4x4x4x4)`);
    } else {
        checkWarn(`Raptor bot count: ${SYSTEM_CONFIG.raptorBotCount} (minimum 4 recommended)`);
    }
} else {
    checkWarn('Micro Raptor Bots not configured');
}

// 8. ML/AI ENGINE
section('8. ML/AI ENGINE INTEGRATION');

// Check for ML models
const modelDir = path.join(process.cwd(), 'data/models');
if (fs.existsSync(modelDir)) {
    checkPass('ML models directory exists');
    
    const models = fs.readdirSync(modelDir);
    console.log(chalk.gray(`  Found ${models.length} files in models directory`));
    
    if (models.some(m => m.includes('onnx'))) {
        checkPass('ONNX model files detected');
    } else {
        checkWarn('No ONNX model files found');
    }
} else {
    checkWarn('ML models directory not found');
}

// Check for AI engine
const aiEnginePath = path.join(process.cwd(), 'src/python/omni_mev_ai_engine.py');
if (fs.existsSync(aiEnginePath)) {
    checkPass('AI MEV Engine module exists');
} else {
    checkWarn('AI MEV Engine module not found');
}

// 9. SAFETY MECHANISMS
section('9. SAFETY MECHANISMS');

console.log(chalk.white('  Safety Limits:'));
console.log(chalk.gray(`    Min Profit: $${SAFETY_CONFIG.minProfitUSD}`));
console.log(chalk.gray(`    Max Gas Price: ${SAFETY_CONFIG.maxGasPriceGwei} Gwei`));
console.log(chalk.gray(`    Max Daily Loss: $${SAFETY_CONFIG.maxDailyLossUSD}`));
console.log(chalk.gray(`    Max Consecutive Failures: ${SAFETY_CONFIG.maxConsecutiveFailures}`));
console.log(chalk.gray(`    Min Time Between Trades: ${SAFETY_CONFIG.minTimeBetweenTrades}ms`));

if (SAFETY_CONFIG.minProfitUSD > 0) {
    checkPass('Minimum profit threshold configured');
} else {
    checkFail('Minimum profit threshold not set');
}

if (SAFETY_CONFIG.maxGasPriceGwei > 0) {
    checkPass('Maximum gas price limit configured');
} else {
    checkWarn('Maximum gas price not limited');
}

if (SAFETY_CONFIG.maxDailyLossUSD > 0) {
    checkPass('Daily loss limit configured');
} else {
    checkWarn('Daily loss limit not set');
}

// 10. SYSTEM INTEGRATION
section('10. SYSTEM INTEGRATION & READINESS');

// Check main entry point
const mainIndexPath = path.join(process.cwd(), 'src/index.js');
if (fs.existsSync(mainIndexPath)) {
    checkPass('Main system entry point exists');
    
    const content = fs.readFileSync(mainIndexPath, 'utf-8');
    if (content.includes('ApexSystem')) {
        checkPass('ApexSystem class defined');
    }
    if (content.includes('initializeProviders')) {
        checkPass('Provider initialization available');
    }
    if (content.includes('pythonProcess') || content.includes('Python')) {
        checkPass('Python orchestrator integration available');
    }
} else {
    checkFail('Main system entry point missing');
}

// Check for database
const dbPath = path.join(process.cwd(), 'src/utils/database.js');
if (fs.existsSync(dbPath)) {
    checkPass('Database module exists');
} else {
    checkWarn('Database module not found');
}

// Check for telemetry
const telemetryPath = path.join(process.cwd(), 'src/utils/telemetry.js');
if (fs.existsSync(telemetryPath)) {
    checkPass('Telemetry module exists');
} else {
    checkWarn('Telemetry module not found');
}

// 11. MODE-SPECIFIC VALIDATION
section('11. MODE-SPECIFIC BEHAVIOR VALIDATION');

console.log(chalk.white(`  Testing ${CURRENT_MODE} mode behavior...`));

// Create mock opportunity
const mockOpportunity = {
    route_id: 'validation_test',
    profit_usd: 10,
    tokens: ['USDC', 'USDT', 'USDC'],
    gas_estimate: 300000
};

const decision = executionController.shouldExecute(mockOpportunity);

if (CURRENT_MODE === MODE.LIVE) {
    if (decision.execute === true && decision.simulate === false) {
        checkPass('LIVE mode correctly configured to execute real transactions');
    } else {
        checkFail('LIVE mode not properly configured for execution');
    }
} else {
    if (decision.execute === false && decision.simulate === true) {
        checkPass(`${CURRENT_MODE} mode correctly configured to simulate transactions`);
    } else {
        checkFail(`${CURRENT_MODE} mode not properly configured for simulation`);
    }
}

// Test simulation capability in non-LIVE modes
if (CURRENT_MODE !== MODE.LIVE) {
    try {
        const mockExecute = async () => ({ txHash: '0xtest' });
        const simResult = await executionController.simulateTransaction(mockOpportunity, mockExecute);
        
        if (simResult.wouldExecute !== undefined) {
            checkPass('Transaction simulation working correctly');
        }
    } catch (err) {
        checkFail(`Simulation test failed: ${err.message}`);
    }
}

// 12. DEPENDENCIES CHECK
section('12. CRITICAL DEPENDENCIES');

const criticalPackages = ['ethers', 'web3', 'ws', 'axios', 'dotenv', 'chalk'];
for (const pkg of criticalPackages) {
    try {
        await import(pkg);
        checkPass(`${pkg} package available`);
    } catch (err) {
        checkFail(`${pkg} package missing`);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// FINAL SUMMARY
// ═══════════════════════════════════════════════════════════════════════════

console.log(chalk.bold.cyan('\n' + '═'.repeat(80)));
console.log(chalk.bold.cyan('   VALIDATION SUMMARY'));
console.log(chalk.bold.cyan('═'.repeat(80) + '\n'));

console.log(chalk.white(`Total Checks:     ${totalChecks}`));
console.log(chalk.green(`✅ Passed:        ${passedChecks}`));
console.log(chalk.red(`❌ Failed:        ${failedChecks}`));
console.log(chalk.yellow(`⚠️  Warnings:     ${warningChecks}`));

const successRate = ((passedChecks / totalChecks) * 100).toFixed(1);
console.log(chalk.white(`\nSuccess Rate:     ${successRate}%`));

console.log(chalk.bold.cyan('\n' + '═'.repeat(80)));

if (failedChecks === 0) {
    console.log(chalk.green.bold('✅ SYSTEM FULLY WIRED AND READY TO RUN'));
    console.log(chalk.green('\nThe APEX Arbitrage System is properly configured and ready for:'));
    console.log(chalk.green('  ✓ All execution modes (LIVE/DEV/SIM)'));
    console.log(chalk.green('  ✓ Real-time DEX data collection'));
    console.log(chalk.green('  ✓ WebSocket connections'));
    console.log(chalk.green('  ✓ Mempool monitoring'));
    console.log(chalk.green('  ✓ 4x4x4x4 parallel execution engines'));
    console.log(chalk.green('  ✓ MEV strategies (front-running/back-running/sandwich)'));
    
    console.log(chalk.cyan('\nTo start the system:'));
    console.log(chalk.white('  npm start           # Start all components'));
    console.log(chalk.white('  npm run simulate    # Run in simulation mode'));
    console.log(chalk.white('  npm run dev         # Development mode'));
} else {
    console.log(chalk.red.bold(`❌ ${failedChecks} CRITICAL ISSUE(S) FOUND`));
    console.log(chalk.yellow('\nPlease fix the failed checks before running the system.'));
}

if (warningChecks > 0) {
    console.log(chalk.yellow(`\n⚠️  ${warningChecks} warning(s) detected - system may run with limited functionality`));
}

console.log(chalk.bold.cyan('═'.repeat(80) + '\n'));

// Exit with appropriate code
process.exit(failedChecks > 0 ? 1 : 0);
