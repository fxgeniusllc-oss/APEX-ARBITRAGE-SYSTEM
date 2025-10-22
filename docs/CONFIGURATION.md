# APEX System Configuration Guide

## Overview

The APEX Arbitrage System uses a **universal configuration system** that centralizes all environment variables in a single `.env` file. This configuration is shared across all components:

- **JavaScript/Node.js** components (via `src/utils/config.js`)
- **Python** components (via `src/python/config.py`)
- **Rust** components (via environment variables)

## Quick Start

1. **Copy the example configuration:**
   ```bash
   cp .env.example .env
   ```

2. **Edit `.env` with your settings:**
   - Set your RPC URLs (Alchemy, Infura, QuickNode recommended)
   - Configure your execution mode (DEV recommended for testing)
   - Add your private key (only for LIVE mode)
   - Customize safety parameters

3. **Validate your configuration:**
   ```bash
   # For JavaScript/Node.js components
   node scripts/validate-config.js
   
   # For Python components
   python scripts/validate-config.py
   ```

4. **Start the system:**
   ```bash
   yarn start
   ```

## Execution Modes

The system supports three execution modes via the `MODE` environment variable:

### 🟡 DEV Mode (Recommended for Testing)
```env
MODE=DEV
```
- Runs all logic with real live data
- **Simulates** all transactions (dry-run)
- No actual on-chain execution
- Safe for testing and development
- Logs all opportunities for analysis

### 🔵 SIM Mode (Backtesting)
```env
MODE=SIM
```
- Simulation mode for backtesting strategies
- Can use historical data
- All transactions are simulated
- Ideal for strategy optimization

### 🔴 LIVE Mode (Production) ⚠️ USE WITH EXTREME CAUTION
```env
MODE=LIVE
```
- **Executes REAL transactions on-chain**
- Requires funded wallet with gas
- Private key must be configured
- Only use after thorough testing in DEV mode
- Monitor closely when first deployed

## Configuration Structure

### Network Configuration

Premium RPC URLs are **required** for optimal performance:

```env
# Polygon (Primary network)
POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/YOUR_API_KEY
POLYGON_WSS_URL=wss://polygon-mainnet.g.alchemy.com/v2/YOUR_API_KEY

# Ethereum
ETHEREUM_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY
ETHEREUM_WSS_URL=wss://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY

# Other chains...
```

**Get API Keys:**
- [Alchemy](https://www.alchemy.com/) - Recommended, generous free tier
- [Infura](https://infura.io/) - Popular choice
- [QuickNode](https://www.quicknode.com/) - High performance

### Wallet Configuration

```env
# Private key WITHOUT 0x prefix
PRIVATE_KEY=your_private_key_here
```

**Security Notes:**
- ⚠️ **Never commit your .env file to version control**
- ⚠️ Keep your private key secure
- ⚠️ Use a dedicated wallet for the bot
- ⚠️ Only store what you're willing to risk

### Safety Parameters

```env
# Minimum profit to execute (USD)
MIN_PROFIT_USD=5

# Maximum gas price willing to pay (Gwei)
MAX_GAS_PRICE_GWEI=100

# Slippage tolerance (basis points: 50 = 0.5%)
SLIPPAGE_BPS=50

# Maximum daily loss before stopping (USD)
MAX_DAILY_LOSS=50

# Maximum consecutive failures before pausing
MAX_CONSECUTIVE_FAILURES=5

# Minimum time between trades (milliseconds)
MIN_TIME_BETWEEN_TRADES=30000
```

### Machine Learning Configuration

```env
# ML confidence threshold (0.0 to 1.0)
# Higher = more conservative
ML_CONFIDENCE_THRESHOLD=0.8

# Enable ML filtering
ENABLE_ML_FILTERING=true

# Model paths
XGBOOST_MODEL_PATH=data/models/xgboost_model.json
ONNX_MODEL_PATH=data/models/onnx_model.onnx
```

### Advanced Features

```env
# Rust engine for high-performance calculations
RUST_ENGINE_ENABLED=true

# Cross-chain arbitrage opportunities
ENABLE_CROSS_CHAIN=true

# Mempool monitoring for pre-execution detection
ENABLE_MEMPOOL_MONITORING=true

# BloXroute for MEV protection (requires subscription)
ENABLE_BLOXROUTE=false
BLOXROUTE_AUTH_TOKEN=your_token_here
```

## Configuration Validation

Always validate your configuration before starting:

### JavaScript/Node.js Components
```bash
node scripts/validate-config.js
```

This will:
- ✅ Check all required variables are set
- ✅ Validate parameter values
- ✅ Display configuration summary
- ✅ Show warnings for potential issues

### Python Components
```bash
python scripts/validate-config.py
```

## Using Configuration in Code

### JavaScript/Node.js

```javascript
import { 
    CHAINS,
    SAFETY_CONFIG,
    ML_CONFIG,
    CURRENT_MODE,
    getModeDisplay 
} from './src/utils/config.js';

// Access chain configuration
const polygonRpc = CHAINS.POLYGON.rpcUrl;

// Access safety parameters
const minProfit = SAFETY_CONFIG.minProfitUSD;

// Check execution mode
console.log(getModeDisplay());
if (CURRENT_MODE === MODE.LIVE) {
    // LIVE mode logic
}
```

### Python

```python
from config import (
    CHAINS,
    SafetyConfig,
    MLConfig,
    CURRENT_MODE,
    ExecutionMode,
    get_mode_display
)

# Access chain configuration
polygon_rpc = CHAINS[ChainType.POLYGON].rpc_url

# Access safety parameters
min_profit = SafetyConfig.min_profit_usd

# Check execution mode
print(get_mode_display())
if CURRENT_MODE == ExecutionMode.LIVE:
    # LIVE mode logic
    pass
```

## Environment Variables Reference

See `.env.example` for complete list with descriptions.

### Critical Variables
- `MODE` - Execution mode (LIVE/DEV/SIM)
- `POLYGON_RPC_URL` - Primary network RPC
- `ETHEREUM_RPC_URL` - Ethereum network RPC
- `PRIVATE_KEY` - Wallet private key (required for LIVE)

### Safety Variables
- `MIN_PROFIT_USD` - Minimum profit threshold
- `MAX_GAS_PRICE_GWEI` - Maximum gas price
- `MAX_DAILY_LOSS` - Maximum daily loss limit
- `SLIPPAGE_BPS` - Slippage tolerance

### Feature Toggles
- `ENABLE_ML_FILTERING` - ML-based filtering
- `ENABLE_CROSS_CHAIN` - Cross-chain opportunities
- `ENABLE_MEMPOOL_MONITORING` - Mempool monitoring
- `RUST_ENGINE_ENABLED` - Rust engine
- `ENABLE_BLOXROUTE` - BloXroute integration

## Best Practices

1. **Always test in DEV mode first**
   - Verify configuration
   - Test with small amounts
   - Monitor for 24-48 hours

2. **Use premium RPC providers**
   - Free public RPCs are unreliable
   - Alchemy/Infura recommended
   - Enable websocket support

3. **Set conservative safety limits**
   - Start with higher MIN_PROFIT_USD
   - Use lower MAX_GAS_PRICE_GWEI
   - Enable MAX_DAILY_LOSS protection

4. **Monitor actively when starting**
   - Check logs regularly
   - Use Telegram alerts
   - Monitor wallet balance

5. **Keep configuration secure**
   - Never commit .env file
   - Use separate wallets for testing
   - Rotate keys periodically

## Troubleshooting

### Configuration Validation Fails

**Problem:** "POLYGON_RPC_URL is required"
**Solution:** Set valid RPC URL in .env file

**Problem:** "PRIVATE_KEY is required in LIVE mode"
**Solution:** Add private key or switch to DEV mode

### Performance Issues

**Problem:** Slow execution
**Solution:** 
- Use premium RPC providers
- Enable RUST_ENGINE
- Reduce SCAN_INTERVAL

**Problem:** High gas costs
**Solution:**
- Lower MAX_GAS_PRICE_GWEI
- Increase MIN_PROFIT_USD
- Enable ENABLE_BLOXROUTE

### Connection Issues

**Problem:** RPC connection failures
**Solution:**
- Check RPC URL validity
- Verify API key
- Check rate limits
- Use websocket URLs

## Support

For issues or questions:
1. Check `.env.example` for correct format
2. Run validation scripts
3. Check system logs
4. Review configuration in this guide

## Migration from Old Configuration

If you're upgrading from an older version:

1. **Backup your old .env file**
   ```bash
   cp .env .env.backup
   ```

2. **Copy new .env.example**
   ```bash
   cp .env.example .env
   ```

3. **Transfer your settings**
   - Copy your RPC URLs
   - Copy your private key
   - Copy custom parameters

4. **Validate new configuration**
   ```bash
   node scripts/validate-config.js
   python scripts/validate-config.py
   ```

5. **Test in DEV mode**
   ```bash
   MODE=DEV yarn start
   ```

## Configuration Checklist

Before going to LIVE mode:

- [ ] All RPC URLs configured with premium providers
- [ ] Private key set and wallet funded
- [ ] Safety parameters configured appropriately
- [ ] Tested thoroughly in DEV mode for 24-48 hours
- [ ] Monitoring and alerts set up (Telegram)
- [ ] Backup and recovery procedures in place
- [ ] Configuration validated with scripts
- [ ] Logs reviewed and no errors
- [ ] Small test amount in wallet initially
- [ ] Emergency stop procedures understood

---

**Remember:** Start small, test thoroughly, monitor actively. The configuration system is designed to help you maintain control and safety across all system components.
