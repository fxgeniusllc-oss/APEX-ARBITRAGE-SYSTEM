# ML Enhancements Integration Guide

This guide shows how to integrate the new ML enhancements into your APEX Arbitrage System workflow.

## 📋 Table of Contents

1. [Setup and Installation](#setup-and-installation)
2. [Starting the Services](#starting-the-services)
3. [Using Batch Predictions](#using-batch-predictions)
4. [Model Management](#model-management)
5. [Real-Time Streaming](#real-time-streaming)
6. [Automated Retraining](#automated-retraining)
7. [Integration with Existing System](#integration-with-existing-system)

---

## 1. Setup and Installation

### Install Python Dependencies

```bash
# Install all required dependencies
pip install -r requirements.txt

# Optional: Install GPU support (requires CUDA)
pip install onnxruntime-gpu
```

### Verify Installation

```bash
# Run tests to verify core logic
python3 tests/test_ml_enhancements.py

# Check GPU availability (optional)
python3 -c "import onnxruntime as ort; print('Providers:', ort.get_available_providers())"
```

### Create Required Directories

```bash
mkdir -p data/models data/training data/metrics
```

---

## 2. Starting the Services

### Option A: Start All Services

Create a startup script `start_ml_services.sh`:

```bash
#!/bin/bash

# Start ML API Server
python3 src/python/ml_api_server.py &
ML_API_PID=$!

# Start WebSocket Server
python3 src/python/websocket_server.py &
WS_PID=$!

echo "✅ Services started"
echo "   ML API: http://localhost:8000"
echo "   WebSocket: ws://localhost:8765"
echo "   API Docs: http://localhost:8000/docs"
echo ""
echo "To stop services:"
echo "   kill $ML_API_PID $WS_PID"

# Keep script running
wait
```

```bash
chmod +x start_ml_services.sh
./start_ml_services.sh
```

### Option B: Start Services Individually

**Terminal 1 - ML API Server:**
```bash
python3 src/python/ml_api_server.py
```

**Terminal 2 - WebSocket Server:**
```bash
python3 src/python/websocket_server.py
```

---

## 3. Using Batch Predictions

### From JavaScript/Node.js

```javascript
import axios from 'axios';

async function predictOpportunities(opportunities) {
    const response = await axios.post('http://localhost:8000/predict/batch', {
        opportunities: opportunities,
        threshold: 0.8,
        use_gpu: false
    });
    
    return response.data;
}

// Example usage
const opps = [
    {
        route_id: "usdc_usdt_2hop",
        tokens: ["USDC", "USDT", "USDC"],
        dexes: ["quickswap", "sushiswap"],
        input_amount: 1000.0,
        expected_output: 1012.0,
        gas_estimate: 350000,
        profit_usd: 12.0,
        confidence_score: 0.85,
        chain: "polygon"
    }
];

const results = await predictOpportunities(opps);
console.log('Predictions:', results.predictions);
console.log('Executable:', results.executable_count);
```

### From Python

```python
import requests

def predict_opportunities(opportunities, threshold=0.8):
    response = requests.post(
        'http://localhost:8000/predict/batch',
        json={
            'opportunities': opportunities,
            'threshold': threshold,
            'use_gpu': False
        }
    )
    return response.json()

# Example usage
opps = [{
    "route_id": "usdc_usdt_2hop",
    "tokens": ["USDC", "USDT", "USDC"],
    "dexes": ["quickswap", "sushiswap"],
    "input_amount": 1000.0,
    "expected_output": 1012.0,
    "gas_estimate": 350000,
    "profit_usd": 12.0,
    "confidence_score": 0.85,
    "chain": "polygon"
}]

results = predict_opportunities(opps)
print(f"Executable: {results['executable_count']}/{results['total_opportunities']}")
```

### Using cURL

```bash
curl -X POST http://localhost:8000/predict/batch \
  -H "Content-Type: application/json" \
  -d '{
    "opportunities": [{
      "route_id": "usdc_usdt_2hop",
      "tokens": ["USDC", "USDT", "USDC"],
      "dexes": ["quickswap", "sushiswap"],
      "input_amount": 1000.0,
      "expected_output": 1012.0,
      "gas_estimate": 350000,
      "profit_usd": 12.0,
      "confidence_score": 0.85,
      "chain": "polygon"
    }],
    "threshold": 0.8,
    "use_gpu": false
  }'
```

---

## 4. Model Management

### Register a New Model

```python
import requests

# Register model
response = requests.post(
    'http://localhost:8000/models/register',
    params={
        'model_type': 'xgboost',
        'model_path': 'data/models/xgboost_v1.1.0.json',
        'version': 'v1.1.0',
        'accuracy': 0.89,
        'precision': 0.88,
        'recall': 0.90,
        'activate': False  # Start with A/B test
    }
)
print(response.json())
```

### Setup A/B Test

```python
# Setup A/B test between two versions
response = requests.post(
    'http://localhost:8000/models/ab-test',
    params={
        'model_type': 'xgboost',
        'version_a': 'v1.0.0',  # Current production
        'version_b': 'v1.1.0',  # New model to test
        'split_a': 0.8,  # 80% traffic to v1.0.0
        'split_b': 0.2   # 20% traffic to v1.1.0
    }
)
print(response.json())
```

### Monitor Performance

```python
# Get model summary
response = requests.get('http://localhost:8000/models/summary')
summary = response.json()

for model_type, info in summary['summary'].items():
    print(f"\n{model_type.upper()}:")
    for active in info['active_details']:
        print(f"  Version: {active['version']}")
        print(f"  Traffic: {active['traffic_weight']*100}%")
        print(f"  Accuracy: {active['metrics'].get('accuracy', 'N/A')}")
```

### Promote Winner

```python
# After collecting enough data, promote the winner
response = requests.post(
    'http://localhost:8000/models/promote-winner',
    params={'model_type': 'xgboost'}
)
print(response.json())
```

---

## 5. Real-Time Streaming

### JavaScript/Browser Client

```javascript
const ws = new WebSocket('ws://localhost:8765');

ws.onopen = () => {
    console.log('Connected to APEX stream');
    
    // Subscribe to channels
    ws.send(JSON.stringify({
        command: 'subscribe',
        channels: ['opportunities', 'predictions', 'executions', 'metrics']
    }));
};

ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    
    switch(message.type) {
        case 'opportunity':
            handleNewOpportunity(message.data);
            break;
        case 'prediction':
            handlePrediction(message.data);
            break;
        case 'execution':
            handleExecution(message.data);
            break;
        case 'metrics':
            updateDashboard(message.data);
            break;
        case 'heartbeat':
            console.log('Server heartbeat');
            break;
    }
};

ws.onerror = (error) => {
    console.error('WebSocket error:', error);
};

ws.onclose = () => {
    console.log('Disconnected from APEX stream');
    // Implement reconnection logic
    setTimeout(() => connectWebSocket(), 5000);
};

function handleNewOpportunity(data) {
    console.log('New opportunity:', data.route_id, data.profit_usd);
    // Update UI, trigger alerts, etc.
}

function handlePrediction(data) {
    console.log('Prediction:', data.route_id, data.should_execute);
    // Update opportunity status in UI
}

function handleExecution(data) {
    console.log('Execution:', data.status, data.profit_usd);
    // Update trading history, P&L, etc.
}

function updateDashboard(data) {
    // Update live dashboard with metrics
    document.getElementById('total-profit').textContent = data.total_profit;
    document.getElementById('success-rate').textContent = data.success_rate;
}
```

### Python Client

```python
import asyncio
import websockets
import json

async def stream_client():
    uri = "ws://localhost:8765"
    
    async with websockets.connect(uri) as websocket:
        # Subscribe to channels
        await websocket.send(json.dumps({
            "command": "subscribe",
            "channels": ["opportunities", "predictions", "executions"]
        }))
        
        # Receive and process messages
        async for message in websocket:
            data = json.loads(message)
            
            if data['type'] == 'opportunity':
                print(f"New opportunity: {data['data']['route_id']}")
            elif data['type'] == 'prediction':
                print(f"Prediction: {data['data']['should_execute']}")
            elif data['type'] == 'execution':
                print(f"Execution: {data['data']['status']}")

asyncio.run(stream_client())
```

---

## 6. Automated Retraining

### Setup Retraining Scheduler

```python
import asyncio
from model_manager import ModelManager
from retraining_pipeline import AutomatedRetrainingScheduler

async def main():
    # Initialize model manager
    manager = ModelManager()
    
    # Create scheduler
    scheduler = AutomatedRetrainingScheduler(
        model_manager=manager,
        check_interval_hours=24,  # Check daily
        min_samples=100,  # Need 100 new samples
        min_days_between_retraining=7  # Max weekly retraining
    )
    
    # Start scheduler (runs indefinitely)
    await scheduler.run()

if __name__ == "__main__":
    asyncio.run(main())
```

### Collect Training Data from Executions

```python
from retraining_pipeline import TrainingDataCollector

# Initialize collector
collector = TrainingDataCollector()

# After each execution, log the result
def log_execution_result(opportunity, prediction_score, success, actual_profit):
    collector.add_execution_result(
        opportunity=opportunity,
        prediction_score=prediction_score,
        actual_result=success,
        profit_usd=actual_profit,
        execution_time_ms=2.5
    )
```

### Manual Retraining

```python
from model_manager import ModelManager
from retraining_pipeline import ModelRetrainer

manager = ModelManager()
retrainer = ModelRetrainer(manager)

# Trigger manual retraining
result = retrainer.retrain_models(min_samples=100)

if result["status"] == "success":
    print(f"New model version: {result['version']}")
    print(f"Accuracy: {result['metrics']['accuracy']:.4f}")
    print(f"Training samples: {result['training_samples']}")
```

---

## 7. Integration with Existing System

### Update Main Orchestrator (src/index.js)

```javascript
import axios from 'axios';
import WebSocket from 'ws';

class EnhancedApexSystem {
    constructor() {
        // ... existing code ...
        
        // Add ML API client
        this.mlApiUrl = process.env.ML_API_URL || 'http://localhost:8000';
        
        // Add WebSocket for streaming
        this.ws = new WebSocket(process.env.WS_URL || 'ws://localhost:8765');
        this.setupWebSocket();
    }
    
    setupWebSocket() {
        this.ws.on('open', () => {
            console.log('✅ Connected to ML streaming server');
            
            // Subscribe to all channels
            this.ws.send(JSON.stringify({
                command: 'subscribe',
                channels: ['predictions', 'executions', 'metrics']
            }));
        });
        
        this.ws.on('message', (data) => {
            const message = JSON.parse(data);
            this.handleStreamMessage(message);
        });
    }
    
    handleStreamMessage(message) {
        switch(message.type) {
            case 'prediction':
                // Update opportunity with ML prediction
                break;
            case 'execution':
                // Update execution status
                break;
            case 'metrics':
                // Update dashboard
                break;
        }
    }
    
    async scanOpportunities() {
        // ... existing scanning code ...
        
        // Get ML predictions for opportunities
        const predictions = await this.predictOpportunities(opportunities);
        
        // Filter based on ML predictions
        const executable = opportunities.filter((opp, idx) => 
            predictions.predictions[idx].should_execute
        );
        
        return executable;
    }
    
    async predictOpportunities(opportunities) {
        try {
            const response = await axios.post(
                `${this.mlApiUrl}/predict/batch`,
                {
                    opportunities: opportunities.map(opp => ({
                        route_id: opp.routeId,
                        tokens: opp.tokens,
                        dexes: opp.dexes,
                        input_amount: opp.inputAmount,
                        expected_output: opp.expectedOutput,
                        gas_estimate: opp.gasEstimate,
                        profit_usd: opp.profitUsd,
                        confidence_score: opp.confidenceScore,
                        chain: opp.chain
                    })),
                    threshold: this.config.mlThreshold || 0.8,
                    use_gpu: this.config.useGpu || false
                }
            );
            
            return response.data;
        } catch (error) {
            console.error('ML prediction error:', error.message);
            // Fallback to original logic if ML API unavailable
            return { predictions: [] };
        }
    }
}
```

### Environment Variables

Add to your `.env` file:

```bash
# ML Enhancement Configuration
ML_API_URL=http://localhost:8000
WS_URL=ws://localhost:8765
ML_THRESHOLD=0.8
USE_GPU=false

# Model Configuration
MODEL_VERSION_XGB=v1.0.0
MODEL_VERSION_ONNX=v1.0.0

# Retraining Configuration
AUTO_RETRAIN=true
RETRAIN_CHECK_INTERVAL_HOURS=24
RETRAIN_MIN_SAMPLES=100
RETRAIN_MIN_DAYS=7
```

### Update Package.json Scripts

```json
{
  "scripts": {
    "start": "node src/index.js",
    "ml:api": "python3 src/python/ml_api_server.py",
    "ml:websocket": "python3 src/python/websocket_server.py",
    "ml:demo": "python3 src/python/demo_enhancements.py",
    "ml:all": "npm run ml:api & npm run ml:websocket",
    "test:ml": "python3 tests/test_ml_enhancements.py"
  }
}
```

---

## 🚀 Quick Start Example

Complete integration example:

```javascript
// main.js
import { EnhancedApexSystem } from './enhanced-system.js';

async function main() {
    // Create system with ML enhancements
    const system = new EnhancedApexSystem({
        mlApiUrl: 'http://localhost:8000',
        wsUrl: 'ws://localhost:8765',
        mlThreshold: 0.8,
        useGpu: false
    });
    
    // Initialize
    await system.initialize();
    
    // Main loop
    while (true) {
        // Scan opportunities
        const opportunities = await system.scanOpportunities();
        console.log(`Found ${opportunities.length} opportunities`);
        
        // Get batch predictions
        const predictions = await system.predictOpportunities(opportunities);
        console.log(`Executable: ${predictions.executable_count}`);
        
        // Execute profitable opportunities
        for (const pred of predictions.predictions) {
            if (pred.should_execute) {
                await system.executeOpportunity(pred.route_id);
            }
        }
        
        // Wait for next scan
        await new Promise(resolve => setTimeout(resolve, 60000));
    }
}

main().catch(console.error);
```

---

## 📊 Monitoring and Debugging

### Check Service Health

```bash
# ML API health
curl http://localhost:8000/

# WebSocket connection
wscat -c ws://localhost:8765

# Model summary
curl http://localhost:8000/models/summary
```

### View Logs

```bash
# Check if services are running
ps aux | grep python

# View Python logs
tail -f logs/ml_api.log
tail -f logs/websocket.log
```

### Performance Metrics

Monitor these metrics:
- API response time
- Prediction throughput
- WebSocket message latency
- Model accuracy by version
- A/B test performance delta

---

## ⚠️ Troubleshooting

### ML API Not Starting
- Check Python dependencies: `pip install -r requirements.txt`
- Verify port 8000 is available: `lsof -i :8000`
- Check for error messages in console

### WebSocket Connection Failed
- Verify server is running: `ps aux | grep websocket`
- Check port 8765 availability
- Test with simple client first

### GPU Not Detected
- Install CUDA and cuDNN
- Install `onnxruntime-gpu`
- Check: `python3 -c "import onnxruntime as ort; print(ort.get_available_providers())"`

### Models Not Loading
- Verify model files exist in `data/models/`
- Check model paths in version registry
- Use absolute paths if relative paths fail

---

## 📚 Additional Resources

- [ML Enhancements Documentation](./ML_ENHANCEMENTS.md)
- [API Reference](./API.md)
- [Architecture Documentation](./ARCHITECTURE.md)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [WebSocket Protocol](https://websockets.readthedocs.io/)

---

**Need Help?** Check the troubleshooting section or review the demo script:
```bash
python3 src/python/demo_enhancements.py
```
