import { ethers } from 'ethers';
import chalk from 'chalk';
import { transparencyLogger } from '../src/utils/transparency-logger.js';
import { 
    getTransactionStatistics, 
    getGasStatistics,
    exportTransactionData 
} from '../src/utils/transaction-transparency.js';

/**
 * APEX Transaction Transparency Demo
 * 
 * This script demonstrates the comprehensive transaction transparency features
 * including transaction tracking, monitoring, and reporting.
 */

async function main() {
    console.log(chalk.bold.cyan('\n🔍 APEX TRANSACTION TRANSPARENCY SYSTEM\n'));
    console.log(chalk.dim('Demonstrating comprehensive blockchain transaction tracking and monitoring\n'));

    // Initialize provider (using a public RPC for demo)
    const provider = new ethers.JsonRpcProvider(
        process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com'
    );

    // Set provider for monitoring
    transparencyLogger.setProviders({
        137: provider  // Polygon
    });

    console.log(chalk.green('✅ Connected to Polygon network\n'));

    // Demo 1: Track a sample transaction
    console.log(chalk.bold('📋 Demo 1: Recording Sample Transactions\n'));

    const sampleTransactions = [
        {
            hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
            from: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
            to: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', // USDT on Polygon
            value: ethers.parseEther('0'),
            gasLimit: BigInt(65000),
            gasPrice: ethers.parseUnits('30', 'gwei'),
            nonce: 123,
            data: '0xa9059cbb0000000000000000000000001234567890123456789012345678901234567890000000000000000000000000000000000000000000000000000000003b9aca00',
            type: 2
        },
        {
            hash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
            from: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
            to: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', // WMATIC
            value: ethers.parseEther('0'),
            gasLimit: BigInt(50000),
            gasPrice: ethers.parseUnits('35', 'gwei'),
            nonce: 124,
            data: '0x',
            type: 2
        }
    ];

    for (const tx of sampleTransactions) {
        const result = transparencyLogger.logTransaction(
            tx, 
            137, 
            'Arbitrage Trade - QuickSwap to SushiSwap'
        );
        console.log(chalk.green(`   ✓ Recorded: ${tx.hash.substring(0, 20)}...`));
        console.log(chalk.dim(`     Explorer: ${result.explorerUrl}\n`));
    }

    // Demo 2: Simulate receipt updates
    console.log(chalk.bold('📥 Demo 2: Updating Transaction Receipts\n'));

    const receipt1 = {
        status: 1,
        blockNumber: 45678901,
        blockHash: '0xblock123456789012345678901234567890123456789012345678901234567890',
        gasUsed: BigInt(52341),
        effectiveGasPrice: ethers.parseUnits('30', 'gwei'),
        cumulativeGasUsed: BigInt(8234567),
        logs: [
            {
                index: 0,
                address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
                topics: [
                    '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
                    '0x000000000000000000000000742d35cc6634c0532925a3b844bc9e7595f0beb0',
                    '0x0000000000000000000000001234567890123456789012345678901234567890'
                ],
                data: '0x000000000000000000000000000000000000000000000000000000003b9aca00',
                blockNumber: 45678901,
                transactionIndex: 42
            }
        ],
        confirmations: 1
    };

    transparencyLogger.updateReceipt(
        sampleTransactions[0].hash,
        receipt1,
        137
    );

    console.log(chalk.green(`   ✓ Updated receipt for transaction 1\n`));

    // Demo 3: Display transaction details
    console.log(chalk.bold('📊 Demo 3: Detailed Transaction Report\n'));
    transparencyLogger.displayTransactionSummary(sampleTransactions[0].hash);

    // Demo 4: Get transaction history
    console.log(chalk.bold('📜 Demo 4: Transaction History\n'));

    const history = transparencyLogger.getHistory({ chainId: 137, limit: 10 });
    console.log(chalk.cyan(`   Found ${history.length} transaction(s) on Polygon:`));
    history.forEach((tx, i) => {
        console.log(chalk.white(`   ${i + 1}. ${tx.tx_hash.substring(0, 20)}... [${tx.status}] ${tx.value_formatted} MATIC`));
    });
    console.log();

    // Demo 5: Statistics Dashboard
    console.log(chalk.bold('📈 Demo 5: Transparency Statistics\n'));
    transparencyLogger.displayStatistics();

    // Demo 6: Gas analytics
    console.log(chalk.bold('⛽ Demo 6: Gas Analytics\n'));

    const gasStats = getGasStatistics();
    if (gasStats.total_transactions > 0) {
        console.log(chalk.white(`   Total Transactions with Gas Data: ${gasStats.total_transactions}`));
        console.log(chalk.white(`   Average Gas Price: ${gasStats.avg_gas_price_gwei?.toFixed(2)} Gwei`));
        console.log(chalk.white(`   Min Gas Price: ${gasStats.min_gas_price_gwei?.toFixed(2)} Gwei`));
        console.log(chalk.white(`   Max Gas Price: ${gasStats.max_gas_price_gwei?.toFixed(2)} Gwei`));
        console.log(chalk.white(`   Total Gas Cost: ${gasStats.total_gas_cost_eth?.toFixed(6)} ETH`));
    } else {
        console.log(chalk.yellow('   No gas data available yet'));
    }
    console.log();

    // Demo 7: Export audit data
    console.log(chalk.bold('📤 Demo 7: Export Audit Data\n'));

    const auditData = transparencyLogger.exportAuditData({
        chainId: 137,
        status: 'confirmed'
    });

    console.log(chalk.cyan(`   Export Details:`));
    console.log(chalk.white(`   - Export Date: ${auditData.exportDate}`));
    console.log(chalk.white(`   - Transactions: ${auditData.transactionCount}`));
    console.log(chalk.white(`   - Chain Filter: Polygon (137)`));
    console.log(chalk.white(`   - Status Filter: confirmed`));
    console.log();

    // Demo 8: Address-specific tracking
    console.log(chalk.bold('👤 Demo 8: Address-Specific Tracking\n'));

    const address = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0';
    const addressHistory = transparencyLogger.getHistory({
        fromAddress: address,
        limit: 5
    });

    console.log(chalk.cyan(`   Transactions from ${address.substring(0, 10)}...:`));
    addressHistory.forEach((tx, i) => {
        console.log(chalk.white(`   ${i + 1}. To: ${tx.to_address?.substring(0, 10)}... | Value: ${tx.value_formatted} | Status: ${tx.status}`));
    });
    console.log();

    // Demo 9: Multi-chain comparison
    console.log(chalk.bold('⛓️  Demo 9: Multi-Chain Statistics\n'));

    const chainStats = transparencyLogger.getChainStats();
    if (chainStats.length > 0) {
        chainStats.forEach(stat => {
            console.log(chalk.white(`   ${stat.chain_name}:`));
            console.log(chalk.dim(`     Total: ${stat.total_transactions} | Success: ${stat.successful_transactions} | Failed: ${stat.failed_transactions}`));
        });
    } else {
        console.log(chalk.yellow('   No chain statistics available yet'));
    }
    console.log();

    // Demo 10: Real-time monitoring example
    console.log(chalk.bold('🔍 Demo 10: Real-Time Monitoring (Simulation)\n'));
    console.log(chalk.cyan('   In production, transactions would be monitored in real-time:'));
    console.log(chalk.dim('   - Transaction broadcast → Pending'));
    console.log(chalk.dim('   - Block inclusion → Confirming (1 confirmation)'));
    console.log(chalk.dim('   - Additional blocks → Confirmed (n confirmations)'));
    console.log(chalk.dim('   - Event logs parsed and stored'));
    console.log(chalk.dim('   - Gas costs tracked and analyzed'));
    console.log(chalk.dim('   - Block explorer links generated'));
    console.log();

    // Summary
    console.log(chalk.bold.green('✅ TRANSPARENCY DEMO COMPLETE\n'));
    console.log(chalk.cyan('Key Features Demonstrated:'));
    console.log(chalk.white('  ✓ Transaction recording and tracking'));
    console.log(chalk.white('  ✓ Receipt updates with event logs'));
    console.log(chalk.white('  ✓ Detailed transaction reporting'));
    console.log(chalk.white('  ✓ Transaction history queries'));
    console.log(chalk.white('  ✓ Real-time statistics dashboard'));
    console.log(chalk.white('  ✓ Gas analytics and optimization'));
    console.log(chalk.white('  ✓ Audit data export'));
    console.log(chalk.white('  ✓ Address-specific tracking'));
    console.log(chalk.white('  ✓ Multi-chain support'));
    console.log(chalk.white('  ✓ Block explorer integration'));
    console.log();

    console.log(chalk.dim('All transaction data is stored in: data/transparency.db'));
    console.log(chalk.dim('View in-depth statistics anytime with: transparencyLogger.displayStatistics()'));
    console.log();
}

// Run the demo
main().catch(error => {
    console.error(chalk.red('\n❌ Error running demo:'), error.message);
    process.exit(1);
});
