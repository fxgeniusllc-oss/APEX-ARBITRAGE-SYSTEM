# APEX MEV STRATEGIES DOCUMENTATION

## Overview

The APEX Arbitrage System includes advanced MEV (Maximal Extractable Value) capabilities for detecting and executing profitable transactions in the mempool. The system supports three primary MEV strategies:

1. **Front-Running**: Execute transaction before target transaction
2. **Back-Running**: Execute transaction immediately after target transaction
3. **Sandwich Attacks**: Execute transactions before and after target transaction

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    MEV Strategy Pipeline                     │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
   ┌────▼────┐           ┌───▼────┐           ┌───▼────┐
   │ Mempool │           │Analysis│           │Execute │
   │ Monitor │───────────►  Engine├───────────► Strategy│
   └─────────┘           └────────┘           └────────┘
        │                     │                     │
        │              ┌──────▼──────┐              │
        │              │   Strategy  │              │
        │              │  Selection  │              │
        │              │  - Frontrun │              │
        │              │  - Backrun  │              │
        │              │  - Sandwich │              │
        │              └─────────────┘              │
        │                                           │
   ┌────▼──────────────────────────────────────────▼────┐
   │         BloXroute / Flashbots Integration          │
   │       (Private Transaction Submission)              │
   └────────────────────────────────────────────────────┘
```

## Components

### 1. MempoolWatchdog

The `MempoolWatchdog` class monitors pending transactions and identifies MEV opportunities.

**Location**: `src/python/orchestrator.py`

**Key Methods**:

- `monitor_mempool(chain)` - Continuously monitors mempool for pending transactions
- `analyze_transaction(tx)` - Analyzes transaction for MEV potential
- `detect_frontrun_opportunity(tx)` - Identifies front-running opportunities
- `detect_backrun_opportunity(tx)` - Identifies back-running opportunities
- `detect_sandwich_opportunity(tx)` - Identifies sandwich attack opportunities
- `should_submit_private(opportunity)` - Determines if private relay should be used

### 2. Front-Running Strategy

**Description**: Execute a transaction with higher gas price before the target transaction to capture arbitrage opportunities.

**Use Cases**:
- Large DEX swaps that move prices
- Liquidation events
- Token launches

**Implementation**:
```python
def detect_frontrun_opportunity(self, tx: Dict) -> Optional[Dict]:
    if not tx.get('affects_price'):
        return None
        
    estimated_profit = self._calculate_frontrun_profit(tx)
    
    if estimated_profit > 5.0:
        return {
            'type': 'frontrun',
            'target_tx_hash': tx.get('hash'),
            'estimated_profit': estimated_profit,
            'recommended_gas_price': tx.get('gas_price', 0) * 1.15
        }
    
    return None
```

**Gas Strategy**: Submit with 15-20% higher gas price than target transaction

**Profitability Threshold**: Minimum $5 profit after gas costs

### 3. Back-Running Strategy

**Description**: Execute arbitrage transaction immediately after target transaction creates price inefficiency.

**Use Cases**:
- Arbitrage after large swaps
- Correcting price discrepancies
- Following liquidations

**Implementation**:
```python
def detect_backrun_opportunity(self, tx: Dict) -> Optional[Dict]:
    if tx.get('creates_arbitrage'):
        estimated_profit = self._calculate_backrun_profit(tx)
        
        if estimated_profit > 5.0:
            return {
                'type': 'backrun',
                'target_tx_hash': tx.get('hash'),
                'estimated_profit': estimated_profit,
                'wait_for_confirmation': True
            }
    
    return None
```

**Gas Strategy**: Submit immediately after target transaction confirmation

**Profitability Threshold**: Minimum $5 profit after gas costs

### 4. Sandwich Attack Strategy

**Description**: Execute buy transaction before target, then sell after target executes, capturing slippage.

**Mechanism**:
1. **Front-run**: Buy token to increase price
2. **Victim TX**: Executes at worse price
3. **Back-run**: Sell token for profit

**Use Cases**:
- Large swaps with high slippage tolerance
- Retail traders with permissive slippage settings
- Liquidity pool interactions

**Implementation**:
```python
def detect_sandwich_opportunity(self, tx: Dict) -> Optional[Dict]:
    if not self._is_sandwichable(tx):
        return None
    
    token_in = tx.get('token_in')
    token_out = tx.get('token_out')
    amount = tx.get('amount', 0)
    
    front_run_amount = amount * 0.5
    estimated_profit = self._calculate_sandwich_profit(tx, front_run_amount)
    
    if estimated_profit > 10.0:
        return {
            'type': 'sandwich',
            'target_tx_hash': tx.get('hash'),
            'estimated_profit': estimated_profit,
            'front_run': {
                'token_in': token_in,
                'token_out': token_out,
                'amount': front_run_amount,
                'gas_price': tx.get('gas_price', 0) * 1.2
            },
            'back_run': {
                'token_in': token_out,
                'token_out': token_in,
                'amount': 'calculated_after_frontrun',
                'gas_price': tx.get('gas_price', 0) * 1.05
            }
        }
    
    return None
```

**Sandwich Criteria**:
- Minimum transaction size: $5,000
- Slippage tolerance: > 1%
- Pool liquidity: > $100,000

**Gas Strategy**: 
- Front-run: 20% higher gas than victim
- Back-run: 5% higher gas than victim

**Profitability Threshold**: Minimum $10 profit after gas costs

## Configuration

### Environment Variables

Add to `.env` file:

```bash
# MEV Configuration
ENABLE_MEMPOOL_MONITORING=true
ENABLE_FRONTRUNNING=true
ENABLE_BACKRUNNING=true
ENABLE_SANDWICH_ATTACKS=true

# MEV Thresholds
MIN_FRONTRUN_PROFIT=5.0
MIN_BACKRUN_PROFIT=5.0
MIN_SANDWICH_PROFIT=10.0

# Private Relay Configuration
USE_PRIVATE_RELAY=true
FLASHBOTS_RELAY_URL=https://relay.flashbots.net
EDEN_RELAY_URL=https://api.edennetwork.io/v1/rpc
BLOXROUTE_AUTH_TOKEN=your_token_here

# Gas Configuration
MAX_GAS_MULTIPLIER=1.5  # Maximum 50% gas increase
SANDWICH_FRONTRUN_GAS_MULTIPLIER=1.2
SANDWICH_BACKRUN_GAS_MULTIPLIER=1.05
```

### Python Configuration

```python
# In src/python/orchestrator.py
class ApexOrchestrator:
    def __init__(self):
        self.mempool_watchdog = MempoolWatchdog()
        self.enable_mev = os.getenv('ENABLE_MEMPOOL_MONITORING', 'false') == 'true'
        
        # MEV strategy thresholds
        self.min_frontrun_profit = float(os.getenv('MIN_FRONTRUN_PROFIT', '5.0'))
        self.min_backrun_profit = float(os.getenv('MIN_BACKRUN_PROFIT', '5.0'))
        self.min_sandwich_profit = float(os.getenv('MIN_SANDWICH_PROFIT', '10.0'))
```

## Data Sources

### WebSocket Connections

The system can monitor mempool through multiple data sources:

1. **Alchemy WebSocket**
   ```javascript
   const provider = new ethers.WebSocketProvider(
       process.env.POLYGON_WSS_URL
   );
   
   provider.on('pending', async (txHash) => {
       const tx = await provider.getTransaction(txHash);
       // Analyze transaction
   });
   ```

2. **BloXroute Stream**
   ```javascript
   import { getBloxrouteGateway } from './utils/bloxrouteIntegration.js';
   
   const gateway = getBloxrouteGateway(authToken);
   await gateway.subscribeToPendingTxs('polygon', filters, callback);
   ```

3. **Infura WebSocket**
   ```javascript
   const ws = new WebSocket(process.env.INFURA_WSS_URL);
   ws.on('message', (data) => {
       // Process mempool data
   });
   ```

## Safety Mechanisms

### 1. Profit Validation

All MEV strategies validate profitability before execution:

```python
def validate_mev_opportunity(opportunity: Dict) -> bool:
    estimated_profit = opportunity['estimated_profit']
    gas_cost = calculate_gas_cost(opportunity)
    
    net_profit = estimated_profit - gas_cost
    
    return net_profit > opportunity['min_profit_threshold']
```

### 2. Gas Price Limits

Maximum gas price multipliers prevent unprofitable execution:

```python
max_gas_price = target_tx_gas_price * MAX_GAS_MULTIPLIER
if our_gas_price > max_gas_price:
    return False  # Skip opportunity
```

### 3. Private Relay Protection

High-value opportunities use private relays to prevent being front-run:

```python
def should_submit_private(opportunity):
    return opportunity['estimated_profit'] > 50.0
```

### 4. Slippage Protection

All transactions include slippage protection:

```python
min_output_amount = expected_output * (1 - slippage_tolerance)
```

## Execution Flow

### Sandwich Attack Example

```
Time: T0
├─ [MEMPOOL] Detect victim transaction
│  └─ Amount: $10,000 USDC → WETH
│  └─ Slippage: 3%
│  └─ Gas: 50 Gwei
│
├─ [ANALYSIS] Calculate sandwich profit
│  └─ Estimated profit: $15.50
│  └─ Gas cost: $4.00
│  └─ Net profit: $11.50 ✓
│
├─ [FRONTRUN] Submit buy transaction
│  └─ Amount: $5,000 USDC → WETH
│  └─ Gas: 60 Gwei (20% higher)
│  └─ Status: PENDING
│
Time: T1
├─ [CONFIRM] Front-run transaction mined
│  └─ Block: #12345678
│
├─ [VICTIM] Victim transaction executes
│  └─ Worse price due to our front-run
│
Time: T2
├─ [BACKRUN] Submit sell transaction
│  └─ Amount: All WETH → USDC
│  └─ Gas: 52.5 Gwei (5% higher than victim)
│  └─ Status: PENDING
│
Time: T3
└─ [COMPLETE] Back-run transaction mined
   └─ Total profit: $11.50 ✓
```

## Performance Metrics

### Expected Performance

| Strategy | Success Rate | Avg Profit | Gas Cost | Net Profit |
|----------|-------------|-----------|----------|------------|
| Front-run | 40-60% | $10-30 | $2-5 | $8-25 |
| Back-run | 60-80% | $8-20 | $1-3 | $7-17 |
| Sandwich | 30-50% | $20-50 | $4-8 | $16-42 |

### Optimization Tips

1. **Use Private Relays** - Protect high-value opportunities
2. **Monitor Gas Prices** - Skip during high network congestion
3. **Filter Transactions** - Focus on high-probability opportunities
4. **Batch Operations** - Combine multiple strategies when possible
5. **Dynamic Gas Pricing** - Adjust based on network conditions

## Risks and Considerations

### Ethical Considerations

⚠️ **WARNING**: MEV strategies, particularly sandwich attacks, are controversial:

- Can harm retail traders by increasing their slippage
- May be considered predatory by some in the community
- Some protocols implement protection mechanisms
- Legal status varies by jurisdiction

**Recommendation**: 
- Only target large trades with excessive slippage tolerance
- Avoid targeting obvious retail/small traders
- Consider implementing "ethical MEV" filters
- Stay informed about regulatory developments

### Technical Risks

1. **Failed Transactions** - Mempool conditions change rapidly
2. **Being Sandwiched** - Other bots may sandwich your transactions
3. **Gas Wars** - Competition can make strategies unprofitable
4. **Smart Contract Risk** - Target contracts may have MEV protection
5. **Network Congestion** - High gas prices reduce profitability

### Mitigation Strategies

1. Use private relays (Flashbots, Eden)
2. Implement strict profit thresholds
3. Monitor gas price limits
4. Validate target contract code
5. Test thoroughly in simulation mode

## Testing

### Test in SIM Mode First

```bash
# Set mode to SIM
export MODE=SIM
export ENABLE_MEMPOOL_MONITORING=true

# Run system
npm start
```

### Validate MEV Detection

```python
# Test MEV detection
watchdog = MempoolWatchdog()

test_tx = {
    'token_in': 'USDC',
    'token_out': 'WETH',
    'amount': 10000,
    'slippage_tolerance': 0.03,
    'gas_price': 50,
    'pool_liquidity': 500000
}

opportunity = watchdog.detect_sandwich_opportunity(test_tx)
print(f"Sandwich opportunity: {opportunity}")
```

## Monitoring

### Metrics to Track

1. **Opportunity Detection Rate** - Transactions analyzed per second
2. **Strategy Success Rate** - Successful executions / Total attempts
3. **Average Profit per Strategy** - Profit by strategy type
4. **Gas Efficiency** - Gas cost as % of profit
5. **Failed Transaction Rate** - Failed / Total transactions

### Logging

Enable detailed MEV logging:

```bash
LOG_LEVEL=debug
LOG_MEV_OPPORTUNITIES=true
LOG_MEV_EXECUTIONS=true
```

## Future Enhancements

- [ ] Machine learning for opportunity prediction
- [ ] Cross-chain MEV (bridging + arbitrage)
- [ ] JIT (Just-In-Time) liquidity provision
- [ ] Liquidation bot integration
- [ ] NFT MEV strategies
- [ ] Advanced gas optimization

## References

- [Flashbots Documentation](https://docs.flashbots.net/)
- [MEV Research](https://ethereum.org/en/developers/docs/mev/)
- [BloXroute Documentation](https://docs.bloxroute.com/)
- [Eden Network](https://www.edennetwork.io/)

## Support

For questions or issues with MEV strategies:
- Check logs in `logs/mev-operations.log`
- Review opportunity detection in DEV mode
- Test strategies in SIM mode before LIVE deployment
