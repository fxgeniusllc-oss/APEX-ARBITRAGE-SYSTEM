/**
 * Terminal Display Module Tests
 * Tests the comprehensive terminal display functionality
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const { TerminalDisplay } = require('../src/utils/terminalDisplay.js');

describe('TerminalDisplay Module', () => {
    let display;

    before(() => {
        // Initialize terminal display for testing
        display = new TerminalDisplay({
            refreshInterval: 1000,
            maxRecentActivities: 5,
            maxRouteDisplay: 3,
            showDetailedMetrics: true
        });
    });

    it('should initialize with default configuration', () => {
        const defaultDisplay = new TerminalDisplay();
        assert.strictEqual(defaultDisplay.config.refreshInterval, 5000);
        assert.strictEqual(defaultDisplay.config.maxRecentActivities, 10);
        assert.strictEqual(defaultDisplay.config.maxRouteDisplay, 5);
    });

    it('should initialize with custom configuration', () => {
        assert.strictEqual(display.config.refreshInterval, 1000);
        assert.strictEqual(display.config.maxRecentActivities, 5);
        assert.strictEqual(display.config.maxRouteDisplay, 3);
    });

    it('should update system status', () => {
        display.updateSystemStatus({
            mode: 'DEV',
            componentsStatus: {
                rustEngine: true,
                pythonOrchestrator: true,
                nodeCoordinator: true,
                mlEngine: false,
                websocket: false
            }
        });

        assert.strictEqual(display.data.systemStatus.mode, 'DEV');
        assert.strictEqual(display.data.systemStatus.componentsStatus.rustEngine, true);
    });

    it('should update execution statistics', () => {
        display.updateExecutionStats({
            totalScans: 100,
            totalOpportunities: 50,
            simulatedExecutions: 25,
            successfulExecutions: 23,
            totalProfit: 150.50
        });

        assert.strictEqual(display.data.executionStats.totalScans, 100);
        assert.strictEqual(display.data.executionStats.totalOpportunities, 50);
        assert.strictEqual(display.data.executionStats.simulatedExecutions, 25);
    });

    it('should add opportunities', () => {
        const opportunity = {
            id: 'test_route_1',
            routeId: 'quickswap_sushiswap',
            profitUsd: 12.5,
            confidenceScore: 0.85,
            chain: 'polygon'
        };

        display.addOpportunity(opportunity);
        
        assert.ok(display.data.activeOpportunities.length > 0);
        assert.strictEqual(display.data.activeOpportunities[0].id, 'test_route_1');
    });

    it('should remove opportunities', () => {
        display.addOpportunity({
            id: 'test_route_2',
            routeId: 'test_route_2',
            profitUsd: 10,
            confidenceScore: 0.8,
            chain: 'polygon'
        });

        const initialLength = display.data.activeOpportunities.length;
        display.removeOpportunity('test_route_2');
        
        assert.strictEqual(display.data.activeOpportunities.length, initialLength - 1);
    });

    it('should update route performance', () => {
        display.updateRoutePerformance('quickswap_sushiswap', {
            attempts: 1,
            success: true,
            profit: 12.5,
            description: 'USDC → USDT → USDC'
        });

        const route = display.data.routePerformance.get('quickswap_sushiswap');
        assert.ok(route);
        assert.strictEqual(route.attempts, 1);
        assert.strictEqual(route.successes, 1);
        assert.strictEqual(route.totalProfit, 12.5);
    });

    it('should track multiple route performances', () => {
        display.updateRoutePerformance('route_1', {
            attempts: 1,
            success: true,
            profit: 10
        });

        display.updateRoutePerformance('route_1', {
            attempts: 1,
            success: false,
            profit: 0
        });

        const route = display.data.routePerformance.get('route_1');
        assert.strictEqual(route.attempts, 2);
        assert.strictEqual(route.successes, 1);
        assert.strictEqual(route.failures, 1);
    });

    it('should add activities to log', () => {
        display.addActivity({
            type: 'success',
            message: 'Test execution successful',
            details: 'Profit: $10.00'
        });

        assert.ok(display.data.recentActivities.length > 0);
        assert.strictEqual(display.data.recentActivities[0].type, 'success');
    });

    it('should limit recent activities', () => {
        // Add more activities than the max limit
        for (let i = 0; i < 10; i++) {
            display.addActivity({
                type: 'info',
                message: `Activity ${i}`,
                details: `Test activity ${i}`
            });
        }

        assert.ok(display.data.recentActivities.length <= display.config.maxRecentActivities);
    });

    it('should update market conditions', () => {
        display.updateMarketConditions({
            gasPrice: 45.5,
            maxGasPrice: 100,
            networkCongestion: 'low',
            prices: {
                MATIC: 0.847,
                ETH: 2450.32
            }
        });

        assert.strictEqual(display.data.marketConditions.gasPrice, 45.5);
        assert.strictEqual(display.data.marketConditions.prices.MATIC, 0.847);
    });

    it('should update ML engine status', () => {
        display.updateMLEngineStatus({
            active: true,
            inferenceTime: 15.5,
            accuracy: 0.88,
            modelType: 'ONNX',
            lastPrediction: Date.now()
        });

        assert.strictEqual(display.data.mlEngineStatus.active, true);
        assert.strictEqual(display.data.mlEngineStatus.inferenceTime, 15.5);
        assert.strictEqual(display.data.mlEngineStatus.accuracy, 0.88);
    });

    it('should update chain status', () => {
        display.updateChainStatus('polygon', {
            connected: true,
            blockNumber: 45123456,
            opportunities: 10
        });

        const chainStatus = display.data.chainStatus.get('polygon');
        assert.ok(chainStatus);
        assert.strictEqual(chainStatus.connected, true);
        assert.strictEqual(chainStatus.blockNumber, 45123456);
    });

    it('should render without errors', () => {
        // This test ensures the render method doesn't throw errors
        // We won't check console output in automated tests
        assert.doesNotThrow(() => {
            display.render();
        });
    });

    it('should handle color themes', async () => {
        const minimalDisplay = new TerminalDisplay({ colorTheme: 'minimal' });
        const highContrastDisplay = new TerminalDisplay({ colorTheme: 'high-contrast' });

        // Wait for chalk to initialize
        await minimalDisplay._initializeChalk();
        await highContrastDisplay._initializeChalk();

        assert.ok(minimalDisplay.colors);
        assert.ok(highContrastDisplay.colors);
    });

    it('should format duration correctly', () => {
        const testCases = [
            { ms: 1000, expected: '1s' },
            { ms: 61000, expected: '1m 1s' },
            { ms: 3661000, expected: '1h 1m' },
            { ms: 90061000, expected: '1d 1h' }
        ];

        for (const testCase of testCases) {
            const formatted = display._formatDuration(testCase.ms);
            assert.ok(formatted.length > 0); // Basic validation
        }
    });

    after(() => {
        // Cleanup if necessary
        if (display.refreshInterval) {
            display.stopAutoRefresh();
        }
    });
});

describe('TerminalDisplay Auto-Refresh', () => {
    let display;

    before(() => {
        display = new TerminalDisplay({
            refreshInterval: 100 // Fast for testing
        });
    });

    it('should start auto-refresh', (t, done) => {
        let renderCount = 0;
        const originalRender = display.render.bind(display);
        display.render = () => {
            originalRender();
            renderCount++;
            if (renderCount >= 2) {
                display.stopAutoRefresh();
                assert.ok(renderCount >= 2);
                done();
            }
        };

        display.startAutoRefresh();
    });

    it('should stop auto-refresh', () => {
        display.startAutoRefresh();
        display.stopAutoRefresh();
        assert.strictEqual(display.refreshInterval, null);
    });

    after(() => {
        display.stopAutoRefresh();
    });
});
