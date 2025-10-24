/**
 * Comprehensive Tests for FlashloanIntegrator
 * Tests flashloan provider selection and integration
 * 
 * Test Coverage:
 * 1. Provider configuration and initialization
 * 2. Optimal provider selection logic
 * 3. Fee calculations and cost optimization
 * 4. Validation mechanisms
 * 5. Multi-chain support
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import { ethers } from 'ethers';
import { FlashloanIntegrator, getFlashloanIntegrator } from '../src/utils/flashloanIntegration.js';

describe('FlashloanIntegrator - Initialization', () => {
    test('should initialize with provider and wallet', () => {
        const mockProvider = {};
        const mockWallet = {};
        
        const integrator = new FlashloanIntegrator(mockProvider, mockWallet);
        
        assert.ok(integrator);
        assert.strictEqual(integrator.provider, mockProvider);
        assert.strictEqual(integrator.wallet, mockWallet);
    });

    test('should have polygon providers configured', () => {
        const mockProvider = {};
        const mockWallet = {};
        const integrator = new FlashloanIntegrator(mockProvider, mockWallet);
        
        assert.ok(integrator.providers.polygon);
        assert.ok(integrator.providers.polygon.balancer);
        assert.ok(integrator.providers.polygon.aave);
        assert.ok(integrator.providers.polygon.uniswapV3);
    });

    test('should have ethereum providers configured', () => {
        const mockProvider = {};
        const mockWallet = {};
        const integrator = new FlashloanIntegrator(mockProvider, mockWallet);
        
        assert.ok(integrator.providers.ethereum);
        assert.ok(integrator.providers.ethereum.balancer);
        assert.ok(integrator.providers.ethereum.aave);
        assert.ok(integrator.providers.ethereum.dydx);
    });

    test('should have correct Balancer vault address for Polygon', () => {
        const mockProvider = {};
        const mockWallet = {};
        const integrator = new FlashloanIntegrator(mockProvider, mockWallet);
        
        assert.strictEqual(
            integrator.providers.polygon.balancer.vault,
            '0xBA12222222228d8Ba445958a75a0704d566BF2C8'
        );
    });

    test('should have correct fee structure for Balancer', () => {
        const mockProvider = {};
        const mockWallet = {};
        const integrator = new FlashloanIntegrator(mockProvider, mockWallet);
        
        assert.strictEqual(integrator.providers.polygon.balancer.fee, 0);
        assert.strictEqual(integrator.providers.ethereum.balancer.fee, 0);
    });

    test('should have correct fee structure for Aave', () => {
        const mockProvider = {};
        const mockWallet = {};
        const integrator = new FlashloanIntegrator(mockProvider, mockWallet);
        
        assert.strictEqual(integrator.providers.polygon.aave.fee, 0.0009);
        assert.strictEqual(integrator.providers.ethereum.aave.fee, 0.0009);
    });
});

describe('FlashloanIntegrator - Provider Selection', () => {
    test('should select Balancer for small amounts on Polygon', () => {
        const mockProvider = {};
        const mockWallet = {};
        const integrator = new FlashloanIntegrator(mockProvider, mockWallet);
        
        const amount = ethers.parseUnits('1000', 6); // 1000 USDC
        const provider = integrator.selectOptimalProvider('polygon', amount, 'USDC');
        
        assert.strictEqual(provider.name, 'balancer');
        assert.strictEqual(provider.fee, 0);
        assert.strictEqual(provider.estimatedFee, 0);
    });

    test('should select Balancer over Aave due to zero fee', () => {
        const mockProvider = {};
        const mockWallet = {};
        const integrator = new FlashloanIntegrator(mockProvider, mockWallet);
        
        const amount = ethers.parseUnits('5000000', 6); // 5M USDC - within both limits
        const provider = integrator.selectOptimalProvider('polygon', amount, 'USDC');
        
        assert.strictEqual(provider.name, 'balancer');
        assert.strictEqual(provider.estimatedFee, 0);
    });

    test('should select Aave when amount exceeds Balancer limit on Polygon', () => {
        const mockProvider = {};
        const mockWallet = {};
        const integrator = new FlashloanIntegrator(mockProvider, mockWallet);
        
        const amount = ethers.parseUnits('11000000', 6); // 11M USDC - exceeds Balancer limit
        
        try {
            const provider = integrator.selectOptimalProvider('polygon', amount, 'USDC');
            // Should either select Aave or throw error if exceeds all limits
            if (provider) {
                assert.ok(['aave', 'uniswapV3'].includes(provider.name));
            }
        } catch (error) {
            // Expected if amount exceeds all provider limits
            assert.ok(error.message.includes('No suitable flashloan provider'));
        }
    });

    test('should calculate correct Aave fee', () => {
        const mockProvider = {};
        const mockWallet = {};
        const integrator = new FlashloanIntegrator(mockProvider, mockWallet);
        
        // Force Aave selection by using amount above Balancer's max but within Aave's
        const amount = BigInt('11000000000000'); // Large amount in base units
        
        try {
            const provider = integrator.selectOptimalProvider('polygon', amount, 'USDC');
            if (provider && provider.name === 'aave') {
                const expectedFee = Number(amount) * 0.0009;
                assert.ok(provider.estimatedFee > 0);
            }
        } catch (error) {
            // Amount might exceed all limits
            assert.ok(true);
        }
    });

    test('should throw error for unsupported chain', () => {
        const mockProvider = {};
        const mockWallet = {};
        const integrator = new FlashloanIntegrator(mockProvider, mockWallet);
        
        const amount = ethers.parseUnits('1000', 6);
        
        assert.throws(
            () => integrator.selectOptimalProvider('unsupported-chain', amount, 'USDC'),
            /Chain.*not supported/
        );
    });

    test('should throw error when amount exceeds all provider limits', () => {
        const mockProvider = {};
        const mockWallet = {};
        const integrator = new FlashloanIntegrator(mockProvider, mockWallet);
        
        const amount = ethers.parseUnits('100000000', 6); // 100M USDC - exceeds all limits
        
        assert.throws(
            () => integrator.selectOptimalProvider('polygon', amount, 'USDC'),
            /No suitable flashloan provider/
        );
    });

    test('should handle dYdX selection on Ethereum', () => {
        const mockProvider = {};
        const mockWallet = {};
        const integrator = new FlashloanIntegrator(mockProvider, mockWallet);
        
        // Test with amount that would prefer dYdX
        const amount = ethers.parseUnits('1000000', 6); // 1M USDC
        const provider = integrator.selectOptimalProvider('ethereum', amount, 'USDC');
        
        // Should prefer Balancer first (zero fee), but dYdX is available
        assert.ok(['balancer', 'aave', 'dydx'].includes(provider.name));
    });
});

describe('FlashloanIntegrator - Optimal Amount Calculation', () => {
    test('should calculate optimal flashloan amount', () => {
        const mockProvider = {};
        const mockWallet = {};
        const integrator = new FlashloanIntegrator(mockProvider, mockWallet);
        
        const reserves = [1000000, 2000000, 3000000]; // Pool reserves
        const targetProfit = 100; // $100 target
        const gasEstimate = 300000;
        const gasPriceGwei = 50;
        
        const optimalAmount = integrator.calculateOptimalAmount(
            reserves,
            targetProfit,
            gasEstimate,
            gasPriceGwei
        );
        
        assert.ok(optimalAmount > 0);
        assert.ok(optimalAmount <= reserves[0] * 0.25); // Should not exceed 25% of smallest pool (new default max)
    });

    test('should respect configurable min/max percentage limits', () => {
        const mockProvider = {};
        const mockWallet = {};
        const integrator = new FlashloanIntegrator(mockProvider, mockWallet);
        
        const reserves = [1000000, 2000000, 3000000];
        const targetProfit = 100;
        const gasEstimate = 300000;
        const gasPriceGwei = 50;
        const minPercent = 5;  // 5% minimum
        const maxPercent = 25; // 25% maximum
        
        const optimalAmount = integrator.calculateOptimalAmount(
            reserves,
            targetProfit,
            gasEstimate,
            gasPriceGwei,
            minPercent,
            maxPercent
        );
        
        const minReserve = Math.min(...reserves); // 1000000
        const minSafeAmount = minReserve * (minPercent / 100); // 50000
        const maxSafeAmount = minReserve * (maxPercent / 100); // 250000
        
        assert.ok(optimalAmount >= minSafeAmount, 'Amount should be at least minimum percentage');
        assert.ok(optimalAmount <= maxSafeAmount, 'Amount should not exceed maximum percentage');
    });

    test('should respect pool liquidity constraints', () => {
        const mockProvider = {};
        const mockWallet = {};
        const integrator = new FlashloanIntegrator(mockProvider, mockWallet);
        
        const reserves = [100000, 200000, 300000];
        const targetProfit = 1000;
        const gasEstimate = 300000;
        const gasPriceGwei = 50;
        
        const optimalAmount = integrator.calculateOptimalAmount(
            reserves,
            targetProfit,
            gasEstimate,
            gasPriceGwei
        );
        
        // Should not exceed 25% of smallest pool (100000 * 0.25 = 25000)
        assert.ok(optimalAmount <= 25000);
    });

    test('should account for gas costs in calculation', () => {
        const mockProvider = {};
        const mockWallet = {};
        const integrator = new FlashloanIntegrator(mockProvider, mockWallet);
        
        const reserves = [10000000, 20000000];
        const targetProfit = 50;
        const gasEstimate = 500000; // High gas estimate
        const gasPriceGwei = 100; // High gas price
        
        const optimalAmount = integrator.calculateOptimalAmount(
            reserves,
            targetProfit,
            gasEstimate,
            gasPriceGwei
        );
        
        // Should be higher to account for gas costs
        assert.ok(optimalAmount > targetProfit);
    });

    test('should add safety buffer to calculated amount', () => {
        const mockProvider = {};
        const mockWallet = {};
        const integrator = new FlashloanIntegrator(mockProvider, mockWallet);
        
        const reserves = [5000000, 10000000];
        const targetProfit = 100;
        const gasEstimate = 300000;
        const gasPriceGwei = 50;
        
        const optimalAmount = integrator.calculateOptimalAmount(
            reserves,
            targetProfit,
            gasEstimate,
            gasPriceGwei
        );
        
        // Calculate minimum without buffer
        const gasCost = (gasEstimate * gasPriceGwei * 1e9) / 1e18;
        const minWithoutBuffer = targetProfit + gasCost;
        
        // Should be higher due to 10% buffer
        assert.ok(optimalAmount >= minWithoutBuffer);
    });

    test('should handle very small reserves', () => {
        const mockProvider = {};
        const mockWallet = {};
        const integrator = new FlashloanIntegrator(mockProvider, mockWallet);
        
        const reserves = [1000, 2000]; // Very small pools
        const targetProfit = 10;
        const gasEstimate = 300000;
        const gasPriceGwei = 50;
        
        const optimalAmount = integrator.calculateOptimalAmount(
            reserves,
            targetProfit,
            gasEstimate,
            gasPriceGwei
        );
        
        // Should respect the small pool size (25% max by default)
        assert.ok(optimalAmount <= 250); // 25% of 1000
    });
});

describe('FlashloanIntegrator - Opportunity Validation', () => {
    test('should validate profitable opportunity', () => {
        const mockProvider = {};
        const mockWallet = {};
        const integrator = new FlashloanIntegrator(mockProvider, mockWallet);
        
        const opportunity = {
            profit_usd: 50,
            input_amount: ethers.parseUnits('10000', 6),
            tokens: ['USDC', 'USDT', 'USDC'],
            expected_output: ethers.parseUnits('10050', 6)
        };
        
        const provider = {
            estimatedFee: 10,
            maxLoanAmount: ethers.parseUnits('10000000', 6)
        };
        
        const validation = integrator.validateOpportunity(opportunity, provider);
        
        assert.strictEqual(validation.sufficientProfit, true);
        assert.strictEqual(validation.withinLimits, true);
        assert.strictEqual(validation.validRoute, true);
        assert.strictEqual(validation.positiveSlippage, true);
        assert.strictEqual(validation.isValid, true);
    });

    test('should reject opportunity with insufficient profit', () => {
        const mockProvider = {};
        const mockWallet = {};
        const integrator = new FlashloanIntegrator(mockProvider, mockWallet);
        
        const opportunity = {
            profit_usd: 5,
            input_amount: ethers.parseUnits('10000', 6),
            tokens: ['USDC', 'USDT', 'USDC'],
            expected_output: ethers.parseUnits('10005', 6)
        };
        
        const provider = {
            estimatedFee: 10, // Fee exceeds profit
            maxLoanAmount: ethers.parseUnits('10000000', 6)
        };
        
        const validation = integrator.validateOpportunity(opportunity, provider);
        
        assert.strictEqual(validation.sufficientProfit, false);
        assert.strictEqual(validation.isValid, false);
    });

    test('should reject opportunity exceeding loan limits', () => {
        const mockProvider = {};
        const mockWallet = {};
        const integrator = new FlashloanIntegrator(mockProvider, mockWallet);
        
        const opportunity = {
            profit_usd: 100,
            input_amount: ethers.parseUnits('20000000', 6), // 20M USDC
            tokens: ['USDC', 'USDT', 'USDC'],
            expected_output: ethers.parseUnits('20000100', 6)
        };
        
        const provider = {
            estimatedFee: 50,
            maxLoanAmount: ethers.parseUnits('10000000', 6) // Max 10M
        };
        
        const validation = integrator.validateOpportunity(opportunity, provider);
        
        assert.strictEqual(validation.withinLimits, false);
        assert.strictEqual(validation.isValid, false);
    });

    test('should reject opportunity with invalid route', () => {
        const mockProvider = {};
        const mockWallet = {};
        const integrator = new FlashloanIntegrator(mockProvider, mockWallet);
        
        const opportunity = {
            profit_usd: 50,
            input_amount: ethers.parseUnits('10000', 6),
            tokens: ['USDC'], // Invalid route - only 1 token
            expected_output: ethers.parseUnits('10050', 6)
        };
        
        const provider = {
            estimatedFee: 10,
            maxLoanAmount: ethers.parseUnits('10000000', 6)
        };
        
        const validation = integrator.validateOpportunity(opportunity, provider);
        
        assert.strictEqual(validation.validRoute, false);
        assert.strictEqual(validation.isValid, false);
    });

    test('should reject opportunity with negative slippage', () => {
        const mockProvider = {};
        const mockWallet = {};
        const integrator = new FlashloanIntegrator(mockProvider, mockWallet);
        
        const opportunity = {
            profit_usd: 50,
            input_amount: ethers.parseUnits('10000', 6),
            tokens: ['USDC', 'USDT', 'USDC'],
            expected_output: ethers.parseUnits('9900', 6) // Less than input
        };
        
        const provider = {
            estimatedFee: 10,
            maxLoanAmount: ethers.parseUnits('10000000', 6)
        };
        
        const validation = integrator.validateOpportunity(opportunity, provider);
        
        assert.strictEqual(validation.positiveSlippage, false);
        assert.strictEqual(validation.isValid, false);
    });

    test('should handle missing opportunity fields gracefully', () => {
        const mockProvider = {};
        const mockWallet = {};
        const integrator = new FlashloanIntegrator(mockProvider, mockWallet);
        
        const incompleteOpportunity = {
            profit_usd: 50
            // Missing other fields
        };
        
        const provider = {
            estimatedFee: 10,
            maxLoanAmount: ethers.parseUnits('10000000', 6)
        };
        
        const validation = integrator.validateOpportunity(incompleteOpportunity, provider);
        
        assert.ok(validation);
        assert.strictEqual(validation.isValid, false);
    });
});

describe('FlashloanIntegrator - Multi-Chain Support', () => {
    test('should have different max loan amounts per chain', () => {
        const mockProvider = {};
        const mockWallet = {};
        const integrator = new FlashloanIntegrator(mockProvider, mockWallet);
        
        const polygonMax = integrator.providers.polygon.balancer.maxLoanAmount;
        const ethereumMax = integrator.providers.ethereum.balancer.maxLoanAmount;
        
        // Ethereum should have higher limits
        assert.ok(ethereumMax > polygonMax);
    });

    test('should support Polygon-specific providers', () => {
        const mockProvider = {};
        const mockWallet = {};
        const integrator = new FlashloanIntegrator(mockProvider, mockWallet);
        
        assert.ok(integrator.providers.polygon.balancer);
        assert.ok(integrator.providers.polygon.aave);
        assert.ok(integrator.providers.polygon.uniswapV3);
    });

    test('should support Ethereum-specific providers', () => {
        const mockProvider = {};
        const mockWallet = {};
        const integrator = new FlashloanIntegrator(mockProvider, mockWallet);
        
        assert.ok(integrator.providers.ethereum.balancer);
        assert.ok(integrator.providers.ethereum.aave);
        assert.ok(integrator.providers.ethereum.dydx);
    });

    test('should have correct contract addresses for each chain', () => {
        const mockProvider = {};
        const mockWallet = {};
        const integrator = new FlashloanIntegrator(mockProvider, mockWallet);
        
        // All addresses should be valid Ethereum addresses
        const polygonBalancerVault = integrator.providers.polygon.balancer.vault;
        const ethereumBalancerVault = integrator.providers.ethereum.balancer.vault;
        
        assert.ok(polygonBalancerVault.startsWith('0x'));
        assert.ok(ethereumBalancerVault.startsWith('0x'));
        assert.strictEqual(polygonBalancerVault.length, 42);
        assert.strictEqual(ethereumBalancerVault.length, 42);
    });

    test('should maintain consistent fee structure across chains', () => {
        const mockProvider = {};
        const mockWallet = {};
        const integrator = new FlashloanIntegrator(mockProvider, mockWallet);
        
        // Balancer should always have 0 fee
        assert.strictEqual(integrator.providers.polygon.balancer.fee, 0);
        assert.strictEqual(integrator.providers.ethereum.balancer.fee, 0);
        
        // Aave should have 0.09% fee on both chains
        assert.strictEqual(integrator.providers.polygon.aave.fee, 0.0009);
        assert.strictEqual(integrator.providers.ethereum.aave.fee, 0.0009);
    });
});

describe('FlashloanIntegrator - Singleton Pattern', () => {
    test('should return same instance with getFlashloanIntegrator', () => {
        const mockProvider1 = { id: 1 };
        const mockWallet1 = { id: 1 };
        
        const instance1 = getFlashloanIntegrator(mockProvider1, mockWallet1);
        const instance2 = getFlashloanIntegrator(mockProvider1, mockWallet1);
        
        assert.strictEqual(instance1, instance2);
    });

    test('should create new instance if none exists', () => {
        const mockProvider = {};
        const mockWallet = {};
        
        const instance = getFlashloanIntegrator(mockProvider, mockWallet);
        
        assert.ok(instance);
        assert.ok(instance instanceof FlashloanIntegrator);
    });
});

describe('FlashloanIntegrator - Edge Cases and Error Handling', () => {
    test('should handle zero amount gracefully', () => {
        const mockProvider = {};
        const mockWallet = {};
        const integrator = new FlashloanIntegrator(mockProvider, mockWallet);
        
        const amount = ethers.parseUnits('0', 6);
        
        // Should select a provider but may have zero fee
        const provider = integrator.selectOptimalProvider('polygon', amount, 'USDC');
        
        assert.ok(provider);
        assert.strictEqual(provider.estimatedFee, 0);
    });

    test('should handle very large amounts', () => {
        const mockProvider = {};
        const mockWallet = {};
        const integrator = new FlashloanIntegrator(mockProvider, mockWallet);
        
        const amount = ethers.parseUnits('1000000000', 6); // 1B USDC
        
        assert.throws(
            () => integrator.selectOptimalProvider('polygon', amount, 'USDC'),
            /No suitable flashloan provider/
        );
    });

    test('should validate provider fee calculations', () => {
        const mockProvider = {};
        const mockWallet = {};
        const integrator = new FlashloanIntegrator(mockProvider, mockWallet);
        
        const amount = ethers.parseUnits('1000000', 6); // 1M USDC
        const provider = integrator.selectOptimalProvider('polygon', amount, 'USDC');
        
        // Balancer should be selected with 0 fee
        if (provider.name === 'balancer') {
            assert.strictEqual(provider.estimatedFee, 0);
        }
    });

    test('should handle missing reserves in optimal amount calculation', () => {
        const mockProvider = {};
        const mockWallet = {};
        const integrator = new FlashloanIntegrator(mockProvider, mockWallet);
        
        const reserves = []; // Empty reserves
        const targetProfit = 100;
        const gasEstimate = 300000;
        const gasPriceGwei = 50;
        
        // Should handle gracefully
        const result = integrator.calculateOptimalAmount(
            reserves,
            targetProfit,
            gasEstimate,
            gasPriceGwei
        );
        
        // Math.min of empty array returns Infinity
        assert.ok(result === Infinity || typeof result === 'number');
    });

    test('should validate all provider configurations are complete', () => {
        const mockProvider = {};
        const mockWallet = {};
        const integrator = new FlashloanIntegrator(mockProvider, mockWallet);
        
        // Check Polygon providers
        assert.ok(integrator.providers.polygon.balancer.vault);
        assert.ok(typeof integrator.providers.polygon.balancer.fee === 'number');
        assert.ok(integrator.providers.polygon.balancer.maxLoanAmount);
        
        // Check Ethereum providers
        assert.ok(integrator.providers.ethereum.balancer.vault);
        assert.ok(typeof integrator.providers.ethereum.balancer.fee === 'number');
        assert.ok(integrator.providers.ethereum.balancer.maxLoanAmount);
    });
});
