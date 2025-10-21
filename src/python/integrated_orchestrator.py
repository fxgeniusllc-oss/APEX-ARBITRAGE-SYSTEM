"""
Integrated APEX Orchestrator
Combines all advanced features: MODE control, flashloans, BloXroute, 
Merkle trees, TVL monitoring, pool registry, and DeFi analytics
"""

import asyncio
import os
from typing import Dict, List, Optional
from datetime import datetime
from orchestrator import ApexOrchestrator, ExecutionMode, Opportunity, ChainType
from tvl_orchestrator import TVLOrchestrator
from pool_registry import get_pool_registry, PoolInfo
from defi_analytics import get_defi_analytics


class IntegratedApexSystem:
    """
    Fully integrated APEX arbitrage system
    Orchestrates all components with MODE-aware execution
    """
    
    def __init__(self, mode: ExecutionMode = None):
        # Get mode from environment
        mode_str = os.getenv('MODE', 'DEV').upper()
        self.mode = mode if mode else ExecutionMode[mode_str]
        
        # Initialize all components
        self.apex_orchestrator = ApexOrchestrator(self.mode)
        self.tvl_orchestrator = TVLOrchestrator()
        self.pool_registry = get_pool_registry()
        self.defi_analytics = get_defi_analytics()
        
        # Configuration
        self.config = {
            'min_profit_usd': float(os.getenv('MIN_PROFIT_USD', '5')),
            'max_gas_price_gwei': float(os.getenv('MAX_GAS_PRICE_GWEI', '100')),
            'min_tvl': float(os.getenv('MIN_POOL_TVL', '100000')),
            'min_success_probability': float(os.getenv('MIN_SUCCESS_PROBABILITY', '0.75')),
            'max_risk_score': float(os.getenv('MAX_RISK_SCORE', '0.6')),
            'use_bloxroute': os.getenv('ENABLE_BLOXROUTE', 'false').lower() == 'true',
            'use_merkle_batching': os.getenv('ENABLE_BATCH_PROCESSING', 'false').lower() == 'true'
        }
        
        # Statistics
        self.stats = {
            'opportunities_analyzed': 0,
            'opportunities_executed': 0,
            'opportunities_simulated': 0,
            'total_profit': 0.0,
            'simulated_profit': 0.0,
            'avg_ml_score': 0.0,
            'pools_monitored': 0,
            'routes_discovered': 0
        }
        
        self._print_startup_info()
    
    def _print_startup_info(self):
        """Print system startup information"""
        print("\n" + "="*80)
        print("🚀 INTEGRATED APEX ARBITRAGE SYSTEM")
        print("="*80)
        print(f"Mode: {self.mode.value}")
        print(f"Min Profit: ${self.config['min_profit_usd']}")
        print(f"Max Gas Price: {self.config['max_gas_price_gwei']} Gwei")
        print(f"Min TVL: ${self.config['min_tvl']:,.0f}")
        print(f"BloXroute: {'✅ Enabled' if self.config['use_bloxroute'] else '❌ Disabled'}")
        print(f"Merkle Batching: {'✅ Enabled' if self.config['use_merkle_batching'] else '❌ Disabled'}")
        print("="*80)
        
        if self.mode != ExecutionMode.LIVE:
            print("⚠️  RUNNING IN SAFE MODE - No real transactions will be executed")
        else:
            print("🔴 LIVE MODE - Real transactions will be executed")
        print("="*80 + "\n")
    
    async def discover_and_register_pools(self, chains: List[str] = None):
        """
        Discover pools across chains and register them
        """
        chains = chains or ['polygon', 'ethereum', 'arbitrum']
        
        print(f"🔍 Discovering pools on {len(chains)} chains...")
        
        # Example pools to monitor (in production, this would auto-discover)
        important_pools = [
            {
                'address': '0x45dda9cb7c25131df268515131f647d726f50608',
                'dex': 'uniswap_v3',
                'chain': 'polygon'
            },
            {
                'address': '0x853ee4b2a13f8a742d64c8f088be7ba2131f670d',
                'dex': 'quickswap',
                'chain': 'polygon'
            }
        ]
        
        # Fetch TVL for pools in parallel
        pool_tvls = await self.tvl_orchestrator.parallel_fetch_pools(important_pools)
        
        # Register pools with full information
        for pool_tvl in pool_tvls:
            pool_info = PoolInfo(
                address=pool_tvl.pool_address,
                dex=pool_tvl.dex,
                chain=pool_tvl.chain,
                token0=pool_tvl.token0,
                token0_address='',  # Would be fetched from contract
                token1=pool_tvl.token1,
                token1_address='',
                fee_tier=pool_tvl.fee_tier,
                pool_type='v3',
                created_at=pool_tvl.timestamp,
                tvl_usd=pool_tvl.tvl_usd,
                volume_24h=pool_tvl.volume_24h
            )
            self.pool_registry.add_pool(pool_info)
        
        self.stats['pools_monitored'] = len(pool_tvls)
        
        print(f"✅ Registered {len(pool_tvls)} pools")
        self.pool_registry.print_stats()
    
    async def find_arbitrage_opportunities(self, chain: str = 'polygon') -> List[Dict]:
        """
        Find arbitrage opportunities using pool registry
        """
        print(f"\n🔎 Scanning for arbitrage opportunities on {chain}...")
        
        # Define tokens to check
        important_tokens = [
            '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',  # USDC on Polygon
            '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',  # WMATIC on Polygon
        ]
        
        opportunities = []
        
        for token in important_tokens:
            # Find routes using pool registry
            routes = self.pool_registry.find_arbitrage_routes(
                token,
                chain,
                max_hops=3,
                min_tvl=self.config['min_tvl']
            )
            
            self.stats['routes_discovered'] += len(routes)
            
            # Convert routes to opportunities
            for route in routes:
                opportunity = self._create_opportunity_from_route(route, token, chain)
                if opportunity:
                    opportunities.append(opportunity)
        
        print(f"✅ Found {len(opportunities)} potential opportunities")
        return opportunities
    
    def _create_opportunity_from_route(
        self,
        route: List[PoolInfo],
        start_token: str,
        chain: str
    ) -> Optional[Dict]:
        """
        Create opportunity dictionary from pool route
        """
        if not route:
            return None
        
        # Extract token path
        tokens = [start_token]
        dexes = []
        total_fees = 0
        
        for pool in route:
            dexes.append(pool.dex)
            total_fees += pool.fee_tier
            
            # Determine next token in path
            next_token = (
                pool.token1_address if pool.token0_address == tokens[-1]
                else pool.token0_address
            )
            if next_token:
                tokens.append(next_token)
        
        # Calculate estimated profit (simplified)
        # In production, this would simulate actual swap amounts
        estimated_profit = 10.0  # Placeholder
        
        return {
            'route_id': f"{chain}_{len(route)}hop_{'_'.join(dexes)}",
            'chain': chain,
            'tokens': tokens,
            'dexes': dexes,
            'input_amount': 1000.0,
            'expected_output': 1010.0,
            'profit_usd': estimated_profit,
            'gas_estimate': 350000 * len(route),
            'confidence_score': 0.85,
            'timestamp': int(datetime.now().timestamp()),
            'tvl_usd': min(p.tvl_usd for p in route),
            'volume_24h': sum(p.volume_24h for p in route),
            'fees': [p.fee_tier for p in route],
            'gas_price': 50.0,  # Would fetch actual gas price
            'historical_success_rate': 0.75,
            'avg_profit_24h': estimated_profit * 0.8,
            'executions_24h': 5
        }
    
    async def analyze_opportunity(self, opportunity: Dict) -> Dict:
        """
        Analyze opportunity using DeFi analytics ML
        """
        self.stats['opportunities_analyzed'] += 1
        
        # Get ML analysis
        analysis = self.defi_analytics.score_opportunity(opportunity)
        
        # Update running average of ML scores
        n = self.stats['opportunities_analyzed']
        self.stats['avg_ml_score'] = (
            (self.stats['avg_ml_score'] * (n - 1) + analysis['overall_score']) / n
        )
        
        return analysis
    
    async def execute_opportunity(self, opportunity: Dict, analysis: Dict) -> Dict:
        """
        Execute or simulate opportunity based on mode and analysis
        """
        # Check if opportunity passes filters
        if not self._passes_filters(opportunity, analysis):
            return {
                'status': 'filtered',
                'reason': 'Did not pass risk/profit filters'
            }
        
        # Create Opportunity object for orchestrator
        opp = Opportunity(
            route_id=opportunity['route_id'],
            tokens=opportunity['tokens'],
            dexes=opportunity['dexes'],
            input_amount=opportunity['input_amount'],
            expected_output=opportunity['expected_output'],
            gas_estimate=opportunity['gas_estimate'],
            profit_usd=opportunity['profit_usd'],
            confidence_score=opportunity['confidence_score'],
            timestamp=opportunity['timestamp'],
            chain=ChainType[opportunity['chain'].upper()]
        )
        
        # Execute through orchestrator (mode-aware)
        result = await self.apex_orchestrator.execute_opportunity(opp)
        
        # Update statistics
        if result.get('simulated'):
            self.stats['opportunities_simulated'] += 1
            self.stats['simulated_profit'] += opportunity['profit_usd']
        else:
            self.stats['opportunities_executed'] += 1
            self.stats['total_profit'] += opportunity['profit_usd']
        
        # Update ML model performance
        actual_result = {
            'succeeded': result['status'] == 'success',
            'actual_profit': opportunity['profit_usd'] if result['status'] == 'success' else 0
        }
        self.defi_analytics.update_performance_metrics(analysis, actual_result)
        
        return result
    
    def _passes_filters(self, opportunity: Dict, analysis: Dict) -> bool:
        """Check if opportunity passes all filters"""
        filters = {
            'min_profit': opportunity['profit_usd'] >= self.config['min_profit_usd'],
            'max_gas': opportunity.get('gas_price', 0) <= self.config['max_gas_price_gwei'],
            'min_success_prob': analysis['success_probability'] >= self.config['min_success_probability'],
            'max_risk': analysis['risk_score'] <= self.config['max_risk_score'],
            'min_tvl': opportunity.get('tvl_usd', 0) >= self.config['min_tvl']
        }
        
        passed = all(filters.values())
        
        if not passed:
            failed_filters = [k for k, v in filters.items() if not v]
            print(f"❌ Opportunity filtered out: {', '.join(failed_filters)}")
        
        return passed
    
    async def run_cycle(self):
        """
        Run one complete cycle:
        1. Discover/refresh pools
        2. Find opportunities
        3. Analyze with ML
        4. Execute best opportunities
        """
        print("\n" + "="*80)
        print(f"🔄 STARTING NEW CYCLE - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("="*80)
        
        try:
            # Step 1: Discover and register pools
            await self.discover_and_register_pools()
            
            # Step 2: Find arbitrage opportunities
            opportunities = await self.find_arbitrage_opportunities()
            
            if not opportunities:
                print("ℹ️  No opportunities found this cycle")
                return
            
            # Step 3: Analyze each opportunity
            analyzed_opportunities = []
            for opp in opportunities:
                analysis = await self.analyze_opportunity(opp)
                analyzed_opportunities.append((opp, analysis))
                
                print(f"\n📊 Opportunity: {opp['route_id']}")
                print(f"   Profit: ${opp['profit_usd']:.2f}")
                print(f"   ML Score: {analysis['overall_score']:.1f}/100")
                print(f"   Success Prob: {analysis['success_probability']:.2%}")
                print(f"   Risk Score: {analysis['risk_score']:.2f}")
                print(f"   Recommendation: {analysis['recommendation']}")
            
            # Step 4: Sort by ML score and execute top opportunities
            analyzed_opportunities.sort(
                key=lambda x: x[1]['overall_score'],
                reverse=True
            )
            
            # Execute top 3 opportunities
            for opp, analysis in analyzed_opportunities[:3]:
                result = await self.execute_opportunity(opp, analysis)
                
                if result['status'] == 'success':
                    mode_text = "SIMULATED" if result.get('simulated') else "EXECUTED"
                    print(f"✅ {mode_text}: {opp['route_id']}")
                    print(f"   Profit: ${opp['profit_usd']:.2f}")
                elif result['status'] == 'filtered':
                    print(f"⏭️  SKIPPED: {opp['route_id']} - {result['reason']}")
                else:
                    print(f"❌ FAILED: {opp['route_id']}")
        
        except Exception as e:
            print(f"❌ Error in cycle: {e}")
            import traceback
            traceback.print_exc()
    
    async def run(self, cycles: Optional[int] = None, interval: int = 60):
        """
        Main execution loop
        
        Args:
            cycles: Number of cycles to run (None for infinite)
            interval: Seconds between cycles
        """
        print("🚀 Starting Integrated APEX System...")
        
        # Initialize components
        self.apex_orchestrator.initialize()
        
        cycle_count = 0
        
        try:
            while cycles is None or cycle_count < cycles:
                await self.run_cycle()
                
                # Print statistics
                self.print_stats()
                
                cycle_count += 1
                
                if cycles is None or cycle_count < cycles:
                    print(f"\n⏳ Waiting {interval}s until next cycle...")
                    await asyncio.sleep(interval)
        
        except KeyboardInterrupt:
            print("\n\n⚠️  Shutdown requested by user")
        
        finally:
            print("\n" + "="*80)
            print("FINAL STATISTICS")
            print("="*80)
            self.print_stats()
            self.defi_analytics.print_performance_report()
            print("\n👋 APEX System shutting down...")
    
    def print_stats(self):
        """Print system statistics"""
        print("\n" + "="*80)
        print("INTEGRATED APEX SYSTEM STATISTICS")
        print("="*80)
        print(f"Mode: {self.mode.value}")
        print(f"Opportunities Analyzed: {self.stats['opportunities_analyzed']}")
        
        if self.mode == ExecutionMode.LIVE:
            print(f"Real Executions: {self.stats['opportunities_executed']}")
            print(f"Total Profit: ${self.stats['total_profit']:.2f}")
        else:
            print(f"Simulated Executions: {self.stats['opportunities_simulated']}")
            print(f"Simulated Profit: ${self.stats['simulated_profit']:.2f}")
            print(f"(No real funds at risk in {self.mode.value} mode)")
        
        print(f"Avg ML Score: {self.stats['avg_ml_score']:.1f}/100")
        print(f"Pools Monitored: {self.stats['pools_monitored']}")
        print(f"Routes Discovered: {self.stats['routes_discovered']}")
        print("="*80 + "\n")


async def main():
    """Main entry point"""
    # Create integrated system
    system = IntegratedApexSystem()
    
    # Run for specified cycles or continuously
    cycles = int(os.getenv('MAX_CYCLES', '0')) or None  # 0 = infinite
    interval = int(os.getenv('SCAN_INTERVAL', '60'))
    
    await system.run(cycles=cycles, interval=interval)


if __name__ == "__main__":
    asyncio.run(main())
