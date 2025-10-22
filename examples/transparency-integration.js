import { ethers } from 'ethers';
import chalk from 'chalk';
import { transparencyLogger } from '../src/utils/transparency-logger.js';
import { logExecutionWithTransparency } from '../src/utils/database.js';

/**
 * APEX System Integration Example
 * 
 * This example shows how to integrate the Transaction Transparency
 * module into the existing APEX arbitrage system for complete
 * transaction visibility and auditability.
 */

// Initialize providers for transparency monitoring
const providers = {
    1: new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL || 'https://eth.llamarpc.com'),
    137: new ethers.JsonRpcProvider(process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com'),
    56: new ethers.JsonRpcProvider(process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org')
};

transparencyLogger.setProviders(providers);

console.log(chalk.bold.cyan('\n🔍 APEX Transaction Transparency Integration Example\n'));

/**
 * Example 1: Logging an Arbitrage Execution
 */
async function executeArbitrageWithTransparency() {
    console.log(chalk.bold('Example 1: Arbitrage Execution with Transparency\n'));

    // Simulate arbitrage execution
    const execution = {
        timestamp: Date.now(),
        routeId: 'quickswap_sushiswap_2hop',
        chain: 137, // Polygon
        tokens: ['USDC', 'USDT', 'USDC'],
        dexes: ['quickswap', 'sushiswap'],
        inputAmount: 1000,
        outputAmount: 1012,
        profitUsd: 12,
        gasUsed: 350000,
        gasPriceGwei: 35,
        status: 'success',
        txHash: '0x' + Array(64).fill('0').map(() => Math.floor(Math.random() * 16).toString(16)).join(''),
        mlConfidence: 0.87,
        executionTimeMs: 1234
    };

    // Simulate transaction object
    const tx = {
        hash: execution.txHash,
        from: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
        to: '0xContractAddress123456789012345678901234567890',
        value: ethers.parseEther('0'),
        gasLimit: BigInt(execution.gasUsed),
        gasPrice: ethers.parseUnits(execution.gasPriceGwei.toString(), 'gwei'),
        nonce: 42,
        data: '0xa9059cbb', // transfer function
        type: 2
    };

    // Log with transparency
    console.log(chalk.cyan('   📝 Recording transaction with transparency...'));
    transparencyLogger.logTransaction(
        tx,
        execution.chain,
        `Arbitrage: ${execution.tokens.join('→')} via ${execution.dexes.join(' & ')}`
    );

    // Also log to execution database with transparency
    logExecutionWithTransparency(execution, tx);

    console.log(chalk.green('   ✅ Transaction logged successfully'));
    console.log(chalk.dim(`   TX Hash: ${execution.txHash}`));
    console.log(chalk.dim(`   Profit: $${execution.profitUsd}`));
    console.log();

    // Simulate receipt after block inclusion
    console.log(chalk.cyan('   ⏳ Waiting for transaction confirmation...'));
    
    setTimeout(() => {
        const receipt = {
            status: 1,
            blockNumber: 45678901,
            blockHash: '0xblock' + Array(58).fill('0').join(''),
            gasUsed: BigInt(execution.gasUsed),
            effectiveGasPrice: ethers.parseUnits(execution.gasPriceGwei.toString(), 'gwei'),
            cumulativeGasUsed: BigInt(8234567),
            logs: [
                {
                    index: 0,
                    address: '0xUSDC_Address_1234567890123456789012345',
                    topics: ['0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'],
                    data: '0x0000000000000000000000000000000000000000000000000000000000000001',
                    blockNumber: 45678901,
                    transactionIndex: 42
                }
            ],
            confirmations: 1
        };

        transparencyLogger.updateReceipt(execution.txHash, receipt, execution.chain);
        console.log(chalk.green('   ✅ Transaction confirmed in block 45678901\n'));

        // Display full transaction report
        transparencyLogger.displayTransactionSummary(execution.txHash);

        // Show updated statistics
        console.log(chalk.bold('Updated System Statistics:\n'));
        transparencyLogger.displayStatistics();
    }, 1000);
}

/**
 * Example 2: Monitoring Multiple Chains
 */
function monitorMultiChain() {
    console.log(chalk.bold('Example 2: Multi-Chain Monitoring\n'));

    const chains = [
        { id: 1, name: 'Ethereum' },
        { id: 137, name: 'Polygon' },
        { id: 56, name: 'BSC' }
    ];

    chains.forEach(chain => {
        const stats = transparencyLogger.getChainStats(chain.id);
        if (stats) {
            console.log(chalk.cyan(`   ${chain.name}:`));
            console.log(chalk.white(`     Total TX: ${stats.total_transactions}`));
            console.log(chalk.green(`     Success: ${stats.successful_transactions}`));
            console.log(chalk.red(`     Failed: ${stats.failed_transactions}`));
            console.log(chalk.yellow(`     Pending: ${stats.pending_transactions}`));
            console.log();
        } else {
            console.log(chalk.dim(`   ${chain.name}: No transactions yet\n`));
        }
    });
}

/**
 * Example 3: Export Audit Report
 */
function exportAuditReport() {
    console.log(chalk.bold('Example 3: Exporting Audit Report\n'));

    const filters = {
        chainId: 137,
        status: 'confirmed',
        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Last 24 hours
        endDate: new Date().toISOString()
    };

    const auditData = transparencyLogger.exportAuditData(filters);

    console.log(chalk.cyan('   📤 Audit Report Generated:'));
    console.log(chalk.white(`     Time Range: ${filters.startDate.split('T')[0]} to ${filters.endDate.split('T')[0]}`));
    console.log(chalk.white(`     Chain: Polygon (137)`));
    console.log(chalk.white(`     Status: Confirmed`));
    console.log(chalk.white(`     Total Transactions: ${auditData.transactionCount}`));
    console.log();

    if (auditData.transactionCount > 0) {
        console.log(chalk.dim('   Sample transactions:'));
        auditData.transactions.slice(0, 3).forEach((tx, i) => {
            console.log(chalk.dim(`   ${i + 1}. ${tx.hash.substring(0, 20)}... | ${tx.value} | ${tx.status}`));
        });
        console.log();
    }
}

/**
 * Example 4: Real-time Dashboard
 */
function showDashboard() {
    console.log(chalk.bold('Example 4: Real-time Transparency Dashboard\n'));
    
    // This would typically be called periodically
    transparencyLogger.displayStatistics();
}

/**
 * Example 5: Address-Specific Tracking
 */
function trackAddress() {
    console.log(chalk.bold('Example 5: Address-Specific Transaction Tracking\n'));

    const address = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0';
    
    console.log(chalk.cyan(`   Tracking address: ${address}\n`));

    const history = transparencyLogger.getHistory({
        fromAddress: address,
        limit: 5
    });

    if (history.length > 0) {
        console.log(chalk.white(`   Found ${history.length} transaction(s):\n`));
        history.forEach((tx, i) => {
            console.log(chalk.white(`   ${i + 1}. ${tx.tx_hash.substring(0, 20)}...`));
            console.log(chalk.dim(`      Chain: ${tx.chain_name}`));
            console.log(chalk.dim(`      Status: ${tx.status}`));
            console.log(chalk.dim(`      Value: ${tx.value_formatted}`));
            console.log(chalk.dim(`      Time: ${new Date(tx.created_at).toLocaleString()}`));
            console.log();
        });
    } else {
        console.log(chalk.yellow('   No transactions found for this address\n'));
    }
}

// Run examples
async function main() {
    try {
        await executeArbitrageWithTransparency();
        
        setTimeout(() => {
            monitorMultiChain();
            exportAuditReport();
            showDashboard();
            trackAddress();

            console.log(chalk.bold.green('\n✅ All examples completed successfully\n'));
            console.log(chalk.cyan('Integration Benefits:'));
            console.log(chalk.white('  ✓ Complete transaction transparency'));
            console.log(chalk.white('  ✓ Real-time monitoring across chains'));
            console.log(chalk.white('  ✓ Automatic audit trail generation'));
            console.log(chalk.white('  ✓ Gas optimization insights'));
            console.log(chalk.white('  ✓ Compliance-ready reporting'));
            console.log(chalk.white('  ✓ Block explorer integration'));
            console.log();

            console.log(chalk.dim('💡 Tip: Use transparencyLogger.displayStatistics() to view dashboard anytime'));
            console.log(chalk.dim('💡 Tip: Export audit data regularly for compliance'));
            console.log();

            process.exit(0);
        }, 2000);

    } catch (error) {
        console.error(chalk.red('\n❌ Error:'), error.message);
        process.exit(1);
    }
}

main();
