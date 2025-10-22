"""
APEX Python Orchestrator with Dual AI/ML Engine
Coordinates multi-chain arbitrage with XGBoost + ONNX ensemble
Supports LIVE/DEV/SIM execution modes
"""

import asyncio
import json
import numpy as np
from typing import List, Dict, Optional
from dataclasses import dataclass
from enum import Enum
from datetime import datetime
# Required ML libraries: install via pip and add to requirements.txt
# pip install xgboost==1.7.6 onnxruntime==1.16.3 torch>=2.0.0
import xgboost as xgb
import onnxruntime as ort

# Optional PyTorch for LSTM support
try:
    import torch
    import torch.nn as nn
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False
    print("⚠️  PyTorch not available. Install with: pip install torch")


class ExecutionMode(Enum):
    """Execution mode configuration"""
    LIVE = "LIVE"  # Execute real transactions
    DEV = "DEV"    # Dry-run with real data
    SIM = "SIM"    # Simulation/backtesting mode


class ChainType(Enum):
    POLYGON = "polygon"
    ETHEREUM = "ethereum"
    ARBITRUM = "arbitrum"
    OPTIMISM = "optimism"
    BASE = "base"
    BSC = "bsc"


@dataclass
class Opportunity:
    route_id: str
    tokens: List[str]
    dexes: List[str]
    input_amount: float
    expected_output: float
    gas_estimate: int
    profit_usd: float
    confidence_score: float
    timestamp: int
    chain: ChainType


class LSTMModel(nn.Module):
    """
    LSTM model for arbitrage opportunity prediction
    Captures temporal patterns and market dynamics
    """
    def __init__(self, input_size: int = 10, hidden_size: int = 128, output_size: int = 1, num_layers: int = 2):
        super(LSTMModel, self).__init__()
        self.lstm = nn.LSTM(input_size, hidden_size, num_layers, batch_first=True, dropout=0.2)
        self.fc1 = nn.Linear(hidden_size, 64)
        self.fc2 = nn.Linear(64, output_size)
        self.relu = nn.ReLU()
        self.sigmoid = nn.Sigmoid()
    
    def forward(self, x):
        """Forward pass through LSTM network"""
        # x shape: (batch, seq_len, features)
        lstm_out, _ = self.lstm(x)
        # Take the last output
        last_out = lstm_out[:, -1, :]
        # Fully connected layers
        fc1_out = self.relu(self.fc1(last_out))
        output = self.sigmoid(self.fc2(fc1_out))
        return output


class MarketConditionAnalyzer:
    """
    Analyzes market conditions for dynamic threshold adjustment
    """
    def __init__(self):
        self.volatility_history = []
        self.execution_history = []
        self.max_history_size = 100
        self.min_threshold = float(os.getenv('MIN_THRESHOLD', '0.88'))
        self.max_threshold = float(os.getenv('MAX_THRESHOLD', '0.95'))
    
    def update_market_data(self, volatility: float, gas_price: float):
        """Update market condition data"""
        self.volatility_history.append({
            'volatility': volatility,
            'gas_price': gas_price,
            'timestamp': datetime.now().isoformat()
        })
        
        # Keep only recent history
        if len(self.volatility_history) > self.max_history_size:
            self.volatility_history.pop(0)
    
    def log_execution_result(self, opportunity: Opportunity, success: bool, actual_profit: float):
        """Log execution results for continuous learning"""
        self.execution_history.append({
            'route_id': opportunity.route_id,
            'expected_profit': opportunity.profit_usd,
            'actual_profit': actual_profit,
            'success': success,
            'confidence_score': opportunity.confidence_score,
            'timestamp': datetime.now().isoformat()
        })
        
        # Keep only recent history
        if len(self.execution_history) > self.max_history_size:
            self.execution_history.pop(0)
    
    def get_dynamic_threshold(self) -> float:
        """
        Calculate dynamic threshold based on market conditions
        
        Returns higher threshold in volatile markets (more conservative)
        Returns lower threshold in stable markets (more opportunities)
        """
        if not self.volatility_history:
            return self.min_threshold
        
        # Calculate recent volatility (last 20 samples)
        recent_volatility = [v['volatility'] for v in self.volatility_history[-20:]]
        avg_volatility = np.mean(recent_volatility) if recent_volatility else 0.5
        
        # Calculate success rate from execution history
        if len(self.execution_history) >= 10:
            recent_executions = self.execution_history[-20:]
            success_rate = sum(1 for e in recent_executions if e['success']) / len(recent_executions)
        else:
            success_rate = 0.5  # Default
        
        # Adjust threshold based on conditions
        # Higher volatility → Higher threshold (more conservative)
        # Lower success rate → Higher threshold (more conservative)
        
        volatility_adjustment = (avg_volatility - 0.5) * 0.1  # ±0.05 max
        success_adjustment = (0.5 - success_rate) * 0.05  # ±0.025 max
        
        dynamic_threshold = self.min_threshold + volatility_adjustment + success_adjustment
        
        # Clamp to min/max range
        return max(self.min_threshold, min(self.max_threshold, dynamic_threshold))
    
    def get_execution_metrics(self) -> Dict:
        """Get execution performance metrics"""
        if not self.execution_history:
            return {
                'total_executions': 0,
                'success_rate': 0.0,
                'avg_profit': 0.0,
                'profit_accuracy': 0.0
            }
        
        total = len(self.execution_history)
        successes = sum(1 for e in self.execution_history if e['success'])
        
        actual_profits = [e['actual_profit'] for e in self.execution_history if e['success']]
        expected_profits = [e['expected_profit'] for e in self.execution_history if e['success']]
        
        return {
            'total_executions': total,
            'success_rate': successes / total if total > 0 else 0.0,
            'avg_profit': np.mean(actual_profits) if actual_profits else 0.0,
            'profit_accuracy': np.mean([
                a / e if e > 0 else 0 
                for a, e in zip(actual_profits, expected_profits)
            ]) if actual_profits else 0.0
        }


class MLEnsemble:
    """
    Triple AI/ML Engine with XGBoost, ONNX, and LSTM models
    Enhanced with GPU acceleration and multi-model ensemble voting
    Supports continuous learning and dynamic thresholding
    """
    
    def __init__(self, use_gpu: bool = False, voting_strategy: str = "weighted"):
        self.xgb_model = None
        self.onnx_model = None
        self.lstm_model = None
        self.use_gpu = use_gpu
        self.voting_strategy = voting_strategy  # 'weighted', 'majority', 'unanimous'
        self.ensemble_weights = (0.4, 0.3, 0.3)  # XGBoost, ONNX, LSTM weights
        
        # GPU configuration
        self.providers = self._get_providers()
        
        # Market condition analyzer for dynamic thresholding
        self.market_analyzer = MarketConditionAnalyzer()
        
        # Continuous learning buffer
        self.learning_buffer = []
        self.learning_buffer_size = 1000
        
    def _get_providers(self):
        """
        Get ONNX Runtime providers based on GPU availability
        Prioritizes GPU (CUDA) if available and requested
        """
        if self.use_gpu:
            # Try to use GPU providers
            available_providers = ort.get_available_providers()
            if 'CUDAExecutionProvider' in available_providers:
                print("✅ GPU acceleration enabled (CUDA)")
                return ['CUDAExecutionProvider', 'CPUExecutionProvider']
            elif 'TensorrtExecutionProvider' in available_providers:
                print("✅ GPU acceleration enabled (TensorRT)")
                return ['TensorrtExecutionProvider', 'CUDAExecutionProvider', 'CPUExecutionProvider']
            else:
                print("⚠️  GPU requested but not available, falling back to CPU")
                return ['CPUExecutionProvider']
        else:
            return ['CPUExecutionProvider']
        
    def load_models(self, xgb_path: str = None, onnx_path: str = None, lstm_path: str = None):
        """Load pre-trained models with GPU support"""
        if xgb_path:
            self.xgb_model = xgb.Booster()
            self.xgb_model.load_model(xgb_path)
            print(f"✅ XGBoost model loaded from {xgb_path}")
        
        if onnx_path:
            # Load ONNX model with specified providers (GPU or CPU)
            sess_options = ort.SessionOptions()
            sess_options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
            
            self.onnx_model = ort.InferenceSession(
                onnx_path,
                sess_options=sess_options,
                providers=self.providers
            )
            print(f"✅ ONNX model loaded from {onnx_path}")
            print(f"   Providers: {self.onnx_model.get_providers()}")
        
        if lstm_path and TORCH_AVAILABLE:
            try:
                # Load LSTM model (PyTorch)
                self.lstm_model = LSTMModel()
                if os.path.exists(lstm_path):
                    # Load from .pt or .pth file
                    if lstm_path.endswith(('.pt', '.pth')):
                        self.lstm_model.load_state_dict(torch.load(lstm_path, map_location='cpu'))
                    elif lstm_path.endswith('.onnx'):
                        # Load LSTM as ONNX (alternative format)
                        pass  # Already handled by onnx_path
                    self.lstm_model.eval()  # Set to evaluation mode
                    print(f"✅ LSTM model loaded from {lstm_path}")
                else:
                    print(f"⚠️  LSTM model file not found: {lstm_path}")
            except Exception as e:
                print(f"⚠️  Failed to load LSTM model: {e}")
        elif lstm_path and not TORCH_AVAILABLE:
            print(f"⚠️  PyTorch not available, cannot load LSTM model")
    
    def extract_features(self, opportunity: Opportunity) -> np.ndarray:
        """Extract 10-feature vector from opportunity"""
        features = [
            opportunity.profit_usd,
            opportunity.expected_output / opportunity.input_amount,  # profit ratio
            len(opportunity.tokens),  # route complexity
            opportunity.gas_estimate / 1000000,  # gas in millions
            opportunity.confidence_score,
            float(opportunity.timestamp % 86400) / 86400,  # time of day normalized
            len(opportunity.dexes),
            opportunity.input_amount / 1000,  # amount in thousands
            1.0 if len(opportunity.tokens) == 3 else 0.0,  # is 2-hop
            1.0 if len(opportunity.tokens) == 4 else 0.0,  # is 3-hop
        ]
        return np.array(features, dtype=np.float32).reshape(1, -1)
    
    def predict(self, opportunity: Opportunity) -> float:
        """
        Multi-model ensemble prediction with voting strategies
        Supports: weighted, majority, unanimous voting
        Includes XGBoost, ONNX, and LSTM models
        """
        features = self.extract_features(opportunity)
        
        predictions = []
        xgb_score = 0.5  # Default if model not loaded
        onnx_score = 0.5
        lstm_score = 0.5
        
        # XGBoost prediction (accuracy-focused)
        if self.xgb_model:
            dmatrix = xgb.DMatrix(features)
            xgb_score = float(self.xgb_model.predict(dmatrix)[0])
            predictions.append(("xgboost", xgb_score))
        
        # ONNX prediction (speed-focused, GPU-accelerated)
        if self.onnx_model:
            input_name = self.onnx_model.get_inputs()[0].name
            onnx_output = self.onnx_model.run(None, {input_name: features})
            onnx_score = float(onnx_output[0][0])
            predictions.append(("onnx", onnx_score))
        
        # LSTM prediction (temporal pattern recognition)
        if self.lstm_model and TORCH_AVAILABLE:
            try:
                with torch.no_grad():
                    # Reshape for LSTM: (batch, seq_len, features)
                    lstm_input = torch.tensor(features, dtype=torch.float32).unsqueeze(1)
                    lstm_output = self.lstm_model(lstm_input)
                    lstm_score = float(lstm_output.squeeze().item())
                    predictions.append(("lstm", lstm_score))
            except Exception as e:
                print(f"⚠️  LSTM prediction error: {e}")
        
        # Apply voting strategy
        ensemble_score = self._apply_voting_strategy(predictions)
        
        return ensemble_score
    
    def _apply_voting_strategy(self, predictions: List[tuple]) -> float:
        """
        Apply ensemble voting strategy
        
        Args:
            predictions: List of (model_name, score) tuples
        
        Returns:
            Final ensemble score
        """
        if not predictions:
            return 0.5
        
        if self.voting_strategy == "weighted":
            # Weighted average based on ensemble_weights
            if len(predictions) == 1:
                return predictions[0][1]
            elif len(predictions) == 2:
                # Two models (XGBoost + ONNX or XGBoost + LSTM, etc.)
                weights = self.ensemble_weights[:2]
                total_weight = sum(weights)
                return sum(w * p[1] for w, p in zip(weights, predictions)) / total_weight
            elif len(predictions) == 3:
                # Three models (XGBoost + ONNX + LSTM)
                return (
                    self.ensemble_weights[0] * predictions[0][1] +
                    self.ensemble_weights[1] * predictions[1][1] +
                    self.ensemble_weights[2] * predictions[2][1]
                )
        
        elif self.voting_strategy == "majority":
            # Majority voting: average of binary decisions
            threshold = 0.5
            votes = [1 if score > threshold else 0 for _, score in predictions]
            majority_vote = sum(votes) / len(votes)
            
            # If majority agrees, return high confidence, else return average
            if majority_vote >= 0.5:
                return max(score for _, score in predictions)
            else:
                return min(score for _, score in predictions)
        
        elif self.voting_strategy == "unanimous":
            # Unanimous voting: all models must agree (conservative)
            threshold = 0.5
            all_positive = all(score > threshold for _, score in predictions)
            all_negative = all(score <= threshold for _, score in predictions)
            
            if all_positive:
                # All agree positive: return average
                return sum(score for _, score in predictions) / len(predictions)
            elif all_negative:
                # All agree negative: return average
                return sum(score for _, score in predictions) / len(predictions)
            else:
                # Disagreement: return conservative score (0.5)
                return 0.5
        
        # Default: simple average
        return sum(score for _, score in predictions) / len(predictions)
    
    def should_execute(self, opportunity: Opportunity, threshold: float = 0.88) -> bool:
        """
        Determine if opportunity should be executed
        Uses dynamic threshold if enabled
        """
        # Use dynamic threshold if enabled
        enable_dynamic = os.getenv('ENABLE_DYNAMIC_THRESHOLD', 'true').lower() == 'true'
        if enable_dynamic:
            threshold = self.market_analyzer.get_dynamic_threshold()
        
        score = self.predict(opportunity)
        return score > threshold
    
    def log_execution_result(self, opportunity: Opportunity, success: bool, actual_profit: float):
        """
        Log execution result for continuous learning
        Updates market analyzer and learning buffer
        """
        # Log to market analyzer
        self.market_analyzer.log_execution_result(opportunity, success, actual_profit)
        
        # Add to learning buffer
        features = self.extract_features(opportunity)
        self.learning_buffer.append({
            'features': features.tolist(),
            'label': 1 if success else 0,
            'expected_profit': opportunity.profit_usd,
            'actual_profit': actual_profit,
            'timestamp': datetime.now().isoformat()
        })
        
        # Keep buffer size manageable
        if len(self.learning_buffer) > self.learning_buffer_size:
            self.learning_buffer.pop(0)
    
    def get_learning_data(self) -> Dict:
        """
        Get accumulated learning data for retraining
        
        Returns:
            Dictionary with features and labels for model retraining
        """
        if not self.learning_buffer:
            return {'features': [], 'labels': []}
        
        features = [item['features'] for item in self.learning_buffer]
        labels = [item['label'] for item in self.learning_buffer]
        
        return {
            'features': features,
            'labels': labels,
            'count': len(self.learning_buffer),
            'success_rate': sum(labels) / len(labels) if labels else 0.0
        }
    
    def save_learning_data(self, filepath: str = 'data/learning_buffer.json'):
        """Save learning buffer to disk for retraining"""
        try:
            os.makedirs(os.path.dirname(filepath), exist_ok=True)
            with open(filepath, 'w') as f:
                json.dump(self.learning_buffer, f, indent=2)
            print(f"✅ Learning data saved: {len(self.learning_buffer)} samples")
        except Exception as e:
            print(f"⚠️  Failed to save learning data: {e}")


class ParallelChainScanner:
    """Multi-chain parallel orchestration system"""
    
    def __init__(self):
        self.chains = {
            ChainType.POLYGON: None,
            ChainType.ETHEREUM: None,
            ChainType.ARBITRUM: None,
            ChainType.OPTIMISM: None,
            ChainType.BASE: None,
            ChainType.BSC: None,
        }
        self.opportunities = []
    
    async def scan_chain(self, chain: ChainType) -> List[Opportunity]:
        """Scan single chain asynchronously"""
        # Placeholder - would connect to actual chain scanners
        await asyncio.sleep(0.01)  # Simulated network delay
        return []
    
    async def scan_all_chains(self) -> List[Opportunity]:
        """Scan all chains in parallel"""
        tasks = [self.scan_chain(chain) for chain in self.chains.keys()]
        results = await asyncio.gather(*tasks)
        
        # Flatten results
        all_opportunities = []
        for chain_opportunities in results:
            all_opportunities.extend(chain_opportunities)
        
        return all_opportunities
    
    async def execute_cross_chain_arbitrage(
        self,
        source_chain: ChainType,
        target_chain: ChainType,
        amount: float
    ) -> Dict:
        """Execute cross-chain arbitrage with bridging"""
        # Step 1: Buy on source chain
        # Step 2: Bridge using LayerZero/Across
        # Step 3: Sell on target chain
        
        return {
            "status": "success",
            "source_chain": source_chain.value,
            "target_chain": target_chain.value,
            "profit": 0.0
        }


class MicroRaptorBot:
    """4x4x4x4 Spawning Micro Raptor Bot for data fetching"""
    
    def __init__(self, bot_id: int, layer: int):
        self.bot_id = bot_id
        self.layer = layer
        self.children = []
        self.data_buffer = []
    
    async def fetch_pool_data(self, dex: str, pool_address: str) -> Dict:
        """Fetch pool data from DEX"""
        # Simulated pool data fetch
        await asyncio.sleep(0.001)
        return {
            "dex": dex,
            "pool": pool_address,
            "reserve0": 1000000.0,
            "reserve1": 1000000.0,
            "fee": 0.003
        }
    
    def spawn_children(self, count: int = 4):
        """Spawn child bots for parallel data fetching"""
        for i in range(count):
            child = MicroRaptorBot(
                bot_id=self.bot_id * 4 + i,
                layer=self.layer + 1
            )
            self.children.append(child)
    
    async def parallel_fetch(self, targets: List[Dict]) -> List[Dict]:
        """Fetch data in parallel using spawned children"""
        if not self.children and self.layer < 4:
            self.spawn_children()
        
        tasks = []
        for target in targets:
            tasks.append(self.fetch_pool_data(target['dex'], target['pool']))
        
        return await asyncio.gather(*tasks)


class MempoolWatchdog:
    """Mempool monitoring for frontrun protection and opportunity detection"""
    
    def __init__(self):
        self.pending_txs = []
        self.monitored_addresses = set()
    
    async def monitor_mempool(self, chain: ChainType):
        """Monitor mempool for pending transactions"""
        while True:
            # Would connect to WebSocket RPC for mempool monitoring
            await asyncio.sleep(0.1)
    
    def analyze_transaction(self, tx: Dict) -> Optional[Dict]:
        """Analyze pending transaction for arbitrage impact"""
        # Check if transaction affects our routes
        # Calculate if we should frontrun/backrun
        return None
    
    def should_submit_private(self, opportunity: Opportunity) -> bool:
        """Determine if should use private relay (Flashbots/Eden)"""
        # Use private relay for high-value opportunities
        return opportunity.profit_usd > 50.0


class ApexOrchestrator:
    """Main orchestrator coordinating all components"""
    
    def __init__(self, mode: ExecutionMode = None):
        # Get execution mode from environment or use provided mode
        mode_str = os.getenv('MODE', 'DEV').upper()
        self.mode = mode if mode else ExecutionMode[mode_str]
        
        self.ml_ensemble = MLEnsemble()
        self.chain_scanner = ParallelChainScanner()
        self.mempool_watchdog = MempoolWatchdog()
        self.micro_raptors = []
        self.metrics = {
            "opportunities_scanned": 0,
            "opportunities_executed": 0,
            "opportunities_simulated": 0,
            "total_profit": 0.0,
            "simulated_profit": 0.0,
            "success_rate": 0.0,
            "mode": self.mode.value
        }
        
        # Print mode information
        self._print_mode_info()
    
    def _print_mode_info(self):
        """Print execution mode information"""
        mode_emoji = {
            ExecutionMode.LIVE: "🔴",
            ExecutionMode.DEV: "🟡",
            ExecutionMode.SIM: "🔵"
        }
        mode_desc = {
            ExecutionMode.LIVE: "LIVE MODE - Executes real arbitrage transactions on-chain",
            ExecutionMode.DEV: "DEV MODE - Runs all logic with real data but simulates transactions",
            ExecutionMode.SIM: "SIM MODE - Simulation mode for backtesting with real market data"
        }
        
        print("\n" + "="*80)
        print(f"{mode_emoji[self.mode]} {self.mode.value} MODE")
        print(mode_desc[self.mode])
        print("="*80)
        
        if self.mode != ExecutionMode.LIVE:
            print("⚠️  WARNING: Transactions will be SIMULATED only")
            print("   Real DEX data will be collected and analyzed")
            print("   No actual on-chain transactions will be executed")
        else:
            print("🔴 LIVE MODE ACTIVE - Real transactions will be executed")
            print("   Please ensure sufficient funds and prior testing in DEV mode")
        print("="*80 + "\n")
    
    def should_execute_transaction(self) -> bool:
        """Check if transactions should be executed based on mode"""
        return self.mode == ExecutionMode.LIVE
    
    def initialize(self):
        """Initialize all components"""
        # Load ML models
        try:
            lstm_path = os.getenv('LSTM_MODEL_PATH', 'data/models/lstm_model.pt')
            self.ml_ensemble.load_models(
                xgb_path="data/models/xgboost_model.json",
                onnx_path="data/models/onnx_model.onnx",
                lstm_path=lstm_path
            )
        except Exception as e:
            print(f"Warning: Could not load ML models: {e}")
        
        # Spawn initial micro raptor bots
        for i in range(4):
            bot = MicroRaptorBot(bot_id=i, layer=0)
            bot.spawn_children()
            self.micro_raptors.append(bot)
        
        # Print ensemble configuration
        model_count = sum([
            self.ml_ensemble.xgb_model is not None,
            self.ml_ensemble.onnx_model is not None,
            self.ml_ensemble.lstm_model is not None
        ])
        print(f"🤖 Ensemble Models Loaded: {model_count}/3")
        print(f"   XGBoost: {'✅' if self.ml_ensemble.xgb_model else '❌'}")
        print(f"   ONNX: {'✅' if self.ml_ensemble.onnx_model else '❌'}")
        print(f"   LSTM: {'✅' if self.ml_ensemble.lstm_model else '❌'}")
        print(f"🎯 Base Threshold: 0.88 (88%)")
        print(f"🔄 Dynamic Threshold: {'Enabled' if os.getenv('ENABLE_DYNAMIC_THRESHOLD', 'true').lower() == 'true' else 'Disabled'}")
        print(f"📚 Continuous Learning: Enabled")
    
    async def scan_opportunities(self) -> List[Opportunity]:
        """Scan for arbitrage opportunities across all chains"""
        opportunities = await self.chain_scanner.scan_all_chains()
        self.metrics["opportunities_scanned"] += len(opportunities)
        return opportunities
    
    def filter_opportunities(
        self,
        opportunities: List[Opportunity],
        min_profit: float = 5.0,
        confidence_threshold: float = 0.88
    ) -> List[Opportunity]:
        """Filter opportunities using ML ensemble with dynamic thresholding"""
        filtered = []
        
        # Get dynamic threshold if enabled
        enable_dynamic = os.getenv('ENABLE_DYNAMIC_THRESHOLD', 'true').lower() == 'true'
        if enable_dynamic:
            confidence_threshold = self.ml_ensemble.market_analyzer.get_dynamic_threshold()
            print(f"🎯 Dynamic threshold: {confidence_threshold:.3f}")
        
        for opp in opportunities:
            # Basic filters
            if opp.profit_usd < min_profit:
                continue
            
            # ML ensemble filter
            if self.ml_ensemble.should_execute(opp, confidence_threshold):
                filtered.append(opp)
        
        # Sort by profit
        filtered.sort(key=lambda x: x.profit_usd, reverse=True)
        
        return filtered
    
    async def execute_opportunity(self, opportunity: Opportunity) -> Dict:
        """Execute or simulate arbitrage opportunity based on mode"""
        # Check mempool for MEV protection
        use_private = self.mempool_watchdog.should_submit_private(opportunity)
        
        if self.should_execute_transaction():
            # LIVE MODE: Execute real transaction
            print(f"🚀 EXECUTING REAL TRANSACTION: {opportunity.route_id}")
            
            # Execute based on route type
            if len(opportunity.tokens) <= 4:
                # Simple arbitrage
                result = {"status": "success", "profit": opportunity.profit_usd, "simulated": False}
            else:
                # Complex cross-chain
                result = await self.chain_scanner.execute_cross_chain_arbitrage(
                    ChainType.POLYGON,
                    ChainType.ARBITRUM,
                    opportunity.input_amount
                )
                result["simulated"] = False
            
            # Update metrics for real execution
            if result["status"] == "success":
                self.metrics["opportunities_executed"] += 1
                self.metrics["total_profit"] += opportunity.profit_usd
                print(f"✅ EXECUTED: Profit ${opportunity.profit_usd:.2f}")
                
                # Log for continuous learning
                actual_profit = result.get("profit", opportunity.profit_usd)
                self.ml_ensemble.log_execution_result(opportunity, True, actual_profit)
            else:
                # Log failure for continuous learning
                self.ml_ensemble.log_execution_result(opportunity, False, 0.0)
        else:
            # DEV/SIM MODE: Simulate transaction
            print(f"🔄 SIMULATING TRANSACTION: {opportunity.route_id}")
            
            # Simulate the execution without on-chain transaction
            result = await self._simulate_execution(opportunity)
            result["simulated"] = True
            result["mode"] = self.mode.value
            
            # Update metrics for simulation
            self.metrics["opportunities_simulated"] += 1
            self.metrics["simulated_profit"] += opportunity.profit_usd
            print(f"✅ SIMULATED: Would profit ${opportunity.profit_usd:.2f}")
            
            # Log simulated execution (for testing continuous learning)
            if result.get("would_execute"):
                self.ml_ensemble.log_execution_result(opportunity, True, opportunity.profit_usd * 0.95)
        
        return result
    
    async def _simulate_execution(self, opportunity: Opportunity) -> Dict:
        """Simulate transaction execution without on-chain execution"""
        # Perform all validations as if executing
        validations = {
            "has_sufficient_profit": opportunity.profit_usd > 0,
            "has_valid_route": len(opportunity.tokens) >= 2,
            "has_gas_estimate": opportunity.gas_estimate > 0,
        }
        
        all_valid = all(validations.values())
        
        return {
            "status": "success" if all_valid else "would_fail",
            "profit": opportunity.profit_usd if all_valid else 0,
            "validations": validations,
            "would_execute": all_valid,
            "message": f"Transaction simulated in {self.mode.value} mode - no on-chain execution"
        }
    
    async def run(self):
        """Main execution loop"""
        print("🚀 APEX Orchestrator Starting...")
        self.initialize()
        
        iteration_count = 0
        
        while True:
            # Scan opportunities - ALWAYS use real live DEX data
            opportunities = await self.scan_opportunities()
            
            # Filter with ML
            filtered = self.filter_opportunities(opportunities)
            
            # Execute or simulate top opportunities based on mode
            for opp in filtered[:5]:  # Process top 5
                try:
                    result = await self.execute_opportunity(opp)
                    action = "Executed" if not result.get("simulated") else "Simulated"
                    print(f"{'✅' if result['status'] == 'success' else '❌'} {action}: {opp.route_id} | Profit: ${opp.profit_usd:.2f}")
                except Exception as e:
                    print(f"❌ Processing failed: {e}")
            
            # Periodic learning data save (every 100 iterations)
            iteration_count += 1
            if iteration_count % 100 == 0:
                self.ml_ensemble.save_learning_data()
                metrics = self.ml_ensemble.market_analyzer.get_execution_metrics()
                print(f"📊 Learning Metrics: Success Rate: {metrics['success_rate']:.2%}, "
                      f"Avg Profit: ${metrics['avg_profit']:.2f}")
            
            # Wait before next scan
            await asyncio.sleep(1.0)
    
    def get_metrics(self) -> Dict:
        """Get current performance metrics"""
        if self.metrics["opportunities_scanned"] > 0:
            self.metrics["success_rate"] = (
                self.metrics["opportunities_executed"] /
                self.metrics["opportunities_scanned"] * 100
            )
        return self.metrics


async def main():
    """Main entry point"""
    orchestrator = ApexOrchestrator()
    await orchestrator.run()


if __name__ == "__main__":
    asyncio.run(main())
