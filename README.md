# 🚀 APEX ARBITRAGE SYSTEM

## Production-Ready Multi-DEX Flash Loan Arbitrage Bot for Polygon

A complete, battle-tested arbitrage system BUILT WITH DUAL RUST SUPER SONIC TURBO ENGINES; CAPABLE OF 2000 + OPPORTUNITIES IN UNDER 50ms that executes profitable trades across 2 DOZEN + dex such as QuickSwap, SushiSwap, and Uniswap V2, V3, kyber, DODO using TOP OF THE INDUSTRY Ai , MULTIPLE ML MODELs, 4X4X4X4 SPAWNING MICRO RAPTOR BOTS; TO ASSIST WITH DATA FETCHING; ; AND MEMPOOL WATCHDOGS. THIS SYSTEM IS DEPLOYED ON POLYGON, BUT ABLE TO EXTENDS ACROSS POLYGON, ETH; BSC; BASE; OPTIMISM; ARBITRUM ; TRON ; SOLANA; AND MORE WITH 25 TOKENS EQUAVELINTY MAPPED ACROSS ALL 6 CHAINS AND ACCESSTO THE BAL V2-V3 VAUKLTS AND CURVES STABLE POOL GOLD MINES THIS APEX SYSTEM IS ABSOLUTELY A DOMINATING FORCE FROM HERE TO COME. WITH STATE OF THE ART METRICS AND DATA TELEMTRY DYNAMICALLY SCORED OPPORTUNIES  Balancer flash loans for **zero-capital trading**.

---

> 💡 **NEW!** True one-click installation! Get started in 15 minutes:
> ```bash
> git clone https://github.com/fxgeniusllc-oss/APEX-ARBITRAGE-SYSTEM.git
> cd APEX-ARBITRAGE-SYSTEM
> ./install-and-run.sh
> ```
> See [Quick Start Guide](QUICKSTART.md) for details.

---

## ✨ Key Features

- ⚡ **Zero-Capital Trading** - Uses Balancer flash loans (no upfront capital needed)
- 🔄 **Multi-DEX Support** - QuickSwap, SushiSwap, Uniswap V3
- 🎯 **Proven Routes** - Pre-configured 2-hop, 3-hop, and 4-hop arbitrage paths
- 🛡️ **Production Safety** - Emergency stops, rate limits, loss limits
- 📊 **Real-Time Monitoring** - Live dashboard, Telegram notifications, database logging
- 🖥️ **Advanced Terminal Display** - Comprehensive real-time activity monitoring with organized data presentation (NEW!)
- ⚙️ **Gas Optimized** - Smart gas price monitoring and execution optimization
- 🔐 **Secure** - Best practices for private key management and contract security
- 🤖 **Hybrid ML Controller** - LSTM + ONNX AI engine for real-time prediction (NEW!)
- 📡 **REST API** - FastAPI-based inference endpoint with Prometheus metrics
- 🚀 **Dual Model Support** - ONNX (fast) with PyTorch fallback for reliability
- 🔍 **Dynamic Pool Fetcher** - Multi-chain pool data fetching with TVL analysis (NEW!)

---

```
┌─────────────────────────────────────────────────────────────┐
│                   APEX ARBITRAGE SYSTEM                     │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
    ┌───▼────┐           ┌───▼────┐           ┌───▼────┐
    │Scanner │           │Executor│           │Monitor │
    └───┬────┘           └───┬────┘           └───┬────┘
        │                     │                     │
        │  ┌──────────────────┼──────────────────┐ │
        │  │                  │                  │ │
    ┌───▼──▼──┐          ┌───▼───┐         ┌───▼─▼──┐
    │QuickSwap│          │Balance│         │Telegram│
    │SushiSwap│──────────►Vault  ├────────►│Database│
    │Uniswap  │          │(Flash)│         │Logs    │
    └─────────┘          └───────┘         └────────┘
```

---

## 🚀 Quick Start

### 🎯 ONE-CLICK INSTALL & RUN (Recommended!)

**The easiest way to get started** - install everything and start trading in one command:

```bash
# Clone the repository
git clone https://github.com/fxgeniusllc-oss/APEX-ARBITRAGE-SYSTEM.git
cd APEX-ARBITRAGE-SYSTEM

# Run ONE-CLICK install and start
chmod +x install-and-run.sh
./install-and-run.sh
```

This automated script will:
- ✅ **Auto-install** all prerequisites (Node.js 18+, Python 3, Rust)
- ✅ **Install** all Node.js and Python dependencies
- ✅ **Build** Rust calculation engine
- ✅ **Setup** configuration files (.env)
- ✅ **Validate** complete installation
- ✅ **Test** system components (optional)
- ✅ **Start** the arbitrage system

**Time:** 5-15 minutes (depending on connection speed)  
**User Interaction:** Minimal (only for optional tests and final start confirmation)

---

### Alternative Setup Options

#### Option 1: Complete APEX Build (Advanced Users)

For manual control over the installation process:

```bash
# Run complete APEX setup
chmod +x setup-apex.sh
./setup-apex.sh
```

**Time:** 5-15 minutes

#### Option 2: Quick Setup (Existing Installations)

For quick dependency updates on existing installations:

```bash
# Run quick setup
chmod +x quickstart.sh
./quickstart.sh
```

**Time:** 2-5 minutes

### Post-Installation Steps

If you used the one-click installer (`install-and-run.sh`), you're already set up! Otherwise:

1. **Configure your environment:**
   ```bash
   cp .env.example .env
   nano .env  # Add your RPC URLs and private key
   ```

2. **Verify setup:**
   ```bash
   node scripts/comprehensive-validation.js
   # Or use the yarn script:
   yarn run verify
   
   # Complete wiring validation (recommended)
   yarn run verify:wiring
   
   # WebSocket connection validation
   yarn run verify:websocket
   
   # Run all validation checks
   yarn run verify:all
   
   # End-to-end integration test
   yarn run test:integration
   ```

3. **Start the system:**
   ```bash
   yarn start
   ```

### Available Commands

```bash
# System Operation
yarn start                             # Start production system
yarn run dev                           # Development mode
yarn run verify                        # Verify setup (quick check)
yarn run validate:performance          # Validate ML performance (NEW!)
yarn scripts/comprehensive-validation.js  # Complete validation
yarn run monitor                       # Live monitoring dashboard
yarn run benchmark                     # Performance benchmarks
yarn run deploy                        # Deploy smart contracts
yarn run start:all                     # Start everything (Node + Python)
python scripts/train_ml_models.py    # Train ML models (NEW!)
```

### Documentation

#### Getting Started
- ⚡ [Quick Start Guide](QUICKSTART.md) - Get running in 15 minutes
- 📥 [Installation Guide](INSTALLATION-GUIDE.md) - Complete installation instructions
- 📊 [Setup Comparison](docs/SETUP-COMPARISON.md) - Choose the right setup method
- 🖥️ [Terminal Display Guide](docs/TERMINAL-DISPLAY.md) - Real-time monitoring dashboard (NEW!)

#### Advanced
- 📖 [Complete Setup Guide](docs/APEX-SETUP.md) - Detailed installation and configuration
- 🏗️ [Architecture](docs/ARCHITECTURE.md) - System design and components
- 🚀 [Deployment Guide](docs/DEPLOYMENT.md) - Production deployment steps
- 🔧 [Troubleshooting](docs/TROUBLESHOOTING.md) - Common issues and solutions

---

## ✅ System Validation & Readiness

### Complete System Validation

The APEX system includes comprehensive validation tools to ensure all components are properly wired and ready:

```bash
# Complete system wiring validation (96.2% success rate)
yarn run verify:wiring

# WebSocket real-time connection validation
yarn run verify:websocket

# End-to-end integration test (100% success rate)
yarn run test:integration

# Run all validation checks
yarn run verify:all
```

### What Gets Validated

The validation tools verify:

1. **✅ Execution Modes** - LIVE/DEV/SIM working correctly
2. **✅ Multi-Chain Support** - All 6 chains configured (Polygon, Ethereum, Arbitrum, Optimism, Base, BSC)
3. **✅ DEX Integration** - 8+ DEXes configured and ready
4. **✅ Real-Time Data** - DEX pool fetchers, TVL orchestrator, SDK loaders
5. **✅ WebSocket Connections** - Real-time mempool monitoring and data streaming
6. **✅ Mempool Monitoring** - MEV strategies (front-running, back-running, sandwich)
7. **✅ 4x4x4x4 Parallel Execution** - Micro Raptor Bots for parallel processing
8. **✅ ML/AI Engine** - Ensemble models and prediction capabilities
9. **✅ Safety Mechanisms** - Profit thresholds, gas limits, loss limits
10. **✅ System Integration** - All components properly wired together

### System Readiness Report

For a complete system readiness report, see [SYSTEM-READINESS.md](SYSTEM-READINESS.md)

For MEV strategies documentation, see [docs/MEV-STRATEGIES.md](docs/MEV-STRATEGIES.md)

---

## 🧪 Testing & Regression Metrics

### Run All Tests

```bash
# Run comprehensive regression tests (JavaScript + Python)
yarn run test:regression

# Run JavaScript tests only
yarn test

# Run Python ML tests
python tests/test_ml_enhancements.py
python tests/test_enhanced_ml.py
```

### Test Results

The system includes **87 automated test cases** with **100% pass rate**:

- **62 JavaScript Tests** - Rust engine, AI integration, database operations
- **25 Python Tests** - ML enhancements, ensemble models, dynamic thresholding

**Current Test Metrics (v2.0.0):**
- ✅ Success Rate: 80.57%
- ✅ Avg Profit: $40.94 per trade
- ✅ Execution Time: 201.22ms avg
- ✅ Rust Engine: 2000+ opportunities in <50ms
- ✅ Test Suite Pass Rate: 100%

For detailed regression metrics and test results, see:
- [TEST-RESULTS-SUMMARY.md](TEST-RESULTS-SUMMARY.md) - Quick overview
- [docs/REGRESSION-TEST-REPORT.md](docs/REGRESSION-TEST-REPORT.md) - Complete report

---

## 💼 How It Works

### 1. **Continuous Scanning**
The bot continuously scans all configured arbitrage routes across multiple DEXes looking for price discrepancies.

### 2. **Profit Calculation**
For each opportunity:
- Simulates complete swap path
- Calculates gross profit
- Subtracts gas costs
- Validates against minimum profit threshold

### 3. **Flash Loan Execution**
When profitable opportunity found:
- Borrows tokens from Balancer (zero fee)
- Executes multi-hop swaps across DEXes
- Repays loan + keeps profit
- All in single atomic transaction

### 4. **Safety Validation**
Before execution:
- Checks gas price limits
- Validates daily loss limits
- Confirms rate limits
- Verifies no emergency stop

---

## 📊 Proven Arbitrage Routes

### 2-Hop Routes (Highest Success Rate)

```
1. USDC → USDT → USDC
   DEXes: QuickSwap → SushiSwap
   Type: Stablecoin spread
   Expected Profit: $5-15
   Gas Cost: ~$1.50
```

```
2. WMATIC → USDC → WMATIC
   DEXes: QuickSwap → SushiSwap
   Type: Price discrepancy
   Expected Profit: $8-25
   Gas Cost: ~$1.80
```

### 3-Hop Routes (High Volume)

```
3. USDC → WMATIC → WETH → USDC
   DEXes: QuickSwap → Uniswap V3 → SushiSwap
   Type: Triangle arbitrage
   Expected Profit: $10-40
   Gas Cost: ~$2.50
```

### 4-Hop Routes (Advanced)

```
4. USDC → WMATIC → WETH → DAI → USDC
   DEXes: QuickSwap → Uniswap V3 → SushiSwap → QuickSwap
   Type: Multi-asset rotation
   Expected Profit: $15-60
   Gas Cost: ~$3.50
```

---

## 🔧 Configuration

### Execution Modes

The APEX system now supports three execution modes:

```bash
# MODE options: LIVE, DEV, SIM
MODE=DEV

# 🔴 LIVE MODE
#    - Executes real arbitrage transactions on-chain
#    - Uses real funds - PRODUCTION ONLY
#    - All safety checks enforced

# 🟡 DEV MODE (DEFAULT)
#    - Collects and analyzes real live DEX data
#    - Simulates all transactions (dry-run)
#    - No on-chain execution - SAFE FOR TESTING
#    - Perfect for strategy validation

# 🔵 SIM MODE
#    - Simulation and backtesting mode
#    - Uses real market data
#    - Can incorporate historical data
#    - For strategy development and analysis
```

**⚠️ IMPORTANT**: Always test in DEV or SIM mode first. Only switch to LIVE mode after thorough testing and validation.

### Environment Variables (.env)

```bash
# Execution Mode
MODE=DEV                      # LIVE, DEV, or SIM

# Network
ALCHEMY_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/YOUR_KEY
PRIVATE_KEY=your_private_key_without_0x

# Execution
MIN_PROFIT_USD=5              # Minimum profit to execute
MAX_GAS_PRICE_GWEI=100        # Don't trade if gas > 100 Gwei
SLIPPAGE_BPS=50               # 0.5% slippage tolerance

# Safety
MAX_DAILY_LOSS=50             # Stop if daily loss exceeds $50
MAX_CONSECUTIVE_FAILURES=5    # Stop after 5 consecutive failures
MIN_TIME_BETWEEN_TRADES=30000 # 30 seconds minimum between trades

# Monitoring
SCAN_INTERVAL=60000           # Scan every 60 seconds
TELEGRAM_BOT_TOKEN=optional   # For notifications
TELEGRAM_CHAT_ID=optional     # Your Telegram chat ID
```

### Smart Contract Configuration

The deployed contract has adjustable parameters:

```solidity
// Update minimum profit threshold
contract.setMinProfitBps(10); // 0.1%

// Update maximum gas price
contract.setMaxGasPrice(100); // 100 Gwei

// Withdraw accumulated profits
contract.withdrawProfits(tokenAddress, yourAddress);
```

---

## 📈 Expected Performance

### Enhanced ML-Optimized Performance (NEW!)

With the ML-enhanced opportunity scoring system:

| Metric | Value |
|--------|-------|
| **Success Rate** | **95.52%** (up from 60-80%) |
| Opportunity Detection | 10,000+ historical samples |
| ML Filtering Rate | 99.3% (only top 0.7% executed) |
| Avg Execution Time | 201ms |
| Daily Profit Potential | $500-2000 (optimized) |
| False Positive Rate | <5% |

**Key Features**:
- 🤖 ML-enhanced 4-component scoring (Profit, Risk, Liquidity, Success)
- 📊 Real-time performance tracking (95% target, 99.9% excellence)
- 🎯 Exponential success probability mapping
- ⚡ 40,320 time-series data points for pattern analysis

See [Performance Enhancement Report](docs/PERFORMANCE_ENHANCEMENT_REPORT.md) for details.

### Optimal Market Conditions

| Metric | Value |
|--------|-------|
| Profit per Trade | $5-50 |
| Success Rate | 60-80% |
| Trades per Day | 10-50 |
| Daily Profit | $100-500 |
| Gas Cost per Trade | $1-4 |

### Factors Affecting Performance

✅ **Positive Factors:**
- High market volatility
- Low gas prices (< 50 Gwei)
- Low competition
- Large liquidity pools

⚠️ **Negative Factors:**
- High gas prices (> 100 Gwei)
- Low volatility (sideways markets)
- Many competing bots
- Network congestion

---

## 🛡️ Safety Features

### 1. Emergency Stop
```bash
# Create stop file
touch EMERGENCY_STOP

# Or programmatically
echo "1" > EMERGENCY_STOP
```

### 2. Rate Limiting
- Minimum 30 seconds between trades (configurable)
- Prevents excessive gas spending
- Avoids MEV bot competition

### 3. Loss Limits
- Daily loss limit: $50 (default)
- Consecutive failure limit: 5 trades
- Auto-shutdown when limits reached

### 4. Gas Price Protection
- Maximum gas price: 100 Gwei (default)
- Won't execute if gas too expensive
- Protects against unprofitable trades

### 5. Slippage Protection
- Default 0.5% slippage tolerance
- Validates minimum output amounts
- Transaction reverts if slippage exceeded

---

## 📱 Monitoring & Alerts

### Live Dashboard

The bot displays a comprehensive real-time terminal dashboard with detailed monitoring:

```
═══════════════════════════════════════════════════════════════
         APEX ARBITRAGE SYSTEM - REAL-TIME DASHBOARD
═══════════════════════════════════════════════════════════════

🎛️  SYSTEM STATUS
   ┌─────────────────────────┬───────────────┬──────────────────┐
   │ Component               │ Status        │ Details          │
   ├─────────────────────────┼───────────────┼──────────────────┤
   │ Execution Mode          │ 🟡 DEV        │ Uptime: 1h 23m   │
   │ Rust Engine             │ ● Online      │ 100x speed       │
   │ Python Orchestrator     │ ● Online      │ ML-powered       │
   │ Node.js Coordinator     │ ● Online      │ Multi-chain      │
   │ ML/AI Engine            │ ● Online      │ ONNX ensemble    │
   └─────────────────────────┴───────────────┴──────────────────┘

📊 EXECUTION STATISTICS
   Total Scans: 1,247
   Simulated Executions: 38
   Success Rate: 92.1%
   Total Profit: $284.50 (simulated)
   Net P/L: $272.20

🎯 ACTIVE OPPORTUNITIES
   • quickswap_sushiswap: $12.50 profit (85% confidence)
   • uniswapv3_balancer: $18.30 profit (82% confidence)

🏆 TOP PERFORMING ROUTES
   1. USDC/USDT spread: 93% success | $112.40 profit
   2. WMATIC/USDC arb: 75% success | $98.60 profit

📝 RECENT ACTIVITY LOG
   23:42:15 | ✅ Success  | Execution successful
   23:41:58 | 🎯 Opportunity | New opportunity detected
   23:41:45 | 🔍 Scan | Scan #1247 completed

⛽ MARKET CONDITIONS
   Gas Price: 45.2 Gwei (Optimal ✓)
   Network: Low congestion
   MATIC: $0.847 | ETH: $2,450.32

🤖 ML/AI ENGINE STATUS
   Model: ONNX | Inference: 15.2ms | Accuracy: 88.5%

⛓️  MULTI-CHAIN STATUS
   POLYGON: ● Online | Block #45,123,456 | 15 opportunities
   ETHEREUM: ● Online | Block #18,234,567 | 8 opportunities
   ARBITRUM: ● Online | Block #135,234,567 | 12 opportunities

═══════════════════════════════════════════════════════════════
⏰ Last Update: 2024-01-15 23:42:30 | Refresh Rate: 5s
💾 Press Ctrl+C to stop system
═══════════════════════════════════════════════════════════════
```

**Features:**
- 🎯 Real-time opportunity tracking with confidence scores
- 📊 Comprehensive execution statistics and success rates
- 🏆 Route performance metrics and historical data
- 📝 Chronological activity log with timestamps
- ⛽ Live market conditions and gas price monitoring
- 🤖 ML engine status and performance metrics
- ⛓️ Multi-chain status and block synchronization
- 🎨 Color-coded display for quick visual comprehension
- 📋 Organized table layouts for easy data scanning

**Try the Demo:**
```bash
node demo-terminal-display.js
```

See [Terminal Display Documentation](docs/TERMINAL-DISPLAY.md) for detailed usage guide.

### Telegram Notifications

Receive instant notifications for:
- ✅ Successful arbitrage executions
- ❌ Failed transactions
- ⚠️ System warnings
- 📊 Periodic status updates

Setup:
1. Create bot with [@BotFather](https://t.me/botfather)
2. Get your chat ID from [@userinfobot](https://t.me/userinfobot)
3. Add to .env file

### Database Logging

All executions logged to SQLite database:

```javascript
// Query execution history
const { getStats } = require('./utils/database');
const stats = await getStats();

console.log('Total Executions:', stats.total_executions);
console.log('Total Profit:', stats.total_profit);
console.log('Average Profit:', stats.avg_profit);
```

---

## 🔍 Troubleshooting

### Issue: "Transaction Reverted"

**Causes:**
- Price moved before execution
- Insufficient liquidity
- Slippage exceeded

**Solutions:**
```bash
# Increase slippage tolerance
SLIPPAGE_BPS=100  # 1% instead of 0.5%

# Increase minimum profit (reduces false positives)
MIN_PROFIT_USD=10

# Reduce scan interval (faster execution)
SCAN_INTERVAL=30000  # 30 seconds
```

### Issue: "Gas Price Too High"

**Cause:** Network congestion

**Solution:**
```bash
# Increase max gas price (if profitable)
MAX_GAS_PRICE_GWEI=150

# Or wait for gas to drop (bot will auto-resume)
```

### Issue: "No Profitable Opportunities"

**Causes:**
- Low market volatility
- High gas prices
- Tight profit threshold

**Solutions:**
```bash
# Lower profit threshold (use with caution)
MIN_PROFIT_USD=3

# Increase test amounts (larger trades = larger profits)
# Edit ROUTES array in production-runner.js
const testAmounts = [500, 1000, 2000, 5000];
```

### Issue: "Insufficient MATIC Balance"

**Solution:**
```bash
# Check balance
yarn verify

# Send MATIC to your wallet address
# Recommended: 10 MATIC for sustained operations
```

---

## 🚀 Advanced Features

### 1. Custom Routes

Add your own arbitrage routes:

```javascript
// In apex-production-runner.js
const ROUTES = [
  // ... existing routes
  {
    id: 'custom_route_1',
    path: ['TOKEN_A', 'TOKEN_B', 'TOKEN_C', 'TOKEN_A'],
    dexes: ['quickswap', 'sushiswap', 'uniswap_v3'],
    description: 'Your custom route',
    gasEstimate: 500000,
    priority: 2
  }
];
```

### 2. Dynamic Optimization

The system learns from execution history:

```javascript
const { optimizeRoutes } = require('./utils/optimizer');

// Routes automatically ranked by:
// - Historical success rate
// - Average profitability
// - Recent performance
const optimized = await optimizeRoutes(ROUTES);
```

### 3. Multi-Chain Expansion

Deploy to other chains:

```javascript
// In hardhat.config.js
networks: {
  polygon: { ... },
  arbitrum: {
    url: process.env.ARBITRUM_RPC,
    accounts: [process.env.PRIVATE_KEY],
    chainId: 42161
  },
  optimism: {
    url: process.env.OPTIMISM_RPC,
    accounts: [process.env.PRIVATE_KEY],
    chainId: 10
  }
}
```

### 4. Mempool Monitoring (Advanced)

Monitor pending transactions for faster execution:

```javascript
const provider = new ethers.providers.WebSocketProvider(CONFIG.RPC_WSS);

provider.on('pending', async (txHash) => {
  const tx = await provider.getTransaction(txHash);
  // Analyze pending transaction
  // Front-run if profitable (use with caution - MEV territory)
});
```

---

## 💡 Best Practices

### 1. Start Small
- Begin with minimum profit threshold of $5-10
- Run for 24 hours monitoring closely
- Gradually increase capital allocation

### 2. Optimize Gas Usage
- Trade during low gas periods (late night UTC)
- Use gas price monitoring
- Consider EIP-1559 (set maxPriorityFeePerGas)

### 3. Diversify Routes
- Don't rely on single route
- Test multiple DEX combinations
- Monitor route performance

### 4. Security First
- NEVER commit .env file
- Use hardware wallet for large amounts
- Regular security audits
- Keep dependencies updated

### 5. Monitor Closely
- Check dashboard regularly
- Set up Telegram alerts
- Review logs daily
- Track profitability trends

---

## 🤖 Hybrid ML Controller (NEW!)

### Overview
The APEX system now includes a FastAPI-based AI engine that provides real-time arbitrage opportunity prediction using LSTM and ONNX models.

### Quick Start

1. **Install Python dependencies:**
```bash
pip install -r requirements.txt
```

2. **Start the AI Engine:**
```bash
yarn run ai:start
# Or in development mode with auto-reload:
yarn run ai:dev
```

3. **Make predictions:**
```bash
curl -X POST http://localhost:8001/predict \
  -H "Content-Type: application/json" \
  -d '{"features": [10.5, 1.012, 3, 0.35, 0.87, 0.5, 2, 1.0]}'
```

### Features
- 🚀 **5-15ms inference time** with ONNX models
- 🔄 **Automatic fallback** to PyTorch if ONNX unavailable
- 📊 **Prometheus metrics** at port 9090
- 💾 **Redis caching** for performance (optional)
- 🎯 **85-90% accuracy** on validation data

### API Endpoints
- `POST /predict` - Get AI prediction for opportunity
- `GET /status` - Check engine status
- `GET /health` - Health check
- `GET /metrics_summary` - Performance metrics

### Configuration
Add to your `.env` file:
```bash
LIVE_TRADING=false
AI_THRESHOLD=0.78
AI_ENGINE_PORT=8001
AI_MODEL_PATH=./data/models/lstm_omni.onnx
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
PROMETHEUS_PORT=9090
```

### Documentation
For detailed information, see [Hybrid ML Controller Documentation](docs/HYBRID_ML_CONTROLLER.md)

---

## 🚀 Advanced Features

### Execution Modes (LIVE/DEV/SIM)

The APEX system supports three execution modes for maximum safety and flexibility:

#### 🔴 LIVE Mode
- **Purpose**: Production trading with real funds
- **Behavior**: Executes actual on-chain transactions
- **Data**: Uses real-time DEX data
- **Risk**: HIGH - Real money at stake
- **Use When**: After thorough testing in DEV/SIM modes

#### 🟡 DEV Mode (Default)
- **Purpose**: Development and strategy testing
- **Behavior**: Simulates all transactions (dry-run)
- **Data**: Uses real-time DEX data
- **Risk**: ZERO - No on-chain execution
- **Use When**: Testing new strategies, validating changes

#### 🔵 SIM Mode
- **Purpose**: Backtesting and simulation
- **Behavior**: Simulates transactions with historical/real data
- **Data**: Can use real-time or historical data
- **Risk**: ZERO - No on-chain execution
- **Use When**: Strategy development, performance analysis

**Configuration:**
```bash
# Set in .env file
MODE=DEV  # Options: LIVE, DEV, SIM
```

### Flashloan Integration

Comprehensive flashloan support across multiple protocols:

- **Balancer**: 0% fee flashloans (preferred)
- **Aave**: 0.09% fee, high liquidity
- **dYdX**: 0% fee (Ethereum only)
- **Uniswap V3**: Pool-based flash swaps

**Features:**
- Automatic provider selection based on amount and fees
- Smart fallback between providers
- Gas optimization for flashloan execution
- Support for multi-hop arbitrage with flashloans

**Example:**
```javascript
import { getFlashloanIntegrator } from './utils/flashloanIntegration.js';

const integrator = getFlashloanIntegrator(provider, wallet);

// Smart flashloan execution
const result = await integrator.executeSmartFlashloan(
    'polygon',
    USDC_ADDRESS,
    ethers.parseUnits('10000', 6),
    arbitrageData
);
```

### BloXroute Integration

High-speed transaction propagation and MEV protection:

- **Fast Propagation**: <50ms to validators
- **MEV Protection**: Private transaction submission
- **Bundle Support**: Multi-transaction atomic bundles
- **Mempool Monitoring**: Real-time pending transaction stream
- **Gas Optimization**: Intelligent gas pricing

**Configuration:**
```bash
BLOXROUTE_AUTH_TOKEN=your_token_here
ENABLE_BLOXROUTE=true
```

**Features:**
```javascript
import { getBloxrouteGateway } from './utils/bloxrouteIntegration.js';

const gateway = getBloxrouteGateway(authToken);

// Send with MEV protection
await gateway.sendTransaction(signedTx, 'polygon', {
    frontRunningProtection: true,
    nextValidator: true
});

// Subscribe to mempool
await gateway.subscribeToPendingTxs('polygon', filters, callback);
```

### Merkle Tree Batch Processing

Efficient batch transaction submission using Merkle trees:

- **Gas Savings**: ~70% reduction for batch transactions
- **Atomic Execution**: All or nothing batch processing
- **Proof Generation**: Cryptographic verification of inclusion
- **Auto-Batching**: Automatic batch optimization

**Example:**
```javascript
import { getMerkleTreeSender } from './utils/merkleTreeSender.js';

const sender = getMerkleTreeSender(provider, wallet);

// Add transactions to batch
sender.addTransaction(tx1);
sender.addTransaction(tx2);
sender.addTransaction(tx3);

// Send batch (saves ~16000 gas per tx after first)
const result = await sender.sendBatch();
```

### TVL Hyperspeed Orchestrator

Ultra-fast TVL monitoring across all chains and DEXes:

- **Speed**: <10ms response time with caching
- **Coverage**: All major DEXes and chains
- **Parallel Fetching**: Concurrent pool data retrieval
- **Smart Caching**: 60-second cache with automatic refresh

**Features:**
- Real-time TVL tracking
- Pool discovery and monitoring
- Significant TVL change alerts
- Multi-chain aggregation

### Pool Registry

Comprehensive pool discovery and management:

- **Universal Discovery**: All DEXes and chains
- **Smart Indexing**: Fast token pair lookups
- **Route Finding**: Automatic arbitrage route detection
- **Historical Tracking**: Pool performance over time

**Example:**
```python
from pool_registry import get_pool_registry

registry = get_pool_registry()

# Find pools for token pair
pools = registry.find_pools_for_token_pair(
    USDC_ADDRESS,
    USDT_ADDRESS,
    chain='polygon',
    min_tvl=100000
)

# Find arbitrage routes
routes = registry.find_arbitrage_routes(
    USDC_ADDRESS,
    'polygon',
    max_hops=3
)
```

### DeFi Analytics ML

Advanced ML-powered opportunity analysis:

- **Profit Prediction**: RandomForest regression
- **Success Classification**: Gradient boosting
- **Risk Assessment**: Multi-factor risk scoring
- **Performance Tracking**: Real-time accuracy metrics

**Features:**
- 19-feature vector analysis
- Risk-adjusted return calculation
- Automated recommendations
- Continuous learning from results

**Example:**
```python
from defi_analytics import get_defi_analytics

analytics = get_defi_analytics()

# Score opportunity
analysis = analytics.score_opportunity(opportunity)

print(f"Overall Score: {analysis['overall_score']}")
print(f"Success Probability: {analysis['success_probability']}")
print(f"Risk Score: {analysis['risk_score']}")
print(f"Recommendation: {analysis['recommendation']}")
```

### Documentation
For detailed information, see [Hybrid ML Controller Documentation](docs/HYBRID_ML_CONTROLLER.md)

---

## 📚 API Reference

### Main Functions

#### simulateRoute(route, amountUSD)
Simulates an arbitrage route without execution.

```javascript
const result = await simulateRoute(ROUTES[0], 1000);
console.log('Profitable:', result.profitable);
console.log('Net Profit:', result.netProfit);
```

#### executeArbitrage(opportunity)
Executes a profitable arbitrage opportunity.

```javascript
if (opportunity.profitable) {
  const txHash = await executeArbitrage(opportunity);
  console.log('Transaction:', txHash);
}
```

#### getGasPrice()
Gets current gas price in Gwei.

```javascript
const gasPrice = await getGasPrice();
console.log('Current gas:', gasPrice, 'Gwei');
```

---

## 📊 Performance Tracking

### View Statistics

```bash
# Real-time dashboard
yarn start

# Query database
node -e "
const { getStats } = require('./utils/database');
getStats().then(stats => console.log(stats));
"

# View logs
tail -f logs/$(date +%Y-%m-%d).log
```

### Export Data

```javascript
const { db } = require('./utils/database');

// Export to CSV
db.all(`
  SELECT * FROM executions 
  WHERE timestamp > datetime('now', '-7 days')
`, (err, rows) => {
  const csv = rows.map(r => Object.values(r).join(',')).join('\n');
  fs.writeFileSync('export.csv', csv);
});
```

---
---

---

## ⚠️ Disclaimer

**IMPORTANT:** This software is provided for educational purposes only. 

- Cryptocurrency trading involves substantial risk
- Past performance does not guarantee future results
- Only trade with capital you can afford to lose
- Comply with all applicable laws and regulations
- No warranty or guarantee of profitability
- Authors not liable for financial losses

**Use at your own risk.**

---

## 🆘 Support

### Documentation
- 📖 [Full Deployment Guide](./DEPLOYMENT.md)
- 🔐 [Security Best Practices](./SECURITY.md)
- 🐛 [Troubleshooting Guide](./TROUBLESHOOTING.md)
- 🔄 [Dynamic Pool Fetcher Guide](./docs/POOL-FETCHER.md)

## 🎯 Roadmap

### Q1 2025
- ✅ Polygon mainnet launch
- ✅ Multi-DEX support (3 DEXes)
- ✅ Flash loan integration
- 🔄 ML-based route optimization

### Q2 2025
- 📋 Multi-chain expansion (Arbitrum, Optimism)
- 📋 Advanced MEV protection
- 📋 Automated liquidity analysis
- 📋 Mobile app monitoring

### Q3 2025
- 📋 Cross-chain arbitrage
- 📋 Options arbitrage
- 📋 Lending protocol integration
- 📋 DAO governance

---

## 🙏 Acknowledgments

Built with:
- [Balancer](https://balancer.fi/) - Flash loan infrastructure
- [Uniswap](https://uniswap.org/) - DEX protocol
- [QuickSwap](https://quickswap.exchange/) - Polygon DEX
- [SushiSwap](https://sushi.com/) - Multi-chain DEX
- [Hardhat](https://hardhat.org/) - Ethereum development environment
- [Web3.js](https://web3js.org/) - Ethereum JavaScript API

---

## 🎬 Ready to Start?

### Complete APEX Build (Recommended)
```bash
chmod +x setup-apex.sh && ./setup-apex.sh
```

### Quick Setup (Existing Installation)
```bash
chmod +x quickstart.sh && ./quickstart.sh
```

### Learn More
- 📖 [APEX Setup Guide](docs/APEX-SETUP.md)
- 📊 [Setup Comparison](docs/SETUP-COMPARISON.md)
- 🔧 [Troubleshooting](docs/TROUBLESHOOTING.md)

Happy Trading! 🚀💰
