/**
 * Tests for MODE configuration (LIVE/DEV/SIM)
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert';

describe('Mode Configuration Tests', () => {
    before(() => {
        // Set up test environment
        process.env.MODE = 'DEV';
    });

    it('should load config module successfully', async () => {
        const config = await import('../src/utils/config.js');
        assert.ok(config.MODE, 'MODE enum should be defined');
        assert.ok(config.CURRENT_MODE, 'CURRENT_MODE should be defined');
    });

    it('should validate mode values', async () => {
        const { MODE, CURRENT_MODE } = await import('../src/utils/config.js');
        
        assert.ok(Object.values(MODE).includes(CURRENT_MODE), 
            'CURRENT_MODE should be one of valid MODE values');
        
        assert.strictEqual(Object.keys(MODE).length, 3, 
            'Should have exactly 3 modes: LIVE, DEV, SIM');
    });

    it('should have correct mode descriptions', async () => {
        const { MODE_DESCRIPTIONS, MODE } = await import('../src/utils/config.js');
        
        assert.ok(MODE_DESCRIPTIONS[MODE.LIVE], 'Should have LIVE mode description');
        assert.ok(MODE_DESCRIPTIONS[MODE.DEV], 'Should have DEV mode description');
        assert.ok(MODE_DESCRIPTIONS[MODE.SIM], 'Should have SIM mode description');
    });

    it('should have execution configuration', async () => {
        const { EXECUTION_CONFIG } = await import('../src/utils/config.js');
        
        assert.ok(EXECUTION_CONFIG.mode, 'Should have mode in execution config');
        assert.strictEqual(typeof EXECUTION_CONFIG.collectRealData, 'boolean', 
            'collectRealData should be boolean');
        assert.strictEqual(typeof EXECUTION_CONFIG.executeTransactions, 'boolean', 
            'executeTransactions should be boolean');
        assert.strictEqual(typeof EXECUTION_CONFIG.simulateTransactions, 'boolean', 
            'simulateTransactions should be boolean');
    });

    it('should export helper functions', async () => {
        const config = await import('../src/utils/config.js');
        
        assert.strictEqual(typeof config.shouldExecuteRealTransactions, 'function', 
            'shouldExecuteRealTransactions should be a function');
        assert.strictEqual(typeof config.getModeDisplay, 'function', 
            'getModeDisplay should be a function');
    });

    it('should only execute real transactions in LIVE mode', async () => {
        // Test DEV mode
        process.env.MODE = 'DEV';
        delete require.cache[require.resolve('../src/utils/config.js')];
        const devConfig = await import('../src/utils/config.js?t=' + Date.now());
        assert.strictEqual(devConfig.EXECUTION_CONFIG.executeTransactions, false,
            'DEV mode should not execute real transactions');

        // Test SIM mode
        process.env.MODE = 'SIM';
        delete require.cache[require.resolve('../src/utils/config.js')];
        const simConfig = await import('../src/utils/config.js?t=' + Date.now() + 1);
        assert.strictEqual(simConfig.EXECUTION_CONFIG.executeTransactions, false,
            'SIM mode should not execute real transactions');
    });
});

describe('Execution Controller Tests', () => {
    it('should load execution controller', async () => {
        const { ExecutionController } = await import('../src/utils/executionController.js');
        assert.ok(ExecutionController, 'ExecutionController should be defined');
    });

    it('should create execution controller instance', async () => {
        const { ExecutionController } = await import('../src/utils/executionController.js');
        const controller = new ExecutionController();
        
        assert.ok(controller, 'Controller should be instantiated');
        assert.ok(controller.mode, 'Controller should have mode');
        assert.ok(controller.executionStats, 'Controller should have stats');
    });

    it('should have correct decision methods', async () => {
        const { ExecutionController } = await import('../src/utils/executionController.js');
        const controller = new ExecutionController();
        
        assert.strictEqual(typeof controller.shouldExecute, 'function');
        assert.strictEqual(typeof controller.processOpportunity, 'function');
        assert.strictEqual(typeof controller.simulateTransaction, 'function');
        assert.strictEqual(typeof controller.isLiveMode, 'function');
        assert.strictEqual(typeof controller.isDevMode, 'function');
        assert.strictEqual(typeof controller.isSimMode, 'function');
    });

    it('should return proper decision in DEV mode', async () => {
        process.env.MODE = 'DEV';
        const { ExecutionController } = await import('../src/utils/executionController.js?t=' + Date.now());
        const controller = new ExecutionController();
        
        const opportunity = {
            id: 'test_route',
            profit_usd: 10,
            tokens: ['USDC', 'USDT']
        };
        
        const decision = controller.shouldExecute(opportunity);
        
        assert.strictEqual(decision.execute, false, 'Should not execute in DEV mode');
        assert.strictEqual(decision.simulate, true, 'Should simulate in DEV mode');
    });

    it('should track statistics', async () => {
        const { ExecutionController } = await import('../src/utils/executionController.js?t=' + Date.now());
        const controller = new ExecutionController();
        
        const stats = controller.getStats();
        
        assert.ok(stats.mode, 'Stats should include mode');
        assert.strictEqual(typeof stats.totalOpportunities, 'number');
        assert.strictEqual(typeof stats.simulatedExecutions, 'number');
        assert.strictEqual(typeof stats.realExecutions, 'number');
    });
});

describe('Integration Tests', () => {
    it('should properly integrate mode config with execution controller', async () => {
        const config = await import('../src/utils/config.js');
        const { executionController } = await import('../src/utils/executionController.js');
        
        assert.strictEqual(executionController.mode, config.CURRENT_MODE,
            'Execution controller mode should match config');
    });

    it('should maintain consistency across modules', async () => {
        const config = await import('../src/utils/config.js');
        const { executionController } = await import('../src/utils/executionController.js');
        
        const configExecutes = config.EXECUTION_CONFIG.executeTransactions;
        const controllerExecutes = executionController.isLiveMode();
        
        assert.strictEqual(configExecutes, controllerExecutes,
            'Config and controller should agree on execution mode');
    });
});
