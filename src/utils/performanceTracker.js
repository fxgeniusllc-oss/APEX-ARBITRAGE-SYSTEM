/**
 * Performance Tracker
 * Monitors execution performance to ensure 95-99.9% success rate target
 * Provides real-time metrics, historical analysis, and alerts
 */

import chalk from 'chalk';
import fs from 'fs';
import path from 'path';

export class PerformanceTracker {
    constructor(options = {}) {
        this.config = {
            targetSuccessRate: options.targetSuccessRate || 0.95,  // 95% minimum
            excellentSuccessRate: options.excellentSuccessRate || 0.999, // 99.9% target
            windowSize: options.windowSize || 100,  // Rolling window for metrics
            alertThreshold: options.alertThreshold || 0.90, // Alert if below 90%
            dataDir: options.dataDir || './data/performance',
            enablePersistence: options.enablePersistence !== false
        };

        this.metrics = {
            // Execution metrics
            totalOpportunities: 0,
            executedOpportunities: 0,
            successfulExecutions: 0,
            failedExecutions: 0,
            skippedOpportunities: 0,
            
            // Profit metrics
            totalProfit: 0,
            totalLoss: 0,
            avgProfitPerTrade: 0,
            maxProfit: 0,
            maxLoss: 0,
            
            // Timing metrics
            avgExecutionTime: 0,
            // 'Infinity' indicates no execution time data yet; will be replaced by first measurement
            minExecutionTime: Infinity,
            maxExecutionTime: 0,
            
            // Quality metrics
            avgOpportunityScore: 0,
            avgConfidence: 0,
            
            // Historical data
            executionHistory: [],
            rollingWindow: [],
            hourlyStats: {},
            
            // Performance tracking
            startTime: Date.now(),
            lastUpdateTime: Date.now()
        };

        // Performance targets
        this.targets = {
            minSuccessRate: this.config.targetSuccessRate,
            targetSuccessRate: this.config.excellentSuccessRate,
            minProfitPerTrade: 5,
            maxExecutionTime: 5000 // 5 seconds
        };

        this.alerts = [];
        
        // Load persisted data if available
        if (this.config.enablePersistence) {
            this.loadPersistedData();
        }
    }

    /**
     * Record an opportunity evaluation
     */
    recordOpportunity(opportunity, scoringResult) {
        this.metrics.totalOpportunities++;
        this.metrics.avgOpportunityScore = this.updateAverage(
            this.metrics.avgOpportunityScore,
            scoringResult.overall_score,
            this.metrics.totalOpportunities
        );
        
        if (scoringResult.confidence) {
            this.metrics.avgConfidence = this.updateAverage(
                this.metrics.avgConfidence,
                scoringResult.confidence,
                this.metrics.totalOpportunities
            );
        }

        if (!scoringResult.should_execute) {
            this.metrics.skippedOpportunities++;
        }
    }

    /**
     * Record execution result
     */
    recordExecution(opportunity, result, executionTime = 0) {
        this.metrics.executedOpportunities++;
        this.metrics.lastUpdateTime = Date.now();

        const execution = {
            timestamp: Date.now(),
            opportunityId: opportunity.id || opportunity.route_id,
            chain: opportunity.chain,
            profit: result.profit || opportunity.profit_usd || 0,
            success: result.success,
            executionTime,
            gasPrice: opportunity.gas_price,
            score: opportunity.quality_score || opportunity.overall_score || 0
        };

        // Update success/failure counts
        if (result.success) {
            this.metrics.successfulExecutions++;
            const profit = execution.profit;
            
            this.metrics.totalProfit += profit;
            this.metrics.maxProfit = Math.max(this.metrics.maxProfit, profit);
            
            this.metrics.avgProfitPerTrade = 
                (this.metrics.totalProfit - this.metrics.totalLoss) / 
                this.metrics.executedOpportunities;
        } else {
            this.metrics.failedExecutions++;
            const loss = Math.abs(execution.profit || 0);
            
            this.metrics.totalLoss += loss;
            this.metrics.maxLoss = Math.max(this.metrics.maxLoss, loss);
        }

        // Update timing metrics
        if (executionTime > 0) {
            this.metrics.avgExecutionTime = this.updateAverage(
                this.metrics.avgExecutionTime,
                executionTime,
                this.metrics.executedOpportunities
            );
            this.metrics.minExecutionTime = Math.min(this.metrics.minExecutionTime, executionTime);
            this.metrics.maxExecutionTime = Math.max(this.metrics.maxExecutionTime, executionTime);
        }

        // Add to history
        this.metrics.executionHistory.push(execution);
        
        // Update rolling window
        this.metrics.rollingWindow.push(execution);
        if (this.metrics.rollingWindow.length > this.config.windowSize) {
            this.metrics.rollingWindow.shift();
        }

        // Update hourly stats
        this.updateHourlyStats(execution);

        // Check performance and generate alerts
        this.checkPerformance();

        // Persist data periodically
        if (this.config.enablePersistence && this.metrics.executedOpportunities % 10 === 0) {
            this.persistData();
        }
    }

    /**
     * Update running average
     */
    updateAverage(currentAvg, newValue, count) {
        return (currentAvg * (count - 1) + newValue) / count;
    }

    /**
     * Update hourly statistics
     */
    updateHourlyStats(execution) {
        const hour = new Date(execution.timestamp).getHours();
        
        if (!this.metrics.hourlyStats[hour]) {
            this.metrics.hourlyStats[hour] = {
                hour,
                executions: 0,
                successes: 0,
                failures: 0,
                totalProfit: 0,
                avgExecutionTime: 0
            };
        }

        const stats = this.metrics.hourlyStats[hour];
        stats.executions++;
        
        if (execution.success) {
            stats.successes++;
            stats.totalProfit += execution.profit;
        } else {
            stats.failures++;
        }

        stats.avgExecutionTime = this.updateAverage(
            stats.avgExecutionTime,
            execution.executionTime,
            stats.executions
        );
    }

    /**
     * Check if performance meets targets and generate alerts
     */
    checkPerformance() {
        const currentRate = this.getCurrentSuccessRate();
        
        // Check success rate
        if (currentRate < this.config.alertThreshold) {
            this.addAlert(
                'WARNING',
                `Success rate (${(currentRate * 100).toFixed(1)}%) below threshold (${(this.config.alertThreshold * 100).toFixed(1)}%)`,
                { currentRate, threshold: this.config.alertThreshold }
            );
        }

        // Check if we're meeting target
        if (this.metrics.executedOpportunities >= 100) {
            if (currentRate >= this.config.excellentSuccessRate) {
                this.addAlert(
                    'SUCCESS',
                    `🎉 Excellent! Success rate (${(currentRate * 100).toFixed(2)}%) exceeds 99.9% target`,
                    { currentRate }
                );
            } else if (currentRate >= this.config.targetSuccessRate) {
                this.addAlert(
                    'INFO',
                    `✅ Good! Success rate (${(currentRate * 100).toFixed(1)}%) meets 95% minimum target`,
                    { currentRate }
                );
            } else {
                this.addAlert(
                    'ERROR',
                    `❌ Performance below minimum! Success rate (${(currentRate * 100).toFixed(1)}%) under 95% target`,
                    { currentRate }
                );
            }
        }
    }

    /**
     * Add alert
     */
    addAlert(level, message, data = {}) {
        const alert = {
            timestamp: Date.now(),
            level,
            message,
            data
        };

        this.alerts.push(alert);

        // Keep only last 50 alerts
        if (this.alerts.length > 50) {
            this.alerts.shift();
        }

        // Log alert
        const color = {
            'SUCCESS': chalk.green,
            'INFO': chalk.cyan,
            'WARNING': chalk.yellow,
            'ERROR': chalk.red
        }[level] || chalk.white;

        console.log(color(`[${level}] ${message}`));
    }

    /**
     * Get current success rate (rolling window)
     */
    getCurrentSuccessRate() {
        if (this.metrics.executedOpportunities === 0) return 1.0;
        
        // Use rolling window if available, otherwise use all data
        const data = this.metrics.rollingWindow.length > 0 
            ? this.metrics.rollingWindow 
            : this.metrics.executionHistory;
        
        if (data.length === 0) return 1.0;
        
        const successes = data.filter(e => e.success).length;
        return successes / data.length;
    }

    /**
     * Get overall success rate
     */
    getOverallSuccessRate() {
        if (this.metrics.executedOpportunities === 0) return 1.0;
        return this.metrics.successfulExecutions / this.metrics.executedOpportunities;
    }

    /**
     * Get comprehensive statistics
     */
    getStats() {
        const uptime = Date.now() - this.metrics.startTime;
        const currentRate = this.getCurrentSuccessRate();
        const overallRate = this.getOverallSuccessRate();
        
        return {
            // Execution stats
            totalOpportunities: this.metrics.totalOpportunities,
            executedOpportunities: this.metrics.executedOpportunities,
            successfulExecutions: this.metrics.successfulExecutions,
            failedExecutions: this.metrics.failedExecutions,
            skippedOpportunities: this.metrics.skippedOpportunities,
            
            // Success rates
            currentSuccessRate: (currentRate * 100).toFixed(2) + '%',
            overallSuccessRate: (overallRate * 100).toFixed(2) + '%',
            targetSuccessRate: (this.config.targetSuccessRate * 100).toFixed(1) + '%',
            excellentSuccessRate: (this.config.excellentSuccessRate * 100).toFixed(1) + '%',
            
            // Performance status
            meetsMinimumTarget: overallRate >= this.config.targetSuccessRate,
            meetsExcellenceTarget: overallRate >= this.config.excellentSuccessRate,
            
            // Profit stats
            totalProfit: this.metrics.totalProfit.toFixed(2),
            totalLoss: this.metrics.totalLoss.toFixed(2),
            netProfit: (this.metrics.totalProfit - this.metrics.totalLoss).toFixed(2),
            avgProfitPerTrade: this.metrics.avgProfitPerTrade.toFixed(2),
            maxProfit: this.metrics.maxProfit.toFixed(2),
            maxLoss: this.metrics.maxLoss.toFixed(2),
            
            // Quality metrics
            avgOpportunityScore: this.metrics.avgOpportunityScore.toFixed(1),
            avgConfidence: (this.metrics.avgConfidence * 100).toFixed(1) + '%',
            
            // Timing
            avgExecutionTime: this.metrics.avgExecutionTime.toFixed(0) + 'ms',
            minExecutionTime: this.metrics.minExecutionTime === Infinity ? 'N/A' : this.metrics.minExecutionTime.toFixed(0) + 'ms',
            maxExecutionTime: this.metrics.maxExecutionTime.toFixed(0) + 'ms',
            
            // System
            uptime: this.formatUptime(uptime),
            uptimeMs: uptime
        };
    }

    /**
     * Format uptime in human-readable format
     */
    formatUptime(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}d ${hours % 24}h`;
        if (hours > 0) return `${hours}h ${minutes % 60}m`;
        if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
        return `${seconds}s`;
    }

    /**
     * Print performance dashboard
     */
    printDashboard() {
        const stats = this.getStats();
        
        console.log(chalk.cyan('\n' + '═'.repeat(70)));
        console.log(chalk.bold.cyan('         PERFORMANCE DASHBOARD - EXECUTION METRICS'));
        console.log(chalk.cyan('═'.repeat(70) + '\n'));

        // Success rates
        console.log(chalk.bold('🎯 SUCCESS RATES'));
        console.log(chalk.white(`   Current (Last ${this.config.windowSize}): `) + 
            this.colorizeSuccessRate(stats.currentSuccessRate));
        console.log(chalk.white('   Overall (All Time): ') + 
            this.colorizeSuccessRate(stats.overallSuccessRate));
        console.log(chalk.white('   Target (Minimum): ') + chalk.yellow(stats.targetSuccessRate));
        console.log(chalk.white('   Target (Excellence): ') + chalk.green(stats.excellentSuccessRate));
        console.log();

        // Performance status
        console.log(chalk.bold('📊 PERFORMANCE STATUS'));
        console.log(chalk.white('   Meets 95% Target: ') + 
            (stats.meetsMinimumTarget ? chalk.green('✓ YES') : chalk.red('✗ NO')));
        console.log(chalk.white('   Meets 99.9% Target: ') + 
            (stats.meetsExcellenceTarget ? chalk.green('✓ YES') : chalk.yellow('○ IN PROGRESS')));
        console.log();

        // Execution stats
        console.log(chalk.bold('📈 EXECUTION STATISTICS'));
        console.log(chalk.white('   Total Opportunities: ') + chalk.cyan(stats.totalOpportunities));
        console.log(chalk.white('   Executed: ') + chalk.green(stats.executedOpportunities));
        console.log(chalk.white('   Successful: ') + chalk.green(stats.successfulExecutions));
        console.log(chalk.white('   Failed: ') + chalk.red(stats.failedExecutions));
        console.log(chalk.white('   Skipped: ') + chalk.gray(stats.skippedOpportunities));
        console.log();

        // Profit stats
        console.log(chalk.bold('💰 PROFIT/LOSS'));
        console.log(chalk.white('   Total Profit: ') + chalk.green('$' + stats.totalProfit));
        console.log(chalk.white('   Total Loss: ') + chalk.red('$' + stats.totalLoss));
        console.log(chalk.white('   Net P/L: ') + 
            (parseFloat(stats.netProfit) >= 0 ? chalk.green('$' + stats.netProfit) : chalk.red('$' + stats.netProfit)));
        console.log(chalk.white('   Avg Per Trade: ') + chalk.cyan('$' + stats.avgProfitPerTrade));
        console.log();

        // Quality metrics
        console.log(chalk.bold('⭐ QUALITY METRICS'));
        console.log(chalk.white('   Avg Opportunity Score: ') + chalk.cyan(stats.avgOpportunityScore + '/100'));
        console.log(chalk.white('   Avg Confidence: ') + chalk.cyan(stats.avgConfidence));
        console.log();

        // System info
        console.log(chalk.bold('⚙️  SYSTEM'));
        console.log(chalk.white('   Uptime: ') + chalk.cyan(stats.uptime));
        console.log(chalk.white('   Avg Execution Time: ') + chalk.cyan(stats.avgExecutionTime));
        console.log();

        console.log(chalk.cyan('═'.repeat(70) + '\n'));
    }

    /**
     * Colorize success rate based on targets
     */
    colorizeSuccessRate(rateStr) {
        const rate = parseFloat(rateStr) / 100;
        if (rate >= this.config.excellentSuccessRate) return chalk.green.bold(rateStr);
        if (rate >= this.config.targetSuccessRate) return chalk.green(rateStr);
        if (rate >= this.config.alertThreshold) return chalk.yellow(rateStr);
        return chalk.red(rateStr);
    }

    /**
     * Get recent alerts
     */
    getRecentAlerts(count = 10) {
        return this.alerts.slice(-count).reverse();
    }

    /**
     * Persist data to disk
     */
    persistData() {
        if (!this.config.enablePersistence) return;

        try {
            const dataPath = path.join(this.config.dataDir, 'performance_metrics.json');
            
            // Ensure directory exists
            if (!fs.existsSync(this.config.dataDir)) {
                fs.mkdirSync(this.config.dataDir, { recursive: true });
            }

            // Save metrics (excluding large arrays)
            const data = {
                metrics: {
                    ...this.metrics,
                    executionHistory: this.metrics.executionHistory.slice(-1000), // Keep last 1000
                    rollingWindow: this.metrics.rollingWindow
                },
                targets: this.targets,
                lastSaved: Date.now()
            };

            fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
        } catch (error) {
            console.error(chalk.red('Failed to persist performance data:'), error.message);
        }
    }

    /**
     * Load persisted data
     */
    loadPersistedData() {
        try {
            const dataPath = path.join(this.config.dataDir, 'performance_metrics.json');
            
            if (fs.existsSync(dataPath)) {
                const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
                
                // Restore metrics
                if (data.metrics) {
                    this.metrics = {
                        ...this.metrics,
                        ...data.metrics,
                        startTime: data.metrics.startTime || Date.now()
                    };
                }

                console.log(chalk.green('✅ Loaded persisted performance data'));
            }
        } catch (error) {
            console.error(chalk.yellow('⚠️  Failed to load persisted data:'), error.message);
        }
    }

    /**
     * Reset metrics
     */
    reset() {
        this.metrics = {
            totalOpportunities: 0,
            executedOpportunities: 0,
            successfulExecutions: 0,
            failedExecutions: 0,
            skippedOpportunities: 0,
            totalProfit: 0,
            totalLoss: 0,
            avgProfitPerTrade: 0,
            maxProfit: 0,
            maxLoss: 0,
            avgExecutionTime: 0,
            minExecutionTime: Infinity,
            maxExecutionTime: 0,
            avgOpportunityScore: 0,
            avgConfidence: 0,
            executionHistory: [],
            rollingWindow: [],
            hourlyStats: {},
            startTime: Date.now(),
            lastUpdateTime: Date.now()
        };
        
        this.alerts = [];
        console.log(chalk.yellow('⚠️  Performance metrics reset'));
    }
}

// Export singleton instance
export const performanceTracker = new PerformanceTracker({
    targetSuccessRate: 0.95,
    excellentSuccessRate: 0.999,
    windowSize: 100,
    enablePersistence: true
});

export default PerformanceTracker;
