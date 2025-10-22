#!/usr/bin/env node
/**
 * Regression Test Runner
 * Runs all tests and generates comprehensive regression metrics report
 */

import { spawn } from 'child_process';
import { writeFileSync, existsSync, mkdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '..');

// Test suites to run
const testSuites = [
    {
        name: 'JavaScript Unit Tests',
        command: 'node',
        args: ['--test', 'tests/omni-ai-engine.test.js', 'tests/comprehensive-rust-tests.test.js', 'tests/rust-engine.test.js', 'tests/database.test.js'],
        type: 'js'
    },
    {
        name: 'Python ML Enhancement Tests',
        command: 'python',
        args: ['tests/test_ml_enhancements.py'],
        type: 'python'
    },
    {
        name: 'Python Enhanced ML Tests',
        command: 'python',
        args: ['tests/test_enhanced_ml.py'],
        type: 'python'
    }
];

// Results storage
const results = {
    timestamp: new Date().toISOString(),
    build_version: '2.0.0',
    node_version: process.version,
    test_suites: [],
    summary: {
        total_suites: 0,
        passed_suites: 0,
        failed_suites: 0,
        total_tests: 0,
        passed_tests: 0,
        failed_tests: 0,
        skipped_tests: 0,
        total_duration_ms: 0
    },
    regression_metrics: {
        performance_baseline: {},
        success_rates: {},
        coverage: {}
    }
};

/**
 * Run a test suite
 */
async function runTestSuite(suite) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`Running: ${suite.name}`);
    console.log('='.repeat(70));
    
    const startTime = Date.now();
    
    return new Promise((resolve) => {
        const proc = spawn(suite.command, suite.args, {
            cwd: ROOT_DIR,
            stdio: 'pipe',
            shell: true
        });
        
        let stdout = '';
        let stderr = '';
        
        proc.stdout.on('data', (data) => {
            const text = data.toString();
            stdout += text;
            process.stdout.write(text);
        });
        
        proc.stderr.on('data', (data) => {
            const text = data.toString();
            stderr += text;
            process.stderr.write(text);
        });
        
        proc.on('close', (code) => {
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            // Parse test results
            const testResult = parseTestOutput(suite, stdout, stderr, code, duration);
            results.test_suites.push(testResult);
            
            // Update summary
            results.summary.total_suites++;
            if (testResult.passed) {
                results.summary.passed_suites++;
            } else {
                results.summary.failed_suites++;
            }
            results.summary.total_tests += testResult.tests_total;
            results.summary.passed_tests += testResult.tests_passed;
            results.summary.failed_tests += testResult.tests_failed;
            results.summary.skipped_tests += testResult.tests_skipped;
            results.summary.total_duration_ms += duration;
            
            resolve(testResult);
        });
    });
}

/**
 * Parse test output to extract metrics
 */
function parseTestOutput(suite, stdout, stderr, exitCode, duration) {
    const result = {
        name: suite.name,
        type: suite.type,
        passed: exitCode === 0,
        exit_code: exitCode,
        duration_ms: duration,
        tests_total: 0,
        tests_passed: 0,
        tests_failed: 0,
        tests_skipped: 0,
        output: stdout,
        errors: stderr
    };
    
    // Parse Node test output
    if (suite.type === 'js') {
        // Count "ok" lines that are actual tests (indented with spaces, not suites)
        const okMatches = (stdout.match(/^        ok \d+/gm) || []);
        result.tests_passed = okMatches.length;
        
        // Count "not ok" lines
        const notOkMatches = (stdout.match(/^        not ok \d+/gm) || []);
        result.tests_failed = notOkMatches.length;
        
        result.tests_total = result.tests_passed + result.tests_failed;
    }
    
    // Parse Python unittest output
    if (suite.type === 'python') {
        // Look for "Ran X tests" - check both stdout and stderr
        const combinedOutput = stdout + stderr;
        const ranMatch = combinedOutput.match(/Ran (\d+) test/m);
        if (ranMatch) {
            result.tests_total = parseInt(ranMatch[1]);
            // If exit code is 0, all tests passed
            if (exitCode === 0) {
                result.tests_passed = result.tests_total;
                result.tests_failed = 0;
            } else {
                // Count failures from output
                const failureMatch = combinedOutput.match(/FAILED \(failures=(\d+)\)/);
                const errorMatch = combinedOutput.match(/FAILED \(errors=(\d+)\)/);
                if (failureMatch) {
                    result.tests_failed = parseInt(failureMatch[1]);
                } else if (errorMatch) {
                    result.tests_failed = parseInt(errorMatch[1]);
                }
                result.tests_passed = result.tests_total - result.tests_failed;
            }
        }
    }
    
    return result;
}

/**
 * Generate regression metrics report
 */
function generateRegressionReport() {
    // Load previous performance metrics if available
    const metricsFile = join(ROOT_DIR, 'data/performance/performance_metrics.json');
    let performanceData = null;
    
    if (existsSync(metricsFile)) {
        try {
            const data = readFileSync(metricsFile, 'utf-8');
            performanceData = JSON.parse(data);
        } catch (err) {
            console.error('Error loading performance metrics:', err.message);
        }
    }
    
    // Extract regression metrics
    if (performanceData && performanceData.metrics) {
        results.regression_metrics.performance_baseline = {
            total_opportunities: performanceData.metrics.totalOpportunities || 0,
            execution_rate: performanceData.metrics.executedOpportunities / performanceData.metrics.totalOpportunities || 0,
            success_rate: performanceData.metrics.successfulExecutions / performanceData.metrics.executedOpportunities || 0,
            avg_profit_per_trade: performanceData.metrics.avgProfitPerTrade || 0,
            avg_execution_time_ms: performanceData.metrics.avgExecutionTime || 0,
            avg_opportunity_score: performanceData.metrics.avgOpportunityScore || 0,
            avg_confidence: performanceData.metrics.avgConfidence || 0
        };
    }
    
    // Calculate test coverage metrics
    results.regression_metrics.coverage = {
        total_test_suites: results.summary.total_suites,
        passing_test_suites: results.summary.passed_suites,
        test_suite_pass_rate: results.summary.passed_suites / results.summary.total_suites,
        total_test_cases: results.summary.total_tests,
        passing_test_cases: results.summary.passed_tests,
        test_case_pass_rate: results.summary.passed_tests / results.summary.total_tests
    };
    
    // Calculate success rates
    results.regression_metrics.success_rates = {
        overall_test_success_rate: results.summary.passed_tests / results.summary.total_tests,
        javascript_tests: {
            total: 0,
            passed: 0,
            success_rate: 0
        },
        python_tests: {
            total: 0,
            passed: 0,
            success_rate: 0
        }
    };
    
    // Aggregate by test type
    results.test_suites.forEach(suite => {
        if (suite.type === 'js') {
            results.regression_metrics.success_rates.javascript_tests.total += suite.tests_total;
            results.regression_metrics.success_rates.javascript_tests.passed += suite.tests_passed;
        } else if (suite.type === 'python') {
            results.regression_metrics.success_rates.python_tests.total += suite.tests_total;
            results.regression_metrics.success_rates.python_tests.passed += suite.tests_passed;
        }
    });
    
    if (results.regression_metrics.success_rates.javascript_tests.total > 0) {
        results.regression_metrics.success_rates.javascript_tests.success_rate = 
            results.regression_metrics.success_rates.javascript_tests.passed / 
            results.regression_metrics.success_rates.javascript_tests.total;
    }
    
    if (results.regression_metrics.success_rates.python_tests.total > 0) {
        results.regression_metrics.success_rates.python_tests.success_rate = 
            results.regression_metrics.success_rates.python_tests.passed / 
            results.regression_metrics.success_rates.python_tests.total;
    }
}

/**
 * Save results to file
 */
function saveResults() {
    const outputDir = join(ROOT_DIR, 'data/test-results');
    if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputFile = join(outputDir, `regression-test-results-${timestamp}.json`);
    
    writeFileSync(outputFile, JSON.stringify(results, null, 2));
    console.log(`\n\n${'='.repeat(70)}`);
    console.log(`Test results saved to: ${outputFile}`);
    console.log('='.repeat(70));
    
    // Also save as latest
    const latestFile = join(outputDir, 'latest-regression-results.json');
    writeFileSync(latestFile, JSON.stringify(results, null, 2));
    
    return outputFile;
}

/**
 * Print summary
 */
function printSummary() {
    console.log(`\n\n${'='.repeat(70)}`);
    console.log('REGRESSION TEST SUMMARY');
    console.log('='.repeat(70));
    console.log(`Build Version: ${results.build_version}`);
    console.log(`Node Version: ${results.node_version}`);
    console.log(`Timestamp: ${results.timestamp}`);
    console.log(`\nTest Suites: ${results.summary.passed_suites}/${results.summary.total_suites} passed`);
    console.log(`Test Cases: ${results.summary.passed_tests}/${results.summary.total_tests} passed`);
    console.log(`Duration: ${(results.summary.total_duration_ms / 1000).toFixed(2)}s`);
    
    if (results.regression_metrics.performance_baseline.success_rate) {
        console.log(`\nPerformance Baseline:`);
        console.log(`  Success Rate: ${(results.regression_metrics.performance_baseline.success_rate * 100).toFixed(2)}%`);
        console.log(`  Avg Profit: $${results.regression_metrics.performance_baseline.avg_profit_per_trade.toFixed(2)}`);
        console.log(`  Avg Execution: ${results.regression_metrics.performance_baseline.avg_execution_time_ms.toFixed(2)}ms`);
        console.log(`  Avg Score: ${results.regression_metrics.performance_baseline.avg_opportunity_score.toFixed(2)}`);
    }
    
    console.log(`\nTest Coverage:`);
    console.log(`  Test Suite Pass Rate: ${(results.regression_metrics.coverage.test_suite_pass_rate * 100).toFixed(2)}%`);
    console.log(`  Test Case Pass Rate: ${(results.regression_metrics.coverage.test_case_pass_rate * 100).toFixed(2)}%`);
    
    console.log(`\nSuccess Rates by Language:`);
    console.log(`  JavaScript: ${results.regression_metrics.success_rates.javascript_tests.passed}/${results.regression_metrics.success_rates.javascript_tests.total} (${(results.regression_metrics.success_rates.javascript_tests.success_rate * 100).toFixed(2)}%)`);
    console.log(`  Python: ${results.regression_metrics.success_rates.python_tests.passed}/${results.regression_metrics.success_rates.python_tests.total} (${(results.regression_metrics.success_rates.python_tests.success_rate * 100).toFixed(2)}%)`);
    
    console.log('='.repeat(70));
    
    // Return exit code based on success
    const allPassed = results.summary.failed_tests === 0 && results.summary.failed_suites === 0;
    return allPassed ? 0 : 1;
}

/**
 * Main execution
 */
async function main() {
    console.log('='.repeat(70));
    console.log('APEX ARBITRAGE SYSTEM - REGRESSION TEST RUNNER');
    console.log('='.repeat(70));
    console.log(`Build Version: 2.0.0`);
    console.log(`Node Version: ${process.version}`);
    console.log(`Start Time: ${new Date().toISOString()}`);
    console.log('='.repeat(70));
    
    // Run all test suites
    for (const suite of testSuites) {
        await runTestSuite(suite);
    }
    
    // Generate regression report
    generateRegressionReport();
    
    // Save results
    saveResults();
    
    // Print summary and exit
    const exitCode = printSummary();
    process.exit(exitCode);
}

// Run
main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
