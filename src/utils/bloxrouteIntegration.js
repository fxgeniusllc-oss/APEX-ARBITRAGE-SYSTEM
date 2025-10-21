/**
 * BloXroute Integration Module
 * High-speed transaction propagation and MEV protection via BloXroute Gateway
 * Based on BillionaireBot_bloxroute_gateway_Version2 principles
 */

import axios from 'axios';
import { ethers } from 'ethers';
import chalk from 'chalk';

export class BloxrouteGateway {
    constructor(authToken) {
        this.authToken = authToken || process.env.BLOXROUTE_AUTH_TOKEN;
        this.baseUrl = process.env.BLOXROUTE_GATEWAY_URL || 'https://api.blxrbdn.com';
        
        // BloXroute endpoints by chain
        this.endpoints = {
            polygon: {
                gateway: `${this.baseUrl}/polygon`,
                ws: 'wss://api.blxrbdn.com/ws',
                http: 'https://api.blxrbdn.com'
            },
            ethereum: {
                gateway: `${this.baseUrl}/eth`,
                ws: 'wss://api.blxrbdn.com/ws',
                http: 'https://api.blxrbdn.com'
            },
            bsc: {
                gateway: `${this.baseUrl}/bsc`,
                ws: 'wss://api.blxrbdn.com/ws',
                http: 'https://api.blxrbdn.com'
            }
        };
        
        this.stats = {
            transactionsSent: 0,
            successfulPropagations: 0,
            averageLatency: 0,
            mevProtected: 0
        };
    }

    /**
     * Send transaction via BloXroute with high-speed propagation
     */
    async sendTransaction(signedTx, chain = 'polygon', options = {}) {
        const {
            frontRunningProtection = true,
            validators = 'all',
            nodeValidation = true
        } = options;

        console.log(chalk.cyan('📡 Sending transaction via BloXroute...'));
        console.log(chalk.cyan(`   Chain: ${chain}`));
        console.log(chalk.cyan(`   MEV Protection: ${frontRunningProtection ? 'ON' : 'OFF'}`));

        try {
            const endpoint = this.endpoints[chain];
            if (!endpoint) {
                throw new Error(`Chain ${chain} not supported by BloXroute`);
            }

            const startTime = Date.now();

            const response = await axios.post(
                `${endpoint.http}/tx`,
                {
                    transaction: signedTx,
                    blockchain_network: chain.toUpperCase(),
                    // BloXroute-specific parameters
                    front_running_protection: frontRunningProtection,
                    validators_only: validators === 'validators',
                    node_validation: nodeValidation,
                    // Paid tier features
                    next_validator: options.nextValidator || false,
                    fallback: options.fallback !== false
                },
                {
                    headers: {
                        'Authorization': this.authToken,
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000
                }
            );

            const latency = Date.now() - startTime;
            
            // Update stats
            this.stats.transactionsSent++;
            if (response.data.tx_hash) {
                this.stats.successfulPropagations++;
            }
            if (frontRunningProtection) {
                this.stats.mevProtected++;
            }
            
            // Update average latency
            this.stats.averageLatency = 
                (this.stats.averageLatency * (this.stats.transactionsSent - 1) + latency) / 
                this.stats.transactionsSent;

            console.log(chalk.green('✅ Transaction propagated via BloXroute'));
            console.log(chalk.green(`   TX Hash: ${response.data.tx_hash}`));
            console.log(chalk.green(`   Latency: ${latency}ms`));
            console.log(chalk.green(`   Validators Reached: ${response.data.validators_reached || 'N/A'}`));

            return {
                success: true,
                txHash: response.data.tx_hash,
                latency,
                validatorsReached: response.data.validators_reached,
                mevProtected: frontRunningProtection
            };

        } catch (error) {
            console.error(chalk.red('❌ BloXroute propagation failed:'), error.message);
            
            // Fall back to regular RPC if available
            if (options.fallback !== false) {
                console.log(chalk.yellow('⚠️  Falling back to regular RPC...'));
                return await this.fallbackToRPC(signedTx, chain);
            }
            
            throw error;
        }
    }

    /**
     * Subscribe to BloXroute mempool stream for pending transactions
     */
    async subscribeToPendingTxs(chain, filters = {}, callback) {
        console.log(chalk.cyan('🔔 Subscribing to BloXroute mempool stream...'));
        
        try {
            const ws = new WebSocket(this.endpoints[chain].ws);
            
            ws.on('open', () => {
                console.log(chalk.green('✅ Connected to BloXroute WebSocket'));
                
                // Subscribe to pending transactions
                ws.send(JSON.stringify({
                    method: 'subscribe',
                    params: {
                        subscription: 'newTxs',
                        blockchain_network: chain.toUpperCase(),
                        include: filters.include || ['tx_hash', 'tx_contents', 'gas_price'],
                        filters: filters.conditions || {}
                    },
                    authorization: this.authToken
                }));
            });

            ws.on('message', (data) => {
                try {
                    const tx = JSON.parse(data);
                    callback(tx);
                } catch (error) {
                    console.error(chalk.red('Error parsing mempool data:'), error.message);
                }
            });

            ws.on('error', (error) => {
                console.error(chalk.red('BloXroute WebSocket error:'), error.message);
            });

            ws.on('close', () => {
                console.log(chalk.yellow('⚠️  BloXroute WebSocket closed'));
            });

            return ws;

        } catch (error) {
            console.error(chalk.red('❌ Failed to subscribe to BloXroute mempool:'), error.message);
            throw error;
        }
    }

    /**
     * Get transaction status from BloXroute
     */
    async getTransactionStatus(txHash, chain) {
        try {
            const endpoint = this.endpoints[chain];
            const response = await axios.get(
                `${endpoint.http}/tx/${txHash}`,
                {
                    headers: { 'Authorization': this.authToken },
                    timeout: 5000
                }
            );

            return {
                status: response.data.status,
                confirmations: response.data.confirmations,
                blockNumber: response.data.block_number,
                gasUsed: response.data.gas_used
            };

        } catch (error) {
            console.error(chalk.red('Error getting transaction status:'), error.message);
            throw error;
        }
    }

    /**
     * Fallback to regular RPC if BloXroute fails
     */
    async fallbackToRPC(signedTx, chain) {
        console.log(chalk.yellow('Using fallback RPC provider...'));
        
        try {
            const rpcUrl = process.env[`${chain.toUpperCase()}_RPC_URL`];
            if (!rpcUrl) {
                throw new Error(`No RPC URL configured for ${chain}`);
            }

            const provider = new ethers.JsonRpcProvider(rpcUrl);
            const tx = await provider.sendTransaction(signedTx);
            
            console.log(chalk.green('✅ Transaction sent via fallback RPC'));
            console.log(chalk.green(`   TX Hash: ${tx.hash}`));

            return {
                success: true,
                txHash: tx.hash,
                fallback: true
            };

        } catch (error) {
            console.error(chalk.red('❌ Fallback RPC also failed:'), error.message);
            throw error;
        }
    }

    /**
     * Estimate optimal gas price using BloXroute data
     */
    async getOptimalGasPrice(chain) {
        try {
            const endpoint = this.endpoints[chain];
            const response = await axios.get(
                `${endpoint.http}/gas`,
                {
                    headers: { 'Authorization': this.authToken },
                    timeout: 5000
                }
            );

            const gasPrices = {
                slow: response.data.slow,
                standard: response.data.standard,
                fast: response.data.fast,
                instant: response.data.instant
            };

            console.log(chalk.cyan('⛽ BloXroute Gas Prices:'));
            console.log(chalk.cyan(`   Fast: ${gasPrices.fast} Gwei`));
            console.log(chalk.cyan(`   Instant: ${gasPrices.instant} Gwei`));

            return gasPrices;

        } catch (error) {
            console.error(chalk.red('Error getting gas price:'), error.message);
            throw error;
        }
    }

    /**
     * Submit bundle of transactions (MEV protection)
     */
    async sendBundle(transactions, chain, targetBlock) {
        console.log(chalk.cyan('📦 Sending transaction bundle via BloXroute...'));
        console.log(chalk.cyan(`   Transactions: ${transactions.length}`));
        console.log(chalk.cyan(`   Target Block: ${targetBlock}`));

        try {
            const endpoint = this.endpoints[chain];
            const response = await axios.post(
                `${endpoint.http}/bundle`,
                {
                    transactions,
                    blockchain_network: chain.toUpperCase(),
                    block_number: targetBlock,
                    min_timestamp: Date.now(),
                    max_timestamp: Date.now() + 60000 // 60 second validity
                },
                {
                    headers: {
                        'Authorization': this.authToken,
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000
                }
            );

            console.log(chalk.green('✅ Bundle submitted successfully'));
            console.log(chalk.green(`   Bundle Hash: ${response.data.bundle_hash}`));

            return {
                success: true,
                bundleHash: response.data.bundle_hash,
                transactions: transactions.length
            };

        } catch (error) {
            console.error(chalk.red('❌ Bundle submission failed:'), error.message);
            throw error;
        }
    }

    /**
     * Get statistics
     */
    getStats() {
        return {
            ...this.stats,
            successRate: this.stats.transactionsSent > 0
                ? (this.stats.successfulPropagations / this.stats.transactionsSent * 100).toFixed(2) + '%'
                : 'N/A'
        };
    }

    /**
     * Print statistics
     */
    printStats() {
        console.log(chalk.cyan('\n' + '='.repeat(60)));
        console.log(chalk.cyan.bold('BLOXROUTE GATEWAY STATISTICS'));
        console.log(chalk.cyan('='.repeat(60)));
        console.log(chalk.white(`Transactions Sent: ${this.stats.transactionsSent}`));
        console.log(chalk.white(`Successful Propagations: ${this.stats.successfulPropagations}`));
        console.log(chalk.white(`Average Latency: ${this.stats.averageLatency.toFixed(2)}ms`));
        console.log(chalk.white(`MEV Protected: ${this.stats.mevProtected}`));
        console.log(chalk.white(`Success Rate: ${this.getStats().successRate}`));
        console.log(chalk.cyan('='.repeat(60) + '\n'));
    }
}

// Export singleton
let bloxrouteGateway;

export function getBloxrouteGateway(authToken) {
    if (!bloxrouteGateway) {
        bloxrouteGateway = new BloxrouteGateway(authToken);
    }
    return bloxrouteGateway;
}
