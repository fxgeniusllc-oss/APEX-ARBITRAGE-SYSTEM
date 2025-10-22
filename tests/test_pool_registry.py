"""
Comprehensive Tests for Pool Registry Module
Tests pool discovery, management, and indexing across chains

Test Coverage:
1. Pool registration and indexing
2. Pool discovery by token pairs
3. Multi-chain pool management
4. Pool statistics tracking
5. Factory address configuration
"""

import pytest
import sys
import os

# Add src directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from python.pool_registry import PoolRegistry, PoolInfo


class TestPoolRegistryInitialization:
    """Test Pool Registry initialization"""
    
    def test_initialization(self):
        """Should initialize with default configuration"""
        registry = PoolRegistry()
        
        assert registry is not None
        assert isinstance(registry.pools, dict)
        assert isinstance(registry.pools_by_token_pair, dict)
        assert isinstance(registry.pools_by_chain, dict)
        assert isinstance(registry.pools_by_dex, dict)
    
    def test_factory_addresses_configured(self):
        """Should have factory addresses for all chains"""
        registry = PoolRegistry()
        
        assert 'polygon' in registry.factories
        assert 'ethereum' in registry.factories
        assert 'arbitrum' in registry.factories
        assert 'optimism' in registry.factories
        assert 'base' in registry.factories
    
    def test_polygon_factories(self):
        """Should have Polygon DEX factories configured"""
        registry = PoolRegistry()
        
        polygon_factories = registry.factories['polygon']
        assert 'quickswap' in polygon_factories
        assert 'sushiswap' in polygon_factories
        assert 'uniswap_v3' in polygon_factories
        assert 'balancer' in polygon_factories
        assert 'curve' in polygon_factories
    
    def test_statistics_initialized(self):
        """Should initialize pool statistics"""
        registry = PoolRegistry()
        
        assert 'total_pools' in registry.stats
        assert 'active_pools' in registry.stats
        assert 'pools_by_type' in registry.stats
        assert registry.stats['total_pools'] == 0


class TestPoolAddition:
    """Test pool addition functionality"""
    
    def test_add_single_pool(self):
        """Should add pool to registry"""
        registry = PoolRegistry()
        
        pool = PoolInfo(
            address='0x1234567890abcdef1234567890abcdef12345678',
            dex='quickswap',
            chain='polygon',
            token0='USDC',
            token0_address='0xUSDC',
            token1='USDT',
            token1_address='0xUSDT',
            fee_tier=0.003,
            pool_type='v2',
            created_at=1234567890,
            tvl_usd=1000000,
            volume_24h=500000
        )
        
        registry.add_pool(pool)
        
        assert registry.stats['total_pools'] == 1
    
    def test_add_multiple_pools(self):
        """Should add multiple pools"""
        registry = PoolRegistry()
        
        pools = [
            PoolInfo(
                address=f'0xpool{i}',
                dex='quickswap',
                chain='polygon',
                token0='USDC',
                token0_address='0xUSDC',
                token1='USDT',
                token1_address='0xUSDT',
                fee_tier=0.003,
                pool_type='v2',
                created_at=1234567890
            )
            for i in range(5)
        ]
        
        for pool in pools:
            registry.add_pool(pool)
        
        assert registry.stats['total_pools'] == 5
    
    def test_index_pool_by_token_pair(self):
        """Should index pool by token pair"""
        registry = PoolRegistry()
        
        pool = PoolInfo(
            address='0xpool1',
            dex='quickswap',
            chain='polygon',
            token0='USDC',
            token0_address='0xUSDC',
            token1='USDT',
            token1_address='0xUSDT',
            fee_tier=0.003,
            pool_type='v2',
            created_at=1234567890
        )
        
        registry.add_pool(pool)
        
        # Should be able to find by token pair
        pair_key = registry._get_token_pair_key('0xUSDC', '0xUSDT')
        assert pair_key in registry.pools_by_token_pair
    
    def test_index_pool_by_chain(self):
        """Should index pool by chain"""
        registry = PoolRegistry()
        
        pool = PoolInfo(
            address='0xpool1',
            dex='sushiswap',
            chain='ethereum',
            token0='WETH',
            token0_address='0xWETH',
            token1='USDC',
            token1_address='0xUSDC',
            fee_tier=0.003,
            pool_type='v2',
            created_at=1234567890
        )
        
        registry.add_pool(pool)
        
        assert 'ethereum' in registry.pools_by_chain
        assert len(registry.pools_by_chain['ethereum']) > 0
    
    def test_index_pool_by_dex(self):
        """Should index pool by DEX"""
        registry = PoolRegistry()
        
        pool = PoolInfo(
            address='0xpool1',
            dex='uniswap_v3',
            chain='ethereum',
            token0='WETH',
            token0_address='0xWETH',
            token1='USDC',
            token1_address='0xUSDC',
            fee_tier=0.003,
            pool_type='v3',
            created_at=1234567890
        )
        
        registry.add_pool(pool)
        
        assert 'uniswap_v3' in registry.pools_by_dex


class TestPoolRetrieval:
    """Test pool retrieval functionality"""
    
    def test_find_pools_for_token_pair(self):
        """Should find all pools for token pair"""
        registry = PoolRegistry()
        
        # Add pools with same token pair on different DEXes
        for dex in ['quickswap', 'sushiswap', 'uniswap_v3']:
            pool = PoolInfo(
                address=f'0xpool_{dex}',
                dex=dex,
                chain='polygon',
                token0='USDC',
                token0_address='0xUSDC',
                token1='USDT',
                token1_address='0xUSDT',
                fee_tier=0.003,
                pool_type='v2',
                created_at=1234567890
            )
            registry.add_pool(pool)
        
        pools = registry.find_pools_for_token_pair('0xUSDC', '0xUSDT', chain='polygon')
        
        assert len(pools) == 3
    
    def test_find_pools_by_chain(self):
        """Should find all pools on specific chain"""
        registry = PoolRegistry()
        
        # Add pools on different chains
        for chain in ['polygon', 'ethereum', 'arbitrum']:
            pool = PoolInfo(
                address=f'0xpool_{chain}',
                dex='uniswap_v3',
                chain=chain,
                token0='WETH',
                token0_address='0xWETH',
                token1='USDC',
                token1_address='0xUSDC',
                fee_tier=0.003,
                pool_type='v3',
                created_at=1234567890
            )
            registry.add_pool(pool)
        
        polygon_pools = registry.get_pools_by_chain('polygon')
        assert len(polygon_pools) >= 1
    
    def test_find_pools_by_dex(self):
        """Should find all pools on specific DEX"""
        registry = PoolRegistry()
        
        # Add multiple pools on same DEX
        for i in range(3):
            pool = PoolInfo(
                address=f'0xpool{i}',
                dex='quickswap',
                chain='polygon',
                token0='USDC',
                token0_address='0xUSDC',
                token1='USDT',
                token1_address='0xUSDT',
                fee_tier=0.003,
                pool_type='v2',
                created_at=1234567890 + i
            )
            registry.add_pool(pool)
        
        quickswap_pools = registry.get_pools_by_dex('quickswap')
        assert len(quickswap_pools) >= 3
    
    def test_find_pools_with_minimum_tvl(self):
        """Should filter pools by minimum TVL"""
        registry = PoolRegistry()
        
        # Add pools with different TVL
        tvls = [10000, 100000, 1000000, 10000000]
        for i, tvl in enumerate(tvls):
            pool = PoolInfo(
                address=f'0xpool{i}',
                dex='quickswap',
                chain='polygon',
                token0='USDC',
                token0_address='0xUSDC',
                token1='USDT',
                token1_address='0xUSDT',
                fee_tier=0.003,
                pool_type='v2',
                created_at=1234567890,
                tvl_usd=tvl
            )
            registry.add_pool(pool)
        
        high_tvl_pools = registry.find_pools_for_token_pair(
            '0xUSDC',
            '0xUSDT',
            chain='polygon',
            min_tvl=500000
        )
        
        # Should only return pools with TVL >= 500000
        assert len(high_tvl_pools) == 2


class TestArbitrageRouteDiscovery:
    """Test arbitrage route discovery"""
    
    def test_find_triangular_routes(self):
        """Should find triangular arbitrage routes"""
        registry = PoolRegistry()
        
        # Create triangle: USDC -> WETH -> USDT -> USDC
        pools = [
            PoolInfo(
                address='0xpool1',
                dex='quickswap',
                chain='polygon',
                token0='USDC',
                token0_address='0xUSDC',
                token1='WETH',
                token1_address='0xWETH',
                fee_tier=0.003,
                pool_type='v2',
                created_at=1234567890
            ),
            PoolInfo(
                address='0xpool2',
                dex='sushiswap',
                chain='polygon',
                token0='WETH',
                token0_address='0xWETH',
                token1='USDT',
                token1_address='0xUSDT',
                fee_tier=0.003,
                pool_type='v2',
                created_at=1234567890
            ),
            PoolInfo(
                address='0xpool3',
                dex='uniswap_v3',
                chain='polygon',
                token0='USDT',
                token0_address='0xUSDT',
                token1='USDC',
                token1_address='0xUSDC',
                fee_tier=0.003,
                pool_type='v3',
                created_at=1234567890
            )
        ]
        
        for pool in pools:
            registry.add_pool(pool)
        
        routes = registry.find_arbitrage_routes('0xUSDC', 'polygon', max_hops=3)
        
        # Should find at least one triangular route
        assert len(routes) >= 1
    
    def test_find_routes_with_max_hops(self):
        """Should respect max hops parameter"""
        registry = PoolRegistry()
        
        # Add simple 2-hop route
        pools = [
            PoolInfo(
                address='0xpool1',
                dex='quickswap',
                chain='polygon',
                token0='USDC',
                token0_address='0xUSDC',
                token1='USDT',
                token1_address='0xUSDT',
                fee_tier=0.003,
                pool_type='v2',
                created_at=1234567890
            ),
            PoolInfo(
                address='0xpool2',
                dex='sushiswap',
                chain='polygon',
                token0='USDT',
                token0_address='0xUSDT',
                token1='USDC',
                token1_address='0xUSDC',
                fee_tier=0.003,
                pool_type='v2',
                created_at=1234567890
            )
        ]
        
        for pool in pools:
            registry.add_pool(pool)
        
        routes = registry.find_arbitrage_routes('0xUSDC', 'polygon', max_hops=2)
        
        assert len(routes) >= 1
        # All routes should have <= max_hops
        for route in routes:
            assert len(route) <= 2


class TestPoolStatistics:
    """Test pool statistics functionality"""
    
    def test_calculate_total_tvl(self):
        """Should calculate total TVL across all pools"""
        registry = PoolRegistry()
        
        tvls = [1000000, 2000000, 3000000]
        for i, tvl in enumerate(tvls):
            pool = PoolInfo(
                address=f'0xpool{i}',
                dex='quickswap',
                chain='polygon',
                token0='USDC',
                token0_address='0xUSDC',
                token1='USDT',
                token1_address='0xUSDT',
                fee_tier=0.003,
                pool_type='v2',
                created_at=1234567890,
                tvl_usd=tvl
            )
            registry.add_pool(pool)
        
        total_tvl = registry.get_total_tvl()
        assert total_tvl == sum(tvls)
    
    def test_get_statistics_by_chain(self):
        """Should provide statistics broken down by chain"""
        registry = PoolRegistry()
        
        chains = ['polygon', 'ethereum', 'arbitrum']
        for chain in chains:
            for i in range(3):
                pool = PoolInfo(
                    address=f'0x{chain}pool{i}',
                    dex='uniswap_v3',
                    chain=chain,
                    token0='WETH',
                    token0_address='0xWETH',
                    token1='USDC',
                    token1_address='0xUSDC',
                    fee_tier=0.003,
                    pool_type='v3',
                    created_at=1234567890
                )
                registry.add_pool(pool)
        
        chain_stats = registry.get_statistics_by_chain()
        
        for chain in chains:
            assert chain in chain_stats
            assert chain_stats[chain]['count'] == 3
    
    def test_get_statistics_by_dex(self):
        """Should provide statistics broken down by DEX"""
        registry = PoolRegistry()
        
        dexes = ['quickswap', 'sushiswap', 'uniswap_v3']
        for dex in dexes:
            for i in range(2):
                pool = PoolInfo(
                    address=f'0x{dex}pool{i}',
                    dex=dex,
                    chain='polygon',
                    token0='USDC',
                    token0_address='0xUSDC',
                    token1='USDT',
                    token1_address='0xUSDT',
                    fee_tier=0.003,
                    pool_type='v2',
                    created_at=1234567890
                )
                registry.add_pool(pool)
        
        dex_stats = registry.get_statistics_by_dex()
        
        for dex in dexes:
            assert dex in dex_stats
            assert dex_stats[dex]['count'] == 2


class TestPoolUpdates:
    """Test pool update functionality"""
    
    def test_update_pool_tvl(self):
        """Should update pool TVL"""
        registry = PoolRegistry()
        
        pool = PoolInfo(
            address='0xpool1',
            dex='quickswap',
            chain='polygon',
            token0='USDC',
            token0_address='0xUSDC',
            token1='USDT',
            token1_address='0xUSDT',
            fee_tier=0.003,
            pool_type='v2',
            created_at=1234567890,
            tvl_usd=1000000
        )
        
        registry.add_pool(pool)
        
        # Update TVL
        registry.update_pool_tvl('polygon', 'quickswap', '0xpool1', 2000000)
        
        updated_pool = registry.get_pool('polygon', 'quickswap', '0xpool1')
        assert updated_pool.tvl_usd == 2000000
    
    def test_update_pool_status(self):
        """Should update pool active status"""
        registry = PoolRegistry()
        
        pool = PoolInfo(
            address='0xpool1',
            dex='quickswap',
            chain='polygon',
            token0='USDC',
            token0_address='0xUSDC',
            token1='USDT',
            token1_address='0xUSDT',
            fee_tier=0.003,
            pool_type='v2',
            created_at=1234567890,
            is_active=True
        )
        
        registry.add_pool(pool)
        
        # Deactivate pool
        registry.set_pool_status('polygon', 'quickswap', '0xpool1', False)
        
        updated_pool = registry.get_pool('polygon', 'quickswap', '0xpool1')
        assert updated_pool.is_active == False


class TestEdgeCases:
    """Test edge cases and error handling"""
    
    def test_add_duplicate_pool(self):
        """Should handle duplicate pool addresses"""
        registry = PoolRegistry()
        
        pool = PoolInfo(
            address='0xpool1',
            dex='quickswap',
            chain='polygon',
            token0='USDC',
            token0_address='0xUSDC',
            token1='USDT',
            token1_address='0xUSDT',
            fee_tier=0.003,
            pool_type='v2',
            created_at=1234567890
        )
        
        registry.add_pool(pool)
        registry.add_pool(pool)  # Add same pool again
        
        # Should update existing, not duplicate
        assert registry.stats['total_pools'] == 1
    
    def test_find_pools_with_no_matches(self):
        """Should handle query with no matching pools"""
        registry = PoolRegistry()
        
        pools = registry.find_pools_for_token_pair(
            '0xNONEXISTENT',
            '0xALSONONEXISTENT',
            chain='polygon'
        )
        
        assert len(pools) == 0
    
    def test_get_nonexistent_pool(self):
        """Should handle nonexistent pool gracefully"""
        registry = PoolRegistry()
        
        pool = registry.get_pool('polygon', 'quickswap', '0xNONEXISTENT')
        
        assert pool is None
    
    def test_empty_registry_statistics(self):
        """Should handle statistics for empty registry"""
        registry = PoolRegistry()
        
        assert registry.stats['total_pools'] == 0
        assert registry.get_total_tvl() == 0


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
