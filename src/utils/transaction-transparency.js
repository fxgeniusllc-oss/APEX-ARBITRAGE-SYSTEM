import { ethers } from 'ethers';
import Database from 'better-sqlite3';
import { mkdirSync, existsSync } from 'fs';
import { dirname } from 'path';

/**
 * Transaction Transparency Module
 * Provides comprehensive tracking and monitoring of all blockchain transactions
 * for complete transparency and auditability
 */

const TRANSPARENCY_DB_PATH = process.env.TRANSPARENCY_DB_PATH || 'data/transparency.db';

// Ensure data directory exists
const dbDir = dirname(TRANSPARENCY_DB_PATH);
if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
}

const transparencyDb = new Database(TRANSPARENCY_DB_PATH);
transparencyDb.pragma('journal_mode = WAL');

/**
 * Chain configurations for block explorers
 */
const CHAIN_CONFIGS = {
    1: { name: 'Ethereum', explorer: 'https://etherscan.io', symbol: 'ETH' },
    137: { name: 'Polygon', explorer: 'https://polygonscan.com', symbol: 'MATIC' },
    56: { name: 'BSC', explorer: 'https://bscscan.com', symbol: 'BNB' },
    42161: { name: 'Arbitrum', explorer: 'https://arbiscan.io', symbol: 'ETH' },
    10: { name: 'Optimism', explorer: 'https://optimistic.etherscan.io', symbol: 'ETH' },
    8453: { name: 'Base', explorer: 'https://basescan.org', symbol: 'ETH' }
};

/**
 * Initialize transparency database
 */
export function initializeTransparencyDb() {
    // Transactions table - comprehensive transaction tracking
    transparencyDb.exec(`
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tx_hash TEXT UNIQUE NOT NULL,
            chain_id INTEGER NOT NULL,
            chain_name TEXT NOT NULL,
            from_address TEXT NOT NULL,
            to_address TEXT,
            value TEXT NOT NULL,
            value_formatted TEXT,
            gas_limit TEXT,
            gas_price TEXT,
            gas_price_gwei TEXT,
            max_fee_per_gas TEXT,
            max_priority_fee_per_gas TEXT,
            nonce INTEGER,
            data TEXT,
            status TEXT NOT NULL DEFAULT 'pending',
            block_number INTEGER,
            block_hash TEXT,
            block_timestamp INTEGER,
            gas_used TEXT,
            effective_gas_price TEXT,
            cumulative_gas_used TEXT,
            contract_address TEXT,
            logs_count INTEGER DEFAULT 0,
            confirmations INTEGER DEFAULT 0,
            transaction_type TEXT,
            purpose TEXT,
            error_message TEXT,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            confirmed_at INTEGER
        )
    `);

    // Transaction events table - for event logs
    transparencyDb.exec(`
        CREATE TABLE IF NOT EXISTS transaction_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tx_hash TEXT NOT NULL,
            log_index INTEGER NOT NULL,
            contract_address TEXT NOT NULL,
            event_name TEXT,
            event_signature TEXT,
            topics TEXT NOT NULL,
            data TEXT NOT NULL,
            decoded_data TEXT,
            block_number INTEGER NOT NULL,
            transaction_index INTEGER,
            created_at INTEGER NOT NULL,
            FOREIGN KEY (tx_hash) REFERENCES transactions(tx_hash)
        )
    `);

    // Gas tracking table
    transparencyDb.exec(`
        CREATE TABLE IF NOT EXISTS gas_tracking (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tx_hash TEXT NOT NULL,
            estimated_gas TEXT,
            actual_gas TEXT,
            gas_price_gwei TEXT,
            gas_cost_eth TEXT,
            gas_cost_usd TEXT,
            gas_saved TEXT,
            optimization_applied TEXT,
            created_at INTEGER NOT NULL,
            FOREIGN KEY (tx_hash) REFERENCES transactions(tx_hash)
        )
    `);

    // Chain statistics table
    transparencyDb.exec(`
        CREATE TABLE IF NOT EXISTS chain_statistics (
            chain_id INTEGER PRIMARY KEY,
            chain_name TEXT NOT NULL,
            total_transactions INTEGER DEFAULT 0,
            successful_transactions INTEGER DEFAULT 0,
            failed_transactions INTEGER DEFAULT 0,
            pending_transactions INTEGER DEFAULT 0,
            total_value_transferred TEXT DEFAULT '0',
            total_gas_spent TEXT DEFAULT '0',
            avg_gas_price TEXT DEFAULT '0',
            last_transaction_at INTEGER,
            updated_at INTEGER NOT NULL
        )
    `);

    // Create indices for faster queries
    transparencyDb.exec(`
        CREATE INDEX IF NOT EXISTS idx_transactions_hash ON transactions(tx_hash);
        CREATE INDEX IF NOT EXISTS idx_transactions_chain ON transactions(chain_id);
        CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
        CREATE INDEX IF NOT EXISTS idx_transactions_from ON transactions(from_address);
        CREATE INDEX IF NOT EXISTS idx_transactions_to ON transactions(to_address);
        CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_events_tx_hash ON transaction_events(tx_hash);
        CREATE INDEX IF NOT EXISTS idx_events_contract ON transaction_events(contract_address);
    `);

    console.log('✅ Transaction Transparency Database initialized');
}

/**
 * Record a new transaction
 */
export function recordTransaction(tx, chainId, purpose = null) {
    const now = Date.now();
    const chainConfig = CHAIN_CONFIGS[chainId] || { name: `Chain ${chainId}`, symbol: 'ETH' };

    const stmt = transparencyDb.prepare(`
        INSERT OR REPLACE INTO transactions (
            tx_hash, chain_id, chain_name, from_address, to_address,
            value, value_formatted, gas_limit, gas_price, gas_price_gwei,
            max_fee_per_gas, max_priority_fee_per_gas, nonce, data,
            status, transaction_type, purpose, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const value = tx.value ? tx.value.toString() : '0';
    const valueFormatted = tx.value ? ethers.formatEther(tx.value) : '0';
    const gasPrice = tx.gasPrice ? tx.gasPrice.toString() : null;
    const gasPriceGwei = tx.gasPrice ? ethers.formatUnits(tx.gasPrice, 'gwei') : null;

    stmt.run(
        tx.hash,
        chainId,
        chainConfig.name,
        tx.from,
        tx.to || null,
        value,
        valueFormatted,
        tx.gasLimit ? tx.gasLimit.toString() : null,
        gasPrice,
        gasPriceGwei,
        tx.maxFeePerGas ? tx.maxFeePerGas.toString() : null,
        tx.maxPriorityFeePerGas ? tx.maxPriorityFeePerGas.toString() : null,
        tx.nonce || null,
        tx.data || '0x',
        'pending',
        tx.type !== undefined ? `Type ${tx.type}` : 'Legacy',
        purpose,
        now,
        now
    );

    updateChainStatistics(chainId, 'pending');

    return {
        txHash: tx.hash,
        chainId,
        explorerUrl: getExplorerUrl(tx.hash, chainId, 'tx')
    };
}

/**
 * Update transaction with receipt data
 */
export function updateTransactionReceipt(txHash, receipt, chainId) {
    const now = Date.now();

    const stmt = transparencyDb.prepare(`
        UPDATE transactions SET
            status = ?,
            block_number = ?,
            block_hash = ?,
            block_timestamp = ?,
            gas_used = ?,
            effective_gas_price = ?,
            cumulative_gas_used = ?,
            contract_address = ?,
            logs_count = ?,
            confirmations = ?,
            updated_at = ?,
            confirmed_at = ?
        WHERE tx_hash = ?
    `);

    stmt.run(
        receipt.status === 1 ? 'confirmed' : 'failed',
        receipt.blockNumber,
        receipt.blockHash,
        receipt.blockTimestamp || now,
        receipt.gasUsed ? receipt.gasUsed.toString() : null,
        receipt.effectiveGasPrice ? receipt.effectiveGasPrice.toString() : null,
        receipt.cumulativeGasUsed ? receipt.cumulativeGasUsed.toString() : null,
        receipt.contractAddress || null,
        receipt.logs ? receipt.logs.length : 0,
        receipt.confirmations || 1,
        now,
        now,
        txHash
    );

    // Record gas tracking
    if (receipt.gasUsed && receipt.effectiveGasPrice) {
        recordGasTracking(txHash, receipt);
    }

    // Record events
    if (receipt.logs && receipt.logs.length > 0) {
        recordTransactionEvents(txHash, receipt.logs);
    }

    // Update chain statistics
    updateChainStatistics(chainId, receipt.status === 1 ? 'confirmed' : 'failed');
}

/**
 * Record gas tracking information
 */
function recordGasTracking(txHash, receipt) {
    const gasUsed = receipt.gasUsed.toString();
    const gasPrice = receipt.effectiveGasPrice.toString();
    const gasPriceGwei = ethers.formatUnits(receipt.effectiveGasPrice, 'gwei');
    const gasCostEth = ethers.formatEther(
        BigInt(gasUsed) * BigInt(gasPrice)
    );

    const stmt = transparencyDb.prepare(`
        INSERT INTO gas_tracking (
            tx_hash, actual_gas, gas_price_gwei, gas_cost_eth, created_at
        ) VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(txHash, gasUsed, gasPriceGwei, gasCostEth, Date.now());
}

/**
 * Record transaction events/logs
 */
function recordTransactionEvents(txHash, logs) {
    const stmt = transparencyDb.prepare(`
        INSERT INTO transaction_events (
            tx_hash, log_index, contract_address, topics, data,
            block_number, transaction_index, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const log of logs) {
        stmt.run(
            txHash,
            log.index,
            log.address,
            JSON.stringify(log.topics),
            log.data,
            log.blockNumber,
            log.transactionIndex,
            Date.now()
        );
    }
}

/**
 * Update chain statistics
 */
function updateChainStatistics(chainId, status) {
    const chainConfig = CHAIN_CONFIGS[chainId] || { name: `Chain ${chainId}` };
    const now = Date.now();

    const existing = transparencyDb.prepare(`
        SELECT * FROM chain_statistics WHERE chain_id = ?
    `).get(chainId);

    if (existing) {
        const updates = {};
        if (status === 'pending') updates.pending_transactions = 'pending_transactions + 1';
        if (status === 'confirmed') {
            updates.successful_transactions = 'successful_transactions + 1';
            updates.pending_transactions = 'CASE WHEN pending_transactions > 0 THEN pending_transactions - 1 ELSE 0 END';
        }
        if (status === 'failed') {
            updates.failed_transactions = 'failed_transactions + 1';
            updates.pending_transactions = 'CASE WHEN pending_transactions > 0 THEN pending_transactions - 1 ELSE 0 END';
        }

        const setClause = Object.entries(updates).map(([key]) => `${key} = ${updates[key]}`).join(', ');

        transparencyDb.prepare(`
            UPDATE chain_statistics SET
                ${setClause},
                total_transactions = total_transactions + 1,
                last_transaction_at = ?,
                updated_at = ?
            WHERE chain_id = ?
        `).run(now, now, chainId);
    } else {
        transparencyDb.prepare(`
            INSERT INTO chain_statistics (
                chain_id, chain_name, total_transactions,
                ${status === 'pending' ? 'pending_transactions' : status === 'confirmed' ? 'successful_transactions' : 'failed_transactions'},
                last_transaction_at, updated_at
            ) VALUES (?, ?, 1, 1, ?, ?)
        `).run(chainId, chainConfig.name, now, now);
    }
}

/**
 * Get transaction details by hash
 */
export function getTransactionDetails(txHash) {
    const tx = transparencyDb.prepare(`
        SELECT * FROM transactions WHERE tx_hash = ?
    `).get(txHash);

    if (!tx) {
        return null;
    }

    // Get events
    const events = transparencyDb.prepare(`
        SELECT * FROM transaction_events WHERE tx_hash = ? ORDER BY log_index
    `).all(txHash);

    // Get gas tracking
    const gasTracking = transparencyDb.prepare(`
        SELECT * FROM gas_tracking WHERE tx_hash = ?
    `).get(txHash);

    return {
        ...tx,
        explorerUrl: getExplorerUrl(tx.tx_hash, tx.chain_id, 'tx'),
        events,
        gasTracking
    };
}

/**
 * Get all transactions with filters
 */
export function getTransactions(filters = {}) {
    let query = 'SELECT * FROM transactions WHERE 1=1';
    const params = [];

    if (filters.chainId) {
        query += ' AND chain_id = ?';
        params.push(filters.chainId);
    }

    if (filters.status) {
        query += ' AND status = ?';
        params.push(filters.status);
    }

    if (filters.fromAddress) {
        query += ' AND from_address = ?';
        params.push(filters.fromAddress);
    }

    if (filters.toAddress) {
        query += ' AND to_address = ?';
        params.push(filters.toAddress);
    }

    if (filters.purpose) {
        query += ' AND purpose LIKE ?';
        params.push(`%${filters.purpose}%`);
    }

    if (filters.startDate) {
        query += ' AND created_at >= ?';
        params.push(new Date(filters.startDate).getTime());
    }

    if (filters.endDate) {
        query += ' AND created_at <= ?';
        params.push(new Date(filters.endDate).getTime());
    }

    query += ' ORDER BY created_at DESC';

    if (filters.limit) {
        query += ' LIMIT ?';
        params.push(filters.limit);
    }

    const transactions = transparencyDb.prepare(query).all(...params);

    return transactions.map(tx => ({
        ...tx,
        explorerUrl: getExplorerUrl(tx.tx_hash, tx.chain_id, 'tx')
    }));
}

/**
 * Get chain statistics
 */
export function getChainStatistics(chainId = null) {
    if (chainId) {
        return transparencyDb.prepare(`
            SELECT * FROM chain_statistics WHERE chain_id = ?
        `).get(chainId);
    } else {
        return transparencyDb.prepare(`
            SELECT * FROM chain_statistics ORDER BY total_transactions DESC
        `).all();
    }
}

/**
 * Get transaction statistics
 */
export function getTransactionStatistics() {
    const overall = transparencyDb.prepare(`
        SELECT 
            COUNT(*) as total_transactions,
            SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
            SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
            SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
            COUNT(DISTINCT chain_id) as chains_used,
            COUNT(DISTINCT from_address) as unique_senders,
            SUM(CASE WHEN status = 'confirmed' THEN CAST(value AS REAL) ELSE 0 END) as total_value_transferred
        FROM transactions
    `).get();

    const byChain = transparencyDb.prepare(`
        SELECT 
            chain_id,
            chain_name,
            COUNT(*) as count,
            SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
            SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
        FROM transactions
        GROUP BY chain_id, chain_name
        ORDER BY count DESC
    `).all();

    const recentTransactions = getTransactions({ limit: 10 });

    return {
        overall,
        byChain,
        recentTransactions
    };
}

/**
 * Get gas statistics
 */
export function getGasStatistics() {
    return transparencyDb.prepare(`
        SELECT 
            COUNT(*) as total_transactions,
            AVG(CAST(gas_price_gwei AS REAL)) as avg_gas_price_gwei,
            MIN(CAST(gas_price_gwei AS REAL)) as min_gas_price_gwei,
            MAX(CAST(gas_price_gwei AS REAL)) as max_gas_price_gwei,
            SUM(CAST(gas_cost_eth AS REAL)) as total_gas_cost_eth
        FROM gas_tracking
    `).get();
}

/**
 * Get block explorer URL for a transaction, address, or block
 */
export function getExplorerUrl(identifier, chainId, type = 'tx') {
    const config = CHAIN_CONFIGS[chainId];
    if (!config) {
        return null;
    }

    switch (type) {
        case 'tx':
            return `${config.explorer}/tx/${identifier}`;
        case 'address':
            return `${config.explorer}/address/${identifier}`;
        case 'block':
            return `${config.explorer}/block/${identifier}`;
        case 'token':
            return `${config.explorer}/token/${identifier}`;
        default:
            return config.explorer;
    }
}

/**
 * Monitor transaction until confirmed
 */
export async function monitorTransaction(txHash, provider, chainId, maxWaitTime = 300000) {
    const startTime = Date.now();
    const pollInterval = 5000; // 5 seconds

    while (Date.now() - startTime < maxWaitTime) {
        try {
            const receipt = await provider.getTransactionReceipt(txHash);
            
            if (receipt) {
                updateTransactionReceipt(txHash, receipt, chainId);
                return {
                    success: true,
                    receipt,
                    confirmations: receipt.confirmations || 1,
                    status: receipt.status === 1 ? 'confirmed' : 'failed'
                };
            }

            await new Promise(resolve => setTimeout(resolve, pollInterval));
        } catch (error) {
            console.error(`Error monitoring transaction ${txHash}:`, error.message);
            await new Promise(resolve => setTimeout(resolve, pollInterval));
        }
    }

    return {
        success: false,
        error: 'Transaction monitoring timeout',
        txHash
    };
}

/**
 * Get pending transactions
 */
export function getPendingTransactions() {
    return transparencyDb.prepare(`
        SELECT * FROM transactions 
        WHERE status = 'pending'
        ORDER BY created_at DESC
    `).all();
}

/**
 * Mark transaction as failed
 */
export function markTransactionFailed(txHash, errorMessage) {
    transparencyDb.prepare(`
        UPDATE transactions SET
            status = 'failed',
            error_message = ?,
            updated_at = ?
        WHERE tx_hash = ?
    `).run(errorMessage, Date.now(), txHash);
}

/**
 * Get transactions for an address
 */
export function getAddressTransactions(address, limit = 50) {
    return transparencyDb.prepare(`
        SELECT * FROM transactions 
        WHERE from_address = ? OR to_address = ?
        ORDER BY created_at DESC
        LIMIT ?
    `).all(address, address, limit);
}

/**
 * Export transaction data for audit
 */
export function exportTransactionData(filters = {}) {
    const transactions = getTransactions(filters);
    
    return {
        exportDate: new Date().toISOString(),
        filters,
        transactionCount: transactions.length,
        transactions: transactions.map(tx => ({
            hash: tx.tx_hash,
            chain: tx.chain_name,
            from: tx.from_address,
            to: tx.to_address,
            value: tx.value_formatted,
            status: tx.status,
            blockNumber: tx.block_number,
            gasUsed: tx.gas_used,
            timestamp: new Date(tx.created_at).toISOString(),
            explorerUrl: tx.explorerUrl
        }))
    };
}

// Initialize database on module load
initializeTransparencyDb();

export default {
    initializeTransparencyDb,
    recordTransaction,
    updateTransactionReceipt,
    getTransactionDetails,
    getTransactions,
    getChainStatistics,
    getTransactionStatistics,
    getGasStatistics,
    getExplorerUrl,
    monitorTransaction,
    getPendingTransactions,
    markTransactionFailed,
    getAddressTransactions,
    exportTransactionData
};
