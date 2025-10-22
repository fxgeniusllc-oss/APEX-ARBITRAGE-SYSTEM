# APEX Transaction Transparency Examples

This directory contains examples demonstrating how to use the Transaction Transparency features in the APEX Arbitrage System.

## Available Examples

### transparency-integration.js

A comprehensive example showing how to integrate transaction transparency into the APEX arbitrage system. This example demonstrates:

1. **Arbitrage Execution with Transparency** - How to log arbitrage transactions with full transparency
2. **Multi-Chain Monitoring** - Track transactions across multiple blockchains
3. **Audit Report Export** - Generate compliance-ready audit reports
4. **Real-time Dashboard** - Display live transaction statistics
5. **Address-Specific Tracking** - Monitor all transactions for specific addresses

## Running the Examples

### Prerequisites

Make sure you have installed all dependencies:
```bash
npm install
```

### Run the Integration Example

```bash
node examples/transparency-integration.js
```

This will demonstrate all transparency features including:
- Transaction recording
- Receipt updates
- Real-time monitoring
- Statistics dashboard
- Audit exports
- Address tracking

## Key Features Demonstrated

### 1. Transaction Logging

```javascript
import { transparencyLogger } from '../src/utils/transparency-logger.js';

// Log a transaction
transparencyLogger.logTransaction(tx, chainId, 'Arbitrage Trade');
```

### 2. Receipt Updates

```javascript
// Update with receipt after confirmation
transparencyLogger.updateReceipt(txHash, receipt, chainId);
```

### 3. Transaction Details

```javascript
// Display detailed transaction report
transparencyLogger.displayTransactionSummary(txHash);
```

### 4. Statistics Dashboard

```javascript
// Show real-time statistics
transparencyLogger.displayStatistics();
```

### 5. Audit Export

```javascript
// Export transactions for audit
const auditData = transparencyLogger.exportAuditData({
    chainId: 137,
    status: 'confirmed',
    startDate: '2025-01-01',
    endDate: '2025-12-31'
});
```

### 6. Address Tracking

```javascript
// Get transaction history for an address
const history = transparencyLogger.getHistory({
    fromAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
    limit: 10
});
```

### 7. Chain Statistics

```javascript
// Get statistics for a specific chain
const stats = transparencyLogger.getChainStats(137); // Polygon
```

## Integration with APEX

The transparency module integrates seamlessly with the existing APEX system:

```javascript
import { logExecutionWithTransparency } from '../src/utils/database.js';

// After executing a trade
const execution = {
    routeId: 'quickswap_sushiswap',
    chain: 137,
    // ... other execution details
};

// Log with transparency
logExecutionWithTransparency(execution, tx);
```

## Output Example

When you run the integration example, you'll see:

```
🔍 APEX Transaction Transparency Integration Example

Example 1: Arbitrage Execution with Transparency
   ✅ Transaction logged successfully
   TX Hash: 0xd96a16a592143eeb85addb48913b4fc94f71892616da370981e5ccba39dd9afa
   Profit: $12

═══════════════════════════════════════════════════════════
           TRANSACTION TRANSPARENCY REPORT
═══════════════════════════════════════════════════════════

📋 Basic Information
   Hash: 0xd96a16a592143eeb85addb48913b4fc94f71892616da370981e5ccba39dd9afa
   Chain: Polygon (137)
   Status: ✅ Confirmed
   ...
```

## Benefits

Using the Transaction Transparency features provides:

- ✅ Complete transaction visibility
- ✅ Real-time monitoring across chains
- ✅ Automatic audit trail generation
- ✅ Gas optimization insights
- ✅ Compliance-ready reporting
- ✅ Block explorer integration

## Documentation

For complete documentation, see:
- [Transaction Transparency Documentation](../docs/TRANSACTION_TRANSPARENCY.md)
- [Demo Script](../scripts/transparency-demo.js)
- [Test Suite](../tests/transaction-transparency.test.js)

## Support

For questions or issues:
1. Check the demo script: `scripts/transparency-demo.js`
2. Review the documentation: `docs/TRANSACTION_TRANSPARENCY.md`
3. Run the tests: `npm test tests/transaction-transparency.test.js`
4. Open an issue on GitHub
