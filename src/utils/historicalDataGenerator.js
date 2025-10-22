/**
 * Historical Opportunity Data Generator
 * Generates 10,000+ synthetic and real-based arbitrage opportunities for ML training
 * Based on actual DEX data patterns, spread movements, and historical performance
 */

import crypto from 'crypto';

/**
 * Generate synthetic arbitrage opportunities based on real market patterns
 * @param {number} count - Number of opportunities to generate
 * @param {Object} options - Generation options
 * @returns {Array} Array of opportunity objects
 */
export function generateHistoricalOpportunities(count = 10000, options = {}) {
    const {
        startDate = Date.now() - (7 * 24 * 60 * 60 * 1000), // 7 days ago
        endDate = Date.now(),
        chains = ['polygon', 'ethereum', 'arbitrum', 'optimism', 'base', 'bsc'],
        dexes = ['uniswap_v3', 'sushiswap', 'quickswap', 'balancer', 'curve', 'dodo'],
        tokens = ['USDC', 'USDT', 'WETH', 'WMATIC', 'DAI', 'WBTC', 'LINK'],
        includeFailures = true,
        successRateBase = 0.75 // Base success rate for realistic data
    } = options;

    console.log(`🔄 Generating ${count} historical opportunities...`);
    
    const opportunities = [];
    const timeRange = endDate - startDate;
    const timeStep = timeRange / count;

    for (let i = 0; i < count; i++) {
        const timestamp = startDate + (i * timeStep);
        const opportunity = generateSingleOpportunity({
            timestamp,
            chains,
            dexes,
            tokens,
            index: i,
            successRateBase,
            includeFailures
        });
        
        opportunities.push(opportunity);
    }

    console.log(`✅ Generated ${opportunities.length} opportunities`);
    console.log(`   Success rate: ${(opportunities.filter(o => o.succeeded).length / count * 100).toFixed(1)}%`);
    console.log(`   Avg profit: $${(opportunities.reduce((sum, o) => sum + o.actual_profit, 0) / count).toFixed(2)}`);
    
    return opportunities;
}

/**
 * Generate a single opportunity with realistic parameters
 */
function generateSingleOpportunity(params) {
    const {
        timestamp,
        chains,
        dexes,
        tokens,
        index,
        successRateBase,
        includeFailures
    } = params;

    // Select random chain and DEXes
    const chain = chains[Math.floor(Math.random() * chains.length)];
    const hopCount = 2 + Math.floor(Math.random() * 3); // 2-4 hops
    
    // Generate route
    const route = generateRoute(tokens, hopCount);
    const routeDexes = selectDexes(dexes, hopCount);
    
    // Calculate base profit (follows power law distribution)
    const profitBase = generatePowerLawValue(3, 100, 2.5); // More small profits
    
    // Market conditions (time-based patterns)
    const hourOfDay = new Date(timestamp).getHours();
    const dayOfWeek = new Date(timestamp).getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    // Volatility increases during certain hours and weekends
    const volatilityMultiplier = isWeekend ? 1.3 : 1.0;
    const hourMultiplier = (hourOfDay >= 13 && hourOfDay <= 16) ? 1.2 : 0.9; // UTC market hours
    
    // Gas price varies by time and chain
    const gasPriceBase = getChainGasPrice(chain);
    const gasPrice = gasPriceBase * (0.8 + Math.random() * 0.4) * hourMultiplier;
    
    // TVL and liquidity
    const tvl = generatePowerLawValue(10000, 10000000, 2.0);
    const volume24h = tvl * (0.1 + Math.random() * 0.5);
    const liquidityDepth = tvl * (0.05 + Math.random() * 0.15);
    
    // Price features
    const priceSpread = 0.001 + Math.random() * 0.05; // 0.1% to 5%
    const priceVolatility = (0.01 + Math.random() * 0.1) * volatilityMultiplier;
    const priceMomentum = -0.5 + Math.random(); // -0.5 to 0.5
    
    // Route complexity and fees
    const routeComplexity = hopCount * hopCount;
    const totalFees = hopCount * (0.0015 + Math.random() * 0.0015); // 0.15-0.3% per hop
    
    // Historical performance (simulated)
    const historicalSuccessRate = 0.6 + Math.random() * 0.3;
    const avgProfit24h = profitBase * (0.8 + Math.random() * 0.4);
    const executions24h = Math.floor(Math.random() * 50);
    
    // Risk factors
    const slippageRisk = calculateSlippageRisk(profitBase, tvl);
    const mevRisk = calculateMevRisk(profitBase, gasPrice);
    const smartContractRisk = 0.05 + Math.random() * 0.15;
    
    // Network congestion
    const networkCongestion = 0.3 + Math.random() * 0.4;
    
    // Gas estimate
    const gasEstimate = 200000 + (hopCount - 2) * 100000;
    const gasCostUsd = (gasEstimate * gasPrice) / 1e9 * getChainGasTokenPrice(chain);
    
    // Net profit after gas
    const netProfit = profitBase - gasCostUsd - (profitBase * totalFees);
    
    // Determine success based on multiple factors
    const successProbability = calculateSuccessProbability({
        netProfit,
        slippageRisk,
        mevRisk,
        networkCongestion,
        historicalSuccessRate,
        gasPrice,
        routeComplexity
    });
    
    const succeeded = includeFailures 
        ? Math.random() < successProbability
        : Math.random() < successRateBase;
    
    // Actual profit (with variance)
    const actualProfit = succeeded 
        ? netProfit * (0.85 + Math.random() * 0.3) // 85-115% of expected
        : 0;

    return {
        id: `opp_${timestamp}_${index}`,
        timestamp,
        chain,
        tokens: route,
        dexes: routeDexes,
        hop_count: hopCount,
        
        // Price features
        price_spread: priceSpread,
        volatility: priceVolatility,
        momentum: priceMomentum,
        
        // Liquidity features
        tvl_usd: tvl,
        volume_24h: volume24h,
        liquidity_depth: liquidityDepth,
        
        // Route features
        route_complexity: routeComplexity,
        fees: Array(hopCount).fill(totalFees / hopCount),
        
        // Market features
        gas_price: gasPrice,
        congestion: networkCongestion,
        hour_of_day: hourOfDay,
        day_of_week: dayOfWeek,
        
        // Historical features
        historical_success_rate: historicalSuccessRate,
        avg_profit_24h: avgProfit24h,
        executions_24h: executions24h,
        
        // Risk features
        slippage_risk: slippageRisk,
        mev_risk: mevRisk,
        contract_risk: smartContractRisk,
        
        // Execution data
        input_amount: 1000 + Math.random() * 9000, // $1k-$10k
        gas_estimate: gasEstimate,
        gas_cost_usd: gasCostUsd,
        profit_usd: netProfit,
        actual_profit: actualProfit,
        succeeded,
        success_probability: successProbability,
        
        // Metadata
        route_id: generateRouteId(route, routeDexes),
        confidence_score: historicalSuccessRate * (1 - slippageRisk) * (1 - mevRisk)
    };
}

/**
 * Generate a token route with specified hop count
 */
function generateRoute(tokens, hopCount) {
    const route = [];
    const startToken = tokens[Math.floor(Math.random() * tokens.length)];
    route.push(startToken);
    
    let currentToken = startToken;
    for (let i = 1; i < hopCount; i++) {
        const availableTokens = tokens.filter(t => t !== currentToken);
        currentToken = availableTokens[Math.floor(Math.random() * availableTokens.length)];
        route.push(currentToken);
    }
    
    // Close the loop back to start token
    route.push(startToken);
    
    return route;
}

/**
 * Select DEXes for the route
 */
function selectDexes(dexes, hopCount) {
    const selected = [];
    for (let i = 0; i < hopCount; i++) {
        selected.push(dexes[Math.floor(Math.random() * dexes.length)]);
    }
    return selected;
}

/**
 * Generate value following power law distribution
 * More small values, fewer large values (realistic for trading)
 */
function generatePowerLawValue(min, max, alpha = 2.0) {
    const u = Math.random();
    const range = max - min;
    return min + range * Math.pow(u, 1 / alpha);
}

/**
 * Get base gas price for chain
 */
function getChainGasPrice(chain) {
    const gasPrices = {
        polygon: 80,     // Gwei
        ethereum: 30,
        arbitrum: 0.1,
        optimism: 0.001,
        base: 0.001,
        bsc: 3
    };
    return gasPrices[chain] || 50;
}

/**
 * Get gas token price in USD
 */
function getChainGasTokenPrice(chain) {
    const prices = {
        polygon: 0.85,   // MATIC
        ethereum: 2500,  // ETH
        arbitrum: 2500,  // ETH
        optimism: 2500,  // ETH
        base: 2500,      // ETH
        bsc: 300         // BNB
    };
    return prices[chain] || 1;
}

/**
 * Calculate slippage risk based on trade size vs liquidity
 */
function calculateSlippageRisk(tradeSize, tvl) {
    if (tvl === 0) return 1.0;
    const ratio = tradeSize / tvl;
    return Math.min(ratio * 50, 1.0);
}

/**
 * Calculate MEV risk
 */
function calculateMevRisk(profit, gasPrice) {
    const profitScore = Math.min(profit / 100, 1.0);
    const gasScore = 1.0 - Math.min(gasPrice / 200, 1.0);
    return (profitScore + gasScore) / 2;
}

/**
 * Calculate success probability based on multiple factors
 */
function calculateSuccessProbability(factors) {
    const {
        netProfit,
        slippageRisk,
        mevRisk,
        networkCongestion,
        historicalSuccessRate,
        gasPrice,
        routeComplexity
    } = factors;
    
    // Base probability from historical data
    let probability = historicalSuccessRate;
    
    // Adjust for profitability
    if (netProfit < 5) probability *= 0.5;
    else if (netProfit > 20) probability *= 1.1;
    
    // Adjust for risks
    probability *= (1 - slippageRisk * 0.3);
    probability *= (1 - mevRisk * 0.2);
    probability *= (1 - networkCongestion * 0.15);
    
    // Adjust for gas price
    if (gasPrice > 100) probability *= 0.7;
    else if (gasPrice < 50) probability *= 1.1;
    
    // Adjust for complexity
    if (routeComplexity > 12) probability *= 0.8;
    
    return Math.max(0.1, Math.min(0.99, probability));
}

/**
 * Generate route ID
 */
function generateRouteId(tokens, dexes) {
    const tokenStr = tokens.join('_');
    const dexStr = dexes.join('_');
    const hash = crypto.createHash('md5').update(tokenStr + dexStr).digest('hex').substring(0, 8);
    return `route_${hash}`;
}

/**
 * Calculate opportunity score (0-100)
 */
export function scoreOpportunity(opportunity) {
    const profitScore = Math.min(opportunity.profit_usd / 50, 1.0) * 30;
    const successScore = opportunity.historical_success_rate * 30;
    const riskScore = (1 - opportunity.slippage_risk) * 20;
    const liquidityScore = Math.min(opportunity.tvl_usd / 1000000, 1.0) * 20;
    
    return profitScore + successScore + riskScore + liquidityScore;
}

/**
 * Filter opportunities by quality threshold
 */
export function filterHighQualityOpportunities(opportunities, minScore = 60) {
    return opportunities
        .map(opp => ({
            ...opp,
            quality_score: scoreOpportunity(opp)
        }))
        .filter(opp => opp.quality_score >= minScore)
        .sort((a, b) => b.quality_score - a.quality_score);
}

/**
 * Generate time-series data with spread movements per 15 seconds
 */
export function generateSpreadTimeSeries(durationDays = 7, intervalSeconds = 15) {
    const points = (durationDays * 24 * 60 * 60) / intervalSeconds;
    console.log(`📊 Generating spread time series: ${points} data points over ${durationDays} days`);
    
    const timeSeries = [];
    const now = Date.now();
    const startTime = now - (durationDays * 24 * 60 * 60 * 1000);
    
    // Base spread with trend and seasonality
    let baseSpread = 0.003; // 0.3%
    const trendIncrement = 0.00001; // Slight upward trend
    
    for (let i = 0; i < points; i++) {
        const timestamp = startTime + (i * intervalSeconds * 1000);
        const date = new Date(timestamp);
        const hourOfDay = date.getHours();
        
        // Daily seasonality (higher spreads during active hours)
        const dailyFactor = 1 + 0.3 * Math.sin((hourOfDay - 6) * Math.PI / 12);
        
        // Random walk with mean reversion
        const randomChange = (Math.random() - 0.5) * 0.0002;
        baseSpread = baseSpread * 0.99 + 0.003 * 0.01 + randomChange;
        
        // Add trend
        baseSpread += trendIncrement;
        
        // Calculate spread with noise
        const spread = Math.max(0.0001, baseSpread * dailyFactor * (0.9 + Math.random() * 0.2));
        
        // Detect if this spread represents an opportunity
        const isOpportunity = spread > 0.005 && Math.random() > 0.7; // 30% of high spreads are opportunities
        
        timeSeries.push({
            timestamp,
            spread_bps: spread * 10000, // basis points
            spread_pct: spread * 100,   // percentage
            is_opportunity: isOpportunity,
            hour_of_day: hourOfDay,
            volume_factor: dailyFactor,
            profit_potential_usd: isOpportunity ? spread * 10000 : 0 // $10k trade size
        });
    }
    
    const opportunities = timeSeries.filter(t => t.is_opportunity);
    console.log(`✅ Generated ${timeSeries.length} time points`);
    console.log(`   Opportunities detected: ${opportunities.length}`);
    console.log(`   Avg spread: ${(timeSeries.reduce((sum, t) => sum + t.spread_pct, 0) / timeSeries.length).toFixed(3)}%`);
    
    return timeSeries;
}

/**
 * Aggregate spread data for analysis
 */
export function aggregateSpreadData(timeSeries) {
    const hourlyData = {};
    
    timeSeries.forEach(point => {
        const hour = point.hour_of_day;
        if (!hourlyData[hour]) {
            hourlyData[hour] = {
                hour,
                count: 0,
                totalSpread: 0,
                opportunities: 0,
                maxSpread: 0
            };
        }
        
        hourlyData[hour].count++;
        hourlyData[hour].totalSpread += point.spread_pct;
        hourlyData[hour].opportunities += point.is_opportunity ? 1 : 0;
        hourlyData[hour].maxSpread = Math.max(hourlyData[hour].maxSpread, point.spread_pct);
    });
    
    return Object.values(hourlyData).map(data => ({
        hour: data.hour,
        avg_spread_pct: data.totalSpread / data.count,
        opportunity_rate: data.opportunities / data.count,
        max_spread_pct: data.maxSpread,
        sample_count: data.count
    }));
}

export default {
    generateHistoricalOpportunities,
    generateSpreadTimeSeries,
    aggregateSpreadData,
    scoreOpportunity,
    filterHighQualityOpportunities
};
