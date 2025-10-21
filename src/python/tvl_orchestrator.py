"""
TVL Hyperspeed Orchestrator
Ultra-fast TVL (Total Value Locked) fetching and monitoring
Based on orchestrator_tvl_hyperspeed principles
"""

import asyncio
import aiohttp
from typing import Dict, List, Optional
from dataclasses import dataclass
from datetime import datetime
import numpy as np


@dataclass
class PoolTVL:
    """Pool TVL data structure"""
    pool_address: str
    dex: str
    chain: str
    token0: str
    token1: str
    tvl_usd: float
    reserve0: float
    reserve1: float
    fee_tier: float
    volume_24h: float
    timestamp: int


class TVLOrchestrator:
    """
    Hyperspeed TVL orchestrator for multi-chain, multi-DEX TVL monitoring
    Optimized for <10ms response time per pool
    """
    
    def __init__(self, chains: List[str] = None):
        self.chains = chains or ['polygon', 'ethereum', 'arbitrum', 'optimism', 'base', 'bsc']
        self.tvl_cache = {}
        self.pool_cache = {}
        self.last_update = {}
        
        # DEX endpoints for TVL data
        self.dex_endpoints = {
            'uniswap_v3': {
                'polygon': 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3-polygon',
                'ethereum': 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3',
                'arbitrum': 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3-arbitrum',
                'optimism': 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3-optimism',
                'base': 'https://api.studio.thegraph.com/query/48211/uniswap-v3-base/version/latest'
            },
            'quickswap': {
                'polygon': 'https://api.thegraph.com/subgraphs/name/sameepsi/quickswap-v3'
            },
            'sushiswap': {
                'polygon': 'https://api.thegraph.com/subgraphs/name/sushi-v2/sushiswap-polygon',
                'ethereum': 'https://api.thegraph.com/subgraphs/name/sushi-v2/sushiswap-ethereum',
                'arbitrum': 'https://api.thegraph.com/subgraphs/name/sushi-v2/sushiswap-arbitrum',
                'bsc': 'https://api.thegraph.com/subgraphs/name/sushi-v2/sushiswap-bsc'
            },
            'curve': {
                'polygon': 'https://api.curve.fi/api/getPools/polygon',
                'ethereum': 'https://api.curve.fi/api/getPools/ethereum',
                'arbitrum': 'https://api.curve.fi/api/getPools/arbitrum',
                'optimism': 'https://api.curve.fi/api/getPools/optimism'
            },
            'balancer': {
                'polygon': 'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-polygon-v2',
                'ethereum': 'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-v2',
                'arbitrum': 'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-arbitrum-v2'
            }
        }
        
        self.stats = {
            'total_fetches': 0,
            'cache_hits': 0,
            'avg_fetch_time_ms': 0,
            'pools_monitored': 0
        }
    
    async def fetch_pool_tvl(
        self, 
        pool_address: str, 
        dex: str, 
        chain: str,
        force_refresh: bool = False
    ) -> Optional[PoolTVL]:
        """
        Fetch TVL for a specific pool with caching
        Target: <10ms response time with cache
        """
        import time
        start = time.time()
        
        # Check cache first (unless force refresh)
        cache_key = f"{chain}:{dex}:{pool_address}"
        if not force_refresh and cache_key in self.tvl_cache:
            age = time.time() - self.last_update.get(cache_key, 0)
            if age < 60:  # Cache valid for 60 seconds
                self.stats['cache_hits'] += 1
                return self.tvl_cache[cache_key]
        
        # Fetch from source
        try:
            tvl_data = await self._fetch_from_source(pool_address, dex, chain)
            
            if tvl_data:
                # Update cache
                self.tvl_cache[cache_key] = tvl_data
                self.last_update[cache_key] = time.time()
                
                # Update stats
                self.stats['total_fetches'] += 1
                fetch_time = (time.time() - start) * 1000
                self.stats['avg_fetch_time_ms'] = (
                    (self.stats['avg_fetch_time_ms'] * (self.stats['total_fetches'] - 1) + fetch_time) /
                    self.stats['total_fetches']
                )
                
                return tvl_data
        
        except Exception as e:
            print(f"Error fetching TVL for {cache_key}: {e}")
            return None
    
    async def _fetch_from_source(
        self, 
        pool_address: str, 
        dex: str, 
        chain: str
    ) -> Optional[PoolTVL]:
        """Fetch TVL data from DEX-specific source"""
        
        if dex not in self.dex_endpoints or chain not in self.dex_endpoints[dex]:
            return None
        
        endpoint = self.dex_endpoints[dex][chain]
        
        # GraphQL query for most DEXes
        if 'thegraph.com' in endpoint or 'studio.thegraph' in endpoint:
            return await self._fetch_from_subgraph(endpoint, pool_address, dex, chain)
        
        # Curve API
        elif 'curve.fi' in endpoint:
            return await self._fetch_from_curve(endpoint, pool_address, chain)
        
        return None
    
    async def _fetch_from_subgraph(
        self,
        endpoint: str,
        pool_address: str,
        dex: str,
        chain: str
    ) -> Optional[PoolTVL]:
        """Fetch from TheGraph subgraph"""
        
        query = """
        query($pool: String!) {
            pool(id: $pool) {
                id
                token0 { symbol }
                token1 { symbol }
                totalValueLockedUSD
                volumeUSD
                feeTier
                reserve0: token0Price
                reserve1: token1Price
            }
        }
        """
        
        async with aiohttp.ClientSession() as session:
            try:
                async with session.post(
                    endpoint,
                    json={'query': query, 'variables': {'pool': pool_address.lower()}},
                    timeout=aiohttp.ClientTimeout(total=5)
                ) as response:
                    data = await response.json()
                    
                    if 'data' in data and data['data']['pool']:
                        pool = data['data']['pool']
                        return PoolTVL(
                            pool_address=pool_address,
                            dex=dex,
                            chain=chain,
                            token0=pool.get('token0', {}).get('symbol', 'UNKNOWN'),
                            token1=pool.get('token1', {}).get('symbol', 'UNKNOWN'),
                            tvl_usd=float(pool.get('totalValueLockedUSD', 0)),
                            reserve0=float(pool.get('reserve0', 0)),
                            reserve1=float(pool.get('reserve1', 0)),
                            fee_tier=float(pool.get('feeTier', 3000)) / 1e6,
                            volume_24h=float(pool.get('volumeUSD', 0)),
                            timestamp=int(datetime.now().timestamp())
                        )
            except Exception as e:
                print(f"Subgraph fetch error: {e}")
                return None
    
    async def _fetch_from_curve(
        self,
        endpoint: str,
        pool_address: str,
        chain: str
    ) -> Optional[PoolTVL]:
        """Fetch from Curve Finance API"""
        
        async with aiohttp.ClientSession() as session:
            try:
                async with session.get(
                    endpoint,
                    timeout=aiohttp.ClientTimeout(total=5)
                ) as response:
                    data = await response.json()
                    
                    # Find pool in response
                    pools = data.get('data', {}).get('poolData', [])
                    for pool in pools:
                        if pool.get('address', '').lower() == pool_address.lower():
                            return PoolTVL(
                                pool_address=pool_address,
                                dex='curve',
                                chain=chain,
                                token0=pool.get('coins', [{}])[0].get('symbol', 'UNKNOWN'),
                                token1=pool.get('coins', [{}])[1].get('symbol', 'UNKNOWN'),
                                tvl_usd=float(pool.get('usdTotal', 0)),
                                reserve0=float(pool.get('coins', [{}])[0].get('poolBalance', 0)),
                                reserve1=float(pool.get('coins', [{}])[1].get('poolBalance', 0)),
                                fee_tier=float(pool.get('fee', 0)) / 1e10,
                                volume_24h=float(pool.get('volume', 0)),
                                timestamp=int(datetime.now().timestamp())
                            )
            except Exception as e:
                print(f"Curve fetch error: {e}")
                return None
    
    async def fetch_top_pools_by_tvl(
        self,
        chain: str,
        dex: str,
        min_tvl: float = 100000,
        limit: int = 50
    ) -> List[PoolTVL]:
        """
        Fetch top pools by TVL for a specific chain and DEX
        Optimized for parallel fetching
        """
        
        # This would typically query all pools and sort by TVL
        # For now, returning cached pools
        pools = [
            pool for key, pool in self.tvl_cache.items()
            if pool.chain == chain and pool.dex == dex and pool.tvl_usd >= min_tvl
        ]
        
        # Sort by TVL descending
        pools.sort(key=lambda p: p.tvl_usd, reverse=True)
        
        return pools[:limit]
    
    async def parallel_fetch_pools(
        self,
        pools: List[Dict],
        max_concurrent: int = 50
    ) -> List[PoolTVL]:
        """
        Fetch TVL for multiple pools in parallel
        Ultra-fast with rate limiting
        """
        
        semaphore = asyncio.Semaphore(max_concurrent)
        
        async def fetch_with_semaphore(pool_info):
            async with semaphore:
                return await self.fetch_pool_tvl(
                    pool_info['address'],
                    pool_info['dex'],
                    pool_info['chain']
                )
        
        tasks = [fetch_with_semaphore(pool) for pool in pools]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Filter out errors and None values
        return [r for r in results if isinstance(r, PoolTVL)]
    
    async def monitor_tvl_changes(
        self,
        pools: List[Dict],
        threshold_percent: float = 5.0,
        interval: int = 60
    ):
        """
        Monitor TVL changes and alert on significant movements
        """
        
        print(f"🔍 Starting TVL monitoring for {len(pools)} pools")
        print(f"   Alert threshold: {threshold_percent}%")
        print(f"   Check interval: {interval}s")
        
        baseline_tvls = {}
        
        while True:
            current_tvls = await self.parallel_fetch_pools(pools)
            
            for pool_tvl in current_tvls:
                key = f"{pool_tvl.chain}:{pool_tvl.dex}:{pool_tvl.pool_address}"
                
                if key in baseline_tvls:
                    baseline = baseline_tvls[key]
                    change_percent = ((pool_tvl.tvl_usd - baseline) / baseline) * 100
                    
                    if abs(change_percent) >= threshold_percent:
                        print(f"🚨 SIGNIFICANT TVL CHANGE DETECTED:")
                        print(f"   Pool: {pool_tvl.pool_address[:8]}...")
                        print(f"   {pool_tvl.token0}/{pool_tvl.token1} on {pool_tvl.dex}")
                        print(f"   Change: {change_percent:+.2f}%")
                        print(f"   New TVL: ${pool_tvl.tvl_usd:,.2f}")
                else:
                    baseline_tvls[key] = pool_tvl.tvl_usd
            
            await asyncio.sleep(interval)
    
    def get_stats(self) -> Dict:
        """Get orchestrator statistics"""
        return {
            **self.stats,
            'cache_hit_rate': (
                self.stats['cache_hits'] / self.stats['total_fetches'] * 100
                if self.stats['total_fetches'] > 0 else 0
            ),
            'pools_cached': len(self.tvl_cache)
        }
    
    def print_stats(self):
        """Print statistics"""
        stats = self.get_stats()
        print("\n" + "="*60)
        print("TVL ORCHESTRATOR STATISTICS")
        print("="*60)
        print(f"Total Fetches: {stats['total_fetches']}")
        print(f"Cache Hits: {stats['cache_hits']}")
        print(f"Cache Hit Rate: {stats['cache_hit_rate']:.2f}%")
        print(f"Avg Fetch Time: {stats['avg_fetch_time_ms']:.2f}ms")
        print(f"Pools Cached: {stats['pools_cached']}")
        print(f"Pools Monitored: {stats['pools_monitored']}")
        print("="*60 + "\n")


async def main():
    """Example usage"""
    orchestrator = TVLOrchestrator()
    
    # Example: Fetch TVL for a specific pool
    pool_tvl = await orchestrator.fetch_pool_tvl(
        pool_address='0x45dda9cb7c25131df268515131f647d726f50608',
        dex='uniswap_v3',
        chain='polygon'
    )
    
    if pool_tvl:
        print(f"Pool: {pool_tvl.token0}/{pool_tvl.token1}")
        print(f"TVL: ${pool_tvl.tvl_usd:,.2f}")
        print(f"Volume 24h: ${pool_tvl.volume_24h:,.2f}")
    
    orchestrator.print_stats()


if __name__ == "__main__":
    asyncio.run(main())
