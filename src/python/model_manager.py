"""
Model Versioning and A/B Testing Manager
Handles model lifecycle, versioning, and A/B testing for ML ensemble
"""

import json
import os
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, asdict
from datetime import datetime
import numpy as np


@dataclass
class ModelVersion:
    """Model version metadata"""
    version: str
    model_type: str  # 'xgboost' or 'onnx'
    path: str
    created_at: str
    metrics: Dict[str, float]
    is_active: bool = False
    traffic_weight: float = 0.0


class ModelManager:
    """
    Manages model versions and A/B testing
    - Version control for models
    - A/B testing with traffic splitting
    - Performance tracking per version
    """
    
    def __init__(self, models_dir: str = "data/models"):
        self.models_dir = Path(models_dir)
        self.models_dir.mkdir(parents=True, exist_ok=True)
        
        self.versions_file = self.models_dir / "versions.json"
        self.versions: Dict[str, List[ModelVersion]] = {"xgboost": [], "onnx": []}
        self.performance_log = self.models_dir / "performance.json"
        self.performance_data: Dict[str, List[Dict]] = {}
        
        self._load_versions()
        self._load_performance()
    
    def _load_versions(self):
        """Load model versions from disk"""
        if self.versions_file.exists():
            with open(self.versions_file, 'r') as f:
                data = json.load(f)
                for model_type in ['xgboost', 'onnx']:
                    self.versions[model_type] = [
                        ModelVersion(**v) for v in data.get(model_type, [])
                    ]
    
    def _save_versions(self):
        """Save model versions to disk"""
        data = {
            model_type: [asdict(v) for v in versions]
            for model_type, versions in self.versions.items()
        }
        with open(self.versions_file, 'w') as f:
            json.dump(data, f, indent=2)
    
    def _load_performance(self):
        """Load performance data from disk"""
        if self.performance_log.exists():
            with open(self.performance_log, 'r') as f:
                self.performance_data = json.load(f)
    
    def _save_performance(self):
        """Save performance data to disk"""
        with open(self.performance_log, 'w') as f:
            json.dump(self.performance_data, f, indent=2)
    
    def register_model(
        self,
        model_type: str,
        model_path: str,
        version: str,
        metrics: Dict[str, float],
        activate: bool = False
    ) -> ModelVersion:
        """
        Register a new model version
        
        Args:
            model_type: 'xgboost' or 'onnx'
            model_path: Path to model file
            version: Version string (e.g., 'v1.0.0')
            metrics: Training metrics (accuracy, precision, recall, etc.)
            activate: Whether to activate this version immediately
        
        Returns:
            ModelVersion object
        """
        if model_type not in ['xgboost', 'onnx']:
            raise ValueError(f"Invalid model_type: {model_type}")
        
        # Create model version
        model_version = ModelVersion(
            version=version,
            model_type=model_type,
            path=model_path,
            created_at=datetime.now().isoformat(),
            metrics=metrics,
            is_active=activate,
            traffic_weight=1.0 if activate else 0.0
        )
        
        # Add to versions list
        self.versions[model_type].append(model_version)
        
        # If activate, deactivate other versions
        if activate:
            for v in self.versions[model_type]:
                if v.version != version:
                    v.is_active = False
                    v.traffic_weight = 0.0
        
        self._save_versions()
        return model_version
    
    def get_active_model(self, model_type: str) -> Optional[ModelVersion]:
        """Get the active model version for a given type"""
        for version in self.versions[model_type]:
            if version.is_active and version.traffic_weight > 0:
                return version
        return None
    
    def setup_ab_test(
        self,
        model_type: str,
        version_a: str,
        version_b: str,
        traffic_split: Tuple[float, float] = (0.5, 0.5)
    ):
        """
        Setup A/B test between two model versions
        
        Args:
            model_type: 'xgboost' or 'onnx'
            version_a: First version for testing
            version_b: Second version for testing
            traffic_split: Tuple of traffic weights (must sum to 1.0)
        """
        if abs(sum(traffic_split) - 1.0) > 0.001:
            raise ValueError("Traffic split must sum to 1.0")
        
        # Find versions
        va = next((v for v in self.versions[model_type] if v.version == version_a), None)
        vb = next((v for v in self.versions[model_type] if v.version == version_b), None)
        
        if not va or not vb:
            raise ValueError("Both versions must exist")
        
        # Deactivate all other versions
        for v in self.versions[model_type]:
            v.is_active = False
            v.traffic_weight = 0.0
        
        # Activate test versions with split
        va.is_active = True
        va.traffic_weight = traffic_split[0]
        vb.is_active = True
        vb.traffic_weight = traffic_split[1]
        
        self._save_versions()
        print(f"A/B test started: {version_a} ({traffic_split[0]*100}%) vs {version_b} ({traffic_split[1]*100}%)")
    
    def select_model_for_request(self, model_type: str) -> Optional[ModelVersion]:
        """
        Select a model version based on traffic weights (A/B testing)
        
        Args:
            model_type: 'xgboost' or 'onnx'
        
        Returns:
            Selected ModelVersion
        """
        active_versions = [v for v in self.versions[model_type] if v.is_active]
        
        if not active_versions:
            return None
        
        if len(active_versions) == 1:
            return active_versions[0]
        
        # Weighted random selection for A/B testing
        weights = [v.traffic_weight for v in active_versions]
        selected_idx = np.random.choice(len(active_versions), p=weights)
        return active_versions[selected_idx]
    
    def log_prediction(
        self,
        model_type: str,
        version: str,
        prediction: float,
        actual_result: Optional[bool] = None,
        execution_time_ms: float = 0
    ):
        """
        Log prediction for performance tracking
        
        Args:
            model_type: 'xgboost' or 'onnx'
            version: Model version used
            prediction: Prediction score
            actual_result: Actual outcome (True/False) if known
            execution_time_ms: Inference time in milliseconds
        """
        key = f"{model_type}_{version}"
        
        if key not in self.performance_data:
            self.performance_data[key] = []
        
        self.performance_data[key].append({
            "timestamp": datetime.now().isoformat(),
            "prediction": prediction,
            "actual_result": actual_result,
            "execution_time_ms": execution_time_ms
        })
        
        # Save periodically (every 100 predictions)
        if len(self.performance_data[key]) % 100 == 0:
            self._save_performance()
    
    def get_version_performance(self, model_type: str, version: str) -> Dict:
        """
        Get performance metrics for a specific version
        
        Returns:
            Dictionary with accuracy, avg_execution_time, predictions_count
        """
        key = f"{model_type}_{version}"
        data = self.performance_data.get(key, [])
        
        if not data:
            return {"predictions_count": 0}
        
        # Calculate metrics
        predictions_with_results = [d for d in data if d.get("actual_result") is not None]
        
        metrics = {
            "predictions_count": len(data),
            "avg_execution_time_ms": np.mean([d["execution_time_ms"] for d in data])
        }
        
        if predictions_with_results:
            correct = sum(
                1 for d in predictions_with_results
                if (d["prediction"] > 0.5 and d["actual_result"]) or
                   (d["prediction"] <= 0.5 and not d["actual_result"])
            )
            metrics["accuracy"] = correct / len(predictions_with_results)
        
        return metrics
    
    def promote_winner(self, model_type: str):
        """
        Promote the winning model from A/B test based on performance
        
        Analyzes recent performance and activates the better model
        """
        active_versions = [v for v in self.versions[model_type] if v.is_active]
        
        if len(active_versions) < 2:
            print("No A/B test active")
            return
        
        # Compare performance
        performances = []
        for v in active_versions:
            perf = self.get_version_performance(model_type, v.version)
            perf["version"] = v.version
            performances.append(perf)
        
        # Sort by accuracy (if available), then by execution time
        performances.sort(
            key=lambda x: (x.get("accuracy", 0), -x.get("avg_execution_time_ms", float('inf'))),
            reverse=True
        )
        
        if not performances:
            print("Not enough data to determine winner")
            return
        
        winner = performances[0]
        print(f"Promoting winner: {winner['version']} (accuracy: {winner.get('accuracy', 'N/A')})")
        
        # Deactivate all and activate winner
        for v in self.versions[model_type]:
            v.is_active = False
            v.traffic_weight = 0.0
            if v.version == winner["version"]:
                v.is_active = True
                v.traffic_weight = 1.0
        
        self._save_versions()
    
    def list_versions(self, model_type: str) -> List[ModelVersion]:
        """List all versions for a model type"""
        return self.versions[model_type]
    
    def get_summary(self) -> Dict:
        """Get summary of all models and their status"""
        summary = {}
        
        for model_type in ['xgboost', 'onnx']:
            versions = self.versions[model_type]
            active = [v for v in versions if v.is_active]
            
            summary[model_type] = {
                "total_versions": len(versions),
                "active_versions": len(active),
                "active_details": [
                    {
                        "version": v.version,
                        "traffic_weight": v.traffic_weight,
                        "metrics": v.metrics,
                        "performance": self.get_version_performance(model_type, v.version)
                    }
                    for v in active
                ]
            }
        
        return summary
