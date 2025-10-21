/**
 * Execution Controller
 * Manages execution based on MODE configuration (LIVE/DEV/SIM)
 * All modes use real live DEX data, but only LIVE mode executes transactions
 */

import { CURRENT_MODE, MODE, EXECUTION_CONFIG, getModeDisplay } from './config.js';
import chalk from 'chalk';

export class ExecutionController {
    constructor() {
        this.mode = CURRENT_MODE;
        this.executionStats = {
            totalOpportunities: 0,
            simulatedExecutions: 0,
            realExecutions: 0,
            simulatedProfit: 0,
            realProfit: 0,
            skippedDueToMode: 0
        };
        
        console.log(chalk.bold.cyan('\n' + '='.repeat(80)));
        console.log(chalk.bold.cyan(getModeDisplay()));
        console.log(chalk.bold.cyan('='.repeat(80) + '\n'));
        
        if (this.mode !== MODE.LIVE) {
            console.log(chalk.yellow.bold('⚠️  WARNING: Not in LIVE mode - Transactions will be simulated only'));
            console.log(chalk.yellow('   Real DEX data will be collected and analyzed'));
            console.log(chalk.yellow('   No actual on-chain transactions will be executed\n'));
        } else {
            console.log(chalk.red.bold('🔴 LIVE MODE ACTIVE - Real transactions will be executed'));
            console.log(chalk.red.bold('   Please ensure you have sufficient funds and have tested in DEV mode first\n'));
        }
    }

    /**
     * Determine if a transaction should be executed based on mode
     * @param {Object} opportunity - Arbitrage opportunity details
     * @returns {Object} Decision object with execute flag and reason
     */
    shouldExecute(opportunity) {
        this.executionStats.totalOpportunities++;

        if (this.mode === MODE.LIVE) {
            // LIVE mode: Execute real transactions
            return {
                execute: true,
                simulate: false,
                reason: 'LIVE mode - executing real transaction',
                logLevel: 'info'
            };
        } else if (this.mode === MODE.DEV) {
            // DEV mode: Simulate transaction with full validation
            this.executionStats.skippedDueToMode++;
            return {
                execute: false,
                simulate: true,
                reason: 'DEV mode - simulating transaction (dry-run)',
                logLevel: 'warn'
            };
        } else if (this.mode === MODE.SIM) {
            // SIM mode: Simulation for backtesting
            this.executionStats.skippedDueToMode++;
            return {
                execute: false,
                simulate: true,
                reason: 'SIM mode - simulation/backtesting mode',
                logLevel: 'info'
            };
        }

        // Fallback: Don't execute if mode is unknown
        return {
            execute: false,
            simulate: false,
            reason: `Unknown mode: ${this.mode}`,
            logLevel: 'error'
        };
    }

    /**
     * Execute or simulate an arbitrage transaction based on mode
     * @param {Object} opportunity - Arbitrage opportunity
     * @param {Function} executeFunction - Function to execute real transaction
     * @returns {Promise<Object>} Result of execution or simulation
     */
    async processOpportunity(opportunity, executeFunction) {
        const decision = this.shouldExecute(opportunity);
        
        console.log(chalk.cyan(`\n📊 Opportunity Found: ${opportunity.route_id || opportunity.id}`));
        console.log(chalk.cyan(`   Expected Profit: $${opportunity.profit_usd?.toFixed(2) || 'N/A'}`));
        console.log(chalk.cyan(`   Mode Decision: ${decision.reason}`));

        if (decision.execute) {
            // LIVE MODE: Execute real transaction
            try {
                console.log(chalk.green.bold('🚀 Executing REAL transaction...'));
                const result = await executeFunction(opportunity);
                
                this.executionStats.realExecutions++;
                this.executionStats.realProfit += opportunity.profit_usd || 0;
                
                console.log(chalk.green.bold('✅ Transaction executed successfully'));
                console.log(chalk.green(`   TX Hash: ${result.txHash}`));
                console.log(chalk.green(`   Profit: $${opportunity.profit_usd?.toFixed(2)}`));
                
                return {
                    success: true,
                    mode: MODE.LIVE,
                    simulated: false,
                    txHash: result.txHash,
                    profit: opportunity.profit_usd,
                    ...result
                };
            } catch (error) {
                console.error(chalk.red.bold('❌ Transaction execution failed'));
                console.error(chalk.red(`   Error: ${error.message}`));
                
                return {
                    success: false,
                    mode: MODE.LIVE,
                    simulated: false,
                    error: error.message
                };
            }
        } else if (decision.simulate) {
            // DEV/SIM MODE: Simulate transaction
            console.log(chalk.yellow.bold('🔄 Simulating transaction (DRY-RUN)...'));
            
            try {
                // Simulate the transaction without executing
                const simulationResult = await this.simulateTransaction(opportunity, executeFunction);
                
                this.executionStats.simulatedExecutions++;
                this.executionStats.simulatedProfit += opportunity.profit_usd || 0;
                
                console.log(chalk.yellow.bold('✅ Simulation completed successfully'));
                console.log(chalk.yellow(`   Simulated Profit: $${opportunity.profit_usd?.toFixed(2)}`));
                console.log(chalk.yellow(`   Would execute: ${simulationResult.wouldExecute ? 'YES' : 'NO'}`));
                
                if (!simulationResult.wouldExecute) {
                    console.log(chalk.yellow(`   Reason: ${simulationResult.reason}`));
                }
                
                return {
                    success: true,
                    mode: this.mode,
                    simulated: true,
                    wouldExecute: simulationResult.wouldExecute,
                    simulatedProfit: opportunity.profit_usd,
                    simulationDetails: simulationResult,
                    message: `Transaction simulated in ${this.mode} mode - no on-chain execution`
                };
            } catch (error) {
                console.error(chalk.yellow('⚠️  Simulation failed'));
                console.error(chalk.yellow(`   Error: ${error.message}`));
                
                return {
                    success: false,
                    mode: this.mode,
                    simulated: true,
                    error: error.message,
                    message: 'Simulation encountered an error'
                };
            }
        }

        // Should not reach here, but handle gracefully
        console.error(chalk.red('❌ No valid execution path'));
        return {
            success: false,
            mode: this.mode,
            simulated: false,
            error: 'Invalid execution configuration'
        };
    }

    /**
     * Simulate a transaction without executing on-chain
     * @param {Object} opportunity - Arbitrage opportunity
     * @param {Function} executeFunction - Function that would execute the transaction
     * @returns {Promise<Object>} Simulation result
     */
    async simulateTransaction(opportunity, executeFunction) {
        // In simulation mode, we validate all parameters and check if transaction would succeed
        // but don't actually send it to the blockchain
        
        const validations = {
            hasSufficientProfit: opportunity.profit_usd > 0,
            hasValidRoute: opportunity.tokens && opportunity.tokens.length >= 2,
            hasGasEstimate: opportunity.gas_estimate > 0,
            wouldExecute: true,
            checks: []
        };

        // Perform validation checks
        if (!validations.hasSufficientProfit) {
            validations.checks.push('❌ Insufficient profit');
            validations.wouldExecute = false;
        } else {
            validations.checks.push('✅ Sufficient profit');
        }

        if (!validations.hasValidRoute) {
            validations.checks.push('❌ Invalid route');
            validations.wouldExecute = false;
        } else {
            validations.checks.push('✅ Valid route');
        }

        if (!validations.hasGasEstimate) {
            validations.checks.push('❌ No gas estimate');
            validations.wouldExecute = false;
        } else {
            validations.checks.push('✅ Gas estimate available');
        }

        // Log validation results
        console.log(chalk.cyan('   Validation Checks:'));
        validations.checks.forEach(check => console.log(chalk.cyan(`   ${check}`)));

        return {
            ...validations,
            reason: validations.wouldExecute 
                ? 'All validations passed - would execute in LIVE mode' 
                : 'Validations failed - would not execute',
            simulatedAt: Date.now(),
            opportunity
        };
    }

    /**
     * Get execution statistics
     * @returns {Object} Statistics object
     */
    getStats() {
        return {
            ...this.executionStats,
            mode: this.mode,
            modeDescription: getModeDisplay()
        };
    }

    /**
     * Print execution summary
     */
    printSummary() {
        console.log(chalk.cyan('\n' + '='.repeat(80)));
        console.log(chalk.cyan.bold('EXECUTION SUMMARY'));
        console.log(chalk.cyan('='.repeat(80)));
        console.log(chalk.white(`Mode: ${getModeDisplay()}`));
        console.log(chalk.white(`Total Opportunities: ${this.executionStats.totalOpportunities}`));
        
        if (this.mode === MODE.LIVE) {
            console.log(chalk.green(`Real Executions: ${this.executionStats.realExecutions}`));
            console.log(chalk.green(`Real Profit: $${this.executionStats.realProfit.toFixed(2)}`));
        } else {
            console.log(chalk.yellow(`Simulated Executions: ${this.executionStats.simulatedExecutions}`));
            console.log(chalk.yellow(`Simulated Profit: $${this.executionStats.simulatedProfit.toFixed(2)}`));
            console.log(chalk.yellow(`Skipped (Mode): ${this.executionStats.skippedDueToMode}`));
        }
        
        console.log(chalk.cyan('='.repeat(80) + '\n'));
    }

    /**
     * Check if system is in a mode that allows real execution
     * @returns {boolean}
     */
    isLiveMode() {
        return this.mode === MODE.LIVE;
    }

    /**
     * Check if system is in development mode
     * @returns {boolean}
     */
    isDevMode() {
        return this.mode === MODE.DEV;
    }

    /**
     * Check if system is in simulation mode
     * @returns {boolean}
     */
    isSimMode() {
        return this.mode === MODE.SIM;
    }
}

// Export singleton instance
export const executionController = new ExecutionController();
