/**
 * Comprehensive Tests for OpportunityScorer
 * Tests ML-powered scoring system for 95-99.9% success rate validation
 * 
 * Test Coverage:
 * 1. Scoring algorithm accuracy
 * 2. Component score calculations
 * 3. Risk assessment
 * 4. Profit optimization
 * 5. Classification and recommendations
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import { OpportunityScorer } from '../src/utils/opportunityScorer.js';

describe('OpportunityScorer - Initialization and Configuration', () => {
    test('should initialize with default configuration', () => {
        const scorer = new OpportunityScorer();
        
        assert.ok(scorer);
        assert.strictEqual(scorer.config.minScore, 70);
        assert.strictEqual(scorer.config.profitWeight, 0.25);
        assert.strictEqual(scorer.config.riskWeight, 0.25);
        assert.strictEqual(scorer.config.liquidityWeight, 0.20);
        assert.strictEqual(scorer.config.successWeight, 0.30);
        assert.strictEqual(scorer.config.targetSuccessRate, 0.95);
        assert.strictEqual(scorer.config.enableMLFiltering, true);
    });

    test('should accept custom configuration', () => {
        const customConfig = {
            minScore: 80,
            profitWeight: 0.30,
            riskWeight: 0.30,
            liquidityWeight: 0.20,
            successWeight: 0.20,
            targetSuccessRate: 0.99
        };
        
        const scorer = new OpportunityScorer(customConfig);
        
        assert.strictEqual(scorer.config.minScore, 80);
        assert.strictEqual(scorer.config.profitWeight, 0.30);
        assert.strictEqual(scorer.config.targetSuccessRate, 0.99);
    });

    test('should initialize with empty statistics', () => {
        const scorer = new OpportunityScorer();
        
        assert.strictEqual(scorer.stats.totalScored, 0);
        assert.strictEqual(scorer.stats.aboveThreshold, 0);
        assert.strictEqual(scorer.stats.belowThreshold, 0);
        assert.strictEqual(scorer.stats.avgScore, 0);
        assert.ok(Array.isArray(scorer.stats.predictions));
        assert.strictEqual(scorer.stats.predictions.length, 0);
    });

    test('should have correct threshold classifications', () => {
        const scorer = new OpportunityScorer();
        
        assert.strictEqual(scorer.thresholds.excellent, 85);
        assert.strictEqual(scorer.thresholds.good, 75);
        assert.strictEqual(scorer.thresholds.moderate, 65);
        assert.strictEqual(scorer.thresholds.poor, 50);
    });

    test('should validate weight sum equals 1.0', () => {
        const scorer = new OpportunityScorer();
        const weightSum = 
            scorer.config.profitWeight +
            scorer.config.riskWeight +
            scorer.config.liquidityWeight +
            scorer.config.successWeight;
        
        assert.ok(Math.abs(weightSum - 1.0) < 0.01, 'Weights should sum to approximately 1.0');
    });
});

describe('OpportunityScorer - Profit Score Calculation', () => {
    test('should calculate profit score for high-profit opportunity', () => {
        const scorer = new OpportunityScorer();
        const opportunity = {
            profit_usd: 50,
            gas_estimate: 300000,
            gas_price: 50,
            gas_cost_usd: 2,
            chain: 'polygon'
        };
        
        const profitScore = scorer.calculateProfitScore(opportunity);
        
        assert.ok(profitScore > 80, `Expected profit score > 80, got ${profitScore}`);
        assert.ok(profitScore <= 100, 'Profit score should not exceed 100');
    });

    test('should penalize low-profit opportunities', () => {
        const scorer = new OpportunityScorer();
        const lowProfitOpp = {
            profit_usd: 3,
            gas_cost_usd: 1,
            chain: 'polygon'
        };
        
        const profitScore = scorer.calculateProfitScore(lowProfitOpp);
        
        assert.ok(profitScore < 50, `Expected profit score < 50, got ${profitScore}`);
        assert.ok(profitScore >= 0, 'Profit score should not be negative');
    });

    test('should return zero score for negative profit', () => {
        const scorer = new OpportunityScorer();
        const negativeOpp = {
            profit_usd: 2,
            gas_cost_usd: 5,
            chain: 'polygon'
        };
        
        const profitScore = scorer.calculateProfitScore(negativeOpp);
        
        assert.strictEqual(profitScore, 0, 'Negative profit should yield 0 score');
    });

    test('should adjust score based on profit-to-gas ratio', () => {
        const scorer = new OpportunityScorer();
        
        // High profit-to-gas ratio
        const highRatioOpp = {
            profit_usd: 20,
            gas_cost_usd: 2,
            chain: 'polygon'
        };
        
        // Low profit-to-gas ratio
        const lowRatioOpp = {
            profit_usd: 3,
            gas_cost_usd: 2,
            chain: 'polygon'
        };
        
        const highRatioScore = scorer.calculateProfitScore(highRatioOpp);
        const lowRatioScore = scorer.calculateProfitScore(lowRatioOpp);
        
        assert.ok(highRatioScore > lowRatioScore, 'High profit-to-gas ratio should score higher');
    });

    test('should handle opportunities without gas cost data', () => {
        const scorer = new OpportunityScorer();
        const opportunity = {
            profit_usd: 15,
            gas_estimate: 250000,
            gas_price: 40,
            chain: 'ethereum'
        };
        
        const profitScore = scorer.calculateProfitScore(opportunity);
        
        assert.ok(profitScore > 0, 'Should calculate score even without explicit gas_cost_usd');
        assert.ok(profitScore <= 100, 'Score should be within valid range');
    });
});

describe('OpportunityScorer - Risk Score Calculation', () => {
    test('should calculate risk score for low-risk opportunity', () => {
        const scorer = new OpportunityScorer();
        const lowRiskOpp = {
            slippage_risk: 0.02,
            mev_risk: 0.05,
            contract_risk: 0.01,
            congestion: 0.1,
            hop_count: 2
        };
        
        const riskScore = scorer.calculateRiskScore(lowRiskOpp);
        
        assert.ok(riskScore > 80, `Expected risk score > 80 for low risk, got ${riskScore}`);
        assert.ok(riskScore <= 100, 'Risk score should not exceed 100');
    });

    test('should penalize high-risk opportunities', () => {
        const scorer = new OpportunityScorer();
        const highRiskOpp = {
            slippage_risk: 0.3,
            mev_risk: 0.4,
            contract_risk: 0.2,
            congestion: 0.5,
            hop_count: 2
        };
        
        const riskScore = scorer.calculateRiskScore(highRiskOpp);
        
        assert.ok(riskScore < 60, `Expected risk score < 60 for high risk, got ${riskScore}`);
    });

    test('should penalize complex multi-hop routes', () => {
        const scorer = new OpportunityScorer();
        
        const simpleRoute = {
            slippage_risk: 0.05,
            mev_risk: 0.05,
            contract_risk: 0.05,
            congestion: 0.1,
            hop_count: 2
        };
        
        const complexRoute = {
            slippage_risk: 0.05,
            mev_risk: 0.05,
            contract_risk: 0.05,
            congestion: 0.1,
            hop_count: 5
        };
        
        const simpleScore = scorer.calculateRiskScore(simpleRoute);
        const complexScore = scorer.calculateRiskScore(complexRoute);
        
        assert.ok(simpleScore > complexScore, 'Simple routes should score higher than complex ones');
    });

    test('should handle missing risk factors gracefully', () => {
        const scorer = new OpportunityScorer();
        const minimalOpp = {
            hop_count: 3
        };
        
        const riskScore = scorer.calculateRiskScore(minimalOpp);
        
        assert.ok(riskScore >= 0, 'Should handle missing risk factors');
        assert.ok(riskScore <= 100, 'Score should be within valid range');
    });

    test('should weight slippage risk heavily', () => {
        const scorer = new OpportunityScorer();
        
        const highSlippageOpp = {
            slippage_risk: 0.5,
            mev_risk: 0.0,
            contract_risk: 0.0,
            congestion: 0.0,
            hop_count: 2
        };
        
        const riskScore = scorer.calculateRiskScore(highSlippageOpp);
        
        // Slippage is weighted at 35%, so high slippage should significantly impact score
        assert.ok(riskScore < 70, `High slippage should significantly reduce score, got ${riskScore}`);
    });
});

describe('OpportunityScorer - Liquidity Score Calculation', () => {
    test('should calculate liquidity score for high-TVL pools', () => {
        const scorer = new OpportunityScorer();
        const highTVLOpp = {
            tvl_usd: 5000000,
            volume_24h: 500000,
            liquidity_depth: 50000,
            input_amount: 10000
        };
        
        const liquidityScore = scorer.calculateLiquidityScore(highTVLOpp);
        
        assert.ok(liquidityScore > 70, `Expected liquidity score > 70, got ${liquidityScore}`);
        assert.ok(liquidityScore <= 100, 'Liquidity score should not exceed 100');
    });

    test('should penalize low-TVL pools', () => {
        const scorer = new OpportunityScorer();
        const lowTVLOpp = {
            tvl_usd: 5000,
            volume_24h: 100,
            liquidity_depth: 500,
            input_amount: 1000
        };
        
        const liquidityScore = scorer.calculateLiquidityScore(lowTVLOpp);
        
        assert.ok(liquidityScore < 30, `Expected liquidity score < 30, got ${liquidityScore}`);
    });

    test('should factor in volume-to-TVL ratio', () => {
        const scorer = new OpportunityScorer();
        
        const highVolumeOpp = {
            tvl_usd: 1000000,
            volume_24h: 200000, // 20% daily volume
            liquidity_depth: 100000,
            input_amount: 10000
        };
        
        const lowVolumeOpp = {
            tvl_usd: 1000000,
            volume_24h: 10000, // 1% daily volume
            liquidity_depth: 100000,
            input_amount: 10000
        };
        
        const highVolumeScore = scorer.calculateLiquidityScore(highVolumeOpp);
        const lowVolumeScore = scorer.calculateLiquidityScore(lowVolumeOpp);
        
        assert.ok(highVolumeScore > lowVolumeScore, 'Higher volume should yield better score');
    });

    test('should consider liquidity depth relative to input amount', () => {
        const scorer = new OpportunityScorer();
        
        const sufficientDepth = {
            tvl_usd: 500000,
            volume_24h: 50000,
            liquidity_depth: 50000,
            input_amount: 5000
        };
        
        const insufficientDepth = {
            tvl_usd: 500000,
            volume_24h: 50000,
            liquidity_depth: 3000,
            input_amount: 5000
        };
        
        const sufficientScore = scorer.calculateLiquidityScore(sufficientDepth);
        const insufficientScore = scorer.calculateLiquidityScore(insufficientDepth);
        
        assert.ok(sufficientScore > insufficientScore, 'Sufficient depth should score higher');
    });

    test('should handle edge case of zero TVL', () => {
        const scorer = new OpportunityScorer();
        const zeroTVLOpp = {
            tvl_usd: 0,
            volume_24h: 0,
            liquidity_depth: 0,
            input_amount: 1000
        };
        
        const liquidityScore = scorer.calculateLiquidityScore(zeroTVLOpp);
        
        assert.strictEqual(liquidityScore, 0, 'Zero TVL should yield zero score');
    });
});

describe('OpportunityScorer - Success Score Calculation', () => {
    test('should calculate success score from historical data', () => {
        const scorer = new OpportunityScorer();
        const provenOpp = {
            historical_success_rate: 0.92,
            confidence_score: 0.88,
            executions_24h: 25,
            gas_price: 40
        };
        
        const successScore = scorer.calculateSuccessScore(provenOpp);
        
        assert.ok(successScore > 80, `Expected success score > 80, got ${successScore}`);
        assert.ok(successScore <= 100, 'Success score should not exceed 100');
    });

    test('should penalize untested routes', () => {
        const scorer = new OpportunityScorer();
        const untestedOpp = {
            historical_success_rate: 0.75,
            confidence_score: 0.70,
            executions_24h: 0,
            gas_price: 50
        };
        
        const successScore = scorer.calculateSuccessScore(untestedOpp);
        
        // Should be penalized by 20% for being untested
        assert.ok(successScore < 60, `Untested route should score lower, got ${successScore}`);
    });

    test('should bonus frequently executed routes', () => {
        const scorer = new OpportunityScorer();
        
        const frequentOpp = {
            historical_success_rate: 0.85,
            confidence_score: 0.82,
            executions_24h: 50,
            gas_price: 45
        };
        
        const infrequentOpp = {
            historical_success_rate: 0.85,
            confidence_score: 0.82,
            executions_24h: 3,
            gas_price: 45
        };
        
        const frequentScore = scorer.calculateSuccessScore(frequentOpp);
        const infrequentScore = scorer.calculateSuccessScore(infrequentOpp);
        
        assert.ok(frequentScore >= infrequentScore, 'Frequently executed routes should score at least as high');
    });

    test('should factor in gas price conditions', () => {
        const scorer = new OpportunityScorer();
        
        const lowGasOpp = {
            historical_success_rate: 0.85,
            confidence_score: 0.80,
            executions_24h: 10,
            gas_price: 30
        };
        
        const highGasOpp = {
            historical_success_rate: 0.85,
            confidence_score: 0.80,
            executions_24h: 10,
            gas_price: 200
        };
        
        const lowGasScore = scorer.calculateSuccessScore(lowGasOpp);
        const highGasScore = scorer.calculateSuccessScore(highGasOpp);
        
        assert.ok(lowGasScore >= highGasScore, 'High gas should not improve success score');
    });

    test('should use default historical rate when missing', () => {
        const scorer = new OpportunityScorer();
        const minimalOpp = {
            executions_24h: 5
        };
        
        const successScore = scorer.calculateSuccessScore(minimalOpp);
        
        assert.ok(successScore > 0, 'Should use default values for missing data');
        assert.ok(successScore <= 100, 'Score should be within valid range');
    });
});

describe('OpportunityScorer - Overall Scoring and Classification', () => {
    test('should score excellent opportunity correctly', () => {
        const scorer = new OpportunityScorer();
        const excellentOpp = {
            profit_usd: 45,
            gas_cost_usd: 2,
            slippage_risk: 0.02,
            mev_risk: 0.03,
            contract_risk: 0.01,
            congestion: 0.05,
            tvl_usd: 3000000,
            volume_24h: 400000,
            liquidity_depth: 300000,
            input_amount: 10000,
            historical_success_rate: 0.95,
            confidence_score: 0.92,
            executions_24h: 40,
            gas_price: 35,
            hop_count: 2,
            chain: 'polygon'
        };
        
        const result = scorer.scoreOpportunity(excellentOpp);
        
        assert.ok(result.overall_score >= 85, `Expected excellent score >= 85, got ${result.overall_score}`);
        assert.strictEqual(result.classification, 'EXCELLENT');
        assert.strictEqual(result.should_execute, true);
        assert.ok(result.confidence > 0.7, 'Should have high confidence');
        assert.ok(result.recommendation.includes('🟢'), 'Should recommend execution');
    });

    test('should reject poor opportunity correctly', () => {
        const scorer = new OpportunityScorer();
        const poorOpp = {
            profit_usd: 2,
            gas_cost_usd: 3,
            slippage_risk: 0.4,
            mev_risk: 0.5,
            contract_risk: 0.3,
            congestion: 0.6,
            tvl_usd: 5000,
            volume_24h: 100,
            liquidity_depth: 500,
            input_amount: 1000,
            historical_success_rate: 0.45,
            confidence_score: 0.40,
            executions_24h: 0,
            gas_price: 180,
            hop_count: 5,
            chain: 'polygon'
        };
        
        const result = scorer.scoreOpportunity(poorOpp);
        
        assert.ok(result.overall_score < 50, `Expected poor score < 50, got ${result.overall_score}`);
        assert.ok(['POOR', 'SKIP'].includes(result.classification));
        assert.strictEqual(result.should_execute, false);
        assert.ok(result.recommendation.includes('🔴') || result.recommendation.includes('🟠'), 
            'Should not recommend execution');
    });

    test('should track statistics after scoring', () => {
        const scorer = new OpportunityScorer();
        const opp1 = { profit_usd: 25, gas_cost_usd: 2, chain: 'polygon' };
        const opp2 = { profit_usd: 8, gas_cost_usd: 1.5, chain: 'polygon' };
        const opp3 = { profit_usd: 2, gas_cost_usd: 3, chain: 'polygon' };
        
        scorer.scoreOpportunity(opp1);
        scorer.scoreOpportunity(opp2);
        scorer.scoreOpportunity(opp3);
        
        assert.strictEqual(scorer.stats.totalScored, 3);
        assert.ok(scorer.stats.avgScore > 0, 'Should calculate average score');
        assert.strictEqual(scorer.stats.predictions.length, 3);
    });

    test('should calculate confidence based on component variance', () => {
        const scorer = new OpportunityScorer();
        
        // Balanced opportunity - low variance
        const balancedOpp = {
            profit_usd: 20,
            gas_cost_usd: 2,
            slippage_risk: 0.05,
            mev_risk: 0.05,
            tvl_usd: 1000000,
            volume_24h: 100000,
            historical_success_rate: 0.85,
            executions_24h: 15,
            chain: 'polygon'
        };
        
        // Imbalanced opportunity - high variance
        const imbalancedOpp = {
            profit_usd: 50,
            gas_cost_usd: 1,
            slippage_risk: 0.45,
            mev_risk: 0.5,
            tvl_usd: 8000,
            volume_24h: 200,
            historical_success_rate: 0.50,
            executions_24h: 1,
            chain: 'polygon'
        };
        
        const balancedResult = scorer.scoreOpportunity(balancedOpp);
        const imbalancedResult = scorer.scoreOpportunity(imbalancedOpp);
        
        assert.ok(balancedResult.confidence >= imbalancedResult.confidence, 
            'Balanced opportunities should have higher confidence');
    });

    test('should provide component breakdown', () => {
        const scorer = new OpportunityScorer();
        const opp = {
            profit_usd: 15,
            gas_cost_usd: 2,
            slippage_risk: 0.1,
            tvl_usd: 500000,
            historical_success_rate: 0.80,
            chain: 'polygon'
        };
        
        const result = scorer.scoreOpportunity(opp);
        
        assert.ok(result.components);
        assert.ok(typeof result.components.profit === 'number');
        assert.ok(typeof result.components.risk === 'number');
        assert.ok(typeof result.components.liquidity === 'number');
        assert.ok(typeof result.components.success === 'number');
        assert.ok(result.components.profit >= 0 && result.components.profit <= 100);
        assert.ok(result.components.risk >= 0 && result.components.risk <= 100);
        assert.ok(result.components.liquidity >= 0 && result.components.liquidity <= 100);
        assert.ok(result.components.success >= 0 && result.components.success <= 100);
    });
});

describe('OpportunityScorer - Statistics and Reporting', () => {
    test('should return comprehensive statistics', () => {
        const scorer = new OpportunityScorer();
        
        // Score multiple opportunities
        for (let i = 0; i < 10; i++) {
            const opp = {
                profit_usd: 10 + i * 5,
                gas_cost_usd: 2,
                chain: 'polygon'
            };
            scorer.scoreOpportunity(opp);
        }
        
        const stats = scorer.getStats();
        
        assert.ok(stats.totalScored);
        assert.ok(stats.executionRate);
        assert.ok(stats.recentAvgScore);
        assert.ok(stats.targetSuccessRate);
        assert.strictEqual(stats.totalScored, 10);
    });

    test('should classify scores correctly', () => {
        const scorer = new OpportunityScorer();
        
        assert.strictEqual(scorer.classifyScore(90), 'EXCELLENT');
        assert.strictEqual(scorer.classifyScore(80), 'GOOD');
        assert.strictEqual(scorer.classifyScore(70), 'MODERATE');
        assert.strictEqual(scorer.classifyScore(55), 'POOR');
        assert.strictEqual(scorer.classifyScore(40), 'SKIP');
    });

    test('should estimate gas token prices correctly', () => {
        const scorer = new OpportunityScorer();
        
        assert.strictEqual(scorer.estimateGasTokenPrice('polygon'), 0.85);
        assert.strictEqual(scorer.estimateGasTokenPrice('ethereum'), 2500);
        assert.strictEqual(scorer.estimateGasTokenPrice('arbitrum'), 2500);
        assert.strictEqual(scorer.estimateGasTokenPrice('optimism'), 2500);
        assert.strictEqual(scorer.estimateGasTokenPrice('base'), 2500);
        assert.strictEqual(scorer.estimateGasTokenPrice('bsc'), 300);
        assert.strictEqual(scorer.estimateGasTokenPrice('unknown'), 1);
    });

    test('should generate appropriate recommendations', () => {
        const scorer = new OpportunityScorer();
        
        const excellentRec = scorer.generateRecommendation(90, 0.9, { profit_usd: 50 });
        const poorRec = scorer.generateRecommendation(45, 0.3, { profit_usd: 2 });
        
        assert.ok(excellentRec.includes('EXECUTE'));
        assert.ok(poorRec.includes('REJECT') || poorRec.includes('SKIP'));
    });

    test('should track execution rate correctly', () => {
        const scorer = new OpportunityScorer({ minScore: 70 });
        
        // Score opportunities above and below threshold
        scorer.scoreOpportunity({ profit_usd: 50, gas_cost_usd: 2, chain: 'polygon' });
        scorer.scoreOpportunity({ profit_usd: 2, gas_cost_usd: 5, chain: 'polygon' });
        scorer.scoreOpportunity({ profit_usd: 30, gas_cost_usd: 2, chain: 'polygon' });
        
        const stats = scorer.getStats();
        
        assert.ok(stats.aboveThreshold >= 0);
        assert.ok(stats.belowThreshold >= 0);
        assert.strictEqual(stats.aboveThreshold + stats.belowThreshold, stats.totalScored);
    });
});

describe('OpportunityScorer - Edge Cases and Validation', () => {
    test('should handle empty opportunity object', () => {
        const scorer = new OpportunityScorer();
        const emptyOpp = {};
        
        const result = scorer.scoreOpportunity(emptyOpp);
        
        assert.ok(result);
        assert.ok(typeof result.overall_score === 'number');
        assert.ok(result.overall_score >= 0 && result.overall_score <= 100);
    });

    test('should handle missing chain information', () => {
        const scorer = new OpportunityScorer();
        const opp = {
            profit_usd: 15,
            gas_cost_usd: 2
        };
        
        const result = scorer.scoreOpportunity(opp);
        
        assert.ok(result);
        assert.ok(result.overall_score >= 0);
    });

    test('should maintain score bounds 0-100', () => {
        const scorer = new OpportunityScorer();
        
        // Extreme positive case
        const extremePositive = {
            profit_usd: 10000,
            gas_cost_usd: 1,
            slippage_risk: 0,
            mev_risk: 0,
            tvl_usd: 100000000,
            volume_24h: 10000000,
            historical_success_rate: 1.0,
            executions_24h: 1000,
            chain: 'polygon'
        };
        
        // Extreme negative case
        const extremeNegative = {
            profit_usd: -100,
            gas_cost_usd: 50,
            slippage_risk: 1.0,
            mev_risk: 1.0,
            tvl_usd: 0,
            volume_24h: 0,
            historical_success_rate: 0,
            executions_24h: 0,
            chain: 'polygon'
        };
        
        const positiveResult = scorer.scoreOpportunity(extremePositive);
        const negativeResult = scorer.scoreOpportunity(extremeNegative);
        
        assert.ok(positiveResult.overall_score <= 100, 'Score should not exceed 100');
        assert.ok(negativeResult.overall_score >= 0, 'Score should not be negative');
    });

    test('should handle very small profit amounts', () => {
        const scorer = new OpportunityScorer();
        const microOpp = {
            profit_usd: 0.01,
            gas_cost_usd: 0.005,
            chain: 'polygon'
        };
        
        const result = scorer.scoreOpportunity(microOpp);
        
        assert.ok(result);
        assert.ok(result.overall_score >= 0);
    });

    test('should validate component weights are applied correctly', () => {
        const customWeights = {
            profitWeight: 0.40,
            riskWeight: 0.30,
            liquidityWeight: 0.15,
            successWeight: 0.15
        };
        
        const scorer = new OpportunityScorer(customWeights);
        const opp = {
            profit_usd: 100,
            gas_cost_usd: 1,
            slippage_risk: 0.01,
            mev_risk: 0.01,
            tvl_usd: 10000000,
            volume_24h: 1000000,
            historical_success_rate: 0.95,
            executions_24h: 50,
            chain: 'polygon'
        };
        
        const result = scorer.scoreOpportunity(opp);
        
        // With very high scores in all components and higher profit weight,
        // overall score should be very high
        assert.ok(result.overall_score > 85, 'Custom weights should be applied correctly');
    });
});
