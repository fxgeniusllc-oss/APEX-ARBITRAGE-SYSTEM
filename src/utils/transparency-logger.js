import chalk from 'chalk';
import { 
    recordTransaction, 
    updateTransactionReceipt,
    getTransactionDetails,
    getTransactions,
    getTransactionStatistics,
    getGasStatistics,
    getChainStatistics,
    getExplorerUrl,
    monitorTransaction,
    exportTransactionData
} from './transaction-transparency.js';

/**
 * Transaction Transparency Logger
 * High-level interface for logging and monitoring blockchain transactions
 * with comprehensive transparency and auditability features
 */

class TransparencyLogger {
    constructor(providers = {}) {
        this.providers = providers;
        this.activeMonitors = new Map();
        this.logLevel = process.env.TRANSPARENCY_LOG_LEVEL || 'info';
    }

    /**
     * Set blockchain providers for monitoring
     */
    setProviders(providers) {
        this.providers = providers;
    }

    /**
     * Log a new transaction with full transparency
     */
    logTransaction(tx, chainId, purpose = null) {
        try {
            const result = recordTransaction(tx, chainId, purpose);
            
            this.log('info', `📝 Transaction recorded: ${tx.hash}`, {
                chain: chainId,
                purpose,
                explorerUrl: result.explorerUrl
            });

            // Start monitoring if provider available
            if (this.providers[chainId]) {
                this.startMonitoring(tx.hash, chainId, purpose);
            }

            return result;
        } catch (error) {
            this.log('error', `Failed to record transaction: ${error.message}`, { txHash: tx.hash });
            throw error;
        }
    }

    /**
     * Start monitoring a transaction until confirmed
     */
    async startMonitoring(txHash, chainId, purpose = null) {
        if (this.activeMonitors.has(txHash)) {
            return; // Already monitoring
        }

        const provider = this.providers[chainId];
        if (!provider) {
            this.log('warn', `No provider available for chain ${chainId}, cannot monitor ${txHash}`);
            return;
        }

        this.activeMonitors.set(txHash, true);

        this.log('info', `🔍 Monitoring transaction: ${txHash}`);

        try {
            const result = await monitorTransaction(txHash, provider, chainId);
            
            if (result.success) {
                this.log('success', `✅ Transaction confirmed: ${txHash}`, {
                    status: result.status,
                    confirmations: result.confirmations,
                    gasUsed: result.receipt.gasUsed?.toString(),
                    explorerUrl: getExplorerUrl(txHash, chainId, 'tx')
                });

                // Display detailed receipt info
                this.displayTransactionSummary(txHash);
            } else {
                this.log('error', `❌ Transaction monitoring failed: ${txHash}`, {
                    error: result.error
                });
            }
        } catch (error) {
            this.log('error', `Error monitoring transaction: ${error.message}`, { txHash });
        } finally {
            this.activeMonitors.delete(txHash);
        }
    }

    /**
     * Update transaction receipt manually
     */
    updateReceipt(txHash, receipt, chainId) {
        try {
            updateTransactionReceipt(txHash, receipt, chainId);
            this.log('info', `📋 Receipt updated for: ${txHash}`, {
                status: receipt.status === 1 ? 'confirmed' : 'failed',
                blockNumber: receipt.blockNumber,
                gasUsed: receipt.gasUsed?.toString()
            });
        } catch (error) {
            this.log('error', `Failed to update receipt: ${error.message}`, { txHash });
            throw error;
        }
    }

    /**
     * Display transaction summary
     */
    displayTransactionSummary(txHash) {
        const details = getTransactionDetails(txHash);
        if (!details) {
            this.log('warn', `Transaction not found: ${txHash}`);
            return;
        }

        console.log(chalk.cyan('\n═══════════════════════════════════════════════════════════'));
        console.log(chalk.bold.cyan('           TRANSACTION TRANSPARENCY REPORT'));
        console.log(chalk.cyan('═══════════════════════════════════════════════════════════'));
        console.log();
        
        console.log(chalk.bold('📋 Basic Information'));
        console.log(`   Hash: ${chalk.white(details.tx_hash)}`);
        console.log(`   Chain: ${chalk.white(details.chain_name)} (${details.chain_id})`);
        console.log(`   Status: ${this.formatStatus(details.status)}`);
        console.log(`   Type: ${chalk.white(details.transaction_type)}`);
        if (details.purpose) {
            console.log(`   Purpose: ${chalk.white(details.purpose)}`);
        }
        console.log();

        console.log(chalk.bold('👤 Addresses'));
        console.log(`   From: ${chalk.white(details.from_address)}`);
        console.log(`   To: ${chalk.white(details.to_address || 'Contract Creation')}`);
        if (details.contract_address) {
            console.log(`   Contract: ${chalk.white(details.contract_address)}`);
        }
        console.log();

        console.log(chalk.bold('💰 Value & Gas'));
        console.log(`   Value: ${chalk.white(details.value_formatted)} ${CHAIN_CONFIGS[details.chain_id]?.symbol || 'ETH'}`);
        if (details.gas_used) {
            console.log(`   Gas Used: ${chalk.white(details.gas_used)}`);
            console.log(`   Gas Price: ${chalk.white(details.gas_price_gwei)} Gwei`);
            
            if (details.gasTracking) {
                console.log(`   Gas Cost: ${chalk.white(details.gasTracking.gas_cost_eth)} ETH`);
            }
        }
        console.log();

        if (details.block_number) {
            console.log(chalk.bold('⛓️  Block Information'));
            console.log(`   Block Number: ${chalk.white(details.block_number)}`);
            console.log(`   Block Hash: ${chalk.white(details.block_hash?.substring(0, 20) + '...')}`);
            console.log(`   Confirmations: ${chalk.white(details.confirmations)}`);
            console.log();
        }

        if (details.events && details.events.length > 0) {
            console.log(chalk.bold('📡 Events'));
            console.log(`   Total Events: ${chalk.white(details.events.length)}`);
            details.events.slice(0, 5).forEach((event, i) => {
                console.log(`   ${i + 1}. Contract: ${chalk.white(event.contract_address.substring(0, 10) + '...')}`);
            });
            if (details.events.length > 5) {
                console.log(`   ... and ${details.events.length - 5} more`);
            }
            console.log();
        }

        console.log(chalk.bold('🔗 Explorer'));
        console.log(`   ${chalk.blue(details.explorerUrl)}`);
        console.log();

        console.log(chalk.bold('⏰ Timestamps'));
        console.log(`   Created: ${chalk.white(new Date(details.created_at).toLocaleString())}`);
        if (details.confirmed_at) {
            console.log(`   Confirmed: ${chalk.white(new Date(details.confirmed_at).toLocaleString())}`);
        }
        
        console.log(chalk.cyan('═══════════════════════════════════════════════════════════\n'));
    }

    /**
     * Display overall statistics dashboard
     */
    displayStatistics() {
        const stats = getTransactionStatistics();
        const gasStats = getGasStatistics();

        console.log(chalk.cyan('\n═══════════════════════════════════════════════════════════'));
        console.log(chalk.bold.cyan('           TRANSPARENCY STATISTICS DASHBOARD'));
        console.log(chalk.cyan('═══════════════════════════════════════════════════════════'));
        console.log();

        console.log(chalk.bold('📊 Overall Transactions'));
        console.log(`   Total: ${chalk.white(stats.overall.total_transactions)}`);
        console.log(`   Confirmed: ${chalk.green(stats.overall.confirmed)}`);
        console.log(`   Failed: ${chalk.red(stats.overall.failed)}`);
        console.log(`   Pending: ${chalk.yellow(stats.overall.pending)}`);
        console.log(`   Success Rate: ${chalk.white(((stats.overall.confirmed / stats.overall.total_transactions) * 100).toFixed(2))}%`);
        console.log();

        if (stats.byChain.length > 0) {
            console.log(chalk.bold('⛓️  By Chain'));
            stats.byChain.forEach(chain => {
                console.log(`   ${chain.chain_name}: ${chalk.white(chain.count)} transactions (${chalk.green(chain.confirmed)} confirmed, ${chalk.red(chain.failed)} failed)`);
            });
            console.log();
        }

        if (gasStats.total_transactions > 0) {
            console.log(chalk.bold('⛽ Gas Statistics'));
            console.log(`   Avg Gas Price: ${chalk.white(gasStats.avg_gas_price_gwei?.toFixed(2))} Gwei`);
            console.log(`   Min Gas Price: ${chalk.white(gasStats.min_gas_price_gwei?.toFixed(2))} Gwei`);
            console.log(`   Max Gas Price: ${chalk.white(gasStats.max_gas_price_gwei?.toFixed(2))} Gwei`);
            console.log(`   Total Gas Cost: ${chalk.white(gasStats.total_gas_cost_eth?.toFixed(6))} ETH`);
            console.log();
        }

        if (stats.recentTransactions.length > 0) {
            console.log(chalk.bold('📝 Recent Transactions'));
            stats.recentTransactions.slice(0, 5).forEach(tx => {
                console.log(`   ${this.formatStatus(tx.status)} ${tx.tx_hash.substring(0, 20)}... [${tx.chain_name}]`);
            });
            console.log();
        }

        console.log(chalk.cyan('═══════════════════════════════════════════════════════════\n'));
    }

    /**
     * Get transaction history with filters
     */
    getHistory(filters = {}) {
        return getTransactions(filters);
    }

    /**
     * Get details for a specific transaction
     */
    getDetails(txHash) {
        return getTransactionDetails(txHash);
    }

    /**
     * Export transaction data for audit
     */
    exportAuditData(filters = {}) {
        const data = exportTransactionData(filters);
        this.log('info', `📤 Exported ${data.transactionCount} transactions for audit`);
        return data;
    }

    /**
     * Get chain statistics
     */
    getChainStats(chainId = null) {
        return getChainStatistics(chainId);
    }

    /**
     * Format status with color
     */
    formatStatus(status) {
        switch (status) {
            case 'confirmed':
                return chalk.green('✅ Confirmed');
            case 'failed':
                return chalk.red('❌ Failed');
            case 'pending':
                return chalk.yellow('⏳ Pending');
            default:
                return chalk.gray(`❓ ${status}`);
        }
    }

    /**
     * Log message with level
     */
    log(level, message, data = null) {
        const levels = { error: 0, warn: 1, info: 2, debug: 3 };
        const currentLevel = levels[this.logLevel] || 2;
        
        if (levels[level] > currentLevel) {
            return;
        }

        const timestamp = new Date().toISOString();
        const prefix = {
            error: chalk.red('[ERROR]'),
            warn: chalk.yellow('[WARN]'),
            info: chalk.blue('[INFO]'),
            debug: chalk.gray('[DEBUG]'),
            success: chalk.green('[SUCCESS]')
        }[level] || chalk.white('[LOG]');

        console.log(`${chalk.dim(timestamp)} ${prefix} ${message}`);
        
        if (data && this.logLevel === 'debug') {
            console.log(chalk.dim(JSON.stringify(data, null, 2)));
        }
    }
}

// Chain configurations for block explorers
const CHAIN_CONFIGS = {
    1: { name: 'Ethereum', symbol: 'ETH' },
    137: { name: 'Polygon', symbol: 'MATIC' },
    56: { name: 'BSC', symbol: 'BNB' },
    42161: { name: 'Arbitrum', symbol: 'ETH' },
    10: { name: 'Optimism', symbol: 'ETH' },
    8453: { name: 'Base', symbol: 'ETH' }
};

// Export singleton instance
export const transparencyLogger = new TransparencyLogger();

export default TransparencyLogger;
