# Quick Start Guide - Hybrid ML Controller

Get the APEX AI Engine running in 5 minutes!

## Prerequisites

- Python 3.8+
- pip3
- 2GB RAM minimum
- Redis (optional, for caching)

## Installation

### 1. Install Dependencies

```bash
# Create virtual environment (recommended)
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install required packages
pip install -r requirements.txt
```

### 2. Configure Environment

```bash
# Copy example configuration
cp .env.example .env

# Edit .env and set these values:
# LIVE_TRADING=false          # Start in simulation mode
# AI_THRESHOLD=0.78           # Confidence threshold
# AI_ENGINE_PORT=8001         # API port
```

### 3. Optional: Start Redis

```bash
# If you have Redis installed
redis-server

# Or use Docker
docker run -d -p 6379:6379 redis:alpine
```

## Quick Start

### Option 1: Automated Script (Recommended)

```bash
# Start AI engine only
./scripts/start-ai-system.sh

# Start AI engine + orchestrator
./scripts/start-ai-system.sh --with-orchestrator
```

### Option 2: Manual Start

```bash
# Start AI engine
python3 src/python/omni_mev_ai_engine.py

# In another terminal, start orchestrator (optional)
python3 src/python/integration_example.py
```

### Option 3: Using npm Scripts

```bash
# Start AI engine
yarn run ai:start

# Or in development mode with auto-reload
yarn run ai:dev
```

## Verify Installation

### 1. Check Health

```bash
curl http://localhost:8001/health
```

Expected response:
```json
{"status": "healthy", "timestamp": 1234567890}
```

### 2. Check Status

```bash
curl http://localhost:8001/status
```

Expected response:
```json
{
  "ai_engine": "online",
  "mode": "SIMULATION",
  "model_type": "pytorch",
  "redis_connected": false,
  "total_requests": 0
}
```

### 3. Make Test Prediction

```bash
curl -X POST http://localhost:8001/predict \
  -H "Content-Type: application/json" \
  -d '{
    "features": [10.5, 1.012, 3, 0.35, 0.87, 0.5, 2, 1.0]
  }'
```

Expected response:
```json
{
  "decision": true,
  "confidence": 0.85,
  "threshold": 0.78,
  "mode": "SIMULATION",
  "inference_time_ms": 12.3
}
```

## Understanding the Response

- **decision**: Whether to execute the trade (based on confidence > threshold)
- **confidence**: AI model confidence score (0.0 - 1.0)
- **threshold**: Configured decision threshold
- **mode**: LIVE or SIMULATION
- **inference_time_ms**: How long the prediction took

## Feature Vector Format

The prediction endpoint expects 8 features:

```python
features = [
    10.5,    # 1. profit_usd - Expected profit in USD
    1.012,   # 2. profit_ratio - Output/Input ratio
    3,       # 3. route_complexity - Number of tokens
    0.35,    # 4. gas_millions - Gas estimate / 1M
    0.87,    # 5. confidence_score - Base confidence
    0.5,     # 6. time_of_day - Normalized (0.0-1.0)
    2,       # 7. dex_count - Number of DEXes
    1.0      # 8. input_amount_thousands - Amount / 1000
]
```

## Monitoring

### View Logs

```bash
# AI Engine logs
tail -f logs/ai_engine.log

# Orchestrator logs (if running)
tail -f logs/orchestrator.log
```

### Check Metrics

```bash
# Summary metrics
curl http://localhost:8001/metrics_summary

# Prometheus metrics
curl http://localhost:9090/metrics
```

### Redis Cache (if enabled)

```bash
redis-cli
> GET ai:last_confidence
> GET ai:last_timestamp
```

## Common Use Cases

### 1. Integration with Node.js

```javascript
const axios = require('axios');

async function getPrediction(opportunity) {
  const features = [
    opportunity.profitUsd,
    opportunity.outputAmount / opportunity.inputAmount,
    opportunity.tokens.length,
    opportunity.gasEstimate / 1_000_000,
    opportunity.baseConfidence,
    (Date.now() % 86400000) / 86400000,
    opportunity.dexes.length,
    opportunity.inputAmount / 1000
  ];

  const response = await axios.post('http://localhost:8001/predict', {
    features
  });

  return response.data;
}
```

### 2. Integration with Python

```python
import requests

def get_ai_prediction(opportunity):
    features = [
        opportunity.profit_usd,
        opportunity.expected_output / opportunity.input_amount,
        len(opportunity.tokens),
        opportunity.gas_estimate / 1_000_000,
        opportunity.confidence_score,
        (opportunity.timestamp % 86400) / 86400,
        len(opportunity.dexes),
        opportunity.input_amount / 1000
    ]
    
    response = requests.post(
        'http://localhost:8001/predict',
        json={'features': features},
        timeout=1
    )
    
    return response.json()
```

### 3. Batch Predictions

```bash
# Create a batch request file
cat > batch.json << EOF
{
  "features": [10.5, 1.012, 3, 0.35, 0.87, 0.5, 2, 1.0]
}
EOF

# Send multiple requests
for i in {1..10}; do
  curl -X POST http://localhost:8001/predict \
    -H "Content-Type: application/json" \
    -d @batch.json
done
```

## Troubleshooting

### Issue: Port Already in Use

```bash
# Find process using port 8001
lsof -i :8001

# Kill the process
kill -9 <PID>

# Or change port in .env
AI_ENGINE_PORT=8002
```

### Issue: Module Not Found

```bash
# Ensure virtual environment is activated
source venv/bin/activate

# Reinstall dependencies
pip install -r requirements.txt
```

### Issue: ONNX Model Not Found

```bash
# Check model directory
ls -la data/models/

# System will automatically use PyTorch fallback
# Place ONNX model at: data/models/lstm_omni.onnx
```

### Issue: Redis Connection Failed

Redis is optional. The system works without it.

To use Redis:
```bash
# Install Redis
sudo apt-get install redis-server  # Ubuntu/Debian
brew install redis                  # macOS

# Start Redis
redis-server

# Verify
redis-cli ping  # Should return PONG
```

## Performance Tips

1. **Use ONNX Models**
   - 2-3x faster than PyTorch
   - Place at: `data/models/lstm_omni.onnx`

2. **Enable Redis Caching**
   - Reduces duplicate predictions
   - Start Redis before AI engine

3. **Adjust Threshold**
   - Lower threshold (0.65-0.75): More trades, higher risk
   - Higher threshold (0.85+): Fewer trades, lower risk
   - Default (0.78): Balanced approach

4. **Monitor Performance**
   - Check `inference_time_ms` in responses
   - Should be 5-25ms for good performance
   - >50ms indicates potential issues

## Next Steps

- ✅ System is running!
- 📖 Read [full documentation](HYBRID_ML_CONTROLLER.md)
- 🧪 Test with sample opportunities
- 🚀 Integrate with your arbitrage bot
- 📊 Monitor metrics and logs
- 🎯 Tune threshold based on results

## Support

- **Documentation**: [HYBRID_ML_CONTROLLER.md](HYBRID_ML_CONTROLLER.md)
- **Architecture**: [ARCHITECTURE.md](ARCHITECTURE.md)
- **API Reference**: See main [README.md](../README.md)
- **Issues**: Check logs in `logs/` directory

## Safety Reminder

⚠️ **Always start in SIMULATION mode**

```bash
# In .env file
LIVE_TRADING=false
```

Only switch to LIVE mode after:
- ✅ Thorough testing in simulation
- ✅ Monitoring for 24+ hours
- ✅ Validating prediction accuracy
- ✅ Understanding the risks

---

**Happy Trading!** 🚀💰
