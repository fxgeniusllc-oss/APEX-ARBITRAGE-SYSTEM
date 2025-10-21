"""
Tests for Python TVL Fetchers and Arbitrage Encoder
"""

import sys
import os
import asyncio
import unittest

# Add src/python to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../src/python'))

from uniswapv3_tvl_fetcher import UniswapV3TVLFetcher, UniswapV3Pool, GRAPH_ENDPOINTS
from balancer_tvl_fetcher import BalancerTVLFetcher, BalancerPool, POOL_TYPES
from arb_request_encoder import (
    ArbRequestEncoder, 
    ArbitrageRoute, 
    SwapStep, 
    DexType, 
    FlashLoanProvider
)


class TestUniswapV3TVLFetcher(unittest.TestCase):
    """Test Uniswap V3 TVL Fetcher"""
    
    def test_initialization(self):
        """Test fetcher initialization"""
        fetcher = UniswapV3TVLFetcher(min_tvl_usd=10000)
        self.assertEqual(fetcher.min_tvl_usd, 10000)
        self.assertIsNone(fetcher.session)
        self.assertEqual(len(fetcher.pools_cache), 0)
    
    def test_graph_endpoints_exist(self):
        """Test that Graph endpoints are defined"""
        self.assertIn('polygon', GRAPH_ENDPOINTS)
        self.assertIn('ethereum', GRAPH_ENDPOINTS)
        self.assertIn('arbitrum', GRAPH_ENDPOINTS)
        self.assertIn('optimism', GRAPH_ENDPOINTS)
    
    def test_filter_by_tvl(self):
        """Test TVL filtering"""
        fetcher = UniswapV3TVLFetcher()
        pools = [
            UniswapV3Pool(
                id='1', token0='A', token1='B', token0_symbol='TA',
                token1_symbol='TB', fee_tier=3000, liquidity='1000',
                sqrt_price='1', tick=0, tvl_usd=50000, volume_24h_usd=1000,
                fee_apr=5.0, timestamp=1000000
            ),
            UniswapV3Pool(
                id='2', token0='C', token1='D', token0_symbol='TC',
                token1_symbol='TD', fee_tier=3000, liquidity='500',
                sqrt_price='1', tick=0, tvl_usd=5000, volume_24h_usd=100,
                fee_apr=2.0, timestamp=1000000
            )
        ]
        
        filtered = fetcher.filter_by_tvl(pools, 10000)
        self.assertEqual(len(filtered), 1)
        self.assertEqual(filtered[0].tvl_usd, 50000)
    
    def test_get_top_pools(self):
        """Test getting top pools"""
        fetcher = UniswapV3TVLFetcher()
        pools = [
            UniswapV3Pool(
                id='1', token0='A', token1='B', token0_symbol='TA',
                token1_symbol='TB', fee_tier=3000, liquidity='1000',
                sqrt_price='1', tick=0, tvl_usd=30000, volume_24h_usd=1000,
                fee_apr=5.0, timestamp=1000000
            ),
            UniswapV3Pool(
                id='2', token0='C', token1='D', token0_symbol='TC',
                token1_symbol='TD', fee_tier=3000, liquidity='500',
                sqrt_price='1', tick=0, tvl_usd=50000, volume_24h_usd=2000,
                fee_apr=8.0, timestamp=1000000
            ),
            UniswapV3Pool(
                id='3', token0='E', token1='F', token0_symbol='TE',
                token1_symbol='TF', fee_tier=3000, liquidity='2000',
                sqrt_price='1', tick=0, tvl_usd=40000, volume_24h_usd=1500,
                fee_apr=6.0, timestamp=1000000
            )
        ]
        
        top_by_tvl = fetcher.get_top_pools(pools, n=2, sort_by='tvl')
        self.assertEqual(len(top_by_tvl), 2)
        self.assertEqual(top_by_tvl[0].tvl_usd, 50000)
        
        top_by_apr = fetcher.get_top_pools(pools, n=2, sort_by='apr')
        self.assertEqual(len(top_by_apr), 2)
        self.assertEqual(top_by_apr[0].fee_apr, 8.0)


class TestBalancerTVLFetcher(unittest.TestCase):
    """Test Balancer TVL Fetcher"""
    
    def test_initialization(self):
        """Test fetcher initialization"""
        fetcher = BalancerTVLFetcher(min_tvl_usd=5000)
        self.assertEqual(fetcher.min_tvl_usd, 5000)
        self.assertIsNone(fetcher.session)
        self.assertEqual(len(fetcher.pools_cache), 0)
    
    def test_pool_types_exist(self):
        """Test that pool types are defined"""
        self.assertIn('Weighted', POOL_TYPES)
        self.assertIn('Stable', POOL_TYPES)
        self.assertIn('ComposableStable', POOL_TYPES)
    
    def test_filter_stable_pools(self):
        """Test stable pool filtering"""
        fetcher = BalancerTVLFetcher()
        pools = [
            BalancerPool(
                id='1', address='0x1', pool_type='StablePool',
                tokens=['A', 'B'], token_symbols=['TA', 'TB'],
                token_balances=['1000', '1000'], token_weights=[0.5, 0.5],
                swap_fee=0.001, tvl_usd=100000, volume_24h_usd=5000,
                fee_apr=5.0, total_liquidity='100000', total_shares='10000',
                chain='polygon', timestamp=1000000
            ),
            BalancerPool(
                id='2', address='0x2', pool_type='WeightedPool',
                tokens=['C', 'D'], token_symbols=['TC', 'TD'],
                token_balances=['500', '1500'], token_weights=[0.2, 0.8],
                swap_fee=0.002, tvl_usd=50000, volume_24h_usd=2000,
                fee_apr=4.0, total_liquidity='50000', total_shares='5000',
                chain='polygon', timestamp=1000000
            )
        ]
        
        stable = fetcher.filter_stable_pools(pools)
        self.assertEqual(len(stable), 1)
        self.assertEqual(stable[0].pool_type, 'StablePool')


class TestArbRequestEncoder(unittest.TestCase):
    """Test Arbitrage Request Encoder"""
    
    def test_initialization(self):
        """Test encoder initialization"""
        encoder = ArbRequestEncoder()
        self.assertIsNotNone(encoder.w3)
    
    def test_validate_route_empty_steps(self):
        """Test validation with empty steps"""
        encoder = ArbRequestEncoder()
        route = ArbitrageRoute(
            route_id='test',
            chain='polygon',
            flash_loan_provider=FlashLoanProvider.BALANCER,
            flash_loan_token='0x123',
            flash_loan_amount='1000',
            steps=[],
            expected_profit='10',
            gas_estimate=350000,
            deadline=1000000,
            timestamp=1000000
        )
        
        is_valid, message = encoder.validate_route(route)
        self.assertFalse(is_valid)
        self.assertIn('no steps', message)
    
    def test_validate_route_too_many_steps(self):
        """Test validation with too many steps"""
        encoder = ArbRequestEncoder()
        steps = [
            SwapStep(
                dex='test', dex_type=DexType.UNISWAP_V2,
                pool_address='0x1', token_in='0xa', token_out='0xb',
                amount_in='1000', expected_amount_out='1100',
                slippage_bps=50
            )
            for _ in range(6)
        ]
        
        route = ArbitrageRoute(
            route_id='test',
            chain='polygon',
            flash_loan_provider=FlashLoanProvider.BALANCER,
            flash_loan_token='0x123',
            flash_loan_amount='1000',
            steps=steps,
            expected_profit='10',
            gas_estimate=350000,
            deadline=1000000,
            timestamp=1000000
        )
        
        is_valid, message = encoder.validate_route(route)
        self.assertFalse(is_valid)
        self.assertIn('too many steps', message)
    
    def test_validate_valid_route(self):
        """Test validation with valid route"""
        encoder = ArbRequestEncoder()
        steps = [
            SwapStep(
                dex='quickswap', dex_type=DexType.UNISWAP_V2,
                pool_address='0x1', token_in='0xUSDC', token_out='0xWMATIC',
                amount_in='1000', expected_amount_out='1100',
                slippage_bps=50
            ),
            SwapStep(
                dex='sushiswap', dex_type=DexType.UNISWAP_V2,
                pool_address='0x2', token_in='0xWMATIC', token_out='0xUSDC',
                amount_in='1100', expected_amount_out='1050',
                slippage_bps=50
            )
        ]
        
        route = ArbitrageRoute(
            route_id='test',
            chain='polygon',
            flash_loan_provider=FlashLoanProvider.BALANCER,
            flash_loan_token='0xUSDC',
            flash_loan_amount='1000',
            steps=steps,
            expected_profit='50',
            gas_estimate=350000,
            deadline=1000000,
            timestamp=1000000
        )
        
        is_valid, message = encoder.validate_route(route)
        self.assertTrue(is_valid)
    
    def test_calculate_min_profit(self):
        """Test profit calculation after gas"""
        encoder = ArbRequestEncoder()
        profit = 100_000_000  # 0.1 ETH
        gas = 350_000
        gas_price = 50_000_000_000  # 50 Gwei
        
        net_profit = encoder.calculate_min_profit_after_gas(profit, gas, gas_price)
        expected = profit - (gas * gas_price)
        self.assertEqual(net_profit, expected)


class TestIntegration(unittest.TestCase):
    """Integration tests"""
    
    def test_all_modules_importable(self):
        """Test that all modules can be imported"""
        # If we got here, imports at top succeeded
        self.assertTrue(True)
    
    def test_dataclasses_instantiable(self):
        """Test that dataclasses can be instantiated"""
        pool = UniswapV3Pool(
            id='1', token0='A', token1='B', token0_symbol='TA',
            token1_symbol='TB', fee_tier=3000, liquidity='1000',
            sqrt_price='1', tick=0, tvl_usd=10000, volume_24h_usd=1000,
            fee_apr=5.0, timestamp=1000000
        )
        self.assertEqual(pool.id, '1')
        
        balancer_pool = BalancerPool(
            id='1', address='0x1', pool_type='StablePool',
            tokens=['A'], token_symbols=['TA'], token_balances=['1000'],
            token_weights=[1.0], swap_fee=0.001, tvl_usd=10000,
            volume_24h_usd=1000, fee_apr=5.0, total_liquidity='10000',
            total_shares='1000', chain='polygon', timestamp=1000000
        )
        self.assertEqual(balancer_pool.id, '1')


if __name__ == '__main__':
    unittest.main()
