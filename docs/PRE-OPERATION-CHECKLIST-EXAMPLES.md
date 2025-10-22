# Pre-Operation Checklist - Usage Examples

## Example 1: First Time Setup (No Configuration)

```bash
$ yarn run precheck

STEP 1: Environment Variables Verification
❌ MODE environment variable is not set
❌ MIN_PROFIT_USD is not set
❌ MAX_GAS_PRICE_GWEI is not set
...

OPERATIONAL READINESS ASSESSMENT
🛑 SYSTEM NOT READY FOR OPERATIONS
```

**Action Required:** Configure your `.env` file based on `.env.example`

---

## Example 2: DEV Mode with Valid Configuration

```bash
$ yarn run precheck

STEP 1: Environment Variables Verification
✅ Mode: DEV
ℹ️  DEV mode - Transactions will be simulated
✅ MIN_PROFIT_USD: 5
✅ MAX_GAS_PRICE_GWEI: 100
✅ SLIPPAGE_BPS: 50
✅ MAX_DAILY_LOSS: 50
✅ MAX_CONSECUTIVE_FAILURES: 5

STEP 2: System Wallet Verification
✅ Wallet configured successfully
   Address: 0x1234567890abcdef1234567890abcdef12345678

STEP 3: Chain Connectivity & Native Gas Balance Check
✅ Polygon: ACTIVE
   Balance: 2.5000 MATIC
   Gas Price: 45.2 Gwei
   Chain ID: 137

✅ Arbitrum: ACTIVE
   Balance: 0.0250 ETH
   Gas Price: 0.1 Gwei
   Chain ID: 42161

⚠️  Ethereum: INACTIVE - Insufficient gas balance
   Balance: 0.0100 ETH (min required: 0.05)
   Gas Price: 25.8 Gwei

STEP 4: Safety Parameters Verification
✅ Min Profit Threshold: $5
✅ Max Gas Price: 100 Gwei
✅ Slippage Tolerance: 50 bps (0.50%)
✅ Max Daily Loss Limit: $50
✅ Max Consecutive Failures: 5

OPERATIONAL READINESS ASSESSMENT
✅ SYSTEM FULLY OPERATIONAL

Operational Summary:
  • Mode: DEV
  • Active Chains: 2
  • Wallet: Configured
  • Critical Errors: 0
  • Warnings: 0

You can now start the system with:
  yarn start
```

---

## Example 3: LIVE Mode Warning

```bash
$ yarn run precheck

EXECUTION MODE
  🔴 LIVE MODE - REAL TRANSACTIONS WILL BE EXECUTED

...

OPERATIONAL READINESS ASSESSMENT
✅ SYSTEM FULLY OPERATIONAL

⚠️  FINAL WARNING FOR LIVE MODE ⚠️
You are about to run in LIVE mode with real funds.
Ensure you have:
  • Thoroughly tested in DEV mode
  • Verified all safety parameters
  • Confirmed sufficient gas balances
  • Set appropriate risk limits

You can now start the system with:
  yarn start
```

---

## Example 4: Insufficient Gas Balance

```bash
$ yarn run precheck

STEP 3: Chain Connectivity & Native Gas Balance Check
⚠️  Polygon: INACTIVE - Insufficient gas balance
   Balance: 0.5000 MATIC (min required: 1.0)
   Gas Price: 45.2 Gwei

⚠️  Ethereum: INACTIVE - Insufficient gas balance
   Balance: 0.0100 ETH (min required: 0.05)
   Gas Price: 25.8 Gwei

OPERATIONAL READINESS ASSESSMENT
🛑 NO ACTIVE CHAINS AVAILABLE

At least one chain must have sufficient gas balance.

Please:
  1. Fund your wallet with native gas tokens
  2. Ensure RPC URLs are properly configured
  3. Run this checklist again to verify
```

**Action Required:** Fund your wallet with native tokens

---

## Example 5: RPC Connection Issues

```bash
$ yarn run precheck

STEP 3: Chain Connectivity & Native Gas Balance Check
❌ Polygon: Connection failed
   Error: could not detect network (timeout)

⚠️  Ethereum: No valid RPC URL configured - INACTIVE

OPERATIONAL READINESS ASSESSMENT
🛑 NO ACTIVE CHAINS AVAILABLE
```

**Action Required:** Fix RPC URLs in `.env` file

---

## Example 6: Integration into Startup Script

Create a safe startup script:

```bash
#!/bin/bash
# safe-start.sh

echo "Running pre-operation checklist..."
yarn run precheck

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Pre-checks passed! Starting system..."
    yarn start
else
    echo ""
    echo "❌ Pre-checks failed! Please fix errors before starting."
    exit 1
fi
```

Usage:
```bash
chmod +x safe-start.sh
./safe-start.sh
```

---

## Quick Reference: Minimum Gas Requirements

| Chain    | Native Token | Minimum Balance |
|----------|--------------|-----------------|
| Polygon  | MATIC        | 1.0 MATIC       |
| Ethereum | ETH          | 0.05 ETH        |
| Arbitrum | ETH          | 0.01 ETH        |
| Optimism | ETH          | 0.01 ETH        |
| Base     | ETH          | 0.01 ETH        |
| BSC      | BNB          | 0.05 BNB        |

**Note:** These are minimum balances. Higher balances recommended for sustained operations.

---

## Recommended Workflow

1. **Initial Setup**
   ```bash
   # Configure environment
   cp .env.example .env
   # Edit .env with your settings
   nano .env
   ```

2. **Validate Configuration**
   ```bash
   yarn run precheck
   ```

3. **Fix any issues** and rerun checklist

4. **Start System**
   ```bash
   yarn start
   ```

5. **Before Switching to LIVE**
   ```bash
   # 1. Test thoroughly in DEV mode first
   # 2. Update MODE=LIVE in .env
   # 3. Run final checklist
   yarn run precheck
   # 4. Review all warnings carefully
   # 5. Start system
   yarn start
   ```

---

## Exit Codes

- **0**: System ready (or ready with non-critical warnings)
- **1**: Critical errors found, cannot proceed

Use exit codes in scripts:
```bash
yarn run precheck && yarn start || echo "Pre-checks failed!"
```

---

## Troubleshooting Tips

### Issue: "Invalid private key format"
- Remove any '0x' prefix
- Ensure exactly 64 hexadecimal characters
- Check for extra spaces or newlines

### Issue: "No valid RPC URL configured"
- Replace YOUR_API_KEY with actual API key
- Get free API keys from Alchemy, Infura, or QuickNode
- Test RPC URL independently with curl

### Issue: "Insufficient gas balance"
- Send native tokens to your wallet address
- Check correct network when sending
- Wait for confirmation before rerunning checklist

### Issue: "Connection timeout"
- Check internet connectivity
- Verify RPC provider is operational
- Try alternative RPC provider
- Check for rate limiting

---

For more information, see [PRE-OPERATION-CHECKLIST.md](PRE-OPERATION-CHECKLIST.md)
