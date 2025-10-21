"""
Balancer V2 TVL Fetcher
Fetches Total Value Locked (TVL) data for Balancer V2 pools
Supports weighted pools, stable pools, and composable stable pools
"""

import asyncio
import aiohttp
import json
from typing import List, Dict, Optional
from dataclasses import dataclass, field
from datetime import datetime
import os


@dataclass
class BalancerPool:
    """Represents a Balancer V2 pool with TVL data"""
    id: str
    address: str
    pool_type: str
    tokens: List[str]
    token_symbols: List[str]
    token_balances: List[str]
    token_weights: List[float]
    swap_fee: float
    tvl_usd: float
    volume_24h_usd: float
    fee_apr: float
    total_liquidity: str
    total_shares: str
    chain: str
    timestamp: int


# The Graph API endpoints for Balancer V2
GRAPH_ENDPOINTS = {
    'polygon': 'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-polygon-v2',
    'ethereum': 'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-v2',
    'arbitrum': 'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-arbitrum-v2',
    'optimism': 'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-optimism-v2'
}

# Balancer pool types
POOL_TYPES = {
    'Weighted': 'WeightedPool',
    'Stable': 'StablePool',
    'MetaStable': 'MetaStablePool',
    'ComposableStable': 'ComposableStablePool',
    'LiquidityBootstrapping': 'LiquidityBootstrappingPool'
}


class BalancerTVLFetcher:
    """Fetches TVL data from Balancer V2 pools across multiple chains"""
    
    def __init__(self, min_tvl_usd: float = 10000):
        """
        Initialize the TVL fetcher
        
        Args:
            min_tvl_usd: Minimum TVL threshold to filter pools
        """
        self.min_tvl_usd = min_tvl_usd
        self.session: Optional[aiohttp.ClientSession] = None
        self.pools_cache: Dict[str, List[BalancerPool]] = {}
        
    async def __aenter__(self):
        """Async context manager entry"""
        self.session = aiohttp.ClientSession()
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        if self.session:
            await self.session.close()
    
    async def fetch_pools_from_graph(
        self, 
        chain: str, 
        limit: int = 100,
        skip: int = 0,
        pool_type: Optional[str] = None
    ) -> List[BalancerPool]:
        """
        Fetch pools from The Graph subgraph
        
        Args:
            chain: Chain name (polygon, ethereum, arbitrum, optimism)
            limit: Maximum number of pools to fetch
            skip: Number of pools to skip (for pagination)
            pool_type: Filter by pool type (None = all types)
            
        Returns:
            List of BalancerPool objects
        """
        if chain not in GRAPH_ENDPOINTS:
            print(f"Warning: Chain {chain} not supported")
            return []
        
        endpoint = GRAPH_ENDPOINTS[chain]
        
        # Build pool type filter
        pool_type_filter = ""
        if pool_type and pool_type in POOL_TYPES.values():
            pool_type_filter = f', poolType: "{pool_type}"'
        
        # GraphQL query to fetch pool data
        query = """
        query ($first: Int!, $skip: Int!, $minTvl: BigDecimal!) {
          pools(
            first: $first,
            skip: $skip,
            orderBy: totalLiquidity,
            orderDirection: desc,
            where: { totalLiquidity_gt: $minTvl%s }
          ) {
            id
            address
            poolType
            swapFee
            totalLiquidity
            totalShares
            totalSwapVolume
            totalSwapFee
            tokens {
              address
              symbol
              balance
              weight
              decimals
            }
          }
        }
        """ % pool_type_filter
        
        variables = {
            'first': limit,
            'skip': skip,
            'minTvl': str(self.min_tvl_usd)
        }
        
        try:
            if not self.session:
                self.session = aiohttp.ClientSession()
                
            async with self.session.post(
                endpoint,
                json={'query': query, 'variables': variables},
                headers={'Content-Type': 'application/json'}
            ) as response:
                if response.status != 200:
                    print(f"Error: Graph API returned status {response.status}")
                    return []
                
                data = await response.json()
                
                if 'errors' in data:
                    print(f"GraphQL errors: {data['errors']}")
                    return []
                
                pools_data = data.get('data', {}).get('pools', [])
                pools = []
                
                for pool_data in pools_data:
                    try:
                        tokens = pool_data.get('tokens', [])
                        
                        # Extract token information
                        token_addresses = [t['address'] for t in tokens]
                        token_symbols = [t['symbol'] for t in tokens]
                        token_balances = [t['balance'] for t in tokens]
                        token_weights = [float(t.get('weight', 0)) if t.get('weight') else 0 for t in tokens]
                        
                        # Calculate TVL (simplified - would need price feeds for accurate calculation)
                        tvl_usd = float(pool_data.get('totalLiquidity', 0))
                        volume_usd = float(pool_data.get('totalSwapVolume', 0))
                        fees_usd = float(pool_data.get('totalSwapFee', 0))
                        
                        # Calculate APR based on fees
                        fee_apr = (fees_usd / tvl_usd * 365 * 100) if tvl_usd > 0 else 0
                        
                        pool = BalancerPool(
                            id=pool_data['id'],
                            address=pool_data['address'],
                            pool_type=pool_data.get('poolType', 'Unknown'),
                            tokens=token_addresses,
                            token_symbols=token_symbols,
                            token_balances=token_balances,
                            token_weights=token_weights,
                            swap_fee=float(pool_data.get('swapFee', 0)),
                            tvl_usd=tvl_usd,
                            volume_24h_usd=volume_usd,
                            fee_apr=fee_apr,
                            total_liquidity=pool_data.get('totalLiquidity', '0'),
                            total_shares=pool_data.get('totalShares', '0'),
                            chain=chain,
                            timestamp=int(datetime.now().timestamp())
                        )
                        pools.append(pool)
                    except (KeyError, ValueError, TypeError) as e:
                        print(f"Error parsing pool data: {e}")
                        continue
                
                return pools
                
        except Exception as e:
            print(f"Error fetching pools from The Graph: {e}")
            return []
    
    async def fetch_all_chains(
        self, 
        chains: List[str] = None,
        limit_per_chain: int = 100
    ) -> Dict[str, List[BalancerPool]]:
        """
        Fetch pools from multiple chains
        
        Args:
            chains: List of chain names to fetch from (None = all supported)
            limit_per_chain: Maximum pools per chain
            
        Returns:
            Dictionary mapping chain names to lists of pools
        """
        if chains is None:
            chains = list(GRAPH_ENDPOINTS.keys())
        
        tasks = []
        for chain in chains:
            if chain in GRAPH_ENDPOINTS:
                tasks.append(self.fetch_pools_from_graph(chain, limit_per_chain))
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        chain_pools = {}
        for chain, result in zip(chains, results):
            if isinstance(result, Exception):
                print(f"Error fetching {chain}: {result}")
                chain_pools[chain] = []
            else:
                chain_pools[chain] = result
                print(f"✅ Fetched {len(result)} Balancer pools from {chain}")
        
        return chain_pools
    
    def filter_by_tvl(
        self, 
        pools: List[BalancerPool], 
        min_tvl: float
    ) -> List[BalancerPool]:
        """Filter pools by minimum TVL"""
        return [p for p in pools if p.tvl_usd >= min_tvl]
    
    def filter_by_pool_type(
        self, 
        pools: List[BalancerPool], 
        pool_type: str
    ) -> List[BalancerPool]:
        """Filter pools by pool type"""
        return [p for p in pools if p.pool_type == pool_type]
    
    def filter_stable_pools(self, pools: List[BalancerPool]) -> List[BalancerPool]:
        """Filter for stable and meta-stable pools (good for arbitrage)"""
        stable_types = ['StablePool', 'MetaStablePool', 'ComposableStablePool']
        return [p for p in pools if p.pool_type in stable_types]
    
    def get_top_pools(
        self, 
        pools: List[BalancerPool], 
        n: int = 10,
        sort_by: str = 'tvl'
    ) -> List[BalancerPool]:
        """
        Get top N pools sorted by specified metric
        
        Args:
            pools: List of pools
            n: Number of top pools to return
            sort_by: Metric to sort by ('tvl', 'volume', 'apr')
        """
        if sort_by == 'tvl':
            return sorted(pools, key=lambda p: p.tvl_usd, reverse=True)[:n]
        elif sort_by == 'volume':
            return sorted(pools, key=lambda p: p.volume_24h_usd, reverse=True)[:n]
        elif sort_by == 'apr':
            return sorted(pools, key=lambda p: p.fee_apr, reverse=True)[:n]
        else:
            return pools[:n]
    
    def export_to_json(self, pools: List[BalancerPool], filepath: str):
        """Export pools to JSON file"""
        pools_dict = [
            {
                'id': p.id,
                'address': p.address,
                'pool_type': p.pool_type,
                'tokens': p.tokens,
                'token_symbols': p.token_symbols,
                'token_balances': p.token_balances,
                'token_weights': p.token_weights,
                'swap_fee': p.swap_fee,
                'tvl_usd': p.tvl_usd,
                'volume_24h_usd': p.volume_24h_usd,
                'fee_apr': p.fee_apr,
                'total_liquidity': p.total_liquidity,
                'total_shares': p.total_shares,
                'chain': p.chain,
                'timestamp': p.timestamp
            }
            for p in pools
        ]
        
        with open(filepath, 'w') as f:
            json.dump({
                'pools': pools_dict,
                'count': len(pools_dict),
                'timestamp': int(datetime.now().timestamp())
            }, f, indent=2)
        
        print(f"💾 Exported {len(pools_dict)} pools to {filepath}")
    
    def get_pool_summary(self, pools: List[BalancerPool]) -> Dict:
        """Get summary statistics for pools"""
        if not pools:
            return {
                'count': 0,
                'total_tvl': 0,
                'avg_tvl': 0,
                'total_volume': 0,
                'avg_apr': 0,
                'pool_types': {}
            }
        
        pool_types = {}
        for pool in pools:
            pool_types[pool.pool_type] = pool_types.get(pool.pool_type, 0) + 1
        
        return {
            'count': len(pools),
            'total_tvl': sum(p.tvl_usd for p in pools),
            'avg_tvl': sum(p.tvl_usd for p in pools) / len(pools),
            'total_volume': sum(p.volume_24h_usd for p in pools),
            'avg_apr': sum(p.fee_apr for p in pools) / len(pools),
            'pool_types': pool_types
        }


async def main():
    """Example usage"""
    print("🚀 Starting Balancer V2 TVL Fetcher...")
    
    # Initialize fetcher with 10k USD minimum TVL
    async with BalancerTVLFetcher(min_tvl_usd=10000) as fetcher:
        # Fetch pools from all supported chains
        all_pools = await fetcher.fetch_all_chains(
            chains=['polygon', 'ethereum', 'arbitrum'],
            limit_per_chain=50
        )
        
        # Process and display results
        for chain, pools in all_pools.items():
            if pools:
                print(f"\n📊 {chain.upper()} Statistics:")
                summary = fetcher.get_pool_summary(pools)
                print(f"   Pools: {summary['count']}")
                print(f"   Total TVL: ${summary['total_tvl']:,.2f}")
                print(f"   Avg TVL: ${summary['avg_tvl']:,.2f}")
                print(f"   Total Volume: ${summary['total_volume']:,.2f}")
                print(f"   Avg APR: {summary['avg_apr']:.2f}%")
                print(f"   Pool Types: {summary['pool_types']}")
                
                # Show top 5 pools by TVL
                top_pools = fetcher.get_top_pools(pools, n=5, sort_by='tvl')
                print(f"\n   Top 5 Pools by TVL:")
                for i, pool in enumerate(top_pools, 1):
                    tokens_str = '/'.join(pool.token_symbols[:3])
                    if len(pool.token_symbols) > 3:
                        tokens_str += f'+{len(pool.token_symbols)-3} more'
                    print(f"   {i}. {tokens_str} "
                          f"({pool.pool_type}) - "
                          f"TVL: ${pool.tvl_usd:,.2f}")
                
                # Show stable pools (good for arbitrage)
                stable_pools = fetcher.filter_stable_pools(pools)
                if stable_pools:
                    print(f"\n   Stable Pools (arbitrage-friendly): {len(stable_pools)}")
        
        # Export to JSON
        all_pools_flat = []
        for chain, pools in all_pools.items():
            all_pools_flat.extend(pools)
        
        if all_pools_flat:
            data_dir = os.path.join(os.path.dirname(__file__), '../../data')
            os.makedirs(data_dir, exist_ok=True)
            output_file = os.path.join(data_dir, 'balancer_pools.json')
            fetcher.export_to_json(all_pools_flat, output_file)
    
    print("\n✅ Fetching complete!")


if __name__ == '__main__':
    asyncio.run(main())
