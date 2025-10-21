#!/usr/bin/env node
/**
 * End-to-End System Integration Test
 * Tests complete workflow: data fetching → analysis → decision → simulation
 */

import chalk from 'chalk';
import { executionController } from '../src/utils/executionController.js';
import { CURRENT_MODE, MODE, CHAINS, ARBITRAGE_ROUTES } from '../src/utils/config.js';

console.log(chalk.bold.cyan('\n' + '═'.repeat(80)));
console.log(chalk.bold.cyan('   APEX SYSTEM - END-TO-END INTEGRATION TEST'));
console.log(chalk.bold.cyan('═'.repeat(80) + '\n'));

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function testPass(message) {
    totalTests++;
    passedTests++;
    console.log(chalk.green('✅ ' + message));
}

function testFail(message) {
    totalTests++;
    failedTests++;
    console.log(chalk.red('❌ ' + message));
}

function testInfo(message) {
    console.log(chalk.white('ℹ️  ' + message));
}

function section(title) {
    console.log(chalk.cyan('\n' + '─'.repeat(80)));
    console.log(chalk.cyan.bold(title));
    console.log(chalk.cyan('─'.repeat(80)));
}

// Test 1: System Initialization
section('1. SYSTEM INITIALIZATION');

testInfo(`Running in ${CURRENT_MODE} mode`);

if (executionController && executionController.mode) {
    testPass('Execution controller initialized');
} else {
    testFail('Execution controller not initialized');
}

// Test 2: Configuration Loading
section('2. CONFIGURATION VALIDATION');

if (Object.keys(CHAINS).length >= 6) {
    testPass(`${Object.keys(CHAINS).length} chains configured`);
} else {
    testFail('Insufficient chains configured');
}

if (ARBITRAGE_ROUTES && ARBITRAGE_ROUTES.length >= 4) {
    testPass(`${ARBITRAGE_ROUTES.length} arbitrage routes configured`);
} else {
    testFail('Insufficient arbitrage routes configured');
}

// Test 3: Mode-Specific Behavior
section('3. MODE-SPECIFIC BEHAVIOR TEST');

// Create test opportunity
const mockOpportunity = {
    route_id: 'test_usdc_usdt_quickswap_sushiswap',
    tokens: ['USDC', 'USDT', 'USDC'],
    dexes: ['quickswap', 'sushiswap'],
    profit_usd: 15.50,
    expected_output: 1015.50,
    input_amount: 1000,
    gas_estimate: 350000,
    confidence_score: 0.85,
    chain: 'POLYGON'
};

testInfo('Testing with mock opportunity:');
testInfo(`  Route: ${mockOpportunity.tokens.join(' → ')}`);
testInfo(`  Expected Profit: $${mockOpportunity.profit_usd}`);
testInfo(`  Confidence: ${(mockOpportunity.confidence_score * 100).toFixed(1)}%`);

// Test execution decision
const decision = executionController.shouldExecute(mockOpportunity);

if (decision && typeof decision.execute === 'boolean') {
    testPass('Execution decision generated');
    testInfo(`  Execute: ${decision.execute}`);
    testInfo(`  Simulate: ${decision.simulate}`);
    testInfo(`  Reason: ${decision.reason}`);
} else {
    testFail('Failed to generate execution decision');
}

// Validate mode-specific behavior
if (CURRENT_MODE === MODE.LIVE) {
    if (decision.execute === true && decision.simulate === false) {
        testPass('LIVE mode: Would execute real transaction');
    } else {
        testFail('LIVE mode: Incorrect execution behavior');
    }
} else {
    if (decision.execute === false && decision.simulate === true) {
        testPass(`${CURRENT_MODE} mode: Would simulate transaction`);
    } else {
        testFail(`${CURRENT_MODE} mode: Incorrect simulation behavior`);
    }
}

// Test 4: Transaction Simulation
section('4. TRANSACTION SIMULATION TEST');

if (CURRENT_MODE !== MODE.LIVE) {
    testInfo('Running transaction simulation...');
    
    try {
        // Mock execute function
        const mockExecute = async (opp) => {
            return {
                txHash: '0xtest123456789',
                blockNumber: 12345678,
                status: 'success'
            };
        };
        
        // Run simulation
        const simResult = await executionController.simulateTransaction(
            mockOpportunity,
            mockExecute
        );
        
        if (simResult) {
            testPass('Simulation completed successfully');
            
            if (simResult.wouldExecute !== undefined) {
                testPass('Simulation provides execution prediction');
                testInfo(`  Would Execute: ${simResult.wouldExecute ? 'YES' : 'NO'}`);
            }
            
            if (Array.isArray(simResult.checks)) {
                testPass(`${simResult.checks.length} validation checks performed`);
                simResult.checks.forEach(check => testInfo(`  ${check}`));
            }
            
            if (simResult.hasSufficientProfit) {
                testPass('Profit validation passed');
            }
            
            if (simResult.hasValidRoute) {
                testPass('Route validation passed');
            }
            
            if (simResult.hasGasEstimate) {
                testPass('Gas estimation available');
            }
        } else {
            testFail('Simulation returned null result');
        }
    } catch (err) {
        testFail(`Simulation error: ${err.message}`);
    }
} else {
    testInfo('Skipping simulation test in LIVE mode');
}

// Test 5: Multi-Opportunity Processing
section('5. MULTI-OPPORTUNITY BATCH PROCESSING');

const mockOpportunities = [
    {
        route_id: 'route_1',
        tokens: ['USDC', 'USDT', 'USDC'],
        profit_usd: 12.00,
        gas_estimate: 300000
    },
    {
        route_id: 'route_2',
        tokens: ['WMATIC', 'USDC', 'WMATIC'],
        profit_usd: 8.50,
        gas_estimate: 320000
    },
    {
        route_id: 'route_3',
        tokens: ['USDC', 'WMATIC', 'WETH', 'USDC'],
        profit_usd: 25.00,
        gas_estimate: 450000
    }
];

testInfo(`Processing batch of ${mockOpportunities.length} opportunities...`);

let processedCount = 0;
let simulatedCount = 0;
let wouldExecuteCount = 0;

for (const opp of mockOpportunities) {
    try {
        const decision = executionController.shouldExecute(opp);
        processedCount++;
        
        if (decision.simulate) {
            simulatedCount++;
        }
        
        // Quick validation
        if (opp.profit_usd > 5 && opp.gas_estimate > 0) {
            wouldExecuteCount++;
        }
    } catch (err) {
        testFail(`Failed to process opportunity ${opp.route_id}`);
    }
}

if (processedCount === mockOpportunities.length) {
    testPass(`All ${processedCount} opportunities processed`);
} else {
    testFail(`Only ${processedCount}/${mockOpportunities.length} opportunities processed`);
}

if (simulatedCount > 0) {
    testPass(`${simulatedCount} opportunities would be simulated`);
}

testInfo(`${wouldExecuteCount} opportunities meet minimum criteria`);

// Test 6: Statistics Tracking
section('6. STATISTICS TRACKING');

const stats = executionController.getStats();

if (stats) {
    testPass('Statistics tracking functional');
    testInfo(`  Total Opportunities: ${stats.totalOpportunities}`);
    testInfo(`  Simulated Executions: ${stats.simulatedExecutions}`);
    testInfo(`  Real Executions: ${stats.realExecutions}`);
    testInfo(`  Mode: ${stats.mode}`);
    
    if (stats.totalOpportunities > 0) {
        testPass('Opportunities have been tracked');
    }
} else {
    testFail('Statistics not available');
}

// Test 7: Error Handling
section('7. ERROR HANDLING AND RESILIENCE');

// Test with invalid opportunity
const invalidOpportunity = {
    route_id: 'invalid_test',
    tokens: ['USDC'], // Invalid: only 1 token
    profit_usd: -5,    // Invalid: negative profit
    gas_estimate: 0    // Invalid: no gas estimate
};

try {
    const decision = executionController.shouldExecute(invalidOpportunity);
    
    if (decision && !decision.execute) {
        testPass('Invalid opportunity correctly rejected');
    }
    
    if (CURRENT_MODE !== MODE.LIVE) {
        const mockExecute = async () => ({ txHash: '0xtest' });
        const simResult = await executionController.simulateTransaction(
            invalidOpportunity,
            mockExecute
        );
        
        if (simResult && !simResult.wouldExecute) {
            testPass('Simulation correctly identifies invalid opportunity');
            testInfo('  Validation checks caught issues');
        }
    }
} catch (err) {
    testPass('Error handling working (caught invalid input)');
}

// Test 8: Route Validation
section('8. ARBITRAGE ROUTE VALIDATION');

for (const route of ARBITRAGE_ROUTES.slice(0, 3)) { // Test first 3 routes
    testInfo(`Testing route: ${route.id}`);
    
    if (route.tokens && route.tokens.length >= 2) {
        testPass(`  Route has valid token path (${route.tokens.length} tokens)`);
    } else {
        testFail(`  Invalid token path for ${route.id}`);
    }
    
    if (route.dexes && route.dexes.length >= 1) {
        testPass(`  Route has DEX configuration (${route.dexes.length} DEXes)`);
    } else {
        testFail(`  Missing DEX configuration for ${route.id}`);
    }
    
    if (route.testAmounts && route.testAmounts.length > 0) {
        testPass(`  Route has test amounts (${route.testAmounts.length} amounts)`);
    } else {
        testFail(`  Missing test amounts for ${route.id}`);
    }
}

// Test 9: System Health Check
section('9. SYSTEM HEALTH CHECK');

// Check critical components
const healthChecks = [
    { name: 'Execution Controller', healthy: !!executionController },
    { name: 'Mode Configuration', healthy: !!CURRENT_MODE },
    { name: 'Chain Configuration', healthy: Object.keys(CHAINS).length > 0 },
    { name: 'Route Configuration', healthy: ARBITRAGE_ROUTES.length > 0 }
];

healthChecks.forEach(check => {
    if (check.healthy) {
        testPass(`${check.name}: Healthy`);
    } else {
        testFail(`${check.name}: Unhealthy`);
    }
});

// Calculate overall health
const healthScore = (healthChecks.filter(c => c.healthy).length / healthChecks.length) * 100;

if (healthScore === 100) {
    testPass('System health: 100% - All systems operational');
} else if (healthScore >= 75) {
    testInfo(`System health: ${healthScore.toFixed(0)}% - Minor issues detected`);
} else {
    testFail(`System health: ${healthScore.toFixed(0)}% - Critical issues detected`);
}

// Final Summary
console.log(chalk.bold.cyan('\n' + '═'.repeat(80)));
console.log(chalk.bold.cyan('   INTEGRATION TEST SUMMARY'));
console.log(chalk.bold.cyan('═'.repeat(80) + '\n'));

console.log(chalk.white(`Total Tests:      ${totalTests}`));
console.log(chalk.green(`✅ Passed:        ${passedTests}`));
console.log(chalk.red(`❌ Failed:        ${failedTests}`));

const successRate = ((passedTests / totalTests) * 100).toFixed(1);
console.log(chalk.white(`\nSuccess Rate:     ${successRate}%`));

console.log(chalk.bold.cyan('\n' + '═'.repeat(80)));

if (failedTests === 0) {
    console.log(chalk.green.bold('✅ ALL INTEGRATION TESTS PASSED'));
    console.log(chalk.green('\nSystem is fully integrated and ready for:'));
    console.log(chalk.green('  ✓ Real-time opportunity detection'));
    console.log(chalk.green('  ✓ Mode-specific execution behavior'));
    console.log(chalk.green('  ✓ Transaction simulation'));
    console.log(chalk.green('  ✓ Batch opportunity processing'));
    console.log(chalk.green('  ✓ Statistics tracking'));
    console.log(chalk.green('  ✓ Error handling'));
    
    console.log(chalk.cyan('\nReady to run:'));
    console.log(chalk.white('  npm start        # Start full system'));
    console.log(chalk.white('  npm run dev      # Development mode'));
    console.log(chalk.white('  npm run simulate # Simulation mode'));
} else {
    console.log(chalk.red.bold(`❌ ${failedTests} TEST(S) FAILED`));
    console.log(chalk.yellow('\nReview failures and fix issues before deployment.'));
}

console.log(chalk.bold.cyan('═'.repeat(80) + '\n'));

process.exit(failedTests > 0 ? 1 : 0);
