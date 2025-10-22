# Professional Pre-Operation Checklist

## Overview

The **Pre-Operation Checklist** is a comprehensive validation script that verifies all critical system requirements before running the APEX Arbitrage System in any mode, especially for live operations.

## Purpose

This script ensures that:
- ✅ All required environment variables are properly configured
- ✅ System wallet is valid and accessible
- ✅ Native gas token balances are sufficient on all configured chains
- ✅ Only chains with adequate gas coverage are activated
- ✅ RPC endpoints are accessible and responsive
- ✅ Safety parameters meet operational standards
- ✅ System is ready for safe operation

## Running the Checklist

### Quick Start

```bash
# Using npm script (recommended)
npm run precheck

# Or using the alias
npm run preflight

# Or directly
node scripts/pre-operation-checklist.js
```

### When to Run

**Always run this checklist before:**
- Starting the system for the first time
- Switching from DEV/SIM to LIVE mode
- After configuration changes
- After funding your wallet
- Before major trading operations
- After extended downtime

## What It Checks

### 1. Environment Variables

The script validates all critical environment variables:

- `MODE` - Execution mode (LIVE, DEV, or SIM)
- `MIN_PROFIT_USD` - Minimum profit threshold
- `MAX_GAS_PRICE_GWEI` - Maximum acceptable gas price
- `SLIPPAGE_BPS` - Slippage tolerance
- `MAX_DAILY_LOSS` - Daily loss limit
- `MAX_CONSECUTIVE_FAILURES` - Failure threshold

### 2. System Wallet

Verifies that:
- Private key is configured and valid
- Wallet address can be derived
- Format is correct (64 hex characters)

### 3. Chain Connectivity & Gas Balances

For each configured chain, the script:
- Tests RPC endpoint connectivity
- Retrieves current native token balance
- Checks if balance meets minimum gas requirements
- Determines chain activation status
- Reports current gas prices

**Minimum Gas Balance Requirements:**
- **Polygon (MATIC):** 1.0 MATIC
- **Ethereum (ETH):** 0.05 ETH
- **Arbitrum (ETH):** 0.01 ETH
- **Optimism (ETH):** 0.01 ETH
- **Base (ETH):** 0.01 ETH
- **BSC (BNB):** 0.05 BNB

### 4. Safety Parameters

Validates that safety parameters are within acceptable ranges:
- Minimum profit threshold (recommended ≥ $5)
- Gas price limits (reasonable range)
- Slippage tolerance (reasonable percentage)
- Daily loss limits (properly set)
- Failure thresholds (appropriate values)

## Output Report

The script generates a comprehensive report with:

### Status Indicators
- ✅ **Success** - Check passed
- ⚠️ **Warning** - Non-critical issue detected
- ❌ **Error** - Critical issue that must be resolved

### Sections

1. **Execution Mode** - Current operating mode with color coding
   - 🔴 LIVE MODE - Real transactions
   - 🟡 DEV MODE - Simulation only
   - 🔵 SIM MODE - Backtesting

2. **System Wallet** - Wallet address if configured

3. **Active Chains** - Chains ready for operations with:
   - Native token balance
   - Current gas price
   - Chain ID

4. **Inactive Chains** - Chains not operational with reasons:
   - No RPC URL configured
   - Insufficient gas balance
   - Connection errors

5. **Warnings** - Non-critical issues that should be reviewed

6. **Critical Errors** - Issues that prevent operation

7. **Operational Readiness Assessment** - Final verdict

## Exit Codes

- **0** - System ready (or ready with warnings)
- **1** - Critical errors detected, cannot proceed

## Example Output

### Successful Check (DEV Mode)

```
======================================================================
APEX ARBITRAGE SYSTEM - PRE-OPERATION CHECKLIST
======================================================================

STEP 1: Environment Variables Verification
✅ Mode: DEV
ℹ️  DEV mode - Transactions will be simulated
✅ MIN_PROFIT_USD: 5
✅ MAX_GAS_PRICE_GWEI: 100
...

STEP 2: System Wallet Verification
✅ Wallet configured successfully
   Address: 0x1234...5678

STEP 3: Chain Connectivity & Native Gas Balance Check
✅ Polygon: ACTIVE
   Balance: 2.5000 MATIC
   Gas Price: 45.2 Gwei
   Chain ID: 137

✅ Ethereum: ACTIVE
   Balance: 0.0850 ETH
   Gas Price: 25.8 Gwei
   Chain ID: 1

...

OPERATIONAL READINESS ASSESSMENT
✅ SYSTEM FULLY OPERATIONAL

All checks passed successfully!

Operational Summary:
  • Mode: DEV
  • Active Chains: 2
  • Wallet: Configured
  • Critical Errors: 0
  • Warnings: 0

You can now start the system with:
  npm start
```

### Failed Check (Missing Configuration)

```
STEP 1: Environment Variables Verification
❌ MODE environment variable is not set
❌ MIN_PROFIT_USD is not set
...

OPERATIONAL READINESS ASSESSMENT
🛑 SYSTEM NOT READY FOR OPERATIONS

Critical errors must be resolved before proceeding.

Please:
  1. Fix all critical errors listed above
  2. Review and update your .env configuration
  3. Run this checklist again to verify
```

## Chain Activation Logic

A chain is considered **ACTIVE** only when:
1. RPC URL is properly configured
2. RPC endpoint is accessible
3. Native gas token balance ≥ minimum required amount

A chain is **INACTIVE** when:
1. No RPC URL configured
2. RPC URL contains placeholder (YOUR_API_KEY)
3. RPC connection fails
4. Native token balance is below minimum threshold

**Important:** Only active chains will be used for arbitrage operations. This prevents failed transactions due to insufficient gas.

## Common Issues and Solutions

### Issue: "No valid RPC URL configured"

**Solution:**
1. Edit your `.env` file
2. Replace `YOUR_API_KEY` with actual API keys from:
   - [Alchemy](https://www.alchemy.com/)
   - [Infura](https://infura.io/)
   - [QuickNode](https://www.quicknode.com/)

### Issue: "Insufficient gas balance"

**Solution:**
1. Fund your wallet with native tokens for the chain
2. Ensure balance meets minimum requirements
3. Re-run the checklist to verify

### Issue: "Invalid private key format"

**Solution:**
1. Ensure private key is 64 hexadecimal characters
2. Remove any '0x' prefix if present
3. Never share or commit your private key

### Issue: "RPC connection error"

**Solution:**
1. Verify your internet connection
2. Check if RPC provider is operational
3. Ensure API key is valid and not rate-limited
4. Try a different RPC provider

## Integration with System Startup

The pre-operation checklist can be integrated into your startup workflow:

```bash
# Run checklist before starting
npm run precheck && npm start

# Or create a custom script in package.json
"start:safe": "npm run precheck && npm start"
```

## Security Considerations

The checklist script:
- ✅ Never logs or displays private keys
- ✅ Only shows wallet addresses
- ✅ Redacts sensitive configuration
- ✅ Validates without exposing secrets
- ✅ Provides security warnings for LIVE mode

## Best Practices

1. **Always run before LIVE mode** - Verify everything before real trading
2. **Check after funding** - Confirm balances are detected correctly
3. **Verify after updates** - Ensure config changes are valid
4. **Monitor gas balances** - Rerun if balances get low
5. **Review warnings** - Don't ignore non-critical issues
6. **Document results** - Keep records of checks before major operations

## Customization

You can modify minimum gas balance requirements in the script:

```javascript
// In scripts/pre-operation-checklist.js
const CHAINS = {
    POLYGON: {
        minGasBalance: 1.0, // Adjust as needed
        // ...
    },
    // ...
};
```

## Support

If you encounter issues:
1. Review this documentation
2. Check the detailed error messages
3. Verify your `.env` configuration against `.env.example`
4. Ensure dependencies are installed: `npm install`

## Related Documentation

- [Configuration Guide](./CONFIGURATION.md)
- [Installation Guide](../INSTALLATION-GUIDE.md)
- [Quick Start](../QUICKSTART.md)
- [Architecture](./ARCHITECTURE.md)

---

**Remember:** The pre-operation checklist is your safety net. Never skip it before live operations!
