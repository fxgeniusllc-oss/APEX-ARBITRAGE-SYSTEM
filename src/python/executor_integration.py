#!/usr/bin/env python3
"""
APEX Executor Integration Module

Integrates the Quad-Lane Executor with:
- ML Ensemble for opportunity scoring
- Orchestrator for opportunity detection
- Multi-chain monitoring
- Real-time metrics and telemetry
"""

import asyncio
import logging
import sys
import os
import time
from typing import Optional, List
from datetime import datetime
import json

from executor_raptor_4x4x4x4 import (
    QuadLaneExecutor, 
    Opportunity, 
    ExecutionMode,
    ChainType
)

try:
    from orchestrator import MLEnsemble, MarketConditionAnalyzer
    from config import get_config
    ML_AVAILABLE = True
except ImportError:
    ML_AVAILABLE = False
    print("⚠️  ML modules not available, running in standalone mode")


logger = logging.getLogger(__name__)


class IntegratedExecutor:
    """
    Integrated executor that combines:
    - Quad-lane parallel execution
    - ML-based opportunity filtering
    - Real-time market analysis
    - Multi-chain coordination
    """
    
    def __init__(self, execution_mode: str = None):
        self.executor = QuadLaneExecutor(execution_mode)
        self.ml_ensemble = None
        self.market_analyzer = None
        
        # Initialize ML components if available
        if ML_AVAILABLE:
            try:
                self.ml_ensemble = MLEnsemble()
                self.market_analyzer = MarketConditionAnalyzer()
                logger.info("✅ ML ensemble initialized")
            except Exception as e:
                logger.warning(f"⚠️  Could not initialize ML ensemble: {e}")
        
        # Opportunity filter settings
        self.min_ml_score = float(os.getenv('MIN_ML_SCORE', '0.85'))
        self.use_ml_filtering = os.getenv('USE_ML_FILTERING', 'true').lower() == 'true'
        
        # Statistics
        self.opportunities_received = 0
        self.opportunities_filtered = 0
        self.opportunities_submitted = 0
        
    async def process_opportunity(self, opportunity: Opportunity) -> bool:
        """
        Process an opportunity through ML filtering and submit to executor
        
        Returns:
            bool: True if opportunity was submitted to executor, False if filtered
        """
        self.opportunities_received += 1
        
        # Apply ML filtering if enabled
        if self.use_ml_filtering and self.ml_ensemble:
            try:
                ml_score = self.ml_ensemble.predict(opportunity)
                
                logger.info(
                    f"📊 ML Score: {ml_score:.2%} for {opportunity.route_id} "
                    f"(threshold: {self.min_ml_score:.2%})"
                )
                
                if ml_score < self.min_ml_score:
                    logger.info(f"🚫 Filtered: ML score too low ({ml_score:.2%})")
                    self.opportunities_filtered += 1
                    return False
                
                # Update opportunity with ML score
                opportunity.confidence_score = ml_score
                
            except Exception as e:
                logger.error(f"Error in ML filtering: {e}")
                # Continue without ML filtering on error
        
        # Submit to executor
        await self.executor.submit_opportunity(opportunity)
        self.opportunities_submitted += 1
        
        logger.info(
            f"✅ Submitted {opportunity.route_id} to executor "
            f"(lane will be auto-selected)"
        )
        
        return True
    
    async def start(self):
        """Start the integrated executor"""
        logger.info(
            f"\n{'='*80}\n"
            f"🚀 STARTING INTEGRATED EXECUTOR\n"
            f"{'='*80}\n"
            f"ML Filtering: {self.use_ml_filtering}\n"
            f"ML Available: {ML_AVAILABLE}\n"
            f"Min ML Score: {self.min_ml_score:.2%}\n"
            f"{'='*80}\n"
        )
        
        return await self.executor.start()
    
    async def stop(self):
        """Stop the integrated executor"""
        logger.info("Stopping integrated executor...")
        
        # Print filtering statistics
        print(f"\n{'='*80}")
        print("📊 FILTERING STATISTICS")
        print(f"{'='*80}")
        print(f"Total Opportunities Received: {self.opportunities_received}")
        print(f"Filtered by ML: {self.opportunities_filtered}")
        print(f"Submitted to Executor: {self.opportunities_submitted}")
        if self.opportunities_received > 0:
            filter_rate = self.opportunities_filtered / self.opportunities_received * 100
            print(f"Filter Rate: {filter_rate:.2f}%")
        print(f"{'='*80}\n")
        
        await self.executor.stop()
    
    async def health_check(self):
        """Perform comprehensive health check"""
        health = await self.executor.health_check()
        health['ml_available'] = ML_AVAILABLE
        health['ml_filtering_enabled'] = self.use_ml_filtering
        health['opportunities_received'] = self.opportunities_received
        health['opportunities_filtered'] = self.opportunities_filtered
        health['opportunities_submitted'] = self.opportunities_submitted
        return health
    
    def get_metrics(self):
        """Get comprehensive metrics"""
        executor_metrics = self.executor.get_overall_metrics()
        
        return {
            **executor_metrics,
            'filtering': {
                'ml_enabled': self.use_ml_filtering,
                'opportunities_received': self.opportunities_received,
                'opportunities_filtered': self.opportunities_filtered,
                'opportunities_submitted': self.opportunities_submitted,
                'filter_rate': f"{(self.opportunities_filtered / self.opportunities_received * 100):.2f}%" if self.opportunities_received > 0 else "0.00%"
            }
        }


async def run_integrated_demo():
    """Demo function for integrated executor"""
    
    print("\n🎮 INTEGRATED EXECUTOR DEMO\n")
    
    # Create integrated executor
    integrated = IntegratedExecutor(execution_mode='DEV')
    
    # Start executor
    tasks = await integrated.start()
    
    # Simulate opportunities with varying quality
    print("\n📤 Submitting opportunities with varying ML scores...\n")
    
    for i in range(30):
        # Create opportunity with varying quality
        confidence = 0.75 + (i % 20) * 0.01  # Range from 0.75 to 0.94
        profit = 3.0 + i * 0.3
        
        opportunity = Opportunity(
            route_id=f"integrated_test_{i}",
            tokens=["USDC", "WMATIC", "WETH", "USDC"] if i % 3 == 0 else ["USDC", "USDT", "USDC"],
            dexes=["quickswap", "uniswapv3", "sushiswap"] if i % 3 == 0 else ["quickswap", "sushiswap"],
            input_amount=1000.0 + i * 100,
            expected_output=1010.0 + profit,
            gas_estimate=250000 + i * 10000,
            profit_usd=profit,
            confidence_score=confidence,
            timestamp=int(time.time()),
            chain="polygon"
        )
        
        # Process through integrated system
        submitted = await integrated.process_opportunity(opportunity)
        
        if submitted:
            print(f"  ✅ Opportunity {i} submitted (confidence: {confidence:.2%})")
        else:
            print(f"  🚫 Opportunity {i} filtered (confidence: {confidence:.2%})")
        
        await asyncio.sleep(0.05)
    
    print("\n⏳ Processing opportunities...\n")
    await asyncio.sleep(3)
    
    # Get comprehensive metrics
    metrics = integrated.get_metrics()
    print(f"\n📊 INTEGRATED METRICS:\n{json.dumps(metrics, indent=2)}\n")
    
    # Health check
    health = await integrated.health_check()
    print(f"\n💚 HEALTH STATUS:\n{json.dumps(health, indent=2)}\n")
    
    # Stop
    await integrated.stop()
    
    # Cancel worker tasks
    for task in tasks:
        task.cancel()


if __name__ == "__main__":
    asyncio.run(run_integrated_demo())
