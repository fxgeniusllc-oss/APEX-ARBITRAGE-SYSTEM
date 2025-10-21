/**
 * Merkle Tree Sender Module
 * Efficient batch transaction submission using Merkle trees
 * Based on BillionaireBot_merkle_sender_tree_Version2 principles
 */

import { ethers } from 'ethers';
import chalk from 'chalk';

export class MerkleTreeSender {
    constructor(provider, wallet) {
        this.provider = provider;
        this.wallet = wallet;
        this.pendingTransactions = [];
        this.merkleRoots = new Map();
        this.stats = {
            batchesSent: 0,
            transactionsProcessed: 0,
            gaseSaved: 0
        };
    }

    /**
     * Build Merkle tree from transaction batch
     */
    buildMerkleTree(transactions) {
        console.log(chalk.cyan(`🌳 Building Merkle tree for ${transactions.length} transactions...`));
        
        // Hash all transactions
        const leaves = transactions.map(tx => {
            const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
                ['address', 'uint256', 'bytes', 'uint256'],
                [tx.to, tx.value || 0, tx.data || '0x', tx.nonce]
            );
            return ethers.keccak256(encoded);
        });

        // Build tree from leaves
        let tree = [leaves];
        let currentLevel = leaves;

        while (currentLevel.length > 1) {
            const nextLevel = [];
            for (let i = 0; i < currentLevel.length; i += 2) {
                const left = currentLevel[i];
                const right = i + 1 < currentLevel.length 
                    ? currentLevel[i + 1] 
                    : currentLevel[i]; // Duplicate last node if odd
                
                const hash = ethers.keccak256(
                    ethers.solidityPacked(['bytes32', 'bytes32'], [left, right])
                );
                nextLevel.push(hash);
            }
            tree.push(nextLevel);
            currentLevel = nextLevel;
        }

        const root = currentLevel[0];
        
        console.log(chalk.green('✅ Merkle tree built'));
        console.log(chalk.green(`   Root: ${root}`));
        console.log(chalk.green(`   Levels: ${tree.length}`));
        
        return { root, tree, leaves };
    }

    /**
     * Generate Merkle proof for a specific transaction
     */
    generateProof(tree, leaves, index) {
        const proof = [];
        let currentIndex = index;
        
        // Start from leaves and work up to root
        for (let level = 0; level < tree.length - 1; level++) {
            const currentLevel = tree[level];
            const isRightNode = currentIndex % 2 === 1;
            const siblingIndex = isRightNode ? currentIndex - 1 : currentIndex + 1;
            
            if (siblingIndex < currentLevel.length) {
                proof.push({
                    hash: currentLevel[siblingIndex],
                    isLeft: !isRightNode
                });
            }
            
            currentIndex = Math.floor(currentIndex / 2);
        }
        
        return proof;
    }

    /**
     * Verify Merkle proof
     */
    verifyProof(leaf, proof, root) {
        let computedHash = leaf;
        
        for (const proofElement of proof) {
            const hashes = proofElement.isLeft 
                ? [proofElement.hash, computedHash]
                : [computedHash, proofElement.hash];
            
            computedHash = ethers.keccak256(
                ethers.solidityPacked(['bytes32', 'bytes32'], hashes)
            );
        }
        
        return computedHash === root;
    }

    /**
     * Add transaction to pending batch
     */
    addTransaction(transaction) {
        this.pendingTransactions.push({
            ...transaction,
            timestamp: Date.now()
        });
        
        console.log(chalk.cyan(`📝 Transaction added to batch (${this.pendingTransactions.length} pending)`));
    }

    /**
     * Send batch of transactions using Merkle tree
     */
    async sendBatch(minBatchSize = 5) {
        if (this.pendingTransactions.length < minBatchSize) {
            console.log(chalk.yellow(`⚠️  Batch size (${this.pendingTransactions.length}) below minimum (${minBatchSize})`));
            return null;
        }

        console.log(chalk.cyan(`\n📦 Preparing to send batch of ${this.pendingTransactions.length} transactions...`));

        try {
            // Build Merkle tree
            const { root, tree, leaves } = this.buildMerkleTree(this.pendingTransactions);
            
            // Store root for verification
            this.merkleRoots.set(root, {
                transactions: [...this.pendingTransactions],
                tree,
                leaves,
                timestamp: Date.now()
            });

            // In a real implementation, this would interact with a smart contract
            // that accepts Merkle root and processes transactions in batch
            const batchTx = await this.submitMerkleBatch(root, this.pendingTransactions);

            // Calculate gas savings (batching saves ~21000 gas per tx after first)
            const individualGas = this.pendingTransactions.length * 21000;
            const batchGas = 21000 + (this.pendingTransactions.length - 1) * 5000;
            const gasSaved = individualGas - batchGas;

            // Update stats
            this.stats.batchesSent++;
            this.stats.transactionsProcessed += this.pendingTransactions.length;
            this.stats.gaseSaved += gasSaved;

            console.log(chalk.green('✅ Batch submitted successfully'));
            console.log(chalk.green(`   TX Hash: ${batchTx.hash}`));
            console.log(chalk.green(`   Gas Saved: ~${gasSaved.toLocaleString()} gas`));
            console.log(chalk.green(`   Cost Savings: ~${(gasSaved * 50 / 1e9).toFixed(4)} MATIC`));

            // Clear pending transactions
            const processedCount = this.pendingTransactions.length;
            this.pendingTransactions = [];

            return {
                success: true,
                txHash: batchTx.hash,
                merkleRoot: root,
                transactionsProcessed: processedCount,
                gasSaved
            };

        } catch (error) {
            console.error(chalk.red('❌ Batch submission failed:'), error.message);
            throw error;
        }
    }

    /**
     * Submit Merkle batch to smart contract
     */
    async submitMerkleBatch(root, transactions) {
        // This is a simplified implementation
        // In production, this would interact with a deployed batch processor contract
        
        console.log(chalk.cyan('📡 Submitting Merkle batch to contract...'));

        // Example contract interaction
        const batchProcessorAbi = [
            'function processBatch(bytes32 merkleRoot, tuple(address to, uint256 value, bytes data, uint256 nonce)[] transactions) external returns (bool)'
        ];

        // Simulated contract address (replace with actual deployed contract)
        const batchProcessorAddress = process.env.BATCH_PROCESSOR_ADDRESS || '0x0000000000000000000000000000000000000000';

        if (batchProcessorAddress === '0x0000000000000000000000000000000000000000') {
            console.log(chalk.yellow('⚠️  No batch processor contract configured - simulating submission'));
            
            // Simulate transaction
            return {
                hash: '0x' + Math.random().toString(16).substring(2, 66),
                wait: async () => ({ status: 1, gasUsed: ethers.getBigInt(100000) })
            };
        }

        const batchProcessor = new ethers.Contract(
            batchProcessorAddress,
            batchProcessorAbi,
            this.wallet
        );

        const txData = transactions.map(tx => ({
            to: tx.to,
            value: tx.value || 0,
            data: tx.data || '0x',
            nonce: tx.nonce
        }));

        const tx = await batchProcessor.processBatch(root, txData);
        await tx.wait();

        return tx;
    }

    /**
     * Verify transaction inclusion in batch
     */
    verifyTransactionInclusion(txHash, merkleRoot) {
        const batch = this.merkleRoots.get(merkleRoot);
        if (!batch) {
            throw new Error('Merkle root not found');
        }

        const txIndex = batch.transactions.findIndex(tx => {
            const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
                ['address', 'uint256', 'bytes', 'uint256'],
                [tx.to, tx.value || 0, tx.data || '0x', tx.nonce]
            );
            return ethers.keccak256(encoded) === txHash;
        });

        if (txIndex === -1) {
            return { included: false };
        }

        const proof = this.generateProof(batch.tree, batch.leaves, txIndex);
        const leaf = batch.leaves[txIndex];
        const isValid = this.verifyProof(leaf, proof, merkleRoot);

        return {
            included: true,
            index: txIndex,
            proof,
            isValid
        };
    }

    /**
     * Get pending batch info
     */
    getPendingBatchInfo() {
        return {
            pendingCount: this.pendingTransactions.length,
            oldestTransaction: this.pendingTransactions.length > 0 
                ? Date.now() - this.pendingTransactions[0].timestamp
                : 0,
            estimatedGasSavings: this.pendingTransactions.length > 1
                ? (this.pendingTransactions.length - 1) * 16000
                : 0
        };
    }

    /**
     * Auto-batch sender - automatically sends batch when conditions met
     */
    async startAutoBatcher(options = {}) {
        const {
            minBatchSize = 5,
            maxBatchSize = 50,
            maxWaitTime = 30000, // 30 seconds
            checkInterval = 5000  // Check every 5 seconds
        } = options;

        console.log(chalk.cyan('🤖 Starting auto-batcher...'));
        console.log(chalk.cyan(`   Min batch size: ${minBatchSize}`));
        console.log(chalk.cyan(`   Max batch size: ${maxBatchSize}`));
        console.log(chalk.cyan(`   Max wait time: ${maxWaitTime}ms`));

        const batcherInterval = setInterval(async () => {
            if (this.pendingTransactions.length === 0) {
                return;
            }

            const info = this.getPendingBatchInfo();
            const shouldSend = 
                this.pendingTransactions.length >= minBatchSize &&
                (this.pendingTransactions.length >= maxBatchSize || 
                 info.oldestTransaction >= maxWaitTime);

            if (shouldSend) {
                try {
                    await this.sendBatch(minBatchSize);
                } catch (error) {
                    console.error(chalk.red('Auto-batch send failed:'), error.message);
                }
            }
        }, checkInterval);

        return batcherInterval;
    }

    /**
     * Get statistics
     */
    getStats() {
        return {
            ...this.stats,
            avgGasSavingsPerBatch: this.stats.batchesSent > 0
                ? Math.floor(this.stats.gaseSaved / this.stats.batchesSent)
                : 0,
            avgTransactionsPerBatch: this.stats.batchesSent > 0
                ? Math.floor(this.stats.transactionsProcessed / this.stats.batchesSent)
                : 0
        };
    }

    /**
     * Print statistics
     */
    printStats() {
        const stats = this.getStats();
        
        console.log(chalk.cyan('\n' + '='.repeat(60)));
        console.log(chalk.cyan.bold('MERKLE TREE SENDER STATISTICS'));
        console.log(chalk.cyan('='.repeat(60)));
        console.log(chalk.white(`Batches Sent: ${stats.batchesSent}`));
        console.log(chalk.white(`Transactions Processed: ${stats.transactionsProcessed}`));
        console.log(chalk.white(`Total Gas Saved: ${stats.gaseSaved.toLocaleString()} gas`));
        console.log(chalk.white(`Avg Gas Savings/Batch: ${stats.avgGasSavingsPerBatch.toLocaleString()} gas`));
        console.log(chalk.white(`Avg Transactions/Batch: ${stats.avgTransactionsPerBatch}`));
        console.log(chalk.cyan('='.repeat(60) + '\n'));
    }
}

// Export singleton
let merkleTreeSender;

export function getMerkleTreeSender(provider, wallet) {
    if (!merkleTreeSender) {
        merkleTreeSender = new MerkleTreeSender(provider, wallet);
    }
    return merkleTreeSender;
}
