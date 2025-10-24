/**
 * APEX Terminal Display Module
 * Provides comprehensive real-time activity monitoring via terminal
 * Displays: system status, executions, opportunities, routes, market conditions, ML status
 */

import Table from 'cli-table3';
import moment from 'moment';

// Chalk 5.x is ESM-only, so we'll use a dynamic import wrapper
let chalk;

async function loadChalk() {
    if (!chalk) {
        chalk = (await import('chalk')).default;
    }
    return chalk;
}

class TerminalDisplay {
    constructor(config = {}) {
        this.config = {
            refreshInterval: config.refreshInterval || 5000, // 5 seconds default
            maxRecentActivities: config.maxRecentActivities || 10,
            maxRouteDisplay: config.maxRouteDisplay || 5,
            showDetailedMetrics: config.showDetailedMetrics !== false,
            colorTheme: config.colorTheme || 'default', // default, minimal, high-contrast
            ...config
        };

        this.data = {
            systemStatus: {
                mode: 'DEV',
                uptime: 0,
                startTime: Date.now(),
                componentsStatus: {
                    rustEngine: true,
                    pythonOrchestrator: true,
                    nodeCoordinator: true,
                    mlEngine: false,
                    websocket: false
                }
            },
            executionStats: {
                totalScans: 0,
                totalOpportunities: 0,
                realExecutions: 0,
                simulatedExecutions: 0,
                successfulExecutions: 0,
                failedExecutions: 0,
                totalProfit: 0,
                simulatedProfit: 0,
                totalLoss: 0,
                totalGasCost: 0,
                consecutiveFailures: 0,
                lastExecutionTime: null
            },
            activeOpportunities: [],
            routePerformance: new Map(),
            recentActivities: [],
            marketConditions: {
                gasPrice: 0,
                maxGasPrice: 100,
                networkCongestion: 'low',
                prices: {}
            },
            mlEngineStatus: {
                active: false,
                inferenceTime: 0,
                accuracy: 0,
                modelType: 'ONNX',
                lastPrediction: null
            },
            chainStatus: new Map()
        };

        this.chalkReady = false;
        this.colors = null;
        
        // Initialize chalk asynchronously
        this._initializeChalk();
    }

    async _initializeChalk() {
        try {
            await loadChalk();
            this.colors = this._getColorTheme();
            this.chalkReady = true;
        } catch (error) {
            console.error('Failed to load chalk:', error);
            // Fallback to no colors
            this.colors = this._getFallbackColors();
            this.chalkReady = true;
        }
    }

    _getFallbackColors() {
        // Fallback colors without chalk (plain text)
        const identity = (text) => text;
        return {
            header: identity,
            success: identity,
            warning: identity,
            error: identity,
            info: identity,
            dim: identity,
            highlight: identity,
            profit: identity,
            loss: identity
        };
    }

    _getColorTheme() {
        if (!chalk) {
            return this._getFallbackColors();
        }
        
        const themes = {
            default: {
                header: chalk.cyan.bold,
                success: chalk.green,
                warning: chalk.yellow,
                error: chalk.red,
                info: chalk.blue,
                dim: chalk.dim,
                highlight: chalk.bold,
                profit: chalk.green.bold,
                loss: chalk.red.bold
            },
            minimal: {
                header: chalk.bold,
                success: chalk.white,
                warning: chalk.white,
                error: chalk.white,
                info: chalk.white,
                dim: chalk.dim,
                highlight: chalk.bold,
                profit: chalk.white.bold,
                loss: chalk.white
            },
            'high-contrast': {
                header: chalk.bgBlue.white.bold,
                success: chalk.bgGreen.black,
                warning: chalk.bgYellow.black,
                error: chalk.bgRed.white,
                info: chalk.bgCyan.black,
                dim: chalk.gray,
                highlight: chalk.inverse,
                profit: chalk.bgGreen.white.bold,
                loss: chalk.bgRed.white.bold
            }
        };
        return themes[this.config.colorTheme] || themes.default;
    }

    /**
     * Update system status
     */
    updateSystemStatus(status) {
        Object.assign(this.data.systemStatus, status);
        this.data.systemStatus.uptime = Date.now() - this.data.systemStatus.startTime;
    }

    /**
     * Update execution statistics
     */
    updateExecutionStats(stats) {
        Object.assign(this.data.executionStats, stats);
    }

    /**
     * Add a new opportunity
     */
    addOpportunity(opportunity) {
        this.data.activeOpportunities.push({
            ...opportunity,
            addedAt: Date.now()
        });
        this.data.executionStats.totalOpportunities++;
        
        // Keep only recent opportunities (last 20)
        if (this.data.activeOpportunities.length > 20) {
            this.data.activeOpportunities = this.data.activeOpportunities.slice(-20);
        }
    }

    /**
     * Remove opportunity (executed or expired)
     */
    removeOpportunity(opportunityId) {
        this.data.activeOpportunities = this.data.activeOpportunities.filter(
            opp => opp.id !== opportunityId
        );
    }

    /**
     * Update route performance
     */
    updateRoutePerformance(routeId, performance) {
        if (!this.data.routePerformance.has(routeId)) {
            this.data.routePerformance.set(routeId, {
                routeId,
                attempts: 0,
                successes: 0,
                failures: 0,
                totalProfit: 0,
                avgProfit: 0,
                lastExecuted: null
            });
        }
        
        const route = this.data.routePerformance.get(routeId);
        route.attempts += performance.attempts || 1;
        route.successes += performance.success ? 1 : 0;
        route.failures += performance.success ? 0 : 1;
        route.totalProfit += performance.profit || 0;
        route.avgProfit = route.totalProfit / route.attempts;
        route.lastExecuted = Date.now();
        
        if (performance.description) {
            route.description = performance.description;
        }
    }

    /**
     * Add activity to recent activities log
     */
    addActivity(activity) {
        this.recentActivities = this.recentActivities || [];
        this.recentActivities.unshift({
            ...activity,
            timestamp: Date.now()
        });
        
        // Keep only recent activities
        if (this.recentActivities.length > this.config.maxRecentActivities) {
            this.recentActivities = this.recentActivities.slice(0, this.config.maxRecentActivities);
        }
        
        this.data.recentActivities = this.recentActivities;
    }

    /**
     * Update market conditions
     */
    updateMarketConditions(conditions) {
        Object.assign(this.data.marketConditions, conditions);
    }

    /**
     * Update ML engine status
     */
    updateMLEngineStatus(status) {
        Object.assign(this.data.mlEngineStatus, status);
    }

    /**
     * Update chain status
     */
    updateChainStatus(chain, status) {
        this.data.chainStatus.set(chain, {
            ...status,
            lastUpdate: Date.now()
        });
    }

    /**
     * Render the complete terminal display
     */
    async render() {
        // Wait for chalk to be ready
        if (!this.chalkReady) {
            await this._initializeChalk();
        }
        
        console.clear();
        
        this._renderHeader();
        this._renderSystemStatus();
        this._renderExecutionStats();
        
        if (this.data.activeOpportunities.length > 0) {
            this._renderActiveOpportunities();
        }
        
        this._renderRoutePerformance();
        this._renderRecentActivities();
        this._renderMarketConditions();
        
        if (this.data.mlEngineStatus.active) {
            this._renderMLEngineStatus();
        }
        
        if (this.data.chainStatus.size > 0) {
            this._renderChainStatus();
        }
        
        this._renderFooter();
    }

    _renderHeader() {
        const width = 90;
        console.log(this.colors.header('═'.repeat(width)));
        console.log(this.colors.header(this._centerText('APEX ARBITRAGE SYSTEM - REAL-TIME DASHBOARD', width)));
        console.log(this.colors.header('═'.repeat(width)));
        console.log();
    }

    _renderSystemStatus() {
        const status = this.data.systemStatus;
        const uptime = this._formatDuration(status.uptime);
        
        console.log(this.colors.header('🎛️  SYSTEM STATUS'));
        console.log(this.colors.dim('─'.repeat(90)));
        
        const table = new Table({
            head: [this.colors.info('Component'), this.colors.info('Status'), this.colors.info('Details')],
            colWidths: [25, 15, 50],
            style: { head: [], border: ['dim'] }
        });
        
        table.push(
            ['Execution Mode', this._getModeDisplay(status.mode), `Uptime: ${uptime}`],
            ['Rust Engine', this._getStatusIndicator(status.componentsStatus.rustEngine), '100x speed calculation engine'],
            ['Python Orchestrator', this._getStatusIndicator(status.componentsStatus.pythonOrchestrator), 'ML-powered opportunity scoring'],
            ['Node.js Coordinator', this._getStatusIndicator(status.componentsStatus.nodeCoordinator), 'Multi-chain coordination'],
            ['ML/AI Engine', this._getStatusIndicator(status.componentsStatus.mlEngine), 'XGBoost + ONNX ensemble'],
            ['WebSocket Server', this._getStatusIndicator(status.componentsStatus.websocket), 'Real-time data streaming']
        );
        
        console.log(table.toString());
        console.log();
    }

    _renderExecutionStats() {
        const stats = this.data.executionStats;
        const successRate = stats.realExecutions + stats.simulatedExecutions > 0
            ? ((stats.successfulExecutions / (stats.realExecutions + stats.simulatedExecutions)) * 100).toFixed(1)
            : 0;
        
        console.log(this.colors.header('📊 EXECUTION STATISTICS'));
        console.log(this.colors.dim('─'.repeat(90)));
        
        const table = new Table({
            head: [this.colors.info('Metric'), this.colors.info('Value'), this.colors.info('Additional Info')],
            colWidths: [30, 20, 40],
            style: { head: [], border: ['dim'] }
        });
        
        const isLiveMode = this.data.systemStatus.mode === 'LIVE';
        
        table.push(
            ['Total Scans', this.colors.highlight(stats.totalScans.toLocaleString()), `${stats.totalOpportunities} opportunities found`],
            [
                isLiveMode ? 'Real Executions' : 'Simulated Executions',
                this.colors.highlight((isLiveMode ? stats.realExecutions : stats.simulatedExecutions).toLocaleString()),
                `${stats.successfulExecutions} successful`
            ],
            ['Success Rate', this._colorByRate(successRate) + '%', `${stats.failedExecutions} failures`],
            [
                'Total Profit',
                isLiveMode 
                    ? this.colors.profit('$' + stats.totalProfit.toFixed(2))
                    : this.colors.warning('$' + stats.simulatedProfit.toFixed(2)),
                isLiveMode ? `Real profit` : `Simulated (no real funds)`
            ],
            ['Total Gas Cost', this.colors.dim('$' + stats.totalGasCost.toFixed(2)), `Network fees`],
            ['Net P/L', this._colorByProfit(stats.totalProfit - stats.totalGasCost - stats.totalLoss), `After all costs`],
            ['Consecutive Failures', this._colorByFailures(stats.consecutiveFailures), stats.consecutiveFailures >= 3 ? this.colors.warning('⚠️ Monitor closely') : 'Normal']
        );
        
        if (stats.lastExecutionTime) {
            table.push(['Last Execution', moment(stats.lastExecutionTime).fromNow(), moment(stats.lastExecutionTime).format('HH:mm:ss')]);
        }
        
        console.log(table.toString());
        console.log();
    }

    _renderActiveOpportunities() {
        console.log(this.colors.header('🎯 ACTIVE OPPORTUNITIES'));
        console.log(this.colors.dim('─'.repeat(90)));
        
        const table = new Table({
            head: [
                this.colors.info('Route'),
                this.colors.info('Profit'),
                this.colors.info('Confidence'),
                this.colors.info('Chain'),
                this.colors.info('Age')
            ],
            colWidths: [30, 12, 12, 12, 14],
            style: { head: [], border: ['dim'] }
        });
        
        const recentOpportunities = this.data.activeOpportunities.slice(-5).reverse();
        
        for (const opp of recentOpportunities) {
            const age = Math.floor((Date.now() - opp.addedAt) / 1000);
            table.push([
                this.colors.dim(opp.routeId || opp.id || 'Unknown'),
                this.colors.profit('$' + (opp.profitUsd || opp.profit_usd || 0).toFixed(2)),
                this._colorByConfidence((opp.confidenceScore || opp.confidence_score || 0) * 100),
                this.colors.info(opp.chain || 'polygon'),
                this.colors.dim(`${age}s ago`)
            ]);
        }
        
        console.log(table.toString());
        console.log();
    }

    _renderRoutePerformance() {
        console.log(this.colors.header('🏆 TOP PERFORMING ROUTES'));
        console.log(this.colors.dim('─'.repeat(90)));
        
        // Sort routes by total profit
        const routes = Array.from(this.data.routePerformance.values())
            .sort((a, b) => b.totalProfit - a.totalProfit)
            .slice(0, this.config.maxRouteDisplay);
        
        if (routes.length === 0) {
            console.log(this.colors.dim('   No route performance data yet...'));
            console.log();
            return;
        }
        
        const table = new Table({
            head: [
                this.colors.info('Route'),
                this.colors.info('Attempts'),
                this.colors.info('Success'),
                this.colors.info('Total Profit'),
                this.colors.info('Avg Profit')
            ],
            colWidths: [30, 12, 12, 15, 15],
            style: { head: [], border: ['dim'] }
        });
        
        for (const route of routes) {
            const successRate = route.attempts > 0 ? ((route.successes / route.attempts) * 100).toFixed(1) : 0;
            table.push([
                this.colors.dim(route.routeId),
                route.attempts,
                this._colorByRate(successRate) + '%',
                this.colors.profit('$' + route.totalProfit.toFixed(2)),
                this.colors.success('$' + route.avgProfit.toFixed(2))
            ]);
        }
        
        console.log(table.toString());
        console.log();
    }

    _renderRecentActivities() {
        console.log(this.colors.header('📝 RECENT ACTIVITY LOG'));
        console.log(this.colors.dim('─'.repeat(90)));
        
        if (this.data.recentActivities.length === 0) {
            console.log(this.colors.dim('   No recent activities...'));
            console.log();
            return;
        }
        
        const table = new Table({
            head: [
                this.colors.info('Time'),
                this.colors.info('Type'),
                this.colors.info('Message'),
                this.colors.info('Details')
            ],
            colWidths: [12, 15, 35, 28],
            style: { head: [], border: ['dim'] }
        });
        
        for (const activity of this.data.recentActivities.slice(0, this.config.maxRecentActivities)) {
            const time = moment(activity.timestamp).format('HH:mm:ss');
            const typeDisplay = this._getActivityTypeDisplay(activity.type);
            table.push([
                this.colors.dim(time),
                typeDisplay,
                activity.message || '',
                this.colors.dim(activity.details || '')
            ]);
        }
        
        console.log(table.toString());
        console.log();
    }

    _renderMarketConditions() {
        const market = this.data.marketConditions;
        
        console.log(this.colors.header('⛽ MARKET CONDITIONS'));
        console.log(this.colors.dim('─'.repeat(90)));
        
        const table = new Table({
            head: [this.colors.info('Metric'), this.colors.info('Current'), this.colors.info('Status')],
            colWidths: [30, 20, 40],
            style: { head: [], border: ['dim'] }
        });
        
        const gasStatus = market.gasPrice <= market.maxGasPrice * 0.7 ? 'Optimal' : 
                         market.gasPrice <= market.maxGasPrice ? 'Acceptable' : 'Too High';
        
        table.push(
            ['Gas Price', `${market.gasPrice.toFixed(2)} Gwei`, this._colorByGasPrice(market.gasPrice, market.maxGasPrice, gasStatus)],
            ['Max Gas Limit', `${market.maxGasPrice} Gwei`, 'Configured threshold'],
            ['Network Congestion', market.networkCongestion || 'low', this._getNetworkCongestionIndicator(market.networkCongestion)]
        );
        
        // Add token prices if available
        if (market.prices && Object.keys(market.prices).length > 0) {
            for (const [token, price] of Object.entries(market.prices)) {
                if (price) {
                    table.push([`${token} Price`, `$${price.toFixed(4)}`, 'Current market price']);
                }
            }
        }
        
        console.log(table.toString());
        console.log();
    }

    _renderMLEngineStatus() {
        const ml = this.data.mlEngineStatus;
        
        console.log(this.colors.header('🤖 ML/AI ENGINE STATUS'));
        console.log(this.colors.dim('─'.repeat(90)));
        
        const table = new Table({
            head: [this.colors.info('Metric'), this.colors.info('Value'), this.colors.info('Performance')],
            colWidths: [30, 20, 40],
            style: { head: [], border: ['dim'] }
        });
        
        table.push(
            ['Model Type', ml.modelType || 'ONNX', ml.active ? this.colors.success('Active') : this.colors.dim('Inactive')],
            ['Inference Time', `${ml.inferenceTime.toFixed(2)}ms`, ml.inferenceTime < 20 ? this.colors.success('Excellent') : 'Acceptable'],
            ['Model Accuracy', `${(ml.accuracy * 100).toFixed(1)}%`, ml.accuracy > 0.85 ? this.colors.success('High') : 'Moderate']
        );
        
        if (ml.lastPrediction) {
            table.push(['Last Prediction', moment(ml.lastPrediction).fromNow(), 'Most recent inference']);
        }
        
        console.log(table.toString());
        console.log();
    }

    _renderChainStatus() {
        console.log(this.colors.header('⛓️  MULTI-CHAIN STATUS'));
        console.log(this.colors.dim('─'.repeat(90)));
        
        const table = new Table({
            head: [
                this.colors.info('Chain'),
                this.colors.info('Status'),
                this.colors.info('Block'),
                this.colors.info('Opportunities')
            ],
            colWidths: [20, 15, 20, 35],
            style: { head: [], border: ['dim'] }
        });
        
        for (const [chain, status] of this.data.chainStatus) {
            table.push([
                this.colors.highlight(chain.toUpperCase()),
                this._getStatusIndicator(status.connected),
                status.blockNumber ? `#${status.blockNumber.toLocaleString()}` : 'N/A',
                `${status.opportunities || 0} found`
            ]);
        }
        
        console.log(table.toString());
        console.log();
    }

    _renderFooter() {
        const width = 90;
        console.log(this.colors.dim('─'.repeat(width)));
        console.log(this.colors.dim(`⏰ Last Update: ${moment().format('YYYY-MM-DD HH:mm:ss')} | Refresh Rate: ${this.config.refreshInterval / 1000}s`));
        console.log(this.colors.dim(`💾 Press Ctrl+C to stop system`));
        console.log();
    }

    // Helper methods

    _centerText(text, width) {
        const padding = Math.floor((width - text.length) / 2);
        return ' '.repeat(padding) + text;
    }

    _formatDuration(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (days > 0) return `${days}d ${hours % 24}h`;
        if (hours > 0) return `${hours}h ${minutes % 60}m`;
        if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
        return `${seconds}s`;
    }

    _getModeDisplay(mode) {
        const modes = {
            'LIVE': this.colors.error('🔴 LIVE'),
            'DEV': this.colors.warning('🟡 DEV'),
            'SIM': this.colors.info('🔵 SIM')
        };
        return modes[mode] || mode;
    }

    _getStatusIndicator(status) {
        return status ? this.colors.success('● Online') : this.colors.dim('○ Offline');
    }

    _colorByRate(rate) {
        const r = parseFloat(rate);
        if (r >= 80) return this.colors.success(rate);
        if (r >= 60) return this.colors.warning(rate);
        return this.colors.error(rate);
    }

    _colorByProfit(profit) {
        const p = parseFloat(profit);
        if (p > 0) return this.colors.profit('$' + p.toFixed(2));
        if (p < 0) return this.colors.loss('$' + p.toFixed(2));
        return this.colors.dim('$0.00');
    }

    _colorByFailures(failures) {
        if (failures >= 5) return this.colors.error(failures);
        if (failures >= 3) return this.colors.warning(failures);
        return this.colors.success(failures);
    }

    _colorByConfidence(confidence) {
        const c = parseFloat(confidence);
        if (c >= 80) return this.colors.success(c.toFixed(1) + '%');
        if (c >= 60) return this.colors.warning(c.toFixed(1) + '%');
        return this.colors.error(c.toFixed(1) + '%');
    }

    _colorByGasPrice(current, max, status) {
        if (status === 'Optimal') return this.colors.success(status + ' ✓');
        if (status === 'Acceptable') return this.colors.warning(status);
        return this.colors.error(status + ' ✗');
    }

    _getNetworkCongestionIndicator(level) {
        const levels = {
            'low': this.colors.success('● Low - Optimal'),
            'medium': this.colors.warning('● Medium - Acceptable'),
            'high': this.colors.error('● High - Suboptimal')
        };
        return levels[level] || this.colors.dim('Unknown');
    }

    _getActivityTypeDisplay(type) {
        const types = {
            'scan': this.colors.info('🔍 Scan'),
            'opportunity': this.colors.success('🎯 Opportunity'),
            'execution': this.colors.highlight('⚡ Execution'),
            'success': this.colors.success('✅ Success'),
            'failure': this.colors.error('❌ Failure'),
            'warning': this.colors.warning('⚠️  Warning'),
            'info': this.colors.info('ℹ️  Info'),
            'error': this.colors.error('🚨 Error')
        };
        return types[type] || type;
    }

    /**
     * Start auto-refresh interval
     */
    async startAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
        
        await this.render(); // Initial render
        
        this.refreshInterval = setInterval(async () => {
            await this.render();
        }, this.config.refreshInterval);
    }

    /**
     * Stop auto-refresh
     */
    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }
}

export { TerminalDisplay };
