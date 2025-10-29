#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * APEX ARBITRAGE SYSTEM - PERFORMANCE REGRESSION ANALYSIS
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Analyzes performance changes over time to determine if new additions have
 * increased or decreased system performance.
 * 
 * Features:
 * - Compares current performance with historical baselines
 * - Detects performance regressions (degradations)
 * - Highlights performance improvements
 * - Generates trend analysis reports
 * - Provides actionable recommendations
 * 
 * Usage:
 *   node scripts/performance-regression-analysis.js
 *   yarn test:performance-regression
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..');

// Configuration
const CONFIG = {
    testResultsDir: path.join(ROOT_DIR, 'data/test-results'),
    performanceMetricsFile: path.join(ROOT_DIR, 'data/performance/performance_metrics.json'),
    outputFile: path.join(ROOT_DIR, 'data/test-results/performance-regression-report.json'),
    
    // Thresholds for regression detection
    thresholds: {
        successRateRegression: 0.05,      // 5% drop is a regression
        executionTimeRegression: 0.10,     // 10% increase is a regression
        profitRegression: 0.10,            // 10% drop is a regression
        improvementThreshold: 0.10         // 10% improvement is noteworthy
    }
};

/**
 * Load all historical test results
 */
function loadHistoricalResults() {
    const files = fs.readdirSync(CONFIG.testResultsDir)
        .filter(f => f.startsWith('regression-test-results-') && f.endsWith('.json'))
        .sort(); // Chronological order
    
    const results = files.map(file => {
        const filePath = path.join(CONFIG.testResultsDir, file);
        return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    });
    
    return results;
}

/**
 * Load current performance metrics
 */
function loadPerformanceMetrics() {
    if (!fs.existsSync(CONFIG.performanceMetricsFile)) {
        return null;
    }
    return JSON.parse(fs.readFileSync(CONFIG.performanceMetricsFile, 'utf-8'));
}

/**
 * Calculate performance trend
 */
function calculateTrend(values) {
    if (values.length < 2) return 'stable';
    
    const recent = values.slice(-3).reduce((sum, v) => sum + v, 0) / Math.min(3, values.length);
    const earlier = values.slice(0, Math.max(1, values.length - 3)).reduce((sum, v) => sum + v, 0) / Math.max(1, values.length - 3);
    
    const change = (recent - earlier) / earlier;
    
    if (change > CONFIG.thresholds.improvementThreshold) return 'improving';
    if (change < -CONFIG.thresholds.improvementThreshold) return 'declining';
    return 'stable';
}

/**
 * Calculate percentage change
 */
function calculateChange(current, baseline) {
    if (!baseline || baseline === 0) return 0;
    return ((current - baseline) / baseline) * 100;
}

/**
 * Detect regressions in metrics
 */
function detectRegressions(current, baseline) {
    const regressions = [];
    const improvements = [];
    
    // Success Rate Analysis
    if (baseline.success_rate) {
        const change = calculateChange(current.success_rate, baseline.success_rate);
        if (change < -CONFIG.thresholds.successRateRegression * 100) {
            regressions.push({
                metric: 'Success Rate',
                baseline: (baseline.success_rate * 100).toFixed(2) + '%',
                current: (current.success_rate * 100).toFixed(2) + '%',
                change: change.toFixed(2) + '%',
                severity: 'high',
                impact: 'Critical performance degradation detected'
            });
        } else if (change > CONFIG.thresholds.improvementThreshold * 100) {
            improvements.push({
                metric: 'Success Rate',
                baseline: (baseline.success_rate * 100).toFixed(2) + '%',
                current: (current.success_rate * 100).toFixed(2) + '%',
                change: '+' + change.toFixed(2) + '%',
                impact: 'Excellent improvement in trade success'
            });
        }
    }
    
    // Execution Time Analysis
    if (baseline.avg_execution_time_ms) {
        const change = calculateChange(current.avg_execution_time_ms, baseline.avg_execution_time_ms);
        if (change > CONFIG.thresholds.executionTimeRegression * 100) {
            regressions.push({
                metric: 'Execution Time',
                baseline: baseline.avg_execution_time_ms.toFixed(2) + 'ms',
                current: current.avg_execution_time_ms.toFixed(2) + 'ms',
                change: '+' + change.toFixed(2) + '%',
                severity: 'medium',
                impact: 'System response time has degraded'
            });
        } else if (change < -CONFIG.thresholds.improvementThreshold * 100) {
            improvements.push({
                metric: 'Execution Time',
                baseline: baseline.avg_execution_time_ms.toFixed(2) + 'ms',
                current: current.avg_execution_time_ms.toFixed(2) + 'ms',
                change: change.toFixed(2) + '%',
                impact: 'Significant speed improvement'
            });
        }
    }
    
    // Profit Per Trade Analysis
    if (baseline.avg_profit_per_trade) {
        const change = calculateChange(current.avg_profit_per_trade, baseline.avg_profit_per_trade);
        if (change < -CONFIG.thresholds.profitRegression * 100) {
            regressions.push({
                metric: 'Profit Per Trade',
                baseline: '$' + baseline.avg_profit_per_trade.toFixed(2),
                current: '$' + current.avg_profit_per_trade.toFixed(2),
                change: change.toFixed(2) + '%',
                severity: 'high',
                impact: 'Profitability has decreased significantly'
            });
        } else if (change > CONFIG.thresholds.improvementThreshold * 100) {
            improvements.push({
                metric: 'Profit Per Trade',
                baseline: '$' + baseline.avg_profit_per_trade.toFixed(2),
                current: '$' + current.avg_profit_per_trade.toFixed(2),
                change: '+' + change.toFixed(2) + '%',
                impact: 'Higher profitability per trade'
            });
        }
    }
    
    return { regressions, improvements };
}

/**
 * Generate performance comparison report
 */
function generateReport(historicalResults, performanceMetrics) {
    console.log(chalk.cyan('═'.repeat(80)));
    console.log(chalk.cyan.bold('       PERFORMANCE REGRESSION ANALYSIS'));
    console.log(chalk.cyan('═'.repeat(80)));
    console.log();
    
    // Extract current metrics
    const latest = historicalResults[historicalResults.length - 1];
    const baseline = historicalResults[Math.max(0, historicalResults.length - 6)]; // 5 runs ago
    
    console.log(chalk.yellow('📊 Analysis Period:'));
    console.log(chalk.white(`   Baseline: ${new Date(baseline.timestamp).toLocaleString()}`));
    console.log(chalk.white(`   Current:  ${new Date(latest.timestamp).toLocaleString()}`));
    console.log(chalk.white(`   Runs Analyzed: ${historicalResults.length}`));
    console.log();
    
    // Current Performance Overview
    console.log(chalk.yellow('📈 Current Performance Snapshot:'));
    console.log();
    
    const currentMetrics = latest.regression_metrics.performance_baseline;
    
    if (performanceMetrics && performanceMetrics.metrics) {
        const pm = performanceMetrics.metrics;
        
        console.log(chalk.white('  Core Metrics:'));
        console.log(chalk.cyan(`    Success Rate: ${(currentMetrics.success_rate * 100).toFixed(2)}%`));
        console.log(chalk.cyan(`    Avg Profit/Trade: $${currentMetrics.avg_profit_per_trade.toFixed(2)}`));
        console.log(chalk.cyan(`    Avg Execution Time: ${currentMetrics.avg_execution_time_ms.toFixed(2)}ms`));
        console.log(chalk.cyan(`    Execution Rate: ${(currentMetrics.execution_rate * 100).toFixed(2)}%`));
        console.log();
        
        console.log(chalk.white('  Volume Metrics:'));
        console.log(chalk.cyan(`    Total Opportunities: ${pm.totalOpportunities.toLocaleString()}`));
        console.log(chalk.cyan(`    Executed: ${pm.executedOpportunities.toLocaleString()}`));
        console.log(chalk.cyan(`    Successful: ${pm.successfulExecutions.toLocaleString()}`));
        console.log(chalk.cyan(`    Failed: ${pm.failedExecutions.toLocaleString()}`));
        console.log();
    }
    
    // Historical Trend Analysis
    console.log(chalk.yellow('📉 Historical Trends:'));
    console.log();
    
    const successRates = historicalResults.map(r => r.regression_metrics.performance_baseline.success_rate);
    const executionTimes = historicalResults.map(r => r.regression_metrics.performance_baseline.avg_execution_time_ms);
    const profits = historicalResults.map(r => r.regression_metrics.performance_baseline.avg_profit_per_trade);
    
    const successTrend = calculateTrend(successRates);
    const executionTrend = calculateTrend(executionTimes);
    const profitTrend = calculateTrend(profits);
    
    const getTrendIcon = (trend) => {
        if (trend === 'improving') return chalk.green('↗ Improving');
        if (trend === 'declining') return chalk.red('↘ Declining');
        return chalk.yellow('→ Stable');
    };
    
    console.log(chalk.white(`  Success Rate: ${getTrendIcon(successTrend)}`));
    console.log(chalk.white(`  Execution Speed: ${getTrendIcon(executionTrend === 'declining' ? 'improving' : executionTrend === 'improving' ? 'declining' : 'stable')}`));
    console.log(chalk.white(`  Profitability: ${getTrendIcon(profitTrend)}`));
    console.log();
    
    // Regression Detection
    console.log(chalk.yellow('🔍 Regression Detection:'));
    console.log();
    
    const baselineMetrics = baseline.regression_metrics.performance_baseline;
    const { regressions, improvements } = detectRegressions(currentMetrics, baselineMetrics);
    
    if (regressions.length === 0 && improvements.length === 0) {
        console.log(chalk.green('  ✅ No significant performance changes detected'));
        console.log(chalk.gray('     Performance is stable within expected thresholds'));
    } else {
        // Display Regressions
        if (regressions.length > 0) {
            console.log(chalk.red.bold(`  ⚠️  ${regressions.length} Performance Regression(s) Detected:`));
            console.log();
            
            regressions.forEach((reg, idx) => {
                const severityColor = reg.severity === 'high' ? chalk.red : chalk.yellow;
                console.log(severityColor(`  ${idx + 1}. ${reg.metric}`));
                console.log(chalk.white(`     Baseline: ${reg.baseline}`));
                console.log(chalk.white(`     Current:  ${reg.current}`));
                console.log(chalk.red(`     Change:   ${reg.change}`));
                console.log(chalk.gray(`     Impact:   ${reg.impact}`));
                console.log();
            });
        }
        
        // Display Improvements
        if (improvements.length > 0) {
            console.log(chalk.green.bold(`  ✨ ${improvements.length} Performance Improvement(s) Detected:`));
            console.log();
            
            improvements.forEach((imp, idx) => {
                console.log(chalk.green(`  ${idx + 1}. ${imp.metric}`));
                console.log(chalk.white(`     Baseline: ${imp.baseline}`));
                console.log(chalk.white(`     Current:  ${imp.current}`));
                console.log(chalk.green(`     Change:   ${imp.change}`));
                console.log(chalk.gray(`     Impact:   ${imp.impact}`));
                console.log();
            });
        }
    }
    
    // Test Suite Performance
    console.log(chalk.yellow('🧪 Test Suite Performance:'));
    console.log();
    
    const testChange = calculateChange(
        latest.summary.test_case_pass_rate,
        baseline.summary.test_case_pass_rate
    );
    
    console.log(chalk.white(`  Test Pass Rate: ${(latest.summary.test_case_pass_rate * 100).toFixed(1)}%`));
    console.log(chalk.white(`  Total Tests: ${latest.summary.total_tests}`));
    console.log(chalk.white(`  Passed: ${latest.summary.passed_tests}`));
    console.log(chalk.white(`  Failed: ${latest.summary.failed_tests}`));
    
    if (testChange !== 0) {
        const color = testChange > 0 ? chalk.green : chalk.red;
        console.log(color(`  Change: ${testChange > 0 ? '+' : ''}${testChange.toFixed(2)}%`));
    }
    console.log();
    
    // Recommendations
    console.log(chalk.yellow('💡 Recommendations:'));
    console.log();
    
    if (regressions.length > 0) {
        console.log(chalk.white('  Priority Actions:'));
        regressions.forEach((reg, idx) => {
            if (reg.severity === 'high') {
                console.log(chalk.red(`  ${idx + 1}. [HIGH] Address ${reg.metric} regression immediately`));
            } else {
                console.log(chalk.yellow(`  ${idx + 1}. [MEDIUM] Monitor ${reg.metric} for continued degradation`));
            }
        });
        console.log();
        console.log(chalk.white('  General Recommendations:'));
        console.log(chalk.gray('  • Review recent code changes'));
        console.log(chalk.gray('  • Check for resource bottlenecks'));
        console.log(chalk.gray('  • Validate configuration changes'));
        console.log(chalk.gray('  • Run profiler to identify slow paths'));
    } else if (improvements.length > 0) {
        console.log(chalk.green('  ✅ Performance is improving!'));
        console.log(chalk.white('  • Continue monitoring trends'));
        console.log(chalk.white('  • Document successful optimizations'));
        console.log(chalk.white('  • Consider applying similar improvements to other areas'));
    } else {
        console.log(chalk.green('  ✅ Performance is stable'));
        console.log(chalk.white('  • Continue regular monitoring'));
        console.log(chalk.white('  • Look for optimization opportunities'));
    }
    console.log();
    
    // Overall Verdict
    console.log(chalk.cyan('═'.repeat(80)));
    console.log(chalk.cyan.bold('       VERDICT'));
    console.log(chalk.cyan('═'.repeat(80)));
    console.log();
    
    if (regressions.length > 0) {
        const highSeverity = regressions.filter(r => r.severity === 'high').length;
        if (highSeverity > 0) {
            console.log(chalk.red.bold(`  ❌ PERFORMANCE REGRESSION DETECTED (${highSeverity} critical)`));
            console.log(chalk.red('     Recent additions have decreased system performance'));
            console.log(chalk.white('     Action Required: Investigate and resolve regressions'));
        } else {
            console.log(chalk.yellow.bold(`  ⚠️  MINOR PERFORMANCE REGRESSION DETECTED`));
            console.log(chalk.yellow('     Some metrics show degradation'));
            console.log(chalk.white('     Action Required: Monitor closely'));
        }
    } else if (improvements.length > 0) {
        console.log(chalk.green.bold(`  ✅ PERFORMANCE IMPROVED`));
        console.log(chalk.green(`     Recent additions have increased system performance by ${improvements.length} metric(s)`));
        console.log(chalk.white('     Continue current development practices'));
    } else {
        console.log(chalk.green.bold(`  ✅ PERFORMANCE STABLE`));
        console.log(chalk.green('     Recent additions have not negatively impacted performance'));
        console.log(chalk.white('     System is performing within expected parameters'));
    }
    console.log();
    console.log(chalk.cyan('═'.repeat(80)));
    console.log();
    
    // Generate JSON report
    const report = {
        timestamp: new Date().toISOString(),
        analysis_period: {
            baseline: baseline.timestamp,
            current: latest.timestamp,
            runs_analyzed: historicalResults.length
        },
        current_metrics: currentMetrics,
        trends: {
            success_rate: successTrend,
            execution_time: executionTrend,
            profitability: profitTrend
        },
        regressions,
        improvements,
        verdict: regressions.length > 0 
            ? (regressions.filter(r => r.severity === 'high').length > 0 ? 'CRITICAL_REGRESSION' : 'MINOR_REGRESSION')
            : (improvements.length > 0 ? 'IMPROVED' : 'STABLE'),
        test_suite: {
            pass_rate: latest.summary.test_case_pass_rate,
            total: latest.summary.total_tests,
            passed: latest.summary.passed_tests,
            failed: latest.summary.failed_tests
        }
    };
    
    // Save report
    fs.writeFileSync(CONFIG.outputFile, JSON.stringify(report, null, 2));
    console.log(chalk.gray(`Report saved to: ${CONFIG.outputFile}`));
    console.log();
    
    // Exit with appropriate code
    const exitCode = regressions.filter(r => r.severity === 'high').length > 0 ? 1 : 0;
    return exitCode;
}

/**
 * Main execution
 */
async function main() {
    try {
        console.log();
        console.log(chalk.bold.cyan('Starting Performance Regression Analysis...'));
        console.log();
        
        // Load data
        const historicalResults = loadHistoricalResults();
        const performanceMetrics = loadPerformanceMetrics();
        
        if (historicalResults.length === 0) {
            console.log(chalk.red('❌ No historical test results found'));
            console.log(chalk.yellow('   Run: yarn test:regression'));
            process.exit(1);
        }
        
        if (historicalResults.length < 2) {
            console.log(chalk.yellow('⚠️  Only one test result available'));
            console.log(chalk.yellow('   Run more tests to establish baseline for comparison'));
            console.log(chalk.gray('   Run: yarn test:regression'));
            process.exit(0);
        }
        
        // Generate report
        const exitCode = generateReport(historicalResults, performanceMetrics);
        
        process.exit(exitCode);
        
    } catch (error) {
        console.error(chalk.red('\n❌ Analysis failed:'), error);
        process.exit(1);
    }
}

// Run analysis
main();
