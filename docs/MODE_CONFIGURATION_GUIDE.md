# MODE Configuration Guide

## Overview

The APEX Arbitrage System supports three execution modes to provide maximum safety and flexibility during development, testing, and production deployment.

## Execution Modes

### 🔴 LIVE Mode

**Purpose**: Production trading with real funds

**Characteristics**:
- Executes actual on-chain transactions
- Uses real-time DEX data
- Requires sufficient balance for gas fees
- All safety checks enforced
- Real money at stake

**When to Use**:
- After thorough testing in DEV and SIM modes
- When you have validated your strategies
- With appropriate risk management in place
- When you're ready for production trading

**Configuration**:
```bash
MODE=LIVE
```

**Safety Checklist Before Going Live**:
- [ ] Tested extensively in DEV mode
- [ ] Backtested in SIM mode
- [ ] Verified all RPC connections
- [ ] Confirmed sufficient balance (recommended: 10+ MATIC)
- [ ] Set appropriate safety limits (MIN_PROFIT_USD, MAX_GAS_PRICE_GWEI)
- [ ] Configured monitoring and alerts
- [ ] Reviewed all transaction parameters
- [ ] Started with small trade sizes

### 🟡 DEV Mode (Default)

**Purpose**: Development and strategy testing

**Characteristics**:
- Simulates all transactions (dry-run)
- Uses real-time DEX data
- No on-chain execution
- Zero risk to funds
- Full validation and logging

**When to Use**:
- During development
- Testing new strategies
- Validating code changes
- Learning the system
- Debugging issues
- Testing configuration changes

**Configuration**:
```bash
MODE=DEV  # This is the default
```

**Benefits**:
- No gas fees
- No risk of fund loss
- Instant feedback
- Can test extreme scenarios
- Perfect for iteration

### 🔵 SIM Mode

**Purpose**: Backtesting and simulation

**Characteristics**:
- Simulates transactions with historical or real-time data
- Can incorporate historical market data
- No on-chain execution
- Advanced simulation capabilities
- Performance analysis tools

**When to Use**:
- Strategy backtesting
- Performance analysis
- Historical data analysis
- Long-term strategy validation
- Statistical modeling

**Configuration**:
```bash
MODE=SIM
```

**Features**:
- Historical data replay
- Market condition simulation
- Performance metrics collection
- Strategy comparison

## How to Switch Modes

### 1. Environment Variable (Recommended)

Edit your `.env` file:

```bash
# Development/Testing
MODE=DEV

# Simulation/Backtesting
MODE=SIM

# Production (use with caution!)
MODE=LIVE
```

### 2. Command Line Override

```bash
# Override for single run
MODE=DEV npm start

# Python orchestrator
MODE=SIM python src/python/integrated_orchestrator.py
```

### 3. Programmatic Configuration

```javascript
// In JavaScript
import { CURRENT_MODE, MODE } from './src/utils/config.js';

if (CURRENT_MODE === MODE.LIVE) {
    console.log('Running in LIVE mode');
}
```

```python
# In Python
from orchestrator import ExecutionMode
import os

mode = ExecutionMode[os.getenv('MODE', 'DEV').upper()]
if mode == ExecutionMode.LIVE:
    print('Running in LIVE mode')
```

## Mode Behavior Comparison

| Feature | LIVE | DEV | SIM |
|---------|------|-----|-----|
| On-chain Execution | ✅ Yes | ❌ No | ❌ No |
| Real-time Data | ✅ Yes | ✅ Yes | ⚠️ Optional |
| Historical Data | ❌ No | ❌ No | ✅ Yes |
| Gas Fees | ✅ Required | ❌ None | ❌ None |
| Risk to Funds | 🔴 High | 🟢 None | 🟢 None |
| Transaction Logs | ✅ On-chain | 📝 File only | 📝 File only |
| Monitoring | 🚨 Critical | ℹ️ Development | 📊 Analysis |
| Validation | ✅ Full | ✅ Full | ⚠️ Partial |
| Speed | ⏱️ Network-dependent | ⚡ Instant | ⚡ Instant |

## Safety Features by Mode

### All Modes
- Route validation
- Profit calculation
- Gas estimation
- Slippage checks
- Price impact analysis

### DEV Mode Additional
- Simulated transaction execution
- Detailed logging of would-be transactions
- Gas cost simulation
- Success/failure prediction

### LIVE Mode Additional
- Emergency stop mechanism
- Rate limiting
- Daily loss limits
- Consecutive failure limits
- Transaction confirmation requirements
- MEV protection
- Private relay support

## Example Workflows

### Development Workflow

```bash
# 1. Start in DEV mode (default)
MODE=DEV npm start

# 2. Make changes to code
# 3. Test thoroughly in DEV mode
# 4. Review logs and metrics

# 5. Switch to SIM mode for backtesting
MODE=SIM npm start

# 6. Analyze historical performance
# 7. Validate strategy with real market conditions

# 8. When confident, switch to LIVE
MODE=LIVE npm start  # Use with caution!
```

### Testing a New Strategy

```bash
# Step 1: Develop in DEV mode
MODE=DEV npm start

# Step 2: Collect simulation data
# Let it run for 24 hours, observe opportunities

# Step 3: Backtest in SIM mode
MODE=SIM npm start

# Step 4: Analyze results
# Review logs in logs/ directory
# Check metrics in database

# Step 5: Small LIVE test
MODE=LIVE MIN_PROFIT_USD=10 npm start
# Start with higher profit threshold

# Step 6: Full deployment
MODE=LIVE MIN_PROFIT_USD=5 npm start
```

## Monitoring Mode Status

### Dashboard Display

The system displays the current mode prominently in the dashboard:

```
═══════════════════════════════════════════════════════════════
           APEX ARBITRAGE SYSTEM - LIVE STATUS
═══════════════════════════════════════════════════════════════

🎛️  EXECUTION MODE
   🟡 DEV MODE - Runs all logic with real data but simulates transactions (dry-run)

📊 EXECUTION STATS
   Total Scans: 150
   Simulated Executions: 23
   Real Executions: 0 (Mode: DEV)
```

### Log Files

Mode information is logged to files:

```
[2024-01-15 10:30:45] INFO: System starting in DEV mode
[2024-01-15 10:30:46] INFO: MODE: DEV - Transactions will be simulated
[2024-01-15 10:31:12] INFO: Opportunity found - would execute in LIVE mode
[2024-01-15 10:31:12] INFO: Simulating transaction (dry-run)
```

## Mode Validation

The system validates the MODE setting on startup:

```javascript
// Invalid mode will throw error
MODE=INVALID npm start
// Error: Invalid MODE: INVALID. Must be one of: LIVE, DEV, SIM
```

Valid modes:
- `LIVE` (case-insensitive)
- `DEV` (case-insensitive)  
- `SIM` (case-insensitive)

## Troubleshooting

### Mode Not Respected

**Issue**: System behaving as if in wrong mode

**Solutions**:
1. Check `.env` file is in correct directory
2. Verify `MODE` variable is set correctly
3. Restart the system after changing mode
4. Clear any cached environment variables

### Transactions Not Executing in LIVE Mode

**Issue**: No transactions executing despite being in LIVE mode

**Possible Causes**:
1. Insufficient balance for gas
2. Safety limits too restrictive
3. No profitable opportunities
4. RPC connection issues

**Check**:
```bash
# Verify mode
grep MODE .env

# Check balance
npm run verify

# Review logs
tail -f logs/system.log
```

### Want to Test Without Risk

**Solution**: Always use DEV or SIM mode for testing

```bash
# Safest way to test
MODE=DEV npm start

# Or explicitly set in .env
echo "MODE=DEV" >> .env
```

## Best Practices

### 1. Always Start with DEV Mode
```bash
# Initial development
MODE=DEV npm start
```

### 2. Progressive Testing
- DEV mode: 1-7 days
- SIM mode: 3-7 days
- LIVE mode: Start small, scale gradually

### 3. Use Safety Parameters
```bash
# In LIVE mode, use conservative settings
MODE=LIVE
MIN_PROFIT_USD=10        # Higher threshold
MAX_GAS_PRICE_GWEI=80    # Lower gas limit
MAX_DAILY_LOSS=20        # Strict loss limit
```

### 4. Monitor Closely in LIVE Mode
- Check dashboard frequently
- Set up Telegram alerts
- Review logs daily
- Monitor balance and gas usage

### 5. Keep DEV Instance Running
- Run parallel DEV instance to test changes
- Never test new code in LIVE mode first
- Validate all changes in DEV before deploying to LIVE

## Quick Reference

```bash
# Development
MODE=DEV npm start

# Simulation
MODE=SIM npm start

# Production (careful!)
MODE=LIVE npm start

# Check current mode
echo $MODE

# Override temporarily
MODE=DEV npm run verify
```

## Support

If you have questions about mode configuration:

1. Review this guide
2. Check logs in `logs/` directory
3. Review `.env.example` for configuration templates
4. Test in DEV mode first
5. Open an issue with details if problems persist

## Security Notice

⚠️ **NEVER commit your `.env` file with `MODE=LIVE` and real credentials to version control**

Always use `.env.example` as a template and keep your actual `.env` file private.

## Summary

- **DEV Mode**: Safe testing with real data, no execution (DEFAULT)
- **SIM Mode**: Backtesting and simulation with historical data
- **LIVE Mode**: Real trading with real funds (USE WITH CAUTION)

**Remember**: Always test thoroughly in DEV and SIM modes before going LIVE!
