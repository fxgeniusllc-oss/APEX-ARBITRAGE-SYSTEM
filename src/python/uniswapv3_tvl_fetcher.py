"""
Uniswap V3 TVL Fetcher
Fetches Total Value Locked (TVL) data for Uniswap V3 pools
Integrates with The Graph protocol for efficient data retrieval
"""

import asyncio
import aiohttp
import json
from typing import List, Dict, Optional
from dataclasses import dataclass
from datetime import datetime
import os


@dataclass
class UniswapV3Pool:
    """Represents a Uniswap V3 pool with TVL data"""
    id: str
    token0: str
    token1: str
    token0_symbol: str
    token1_symbol: str
    fee_tier: int
    liquidity: str
    sqrt_price: str
    tick: int
    tvl_usd: float
    volume_24h_usd: float
    fee_apr: float
    timestamp: int


# The Graph API endpoints for Uniswap V3
GRAPH_ENDPOINTS = {
    'polygon': 'https://api.thegraph.com/subgraphs/name/ianlapham/uniswap-v3-polygon',
    'ethereum': 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3',
    'arbitrum': 'https://api.thegraph.com/subgraphs/name/ianlapham/uniswap-arbitrum-one',
    'optimism': 'https://api.thegraph.com/subgraphs/name/ianlapham/optimism-post-regenesis'
}


class UniswapV3TVLFetcher:
    """Fetches TVL data from Uniswap V3 pools across multiple chains"""
    
    def __init__(self, min_tvl_usd: float = 10000):
        """
        Initialize the TVL fetcher
        
        Args:
            min_tvl_usd: Minimum TVL threshold to filter pools
        """
        self.min_tvl_usd = min_tvl_usd
        self.session: Optional[aiohttp.ClientSession] = None
        self.pools_cache: Dict[str, List[UniswapV3Pool]] = {}
        
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
        skip: int = 0
    ) -> List[UniswapV3Pool]:
        """
        Fetch pools from The Graph subgraph
        
        Args:
            chain: Chain name (polygon, ethereum, arbitrum, optimism)
            limit: Maximum number of pools to fetch
            skip: Number of pools to skip (for pagination)
            
        Returns:
            List of UniswapV3Pool objects
        """
        if chain not in GRAPH_ENDPOINTS:
            print(f"Warning: Chain {chain} not supported")
            return []
        
        endpoint = GRAPH_ENDPOINTS[chain]
        
        # GraphQL query to fetch pool data
        query = """
        query ($first: Int!, $skip: Int!, $minTvl: BigDecimal!) {
          pools(
            first: $first,
            skip: $skip,
            orderBy: totalValueLockedUSD,
            orderDirection: desc,
            where: { totalValueLockedUSD_gt: $minTvl }
          ) {
            id
            token0 {
              id
              symbol
              decimals
            }
            token1 {
              id
              symbol
              decimals
            }
            feeTier
            liquidity
            sqrtPrice
            tick
            totalValueLockedUSD
            volumeUSD
            feesUSD
          }
        }
        """
        
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
                        tvl_usd = float(pool_data.get('totalValueLockedUSD', 0))
                        volume_usd = float(pool_data.get('volumeUSD', 0))
                        fees_usd = float(pool_data.get('feesUSD', 0))
                        
                        # Calculate APR based on fees
                        fee_apr = (fees_usd / tvl_usd * 365 * 100) if tvl_usd > 0 else 0
                        
                        pool = UniswapV3Pool(
                            id=pool_data['id'],
                            token0=pool_data['token0']['id'],
                            token1=pool_data['token1']['id'],
                            token0_symbol=pool_data['token0']['symbol'],
                            token1_symbol=pool_data['token1']['symbol'],
                            fee_tier=int(pool_data['feeTier']),
                            liquidity=pool_data['liquidity'],
                            sqrt_price=pool_data['sqrtPrice'],
                            tick=int(pool_data['tick']),
                            tvl_usd=tvl_usd,
                            volume_24h_usd=volume_usd,
                            fee_apr=fee_apr,
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
    ) -> Dict[str, List[UniswapV3Pool]]:
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
                print(f"✅ Fetched {len(result)} pools from {chain}")
        
        return chain_pools
    
    def filter_by_tvl(
        self, 
        pools: List[UniswapV3Pool], 
        min_tvl: float
    ) -> List[UniswapV3Pool]:
        """Filter pools by minimum TVL"""
        return [p for p in pools if p.tvl_usd >= min_tvl]
    
    def filter_by_volume(
        self, 
        pools: List[UniswapV3Pool], 
        min_volume: float
    ) -> List[UniswapV3Pool]:
        """Filter pools by minimum 24h volume"""
        return [p for p in pools if p.volume_24h_usd >= min_volume]
    
    def get_top_pools(
        self, 
        pools: List[UniswapV3Pool], 
        n: int = 10,
        sort_by: str = 'tvl'
    ) -> List[UniswapV3Pool]:
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
    
    def export_to_json(self, pools: List[UniswapV3Pool], filepath: str):
        """Export pools to JSON file"""
        pools_dict = [
            {
                'id': p.id,
                'token0': p.token0,
                'token1': p.token1,
                'token0_symbol': p.token0_symbol,
                'token1_symbol': p.token1_symbol,
                'fee_tier': p.fee_tier,
                'liquidity': p.liquidity,
                'sqrt_price': p.sqrt_price,
                'tick': p.tick,
                'tvl_usd': p.tvl_usd,
                'volume_24h_usd': p.volume_24h_usd,
                'fee_apr': p.fee_apr,
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
    
    def get_pool_summary(self, pools: List[UniswapV3Pool]) -> Dict:
        """Get summary statistics for pools"""
        if not pools:
            return {
                'count': 0,
                'total_tvl': 0,
                'avg_tvl': 0,
                'total_volume': 0,
                'avg_apr': 0
            }
        
        return {
            'count': len(pools),
            'total_tvl': sum(p.tvl_usd for p in pools),
            'avg_tvl': sum(p.tvl_usd for p in pools) / len(pools),
            'total_volume': sum(p.volume_24h_usd for p in pools),
            'avg_apr': sum(p.fee_apr for p in pools) / len(pools)
        }


async def main():
    """Example usage"""
    print("🚀 Starting Uniswap V3 TVL Fetcher...")
    
    # Initialize fetcher with 10k USD minimum TVL
    async with UniswapV3TVLFetcher(min_tvl_usd=10000) as fetcher:
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
                print(f"   Total 24h Volume: ${summary['total_volume']:,.2f}")
                print(f"   Avg APR: {summary['avg_apr']:.2f}%")
                
                # Show top 5 pools by TVL
                top_pools = fetcher.get_top_pools(pools, n=5, sort_by='tvl')
                print(f"\n   Top 5 Pools by TVL:")
                for i, pool in enumerate(top_pools, 1):
                    print(f"   {i}. {pool.token0_symbol}/{pool.token1_symbol} "
                          f"(Fee: {pool.fee_tier/10000}%) - "
                          f"TVL: ${pool.tvl_usd:,.2f}")
        
        # Export to JSON
        all_pools_flat = []
        for chain, pools in all_pools.items():
            all_pools_flat.extend(pools)
        
        if all_pools_flat:
            data_dir = os.path.join(os.path.dirname(__file__), '../../data')
            os.makedirs(data_dir, exist_ok=True)
            output_file = os.path.join(data_dir, 'uniswap_v3_pools.json')
            fetcher.export_to_json(all_pools_flat, output_file)
    
    print("\n✅ Fetching complete!")


if __name__ == '__main__':
    asyncio.run(main())
