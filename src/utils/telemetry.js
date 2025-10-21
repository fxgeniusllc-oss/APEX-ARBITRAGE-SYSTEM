/**
 * Real-time telemetry and metrics system
 * Tracks system performance and arbitrage opportunities
 */

import { performance } from 'perf_hooks';

class TelemetrySystem {
    constructor() {
        this.metrics = {
            // Scanning metrics
            totalScans: 0,
            totalOpportunitiesFound: 0,
            avgScanTimeMs: 0,
            scanTimes: [],
            
            // Execution metrics
            totalExecutions: 0,
            successfulExecutions: 0,
            failedExecutions: 0,
            consecutiveFailures: 0,
            
            // Financial metrics
            totalProfitUSD: 0,
            totalLossUSD: 0,
            netProfitUSD: 0,
            bestTradeUSD: 0,
            worstTradeUSD: 0,
            avgProfitPerTrade: 0,
            
            // Gas metrics
            totalGasUsed: 0,
            totalGasCostUSD: 0,
            avgGasPriceGwei: 0,
            
            // ML metrics
            mlPredictions: 0,
            mlCorrectPredictions: 0,
            mlAccuracy: 0,
            avgConfidenceScore: 0,
            
            // Route metrics
            routeStats: {},
            
            // Chain metrics
            chainStats: {},
            
            // Time-based metrics
            startTime: Date.now(),
            lastExecutionTime: null,
            uptime: 0,
            
            // Rate limiting
            executionsPerHour: 0,
            lastHourExecutions: [],
            
            // Historical data (last 24h)
            hourlyStats: Array(24).fill(null).map(() => ({
                executions: 0,
                profit: 0,
                gasSpent: 0
            }))
        };
        
        // Update uptime every second
        this.uptimeInterval = setInterval(() => {
            this.metrics.uptime = Date.now() - this.metrics.startTime;
        }, 1000);
    }
    
    /**
     * Record a scan operation
     */
    recordScan(timeMs, opportunitiesFound) {
        this.metrics.totalScans++;
        this.metrics.totalOpportunitiesFound += opportunitiesFound;
        this.metrics.scanTimes.push(timeMs);
        
        // Keep only last 100 scan times for rolling average
        if (this.metrics.scanTimes.length > 100) {
            this.metrics.scanTimes.shift();
        }
        
        // Calculate average scan time
        this.metrics.avgScanTimeMs = 
            this.metrics.scanTimes.reduce((a, b) => a + b, 0) / 
            this.metrics.scanTimes.length;
    }
    
    /**
     * Record an execution attempt
     */
    recordExecution(execution) {
        this.metrics.totalExecutions++;
        this.metrics.lastExecutionTime = execution.timestamp || Date.now();
        
        const isSuccess = execution.status === 'success';
        
        if (isSuccess) {
            this.metrics.successfulExecutions++;
            this.metrics.consecutiveFailures = 0;
            
            // Financial metrics
            const profit = execution.profitUsd || 0;
            this.metrics.totalProfitUSD += profit;
            this.metrics.netProfitUSD = this.metrics.totalProfitUSD - this.metrics.totalLossUSD;
            
            if (profit > this.metrics.bestTradeUSD) {
                this.metrics.bestTradeUSD = profit;
            }
            
            if (profit < this.metrics.worstTradeUSD || this.metrics.worstTradeUSD === 0) {
                this.metrics.worstTradeUSD = profit;
            }
            
            this.metrics.avgProfitPerTrade = 
                this.metrics.totalProfitUSD / this.metrics.successfulExecutions;
            
        } else {
            this.metrics.failedExecutions++;
            this.metrics.consecutiveFailures++;
            
            const loss = Math.abs(execution.profitUsd || 0);
            this.metrics.totalLossUSD += loss;
            this.metrics.netProfitUSD = this.metrics.totalProfitUSD - this.metrics.totalLossUSD;
        }
        
        // Gas metrics
        if (execution.gasUsed && execution.gasPriceGwei) {
            this.metrics.totalGasUsed += execution.gasUsed;
            const gasCostUSD = (execution.gasUsed * execution.gasPriceGwei) / 1e9;
            this.metrics.totalGasCostUSD += gasCostUSD;
            
            // Rolling average gas price
            const totalExecutions = this.metrics.totalExecutions;
            this.metrics.avgGasPriceGwei = 
                (this.metrics.avgGasPriceGwei * (totalExecutions - 1) + execution.gasPriceGwei) / 
                totalExecutions;
        }
        
        // ML metrics
        if (execution.mlConfidence) {
            this.metrics.mlPredictions++;
            
            if (isSuccess) {
                this.metrics.mlCorrectPredictions++;
            }
            
            this.metrics.mlAccuracy = 
                this.metrics.mlCorrectPredictions / this.metrics.mlPredictions * 100;
            
            // Rolling average confidence
            this.metrics.avgConfidenceScore = 
                (this.metrics.avgConfidenceScore * (this.metrics.mlPredictions - 1) + 
                 execution.mlConfidence) / this.metrics.mlPredictions;
        }
        
        // Route metrics
        this.updateRouteMetrics(execution);
        
        // Chain metrics
        this.updateChainMetrics(execution);
        
        // Hourly metrics
        this.updateHourlyMetrics(execution);
        
        // Rate limiting tracking
        this.updateRateLimiting(execution);
    }
    
    /**
     * Update route-specific metrics
     */
    updateRouteMetrics(execution) {
        const routeId = execution.routeId;
        
        if (!this.metrics.routeStats[routeId]) {
            this.metrics.routeStats[routeId] = {
                attempts: 0,
                successes: 0,
                failures: 0,
                totalProfit: 0,
                avgProfit: 0,
                bestProfit: 0,
                successRate: 0
            };
        }
        
        const route = this.metrics.routeStats[routeId];
        route.attempts++;
        
        if (execution.status === 'success') {
            route.successes++;
            const profit = execution.profitUsd || 0;
            route.totalProfit += profit;
            route.avgProfit = route.totalProfit / route.successes;
            
            if (profit > route.bestProfit) {
                route.bestProfit = profit;
            }
        } else {
            route.failures++;
        }
        
        route.successRate = (route.successes / route.attempts) * 100;
    }
    
    /**
     * Update chain-specific metrics
     */
    updateChainMetrics(execution) {
        const chain = execution.chain || 'unknown';
        
        if (!this.metrics.chainStats[chain]) {
            this.metrics.chainStats[chain] = {
                executions: 0,
                successes: 0,
                totalProfit: 0,
                avgProfit: 0
            };
        }
        
        const chainStat = this.metrics.chainStats[chain];
        chainStat.executions++;
        
        if (execution.status === 'success') {
            chainStat.successes++;
            const profit = execution.profitUsd || 0;
            chainStat.totalProfit += profit;
            chainStat.avgProfit = chainStat.totalProfit / chainStat.successes;
        }
    }
    
    /**
     * Update hourly statistics
     */
    updateHourlyMetrics(execution) {
        const hour = new Date().getHours();
        const hourStat = this.metrics.hourlyStats[hour];
        
        hourStat.executions++;
        
        if (execution.status === 'success') {
            hourStat.profit += execution.profitUsd || 0;
        }
        
        if (execution.gasUsed && execution.gasPriceGwei) {
            hourStat.gasSpent += (execution.gasUsed * execution.gasPriceGwei) / 1e9;
        }
    }
    
    /**
     * Track rate limiting
     */
    updateRateLimiting(execution) {
        const now = Date.now();
        const oneHourAgo = now - 3600000;
        
        // Add current execution
        this.metrics.lastHourExecutions.push(now);
        
        // Remove executions older than 1 hour
        this.metrics.lastHourExecutions = this.metrics.lastHourExecutions.filter(
            time => time > oneHourAgo
        );
        
        this.metrics.executionsPerHour = this.metrics.lastHourExecutions.length;
    }
    
    /**
     * Get current metrics snapshot
     */
    getMetrics() {
        return {
            ...this.metrics,
            successRate: this.metrics.totalExecutions > 0
                ? (this.metrics.successfulExecutions / this.metrics.totalExecutions * 100).toFixed(2)
                : 0,
            uptimeSeconds: Math.floor(this.metrics.uptime / 1000),
            uptimeFormatted: this.formatUptime(this.metrics.uptime)
        };
    }
    
    /**
     * Format uptime as human-readable string
     */
    formatUptime(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (days > 0) {
            return `${days}d ${hours % 24}h ${minutes % 60}m`;
        } else if (hours > 0) {
            return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    }
    
    /**
     * Get top performing routes
     */
    getTopRoutes(limit = 5) {
        return Object.entries(this.metrics.routeStats)
            .map(([routeId, stats]) => ({ routeId, ...stats }))
            .sort((a, b) => b.totalProfit - a.totalProfit)
            .slice(0, limit);
    }
    
    /**
     * Get chain performance comparison
     */
    getChainComparison() {
        return Object.entries(this.metrics.chainStats)
            .map(([chain, stats]) => ({ chain, ...stats }))
            .sort((a, b) => b.totalProfit - a.totalProfit);
    }
    
    /**
     * Get hourly performance for current day
     */
    getHourlyPerformance() {
        return this.metrics.hourlyStats;
    }
    
    /**
     * Check if within safety limits
     */
    checkSafetyLimits(config) {
        const warnings = [];
        
        // Check consecutive failures
        if (this.metrics.consecutiveFailures >= config.maxConsecutiveFailures) {
            warnings.push({
                type: 'CONSECUTIVE_FAILURES',
                message: `${this.metrics.consecutiveFailures} consecutive failures (max: ${config.maxConsecutiveFailures})`,
                severity: 'critical'
            });
        }
        
        // Check daily loss
        const today = new Date().toISOString().split('T')[0];
        const todayLoss = this.getDailyLoss(today);
        if (todayLoss > config.maxDailyLoss) {
            warnings.push({
                type: 'DAILY_LOSS_LIMIT',
                message: `Daily loss $${todayLoss.toFixed(2)} exceeds limit $${config.maxDailyLoss}`,
                severity: 'critical'
            });
        }
        
        // Check execution rate
        if (this.metrics.executionsPerHour > 100) {
            warnings.push({
                type: 'HIGH_EXECUTION_RATE',
                message: `High execution rate: ${this.metrics.executionsPerHour} trades/hour`,
                severity: 'warning'
            });
        }
        
        return warnings;
    }
    
    /**
     * Get daily loss for specific date
     */
    getDailyLoss(date) {
        // This would integrate with database in production
        return this.metrics.totalLossUSD;
    }
    
    /**
     * Export metrics for external monitoring
     */
    exportMetrics() {
        return {
            timestamp: Date.now(),
            ...this.getMetrics(),
            topRoutes: this.getTopRoutes(),
            chainComparison: this.getChainComparison()
        };
    }
    
    /**
     * Reset metrics (for testing or new session)
     */
    reset() {
        Object.keys(this.metrics).forEach(key => {
            if (Array.isArray(this.metrics[key])) {
                this.metrics[key] = [];
            } else if (typeof this.metrics[key] === 'object') {
                this.metrics[key] = {};
            } else if (typeof this.metrics[key] === 'number') {
                this.metrics[key] = 0;
            }
        });
        
        this.metrics.startTime = Date.now();
        this.metrics.hourlyStats = Array(24).fill(null).map(() => ({
            executions: 0,
            profit: 0,
            gasSpent: 0
        }));
    }
    
    /**
     * Cleanup on shutdown
     */
    shutdown() {
        if (this.uptimeInterval) {
            clearInterval(this.uptimeInterval);
        }
    }
}

// Export singleton instance
const telemetry = new TelemetrySystem();

export default telemetry;
export { TelemetrySystem };
