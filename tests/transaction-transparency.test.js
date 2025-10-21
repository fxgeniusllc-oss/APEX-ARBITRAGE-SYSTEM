import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { ethers } from 'ethers';
import { existsSync, unlinkSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import Database from 'better-sqlite3';

// Generate unique database path for this test run
const TEST_DB_PATH = `data/transparency-test-${Date.now()}.db`;
process.env.TRANSPARENCY_DB_PATH = TEST_DB_PATH;

// Ensure data directory exists
const dbDir = dirname(TEST_DB_PATH);
if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
}

import {
    recordTransaction,
    updateTransactionReceipt,
    getTransactionDetails,
    getTransactions,
    getTransactionStatistics,
    getGasStatistics,
    getExplorerUrl,
    getAddressTransactions,
    exportTransactionData
} from '../src/utils/transaction-transparency.js';

// Clean up database after all tests
after(() => {
    if (existsSync(TEST_DB_PATH)) {
        try {
            unlinkSync(TEST_DB_PATH);
        } catch (error) {
            console.error('Cleanup error:', error.message);
        }
    }
});

describe('Transaction Transparency Module', () => {
    it('should record a new transaction', () => {
        const tx = {
            hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
            from: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
            to: '0x1234567890123456789012345678901234567890',
            value: ethers.parseEther('1.0'),
            gasLimit: BigInt(21000),
            gasPrice: ethers.parseUnits('20', 'gwei'),
            nonce: 1,
            data: '0x',
            type: 2
        };

        const result = recordTransaction(tx, 1, 'Test Transaction');
        
        assert.strictEqual(result.txHash, tx.hash);
        assert.strictEqual(result.chainId, 1);
        assert.ok(result.explorerUrl);
    });

    it('should get transaction details', () => {
        const tx = {
            hash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
            from: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
            to: '0x1234567890123456789012345678901234567890',
            value: ethers.parseEther('0.5'),
            gasLimit: BigInt(21000),
            gasPrice: ethers.parseUnits('25', 'gwei'),
            nonce: 2,
            data: '0x'
        };

        recordTransaction(tx, 137, 'Polygon Test');
        
        const details = getTransactionDetails(tx.hash);
        
        assert.ok(details);
        assert.strictEqual(details.tx_hash, tx.hash);
        assert.strictEqual(details.chain_id, 137);
        assert.strictEqual(details.chain_name, 'Polygon');
        assert.strictEqual(details.purpose, 'Polygon Test');
        assert.strictEqual(details.status, 'pending');
    });

    it('should update transaction with receipt', () => {
        const tx = {
            hash: '0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321',
            from: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
            to: '0x1234567890123456789012345678901234567890',
            value: ethers.parseEther('2.0'),
            gasLimit: BigInt(21000),
            gasPrice: ethers.parseUnits('30', 'gwei'),
            nonce: 3,
            data: '0x'
        };

        recordTransaction(tx, 1, 'Receipt Test');

        const receipt = {
            status: 1,
            blockNumber: 12345678,
            blockHash: '0xblock123',
            gasUsed: BigInt(21000),
            effectiveGasPrice: ethers.parseUnits('30', 'gwei'),
            cumulativeGasUsed: BigInt(100000),
            logs: [],
            confirmations: 1
        };

        updateTransactionReceipt(tx.hash, receipt, 1);

        const details = getTransactionDetails(tx.hash);
        
        assert.strictEqual(details.status, 'confirmed');
        assert.strictEqual(details.block_number, 12345678);
        assert.strictEqual(details.gas_used, '21000');
    });

    it('should get transaction statistics', () => {
        const stats = getTransactionStatistics();

        assert.ok(stats.overall);
        assert.ok(stats.overall.total_transactions >= 3); // At least the ones we added
        assert.ok(Array.isArray(stats.byChain));
        assert.ok(Array.isArray(stats.recentTransactions));
    });

    it('should generate correct explorer URLs', () => {
        const txUrl = getExplorerUrl('0x123', 1, 'tx');
        const addressUrl = getExplorerUrl('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0', 1, 'address');
        const blockUrl = getExplorerUrl('12345678', 137, 'block');

        assert.strictEqual(txUrl, 'https://etherscan.io/tx/0x123');
        assert.strictEqual(addressUrl, 'https://etherscan.io/address/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0');
        assert.strictEqual(blockUrl, 'https://polygonscan.com/block/12345678');
    });

    it('should handle transaction with events', () => {
        const uniqueHash = '0xevents9999567890123456789012345678901234567890123456789012345678';
        const tx = {
            hash: uniqueHash,
            from: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
            to: '0x1234567890123456789012345678901234567890',
            value: ethers.parseEther('0'),
            gasLimit: BigInt(100000),
            gasPrice: ethers.parseUnits('30', 'gwei'),
            nonce: 5,
            data: '0xa9059cbb'
        };

        recordTransaction(tx, 1, 'Transfer with Events');

        const receipt = {
            status: 1,
            blockNumber: 12345678,
            blockHash: '0xblock123',
            gasUsed: BigInt(65000),
            effectiveGasPrice: ethers.parseUnits('30', 'gwei'),
            cumulativeGasUsed: BigInt(100000),
            logs: [
                {
                    index: 0,
                    address: '0x1234567890123456789012345678901234567890',
                    topics: ['0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'],
                    data: '0x0000000000000000000000000000000000000000000000000de0b6b3a7640000',
                    blockNumber: 12345678,
                    transactionIndex: 10
                }
            ]
        };

        updateTransactionReceipt(uniqueHash, receipt, 1);

        const details = getTransactionDetails(uniqueHash);

        assert.strictEqual(details.logs_count, 1);
        assert.strictEqual(details.events.length, 1);
        assert.strictEqual(details.events[0].contract_address, '0x1234567890123456789012345678901234567890');
    });

    it('should export transaction data for audit', () => {
        const exportData = exportTransactionData({ chainId: 1 });

        assert.ok(exportData.exportDate);
        assert.ok(exportData.transactionCount >= 0);
        assert.ok(Array.isArray(exportData.transactions));
    });
});

console.log('✅ Running Transaction Transparency Tests...');
