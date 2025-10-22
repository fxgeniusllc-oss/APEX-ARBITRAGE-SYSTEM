# Universal Configuration Implementation

## Overview

The APEX Arbitrage System uses a **universal configuration architecture** that centralizes all environment variables in a single `.env` file. This configuration is automatically loaded and shared across all system components, regardless of the programming language:

- **JavaScript/Node.js** components (via `src/utils/config.js`)
- **Python** components (via `src/python/config.py`)
- **Rust** components (via environment variables)

This document details the implementation architecture and how the universal configuration system maintains consistency across the multi-language codebase.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         .env File                           │
│                   (Single Source of Truth)                  │
└─────────────┬───────────────────────┬───────────────────────┘
              │                       │
              │                       │
    ┌─────────▼──────────┐  ┌────────▼─────────┐  ┌──────────────────┐
    │  JavaScript/Node.js │  │      Python      │  │       Rust       │
    │  src/utils/config.js│  │ src/python/      │  │  Environment     │
    │                     │  │   config.py      │  │   Variables      │
    └─────────┬──────────┘  └────────┬─────────┘  └────────┬─────────┘
              │                       │                      │
              │                       │                      │
    ┌─────────▼──────────┐  ┌────────▼─────────┐  ┌────────▼─────────┐
    │ DEX Pool Fetcher   │  │  ML AI Engine    │  │  Calculation     │
    │ Arbitrage Scanner  │  │  Cross-Chain     │  │  Engine          │
    │ Transaction Exec   │  │  Telemetry       │  │  High-Performance│
    └────────────────────┘  └──────────────────┘  └──────────────────┘
```

## Implementation Details

### 1. JavaScript/Node.js Configuration (`src/utils/config.js`)

The JavaScript configuration module uses `dotenv` to load environment variables and provides a comprehensive API for accessing configuration.

#### Key Features:

**Environment Variable Parsing**
```javascript
// Helper functions for type-safe environment variable access
function getEnv(key, defaultValue)         // Get with optional default
function getRequiredEnv(key)               // Throw error if missing
function getBoolEnv(key, defaultValue)     // Parse boolean
function getIntEnv(key, defaultValue)      // Parse integer
function getFloatEnv(key, defaultValue)    // Parse float
```

**Configuration Modules**
- `MODE` - Execution mode constants (LIVE, DEV, SIM)
- `CHAINS` - Network/chain configuration for all supported blockchains
- `DEXES` - DEX router and factory addresses by chain
- `TOKENS` - Token addresses organized by chain
- `ML_CONFIG` - Machine learning model configuration
- `SAFETY_CONFIG` - Risk management and safety parameters
- `SYSTEM_CONFIG` - General system settings
- `AI_ENGINE_CONFIG` - Hybrid AI engine configuration
- `EXECUTION_CONFIG` - Mode-aware execution settings

**Validation and Helpers**
```javascript
validateConfig()              // Validate required configuration
getModeDisplay()              // Get formatted mode description
shouldExecuteRealTransactions() // Check if in LIVE mode
getConfig()                   // Get all config (with redacted secrets)
```

#### Usage Example:

```javascript
import { 
    CHAINS,
    SAFETY_CONFIG,
    CURRENT_MODE,
    MODE,
    getModeDisplay 
} from './src/utils/config.js';

// Access chain configuration
const polygonRpc = CHAINS.POLYGON.rpcUrl;
const ethereumChainId = CHAINS.ETHEREUM.chainId;

// Access safety parameters
const minProfit = SAFETY_CONFIG.minProfitUSD;
const maxGasPrice = SAFETY_CONFIG.maxGasPriceGwei;

// Check execution mode
console.log(getModeDisplay()); // "🟡 DEV MODE - Runs all logic..."
if (CURRENT_MODE === MODE.LIVE) {
    console.log("⚠️  LIVE MODE - Real transactions will execute!");
}

// Mode-aware execution
if (EXECUTION_CONFIG.executeTransactions) {
    // Execute real transaction on-chain
    await executeArbitrage();
} else {
    // Simulate transaction (dry-run)
    console.log("💡 Simulating transaction...");
}
```

### 2. Python Configuration (`src/python/config.py`)

The Python configuration module mirrors the JavaScript implementation, providing identical structure and functionality using Python idioms.

#### Key Features:

**Type-Safe Environment Parsing**
```python
def get_env(key: str, default: Optional[str]) -> Optional[str]
def get_required_env(key: str) -> str
def get_bool_env(key: str, default: bool) -> bool
def get_int_env(key: str, default: int) -> int
def get_float_env(key: str, default: float) -> float
```

**Enums for Type Safety**
```python
class ExecutionMode(Enum):
    LIVE = "LIVE"
    DEV = "DEV"
    SIM = "SIM"

class ChainType(Enum):
    POLYGON = "polygon"
    ETHEREUM = "ethereum"
    # ... etc
```

**Configuration Classes**
- `ChainConfig` - Chain-specific settings
- `MLConfig` - Machine learning configuration
- `SafetyConfig` - Risk management parameters
- `SystemConfig` - General system settings
- `AIEngineConfig` - AI engine settings
- `ExecutionConfig` - Mode-aware execution

**Validation and Helpers**
```python
validate_config()           # Validate required configuration
get_mode_display()          # Get formatted mode description
should_execute_real_transactions()  # Check if in LIVE mode
get_config_summary()        # Get all config (with redacted secrets)
```

#### Usage Example:

```python
from src.python.config import (
    CHAINS,
    ChainType,
    SafetyConfig,
    CURRENT_MODE,
    ExecutionMode,
    get_mode_display
)

# Access chain configuration
polygon_rpc = CHAINS[ChainType.POLYGON].rpc_url
ethereum_chain_id = CHAINS[ChainType.ETHEREUM].chain_id

# Access safety parameters
min_profit = SafetyConfig.min_profit_usd
max_gas_price = SafetyConfig.max_gas_price_gwei

# Check execution mode
print(get_mode_display())  # "🟡 DEV MODE - Runs all logic..."
if CURRENT_MODE == ExecutionMode.LIVE:
    print("⚠️  LIVE MODE - Real transactions will execute!")

# Mode-aware execution
if ExecutionConfig.execute_transactions:
    # Execute real transaction on-chain
    execute_arbitrage()
else:
    # Simulate transaction (dry-run)
    print("💡 Simulating transaction...")
```

### 3. Rust Configuration

Rust components access configuration directly through environment variables using the `std::env` module and crates like `dotenv`.

#### Usage Example:

```rust
use std::env;
use dotenv::dotenv;

fn main() {
    // Load .env file
    dotenv().ok();

    // Access configuration
    let polygon_rpc = env::var("POLYGON_RPC_URL")
        .expect("POLYGON_RPC_URL must be set");
    
    let min_profit: f64 = env::var("MIN_PROFIT_USD")
        .unwrap_or_else(|_| "5.0".to_string())
        .parse()
        .expect("MIN_PROFIT_USD must be a valid number");
    
    let mode = env::var("MODE")
        .unwrap_or_else(|_| "DEV".to_string());
    
    // Mode-aware execution
    match mode.as_str() {
        "LIVE" => println!("⚠️  LIVE MODE - Real transactions!"),
        "DEV" => println!("🟡 DEV MODE - Dry-run"),
        "SIM" => println!("🔵 SIM MODE - Simulation"),
        _ => panic!("Invalid MODE: {}", mode),
    }
}
```

## Configuration Lifecycle

### 1. Loading Phase

```
┌─────────────────────────────────────────────────────────────┐
│ 1. System Startup                                           │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Load .env file (dotenv library)                         │
│    - JavaScript: dotenv.config()                            │
│    - Python: load_dotenv()                                  │
│    - Rust: dotenv().ok()                                    │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Parse Environment Variables                              │
│    - Type conversion (string → int/float/bool)              │
│    - Default value fallback                                 │
│    - Validation (required fields)                           │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Create Configuration Objects                             │
│    - JavaScript: Export constants and objects               │
│    - Python: Instantiate configuration classes              │
│    - Rust: Read values on demand                            │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Validation Phase                                         │
│    - validateConfig() / validate_config()                   │
│    - Check required variables                               │
│    - Validate value ranges                                  │
│    - Mode-specific validation (e.g., LIVE requires key)     │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. Configuration Ready                                      │
│    Application can safely access all configuration          │
└─────────────────────────────────────────────────────────────┘
```

### 2. Access Pattern

All components access configuration through their respective modules:

**JavaScript Components:**
```javascript
import { CHAINS, SAFETY_CONFIG } from './src/utils/config.js';
```

**Python Components:**
```python
from src.python.config import CHAINS, SafetyConfig
```

**Rust Components:**
```rust
let value = env::var("VARIABLE_NAME").unwrap();
```

### 3. Validation

Configuration validation happens at startup and can be manually triggered:

**JavaScript:**
```bash
node scripts/validate-config.js
```

**Python:**
```bash
python -m src.python.config
# or
python scripts/validate-config.py
```

## Configuration Consistency

### Naming Conventions

To ensure consistency across languages, the system follows these naming conventions:

| .env Variable | JavaScript | Python | Rust |
|--------------|------------|--------|------|
| `MODE` | `CURRENT_MODE` | `CURRENT_MODE` | `mode` |
| `POLYGON_RPC_URL` | `CHAINS.POLYGON.rpcUrl` | `CHAINS[ChainType.POLYGON].rpc_url` | `polygon_rpc` |
| `MIN_PROFIT_USD` | `SAFETY_CONFIG.minProfitUSD` | `SafetyConfig.min_profit_usd` | `min_profit_usd` |
| `ENABLE_ML_FILTERING` | `ML_CONFIG.enableFiltering` | `MLConfig.enable_filtering` | `enable_ml_filtering` |

**Convention Rules:**
- **.env variables**: SCREAMING_SNAKE_CASE
- **JavaScript**: camelCase for properties
- **Python**: snake_case for attributes
- **Rust**: snake_case for variables

### Type Mapping

Environment variables are strings by default. Type conversion is handled consistently:

| Type | .env Example | JavaScript | Python | Rust |
|------|-------------|------------|--------|------|
| String | `MODE=DEV` | `string` | `str` | `String` |
| Integer | `SCAN_INTERVAL=60000` | `number` | `int` | `i32/i64` |
| Float | `MIN_PROFIT_USD=5.5` | `number` | `float` | `f32/f64` |
| Boolean | `ENABLE_ML_FILTERING=true` | `boolean` | `bool` | `bool` |

**Boolean Parsing:**
- JavaScript: `'true'` or `'1'` → `true`
- Python: `'true'`, `'1'`, `'yes'`, `'on'` → `True`
- Rust: `"true"` → `true`

## Execution Modes

The universal configuration system provides three execution modes with consistent behavior across all languages:

### 🟡 DEV Mode (Default, Recommended for Testing)

```env
MODE=DEV
```

**Behavior:**
- ✅ Collects real-time DEX data
- ✅ Scans for arbitrage opportunities
- ✅ Runs all analysis and ML models
- ✅ Calculates profits and gas costs
- ❌ Does NOT execute transactions on-chain
- ✅ Simulates transactions (dry-run)
- ✅ Logs all opportunities for analysis

**Use Cases:**
- Testing and development
- Strategy validation
- System debugging
- Training and learning

### 🔵 SIM Mode (Simulation/Backtesting)

```env
MODE=SIM
```

**Behavior:**
- ✅ Can use historical or live data
- ✅ Backtesting strategies
- ❌ Does NOT execute transactions on-chain
- ✅ Simulates transactions
- ✅ Performance analysis and optimization

**Use Cases:**
- Strategy backtesting
- Historical analysis
- Parameter optimization
- Risk assessment

### 🔴 LIVE Mode (Production) ⚠️

```env
MODE=LIVE
```

**Behavior:**
- ✅ Collects real-time DEX data
- ✅ Scans for arbitrage opportunities
- ✅ Runs all analysis and ML models
- ✅ **EXECUTES REAL TRANSACTIONS ON-CHAIN**
- ⚠️ Uses real gas (costs real money)
- ⚠️ Requires funded wallet
- ⚠️ Private key must be configured

**Requirements:**
- Valid `PRIVATE_KEY` configured
- Funded wallet with gas
- Thorough testing in DEV mode
- Active monitoring setup

## Mode-Aware Execution

Both JavaScript and Python modules provide helper functions for mode-aware execution:

### JavaScript Implementation:

```javascript
import { 
    EXECUTION_CONFIG,
    shouldExecuteRealTransactions 
} from './src/utils/config.js';

async function processArbitrage(opportunity) {
    // All modes do analysis
    const analysis = await analyzeOpportunity(opportunity);
    
    if (!analysis.isProfitable) {
        return;
    }
    
    // Mode-aware execution
    if (EXECUTION_CONFIG.executeTransactions) {
        // LIVE mode: Execute real transaction
        console.log("🔴 Executing REAL transaction...");
        const tx = await executeTransaction(opportunity);
        console.log(`✅ Transaction confirmed: ${tx.hash}`);
    } else {
        // DEV/SIM mode: Simulate only
        console.log("🟡 Simulating transaction (dry-run)...");
        const simResult = await simulateTransaction(opportunity);
        console.log(`💡 Simulation result: ${simResult.profit} USD profit`);
    }
}
```

### Python Implementation:

```python
from src.python.config import (
    ExecutionConfig,
    should_execute_real_transactions
)

async def process_arbitrage(opportunity):
    # All modes do analysis
    analysis = await analyze_opportunity(opportunity)
    
    if not analysis.is_profitable:
        return
    
    # Mode-aware execution
    if ExecutionConfig.execute_transactions:
        # LIVE mode: Execute real transaction
        print("🔴 Executing REAL transaction...")
        tx = await execute_transaction(opportunity)
        print(f"✅ Transaction confirmed: {tx.hash}")
    else:
        # DEV/SIM mode: Simulate only
        print("🟡 Simulating transaction (dry-run)...")
        sim_result = await simulate_transaction(opportunity)
        print(f"💡 Simulation result: {sim_result.profit} USD profit")
```

## Configuration Validation

### Validation Rules

Both implementations enforce the same validation rules:

1. **Required Variables**
   - `POLYGON_RPC_URL` - Must be set
   - `ETHEREUM_RPC_URL` - Must be set
   - `PRIVATE_KEY` - Required only in LIVE mode

2. **Value Ranges**
   - `MIN_PROFIT_USD` - Must be non-negative
   - `MAX_GAS_PRICE_GWEI` - Must be positive
   - `SLIPPAGE_BPS` - Must be between 0-10000

3. **Mode-Specific**
   - LIVE mode requires `PRIVATE_KEY`
   - DEV/SIM modes can run without `PRIVATE_KEY`

### Running Validation

**JavaScript:**
```bash
# Validation script
node scripts/validate-config.js

# Manual validation
node -e "import('./src/utils/config.js').then(c => c.validateConfig())"
```

**Python:**
```bash
# Run as module (includes validation)
python -m src.python.config

# Validation script
python scripts/validate-config.py

# Manual validation
python -c "from src.python.config import validate_config; validate_config()"
```

### Validation Output

```
============================================================
APEX SYSTEM CONFIGURATION VALIDATION
============================================================

🟡 DEV MODE - Runs all logic with real data but simulates transactions (dry-run)

✅ Configuration Checks:
  ✅ POLYGON_RPC_URL is set
  ✅ ETHEREUM_RPC_URL is set
  ✅ MODE is valid: DEV
  ✅ MIN_PROFIT_USD is valid: 5.0
  ✅ MAX_GAS_PRICE_GWEI is valid: 100.0
  ℹ️  PRIVATE_KEY not required in DEV mode

✅ Configuration validation passed

Configuration Summary:
  - Execution Mode: DEV (Dry-run)
  - Chains: POLYGON, ETHEREUM, ARBITRUM, OPTIMISM, BASE, BSC
  - Safety: Min Profit $5.00, Max Gas 100 Gwei
  - ML Filtering: Enabled (threshold: 0.88)
  - Rust Engine: Enabled
  - Cross-Chain: Enabled
```

## Best Practices

### 1. Environment Variable Management

**DO:**
- ✅ Use `.env.example` as a template
- ✅ Copy to `.env` and configure
- ✅ Keep `.env` in `.gitignore`
- ✅ Use different `.env` files for different environments
- ✅ Validate configuration before deployment

**DON'T:**
- ❌ Commit `.env` to version control
- ❌ Share `.env` files with API keys
- ❌ Use free public RPC URLs in production
- ❌ Store private keys in plain text outside `.env`

### 2. Configuration Changes

**Adding New Configuration:**

1. Add to `.env.example` with documentation:
   ```env
   # New feature toggle
   ENABLE_NEW_FEATURE=false
   ```

2. Add to JavaScript config (`src/utils/config.js`):
   ```javascript
   export const FEATURE_CONFIG = {
       enableNewFeature: getBoolEnv('ENABLE_NEW_FEATURE', false)
   };
   ```

3. Add to Python config (`src/python/config.py`):
   ```python
   class FeatureConfig:
       enable_new_feature = get_bool_env('ENABLE_NEW_FEATURE', False)
   ```

4. Update validation if required:
   ```javascript
   if (FEATURE_CONFIG.enableNewFeature && !OTHER_REQUIRED_CONFIG) {
       errors.push('OTHER_REQUIRED_CONFIG needed when ENABLE_NEW_FEATURE is true');
   }
   ```

### 3. Testing Configuration

**Unit Tests:**
```javascript
// test/config.test.js
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { validateConfig } from '../src/utils/config.js';

describe('Configuration', () => {
    it('should validate successfully with required variables', () => {
        process.env.POLYGON_RPC_URL = 'https://example.com';
        process.env.ETHEREUM_RPC_URL = 'https://example.com';
        assert.doesNotThrow(() => validateConfig());
    });
});
```

**Integration Tests:**
```bash
# Test with DEV mode
MODE=DEV yarn test

# Test with different configurations
MIN_PROFIT_USD=10 MODE=DEV yarn test
```

### 4. Security Considerations

**Sensitive Data Protection:**
- Never log private keys or API tokens
- Redact sensitive values in debug output
- Use secure key management in production
- Rotate keys regularly
- Use separate wallets for testing

**Implementation:**
```javascript
// config.js - getConfig() redacts sensitive values
export function getConfig() {
    return {
        // ... other config
        wallet: {
            privateKey: WALLET_CONFIG.privateKey ? '***' : undefined
        },
        bloxroute: {
            authToken: BLOXROUTE_CONFIG.authToken ? '***' : undefined
        }
    };
}
```

## Troubleshooting

### Common Issues

**Issue: "POLYGON_RPC_URL is required"**
```
Solution: Set POLYGON_RPC_URL in .env file
POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/YOUR_API_KEY
```

**Issue: "PRIVATE_KEY is required in LIVE mode"**
```
Solution: Either add PRIVATE_KEY or switch to DEV mode
MODE=DEV  # Use DEV mode for testing
# OR
PRIVATE_KEY=your_key_here  # Add key for LIVE mode
```

**Issue: Configuration not loading**
```
Solution: 
1. Ensure .env file exists in project root
2. Check .env file permissions (should be readable)
3. Verify no syntax errors in .env
4. Restart application after .env changes
```

**Issue: Boolean not parsing correctly**
```
Solution: Use lowercase 'true' or 'false'
ENABLE_ML_FILTERING=true  # ✅ Correct
ENABLE_ML_FILTERING=True  # ❌ Won't work (case-sensitive)
```

### Debugging Configuration

**JavaScript:**
```javascript
import { getConfig } from './src/utils/config.js';
console.log(JSON.stringify(getConfig(), null, 2));
```

**Python:**
```python
from src.python.config import get_config_summary
import json
print(json.dumps(get_config_summary(), indent=2))
```

## Migration Guide

### From Separate Config Files

If you're migrating from separate configuration files:

1. **Create .env file:**
   ```bash
   cp .env.example .env
   ```

2. **Transfer settings:**
   - Copy values from old config files
   - Follow naming conventions in `.env.example`
   - Update variable names to match

3. **Update code imports:**
   ```javascript
   // Old
   import { config } from './old-config.js';
   
   // New
   import { CHAINS, SAFETY_CONFIG } from './src/utils/config.js';
   ```

4. **Test thoroughly:**
   ```bash
   # Validate configuration
   node scripts/validate-config.js
   python scripts/validate-config.py
   
   # Test in DEV mode
   MODE=DEV yarn start
   ```

5. **Remove old config files:**
   ```bash
   # After successful migration and testing
   git rm old-config.js old-config.py
   ```

## Summary

The Universal Configuration Implementation provides:

✅ **Single Source of Truth** - All configuration in one `.env` file  
✅ **Multi-Language Support** - JavaScript, Python, Rust  
✅ **Type Safety** - Automatic type conversion with validation  
✅ **Mode-Aware Execution** - DEV, SIM, and LIVE modes  
✅ **Consistent API** - Same structure across all languages  
✅ **Comprehensive Validation** - Startup and on-demand validation  
✅ **Security** - Sensitive value redaction and protection  
✅ **Easy to Extend** - Simple process for adding new configuration  

This architecture ensures that all system components—regardless of programming language—operate with the same configuration, preventing inconsistencies and reducing bugs.

---

**Next Steps:**
- Review [Configuration Guide](CONFIGURATION.md) for usage details
- Check [Troubleshooting Guide](TROUBLESHOOTING.md) for common issues
- See [Architecture Documentation](ARCHITECTURE.md) for system overview
