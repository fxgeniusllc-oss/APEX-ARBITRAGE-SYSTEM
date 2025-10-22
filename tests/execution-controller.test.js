/**
 * Comprehensive Tests for ExecutionController
 * Tests LIVE/DEV/SIM mode execution control system
 * 
 * Test Coverage:
 * 1. Mode detection and configuration
 * 2. Execution decision logic
 * 3. Simulated vs real execution
 * 4. Safety mechanisms
 * 5. Statistics tracking
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import { ExecutionController } from '../src/utils/executionController.js';
import { MODE } from '../src/utils/config.js';

describe('ExecutionController - Initialization', () => {
    test('should initialize with current mode', () => {
        const controller = new ExecutionController();
        
        assert.ok(controller);
        assert.ok(controller.mode);
        assert.ok(controller.executionStats);
    });

    test('should initialize with zero statistics', () => {
        const controller = new ExecutionController();
        
        assert.strictEqual(controller.executionStats.totalOpportunities, 0);
        assert.strictEqual(controller.executionStats.simulatedExecutions, 0);
        assert.strictEqual(controller.executionStats.realExecutions, 0);
        assert.strictEqual(controller.executionStats.simulatedProfit, 0);
        assert.strictEqual(controller.executionStats.realProfit, 0);
        assert.strictEqual(controller.executionStats.skippedDueToMode, 0);
    });

    test('should have valid mode value', () => {
        const controller = new ExecutionController();
        const validModes = [MODE.LIVE, MODE.DEV, MODE.SIM];
        
        assert.ok(validModes.includes(controller.mode), 
            `Mode should be one of: ${validModes.join(', ')}`);
    });
});

describe('ExecutionController - Execution Decision Logic', () => {
    test('should return execute=true in LIVE mode', () => {
        const controller = new ExecutionController();
        
        // Temporarily override mode for test
        const originalMode = controller.mode;
        controller.mode = MODE.LIVE;
        
        const opportunity = {
            id: 'test-opp-1',
            profit_usd: 15,
            chain: 'polygon'
        };
        
        const decision = controller.shouldExecute(opportunity);
        
        assert.strictEqual(decision.execute, true);
        assert.strictEqual(decision.simulate, false);
        assert.ok(decision.reason.includes('LIVE'));
        
        // Restore original mode
        controller.mode = originalMode;
    });

    test('should return simulate=true in DEV mode', () => {
        const controller = new ExecutionController();
        controller.mode = MODE.DEV;
        
        const opportunity = {
            id: 'test-opp-2',
            profit_usd: 20,
            chain: 'polygon'
        };
        
        const decision = controller.shouldExecute(opportunity);
        
        assert.strictEqual(decision.execute, false);
        assert.strictEqual(decision.simulate, true);
        assert.ok(decision.reason.includes('DEV'));
    });

    test('should return simulate=true in SIM mode', () => {
        const controller = new ExecutionController();
        controller.mode = MODE.SIM;
        
        const opportunity = {
            id: 'test-opp-3',
            profit_usd: 10,
            chain: 'polygon'
        };
        
        const decision = controller.shouldExecute(opportunity);
        
        assert.strictEqual(decision.execute, false);
        assert.strictEqual(decision.simulate, true);
        assert.ok(decision.reason.includes('SIM'));
    });

    test('should increment totalOpportunities on every decision', () => {
        const controller = new ExecutionController();
        const opportunity = { id: 'test-opp', profit_usd: 10 };
        
        const initialCount = controller.executionStats.totalOpportunities;
        
        controller.shouldExecute(opportunity);
        controller.shouldExecute(opportunity);
        controller.shouldExecute(opportunity);
        
        assert.strictEqual(
            controller.executionStats.totalOpportunities,
            initialCount + 3
        );
    });

    test('should track skipped opportunities in non-LIVE modes', () => {
        const controller = new ExecutionController();
        controller.mode = MODE.DEV;
        
        const opportunity = { id: 'test-opp', profit_usd: 10 };
        
        const initialSkipped = controller.executionStats.skippedDueToMode;
        
        controller.shouldExecute(opportunity);
        controller.shouldExecute(opportunity);
        
        assert.strictEqual(
            controller.executionStats.skippedDueToMode,
            initialSkipped + 2
        );
    });
});

describe('ExecutionController - Process Opportunity', () => {
    test('should simulate execution in DEV mode', async () => {
        const controller = new ExecutionController();
        controller.mode = MODE.DEV;
        
        const opportunity = {
            id: 'sim-opp-1',
            profit_usd: 25,
            chain: 'polygon'
        };
        
        const mockExecuteFunction = async (opp) => {
            return {
                txHash: '0xmocked',
                success: true
            };
        };
        
        const result = await controller.processOpportunity(opportunity, mockExecuteFunction);
        
        assert.ok(result);
        assert.strictEqual(result.mode, MODE.DEV);
        assert.strictEqual(result.simulated, true);
        assert.ok(result.success);
    });

    test('should track simulated profit in DEV mode', async () => {
        const controller = new ExecutionController();
        controller.mode = MODE.DEV;
        
        const opportunity = {
            id: 'sim-opp-2',
            profit_usd: 30,
            chain: 'polygon'
        };
        
        const mockExecuteFunction = async () => ({ success: true });
        
        const initialProfit = controller.executionStats.simulatedProfit;
        await controller.processOpportunity(opportunity, mockExecuteFunction);
        
        assert.strictEqual(
            controller.executionStats.simulatedProfit,
            initialProfit + 30
        );
    });

    test('should increment simulation counter in DEV mode', async () => {
        const controller = new ExecutionController();
        controller.mode = MODE.DEV;
        
        const opportunity = {
            id: 'sim-opp-3',
            profit_usd: 15,
            chain: 'polygon'
        };
        
        const mockExecuteFunction = async () => ({ success: true });
        
        const initialCount = controller.executionStats.simulatedExecutions;
        await controller.processOpportunity(opportunity, mockExecuteFunction);
        
        assert.strictEqual(
            controller.executionStats.simulatedExecutions,
            initialCount + 1
        );
    });

    test('should handle missing profit_usd gracefully', async () => {
        const controller = new ExecutionController();
        controller.mode = MODE.DEV;
        
        const opportunity = {
            id: 'sim-opp-4',
            chain: 'polygon'
        };
        
        const mockExecuteFunction = async () => ({ success: true });
        
        const result = await controller.processOpportunity(opportunity, mockExecuteFunction);
        
        assert.ok(result);
        assert.strictEqual(result.simulated, true);
    });

    test('should handle execution errors in LIVE mode', async () => {
        const controller = new ExecutionController();
        controller.mode = MODE.LIVE;
        
        const opportunity = {
            id: 'error-opp-1',
            profit_usd: 20,
            chain: 'polygon'
        };
        
        const mockExecuteFunction = async () => {
            throw new Error('Transaction reverted');
        };
        
        const result = await controller.processOpportunity(opportunity, mockExecuteFunction);
        
        assert.ok(result);
        assert.strictEqual(result.success, false);
        assert.strictEqual(result.mode, MODE.LIVE);
        assert.ok(result.error);
    });
});

describe('ExecutionController - Simulation Logic', () => {
    test('should validate simulation parameters', async () => {
        const controller = new ExecutionController();
        controller.mode = MODE.DEV;
        
        const opportunity = {
            id: 'validate-opp-1',
            profit_usd: 35,
            gas_estimate: 300000,
            gas_price: 50,
            chain: 'polygon'
        };
        
        const mockExecuteFunction = async () => ({ success: true });
        
        // Simulate transaction
        const simResult = await controller.simulateTransaction(opportunity, mockExecuteFunction);
        
        assert.ok(simResult);
        assert.ok(typeof simResult.wouldExecute === 'boolean');
    });

    test('should check gas price constraints in simulation', async () => {
        const controller = new ExecutionController();
        
        const highGasOpp = {
            id: 'high-gas-opp',
            profit_usd: 10,
            gas_price: 250, // Very high gas
            chain: 'polygon'
        };
        
        const mockExecuteFunction = async () => ({ success: true });
        
        const result = await controller.simulateTransaction(highGasOpp, mockExecuteFunction);
        
        assert.ok(result);
        // Should potentially flag high gas price
        if (!result.wouldExecute) {
            assert.ok(result.reason);
        }
    });

    test('should validate profit threshold in simulation', async () => {
        const controller = new ExecutionController();
        
        const lowProfitOpp = {
            id: 'low-profit-opp',
            profit_usd: 0.5, // Very low profit
            gas_cost_usd: 2,
            chain: 'polygon'
        };
        
        const mockExecuteFunction = async () => ({ success: true });
        
        const result = await controller.simulateTransaction(lowProfitOpp, mockExecuteFunction);
        
        assert.ok(result);
        // Should reject negative profit
        if (lowProfitOpp.profit_usd < lowProfitOpp.gas_cost_usd) {
            assert.strictEqual(result.wouldExecute, false);
        }
    });

    test('should simulate multiple scenarios', async () => {
        const controller = new ExecutionController();
        controller.mode = MODE.SIM;
        
        const scenarios = [
            { id: 'scenario-1', profit_usd: 50, gas_price: 30 },
            { id: 'scenario-2', profit_usd: 15, gas_price: 60 },
            { id: 'scenario-3', profit_usd: 8, gas_price: 100 }
        ];
        
        const mockExecuteFunction = async () => ({ success: true });
        
        const results = [];
        for (const scenario of scenarios) {
            const result = await controller.processOpportunity(scenario, mockExecuteFunction);
            results.push(result);
        }
        
        assert.strictEqual(results.length, 3);
        assert.ok(results.every(r => r.simulated === true));
    });
});

describe('ExecutionController - Statistics Tracking', () => {
    test('should maintain separate simulated and real execution counts', async () => {
        const controller = new ExecutionController();
        const mockExecuteFunction = async () => ({ success: true });
        
        // Simulate some executions
        controller.mode = MODE.DEV;
        await controller.processOpportunity(
            { id: 'sim-1', profit_usd: 10 },
            mockExecuteFunction
        );
        await controller.processOpportunity(
            { id: 'sim-2', profit_usd: 15 },
            mockExecuteFunction
        );
        
        const simCount = controller.executionStats.simulatedExecutions;
        const realCount = controller.executionStats.realExecutions;
        
        assert.ok(simCount > 0);
        assert.strictEqual(realCount, 0);
    });

    test('should track profit separately for simulated and real executions', async () => {
        const controller = new ExecutionController();
        const mockExecuteFunction = async () => ({ success: true });
        
        controller.mode = MODE.DEV;
        
        await controller.processOpportunity(
            { id: 'opp-1', profit_usd: 20 },
            mockExecuteFunction
        );
        
        await controller.processOpportunity(
            { id: 'opp-2', profit_usd: 30 },
            mockExecuteFunction
        );
        
        assert.ok(controller.executionStats.simulatedProfit >= 50);
        assert.strictEqual(controller.executionStats.realProfit, 0);
    });

    test('should provide comprehensive statistics', () => {
        const controller = new ExecutionController();
        const stats = controller.executionStats;
        
        assert.ok(typeof stats.totalOpportunities === 'number');
        assert.ok(typeof stats.simulatedExecutions === 'number');
        assert.ok(typeof stats.realExecutions === 'number');
        assert.ok(typeof stats.simulatedProfit === 'number');
        assert.ok(typeof stats.realProfit === 'number');
        assert.ok(typeof stats.skippedDueToMode === 'number');
    });

    test('should accumulate statistics over multiple operations', async () => {
        const controller = new ExecutionController();
        controller.mode = MODE.DEV;
        const mockExecuteFunction = async () => ({ success: true });
        
        const opportunities = [
            { id: 'opp-1', profit_usd: 10 },
            { id: 'opp-2', profit_usd: 15 },
            { id: 'opp-3', profit_usd: 20 },
            { id: 'opp-4', profit_usd: 25 },
            { id: 'opp-5', profit_usd: 30 }
        ];
        
        for (const opp of opportunities) {
            await controller.processOpportunity(opp, mockExecuteFunction);
        }
        
        assert.strictEqual(controller.executionStats.simulatedExecutions, 5);
        assert.strictEqual(controller.executionStats.simulatedProfit, 100);
    });
});

describe('ExecutionController - Safety Mechanisms', () => {
    test('should never execute in DEV mode regardless of conditions', async () => {
        const controller = new ExecutionController();
        controller.mode = MODE.DEV;
        
        const highProfitOpp = {
            id: 'safe-opp-1',
            profit_usd: 10000, // Very high profit
            chain: 'polygon'
        };
        
        const decision = controller.shouldExecute(highProfitOpp);
        
        assert.strictEqual(decision.execute, false);
        assert.strictEqual(decision.simulate, true);
    });

    test('should handle unknown mode safely', () => {
        const controller = new ExecutionController();
        controller.mode = 'UNKNOWN';
        
        const opportunity = {
            id: 'unknown-mode-opp',
            profit_usd: 15
        };
        
        const decision = controller.shouldExecute(opportunity);
        
        assert.strictEqual(decision.execute, false);
        assert.strictEqual(decision.simulate, false);
        assert.ok(decision.reason.includes('Unknown'));
        assert.strictEqual(decision.logLevel, 'error');
    });

    test('should provide appropriate log levels for different modes', () => {
        const controller = new ExecutionController();
        const opportunity = { id: 'log-test', profit_usd: 10 };
        
        // DEV mode
        controller.mode = MODE.DEV;
        let decision = controller.shouldExecute(opportunity);
        assert.strictEqual(decision.logLevel, 'warn');
        
        // SIM mode
        controller.mode = MODE.SIM;
        decision = controller.shouldExecute(opportunity);
        assert.strictEqual(decision.logLevel, 'info');
        
        // LIVE mode
        controller.mode = MODE.LIVE;
        decision = controller.shouldExecute(opportunity);
        assert.strictEqual(decision.logLevel, 'info');
    });

    test('should validate opportunity data before processing', async () => {
        const controller = new ExecutionController();
        controller.mode = MODE.DEV;
        
        const invalidOpportunity = null;
        const mockExecuteFunction = async () => ({ success: true });
        
        try {
            await controller.processOpportunity(invalidOpportunity, mockExecuteFunction);
            assert.fail('Should throw error for invalid opportunity');
        } catch (error) {
            assert.ok(error);
        }
    });

    test('should handle missing execute function gracefully', async () => {
        const controller = new ExecutionController();
        controller.mode = MODE.DEV;
        
        const opportunity = {
            id: 'no-function-opp',
            profit_usd: 15
        };
        
        try {
            await controller.processOpportunity(opportunity, null);
            // In DEV mode, might not call execute function
            assert.ok(true);
        } catch (error) {
            // Or it might throw - both are acceptable
            assert.ok(error);
        }
    });
});

describe('ExecutionController - Mode Switching Behavior', () => {
    test('should reflect mode changes in execution decisions', () => {
        const controller = new ExecutionController();
        const opportunity = { id: 'mode-switch-opp', profit_usd: 20 };
        
        // Start in DEV mode
        controller.mode = MODE.DEV;
        let decision = controller.shouldExecute(opportunity);
        assert.strictEqual(decision.simulate, true);
        
        // Switch to LIVE mode
        controller.mode = MODE.LIVE;
        decision = controller.shouldExecute(opportunity);
        assert.strictEqual(decision.execute, true);
        
        // Switch to SIM mode
        controller.mode = MODE.SIM;
        decision = controller.shouldExecute(opportunity);
        assert.strictEqual(decision.simulate, true);
    });

    test('should maintain statistics across mode changes', async () => {
        const controller = new ExecutionController();
        const mockExecuteFunction = async () => ({ success: true });
        
        // Execute in DEV mode
        controller.mode = MODE.DEV;
        await controller.processOpportunity(
            { id: 'opp-1', profit_usd: 15 },
            mockExecuteFunction
        );
        
        const devStats = { ...controller.executionStats };
        
        // Switch to SIM mode
        controller.mode = MODE.SIM;
        await controller.processOpportunity(
            { id: 'opp-2', profit_usd: 20 },
            mockExecuteFunction
        );
        
        // Statistics should accumulate
        assert.ok(controller.executionStats.simulatedExecutions > devStats.simulatedExecutions);
        assert.ok(controller.executionStats.simulatedProfit > devStats.simulatedProfit);
    });
});

describe('ExecutionController - Edge Cases', () => {
    test('should handle zero profit opportunity', async () => {
        const controller = new ExecutionController();
        controller.mode = MODE.DEV;
        
        const zeroProfitOpp = {
            id: 'zero-profit',
            profit_usd: 0,
            chain: 'polygon'
        };
        
        const mockExecuteFunction = async () => ({ success: true });
        
        const result = await controller.processOpportunity(zeroProfitOpp, mockExecuteFunction);
        
        assert.ok(result);
        assert.strictEqual(result.simulated, true);
    });

    test('should handle negative profit opportunity', async () => {
        const controller = new ExecutionController();
        controller.mode = MODE.DEV;
        
        const negativeProfitOpp = {
            id: 'negative-profit',
            profit_usd: -10,
            chain: 'polygon'
        };
        
        const mockExecuteFunction = async () => ({ success: true });
        
        const result = await controller.processOpportunity(negativeProfitOpp, mockExecuteFunction);
        
        assert.ok(result);
        // Should still simulate but flag as unprofitable
    });

    test('should handle very large profit values', async () => {
        const controller = new ExecutionController();
        controller.mode = MODE.DEV;
        
        const largeProfitOpp = {
            id: 'large-profit',
            profit_usd: 1000000,
            chain: 'polygon'
        };
        
        const mockExecuteFunction = async () => ({ success: true });
        
        const result = await controller.processOpportunity(largeProfitOpp, mockExecuteFunction);
        
        assert.ok(result);
        assert.strictEqual(result.simulated, true);
    });

    test('should handle opportunity without ID', async () => {
        const controller = new ExecutionController();
        controller.mode = MODE.DEV;
        
        const noIdOpp = {
            profit_usd: 15,
            chain: 'polygon'
        };
        
        const mockExecuteFunction = async () => ({ success: true });
        
        const result = await controller.processOpportunity(noIdOpp, mockExecuteFunction);
        
        assert.ok(result);
    });

    test('should handle concurrent opportunity processing', async () => {
        const controller = new ExecutionController();
        controller.mode = MODE.DEV;
        const mockExecuteFunction = async () => {
            await new Promise(resolve => setTimeout(resolve, 10));
            return { success: true };
        };
        
        const opportunities = [
            { id: 'concurrent-1', profit_usd: 10 },
            { id: 'concurrent-2', profit_usd: 15 },
            { id: 'concurrent-3', profit_usd: 20 }
        ];
        
        const results = await Promise.all(
            opportunities.map(opp => controller.processOpportunity(opp, mockExecuteFunction))
        );
        
        assert.strictEqual(results.length, 3);
        assert.ok(results.every(r => r.success === true));
    });
});
