# Performance Regression Testing

## Overview

The APEX Arbitrage System includes a comprehensive performance regression testing framework to determine if recent code additions have increased or decreased system performance.

## Quick Start

### Run Performance Regression Analysis

```bash
# Run the performance regression analysis
yarn test:performance-regression

# Or using node directly
node scripts/performance-regression-analysis.js
```

## What It Tests

The performance regression analysis compares current performance against historical baselines across multiple dimensions:

### Core Performance Metrics

1. **Success Rate** - Percentage of successful trade executions
   - Baseline Target: 95%+
   - Regression Threshold: 5% decrease
   - Improvement Threshold: 10% increase

2. **Execution Time** - Average time to execute a trade
   - Baseline Target: <300ms
   - Regression Threshold: 10% increase
   - Improvement Threshold: 10% decrease

3. **Profit Per Trade** - Average profit generated per executed trade
   - Baseline Target: $40+
   - Regression Threshold: 10% decrease
   - Improvement Threshold: 10% increase

4. **Execution Rate** - Percentage of opportunities that are executed
   - Indicates filtering effectiveness

### Historical Trend Analysis

The system analyzes trends across multiple test runs:
- **Improving** ↗ - Metric is consistently getting better
- **Stable** → - Metric remains within expected range
- **Declining** ↘ - Metric is consistently getting worse

## How It Works

### 1. Data Collection

The system uses historical test results from:
- `data/test-results/regression-test-results-*.json` - Test suite results
- `data/performance/performance_metrics.json` - Live performance data

### 2. Comparison

Compares the latest test run against baseline (typically 5 runs ago) to detect:
- **Regressions**: Performance degradations beyond threshold
- **Improvements**: Performance gains beyond threshold
- **Stability**: Changes within acceptable variance

### 3. Reporting

Generates comprehensive reports showing:
- Current performance snapshot
- Historical trends
- Detected regressions/improvements
- Actionable recommendations
- Overall verdict

## Interpreting Results

### Verdict Types

#### ✅ PERFORMANCE STABLE
- No significant regressions detected
- Recent additions haven't negatively impacted performance
- System performing within expected parameters
- **Action**: Continue current development practices

#### ✨ PERFORMANCE IMPROVED
- One or more metrics show significant improvement
- Recent additions have enhanced system performance
- **Action**: Document successful optimizations, apply learnings elsewhere

#### ⚠️ MINOR PERFORMANCE REGRESSION
- Some metrics show degradation within medium severity
- Recent changes may need optimization
- **Action**: Monitor closely, investigate if trend continues

#### ❌ CRITICAL PERFORMANCE REGRESSION
- One or more metrics show high-severity degradation
- Recent changes have significantly impacted performance
- **Action**: Immediate investigation and resolution required

### Regression Severity Levels

- **High**: Core functionality significantly impacted (Success Rate, Profitability)
- **Medium**: Performance characteristics degraded (Execution Time)
- **Low**: Minor variations within acceptable range

## Sample Output

```
════════════════════════════════════════════════════════════════════════════════
       PERFORMANCE REGRESSION ANALYSIS
════════════════════════════════════════════════════════════════════════════════

📊 Analysis Period:
   Baseline: 10/22/2025, 12:59:42 AM
   Current:  10/22/2025, 1:04:53 AM
   Runs Analyzed: 6

📈 Current Performance Snapshot:

  Core Metrics:
    Success Rate: 80.57%
    Avg Profit/Trade: $40.94
    Avg Execution Time: 201.22ms
    Execution Rate: 8.12%

  Volume Metrics:
    Total Opportunities: 50,000
    Executed: 4,060
    Successful: 3,271
    Failed: 789

📉 Historical Trends:

  Success Rate: → Stable
  Execution Speed: → Stable
  Profitability: → Stable

🔍 Regression Detection:

  ✅ No significant performance changes detected

════════════════════════════════════════════════════════════════════════════════
       VERDICT
════════════════════════════════════════════════════════════════════════════════

  ✅ PERFORMANCE STABLE
     Recent additions have not negatively impacted performance
```

## Integration with CI/CD

The performance regression test can be integrated into CI/CD pipelines:

### GitHub Actions Example

```yaml
- name: Run Performance Regression Tests
  run: yarn test:performance-regression
  
- name: Upload Performance Report
  uses: actions/upload-artifact@v3
  with:
    name: performance-report
    path: data/test-results/performance-regression-report.json
```

### Exit Codes

- `0` - No critical regressions detected (stable or improved)
- `1` - Critical (high-severity) regression detected

## Generating Test Data

To establish a baseline and generate historical data:

```bash
# Run regression tests multiple times to build history
yarn test:regression
# Wait a few minutes
yarn test:regression
# Repeat 3-5 times to establish baseline

# Then run performance analysis
yarn test:performance-regression
```

## Configuration

Edit thresholds in `scripts/performance-regression-analysis.js`:

```javascript
const CONFIG = {
    thresholds: {
        successRateRegression: 0.05,      // 5% drop is a regression
        executionTimeRegression: 0.10,    // 10% increase is a regression
        profitRegression: 0.10,           // 10% drop is a regression
        improvementThreshold: 0.10        // 10% improvement is noteworthy
    }
};
```

## Best Practices

1. **Run Regularly**: Execute regression tests after significant changes
2. **Build History**: Maintain at least 5-10 historical test runs
3. **Monitor Trends**: Pay attention to declining trends even if not yet regressions
4. **Act on Regressions**: Address high-severity regressions immediately
5. **Document Changes**: Note what changed between baseline and current
6. **Celebrate Wins**: Document and share successful optimizations

## Related Commands

```bash
# Run full regression test suite
yarn test:regression

# Validate ML performance
yarn validate:performance

# Run comprehensive benchmarks
yarn benchmark:analysis

# Complete deployment audit
yarn audit:full
```

## Troubleshooting

### "No historical test results found"

**Solution**: Run `yarn test:regression` to generate initial data

### "Only one test result available"

**Solution**: Run `yarn test:regression` multiple times to establish baseline

### Inconsistent Results

**Causes**:
- System resource contention
- Network variability
- External dependencies

**Solution**: Run multiple tests and average results

## Files Generated

- `data/test-results/regression-test-results-*.json` - Individual test runs
- `data/test-results/latest-regression-results.json` - Most recent run
- `data/test-results/performance-regression-report.json` - Analysis report
- `data/performance/performance_metrics.json` - Live performance data

## Support

For issues or questions about performance regression testing:
- Review this documentation
- Check existing test results in `data/test-results/`
- See [DOCUMENTATION.md](DOCUMENTATION.md) for complete system docs
- See [OPERATIONS-GUIDE.md](OPERATIONS-GUIDE.md) for operational procedures
