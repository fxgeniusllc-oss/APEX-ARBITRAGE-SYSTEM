"""
Integration Example: Using OMNI-MEV AI Engine with APEX Orchestrator

This example demonstrates how to integrate the hybrid ML controller
with the existing APEX orchestrator for enhanced arbitrage predictions.
"""

import asyncio
import requests
from typing import Dict, Optional

# --- STUBS for missing orchestrator module ---
class ApexOrchestrator:
    def __init__(self):
        pass
    def get_metrics(self):
        return {}

class Opportunity:
    def __init__(
        self,
        profit_usd=0.0,
        expected_output=0.0,
        input_amount=1.0,
        tokens=None,
        gas_estimate=0.0,
        confidence_score=0.0,
        timestamp=0,
        dexes=None
    ):
        self.profit_usd = profit_usd
        self.expected_output = expected_output
        self.input_amount = input_amount
        self.tokens = tokens or []
        self.gas_estimate = gas_estimate
        self.confidence_score = confidence_score
        self.timestamp = timestamp
        self.dexes = dexes or []

class ChainType:
    ETHEREUM = "ethereum"
    POLYGON = "polygon"
    # Add other chain types as needed
# --- END STUBS ---
class EnhancedOrchestrator(ApexOrchestrator):
    """
    Enhanced orchestrator that uses both the local ensemble
    and the remote AI engine for predictions
    """
    
    def __init__(self, ai_engine_url: str = "http://localhost:8001"):
        super().__init__()
        self.ai_engine_url = ai_engine_url
        self.ai_engine_available = False
        self.hybrid_predictions = 0
        self.ensemble_only_predictions = 0
    
    async def check_ai_engine(self) -> bool:
        """Check if AI engine is available"""
        try:
            response = requests.get(
                f"{self.ai_engine_url}/health",
                timeout=2
            )
            self.ai_engine_available = response.status_code == 200
            return self.ai_engine_available
        except Exception:
            self.ai_engine_available = False
            return False
    
    def extract_lstm_features(self, opportunity: Opportunity) -> list:
        """
        Extract 8-feature vector for LSTM model
        
        Features:
        1. profit_usd
        2. profit_ratio (expected_output / input_amount)
        3. route_complexity (number of tokens)
        4. gas_millions (gas_estimate / 1,000,000)
        5. confidence_score
        6. time_of_day (normalized)
        7. dex_count
        8. input_amount_thousands (input_amount / 1000)
        """
        import time
        
        features = [
            float(opportunity.profit_usd),
            float(opportunity.expected_output / opportunity.input_amount),
            float(len(opportunity.tokens)),
            float(opportunity.gas_estimate / 1_000_000),
            float(opportunity.confidence_score),
            float((opportunity.timestamp % 86400) / 86400),  # time of day normalized
            float(len(opportunity.dexes)),
            float(opportunity.input_amount / 1000)
        ]
        
        return features
    
    async def get_hybrid_prediction(
        self,
        opportunity: Opportunity
    ) -> Optional[Dict]:
        """
        Get prediction from AI engine
        Returns None if engine unavailable
        """
        if not self.ai_engine_available:
            return None
        
        try:
            features = self.extract_lstm_features(opportunity)
            
            response = requests.post(
                f"{self.ai_engine_url}/predict",
                json={"features": features},
                timeout=1
            )
            
            if response.status_code == 200:
                return response.json()
            
        except Exception as e:
            print(f"⚠️  AI Engine request failed: {e}")
            self.ai_engine_available = False
        
        return None
    
    async def filter_opportunities_enhanced(
        self,
        opportunities: list,
        min_profit: float = 5.0,
        confidence_threshold: float = 0.8
    ) -> list:
        """
        Enhanced filtering using both ensemble and AI engine
        """
        filtered = []
        
        for opp in opportunities:
            # Basic profit filter
            if opp.profit_usd < min_profit:
                continue
            
            # Get local ensemble prediction
            ensemble_score = self.ml_ensemble.predict(opp)
            should_execute_ensemble = ensemble_score > confidence_threshold
            
            # Get AI engine prediction if available
            ai_prediction = None
            if self.ai_engine_available:
                ai_prediction = await self.get_hybrid_prediction(opp)
            
            # Decision logic: hybrid approach
            if ai_prediction:
                # Use hybrid prediction (weighted average)
                ai_confidence = ai_prediction['confidence']
                hybrid_confidence = (
                    0.6 * ensemble_score +
                    0.4 * ai_confidence
                )
                should_execute = hybrid_confidence > confidence_threshold
                
                if should_execute:
                    opp.confidence_score = hybrid_confidence
                    filtered.append(opp)
                    self.hybrid_predictions += 1
            else:
                # Fall back to ensemble only
                if should_execute_ensemble:
                    opp.confidence_score = ensemble_score
                    filtered.append(opp)
                    self.ensemble_only_predictions += 1
        
        # Sort by confidence
        filtered.sort(key=lambda x: x.confidence_score, reverse=True)
        
        return filtered
    
    async def run_enhanced(self):
        """Main execution loop with enhanced AI filtering"""
        print("🚀 Enhanced APEX Orchestrator Starting...")
        self.initialize()
        
        # Check AI engine availability
        ai_available = await self.check_ai_engine()
        if ai_available:
            print("✅ AI Engine connected and ready")
        else:
            print("⚠️  AI Engine unavailable, using ensemble only")
        
        iteration = 0
        
        while True:
            iteration += 1
            
            # Periodically check AI engine status
            if iteration % 10 == 0:
                await self.check_ai_engine()
            
            # Scan opportunities
            opportunities = await self.scan_opportunities()
            
            # Filter with enhanced AI
            filtered = await self.filter_opportunities_enhanced(opportunities)
            
            # Execute top opportunities
            for opp in filtered[:5]:
                try:
                    result = await self.execute_opportunity(opp)
                    print(f"✅ Executed: {opp.route_id} | "
                          f"Profit: ${opp.profit_usd:.2f} | "
                          f"Confidence: {opp.confidence_score:.3f}")
                except Exception as e:
                    print(f"❌ Execution failed: {e}")
            
            # Print stats every 10 iterations
            if iteration % 10 == 0:
                print(f"\n📊 Prediction Stats:")
                print(f"   Hybrid: {self.hybrid_predictions}")
                print(f"   Ensemble Only: {self.ensemble_only_predictions}")
                print(f"   AI Engine Status: "
                      f"{'🟢 Online' if self.ai_engine_available else '🔴 Offline'}\n")
            
            # Wait before next scan
            await asyncio.sleep(1.0)
    
    def get_enhanced_metrics(self) -> Dict:
        """Get metrics including AI engine usage"""
        metrics = super().get_metrics()
        metrics.update({
            "hybrid_predictions": self.hybrid_predictions,
            "ensemble_only_predictions": self.ensemble_only_predictions,
            "ai_engine_available": self.ai_engine_available,
            "hybrid_usage_rate": (
                self.hybrid_predictions / 
                (self.hybrid_predictions + self.ensemble_only_predictions)
                if (self.hybrid_predictions + self.ensemble_only_predictions) > 0
                else 0.0
            )
        })
        return metrics


async def main():
    """
    Main entry point for enhanced orchestrator
    
    Usage:
        1. Start AI engine: python omni_mev_ai_engine.py
        2. Run this integration: python integration_example.py
    """
    print("=" * 70)
    print("APEX Enhanced Orchestrator with Hybrid ML")
    print("=" * 70)
    
    orchestrator = EnhancedOrchestrator()
    
    try:
        await orchestrator.run_enhanced()
    except KeyboardInterrupt:
        print("\n\n🛑 Shutting down gracefully...")
        metrics = orchestrator.get_enhanced_metrics()
        print("\n📊 Final Metrics:")
        for key, value in metrics.items():
            print(f"   {key}: {value}")


if __name__ == "__main__":
    asyncio.run(main())
