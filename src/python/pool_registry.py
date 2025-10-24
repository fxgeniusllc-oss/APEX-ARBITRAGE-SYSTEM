"""
Pool Registry Integrator
Comprehensive pool discovery and management across all supported DEXes
Based on pool_registry_integrator principles
"""

import asyncio
import json
from typing import Dict, List, Optional, Set
from dataclasses import dataclass, asdict
from datetime import datetime
from web3 import Web3


@dataclass
class PoolInfo:
    """Pool information structure"""
    address: str
    dex: str
    chain: str
    token0: str
    token0_address: str
    token1: str
    token1_address: str
    fee_tier: float
    pool_type: str  # 'v2', 'v3', 'stable', 'weighted'
    created_at: int
    is_active: bool = True
    tvl_usd: float = 0.0
    volume_24h: float = 0.0


class PoolRegistry:
    """
    Central registry for all liquidity pools across chains and DEXes
    Provides unified interface for pool discovery and management
    """
    
    def __init__(self):
        self.pools: Dict[str, PoolInfo] = {}
        self.pools_by_token_pair: Dict[str, Set[str]] = {}
        self.pools_by_chain: Dict[str, Set[str]] = {}
        self.pools_by_dex: Dict[str, Set[str]] = {}
        
        # Factory addresses for pool discovery
        self.factories = {
            'polygon': {
                'quickswap': '0x5757371414417b8C6CAad45bAeF941aBc7d3Ab32',
                'sushiswap': '0xc35DADB65012eC5796536bD9864eD8773aBc74C4',
                'uniswap_v3': '0x1F98431c8aD98523631AE4a59f267346ea31F984',
                'balancer': '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
                'curve': '0x722272D36ef0Da72FF51c5A65Db7b870E2e8D4ee'
            },
            'ethereum': {
                'uniswap_v2': '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
                'uniswap_v3': '0x1F98431c8aD98523631AE4a59f267346ea31F984',
                'sushiswap': '0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac',
                'curve': '0x90E00ACe148ca3b23Ac1bC8C240C2a7Dd9c2d7f5',
                'balancer': '0xBA12222222228d8Ba445958a75a0704d566BF2C8'
            },
            'arbitrum': {
                'uniswap_v3': '0x1F98431c8aD98523631AE4a59f267346ea31F984',
                'sushiswap': '0xc35DADB65012eC5796536bD9864eD8773aBc74C4',
                'camelot': '0x6EcCab422D763aC031210895C81787E87B43A652',
                'balancer': '0xBA12222222228d8Ba445958a75a0704d566BF2C8'
            },
            'optimism': {
                'uniswap_v3': '0x1F98431c8aD98523631AE4a59f267346ea31F984',
                'velodrome': '0x25CbdDb98b35ab1FF77413456B31EC81A6B6B746',
                'balancer': '0xBA12222222228d8Ba445958a75a0704d566BF2C8'
            },
            'base': {
                'uniswap_v3': '0x33128a8fC17869897dcE68Ed026d694621f6FDfD',
                'aerodrome': '0x420DD381b31aEf6683db6B902084cB0FFECe40Da',
                'balancer': '0xBA12222222228d8Ba445958a75a0704d566BF2C8'
            }
        }
        
        self.stats = {
            'total_pools': 0,
            'active_pools': 0,
            'pools_by_type': {},
            'last_discovery': None
        }
    
    def add_pool(self, pool: PoolInfo):
        """Add a pool to the registry (idempotent - updates existing pools)"""
        pool_key = f"{pool.chain}:{pool.dex}:{pool.address}"
        
        # Check if pool already exists
        existing_pool = self.pools.get(pool_key)
        is_new_pool = existing_pool is None
        
        # Store or update pool
        self.pools[pool_key] = pool
        
        # Index by token pair (using set to prevent duplicates)
        pair_key = self._get_token_pair_key(pool.token0_address, pool.token1_address)
        if pair_key not in self.pools_by_token_pair:
            self.pools_by_token_pair[pair_key] = set()
        self.pools_by_token_pair[pair_key].add(pool_key)
        
        # Index by chain
        if pool.chain not in self.pools_by_chain:
            self.pools_by_chain[pool.chain] = set()
        self.pools_by_chain[pool.chain].add(pool_key)
        
        # Index by DEX
        if pool.dex not in self.pools_by_dex:
            self.pools_by_dex[pool.dex] = set()
        self.pools_by_dex[pool.dex].add(pool_key)
        
        # Update stats
        self.stats['total_pools'] = len(self.pools)
        
        # Update active_pools count incrementally for efficiency
        if is_new_pool:
            # New pool: add to count if active
            if pool.is_active:
                self.stats['active_pools'] += 1
        else:
            # Existing pool: handle status change
            if existing_pool.is_active != pool.is_active:
                if pool.is_active:
                    self.stats['active_pools'] += 1
                else:
                    self.stats['active_pools'] -= 1
        
        # Handle pool_type statistics
        if is_new_pool:
            # New pool: increment count for its type
            if pool.pool_type not in self.stats['pools_by_type']:
                self.stats['pools_by_type'][pool.pool_type] = 0
            self.stats['pools_by_type'][pool.pool_type] += 1
        else:
            # Existing pool: handle potential type change
            if existing_pool.pool_type != pool.pool_type:
                # Decrement old type count
                if existing_pool.pool_type in self.stats['pools_by_type']:
                    self.stats['pools_by_type'][existing_pool.pool_type] -= 1
                    if self.stats['pools_by_type'][existing_pool.pool_type] <= 0:
                        del self.stats['pools_by_type'][existing_pool.pool_type]
                
                # Increment new type count
                if pool.pool_type not in self.stats['pools_by_type']:
                    self.stats['pools_by_type'][pool.pool_type] = 0
                self.stats['pools_by_type'][pool.pool_type] += 1
    
    def get_pool(self, chain: str, dex: str, address: str) -> Optional[PoolInfo]:
        """Get a specific pool"""
        pool_key = f"{chain}:{dex}:{address}"
        return self.pools.get(pool_key)
    
    def find_pools_for_token_pair(
        self,
        token0: str,
        token1: str,
        chain: Optional[str] = None,
        dex: Optional[str] = None,
        min_tvl: float = 0
    ) -> List[PoolInfo]:
        """Find all pools for a token pair with optional filters"""
        pair_key = self._get_token_pair_key(token0, token1)
        pool_keys = self.pools_by_token_pair.get(pair_key, set())
        
        pools = [self.pools[key] for key in pool_keys if key in self.pools]
        
        # Apply filters
        if chain:
            pools = [p for p in pools if p.chain == chain]
        if dex:
            pools = [p for p in pools if p.dex == dex]
        if min_tvl > 0:
            pools = [p for p in pools if p.tvl_usd >= min_tvl]
        
        # Sort by TVL descending
        pools.sort(key=lambda p: p.tvl_usd, reverse=True)
        
        return pools
    
    def get_pools_by_chain(self, chain: str) -> List[PoolInfo]:
        """Get all pools for a specific chain"""
        pool_keys = self.pools_by_chain.get(chain, set())
        return [self.pools[key] for key in pool_keys if key in self.pools]
    
    def get_pools_by_dex(self, dex: str) -> List[PoolInfo]:
        """Get all pools for a specific DEX"""
        pool_keys = self.pools_by_dex.get(dex, set())
        return [self.pools[key] for key in pool_keys if key in self.pools]
    
    def get_top_pools_by_tvl(self, limit: int = 100, chain: Optional[str] = None) -> List[PoolInfo]:
        """Get top pools by TVL"""
        pools = list(self.pools.values())
        
        if chain:
            pools = [p for p in pools if p.chain == chain]
        
        pools.sort(key=lambda p: p.tvl_usd, reverse=True)
        return pools[:limit]
    
    def find_arbitrage_routes(
        self,
        token: str,
        chain: str,
        max_hops: int = 3,
        min_tvl: float = 0
    ) -> List[List[PoolInfo]]:
        """
        Find potential arbitrage routes starting and ending with the same token
        Returns list of routes (each route is a list of pools)
        """
        routes = []
        
        # Get all pools on the specified chain
        all_pools = [
            p for p in self.pools.values()
            if p.chain == chain and p.tvl_usd >= min_tvl
        ]
        
        # Get all pools containing the token
        starting_pools = [
            p for p in all_pools
            if p.token0_address == token or p.token1_address == token
        ]
        
        # Simple 2-hop routes (A -> B -> A)
        if max_hops >= 2:
            for pool1 in starting_pools:
                intermediate_token = (
                    pool1.token1_address if pool1.token0_address == token 
                    else pool1.token0_address
                )
                
                # Find pools that go back to original token
                for pool2 in starting_pools:
                    if pool2.address == pool1.address:
                        continue
                    
                    if (pool2.token0_address == intermediate_token and pool2.token1_address == token) or \
                       (pool2.token1_address == intermediate_token and pool2.token0_address == token):
                        routes.append([pool1, pool2])
        
        # 3-hop routes (A -> B -> C -> A)
        if max_hops >= 3:
            for pool1 in starting_pools:
                token_b = (
                    pool1.token1_address if pool1.token0_address == token 
                    else pool1.token0_address
                )
                
                pools_with_b = [
                    p for p in all_pools
                    if (p.token0_address == token_b or p.token1_address == token_b) and
                       p.address != pool1.address
                ]
                
                for pool2 in pools_with_b:
                    token_c = (
                        pool2.token1_address if pool2.token0_address == token_b
                        else pool2.token0_address
                    )
                    
                    if token_c == token:
                        continue
                    
                    # Find pools that go back to original token
                    for pool3 in starting_pools:
                        if pool3.address in [pool1.address, pool2.address]:
                            continue
                        
                        if (pool3.token0_address == token_c and pool3.token1_address == token) or \
                           (pool3.token1_address == token_c and pool3.token0_address == token):
                            routes.append([pool1, pool2, pool3])
        
        return routes
    
    async def discover_pools(
        self,
        chain: str,
        dex: str,
        web3_provider: Optional[Web3] = None
    ) -> int:
        """
        Discover pools for a specific chain and DEX
        Returns number of new pools discovered
        """
        print(f"🔍 Discovering pools for {dex} on {chain}...")
        
        if chain not in self.factories or dex not in self.factories[chain]:
            print(f"⚠️  No factory configured for {dex} on {chain}")
            return 0
        
        factory_address = self.factories[chain][dex]
        
        # In a real implementation, this would:
        # 1. Connect to the factory contract
        # 2. Query for pool creation events
        # 3. Parse pool data
        # 4. Add discovered pools to registry
        
        # For now, simulate discovery
        new_pools = 0
        
        print(f"✅ Discovered {new_pools} new pools for {dex} on {chain}")
        self.stats['last_discovery'] = datetime.now().isoformat()
        
        return new_pools
    
    async def refresh_pool_data(self, pool_key: str, tvl_orchestrator = None):
        """Refresh TVL and volume data for a pool"""
        if pool_key not in self.pools:
            return
        
        pool = self.pools[pool_key]
        
        # If TVL orchestrator provided, fetch latest data
        if tvl_orchestrator:
            updated_tvl = await tvl_orchestrator.fetch_pool_tvl(
                pool.address,
                pool.dex,
                pool.chain
            )
            
            if updated_tvl:
                pool.tvl_usd = updated_tvl.tvl_usd
                pool.volume_24h = updated_tvl.volume_24h
    
    def export_to_json(self, filepath: str):
        """Export registry to JSON file"""
        data = {
            'pools': [asdict(pool) for pool in self.pools.values()],
            'stats': self.stats,
            'exported_at': datetime.now().isoformat()
        }
        
        with open(filepath, 'w') as f:
            json.dump(data, f, indent=2)
        
        print(f"✅ Registry exported to {filepath}")
    
    def import_from_json(self, filepath: str) -> int:
        """Import registry from JSON file"""
        try:
            with open(filepath, 'r') as f:
                data = json.load(f)
            
            imported = 0
            for pool_data in data.get('pools', []):
                pool = PoolInfo(**pool_data)
                self.add_pool(pool)
                imported += 1
            
            print(f"✅ Imported {imported} pools from {filepath}")
            return imported
            
        except Exception as e:
            print(f"❌ Error importing registry: {e}")
            return 0
    
    def _get_token_pair_key(self, token0: str, token1: str) -> str:
        """Get normalized token pair key (sorted)"""
        tokens = sorted([token0.lower(), token1.lower()])
        return f"{tokens[0]}:{tokens[1]}"
    
    def get_stats(self) -> Dict:
        """Get registry statistics"""
        return self.stats.copy()
    
    def get_total_tvl(self) -> float:
        """Calculate total TVL across all pools"""
        return sum(pool.tvl_usd for pool in self.pools.values())
    
    def get_statistics_by_chain(self) -> Dict[str, Dict]:
        """Get statistics broken down by chain"""
        chain_stats = {}
        
        for chain, pool_keys in self.pools_by_chain.items():
            pools = [self.pools[key] for key in pool_keys if key in self.pools]
            chain_stats[chain] = {
                'count': len(pools),
                'active_count': sum(1 for p in pools if p.is_active),
                'total_tvl': sum(p.tvl_usd for p in pools),
                'total_volume_24h': sum(p.volume_24h for p in pools)
            }
        
        return chain_stats
    
    def get_statistics_by_dex(self) -> Dict[str, Dict]:
        """Get statistics broken down by DEX"""
        dex_stats = {}
        
        for dex, pool_keys in self.pools_by_dex.items():
            pools = [self.pools[key] for key in pool_keys if key in self.pools]
            dex_stats[dex] = {
                'count': len(pools),
                'active_count': sum(1 for p in pools if p.is_active),
                'total_tvl': sum(p.tvl_usd for p in pools),
                'total_volume_24h': sum(p.volume_24h for p in pools)
            }
        
        return dex_stats
    
    def update_pool_tvl(self, chain: str, dex: str, address: str, new_tvl: float):
        """Update TVL for a specific pool"""
        pool_key = f"{chain}:{dex}:{address}"
        if pool_key in self.pools:
            self.pools[pool_key].tvl_usd = new_tvl
    
    def set_pool_status(self, chain: str, dex: str, address: str, is_active: bool):
        """Update active status for a specific pool"""
        pool_key = f"{chain}:{dex}:{address}"
        if pool_key in self.pools:
            old_status = self.pools[pool_key].is_active
            self.pools[pool_key].is_active = is_active
            # Update active pools count incrementally
            if old_status != is_active:
                if is_active:
                    self.stats['active_pools'] += 1
                else:
                    self.stats['active_pools'] -= 1
    
    def print_stats(self):
        """Print registry statistics"""
        print("\n" + "="*60)
        print("POOL REGISTRY STATISTICS")
        print("="*60)
        print(f"Total Pools: {self.stats['total_pools']}")
        print(f"Active Pools: {self.stats['active_pools']}")
        print(f"\nPools by Type:")
        for pool_type, count in self.stats['pools_by_type'].items():
            print(f"  {pool_type}: {count}")
        print(f"\nPools by Chain:")
        for chain, pools in self.pools_by_chain.items():
            print(f"  {chain}: {len(pools)}")
        print(f"\nPools by DEX:")
        for dex, pools in self.pools_by_dex.items():
            print(f"  {dex}: {len(pools)}")
        if self.stats['last_discovery']:
            print(f"\nLast Discovery: {self.stats['last_discovery']}")
        print("="*60 + "\n")


# Global registry instance
_registry_instance = None

def get_pool_registry() -> PoolRegistry:
    """Get global pool registry instance"""
    global _registry_instance
    if _registry_instance is None:
        _registry_instance = PoolRegistry()
    return _registry_instance
