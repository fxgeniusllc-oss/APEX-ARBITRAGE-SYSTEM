"""
DeFi Analytics ML Module
Advanced analytics and ML predictions for DeFi opportunities
Based on defi_analytics_ml and dual_ai_ml_engine principles
"""

import numpy as np
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime, timedelta
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestRegressor, GradientBoostingClassifier
import warnings
warnings.filterwarnings('ignore')


@dataclass
class OpportunityFeatures:
    """Feature vector for ML models"""
    # Price features
    price_spread: float
    price_volatility: float
    price_momentum: float
    
    # Liquidity features
    pool_tvl: float
    pool_volume_24h: float
    liquidity_depth: float
    
    # Route features
    route_complexity: int
    hop_count: int
    total_fees: float
    
    # Market features
    gas_price_gwei: float
    network_congestion: float
    time_of_day: float
    day_of_week: int
    
    # Historical features
    historical_success_rate: float
    avg_profit_last_24h: float
    execution_count_24h: int
    
    # Risk features
    slippage_risk: float
    mev_risk: float
    smart_contract_risk: float


class DeFiAnalytics:
    """
    Comprehensive DeFi analytics and ML prediction system
    Combines multiple models for opportunity scoring
    """
    
    def __init__(self):
        self.scaler = StandardScaler()
        self.profit_predictor = None  # RandomForest for profit prediction
        self.success_classifier = None  # GradientBoosting for success prediction
        self.risk_assessor = None  # Neural network for risk assessment
        
        self.feature_importance = {}
        self.prediction_history = []
        self.performance_metrics = {
            'total_predictions': 0,
            'accurate_predictions': 0,
            'false_positives': 0,
            'false_negatives': 0,
            'avg_profit_error': 0.0
        }
        
        self._initialize_models()
    
    def _initialize_models(self):
        """Initialize ML models with optimal hyperparameters"""
        # Profit predictor (regression)
        self.profit_predictor = RandomForestRegressor(
            n_estimators=200,
            max_depth=15,
            min_samples_split=5,
            min_samples_leaf=2,
            random_state=42,
            n_jobs=-1
        )
        
        # Success classifier (binary classification)
        self.success_classifier = GradientBoostingClassifier(
            n_estimators=150,
            learning_rate=0.1,
            max_depth=7,
            min_samples_split=10,
            random_state=42
        )
        
        print("✅ DeFi Analytics models initialized")
    
    def extract_features(self, opportunity: Dict) -> OpportunityFeatures:
        """Extract features from opportunity data"""
        
        # Calculate derived features
        hop_count = len(opportunity.get('tokens', [])) - 1
        total_fees = sum(opportunity.get('fees', [0]))
        
        # Time features
        now = datetime.now()
        time_of_day = now.hour / 24.0
        day_of_week = now.weekday()
        
        features = OpportunityFeatures(
            # Price features
            price_spread=opportunity.get('price_spread', 0.0),
            price_volatility=opportunity.get('volatility', 0.0),
            price_momentum=opportunity.get('momentum', 0.0),
            
            # Liquidity features
            pool_tvl=opportunity.get('tvl_usd', 0.0),
            pool_volume_24h=opportunity.get('volume_24h', 0.0),
            liquidity_depth=opportunity.get('liquidity_depth', 0.0),
            
            # Route features
            route_complexity=hop_count ** 2,  # Complexity grows quadratically
            hop_count=hop_count,
            total_fees=total_fees,
            
            # Market features
            gas_price_gwei=opportunity.get('gas_price', 50.0),
            network_congestion=opportunity.get('congestion', 0.5),
            time_of_day=time_of_day,
            day_of_week=day_of_week,
            
            # Historical features
            historical_success_rate=opportunity.get('historical_success_rate', 0.75),
            avg_profit_last_24h=opportunity.get('avg_profit_24h', 0.0),
            execution_count_24h=opportunity.get('executions_24h', 0),
            
            # Risk features
            slippage_risk=self._calculate_slippage_risk(opportunity),
            mev_risk=self._calculate_mev_risk(opportunity),
            smart_contract_risk=opportunity.get('contract_risk', 0.1)
        )
        
        return features
    
    def _calculate_slippage_risk(self, opportunity: Dict) -> float:
        """Calculate slippage risk score (0-1)"""
        pool_tvl = opportunity.get('tvl_usd', 0)
        trade_size = opportunity.get('input_amount', 0)
        
        if pool_tvl == 0:
            return 1.0
        
        # Slippage risk increases with trade size relative to TVL
        ratio = trade_size / pool_tvl
        risk = min(ratio * 100, 1.0)  # Cap at 1.0
        
        return risk
    
    def _calculate_mev_risk(self, opportunity: Dict) -> float:
        """Calculate MEV (Maximal Extractable Value) risk score (0-1)"""
        profit = opportunity.get('profit_usd', 0)
        gas_price = opportunity.get('gas_price', 50)
        
        # Higher profit and lower gas price = higher MEV risk
        profit_score = min(profit / 100, 1.0)
        gas_score = 1.0 - min(gas_price / 200, 1.0)
        
        risk = (profit_score + gas_score) / 2
        
        return risk
    
    def features_to_array(self, features: OpportunityFeatures) -> np.ndarray:
        """Convert features to numpy array"""
        return np.array([
            features.price_spread,
            features.price_volatility,
            features.price_momentum,
            features.pool_tvl,
            features.pool_volume_24h,
            features.liquidity_depth,
            features.route_complexity,
            features.hop_count,
            features.total_fees,
            features.gas_price_gwei,
            features.network_congestion,
            features.time_of_day,
            features.day_of_week,
            features.historical_success_rate,
            features.avg_profit_last_24h,
            features.execution_count_24h,
            features.slippage_risk,
            features.mev_risk,
            features.smart_contract_risk
        ]).reshape(1, -1)
    
    def predict_profit(self, opportunity: Dict) -> Tuple[float, float]:
        """
        Predict expected profit for an opportunity
        Returns: (predicted_profit, confidence)
        """
        features = self.extract_features(opportunity)
        feature_array = self.features_to_array(features)
        
        # Scale features
        if hasattr(self.scaler, 'mean_'):
            feature_array = self.scaler.transform(feature_array)
        
        # Predict profit
        if hasattr(self.profit_predictor, 'estimators_'):
            predicted_profit = self.profit_predictor.predict(feature_array)[0]
            
            # Calculate confidence based on tree variance
            tree_predictions = [tree.predict(feature_array)[0] 
                              for tree in self.profit_predictor.estimators_]
            confidence = 1.0 - (np.std(tree_predictions) / (np.mean(tree_predictions) + 1e-6))
            confidence = max(0.0, min(1.0, confidence))
        else:
            # Model not trained, use simple heuristic
            predicted_profit = opportunity.get('profit_usd', 0)
            confidence = 0.5
        
        return predicted_profit, confidence
    
    def predict_success(self, opportunity: Dict) -> Tuple[bool, float]:
        """
        Predict whether opportunity will succeed
        Returns: (will_succeed, probability)
        """
        features = self.extract_features(opportunity)
        feature_array = self.features_to_array(features)
        
        # Scale features
        if hasattr(self.scaler, 'mean_'):
            feature_array = self.scaler.transform(feature_array)
        
        # Predict success
        if hasattr(self.success_classifier, 'estimators_'):
            success_prob = self.success_classifier.predict_proba(feature_array)[0][1]
            will_succeed = success_prob > 0.5
        else:
            # Model not trained, use simple heuristic
            success_prob = features.historical_success_rate
            will_succeed = success_prob > 0.6
        
        return will_succeed, success_prob
    
    def calculate_risk_score(self, opportunity: Dict) -> float:
        """
        Calculate comprehensive risk score (0-1, lower is better)
        Combines multiple risk factors
        """
        features = self.extract_features(opportunity)
        
        # Weight different risk factors
        risk_components = {
            'slippage': features.slippage_risk * 0.3,
            'mev': features.mev_risk * 0.25,
            'smart_contract': features.smart_contract_risk * 0.15,
            'complexity': min(features.route_complexity / 16, 1.0) * 0.15,
            'gas': min(features.gas_price_gwei / 200, 1.0) * 0.15
        }
        
        total_risk = sum(risk_components.values())
        
        return total_risk
    
    def score_opportunity(self, opportunity: Dict) -> Dict:
        """
        Comprehensive opportunity scoring
        Returns detailed analysis with predictions
        """
        # Get predictions
        predicted_profit, profit_confidence = self.predict_profit(opportunity)
        will_succeed, success_probability = self.predict_success(opportunity)
        risk_score = self.calculate_risk_score(opportunity)
        
        # Calculate expected value
        expected_value = predicted_profit * success_probability
        
        # Calculate risk-adjusted return
        risk_adjusted_return = expected_value / (1 + risk_score)
        
        # Overall score (0-100)
        overall_score = (
            success_probability * 30 +
            min(expected_value / 50, 1.0) * 30 +
            (1 - risk_score) * 20 +
            profit_confidence * 20
        ) * 100
        
        analysis = {
            'overall_score': overall_score,
            'predicted_profit': predicted_profit,
            'profit_confidence': profit_confidence,
            'success_probability': success_probability,
            'will_succeed': will_succeed,
            'risk_score': risk_score,
            'expected_value': expected_value,
            'risk_adjusted_return': risk_adjusted_return,
            'recommendation': self._generate_recommendation(overall_score, risk_score),
            'timestamp': datetime.now().isoformat()
        }
        
        return analysis
    
    def _generate_recommendation(self, score: float, risk: float) -> str:
        """Generate trading recommendation"""
        if score >= 80 and risk < 0.3:
            return "STRONG BUY - High score, low risk"
        elif score >= 70 and risk < 0.5:
            return "BUY - Good opportunity"
        elif score >= 60 and risk < 0.6:
            return "MODERATE - Consider carefully"
        elif score >= 50:
            return "WEAK - Low confidence"
        else:
            return "AVOID - High risk or low potential"
    
    def train_models(self, training_data: List[Dict]):
        """
        Train ML models on historical data
        """
        print(f"🎓 Training models on {len(training_data)} samples...")
        
        if len(training_data) < 100:
            print("⚠️  Warning: Small training set may lead to poor performance")
        
        # Extract features and labels
        X = []
        y_profit = []
        y_success = []
        
        for data in training_data:
            features = self.extract_features(data)
            feature_array = self.features_to_array(features)
            
            X.append(feature_array[0])
            y_profit.append(data.get('actual_profit', 0))
            y_success.append(1 if data.get('succeeded', False) else 0)
        
        X = np.array(X)
        y_profit = np.array(y_profit)
        y_success = np.array(y_success)
        
        # Fit scaler
        self.scaler.fit(X)
        X_scaled = self.scaler.transform(X)
        
        # Train models
        self.profit_predictor.fit(X_scaled, y_profit)
        self.success_classifier.fit(X_scaled, y_success)
        
        # Calculate feature importance
        self.feature_importance = {
            'profit_model': self.profit_predictor.feature_importances_.tolist(),
            'success_model': self.success_classifier.feature_importances_.tolist()
        }
        
        print("✅ Models trained successfully")
        print(f"   Profit model R²: {self.profit_predictor.score(X_scaled, y_profit):.3f}")
        print(f"   Success model accuracy: {self.success_classifier.score(X_scaled, y_success):.3f}")
    
    def update_performance_metrics(self, prediction: Dict, actual_result: Dict):
        """Update performance metrics based on actual results"""
        self.performance_metrics['total_predictions'] += 1
        
        # Check prediction accuracy
        predicted_success = prediction['will_succeed']
        actual_success = actual_result.get('succeeded', False)
        
        if predicted_success == actual_success:
            self.performance_metrics['accurate_predictions'] += 1
        elif predicted_success and not actual_success:
            self.performance_metrics['false_positives'] += 1
        elif not predicted_success and actual_success:
            self.performance_metrics['false_negatives'] += 1
        
        # Update profit prediction error
        predicted_profit = prediction['predicted_profit']
        actual_profit = actual_result.get('actual_profit', 0)
        profit_error = abs(predicted_profit - actual_profit)
        
        n = self.performance_metrics['total_predictions']
        self.performance_metrics['avg_profit_error'] = (
            (self.performance_metrics['avg_profit_error'] * (n - 1) + profit_error) / n
        )
    
    def get_performance_metrics(self) -> Dict:
        """Get model performance metrics"""
        total = self.performance_metrics['total_predictions']
        if total == 0:
            return self.performance_metrics
        
        accuracy = self.performance_metrics['accurate_predictions'] / total * 100
        
        return {
            **self.performance_metrics,
            'accuracy_percent': accuracy,
            'precision': self._calculate_precision(),
            'recall': self._calculate_recall()
        }
    
    def _calculate_precision(self) -> float:
        """Calculate precision (true positives / predicted positives)"""
        true_pos = self.performance_metrics['accurate_predictions']
        false_pos = self.performance_metrics['false_positives']
        
        if true_pos + false_pos == 0:
            return 0.0
        
        return true_pos / (true_pos + false_pos)
    
    def _calculate_recall(self) -> float:
        """Calculate recall (true positives / actual positives)"""
        true_pos = self.performance_metrics['accurate_predictions']
        false_neg = self.performance_metrics['false_negatives']
        
        if true_pos + false_neg == 0:
            return 0.0
        
        return true_pos / (true_pos + false_neg)
    
    def print_performance_report(self):
        """Print detailed performance report"""
        metrics = self.get_performance_metrics()
        
        print("\n" + "="*60)
        print("DEFI ANALYTICS PERFORMANCE REPORT")
        print("="*60)
        print(f"Total Predictions: {metrics['total_predictions']}")
        print(f"Accurate Predictions: {metrics['accurate_predictions']}")
        print(f"Accuracy: {metrics.get('accuracy_percent', 0):.2f}%")
        print(f"Precision: {metrics.get('precision', 0):.2f}")
        print(f"Recall: {metrics.get('recall', 0):.2f}")
        print(f"False Positives: {metrics['false_positives']}")
        print(f"False Negatives: {metrics['false_negatives']}")
        print(f"Avg Profit Error: ${metrics['avg_profit_error']:.2f}")
        print("="*60 + "\n")


# Global analytics instance
_analytics_instance = None

def get_defi_analytics() -> DeFiAnalytics:
    """Get global DeFi analytics instance"""
    global _analytics_instance
    if _analytics_instance is None:
        _analytics_instance = DeFiAnalytics()
    return _analytics_instance
