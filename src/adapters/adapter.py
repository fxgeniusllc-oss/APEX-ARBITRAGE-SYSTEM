"""
Base Adapter Module for DEX Integrations
Provides base classes and utilities for interacting with various DEX protocols
"""

from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional, Tuple
from web3 import Web3
from eth_typing import Address
import logging

logger = logging.getLogger(__name__)


class BaseAdapter(ABC):
    """
    Abstract base class for DEX adapters
    All DEX-specific adapters should inherit from this class
    """

    def __init__(self, web3: Web3, config: Dict[str, Any]):
        """
        Initialize the adapter
        
        Args:
            web3: Web3 instance connected to the blockchain
            config: Configuration dictionary containing contract addresses and settings
        """
        self.web3 = web3
        self.config = config
        self.contracts = {}
        self._initialize_contracts()

    @abstractmethod
    def _initialize_contracts(self):
        """Initialize contract instances - must be implemented by subclasses"""
        pass

    @abstractmethod
    def get_quote(self, token_in: Address, token_out: Address, amount_in: int) -> int:
        """
        Get quote for swap
        
        Args:
            token_in: Input token address
            token_out: Output token address
            amount_in: Input amount
            
        Returns:
            Expected output amount
        """
        pass

    @abstractmethod
    def execute_swap(
        self,
        token_in: Address,
        token_out: Address,
        amount_in: int,
        min_amount_out: int,
        recipient: Address,
        deadline: int
    ) -> str:
        """
        Execute swap
        
        Args:
            token_in: Input token address
            token_out: Output token address
            amount_in: Input amount
            min_amount_out: Minimum output amount (slippage protection)
            recipient: Recipient address
            deadline: Transaction deadline timestamp
            
        Returns:
            Transaction hash
        """
        pass

    def get_gas_estimate(
        self,
        token_in: Address,
        token_out: Address,
        amount_in: int
    ) -> int:
        """
        Estimate gas for swap transaction
        
        Args:
            token_in: Input token address
            token_out: Output token address
            amount_in: Input amount
            
        Returns:
            Estimated gas units
        """
        try:
            # This is a generic implementation
            # Subclasses can override for protocol-specific estimation
            return 150000
        except Exception as e:
            logger.error(f"Error estimating gas: {e}")
            return 200000  # Safe default

    def check_approval(
        self,
        token: Address,
        owner: Address,
        spender: Address
    ) -> int:
        """
        Check token approval amount
        
        Args:
            token: Token address
            owner: Owner address
            spender: Spender address
            
        Returns:
            Current allowance
        """
        try:
            token_abi = [
                {
                    "constant": True,
                    "inputs": [
                        {"name": "owner", "type": "address"},
                        {"name": "spender", "type": "address"}
                    ],
                    "name": "allowance",
                    "outputs": [{"name": "", "type": "uint256"}],
                    "type": "function"
                }
            ]
            token_contract = self.web3.eth.contract(address=token, abi=token_abi)
            return token_contract.functions.allowance(owner, spender).call()
        except Exception as e:
            logger.error(f"Error checking approval: {e}")
            return 0

    def approve_token(
        self,
        token: Address,
        spender: Address,
        amount: int,
        private_key: str
    ) -> str:
        """
        Approve token spending
        
        Args:
            token: Token address
            spender: Spender address
            amount: Approval amount
            private_key: Private key for signing
            
        Returns:
            Transaction hash
        """
        try:
            token_abi = [
                {
                    "constant": False,
                    "inputs": [
                        {"name": "spender", "type": "address"},
                        {"name": "amount", "type": "uint256"}
                    ],
                    "name": "approve",
                    "outputs": [{"name": "", "type": "bool"}],
                    "type": "function"
                }
            ]
            token_contract = self.web3.eth.contract(address=token, abi=token_abi)
            account = self.web3.eth.account.from_key(private_key)
            
            tx = token_contract.functions.approve(spender, amount).build_transaction({
                'from': account.address,
                'nonce': self.web3.eth.get_transaction_count(account.address),
                'gas': 100000,
                'gasPrice': self.web3.eth.gas_price
            })
            
            signed_tx = account.sign_transaction(tx)
            tx_hash = self.web3.eth.send_raw_transaction(signed_tx.rawTransaction)
            return tx_hash.hex()
        except Exception as e:
            logger.error(f"Error approving token: {e}")
            raise


class UniswapV2Adapter(BaseAdapter):
    """Adapter for Uniswap V2 and compatible DEXs (SushiSwap, QuickSwap, etc.)"""

    def _initialize_contracts(self):
        """Initialize Uniswap V2 contracts"""
        router_abi = [
            {
                "inputs": [
                    {"internalType": "uint256", "name": "amountIn", "type": "uint256"},
                    {"internalType": "address[]", "name": "path", "type": "address[]"}
                ],
                "name": "getAmountsOut",
                "outputs": [{"internalType": "uint256[]", "name": "amounts", "type": "uint256[]"}],
                "stateMutability": "view",
                "type": "function"
            }
        ]
        self.contracts['router'] = self.web3.eth.contract(
            address=self.config['router'],
            abi=router_abi
        )

    def get_quote(self, token_in: Address, token_out: Address, amount_in: int) -> int:
        """Get quote from Uniswap V2"""
        try:
            path = [token_in, token_out]
            amounts = self.contracts['router'].functions.getAmountsOut(amount_in, path).call()
            return amounts[-1]
        except Exception as e:
            logger.error(f"Error getting Uniswap V2 quote: {e}")
            return 0

    def execute_swap(
        self,
        token_in: Address,
        token_out: Address,
        amount_in: int,
        min_amount_out: int,
        recipient: Address,
        deadline: int
    ) -> str:
        """Execute swap on Uniswap V2"""
        # Implementation would require full router ABI and transaction signing
        raise NotImplementedError("Execute swap requires full implementation")


class UniswapV3Adapter(BaseAdapter):
    """Adapter for Uniswap V3"""

    def _initialize_contracts(self):
        """Initialize Uniswap V3 contracts"""
        quoter_abi = [
            {
                "inputs": [
                    {"internalType": "address", "name": "tokenIn", "type": "address"},
                    {"internalType": "address", "name": "tokenOut", "type": "address"},
                    {"internalType": "uint24", "name": "fee", "type": "uint24"},
                    {"internalType": "uint256", "name": "amountIn", "type": "uint256"},
                    {"internalType": "uint160", "name": "sqrtPriceLimitX96", "type": "uint160"}
                ],
                "name": "quoteExactInputSingle",
                "outputs": [{"internalType": "uint256", "name": "amountOut", "type": "uint256"}],
                "stateMutability": "nonpayable",
                "type": "function"
            }
        ]
        self.contracts['quoter'] = self.web3.eth.contract(
            address=self.config['quoter'],
            abi=quoter_abi
        )

    def get_quote(self, token_in: Address, token_out: Address, amount_in: int, fee: int = 3000) -> int:
        """Get quote from Uniswap V3"""
        try:
            # Note: This requires a static call
            amount_out = self.contracts['quoter'].functions.quoteExactInputSingle(
                token_in,
                token_out,
                fee,
                amount_in,
                0
            ).call()
            return amount_out
        except Exception as e:
            logger.error(f"Error getting Uniswap V3 quote: {e}")
            return 0

    def execute_swap(
        self,
        token_in: Address,
        token_out: Address,
        amount_in: int,
        min_amount_out: int,
        recipient: Address,
        deadline: int
    ) -> str:
        """Execute swap on Uniswap V3"""
        # Implementation would require full router ABI and transaction signing
        raise NotImplementedError("Execute swap requires full implementation")


class AdapterFactory:
    """Factory for creating appropriate adapter instances"""

    @staticmethod
    def create_adapter(
        adapter_type: str,
        web3: Web3,
        config: Dict[str, Any]
    ) -> BaseAdapter:
        """
        Create adapter instance
        
        Args:
            adapter_type: Type of adapter ('uniswap-v2', 'uniswap-v3', etc.)
            web3: Web3 instance
            config: Configuration dictionary
            
        Returns:
            Adapter instance
        """
        adapters = {
            'uniswap-v2': UniswapV2Adapter,
            'uniswap-v3': UniswapV3Adapter,
            'sushiswap': UniswapV2Adapter,
            'quickswap': UniswapV2Adapter
        }
        
        adapter_class = adapters.get(adapter_type)
        if not adapter_class:
            raise ValueError(f"Unknown adapter type: {adapter_type}")
        
        return adapter_class(web3, config)


# Export public interface
__all__ = [
    'BaseAdapter',
    'UniswapV2Adapter',
    'UniswapV3Adapter',
    'AdapterFactory'
]
