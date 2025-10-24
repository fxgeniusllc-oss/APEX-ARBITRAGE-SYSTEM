# Flash Loan Range Implementation (5% - 25%)

## Overview
This document describes the implementation of flash loan range parameters that constrain flash loan amounts to a minimum of 5% and maximum of 25% of available pool liquidity.

## Issue Addressed
**Issue**: "CANT EDIT - flash loan range to minimum 5% and maximum 25%"

The system now enforces configurable flash loan range limits to ensure safer trading practices and better risk management.

## Implementation Details

### 1. Smart Contract Changes (`src/contracts/ApexFlashArbitrage.sol`)

#### New State Variables
```solidity
uint256 public minFlashloanPercent = 500;  // 5% minimum (in basis points)
uint256 public maxFlashloanPercent = 2500; // 25% maximum (in basis points)
```

**Note**: Values are stored in basis points (1% = 100 bps), so:
- 500 bps = 5%
- 2500 bps = 25%

#### Updated `updateParameters()` Function
```solidity
function updateParameters(
    uint256 _minProfitBps,
    uint256 _maxGasPrice,
    uint256 _maxSlippageBps,
    uint256 _minFlashloanPercent,
    uint256 _maxFlashloanPercent
) external onlyOwner {
    require(_minFlashloanPercent >= 500, "Min flashloan percent must be >= 5%");
    require(_maxFlashloanPercent <= 2500, "Max flashloan percent must be <= 25%");
    require(_minFlashloanPercent < _maxFlashloanPercent, "Min must be less than max");
    // ... rest of implementation
}
```

**Validation Rules**:
- Minimum cannot be less than 5% (500 bps)
- Maximum cannot be more than 25% (2500 bps)
- Minimum must be less than maximum

#### New Getter Function
```solidity
function getFlashloanRange() external view returns (
    uint256 minPercent,
    uint256 maxPercent
) {
    return (minFlashloanPercent, maxFlashloanPercent);
}
```

#### Updated Event
```solidity
event ParametersUpdated(
    uint256 minProfitBps,
    uint256 maxGasPrice,
    uint256 maxSlippageBps,
    uint256 minFlashloanPercent,  // NEW
    uint256 maxFlashloanPercent   // NEW
);
```

### 2. Configuration Changes (`src/utils/config.js`)

Added to `SAFETY_CONFIG`:
```javascript
minFlashloanPercent: getFloatEnv('MIN_FLASHLOAN_PERCENT', 5),  // 5% minimum
maxFlashloanPercent: getFloatEnv('MAX_FLASHLOAN_PERCENT', 25)  // 25% maximum
```

### 3. Environment Variables (`.env`)

```bash
# Flash loan range limits (percentage of pool liquidity)
# Minimum flash loan percentage (default: 5%)
MIN_FLASHLOAN_PERCENT=5

# Maximum flash loan percentage (default: 25%)
MAX_FLASHLOAN_PERCENT=25
```

### 4. Flash Loan Integration (`src/utils/flashloanIntegration.js`)

#### Updated `calculateOptimalAmount()` Method
```javascript
calculateOptimalAmount(reserves, targetProfit, gasEstimate, gasPriceGwei, minPercent = 5, maxPercent = 25) {
    const gasCost = (gasEstimate * gasPriceGwei * 1e9) / 1e18;
    const minAmount = (targetProfit + gasCost) * 1.1;
    
    // Calculate safe amount based on configurable percentage limits
    const minReserve = Math.min(...reserves);
    const minSafeAmount = minReserve * (minPercent / 100); // Minimum based on minPercent
    const maxSafeAmount = minReserve * (maxPercent / 100); // Maximum based on maxPercent
    
    // Ensure amount is within the configured range
    const optimalAmount = Math.max(minSafeAmount, Math.min(minAmount, maxSafeAmount));
    
    return optimalAmount;
}
```

**Key Changes**:
- Previously used hardcoded 30% maximum
- Now uses configurable 5% minimum and 25% maximum
- Ensures flash loan amounts stay within specified range relative to pool liquidity

### 5. Test Updates (`tests/flashloan-integration.test.js`)

#### New Test Case
```javascript
test('should respect configurable min/max percentage limits', () => {
    const integrator = new FlashloanIntegrator(mockProvider, mockWallet);
    
    const reserves = [1000000, 2000000, 3000000];
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
    
    assert.ok(optimalAmount >= minSafeAmount);
    assert.ok(optimalAmount <= maxSafeAmount);
});
```

#### Updated Existing Tests
- Changed assertions from 30% max to 25% max
- Updated expected values in test cases

## Usage

### For Developers

1. **Configuration**: Edit `.env` to change default values:
   ```bash
   MIN_FLASHLOAN_PERCENT=5   # Can be adjusted between 5-25
   MAX_FLASHLOAN_PERCENT=25  # Can be adjusted between 5-25
   ```

2. **Smart Contract**: Call `updateParameters()` to change values on-chain:
   ```javascript
   await contract.updateParameters(
       minProfitBps,
       maxGasPrice,
       maxSlippageBps,
       500,  // 5% minimum
       2500  // 25% maximum
   );
   ```

3. **Query Current Settings**:
   ```javascript
   const [minPercent, maxPercent] = await contract.getFlashloanRange();
   console.log(`Min: ${minPercent / 100}%, Max: ${maxPercent / 100}%`);
   ```

### For Traders

The system will automatically:
- Reject flash loan requests below 5% of pool liquidity
- Cap flash loan requests at 25% of pool liquidity
- Calculate optimal amounts within this safe range

## Benefits

1. **Risk Management**: Prevents borrowing too little (unprofitable) or too much (risky)
2. **Safety**: 25% maximum protects against excessive pool impact
3. **Efficiency**: 5% minimum ensures trades are meaningful
4. **Flexibility**: Parameters are configurable via environment variables
5. **Transparency**: On-chain parameters can be queried by anyone

## Testing Results

All 37 tests passing:
```
✔ FlashloanIntegrator - Initialization (6 tests)
✔ FlashloanIntegrator - Provider Selection (7 tests)
✔ FlashloanIntegrator - Optimal Amount Calculation (6 tests)
✔ FlashloanIntegrator - Opportunity Validation (6 tests)
✔ FlashloanIntegrator - Multi-Chain Support (5 tests)
✔ FlashloanIntegrator - Singleton Pattern (2 tests)
✔ FlashloanIntegrator - Edge Cases and Error Handling (5 tests)
```

## Files Modified

1. `src/contracts/ApexFlashArbitrage.sol` - Smart contract implementation
2. `src/utils/config.js` - Configuration management
3. `src/utils/flashloanIntegration.js` - Flash loan calculation logic
4. `.env` - Environment variable defaults
5. `tests/flashloan-integration.test.js` - Test coverage

## Migration Notes

### Breaking Changes
- `updateParameters()` function signature changed
- Now requires 5 parameters instead of 3
- Existing calls to `updateParameters()` must be updated

### Backward Compatibility
- Default values (5% and 25%) are set
- Existing deployments will use defaults until `updateParameters()` is called
- No changes required for read-only operations

## Security Considerations

1. **Owner-Only**: Only contract owner can update parameters
2. **Validation**: Smart contract enforces min >= 5%, max <= 25%
3. **Event Logging**: All parameter updates are logged on-chain
4. **Range Checks**: Ensures min < max relationship

## Future Enhancements

Potential improvements for consideration:
1. Dynamic adjustment based on market volatility
2. Per-token percentage limits
3. Time-based restrictions
4. Automated parameter optimization using ML

## Support

For questions or issues related to this implementation, please refer to:
- Smart contract code: `src/contracts/ApexFlashArbitrage.sol`
- Configuration docs: `src/utils/config.js`
- Test examples: `tests/flashloan-integration.test.js`
