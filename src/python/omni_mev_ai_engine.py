"""
OMNI-MEV-BOT — Dual Rust + LSTM Engine Edition
Python AI Runtime: LSTM + ONNX Hybrid Controller

This module provides a FastAPI-based AI engine that integrates LSTM and ONNX
models for real-time arbitrage opportunity prediction and decision making.
It complements the existing XGBoost + ONNX ensemble in orchestrator.py.
"""

import time
import json
import asyncio
from typing import List, Optional
import numpy as np
import requests
from fastapi import FastAPI, Request, HTTPException
from pydantic import BaseModel
from prometheus_client import start_http_server, Gauge

# Import centralized configuration
from config import (
    ExecutionMode,
    CURRENT_MODE,
    AIEngineConfig,
    RedisConfig,
    PrometheusConfig,
    get_mode_display
)

# Conditional imports for ML libraries
try:
    import torch
    from torch import nn
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False
    print("⚠️  PyTorch not installed. Install with: pip install torch")

try:
    import onnxruntime as ort
    ONNX_AVAILABLE = True
except ImportError:
    ONNX_AVAILABLE = False
    print("⚠️  ONNX Runtime not installed. Install with: pip install onnxruntime")

try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False
    print("⚠️  Redis not installed. Install with: pip install redis")

# -------------------------------------------------------------------
# Configuration from centralized config module
# -------------------------------------------------------------------
LIVE_MODE = (CURRENT_MODE == ExecutionMode.LIVE)
AI_MODEL_PATH = AIEngineConfig.model_path
AI_THRESHOLD = AIEngineConfig.threshold
REDIS_HOST = RedisConfig.host
REDIS_PORT = RedisConfig.port
PROMETHEUS_PORT = PrometheusConfig.port
AI_ENGINE_PORT = AIEngineConfig.engine_port
RUST_ENGINE_URL = AIEngineConfig.rust_engine_url

# -------------------------------------------------------------------
# Redis Cache + Prometheus Setup
# -------------------------------------------------------------------
redis_client = None
if REDIS_AVAILABLE:
    try:
        redis_client = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)
        redis_client.ping()
        print(f"✅ Redis connected: {REDIS_HOST}:{REDIS_PORT}")
    except Exception as e:
        print(f"⚠️  Redis connection failed: {e}")
        redis_client = None

# Start Prometheus metrics server
try:
    start_http_server(PROMETHEUS_PORT)
    print(f"✅ Prometheus metrics server started on port {PROMETHEUS_PORT}")
except Exception as e:
    print(f"⚠️  Prometheus server failed to start: {e}")

AI_PRED_CONFIDENCE = Gauge('ai_prediction_confidence', 'LSTM Prediction Confidence')
AI_LATENCY = Gauge('ai_inference_latency_ms', 'LSTM Inference Latency (ms)')
AI_REQUESTS_TOTAL = Gauge('ai_requests_total', 'Total AI Prediction Requests')

# -------------------------------------------------------------------
# Define the LSTM Model (for local inference fallback)
# -------------------------------------------------------------------
if TORCH_AVAILABLE:
    class OmniLSTM(nn.Module):
        """LSTM model for arbitrage opportunity prediction"""
        def __init__(self, input_size=8, hidden_size=128, output_size=1, num_layers=2):
            super(OmniLSTM, self).__init__()
            self.lstm = nn.LSTM(input_size, hidden_size, num_layers, batch_first=True)
            self.fc = nn.Linear(hidden_size, output_size)

        def forward(self, x):
            out, _ = self.lstm(x)
            return torch.sigmoid(self.fc(out[:, -1, :]))

# -------------------------------------------------------------------
# Initialize ONNX Runtime + Torch Fallback
# -------------------------------------------------------------------
onnx_session = None
torch_model = None

if ONNX_AVAILABLE and os.path.exists(AI_MODEL_PATH):
    try:
        onnx_session = ort.InferenceSession(AI_MODEL_PATH)
        print(f"✅ ONNX model loaded: {AI_MODEL_PATH}")
    except Exception as e:
        print(f"⚠️  ONNX model load failed: {e}")

if onnx_session is None and TORCH_AVAILABLE:
    print("⚠️  ONNX model not available, switching to PyTorch fallback")
    torch_model = OmniLSTM()
    torch_model.eval()  # Set to evaluation mode

# -------------------------------------------------------------------
# FastAPI Server for Inference Requests
# -------------------------------------------------------------------
app = FastAPI(
    title="OMNI-MEV AI Engine",
    version="2.0",
    description="Hybrid LSTM + ONNX AI engine for arbitrage opportunity prediction"
)

class PredictionRequest(BaseModel):
    """Request model for prediction endpoint"""
    features: List[float]

class PredictionResponse(BaseModel):
    """Response model for prediction endpoint"""
    decision: bool
    confidence: float
    threshold: float
    mode: str
    inference_time_ms: float

class StatusResponse(BaseModel):
    """Response model for status endpoint"""
    ai_engine: str
    mode: str
    model_type: str
    redis_connected: bool
    total_requests: int

@app.post("/predict", response_model=PredictionResponse)
async def predict(req: PredictionRequest):
    """
    Predict arbitrage opportunity viability using AI models.
    
    Args:
        req: PredictionRequest with feature vector
        
    Returns:
        PredictionResponse with decision and confidence score
    """
    start = time.time()
    
    # Update metrics
    AI_REQUESTS_TOTAL.inc()
    
    # Validate input
    if not req.features or len(req.features) == 0:
        raise HTTPException(status_code=400, detail="Features cannot be empty")

    # Input preparation
    try:
        features = np.array(req.features, dtype=np.float32)
        features = np.expand_dims(features, axis=(0, 1))  # (batch, seq, features)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid feature format: {str(e)}")

    # ----------------------------------------------------------------
    # Inference logic
    # ----------------------------------------------------------------
    try:
        confidence = 0.5  # Default confidence
        
        if onnx_session:
            # Use ONNX model
            input_name = onnx_session.get_inputs()[0].name
            result = onnx_session.run(None, {input_name: features})[0]
            confidence = float(result[0][0])
        elif torch_model and TORCH_AVAILABLE:
            # Use PyTorch model
            with torch.no_grad():
                tensor_in = torch.tensor(features)
                confidence = float(torch_model(tensor_in).numpy()[0][0])
        else:
            # No model available, return default
            print("⚠️  No AI model available, returning default confidence")

        # Update Prometheus metrics
        AI_PRED_CONFIDENCE.set(confidence)
        inference_time = (time.time() - start) * 1000
        AI_LATENCY.set(inference_time)

        # Cache confidence in Redis
        if redis_client:
            try:
                redis_client.set("ai:last_confidence", confidence)
                redis_client.set("ai:last_timestamp", int(time.time()))
            except Exception:
                pass

        # Make decision based on threshold
        decision = confidence > AI_THRESHOLD
        
        # Build response
        payload = PredictionResponse(
            decision=decision,
            confidence=confidence,
            threshold=AI_THRESHOLD,
            mode="LIVE" if LIVE_MODE else "SIMULATION",
            inference_time_ms=inference_time
        )

        # Optional: notify Rust engine for live action
        if LIVE_MODE and decision:
            try:
                notify_payload = {
                    "decision": decision,
                    "confidence": confidence,
                    "features": req.features
                }
                requests.post(
                    f"{RUST_ENGINE_URL}/execute",
                    json=notify_payload,
                    timeout=2
                )
            except Exception as e:
                print(f"⚠️  Failed to notify Rust engine: {e}")

        return payload

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")

@app.get("/status", response_model=StatusResponse)
async def status():
    """Get AI engine status and metrics"""
    model_type = "none"
    if onnx_session:
        model_type = "onnx"
    elif torch_model:
        model_type = "pytorch"
    
    return StatusResponse(
        ai_engine="online",
        mode="LIVE" if LIVE_MODE else "SIMULATION",
        model_type=model_type,
        redis_connected=redis_client is not None,
        total_requests=int(AI_REQUESTS_TOTAL._value.get())
    )

@app.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": int(time.time())}

@app.get("/metrics_summary")
async def metrics_summary():
    """Get summary of AI engine metrics"""
    metrics = {
        "last_confidence": 0.0,
        "last_timestamp": 0,
        "avg_latency_ms": AI_LATENCY._value.get(),
        "total_requests": int(AI_REQUESTS_TOTAL._value.get())
    }
    
    if redis_client:
        try:
            metrics["last_confidence"] = float(redis_client.get("ai:last_confidence") or 0.0)
            metrics["last_timestamp"] = int(redis_client.get("ai:last_timestamp") or 0)
        except Exception:
            pass
    
    return metrics

# -------------------------------------------------------------------
# Background: Live Streaming Loop
# -------------------------------------------------------------------
async def ai_monitoring_loop():
    """Background task for monitoring AI engine performance"""
    while True:
        try:
            if redis_client:
                last_conf = redis_client.get("ai:last_confidence")
                if last_conf:
                    print(f"📡 AI Confidence: {last_conf}")
            await asyncio.sleep(10)
        except Exception as e:
            print(f"⚠️  Monitoring loop error: {e}")
            await asyncio.sleep(10)

# -------------------------------------------------------------------
# Startup and Shutdown Events
# -------------------------------------------------------------------
@app.on_event("startup")
async def startup_event():
    """Initialize background tasks on startup"""
    print(f"⚙️  Starting AI Engine (Mode: {'LIVE' if LIVE_MODE else 'SIMULATION'})")
    print(f"🤖 Model: {'ONNX' if onnx_session else 'PyTorch' if torch_model else 'None'}")
    asyncio.create_task(ai_monitoring_loop())

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    print("🛑 AI Engine shutting down...")
    if redis_client:
        try:
            redis_client.close()
        except Exception:
            pass

# -------------------------------------------------------------------
# Entry Point
# -------------------------------------------------------------------
def main():
    """Main entry point for the AI engine"""
    import uvicorn
    
    print("=" * 70)
    print("OMNI-MEV AI ENGINE - Starting...")
    print("=" * 70)
    print(f"Mode: {'LIVE' if LIVE_MODE else 'SIMULATION'}")
    print(f"AI Threshold: {AI_THRESHOLD}")
    print(f"Port: {AI_ENGINE_PORT}")
    print(f"Prometheus Metrics: http://localhost:{PROMETHEUS_PORT}")
    print("=" * 70)
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=AI_ENGINE_PORT,
        log_level="info"
    )

if __name__ == "__main__":
    main()
