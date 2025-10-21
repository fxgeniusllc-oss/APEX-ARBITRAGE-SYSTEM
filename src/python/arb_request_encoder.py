"""
Arbitrage Request Encoder
Encodes arbitrage opportunities into optimized request formats
Supports multi-hop routes, flash loan encoding, and calldata generation
"""

import json
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
from web3 import Web3
from eth_abi import encode


class DexType(Enum):
    """Supported DEX types"""
    UNISWAP_V2 = "uniswap-v2"
    UNISWAP_V3 = "uniswap-v3"
    SUSHISWAP = "sushiswap"
    QUICKSWAP = "quickswap"
    BALANCER_V2 = "balancer-v2"
    CURVE = "curve"


class FlashLoanProvider(Enum):
    """Flash loan providers"""
    BALANCER = "balancer"
    AAVE = "aave"
    DODO = "dodo"


@dataclass
class SwapStep:
    """Represents a single swap in a multi-hop route"""
    dex: str
    dex_type: DexType
    pool_address: str
    token_in: str
    token_out: str
    amount_in: str
    expected_amount_out: str
    slippage_bps: int
    fee_tier: Optional[int] = None  # For Uniswap V3


@dataclass
class ArbitrageRoute:
    """Represents a complete arbitrage route"""
    route_id: str
    chain: str
    flash_loan_provider: FlashLoanProvider
    flash_loan_token: str
    flash_loan_amount: str
    steps: List[SwapStep]
    expected_profit: str
    gas_estimate: int
    deadline: int
    timestamp: int


class ArbRequestEncoder:
    """Encodes arbitrage requests for on-chain execution"""
    
    def __init__(self):
        """Initialize the encoder"""
        self.w3 = Web3()
    
    def encode_uniswap_v2_swap(
        self, 
        step: SwapStep,
        recipient: str,
        deadline: int
    ) -> Dict[str, any]:
        """
        Encode Uniswap V2 style swap
        
        Args:
            step: Swap step details
            recipient: Recipient address
            deadline: Transaction deadline
            
        Returns:
            Encoded swap data
        """
        # Uniswap V2 Router function signature
        # swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline)
        
        amount_out_min = int(int(step.expected_amount_out) * (10000 - step.slippage_bps) / 10000)
        
        path = [
            Web3.to_checksum_address(step.token_in),
            Web3.to_checksum_address(step.token_out)
        ]
        
        function_signature = self.w3.keccak(
            text="swapExactTokensForTokens(uint256,uint256,address[],address,uint256)"
        )[:4]
        
        encoded_params = encode(
            ['uint256', 'uint256', 'address[]', 'address', 'uint256'],
            [
                int(step.amount_in),
                amount_out_min,
                path,
                Web3.to_checksum_address(recipient),
                deadline
            ]
        )
        
        return {
            'target': step.pool_address,
            'calldata': function_signature.hex() + encoded_params.hex(),
            'value': 0
        }
    
    def encode_uniswap_v3_swap(
        self, 
        step: SwapStep,
        recipient: str,
        deadline: int
    ) -> Dict[str, any]:
        """
        Encode Uniswap V3 swap
        
        Args:
            step: Swap step details
            recipient: Recipient address
            deadline: Transaction deadline
            
        Returns:
            Encoded swap data
        """
        # Uniswap V3 Router function signature
        # exactInputSingle(ExactInputSingleParams params)
        
        amount_out_min = int(int(step.expected_amount_out) * (10000 - step.slippage_bps) / 10000)
        
        # ExactInputSingleParams struct
        params = {
            'tokenIn': Web3.to_checksum_address(step.token_in),
            'tokenOut': Web3.to_checksum_address(step.token_out),
            'fee': step.fee_tier or 3000,
            'recipient': Web3.to_checksum_address(recipient),
            'deadline': deadline,
            'amountIn': int(step.amount_in),
            'amountOutMinimum': amount_out_min,
            'sqrtPriceLimitX96': 0
        }
        
        function_signature = self.w3.keccak(
            text="exactInputSingle((address,address,uint24,address,uint256,uint256,uint256,uint160))"
        )[:4]
        
        encoded_params = encode(
            ['address', 'address', 'uint24', 'address', 'uint256', 'uint256', 'uint256', 'uint160'],
            [
                params['tokenIn'],
                params['tokenOut'],
                params['fee'],
                params['recipient'],
                params['deadline'],
                params['amountIn'],
                params['amountOutMinimum'],
                params['sqrtPriceLimitX96']
            ]
        )
        
        return {
            'target': step.pool_address,
            'calldata': function_signature.hex() + encoded_params.hex(),
            'value': 0
        }
    
    def encode_balancer_flashloan(
        self, 
        route: ArbitrageRoute,
        executor_address: str
    ) -> Dict[str, any]:
        """
        Encode Balancer flash loan request
        
        Args:
            route: Complete arbitrage route
            executor_address: Address of executor contract
            
        Returns:
            Encoded flash loan data
        """
        # Balancer Vault flashLoan function
        # flashLoan(address recipient, address[] tokens, uint256[] amounts, bytes userData)
        
        tokens = [Web3.to_checksum_address(route.flash_loan_token)]
        amounts = [int(route.flash_loan_amount)]
        
        # Encode swap steps into userData
        user_data = self.encode_swap_steps(route.steps, route.deadline)
        
        function_signature = self.w3.keccak(
            text="flashLoan(address,address[],uint256[],bytes)"
        )[:4]
        
        encoded_params = encode(
            ['address', 'address[]', 'uint256[]', 'bytes'],
            [
                Web3.to_checksum_address(executor_address),
                tokens,
                amounts,
                bytes.fromhex(user_data)
            ]
        )
        
        return {
            'function': 'flashLoan',
            'calldata': function_signature.hex() + encoded_params.hex(),
            'vault': '0xBA12222222228d8Ba445958a75a0704d566BF2C8'  # Balancer Vault
        }
    
    def encode_swap_steps(
        self, 
        steps: List[SwapStep],
        deadline: int
    ) -> str:
        """
        Encode multiple swap steps into a single calldata
        
        Args:
            steps: List of swap steps
            deadline: Transaction deadline
            
        Returns:
            Encoded swap steps as hex string
        """
        # Encode each step based on DEX type
        encoded_steps = []
        
        for step in steps:
            if step.dex_type == DexType.UNISWAP_V2:
                encoded_steps.append({
                    'type': 'v2',
                    'pool': step.pool_address,
                    'tokenIn': step.token_in,
                    'tokenOut': step.token_out,
                    'amountIn': step.amount_in,
                    'amountOutMin': str(int(int(step.expected_amount_out) * (10000 - step.slippage_bps) / 10000))
                })
            elif step.dex_type == DexType.UNISWAP_V3:
                encoded_steps.append({
                    'type': 'v3',
                    'pool': step.pool_address,
                    'tokenIn': step.token_in,
                    'tokenOut': step.token_out,
                    'fee': step.fee_tier or 3000,
                    'amountIn': step.amount_in,
                    'amountOutMin': str(int(int(step.expected_amount_out) * (10000 - step.slippage_bps) / 10000))
                })
            elif step.dex_type == DexType.BALANCER_V2:
                encoded_steps.append({
                    'type': 'balancer',
                    'poolId': step.pool_address,
                    'tokenIn': step.token_in,
                    'tokenOut': step.token_out,
                    'amountIn': step.amount_in
                })
        
        # Convert to JSON and then to hex
        steps_json = json.dumps({
            'steps': encoded_steps,
            'deadline': deadline
        })
        
        return steps_json.encode().hex()
    
    def encode_route(
        self, 
        route: ArbitrageRoute,
        executor_address: str
    ) -> Dict[str, any]:
        """
        Encode a complete arbitrage route
        
        Args:
            route: Arbitrage route to encode
            executor_address: Address of executor contract
            
        Returns:
            Complete encoded route ready for submission
        """
        # Encode flash loan request
        flash_loan_data = self.encode_balancer_flashloan(route, executor_address)
        
        return {
            'route_id': route.route_id,
            'chain': route.chain,
            'flash_loan': flash_loan_data,
            'expected_profit': route.expected_profit,
            'gas_estimate': route.gas_estimate,
            'timestamp': route.timestamp
        }
    
    def calculate_min_profit_after_gas(
        self, 
        expected_profit_wei: int,
        gas_estimate: int,
        gas_price_wei: int
    ) -> int:
        """
        Calculate minimum profit after gas costs
        
        Args:
            expected_profit_wei: Expected profit in wei
            gas_estimate: Estimated gas units
            gas_price_wei: Gas price in wei
            
        Returns:
            Net profit in wei
        """
        gas_cost = gas_estimate * gas_price_wei
        return expected_profit_wei - gas_cost
    
    def validate_route(self, route: ArbitrageRoute) -> Tuple[bool, str]:
        """
        Validate an arbitrage route
        
        Args:
            route: Route to validate
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        if not route.steps:
            return False, "Route has no steps"
        
        if len(route.steps) > 5:
            return False, "Route has too many steps (max 5)"
        
        # Validate token flow
        for i in range(len(route.steps) - 1):
            if route.steps[i].token_out != route.steps[i + 1].token_in:
                return False, f"Token mismatch at step {i}: {route.steps[i].token_out} != {route.steps[i + 1].token_in}"
        
        # First step should use flash loan token
        if route.steps[0].token_in != route.flash_loan_token:
            return False, "First step must start with flash loan token"
        
        # Last step should return to flash loan token
        if route.steps[-1].token_out != route.flash_loan_token:
            return False, "Last step must return to flash loan token"
        
        return True, "Route is valid"
    
    def optimize_route(self, route: ArbitrageRoute) -> ArbitrageRoute:
        """
        Optimize a route by adjusting slippage and amounts
        
        Args:
            route: Route to optimize
            
        Returns:
            Optimized route
        """
        # This is a simplified optimization
        # In production, this would use more sophisticated algorithms
        
        optimized_steps = []
        for step in route.steps:
            # Adjust slippage based on pool liquidity
            # Higher liquidity = lower slippage tolerance needed
            optimized_step = SwapStep(
                dex=step.dex,
                dex_type=step.dex_type,
                pool_address=step.pool_address,
                token_in=step.token_in,
                token_out=step.token_out,
                amount_in=step.amount_in,
                expected_amount_out=step.expected_amount_out,
                slippage_bps=min(step.slippage_bps, 100),  # Cap at 1%
                fee_tier=step.fee_tier
            )
            optimized_steps.append(optimized_step)
        
        return ArbitrageRoute(
            route_id=route.route_id,
            chain=route.chain,
            flash_loan_provider=route.flash_loan_provider,
            flash_loan_token=route.flash_loan_token,
            flash_loan_amount=route.flash_loan_amount,
            steps=optimized_steps,
            expected_profit=route.expected_profit,
            gas_estimate=route.gas_estimate,
            deadline=route.deadline,
            timestamp=route.timestamp
        )
    
    def to_json(self, route: ArbitrageRoute) -> str:
        """Convert route to JSON string"""
        return json.dumps({
            'route_id': route.route_id,
            'chain': route.chain,
            'flash_loan_provider': route.flash_loan_provider.value,
            'flash_loan_token': route.flash_loan_token,
            'flash_loan_amount': route.flash_loan_amount,
            'steps': [
                {
                    'dex': step.dex,
                    'dex_type': step.dex_type.value,
                    'pool_address': step.pool_address,
                    'token_in': step.token_in,
                    'token_out': step.token_out,
                    'amount_in': step.amount_in,
                    'expected_amount_out': step.expected_amount_out,
                    'slippage_bps': step.slippage_bps,
                    'fee_tier': step.fee_tier
                }
                for step in route.steps
            ],
            'expected_profit': route.expected_profit,
            'gas_estimate': route.gas_estimate,
            'deadline': route.deadline,
            'timestamp': route.timestamp
        }, indent=2)


def main():
    """Example usage"""
    print("🚀 Arbitrage Request Encoder Example\n")
    
    # Create encoder
    encoder = ArbRequestEncoder()
    
    # Create sample arbitrage route
    steps = [
        SwapStep(
            dex='quickswap',
            dex_type=DexType.UNISWAP_V2,
            pool_address='0x5757371414417b8C6CAad45bAeF941aBc7d3Ab32',
            token_in='0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',  # USDC
            token_out='0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',  # WMATIC
            amount_in=str(10000 * 10**6),  # 10,000 USDC
            expected_amount_out=str(12000 * 10**18),  # 12,000 WMATIC
            slippage_bps=50  # 0.5%
        ),
        SwapStep(
            dex='sushiswap',
            dex_type=DexType.UNISWAP_V2,
            pool_address='0xc35DADB65012eC5796536bD9864eD8773aBc74C4',
            token_in='0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',  # WMATIC
            token_out='0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',  # USDC
            amount_in=str(12000 * 10**18),  # 12,000 WMATIC
            expected_amount_out=str(10050 * 10**6),  # 10,050 USDC (profit!)
            slippage_bps=50
        )
    ]
    
    route = ArbitrageRoute(
        route_id='test_route_001',
        chain='polygon',
        flash_loan_provider=FlashLoanProvider.BALANCER,
        flash_loan_token='0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',  # USDC
        flash_loan_amount=str(10000 * 10**6),
        steps=steps,
        expected_profit=str(50 * 10**6),  # 50 USDC profit
        gas_estimate=350000,
        deadline=int(1000000000000),  # Far future for testing
        timestamp=int(1000000000)
    )
    
    # Validate route
    is_valid, message = encoder.validate_route(route)
    print(f"Route validation: {is_valid} - {message}\n")
    
    if is_valid:
        # Optimize route
        optimized_route = encoder.optimize_route(route)
        print("✅ Route optimized\n")
        
        # Encode route
        encoded = encoder.encode_route(
            optimized_route,
            executor_address='0x0000000000000000000000000000000000000000'
        )
        
        print("📦 Encoded route:")
        print(json.dumps(encoded, indent=2))
        print()
        
        # Export to JSON
        json_str = encoder.to_json(optimized_route)
        print("📄 Route JSON:")
        print(json_str)


if __name__ == '__main__':
    main()
