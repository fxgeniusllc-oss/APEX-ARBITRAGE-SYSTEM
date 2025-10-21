#!/usr/bin/env node
/**
 * Terminal Display Demo
 * Demonstrates the comprehensive terminal display with simulated data
 */

const { TerminalDisplay } = require('./src/utils/terminalDisplay.js');

async function runDemo() {
    console.log('🚀 Starting APEX Terminal Display Demo...\n');
    
    // Initialize display
    const display = new TerminalDisplay({
        refreshInterval: 3000,
        maxRecentActivities: 10,
        maxRouteDisplay: 5,
        showDetailedMetrics: true
    });
    
    // Wait for chalk to load
    await display._initializeChalk();
    
    // Initialize system status
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
    
    // Add chain status
    display.updateChainStatus('polygon', {
        connected: true,
        blockNumber: 45123456,
        opportunities: 15
    });
    
    display.updateChainStatus('ethereum', {
        connected: true,
        blockNumber: 18234567,
        opportunities: 8
    });
    
    display.updateChainStatus('arbitrum', {
        connected: true,
        blockNumber: 135234567,
        opportunities: 12
    });
    
    // Simulate activity over time
    let scanCount = 0;
    let execCount = 0;
    let totalProfit = 0;
    
    const simulateActivity = () => {
        scanCount++;
        
        // Add scan activity
        display.addActivity({
            type: 'scan',
            message: `Scan #${scanCount} completed`,
            details: `Found ${Math.floor(Math.random() * 10) + 1} opportunities`
        });
        
        // Randomly generate opportunities
        if (Math.random() > 0.3) {
            const routes = [
                { id: 'quickswap_sushiswap_2hop', tokens: ['USDC', 'USDT', 'USDC'], profit: 8.5 + Math.random() * 10 },
                { id: 'uniswapv3_balancer_3hop', tokens: ['WMATIC', 'USDC', 'WETH', 'WMATIC'], profit: 12.3 + Math.random() * 15 },
                { id: 'curve_quickswap_2hop', tokens: ['DAI', 'USDC', 'DAI'], profit: 5.2 + Math.random() * 8 },
                { id: 'sushiswap_uniswapv3_4hop', tokens: ['WETH', 'USDC', 'USDT', 'DAI', 'WETH'], profit: 15.7 + Math.random() * 20 }
            ];
            
            const route = routes[Math.floor(Math.random() * routes.length)];
            
            display.addOpportunity({
                id: route.id,
                routeId: route.id,
                profitUsd: route.profit,
                confidenceScore: 0.75 + Math.random() * 0.2,
                chain: ['polygon', 'ethereum', 'arbitrum'][Math.floor(Math.random() * 3)]
            });
            
            display.addActivity({
                type: 'opportunity',
                message: `Opportunity detected: ${route.id}`,
                details: `Profit: $${route.profit.toFixed(2)}`
            });
            
            // Randomly execute opportunities
            if (Math.random() > 0.4) {
                execCount++;
                const success = Math.random() > 0.15; // 85% success rate
                
                if (success) {
                    totalProfit += route.profit;
                    display.addActivity({
                        type: 'success',
                        message: `Execution #${execCount} successful`,
                        details: `Profit: $${route.profit.toFixed(2)} | Route: ${route.id}`
                    });
                    
                    display.updateRoutePerformance(route.id, {
                        attempts: 1,
                        success: true,
                        profit: route.profit,
                        description: route.tokens.join(' → ')
                    });
                } else {
                    display.addActivity({
                        type: 'failure',
                        message: `Execution #${execCount} failed`,
                        details: `Route: ${route.id} - Transaction reverted`
                    });
                    
                    display.updateRoutePerformance(route.id, {
                        attempts: 1,
                        success: false,
                        profit: 0,
                        description: route.tokens.join(' → ')
                    });
                }
                
                // Remove executed opportunity
                display.removeOpportunity(route.id);
            }
        }
        
        // Update execution stats
        display.updateExecutionStats({
            totalScans: scanCount,
            totalOpportunities: scanCount * 3,
            simulatedExecutions: execCount,
            successfulExecutions: Math.floor(execCount * 0.85),
            failedExecutions: Math.ceil(execCount * 0.15),
            simulatedProfit: totalProfit,
            totalGasCost: execCount * 1.5,
            consecutiveFailures: Math.random() > 0.8 ? Math.floor(Math.random() * 3) : 0
        });
        
        // Update market conditions
        display.updateMarketConditions({
            gasPrice: 30 + Math.random() * 50,
            maxGasPrice: 100,
            networkCongestion: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
            prices: {
                MATIC: 0.80 + Math.random() * 0.15,
                ETH: 2400 + Math.random() * 150,
                USDC: 1.0,
                BTC: 42000 + Math.random() * 2000
            }
        });
        
        // Update ML engine status
        display.updateMLEngineStatus({
            active: true,
            inferenceTime: 10 + Math.random() * 15,
            accuracy: 0.82 + Math.random() * 0.1,
            modelType: Math.random() > 0.5 ? 'ONNX' : 'XGBoost',
            lastPrediction: Date.now()
        });
    };
    
    // Initial render
    await display.render();
    
    // Add initial activities
    display.addActivity({
        type: 'success',
        message: 'APEX System initialized',
        details: 'All components online'
    });
    
    display.addActivity({
        type: 'info',
        message: 'Multi-chain providers connected',
        details: '3 chains active'
    });
    
    // Simulate activity every 2 seconds
    const activityInterval = setInterval(simulateActivity, 2000);
    
    // Render every 3 seconds
    const renderInterval = setInterval(async () => {
        await display.render();
    }, 3000);
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
        console.log('\n\n🛑 Stopping demo...');
        clearInterval(activityInterval);
        clearInterval(renderInterval);
        console.log('✅ Demo stopped');
        process.exit(0);
    });
    
    console.log('💡 Demo running... Press Ctrl+C to stop\n');
}

runDemo().catch(error => {
    console.error('Error running demo:', error);
    process.exit(1);
});
