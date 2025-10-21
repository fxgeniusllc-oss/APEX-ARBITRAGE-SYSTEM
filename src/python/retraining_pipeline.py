"""
Automated Model Retraining Pipeline
Collects execution data and retrains models periodically
"""

import os
import json
import time
import asyncio
from pathlib import Path
from typing import List, Dict, Tuple
from datetime import datetime, timedelta
import numpy as np
import pandas as pd
from dataclasses import asdict

# ML libraries
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
import joblib

from model_manager import ModelManager


class TrainingDataCollector:
    """Collects and stores training data from executions"""
    
    def __init__(self, data_dir: str = "data/training"):
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)
        
        self.current_batch_file = self.data_dir / "current_batch.json"
        self.historical_file = self.data_dir / "historical_data.csv"
        self.batch_data: List[Dict] = []
        
        # Load existing batch
        if self.current_batch_file.exists():
            with open(self.current_batch_file, 'r') as f:
                self.batch_data = json.load(f)
    
    def add_execution_result(
        self,
        opportunity: Dict,
        prediction_score: float,
        actual_result: bool,
        profit_usd: float,
        execution_time_ms: float
    ):
        """
        Add an execution result to training data
        
        Args:
            opportunity: Opportunity data dictionary
            prediction_score: ML prediction score
            actual_result: Whether execution was successful
            profit_usd: Actual profit (or loss if negative)
            execution_time_ms: Execution time
        """
        record = {
            "timestamp": datetime.now().isoformat(),
            "route_id": opportunity.get("route_id"),
            "profit_usd": opportunity.get("profit_usd"),
            "expected_output": opportunity.get("expected_output"),
            "input_amount": opportunity.get("input_amount"),
            "profit_ratio": opportunity.get("expected_output", 0) / max(opportunity.get("input_amount", 1), 1),
            "route_complexity": len(opportunity.get("tokens", [])),
            "gas_estimate": opportunity.get("gas_estimate", 0),
            "confidence_score": opportunity.get("confidence_score", 0.5),
            "time_of_day": datetime.now().hour / 24.0,
            "num_dexes": len(opportunity.get("dexes", [])),
            "is_2hop": 1.0 if len(opportunity.get("tokens", [])) == 3 else 0.0,
            "is_3hop": 1.0 if len(opportunity.get("tokens", [])) == 4 else 0.0,
            "prediction_score": prediction_score,
            "actual_result": int(actual_result),
            "actual_profit_usd": profit_usd,
            "execution_time_ms": execution_time_ms
        }
        
        self.batch_data.append(record)
        
        # Save batch periodically
        if len(self.batch_data) % 10 == 0:
            self._save_batch()
    
    def _save_batch(self):
        """Save current batch to disk"""
        with open(self.current_batch_file, 'w') as f:
            json.dump(self.batch_data, f, indent=2)
    
    def archive_batch(self):
        """Archive current batch to historical data"""
        if not self.batch_data:
            return
        
        # Convert to DataFrame
        df = pd.DataFrame(self.batch_data)
        
        # Append to historical data
        if self.historical_file.exists():
            df_historical = pd.read_csv(self.historical_file)
            df = pd.concat([df_historical, df], ignore_index=True)
        
        df.to_csv(self.historical_file, index=False)
        
        print(f"✅ Archived {len(self.batch_data)} records to historical data")
        
        # Clear batch
        self.batch_data = []
        self._save_batch()
    
    def get_training_data(
        self,
        min_samples: int = 100,
        days_back: int = 30
    ) -> Tuple[pd.DataFrame, bool]:
        """
        Get training data for model retraining
        
        Args:
            min_samples: Minimum number of samples required
            days_back: Number of days to look back
        
        Returns:
            Tuple of (DataFrame, has_enough_data)
        """
        if not self.historical_file.exists():
            return pd.DataFrame(), False
        
        df = pd.read_csv(self.historical_file)
        
        # Filter by date
        if 'timestamp' in df.columns:
            df['timestamp'] = pd.to_datetime(df['timestamp'])
            cutoff_date = datetime.now() - timedelta(days=days_back)
            df = df[df['timestamp'] >= cutoff_date]
        
        has_enough = len(df) >= min_samples
        return df, has_enough


class ModelRetrainer:
    """Automated model retraining"""
    
    def __init__(self, model_manager: ModelManager):
        self.model_manager = model_manager
        self.data_collector = TrainingDataCollector()
        self.models_dir = Path("data/models")
        self.models_dir.mkdir(parents=True, exist_ok=True)
    
    def prepare_features(self, df: pd.DataFrame) -> Tuple[np.ndarray, np.ndarray]:
        """
        Prepare features and labels from DataFrame
        
        Returns:
            Tuple of (X, y) arrays
        """
        # Feature columns (must match those in orchestrator.py)
        feature_cols = [
            "profit_usd",
            "profit_ratio",
            "route_complexity",
            "gas_estimate",
            "confidence_score",
            "time_of_day",
            "num_dexes",
            "input_amount",
            "is_2hop",
            "is_3hop"
        ]
        
        # Ensure all columns exist
        for col in feature_cols:
            if col not in df.columns:
                df[col] = 0.0
        
        X = df[feature_cols].values
        y = df["actual_result"].values
        
        # Normalize gas_estimate and input_amount
        X[:, 3] = X[:, 3] / 1000000.0  # gas in millions
        X[:, 7] = X[:, 7] / 1000.0  # amount in thousands
        
        return X, y
    
    def train_xgboost_model(
        self,
        X_train: np.ndarray,
        y_train: np.ndarray,
        X_test: np.ndarray,
        y_test: np.ndarray
    ) -> Tuple[xgb.Booster, Dict[str, float]]:
        """
        Train XGBoost model
        
        Returns:
            Tuple of (trained_model, metrics_dict)
        """
        # Create DMatrix
        dtrain = xgb.DMatrix(X_train, label=y_train)
        dtest = xgb.DMatrix(X_test, label=y_test)
        
        # Training parameters
        params = {
            'objective': 'binary:logistic',
            'eval_metric': 'logloss',
            'max_depth': 6,
            'learning_rate': 0.1,
            'subsample': 0.8,
            'colsample_bytree': 0.8,
            'seed': 42
        }
        
        # Train model
        print("🔄 Training XGBoost model...")
        model = xgb.train(
            params,
            dtrain,
            num_boost_round=100,
            evals=[(dtrain, 'train'), (dtest, 'test')],
            early_stopping_rounds=10,
            verbose_eval=False
        )
        
        # Evaluate
        y_pred_proba = model.predict(dtest)
        y_pred = (y_pred_proba > 0.5).astype(int)
        
        metrics = {
            'accuracy': float(accuracy_score(y_test, y_pred)),
            'precision': float(precision_score(y_test, y_pred, zero_division=0)),
            'recall': float(recall_score(y_test, y_pred, zero_division=0)),
            'f1_score': float(f1_score(y_test, y_pred, zero_division=0))
        }
        
        print(f"✅ XGBoost trained - Accuracy: {metrics['accuracy']:.4f}, "
              f"Precision: {metrics['precision']:.4f}, Recall: {metrics['recall']:.4f}")
        
        return model, metrics
    
    def save_model(
        self,
        model: xgb.Booster,
        model_type: str,
        version: str,
        metrics: Dict[str, float]
    ) -> str:
        """
        Save trained model
        
        Returns:
            Path to saved model
        """
        # Generate filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{model_type}_{version}_{timestamp}.json"
        model_path = self.models_dir / filename
        
        # Save model
        model.save_model(str(model_path))
        
        # Register with model manager
        self.model_manager.register_model(
            model_type=model_type,
            model_path=str(model_path),
            version=version,
            metrics=metrics,
            activate=False  # Don't auto-activate, use A/B testing first
        )
        
        print(f"💾 Model saved: {model_path}")
        return str(model_path)
    
    def retrain_models(
        self,
        min_samples: int = 100,
        test_size: float = 0.2
    ) -> Dict[str, any]:
        """
        Retrain models with collected data
        
        Args:
            min_samples: Minimum samples required for retraining
            test_size: Proportion of data for testing
        
        Returns:
            Dictionary with retraining results
        """
        print("🔄 Starting model retraining pipeline...")
        
        # Get training data
        df, has_enough = self.data_collector.get_training_data(min_samples=min_samples)
        
        if not has_enough:
            return {
                "status": "skipped",
                "reason": f"Not enough data (need {min_samples}, have {len(df)})"
            }
        
        print(f"📊 Training data: {len(df)} samples")
        
        # Prepare features
        X, y = self.prepare_features(df)
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=test_size, random_state=42, stratify=y
        )
        
        print(f"📊 Train: {len(X_train)} samples, Test: {len(X_test)} samples")
        
        # Train XGBoost model
        xgb_model, xgb_metrics = self.train_xgboost_model(
            X_train, y_train, X_test, y_test
        )
        
        # Generate version
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        version = f"v_auto_{timestamp}"
        
        # Save model
        model_path = self.save_model(xgb_model, "xgboost", version, xgb_metrics)
        
        # Archive batch data
        self.data_collector.archive_batch()
        
        result = {
            "status": "success",
            "version": version,
            "model_path": model_path,
            "metrics": xgb_metrics,
            "training_samples": len(X_train),
            "test_samples": len(X_test),
            "timestamp": datetime.now().isoformat()
        }
        
        print(f"✅ Retraining complete - Version: {version}")
        
        return result
    
    def should_retrain(
        self,
        min_samples: int = 100,
        min_days_since_last: int = 7
    ) -> bool:
        """
        Check if retraining should be triggered
        
        Args:
            min_samples: Minimum new samples needed
            min_days_since_last: Minimum days since last retraining
        
        Returns:
            True if should retrain
        """
        # Check if enough new data
        _, has_enough = self.data_collector.get_training_data(min_samples=min_samples)
        
        if not has_enough:
            return False
        
        # Check last retraining time
        xgb_versions = self.model_manager.list_versions("xgboost")
        
        if xgb_versions:
            # Get most recent version
            latest = max(xgb_versions, key=lambda v: v.created_at)
            last_train_time = datetime.fromisoformat(latest.created_at)
            days_since = (datetime.now() - last_train_time).days
            
            return days_since >= min_days_since_last
        
        return True  # No models trained yet


class AutomatedRetrainingScheduler:
    """Scheduler for automated retraining"""
    
    def __init__(
        self,
        model_manager: ModelManager,
        check_interval_hours: int = 24,
        min_samples: int = 100,
        min_days_between_retraining: int = 7
    ):
        self.model_manager = model_manager
        self.retrainer = ModelRetrainer(model_manager)
        self.check_interval_hours = check_interval_hours
        self.min_samples = min_samples
        self.min_days_between_retraining = min_days_between_retraining
        self.is_running = False
    
    async def run(self):
        """Run the automated retraining scheduler"""
        print(f"🤖 Automated retraining scheduler started")
        print(f"   Check interval: {self.check_interval_hours} hours")
        print(f"   Min samples: {self.min_samples}")
        print(f"   Min days between retraining: {self.min_days_between_retraining}")
        
        self.is_running = True
        
        while self.is_running:
            try:
                # Check if retraining should be triggered
                if self.retrainer.should_retrain(
                    min_samples=self.min_samples,
                    min_days_since_last=self.min_days_between_retraining
                ):
                    print("🔔 Retraining triggered!")
                    
                    # Perform retraining
                    result = self.retrainer.retrain_models(min_samples=self.min_samples)
                    
                    if result["status"] == "success":
                        print(f"✅ New model version: {result['version']}")
                        print(f"   Accuracy: {result['metrics']['accuracy']:.4f}")
                        
                        # Setup A/B test with previous active model
                        active = self.model_manager.get_active_model("xgboost")
                        if active:
                            print(f"🔬 Setting up A/B test: {active.version} vs {result['version']}")
                            self.model_manager.setup_ab_test(
                                model_type="xgboost",
                                version_a=active.version,
                                version_b=result["version"],
                                traffic_split=(0.8, 0.2)  # 80% existing, 20% new
                            )
                        else:
                            # No active model, activate new one
                            print(f"✅ Activating new model: {result['version']}")
                            for v in self.model_manager.versions["xgboost"]:
                                if v.version == result["version"]:
                                    v.is_active = True
                                    v.traffic_weight = 1.0
                            self.model_manager._save_versions()
                
                # Wait for next check
                await asyncio.sleep(self.check_interval_hours * 3600)
                
            except Exception as e:
                print(f"❌ Error in retraining scheduler: {e}")
                await asyncio.sleep(3600)  # Wait 1 hour before retry
    
    def stop(self):
        """Stop the scheduler"""
        self.is_running = False
        print("🛑 Retraining scheduler stopped")


# Example usage
async def main():
    """Example: Run retraining pipeline"""
    model_manager = ModelManager()
    retrainer = ModelRetrainer(model_manager)
    
    # Manual retraining
    result = retrainer.retrain_models(min_samples=50)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    asyncio.run(main())
