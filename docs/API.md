# APEX Arbitrage System - API Documentation

## 📚 Overview

This document describes the internal APIs and interfaces of the APEX Arbitrage System.

---

## 🦀 Rust Engine API

### RustEngine

Main engine for ultra-fast opportunity scanning.

#### Constructor

```rust
pub fn new() -> Self
```

Creates a new Rust Engine instance.

**Returns:** RustEngine instance

#### Methods

##### update_pool

```rust
pub fn update_pool(&self, pool: PoolState)
```

Updates the state of a liquidity pool.

**Parameters:**
- `pool: PoolState` - Pool state information

**Example:**
```rust
let pool = PoolState {
    dex: "quickswap".to_string(),
    token_a: "USDC".to_string(),
    token_b: "USDT".to_string(),
    reserve_a: 1000000.0,
    reserve_b: 1000000.0,
    fee: 0.003,
};
engine.update_pool(pool);
```

##### calculate_output

```rust
pub fn calculate_output(&self, input: f64, reserve_in: f64, reserve_out: f64, fee: f64) -> f64
```

Calculates output amount using constant product formula.

**Parameters:**
- `input: f64` - Input token amount
- `reserve_in: f64` - Input token reserve
- `reserve_out: f64` - Output token reserve
- `fee: f64` - Swap fee (e.g., 0.003 for 0.3%)

**Returns:** Output token amount

##### scan_2hop_routes

```rust
pub fn scan_2hop_routes(&self, test_amounts: &[f64]) -> Vec<ArbitrageOpportunity>
```

Scans all 2-hop arbitrage opportunities.

**Parameters:**
- `test_amounts: &[f64]` - Array of test amounts to try

**Returns:** Vector of arbitrage opportunities

##### scan_3hop_routes

```rust
pub fn scan_3hop_routes(&self, test_amounts: &[f64]) -> Vec<ArbitrageOpportunity>
```

Scans all 3-hop triangle arbitrage opportunities.

**Parameters:**
- `test_amounts: &[f64]` - Array of test amounts to try

**Returns:** Vector of arbitrage opportunities

##### parallel_scan

```rust
pub fn parallel_scan(&self, test_amounts: &[f64]) -> Vec<ArbitrageOpportunity>
```

Scans all route types in parallel using all CPU cores.

**Parameters:**
- `test_amounts: &[f64]` - Array of test amounts to try

**Returns:** Sorted vector of all opportunities (by profit descending)

**Example:**
```rust
let test_amounts = vec![500.0, 1000.0, 2000.0, 5000.0];
let opportunities = engine.parallel_scan(&test_amounts);
```

##### calculate_multihop_slippage

```rust
pub fn calculate_multihop_slippage(&self, route: &[String], amount: f64) -> f64
```

Calculates total slippage for a multi-hop route.

**Parameters:**
- `route: &[String]` - Array of token symbols in route
- `amount: f64` - Starting amount

**Returns:** Total slippage percentage

---

## 🐍 Python Orchestrator API

### MLEnsemble

Dual AI/ML engine with XGBoost and ONNX models.

#### Methods

##### load_models

```python
def load_models(self, xgb_path: str = None, onnx_path: str = None)
```

Loads pre-trained ML models.

**Parameters:**
- `xgb_path: str` - Path to XGBoost model
- `onnx_path: str` - Path to ONNX model

##### predict

```python
def predict(self, opportunity: Opportunity) -> float
```

Predicts success probability for an opportunity.

**Parameters:**
- `opportunity: Opportunity` - Arbitrage opportunity

**Returns:** Confidence score (0-1)

**Example:**
```python
ensemble = MLEnsemble()
score = ensemble.predict(opportunity)
if score > 0.8:
    execute(opportunity)
```

##### should_execute

```python
def should_execute(self, opportunity: Opportunity, threshold: float = 0.8) -> bool
```

Determines if opportunity should be executed.

**Parameters:**
- `opportunity: Opportunity` - Arbitrage opportunity
- `threshold: float` - Minimum confidence threshold (default: 0.8)

**Returns:** True if should execute

---

### ParallelChainScanner

Multi-chain scanning orchestrator.

#### Methods

##### scan_chain

```python
async def scan_chain(self, chain: ChainType) -> List[Opportunity]
```

Scans a single chain for opportunities.

**Parameters:**
- `chain: ChainType` - Chain to scan

**Returns:** List of opportunities

##### scan_all_chains

```python
async def scan_all_chains(self) -> List[Opportunity]
```

Scans all chains in parallel.

**Returns:** Combined list of all opportunities

**Example:**
```python
scanner = ParallelChainScanner()
opportunities = await scanner.scan_all_chains()
```

##### execute_cross_chain_arbitrage

```python
async def execute_cross_chain_arbitrage(
    self,
    source_chain: ChainType,
    target_chain: ChainType,
    amount: float
) -> Dict
```

Executes cross-chain arbitrage.

**Parameters:**
- `source_chain: ChainType` - Source chain
- `target_chain: ChainType` - Target chain
- `amount: float` - Trade amount

**Returns:** Execution result dictionary

---

### MicroRaptorBot

Hierarchical data fetching bot.

#### Methods

##### spawn_children

```python
def spawn_children(self, count: int = 4)
```

Spawns child bots for parallel fetching.

**Parameters:**
- `count: int` - Number of children to spawn (default: 4)

##### parallel_fetch

```python
async def parallel_fetch(self, targets: List[Dict]) -> List[Dict]
```

Fetches data in parallel.

**Parameters:**
- `targets: List[Dict]` - List of target configurations

**Returns:** List of fetched data

**Example:**
```python
bot = MicroRaptorBot(bot_id=0, layer=0)
bot.spawn_children()
targets = [
    {'dex': 'quickswap', 'pool': '0xabc...'},
    {'dex': 'sushiswap', 'pool': '0xdef...'}
]
data = await bot.parallel_fetch(targets)
```

---

### ApexOrchestrator

Main orchestrator coordinating all components.

#### Methods

##### initialize

```python
def initialize(self)
```

Initializes all components and loads models.

##### scan_opportunities

```python
async def scan_opportunities(self) -> List[Opportunity]
```

Scans for arbitrage opportunities across all chains.

**Returns:** List of opportunities

##### filter_opportunities

```python
def filter_opportunities(
    self,
    opportunities: List[Opportunity],
    min_profit: float = 5.0,
    confidence_threshold: float = 0.8
) -> List[Opportunity]
```

Filters opportunities using ML ensemble.

**Parameters:**
- `opportunities: List[Opportunity]` - Raw opportunities
- `min_profit: float` - Minimum profit threshold (USD)
- `confidence_threshold: float` - ML confidence threshold

**Returns:** Filtered and sorted opportunities

##### execute_opportunity

```python
async def execute_opportunity(self, opportunity: Opportunity) -> Dict
```

Executes an arbitrage opportunity.

**Parameters:**
- `opportunity: Opportunity` - Opportunity to execute

**Returns:** Execution result

##### get_metrics

```python
def get_metrics(self) -> Dict
```

Gets current performance metrics.

**Returns:** Metrics dictionary

**Example:**
```python
orchestrator = ApexOrchestrator()
orchestrator.initialize()
await orchestrator.run()
```

---

## 📊 Database API

### Functions

##### initializeDatabase

```javascript
function initializeDatabase()
```

Initializes database tables and indexes.

##### logExecution

```javascript
function logExecution(execution)
```

Logs an arbitrage execution.

**Parameters:**
- `execution: Object` - Execution details

**Example:**
```javascript
logExecution({
    timestamp: Date.now(),
    routeId: 'usdc_usdt_2hop',
    chain: 'polygon',
    tokens: ['USDC', 'USDT', 'USDC'],
    dexes: ['quickswap', 'sushiswap'],
    inputAmount: 1000,
    outputAmount: 1012,
    profitUsd: 12,
    status: 'success',
    txHash: '0xabc...',
    mlConfidence: 0.87
});
```

##### getStats

```javascript
function getStats()
```

Gets overall statistics.

**Returns:** Statistics object with:
- `total_executions: number`
- `successful_executions: number`
- `failed_executions: number`
- `success_rate: number`
- `total_profit: number`
- `avg_profit: number`

##### getRoutePerformance

```javascript
function getRoutePerformance(routeId = null)
```

Gets route performance statistics.

**Parameters:**
- `routeId: string|null` - Specific route ID or null for all routes

**Returns:** Route performance data

##### getRecentExecutions

```javascript
function getRecentExecutions(limit = 10)
```

Gets recent executions.

**Parameters:**
- `limit: number` - Number of executions to return (default: 10)

**Returns:** Array of execution records

---

## 📈 Telemetry API

### TelemetrySystem

Real-time metrics tracking.

#### Methods

##### recordScan

```javascript
telemetry.recordScan(timeMs, opportunitiesFound)
```

Records a scan operation.

**Parameters:**
- `timeMs: number` - Scan duration in milliseconds
- `opportunitiesFound: number` - Number of opportunities found

##### recordExecution

```javascript
telemetry.recordExecution(execution)
```

Records an execution attempt.

**Parameters:**
- `execution: Object` - Execution details

##### getMetrics

```javascript
telemetry.getMetrics()
```

Gets current metrics snapshot.

**Returns:** Metrics object

##### getTopRoutes

```javascript
telemetry.getTopRoutes(limit = 5)
```

Gets top performing routes.

**Parameters:**
- `limit: number` - Number of routes to return

**Returns:** Array of top routes

##### checkSafetyLimits

```javascript
telemetry.checkSafetyLimits(config)
```

Checks if within safety limits.

**Parameters:**
- `config: Object` - Safety configuration

**Returns:** Array of warnings

**Example:**
```javascript
import telemetry from './utils/telemetry.js';

telemetry.recordScan(45, 2500);
telemetry.recordExecution({
    routeId: 'usdc_usdt_2hop',
    status: 'success',
    profitUsd: 12
});

const metrics = telemetry.getMetrics();
console.log('Success rate:', metrics.successRate);
```

---

## 🔗 Smart Contract API

### ApexFlashArbitrage

Flash loan arbitrage contract.

#### Methods

##### executeArbitrage

```solidity
function executeArbitrage(
    address[] memory tokens,
    string[] memory dexes,
    uint256[] memory amounts,
    uint256 minProfit
) external onlyOwner nonReentrant
```

Executes multi-hop arbitrage with flash loan.

**Parameters:**
- `tokens: address[]` - Array of token addresses in route
- `dexes: string[]` - Array of DEX identifiers
- `amounts: uint256[]` - Array of swap amounts
- `minProfit: uint256` - Minimum acceptable profit

**Emits:** `ArbitrageExecuted` event

##### updateParameters

```solidity
function updateParameters(
    uint256 _minProfitBps,
    uint256 _maxGasPrice,
    uint256 _maxSlippageBps
) external onlyOwner
```

Updates safety parameters.

**Parameters:**
- `_minProfitBps: uint256` - Minimum profit in basis points
- `_maxGasPrice: uint256` - Maximum gas price in wei
- `_maxSlippageBps: uint256` - Maximum slippage in basis points

##### withdrawProfits

```solidity
function withdrawProfits(
    address token,
    address recipient
) external onlyOwner
```

Withdraws accumulated profits.

**Parameters:**
- `token: address` - Token address to withdraw
- `recipient: address` - Recipient address

##### getStats

```solidity
function getStats() external view returns (
    uint256 executions,
    uint256 profit,
    uint256 lastExecution
)
```

Gets contract statistics.

**Returns:**
- `executions: uint256` - Total executions
- `profit: uint256` - Total profit
- `lastExecution: uint256` - Last execution timestamp

**Example:**
```javascript
const contract = await ethers.getContractAt('ApexFlashArbitrage', address);

const [executions, profit, lastExecution] = await contract.getStats();
console.log('Total executions:', executions.toString());
console.log('Total profit:', ethers.formatEther(profit));
```

---

## 🔐 Configuration API

### Config Objects

#### CHAINS

```javascript
import { CHAINS } from './utils/config.js';

const polygonConfig = CHAINS.POLYGON;
// {
//   name: 'Polygon',
//   chainId: 137,
//   nativeCurrency: 'MATIC',
//   rpcUrl: '...',
//   explorerUrl: '...'
// }
```

#### DEXES

```javascript
import { DEXES } from './utils/config.js';

const polygonDexes = DEXES.POLYGON;
// [
//   { name: 'QuickSwap', router: '0x...', type: 'v2', fee: 0.003 },
//   ...
// ]
```

#### TOKENS

```javascript
import { TOKENS } from './utils/config.js';

const usdcAddress = TOKENS.POLYGON.USDC;
// '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174'
```

#### ARBITRAGE_ROUTES

```javascript
import { ARBITRAGE_ROUTES } from './utils/config.js';

const routes = ARBITRAGE_ROUTES;
// [
//   {
//     id: 'usdc_usdt_2hop',
//     tokens: ['USDC', 'USDT', 'USDC'],
//     dexes: ['quickswap', 'sushiswap'],
//     chain: 'POLYGON',
//     testAmounts: [500, 1000, 2000, 5000]
//   },
//   ...
// ]
```

---

## 📱 Event Emitters

### Node.js Events

```javascript
import EventEmitter from 'events';

const systemEvents = new EventEmitter();

// Listen for opportunities
systemEvents.on('opportunity', (opp) => {
    console.log('New opportunity:', opp.routeId);
});

// Listen for executions
systemEvents.on('execution', (result) => {
    console.log('Execution:', result.status);
});

// Listen for errors
systemEvents.on('error', (error) => {
    console.error('Error:', error.message);
});
```

---

## 🔍 Type Definitions

### TypeScript/JavaScript Types

```typescript
interface Opportunity {
    routeId: string;
    tokens: string[];
    dexes: string[];
    inputAmount: number;
    expectedOutput: number;
    gasEstimate: number;
    profitUsd: number;
    confidenceScore: number;
    chain: string;
    timestamp: number;
}

interface Execution {
    timestamp: number;
    routeId: string;
    chain: string;
    tokens: string[];
    dexes: string[];
    inputAmount: number;
    outputAmount: number;
    profitUsd: number;
    gasUsed: number;
    gasPriceGwei: number;
    txHash: string;
    status: 'success' | 'failed';
    errorMessage?: string;
    executionTimeMs: number;
    mlConfidence: number;
}

interface Metrics {
    totalScans: number;
    totalOpportunitiesFound: number;
    avgScanTimeMs: number;
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    successRate: number;
    totalProfitUSD: number;
    netProfitUSD: number;
    avgProfitPerTrade: number;
}
```

---

## 📚 Additional Resources

- [Architecture Documentation](./ARCHITECTURE.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [Troubleshooting Guide](./TROUBLESHOOTING.md)
