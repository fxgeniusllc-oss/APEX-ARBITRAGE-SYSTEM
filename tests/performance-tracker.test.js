/**
 * Comprehensive Tests for PerformanceTracker
 * Tests performance monitoring system for 95-99.9% success rate validation
 * 
 * Test Coverage:
 * 1. Initialization and configuration
 * 2. Opportunity tracking and recording
 * 3. Execution metrics and success rates
 * 4. Profit/Loss tracking
 * 5. Alert generation and performance monitoring
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import { PerformanceTracker } from '../src/utils/performanceTracker.js';

describe('PerformanceTracker - Initialization and Configuration', () => {
    test('should initialize with default configuration', () => {
        const tracker = new PerformanceTracker({ enablePersistence: false });
        
        assert.ok(tracker);
        assert.strictEqual(tracker.config.targetSuccessRate, 0.95);
        assert.strictEqual(tracker.config.excellentSuccessRate, 0.999);
        assert.strictEqual(tracker.config.windowSize, 100);
        assert.strictEqual(tracker.config.alertThreshold, 0.90);
    });

    test('should accept custom configuration', () => {
        const customConfig = {
            targetSuccessRate: 0.98,
            excellentSuccessRate: 0.995,
            windowSize: 50,
            alertThreshold: 0.95,
            enablePersistence: false
        };
        
        const tracker = new PerformanceTracker(customConfig);
        
        assert.strictEqual(tracker.config.targetSuccessRate, 0.98);
        assert.strictEqual(tracker.config.excellentSuccessRate, 0.995);
        assert.strictEqual(tracker.config.windowSize, 50);
        assert.strictEqual(tracker.config.alertThreshold, 0.95);
    });

    test('should initialize with zero metrics', () => {
        const tracker = new PerformanceTracker({ enablePersistence: false });
        
        assert.strictEqual(tracker.metrics.totalOpportunities, 0);
        assert.strictEqual(tracker.metrics.executedOpportunities, 0);
        assert.strictEqual(tracker.metrics.successfulExecutions, 0);
        assert.strictEqual(tracker.metrics.failedExecutions, 0);
        assert.strictEqual(tracker.metrics.totalProfit, 0);
        assert.strictEqual(tracker.metrics.totalLoss, 0);
    });

    test('should have correct performance targets', () => {
        const tracker = new PerformanceTracker({ enablePersistence: false });
        
        assert.ok(tracker.targets);
        assert.strictEqual(tracker.targets.minSuccessRate, 0.95);
        assert.strictEqual(tracker.targets.minProfitPerTrade, 5);
        assert.strictEqual(tracker.targets.maxExecutionTime, 5000);
    });

    test('should initialize with empty alerts array', () => {
        const tracker = new PerformanceTracker({ enablePersistence: false });
        
        assert.ok(Array.isArray(tracker.alerts));
        assert.strictEqual(tracker.alerts.length, 0);
    });
});

describe('PerformanceTracker - Opportunity Recording', () => {
    test('should record opportunity evaluation', () => {
        const tracker = new PerformanceTracker({ enablePersistence: false });
        const opportunity = { id: 'test-opp-1', chain: 'polygon' };
        const scoringResult = {
            overall_score: 85,
            confidence: 0.92,
            should_execute: true
        };
        
        tracker.recordOpportunity(opportunity, scoringResult);
        
        assert.strictEqual(tracker.metrics.totalOpportunities, 1);
        assert.strictEqual(tracker.metrics.avgOpportunityScore, 85);
        assert.strictEqual(tracker.metrics.avgConfidence, 0.92);
    });

    test('should track skipped opportunities', () => {
        const tracker = new PerformanceTracker({ enablePersistence: false });
        const opportunity = { id: 'test-opp-2', chain: 'polygon' };
        const scoringResult = {
            overall_score: 45,
            confidence: 0.50,
            should_execute: false
        };
        
        tracker.recordOpportunity(opportunity, scoringResult);
        
        assert.strictEqual(tracker.metrics.totalOpportunities, 1);
        assert.strictEqual(tracker.metrics.skippedOpportunities, 1);
    });

    test('should calculate running average of opportunity scores', () => {
        const tracker = new PerformanceTracker({ enablePersistence: false });
        
        tracker.recordOpportunity({ id: 'opp-1' }, { overall_score: 80, should_execute: true });
        tracker.recordOpportunity({ id: 'opp-2' }, { overall_score: 90, should_execute: true });
        tracker.recordOpportunity({ id: 'opp-3' }, { overall_score: 70, should_execute: false });
        
        assert.strictEqual(tracker.metrics.totalOpportunities, 3);
        assert.strictEqual(tracker.metrics.avgOpportunityScore, 80);
    });

    test('should handle opportunities without confidence score', () => {
        const tracker = new PerformanceTracker({ enablePersistence: false });
        const scoringResult = {
            overall_score: 85,
            should_execute: true
        };
        
        tracker.recordOpportunity({ id: 'opp-1' }, scoringResult);
        
        assert.strictEqual(tracker.metrics.totalOpportunities, 1);
        assert.strictEqual(tracker.metrics.avgConfidence, 0);
    });

    test('should track multiple opportunities correctly', () => {
        const tracker = new PerformanceTracker({ enablePersistence: false });
        
        for (let i = 0; i < 25; i++) {
            const scoringResult = {
                overall_score: 70 + i,
                confidence: 0.8 + (i * 0.001),
                should_execute: i % 2 === 0
            };
            tracker.recordOpportunity({ id: `opp-${i}` }, scoringResult);
        }
        
        assert.strictEqual(tracker.metrics.totalOpportunities, 25);
        assert.ok(tracker.metrics.avgOpportunityScore > 70);
        assert.ok(tracker.metrics.avgOpportunityScore < 95);
    });
});

describe('PerformanceTracker - Execution Recording', () => {
    test('should record successful execution', () => {
        const tracker = new PerformanceTracker({ enablePersistence: false });
        const opportunity = {
            id: 'exec-1',
            chain: 'polygon',
            profit_usd: 25.50
        };
        const result = {
            success: true,
            profit: 25.50
        };
        
        tracker.recordExecution(opportunity, result, 250);
        
        assert.strictEqual(tracker.metrics.executedOpportunities, 1);
        assert.strictEqual(tracker.metrics.successfulExecutions, 1);
        assert.strictEqual(tracker.metrics.failedExecutions, 0);
        assert.strictEqual(tracker.metrics.totalProfit, 25.50);
        assert.strictEqual(tracker.metrics.maxProfit, 25.50);
    });

    test('should record failed execution', () => {
        const tracker = new PerformanceTracker({ enablePersistence: false });
        const opportunity = {
            id: 'exec-2',
            chain: 'ethereum',
            profit_usd: -5
        };
        const result = {
            success: false,
            profit: -5
        };
        
        tracker.recordExecution(opportunity, result, 180);
        
        assert.strictEqual(tracker.metrics.executedOpportunities, 1);
        assert.strictEqual(tracker.metrics.successfulExecutions, 0);
        assert.strictEqual(tracker.metrics.failedExecutions, 1);
        assert.strictEqual(tracker.metrics.totalLoss, 5);
        assert.strictEqual(tracker.metrics.maxLoss, 5);
    });

    test('should track execution timing metrics', () => {
        const tracker = new PerformanceTracker({ enablePersistence: false });
        
        tracker.recordExecution(
            { id: 'exec-1', chain: 'polygon' },
            { success: true, profit: 10 },
            250
        );
        
        tracker.recordExecution(
            { id: 'exec-2', chain: 'polygon' },
            { success: true, profit: 15 },
            180
        );
        
        tracker.recordExecution(
            { id: 'exec-3', chain: 'polygon' },
            { success: true, profit: 12 },
            320
        );
        
        assert.strictEqual(tracker.metrics.minExecutionTime, 180);
        assert.strictEqual(tracker.metrics.maxExecutionTime, 320);
        assert.ok(tracker.metrics.avgExecutionTime > 180);
        assert.ok(tracker.metrics.avgExecutionTime < 320);
    });

    test('should maintain rolling window of correct size', () => {
        const tracker = new PerformanceTracker({
            windowSize: 10,
            enablePersistence: false
        });
        
        for (let i = 0; i < 15; i++) {
            tracker.recordExecution(
                { id: `exec-${i}`, chain: 'polygon' },
                { success: true, profit: 10 + i },
                200
            );
        }
        
        assert.strictEqual(tracker.metrics.executedOpportunities, 15);
        assert.strictEqual(tracker.metrics.rollingWindow.length, 10);
    });

    test('should calculate average profit per trade correctly', () => {
        const tracker = new PerformanceTracker({ enablePersistence: false });
        
        // Record some successful trades
        tracker.recordExecution({ id: 'exec-1' }, { success: true, profit: 20 }, 200);
        tracker.recordExecution({ id: 'exec-2' }, { success: true, profit: 30 }, 220);
        
        // Record a failed trade with loss
        tracker.recordExecution({ id: 'exec-3' }, { success: false, profit: -5 }, 180);
        
        // Avg = (20 + 30 - 5) / 3 = 15
        assert.strictEqual(tracker.metrics.avgProfitPerTrade, 15);
    });
});

describe('PerformanceTracker - Success Rate Calculations', () => {
    test('should calculate current success rate from rolling window', () => {
        const tracker = new PerformanceTracker({
            windowSize: 10,
            enablePersistence: false
        });
        
        // 8 successes, 2 failures = 80%
        for (let i = 0; i < 8; i++) {
            tracker.recordExecution(
                { id: `exec-${i}` },
                { success: true, profit: 10 },
                200
            );
        }
        
        for (let i = 8; i < 10; i++) {
            tracker.recordExecution(
                { id: `exec-${i}` },
                { success: false, profit: -2 },
                180
            );
        }
        
        const currentRate = tracker.getCurrentSuccessRate();
        assert.strictEqual(currentRate, 0.8);
    });

    test('should calculate overall success rate correctly', () => {
        const tracker = new PerformanceTracker({ enablePersistence: false });
        
        // 95 successes, 5 failures = 95%
        for (let i = 0; i < 95; i++) {
            tracker.recordExecution(
                { id: `success-${i}` },
                { success: true, profit: 10 },
                200
            );
        }
        
        for (let i = 0; i < 5; i++) {
            tracker.recordExecution(
                { id: `fail-${i}` },
                { success: false, profit: -2 },
                180
            );
        }
        
        const overallRate = tracker.getOverallSuccessRate();
        assert.strictEqual(overallRate, 0.95);
    });

    test('should return 1.0 success rate for no executions', () => {
        const tracker = new PerformanceTracker({ enablePersistence: false });
        
        assert.strictEqual(tracker.getCurrentSuccessRate(), 1.0);
        assert.strictEqual(tracker.getOverallSuccessRate(), 1.0);
    });

    test('should handle 100% success rate', () => {
        const tracker = new PerformanceTracker({ enablePersistence: false });
        
        for (let i = 0; i < 50; i++) {
            tracker.recordExecution(
                { id: `exec-${i}` },
                { success: true, profit: 10 + i },
                200
            );
        }
        
        assert.strictEqual(tracker.getCurrentSuccessRate(), 1.0);
        assert.strictEqual(tracker.getOverallSuccessRate(), 1.0);
    });

    test('should differentiate between current and overall success rate', () => {
        const tracker = new PerformanceTracker({
            windowSize: 10,
            enablePersistence: false
        });
        
        // First 90 trades: 100% success
        for (let i = 0; i < 90; i++) {
            tracker.recordExecution(
                { id: `early-${i}` },
                { success: true, profit: 10 },
                200
            );
        }
        
        // Last 10 trades (rolling window): 50% success
        for (let i = 0; i < 5; i++) {
            tracker.recordExecution(
                { id: `recent-success-${i}` },
                { success: true, profit: 10 },
                200
            );
        }
        
        for (let i = 0; i < 5; i++) {
            tracker.recordExecution(
                { id: `recent-fail-${i}` },
                { success: false, profit: -2 },
                180
            );
        }
        
        const currentRate = tracker.getCurrentSuccessRate();
        const overallRate = tracker.getOverallSuccessRate();
        
        assert.strictEqual(currentRate, 0.5); // Last 10 trades
        assert.ok(overallRate > 0.9); // Overall still high
    });
});

describe('PerformanceTracker - Alert Generation', () => {
    test('should generate alert when success rate drops below threshold', () => {
        const tracker = new PerformanceTracker({
            alertThreshold: 0.90,
            enablePersistence: false
        });
        
        // 85% success rate (below 90% threshold)
        for (let i = 0; i < 85; i++) {
            tracker.recordExecution({ id: `s-${i}` }, { success: true, profit: 10 }, 200);
        }
        
        for (let i = 0; i < 15; i++) {
            tracker.recordExecution({ id: `f-${i}` }, { success: false, profit: -2 }, 180);
        }
        
        const alerts = tracker.getRecentAlerts(10);
        const warningAlerts = alerts.filter(a => a.level === 'WARNING');
        
        assert.ok(warningAlerts.length > 0, 'Should generate WARNING alert');
    });

    test('should generate success alert for excellent performance', () => {
        const tracker = new PerformanceTracker({
            excellentSuccessRate: 0.999,
            enablePersistence: false
        });
        
        // 100% success rate with 100+ executions
        for (let i = 0; i < 100; i++) {
            tracker.recordExecution(
                { id: `exec-${i}` },
                { success: true, profit: 10 + i },
                200
            );
        }
        
        const alerts = tracker.getRecentAlerts(10);
        const successAlerts = alerts.filter(a => a.level === 'SUCCESS');
        
        assert.ok(successAlerts.length > 0, 'Should generate SUCCESS alert');
    });

    test('should limit alerts to maximum size', () => {
        const tracker = new PerformanceTracker({ enablePersistence: false });
        
        // Generate many alerts by alternating between success and failure
        for (let i = 0; i < 100; i++) {
            tracker.recordExecution(
                { id: `exec-${i}` },
                { success: i % 2 === 0, profit: 10 },
                200
            );
        }
        
        assert.ok(tracker.alerts.length <= 50, 'Should limit alerts to 50');
    });

    test('should retrieve recent alerts in reverse order', () => {
        const tracker = new PerformanceTracker({ enablePersistence: false });
        
        // Generate some executions to trigger alerts
        for (let i = 0; i < 20; i++) {
            tracker.recordExecution(
                { id: `exec-${i}` },
                { success: i % 3 !== 0, profit: 10 },
                200
            );
        }
        
        const recentAlerts = tracker.getRecentAlerts(5);
        
        assert.ok(Array.isArray(recentAlerts));
        assert.ok(recentAlerts.length <= 5);
        
        // Check that they're in reverse chronological order
        if (recentAlerts.length > 1) {
            assert.ok(recentAlerts[0].timestamp >= recentAlerts[1].timestamp);
        }
    });

    test('should include relevant data in alerts', () => {
        const tracker = new PerformanceTracker({
            alertThreshold: 0.95,
            enablePersistence: false
        });
        
        // Create scenario that triggers alert
        for (let i = 0; i < 90; i++) {
            tracker.recordExecution({ id: `s-${i}` }, { success: true, profit: 10 }, 200);
        }
        
        for (let i = 0; i < 10; i++) {
            tracker.recordExecution({ id: `f-${i}` }, { success: false, profit: -2 }, 180);
        }
        
        const alerts = tracker.alerts.filter(a => a.level === 'WARNING' || a.level === 'ERROR');
        
        if (alerts.length > 0) {
            const alert = alerts[0];
            assert.ok(alert.timestamp);
            assert.ok(alert.message);
            assert.ok(alert.data);
        }
    });
});

describe('PerformanceTracker - Statistics and Reporting', () => {
    test('should return comprehensive statistics', () => {
        const tracker = new PerformanceTracker({ enablePersistence: false });
        
        // Add some data
        tracker.recordOpportunity({ id: 'opp-1' }, { overall_score: 80, should_execute: true });
        tracker.recordExecution({ id: 'exec-1' }, { success: true, profit: 15 }, 250);
        
        const stats = tracker.getStats();
        
        assert.ok(stats.totalOpportunities);
        assert.ok(stats.executedOpportunities);
        assert.ok(stats.currentSuccessRate);
        assert.ok(stats.overallSuccessRate);
        assert.ok(stats.totalProfit);
        assert.ok(stats.netProfit);
        assert.ok(stats.avgExecutionTime);
        assert.ok(stats.uptime);
    });

    test('should format success rates as percentages', () => {
        const tracker = new PerformanceTracker({ enablePersistence: false });
        
        for (let i = 0; i < 95; i++) {
            tracker.recordExecution({ id: `s-${i}` }, { success: true, profit: 10 }, 200);
        }
        
        for (let i = 0; i < 5; i++) {
            tracker.recordExecution({ id: `f-${i}` }, { success: false, profit: -2 }, 180);
        }
        
        const stats = tracker.getStats();
        
        assert.ok(stats.currentSuccessRate.includes('%'));
        assert.ok(stats.overallSuccessRate.includes('%'));
        assert.strictEqual(stats.overallSuccessRate, '95.00%');
    });

    test('should calculate net profit correctly', () => {
        const tracker = new PerformanceTracker({ enablePersistence: false });
        
        tracker.recordExecution({ id: 'exec-1' }, { success: true, profit: 100 }, 200);
        tracker.recordExecution({ id: 'exec-2' }, { success: true, profit: 50 }, 220);
        tracker.recordExecution({ id: 'exec-3' }, { success: false, profit: -20 }, 180);
        
        const stats = tracker.getStats();
        
        assert.strictEqual(parseFloat(stats.netProfit), 130); // 100 + 50 - 20
    });

    test('should indicate if targets are met', () => {
        const tracker = new PerformanceTracker({ enablePersistence: false });
        
        // 96% success rate - meets minimum but not excellent
        for (let i = 0; i < 96; i++) {
            tracker.recordExecution({ id: `s-${i}` }, { success: true, profit: 10 }, 200);
        }
        
        for (let i = 0; i < 4; i++) {
            tracker.recordExecution({ id: `f-${i}` }, { success: false, profit: -2 }, 180);
        }
        
        const stats = tracker.getStats();
        
        assert.strictEqual(stats.meetsMinimumTarget, true);
        assert.strictEqual(stats.meetsExcellenceTarget, false);
    });

    test('should format uptime correctly', () => {
        const tracker = new PerformanceTracker({ enablePersistence: false });
        
        const stats = tracker.getStats();
        
        assert.ok(stats.uptime);
        assert.ok(typeof stats.uptimeMs === 'number');
    });
});

describe('PerformanceTracker - Hourly Statistics', () => {
    test('should track hourly statistics', () => {
        const tracker = new PerformanceTracker({ enablePersistence: false });
        
        // Record executions at different times
        for (let i = 0; i < 10; i++) {
            tracker.recordExecution(
                { id: `exec-${i}` },
                { success: true, profit: 10 },
                200
            );
        }
        
        const hour = new Date().getHours();
        
        assert.ok(tracker.metrics.hourlyStats[hour]);
        assert.strictEqual(tracker.metrics.hourlyStats[hour].executions, 10);
        assert.strictEqual(tracker.metrics.hourlyStats[hour].successes, 10);
    });

    test('should calculate average execution time per hour', () => {
        const tracker = new PerformanceTracker({ enablePersistence: false });
        
        tracker.recordExecution({ id: 'exec-1' }, { success: true, profit: 10 }, 200);
        tracker.recordExecution({ id: 'exec-2' }, { success: true, profit: 12 }, 300);
        
        const hour = new Date().getHours();
        const stats = tracker.metrics.hourlyStats[hour];
        
        assert.ok(stats);
        assert.ok(stats.avgExecutionTime > 0);
        assert.ok(stats.avgExecutionTime >= 200);
        assert.ok(stats.avgExecutionTime <= 300);
    });

    test('should track profit per hour', () => {
        const tracker = new PerformanceTracker({ enablePersistence: false });
        
        tracker.recordExecution({ id: 'exec-1' }, { success: true, profit: 25 }, 200);
        tracker.recordExecution({ id: 'exec-2' }, { success: true, profit: 35 }, 220);
        
        const hour = new Date().getHours();
        const stats = tracker.metrics.hourlyStats[hour];
        
        assert.ok(stats);
        assert.strictEqual(stats.totalProfit, 60);
    });
});

describe('PerformanceTracker - Reset Functionality', () => {
    test('should reset all metrics', () => {
        const tracker = new PerformanceTracker({ enablePersistence: false });
        
        // Add some data
        tracker.recordOpportunity({ id: 'opp-1' }, { overall_score: 80, should_execute: true });
        tracker.recordExecution({ id: 'exec-1' }, { success: true, profit: 15 }, 250);
        
        // Reset
        tracker.reset();
        
        assert.strictEqual(tracker.metrics.totalOpportunities, 0);
        assert.strictEqual(tracker.metrics.executedOpportunities, 0);
        assert.strictEqual(tracker.metrics.totalProfit, 0);
        assert.strictEqual(tracker.metrics.executionHistory.length, 0);
        assert.strictEqual(tracker.alerts.length, 0);
    });

    test('should maintain configuration after reset', () => {
        const tracker = new PerformanceTracker({
            targetSuccessRate: 0.98,
            windowSize: 50,
            enablePersistence: false
        });
        
        tracker.recordExecution({ id: 'exec-1' }, { success: true, profit: 15 }, 250);
        tracker.reset();
        
        assert.strictEqual(tracker.config.targetSuccessRate, 0.98);
        assert.strictEqual(tracker.config.windowSize, 50);
    });
});

describe('PerformanceTracker - Edge Cases and Validation', () => {
    test('should handle Infinity in minExecutionTime when no executions', () => {
        const tracker = new PerformanceTracker({ enablePersistence: false });
        
        const stats = tracker.getStats();
        
        assert.strictEqual(stats.minExecutionTime, 'N/A');
    });

    test('should handle zero execution time', () => {
        const tracker = new PerformanceTracker({ enablePersistence: false });
        
        tracker.recordExecution(
            { id: 'exec-1' },
            { success: true, profit: 10 },
            0
        );
        
        // Should not update timing metrics when executionTime is 0
        assert.strictEqual(tracker.metrics.avgExecutionTime, 0);
        assert.strictEqual(tracker.metrics.minExecutionTime, Infinity);
    });

    test('should handle very large profit values', () => {
        const tracker = new PerformanceTracker({ enablePersistence: false });
        
        tracker.recordExecution(
            { id: 'exec-1' },
            { success: true, profit: 1000000 },
            200
        );
        
        assert.strictEqual(tracker.metrics.totalProfit, 1000000);
        assert.strictEqual(tracker.metrics.maxProfit, 1000000);
    });

    test('should handle very large loss values', () => {
        const tracker = new PerformanceTracker({ enablePersistence: false });
        
        tracker.recordExecution(
            { id: 'exec-1' },
            { success: false, profit: -50000 },
            180
        );
        
        assert.strictEqual(tracker.metrics.totalLoss, 50000);
        assert.strictEqual(tracker.metrics.maxLoss, 50000);
    });

    test('should handle missing opportunity data gracefully', () => {
        const tracker = new PerformanceTracker({ enablePersistence: false });
        
        tracker.recordExecution(
            {},
            { success: true, profit: 10 },
            200
        );
        
        assert.strictEqual(tracker.metrics.executedOpportunities, 1);
        assert.strictEqual(tracker.metrics.successfulExecutions, 1);
    });

    test('should validate average calculation with single value', () => {
        const tracker = new PerformanceTracker({ enablePersistence: false });
        
        const avg = tracker.updateAverage(0, 100, 1);
        
        assert.strictEqual(avg, 100);
    });

    test('should validate average calculation with multiple values', () => {
        const tracker = new PerformanceTracker({ enablePersistence: false });
        
        let avg = 0;
        avg = tracker.updateAverage(avg, 100, 1);
        avg = tracker.updateAverage(avg, 200, 2);
        avg = tracker.updateAverage(avg, 150, 3);
        
        assert.strictEqual(avg, 150); // (100 + 200 + 150) / 3
    });
});

describe('PerformanceTracker - Real-World Scenario Validation', () => {
    test('should achieve 95%+ success rate in realistic scenario', () => {
        const tracker = new PerformanceTracker({ enablePersistence: false });
        
        // Simulate 200 executions with 96% success rate
        for (let i = 0; i < 192; i++) {
            tracker.recordExecution(
                { id: `success-${i}`, chain: 'polygon' },
                { success: true, profit: 10 + Math.random() * 30 },
                150 + Math.random() * 200
            );
        }
        
        for (let i = 0; i < 8; i++) {
            tracker.recordExecution(
                { id: `fail-${i}`, chain: 'polygon' },
                { success: false, profit: -2 },
                180
            );
        }
        
        const stats = tracker.getStats();
        const overallRate = parseFloat(stats.overallSuccessRate) / 100;
        
        assert.ok(overallRate >= 0.95, `Success rate ${overallRate} should be >= 0.95`);
        assert.strictEqual(stats.meetsMinimumTarget, true);
    });

    test('should track profit correctly over multiple executions', () => {
        const tracker = new PerformanceTracker({ enablePersistence: false });
        
        let expectedProfit = 0;
        let expectedLoss = 0;
        
        // 80 successful trades
        for (let i = 0; i < 80; i++) {
            const profit = 10 + Math.random() * 20;
            expectedProfit += profit;
            tracker.recordExecution(
                { id: `success-${i}` },
                { success: true, profit },
                200
            );
        }
        
        // 20 failed trades
        for (let i = 0; i < 20; i++) {
            const loss = 2 + Math.random() * 3;
            expectedLoss += loss;
            tracker.recordExecution(
                { id: `fail-${i}` },
                { success: false, profit: -loss },
                180
            );
        }
        
        const stats = tracker.getStats();
        const actualNet = parseFloat(stats.netProfit);
        const expectedNet = expectedProfit - expectedLoss;
        
        assert.ok(Math.abs(actualNet - expectedNet) < 0.01, 
            `Net profit should match: ${actualNet} vs ${expectedNet}`);
    });

    test('should demonstrate performance improvement over time', () => {
        const tracker = new PerformanceTracker({
            windowSize: 20,
            enablePersistence: false
        });
        
        // First 50 executions: 85% success
        for (let i = 0; i < 42; i++) {
            tracker.recordExecution({ id: `early-s-${i}` }, { success: true, profit: 10 }, 200);
        }
        for (let i = 0; i < 8; i++) {
            tracker.recordExecution({ id: `early-f-${i}` }, { success: false, profit: -2 }, 180);
        }
        
        // Next 20 executions (rolling window): 95% success
        for (let i = 0; i < 19; i++) {
            tracker.recordExecution({ id: `later-s-${i}` }, { success: true, profit: 10 }, 200);
        }
        for (let i = 0; i < 1; i++) {
            tracker.recordExecution({ id: `later-f-${i}` }, { success: false, profit: -2 }, 180);
        }
        
        const currentRate = tracker.getCurrentSuccessRate();
        const overallRate = tracker.getOverallSuccessRate();
        
        // Current (rolling window) should be higher than overall
        assert.ok(currentRate >= 0.95, `Current rate ${currentRate} should be >= 0.95`);
        assert.ok(currentRate > overallRate, 'Current rate should show improvement');
    });
});
