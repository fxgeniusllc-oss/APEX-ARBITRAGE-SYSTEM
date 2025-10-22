# Terminal Display System

## Overview

The APEX Arbitrage System now features a comprehensive real-time terminal display that provides detailed monitoring and visualization of system activity directly in your command line interface. This modernized dashboard delivers instant insights into all aspects of the arbitrage system without requiring additional tools.

## Features

### 📊 Comprehensive Monitoring Sections

1. **System Status**
   - Execution mode (LIVE/DEV/SIM) with color coding
   - Component status (Rust Engine, Python Orchestrator, Node.js Coordinator, ML Engine, WebSocket)
   - System uptime
   - Visual status indicators (● Online / ○ Offline)

2. **Execution Statistics**
   - Total scans and opportunities found
   - Real vs. simulated execution counts
   - Success rate tracking
   - Profit/loss metrics (real or simulated)
   - Gas cost tracking
   - Net P/L calculation
   - Consecutive failure monitoring

3. **Active Opportunities**
   - Real-time list of detected profitable opportunities
   - Route details with profit estimates
   - Confidence scores
   - Chain identification
   - Age tracking (time since detection)

4. **Top Performing Routes**
   - Historical route performance metrics
   - Success rate per route
   - Total and average profit per route
   - Attempt counts
   - Automatic sorting by profitability

5. **Recent Activity Log**
   - Chronological activity feed
   - Activity types: Scans, Opportunities, Executions, Successes, Failures, Warnings, Errors
   - Timestamped entries
   - Detailed activity messages

6. **Market Conditions**
   - Real-time gas price monitoring
   - Network congestion indicators
   - Token price tracking (MATIC, ETH, USDC, BTC, etc.)
   - Gas price status (Optimal ✓ / Acceptable / Too High ✗)

7. **ML/AI Engine Status** (when active)
   - Model type (ONNX, XGBoost, PyTorch)
   - Inference time performance
   - Model accuracy metrics
   - Last prediction timestamp

8. **Multi-Chain Status**
   - Connection status per chain
   - Current block numbers
   - Opportunities found per chain
   - Support for Polygon, Ethereum, Arbitrum, Optimism, Base, BSC

## Installation & Setup

The terminal display module is included with the APEX system. No additional installation required.

### Dependencies

The following packages are already included in `package.json`:

```json
{
  "chalk": "^5.3.0",      // Terminal colors
  "cli-table3": "^0.6.5",  // Table formatting
  "moment": "^2.30.1"      // Time formatting
}
```

## Usage

### Basic Usage in Main System

The terminal display is automatically integrated into the main APEX system (`src/index.js`). When you start the system, it will display the comprehensive dashboard:

```bash
yarn start
```

### Standalone Demo

To see the terminal display in action with simulated data:

```bash
node demo-terminal-display.js
```

This demo shows:
- Simulated scans and opportunity detection
- Execution results (success/failure)
- Route performance tracking
- Market condition changes
- ML engine activity
- Multi-chain status updates

Press `Ctrl+C` to stop the demo.

### Programmatic Usage

You can integrate the terminal display into your own scripts:

```javascript
const { TerminalDisplay } = require('./src/utils/terminalDisplay.js');

// Create display instance
const display = new TerminalDisplay({
    refreshInterval: 5000,      // Update every 5 seconds
    maxRecentActivities: 10,    // Show last 10 activities
    maxRouteDisplay: 5,         // Show top 5 routes
    showDetailedMetrics: true,  // Include all metrics
    colorTheme: 'default'       // 'default', 'minimal', or 'high-contrast'
});

// Wait for initialization (chalk loading)
await display._initializeChalk();

// Update system status
display.updateSystemStatus({
    mode: 'DEV',
    componentsStatus: {
        rustEngine: true,
        pythonOrchestrator: true,
        nodeCoordinator: true,
        mlEngine: true,
        websocket: false
    }
});

// Update execution statistics
display.updateExecutionStats({
    totalScans: 100,
    totalOpportunities: 50,
    simulatedExecutions: 25,
    successfulExecutions: 23,
    totalProfit: 150.50,
    totalGasCost: 37.50,
    consecutiveFailures: 0
});

// Add an opportunity
display.addOpportunity({
    id: 'quickswap_sushiswap',
    routeId: 'quickswap_sushiswap',
    profitUsd: 12.5,
    confidenceScore: 0.85,
    chain: 'polygon'
});

// Update route performance
display.updateRoutePerformance('quickswap_sushiswap', {
    attempts: 1,
    success: true,
    profit: 12.5,
    description: 'USDC → USDT → USDC'
});

// Add activity log entry
display.addActivity({
    type: 'success',  // 'scan', 'opportunity', 'execution', 'success', 'failure', 'warning', 'info', 'error'
    message: 'Execution successful',
    details: 'Profit: $12.50'
});

// Update market conditions
display.updateMarketConditions({
    gasPrice: 45.5,
    maxGasPrice: 100,
    networkCongestion: 'low',  // 'low', 'medium', 'high'
    prices: {
        MATIC: 0.847,
        ETH: 2450.32,
        USDC: 1.0
    }
});

// Update ML engine status
display.updateMLEngineStatus({
    active: true,
    inferenceTime: 15.5,
    accuracy: 0.88,
    modelType: 'ONNX',
    lastPrediction: Date.now()
});

// Update chain status
display.updateChainStatus('polygon', {
    connected: true,
    blockNumber: 45123456,
    opportunities: 10
});

// Render display
await display.render();

// Or start auto-refresh
await display.startAutoRefresh();

// Stop auto-refresh when done
display.stopAutoRefresh();
```

## Configuration Options

### Display Configuration

```javascript
{
    refreshInterval: 5000,          // Auto-refresh interval in milliseconds
    maxRecentActivities: 10,        // Maximum activities to show in log
    maxRouteDisplay: 5,             // Maximum routes to show in performance section
    showDetailedMetrics: true,      // Include all detailed metrics
    colorTheme: 'default'           // Color theme: 'default', 'minimal', 'high-contrast'
}
```

### Color Themes

**Default Theme**: Full color with visual indicators
- Green for success/profit
- Yellow for warnings
- Red for errors/losses
- Blue for information
- Cyan for headers

**Minimal Theme**: Reduced color palette
- Primarily white/gray text
- Bold for emphasis
- Suitable for terminals with limited color support

**High-Contrast Theme**: Maximum visibility
- Background colors for key elements
- Inverse colors for highlights
- Optimal for accessibility

## API Reference

### TerminalDisplay Class

#### Constructor
```javascript
new TerminalDisplay(config)
```

#### Methods

**updateSystemStatus(status)**
```javascript
display.updateSystemStatus({
    mode: 'DEV',
    componentsStatus: { ... }
});
```

**updateExecutionStats(stats)**
```javascript
display.updateExecutionStats({
    totalScans: 100,
    totalOpportunities: 50,
    // ... more stats
});
```

**addOpportunity(opportunity)**
```javascript
display.addOpportunity({
    id: 'route_id',
    routeId: 'quickswap_sushiswap',
    profitUsd: 12.5,
    confidenceScore: 0.85,
    chain: 'polygon'
});
```

**removeOpportunity(opportunityId)**
```javascript
display.removeOpportunity('route_id');
```

**updateRoutePerformance(routeId, performance)**
```javascript
display.updateRoutePerformance('quickswap_sushiswap', {
    attempts: 1,
    success: true,
    profit: 12.5,
    description: 'USDC → USDT → USDC'
});
```

**addActivity(activity)**
```javascript
display.addActivity({
    type: 'success',  // Type of activity
    message: 'Short message',
    details: 'Additional details'
});
```

Activity types:
- `scan` - Scanning activity
- `opportunity` - Opportunity detected
- `execution` - Execution attempt
- `success` - Successful execution
- `failure` - Failed execution
- `warning` - Warning message
- `info` - Informational message
- `error` - Error message

**updateMarketConditions(conditions)**
```javascript
display.updateMarketConditions({
    gasPrice: 45.5,
    maxGasPrice: 100,
    networkCongestion: 'low',
    prices: { MATIC: 0.847, ETH: 2450.32 }
});
```

**updateMLEngineStatus(status)**
```javascript
display.updateMLEngineStatus({
    active: true,
    inferenceTime: 15.5,
    accuracy: 0.88,
    modelType: 'ONNX',
    lastPrediction: Date.now()
});
```

**updateChainStatus(chain, status)**
```javascript
display.updateChainStatus('polygon', {
    connected: true,
    blockNumber: 45123456,
    opportunities: 10
});
```

**render()**
```javascript
await display.render();
```
Renders the complete terminal display once.

**startAutoRefresh()**
```javascript
await display.startAutoRefresh();
```
Starts automatic display refresh based on `refreshInterval`.

**stopAutoRefresh()**
```javascript
display.stopAutoRefresh();
```
Stops automatic display refresh.

## Integration with APEX System

The terminal display is fully integrated into the main APEX system. It automatically updates based on:

1. **System Events**
   - Chain connections/disconnections
   - Component status changes
   - Mode switches (LIVE/DEV/SIM)

2. **Execution Events**
   - Opportunity detection
   - Execution attempts
   - Success/failure results
   - Profit/loss calculations

3. **Market Events**
   - Gas price changes
   - Token price updates
   - Network congestion

4. **ML Engine Events**
   - Model predictions
   - Performance metrics
   - Model switching (ONNX/XGBoost/PyTorch)

## Performance Considerations

- **Minimal Overhead**: Display updates are lightweight and don't impact system performance
- **Efficient Rendering**: Only re-renders when data changes
- **Configurable Refresh**: Adjust refresh interval based on your needs (default: 5 seconds)
- **Activity Limiting**: Automatically limits stored activities to prevent memory growth

## Troubleshooting

### Display Not Updating

If the display isn't updating:
1. Check that `startAutoRefresh()` was called
2. Verify the refresh interval is appropriate
3. Ensure data is being updated via the update methods

### Colors Not Showing

If colors aren't displaying:
1. Verify your terminal supports color (most modern terminals do)
2. Try a different color theme: `colorTheme: 'minimal'`
3. Check that chalk loaded properly (wait for `_initializeChalk()`)

### Layout Issues

If the display layout is broken:
1. Ensure terminal width is at least 90 characters
2. Check terminal supports UTF-8 characters
3. Try resizing terminal window

## Testing

Run the terminal display tests:

```bash
# Run all tests
yarn test

# Run specific test
node --test tests/terminal-display.test.js
```

Tests cover:
- Initialization and configuration
- Data updates (system status, stats, opportunities, etc.)
- Activity logging
- Route performance tracking
- Market conditions
- ML engine status
- Chain status
- Rendering
- Auto-refresh

## Examples

### Example 1: Basic Integration

```javascript
const { TerminalDisplay } = require('./src/utils/terminalDisplay.js');

async function main() {
    const display = new TerminalDisplay();
    await display._initializeChalk();
    
    // Update and render
    display.updateSystemStatus({ mode: 'DEV' });
    await display.render();
}

main();
```

### Example 2: With Auto-Refresh

```javascript
const { TerminalDisplay } = require('./src/utils/terminalDisplay.js');

async function main() {
    const display = new TerminalDisplay({ refreshInterval: 3000 });
    await display._initializeChalk();
    
    // Start auto-refresh
    await display.startAutoRefresh();
    
    // Update data periodically
    setInterval(() => {
        display.updateExecutionStats({
            totalScans: Math.floor(Math.random() * 1000)
        });
    }, 1000);
    
    // Handle shutdown
    process.on('SIGINT', () => {
        display.stopAutoRefresh();
        process.exit(0);
    });
}

main();
```

### Example 3: Tracking Opportunities

```javascript
async function trackOpportunity(display, route) {
    // Add opportunity
    display.addOpportunity({
        id: route.id,
        routeId: route.id,
        profitUsd: route.profit,
        confidenceScore: route.confidence,
        chain: route.chain
    });
    
    display.addActivity({
        type: 'opportunity',
        message: `New opportunity: ${route.id}`,
        details: `Profit: $${route.profit.toFixed(2)}`
    });
    
    // Execute (simulated)
    const success = await executeArbitrage(route);
    
    // Update performance
    display.updateRoutePerformance(route.id, {
        attempts: 1,
        success: success,
        profit: success ? route.profit : 0
    });
    
    // Remove from active opportunities
    display.removeOpportunity(route.id);
    
    // Log result
    display.addActivity({
        type: success ? 'success' : 'failure',
        message: success ? 'Execution successful' : 'Execution failed',
        details: `Route: ${route.id}`
    });
}
```

## Best Practices

1. **Update Frequency**: Balance update frequency with readability. Default 5 seconds is optimal.

2. **Activity Logging**: Log meaningful activities only. Avoid flooding the log with redundant information.

3. **Color Usage**: Use appropriate color theme for your terminal and viewing conditions.

4. **Data Cleanup**: The display automatically limits stored data, but remove stale opportunities promptly.

5. **Error Handling**: Wrap display updates in try-catch blocks in production code.

## Future Enhancements

Potential improvements for future versions:

- [ ] Export display data to CSV/JSON
- [ ] Custom display layouts
- [ ] Notification integration (desktop notifications)
- [ ] Web-based dashboard view
- [ ] Historical data visualization
- [ ] Performance graphs/charts
- [ ] Alert thresholds and triggers
- [ ] Multi-language support

## Support

For issues or questions about the terminal display:

1. Check the troubleshooting section above
2. Review the API reference and examples
3. Run the demo to see expected behavior
4. Check test files for usage examples
5. Open an issue on GitHub with details

## Contributing

To contribute improvements to the terminal display:

1. Review the existing code in `src/utils/terminalDisplay.js`
2. Add tests for new features in `tests/terminal-display.test.js`
3. Update this documentation
4. Submit a pull request

---

**Happy Trading! 🚀💰**
