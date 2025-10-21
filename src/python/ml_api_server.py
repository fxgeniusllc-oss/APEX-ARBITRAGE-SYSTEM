"""
ML API Server for Batch Predictions
REST API endpoint for batch prediction of multiple arbitrage opportunities
"""

import asyncio
import time
from typing import List, Dict, Optional
from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field
import uvicorn
import numpy as np
from datetime import datetime

# Import existing components
from orchestrator import MLEnsemble, Opportunity, ChainType
from model_manager import ModelManager


# Pydantic models for API
class OpportunityInput(BaseModel):
    """Input model for opportunity prediction"""
    route_id: str
    tokens: List[str]
    dexes: List[str]
    input_amount: float
    expected_output: float
    gas_estimate: int
    profit_usd: float
    confidence_score: float = 0.5
    timestamp: int = Field(default_factory=lambda: int(time.time()))
    chain: str = "polygon"


class PredictionResult(BaseModel):
    """Result for single prediction"""
    route_id: str
    prediction_score: float
    should_execute: bool
    model_version_xgb: Optional[str] = None
    model_version_onnx: Optional[str] = None
    inference_time_ms: float
    timestamp: str


class BatchPredictionRequest(BaseModel):
    """Batch prediction request"""
    opportunities: List[OpportunityInput]
    threshold: float = 0.8
    use_gpu: bool = False


class BatchPredictionResponse(BaseModel):
    """Batch prediction response"""
    predictions: List[PredictionResult]
    total_opportunities: int
    executable_count: int
    total_inference_time_ms: float
    avg_inference_time_ms: float


class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    models_loaded: Dict[str, bool]
    active_versions: Dict[str, List[str]]
    uptime_seconds: float


class ModelSummaryResponse(BaseModel):
    """Model summary response"""
    summary: Dict


# Initialize FastAPI app
app = FastAPI(
    title="APEX ML Prediction API",
    description="Batch prediction endpoint for arbitrage opportunities",
    version="1.0.0"
)

# Global state
ml_ensemble: Optional[MLEnsemble] = None
model_manager: Optional[ModelManager] = None
start_time = time.time()


def convert_to_opportunity(opp_input: OpportunityInput) -> Opportunity:
    """Convert API input to Opportunity dataclass"""
    try:
        chain = ChainType(opp_input.chain.lower())
    except ValueError:
        chain = ChainType.POLYGON
    
    return Opportunity(
        route_id=opp_input.route_id,
        tokens=opp_input.tokens,
        dexes=opp_input.dexes,
        input_amount=opp_input.input_amount,
        expected_output=opp_input.expected_output,
        gas_estimate=opp_input.gas_estimate,
        profit_usd=opp_input.profit_usd,
        confidence_score=opp_input.confidence_score,
        timestamp=opp_input.timestamp,
        chain=chain
    )


@app.on_event("startup")
async def startup_event():
    """Initialize ML ensemble and model manager on startup"""
    global ml_ensemble, model_manager
    
    print("🚀 Starting ML API Server...")
    
    # Initialize model manager
    model_manager = ModelManager()
    print("✅ Model manager initialized")
    
    # Initialize ML ensemble
    ml_ensemble = MLEnsemble()
    
    # Try to load models
    try:
        xgb_version = model_manager.get_active_model("xgboost")
        onnx_version = model_manager.get_active_model("onnx")
        
        xgb_path = xgb_version.path if xgb_version else None
        onnx_path = onnx_version.path if onnx_version else None
        
        ml_ensemble.load_models(xgb_path=xgb_path, onnx_path=onnx_path)
        print(f"✅ Models loaded - XGBoost: {xgb_version.version if xgb_version else 'None'}, "
              f"ONNX: {onnx_version.version if onnx_version else 'None'}")
    except Exception as e:
        print(f"⚠️  Warning: Could not load models: {e}")
    
    print("✅ ML API Server ready")


@app.get("/", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    if not ml_ensemble or not model_manager:
        raise HTTPException(status_code=503, detail="Server not initialized")
    
    # Get active versions
    active_versions = {
        "xgboost": [],
        "onnx": []
    }
    
    for model_type in ["xgboost", "onnx"]:
        active = [
            v.version for v in model_manager.versions[model_type]
            if v.is_active
        ]
        active_versions[model_type] = active
    
    return HealthResponse(
        status="healthy",
        models_loaded={
            "xgboost": ml_ensemble.xgb_model is not None,
            "onnx": ml_ensemble.onnx_model is not None
        },
        active_versions=active_versions,
        uptime_seconds=time.time() - start_time
    )


@app.post("/predict/batch", response_model=BatchPredictionResponse)
async def batch_predict(request: BatchPredictionRequest):
    """
    Batch prediction endpoint for multiple opportunities
    
    This endpoint processes multiple arbitrage opportunities in a single request,
    returning predictions for all of them efficiently.
    """
    if not ml_ensemble or not model_manager:
        raise HTTPException(status_code=503, detail="ML ensemble not initialized")
    
    if not request.opportunities:
        raise HTTPException(status_code=400, detail="No opportunities provided")
    
    predictions = []
    total_inference_time = 0.0
    executable_count = 0
    
    # Process each opportunity
    for opp_input in request.opportunities:
        start_time_pred = time.time()
        
        # Convert to Opportunity object
        opportunity = convert_to_opportunity(opp_input)
        
        # Get prediction score
        score = ml_ensemble.predict(opportunity)
        should_execute = score > request.threshold
        
        if should_execute:
            executable_count += 1
        
        inference_time = (time.time() - start_time_pred) * 1000  # Convert to ms
        total_inference_time += inference_time
        
        # Get model versions used
        xgb_version = model_manager.get_active_model("xgboost")
        onnx_version = model_manager.get_active_model("onnx")
        
        # Log prediction for performance tracking
        model_manager.log_prediction(
            "xgboost",
            xgb_version.version if xgb_version else "unknown",
            score,
            execution_time_ms=inference_time
        )
        
        predictions.append(PredictionResult(
            route_id=opp_input.route_id,
            prediction_score=score,
            should_execute=should_execute,
            model_version_xgb=xgb_version.version if xgb_version else None,
            model_version_onnx=onnx_version.version if onnx_version else None,
            inference_time_ms=inference_time,
            timestamp=datetime.now().isoformat()
        ))
    
    return BatchPredictionResponse(
        predictions=predictions,
        total_opportunities=len(request.opportunities),
        executable_count=executable_count,
        total_inference_time_ms=total_inference_time,
        avg_inference_time_ms=total_inference_time / len(request.opportunities)
    )


@app.post("/predict/single")
async def single_predict(opportunity: OpportunityInput, threshold: float = 0.8):
    """
    Single opportunity prediction endpoint
    
    Convenience endpoint for predicting a single opportunity
    """
    batch_request = BatchPredictionRequest(
        opportunities=[opportunity],
        threshold=threshold
    )
    
    response = await batch_predict(batch_request)
    
    if response.predictions:
        return response.predictions[0]
    else:
        raise HTTPException(status_code=500, detail="Prediction failed")


@app.get("/models/summary", response_model=ModelSummaryResponse)
async def get_model_summary():
    """Get summary of all models and their performance"""
    if not model_manager:
        raise HTTPException(status_code=503, detail="Model manager not initialized")
    
    summary = model_manager.get_summary()
    return ModelSummaryResponse(summary=summary)


@app.post("/models/register")
async def register_model(
    model_type: str,
    model_path: str,
    version: str,
    accuracy: float = 0.0,
    precision: float = 0.0,
    recall: float = 0.0,
    activate: bool = False
):
    """
    Register a new model version
    
    Args:
        model_type: 'xgboost' or 'onnx'
        model_path: Path to model file
        version: Version string (e.g., 'v1.0.0')
        accuracy: Training accuracy
        precision: Training precision
        recall: Training recall
        activate: Whether to activate immediately
    """
    if not model_manager:
        raise HTTPException(status_code=503, detail="Model manager not initialized")
    
    try:
        metrics = {
            "accuracy": accuracy,
            "precision": precision,
            "recall": recall
        }
        
        model_version = model_manager.register_model(
            model_type=model_type,
            model_path=model_path,
            version=version,
            metrics=metrics,
            activate=activate
        )
        
        return {
            "status": "success",
            "message": f"Model {version} registered successfully",
            "version": model_version.version,
            "is_active": model_version.is_active
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/models/ab-test")
async def setup_ab_test(
    model_type: str,
    version_a: str,
    version_b: str,
    split_a: float = 0.5,
    split_b: float = 0.5
):
    """
    Setup A/B test between two model versions
    
    Args:
        model_type: 'xgboost' or 'onnx'
        version_a: First version
        version_b: Second version
        split_a: Traffic percentage for version A (0-1)
        split_b: Traffic percentage for version B (0-1)
    """
    if not model_manager:
        raise HTTPException(status_code=503, detail="Model manager not initialized")
    
    try:
        model_manager.setup_ab_test(
            model_type=model_type,
            version_a=version_a,
            version_b=version_b,
            traffic_split=(split_a, split_b)
        )
        
        return {
            "status": "success",
            "message": f"A/B test started: {version_a} ({split_a*100}%) vs {version_b} ({split_b*100}%)"
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/models/promote-winner")
async def promote_winner(model_type: str):
    """
    Promote the winning model from A/B test
    
    Analyzes performance and activates the better model
    """
    if not model_manager:
        raise HTTPException(status_code=503, detail="Model manager not initialized")
    
    try:
        model_manager.promote_winner(model_type)
        
        active = model_manager.get_active_model(model_type)
        
        return {
            "status": "success",
            "message": f"Winner promoted: {active.version if active else 'None'}",
            "active_version": active.version if active else None
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


def start_server(host: str = "0.0.0.0", port: int = 8000):
    """Start the API server"""
    uvicorn.run(app, host=host, port=port)


if __name__ == "__main__":
    start_server()
