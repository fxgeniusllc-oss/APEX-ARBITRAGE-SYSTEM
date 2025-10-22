"""
APEX System Configuration - Python Module
Centralized configuration management for Python components
Loads and validates all environment variables
"""

import os
from typing import Optional, Any
from enum import Enum
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


class ExecutionMode(Enum):
    """Execution mode configuration"""
    LIVE = "LIVE"  # Execute real transactions
    DEV = "DEV"    # Dry-run with real data
    SIM = "SIM"    # Simulation/backtesting mode


class ChainType(Enum):
    """Supported blockchain networks"""
    POLYGON = "polygon"
    ETHEREUM = "ethereum"
    ARBITRUM = "arbitrum"
    OPTIMISM = "optimism"
    BASE = "base"
    BSC = "bsc"


def get_env(key: str, default: Optional[str] = None) -> Optional[str]:
    """
    Get environment variable with optional default
    
    Args:
        key: Environment variable key
        default: Default value if not set
        
    Returns:
        Environment variable value or default
    """
    value = os.getenv(key)
    if value is None and default is None:
        print(f"⚠️  Environment variable {key} is not set")
    return value or default


def get_required_env(key: str) -> str:
    """
    Get required environment variable
    
    Args:
        key: Environment variable key
        
    Returns:
        Environment variable value
        
    Raises:
        ValueError: If environment variable is not set
    """
    value = os.getenv(key)
    if not value:
        raise ValueError(f"Required environment variable {key} is not set. Please check your .env file.")
    return value


def get_bool_env(key: str, default: bool = False) -> bool:
    """
    Parse boolean environment variable
    
    Args:
        key: Environment variable key
        default: Default value if not set
        
    Returns:
        Parsed boolean value
    """
    value = os.getenv(key)
    if value is None:
        return default
    return value.lower() in ('true', '1', 'yes', 'on')


def get_int_env(key: str, default: int = 0) -> int:
    """
    Parse integer environment variable
    
    Args:
        key: Environment variable key
        default: Default value if not set
        
    Returns:
        Parsed integer value
    """
    value = os.getenv(key)
    if value is None:
        return default
    try:
        return int(value)
    except ValueError:
        print(f"⚠️  Invalid integer value for {key}: {value}, using default: {default}")
        return default


def get_float_env(key: str, default: float = 0.0) -> float:
    """
    Parse float environment variable
    
    Args:
        key: Environment variable key
        default: Default value if not set
        
    Returns:
        Parsed float value
    """
    value = os.getenv(key)
    if value is None:
        return default
    try:
        return float(value)
    except ValueError:
        print(f"⚠️  Invalid float value for {key}: {value}, using default: {default}")
        return default


# ========================================
# EXECUTION MODE CONFIGURATION
# ========================================
CURRENT_MODE_STR = get_env('MODE', 'DEV').upper()
try:
    CURRENT_MODE = ExecutionMode[CURRENT_MODE_STR]
except KeyError:
    print(f"⚠️  Invalid MODE: {CURRENT_MODE_STR}, defaulting to DEV")
    CURRENT_MODE = ExecutionMode.DEV

MODE_DESCRIPTIONS = {
    ExecutionMode.LIVE: 'LIVE MODE - Executes real arbitrage transactions on-chain (PRODUCTION)',
    ExecutionMode.DEV: 'DEV MODE - Runs all logic with real data but simulates transactions (dry-run)',
    ExecutionMode.SIM: 'SIM MODE - Simulation mode for backtesting and strategy testing with real market data'
}


# ========================================
# NETWORK/CHAIN CONFIGURATION
# ========================================
class ChainConfig:
    """Chain configuration"""
    def __init__(self, name: str, chain_id: int, native_currency: str, 
                 rpc_url: Optional[str], wss_url: Optional[str], explorer_url: str):
        self.name = name
        self.chain_id = chain_id
        self.native_currency = native_currency
        self.rpc_url = rpc_url
        self.wss_url = wss_url
        self.explorer_url = explorer_url


CHAINS = {
    ChainType.POLYGON: ChainConfig(
        name='Polygon',
        chain_id=137,
        native_currency='MATIC',
        rpc_url=get_env('POLYGON_RPC_URL'),
        wss_url=get_env('POLYGON_WSS_URL'),
        explorer_url='https://polygonscan.com'
    ),
    ChainType.ETHEREUM: ChainConfig(
        name='Ethereum',
        chain_id=1,
        native_currency='ETH',
        rpc_url=get_env('ETHEREUM_RPC_URL'),
        wss_url=get_env('ETHEREUM_WSS_URL'),
        explorer_url='https://etherscan.io'
    ),
    ChainType.ARBITRUM: ChainConfig(
        name='Arbitrum',
        chain_id=42161,
        native_currency='ETH',
        rpc_url=get_env('ARBITRUM_RPC_URL'),
        wss_url=None,
        explorer_url='https://arbiscan.io'
    ),
    ChainType.OPTIMISM: ChainConfig(
        name='Optimism',
        chain_id=10,
        native_currency='ETH',
        rpc_url=get_env('OPTIMISM_RPC_URL'),
        wss_url=None,
        explorer_url='https://optimistic.etherscan.io'
    ),
    ChainType.BASE: ChainConfig(
        name='Base',
        chain_id=8453,
        native_currency='ETH',
        rpc_url=get_env('BASE_RPC_URL'),
        wss_url=None,
        explorer_url='https://basescan.org'
    ),
    ChainType.BSC: ChainConfig(
        name='BSC',
        chain_id=56,
        native_currency='BNB',
        rpc_url=get_env('BSC_RPC_URL'),
        wss_url=None,
        explorer_url='https://bscscan.com'
    )
}


# ========================================
# ML MODEL CONFIGURATION
# ========================================
class MLConfig:
    """Machine Learning model configuration"""
    confidence_threshold = get_float_env('ML_CONFIDENCE_THRESHOLD', 0.8)
    enable_filtering = get_bool_env('ENABLE_ML_FILTERING', True)
    xgboost_model_path = get_env('XGBOOST_MODEL_PATH', 'data/models/xgboost_model.json')
    onnx_model_path = get_env('ONNX_MODEL_PATH', 'data/models/onnx_model.onnx')
    
    features = [
        'profit_usd',
        'profit_ratio',
        'route_complexity',
        'gas_estimate',
        'confidence_score',
        'time_of_day',
        'dex_count',
        'amount_size',
        'is_2hop',
        'is_3hop'
    ]


# ========================================
# SAFETY AND EXECUTION PARAMETERS
# ========================================
class SafetyConfig:
    """Safety and risk management configuration"""
    min_profit_usd = get_float_env('MIN_PROFIT_USD', 5.0)
    max_gas_price_gwei = get_float_env('MAX_GAS_PRICE_GWEI', 100.0)
    slippage_bps = get_float_env('SLIPPAGE_BPS', 50.0)
    max_daily_loss_usd = get_float_env('MAX_DAILY_LOSS_USD', 50.0)
    max_consecutive_failures = get_int_env('MAX_CONSECUTIVE_FAILURES', 5)
    min_time_between_trades = get_int_env('MIN_TIME_BETWEEN_TRADES', 30000)


# ========================================
# SYSTEM CONFIGURATION
# ========================================
class SystemConfig:
    """General system configuration"""
    scan_interval = get_int_env('SCAN_INTERVAL', 60000)
    enable_cross_chain = get_bool_env('ENABLE_CROSS_CHAIN', True)
    enable_mempool_monitoring = get_bool_env('ENABLE_MEMPOOL_MONITORING', True)
    enable_micro_raptor_bots = get_bool_env('ENABLE_MICRO_RAPTOR_BOTS', True)
    raptor_bot_count = get_int_env('RAPTOR_BOT_COUNT', 4)
    rust_engine_enabled = get_bool_env('RUST_ENGINE_ENABLED', True)


# ========================================
# WALLET CONFIGURATION
# ========================================
class WalletConfig:
    """Wallet and private key configuration"""
    private_key = get_env('PRIVATE_KEY', '')


# ========================================
# AI ENGINE CONFIGURATION
# ========================================
class AIEngineConfig:
    """Hybrid AI Engine configuration"""
    live_trading = get_bool_env('LIVE_TRADING', False)
    model_path = get_env('AI_MODEL_PATH', './data/models/lstm_omni.onnx')
    threshold = get_float_env('AI_THRESHOLD', 0.78)
    engine_port = get_int_env('AI_ENGINE_PORT', 8001)
    rust_engine_url = get_env('RUST_ENGINE_URL', 'http://localhost:7000')


# ========================================
# BLOXROUTE CONFIGURATION
# ========================================
class BloxrouteConfig:
    """BloXroute MEV network configuration"""
    auth_token = get_env('BLOXROUTE_AUTH_TOKEN', '')
    gateway_url = get_env('BLOXROUTE_GATEWAY_URL', 'https://api.blxrbdn.com')
    enabled = get_bool_env('ENABLE_BLOXROUTE', False)


# ========================================
# BATCH PROCESSING CONFIGURATION
# ========================================
class BatchProcessingConfig:
    """Merkle tree batch processing configuration"""
    processor_address = get_env('BATCH_PROCESSOR_ADDRESS', '0x0000000000000000000000000000000000000000')
    enabled = get_bool_env('ENABLE_BATCH_PROCESSING', False)
    min_batch_size = get_int_env('MIN_BATCH_SIZE', 5)
    max_batch_size = get_int_env('MAX_BATCH_SIZE', 50)


# ========================================
# REDIS CONFIGURATION
# ========================================
class RedisConfig:
    """Redis cache configuration"""
    host = get_env('REDIS_HOST', '127.0.0.1')
    port = get_int_env('REDIS_PORT', 6379)


# ========================================
# PROMETHEUS CONFIGURATION
# ========================================
class PrometheusConfig:
    """Prometheus metrics configuration"""
    port = get_int_env('PROMETHEUS_PORT', 9090)


# ========================================
# BRIDGE CONFIGURATION
# ========================================
class BridgeConfig:
    """Cross-chain bridge configuration"""
    enable_layer_zero = get_bool_env('ENABLE_LAYER_ZERO_BRIDGE', True)
    enable_across = get_bool_env('ENABLE_ACROSS_BRIDGE', True)


# ========================================
# TELEGRAM CONFIGURATION
# ========================================
class TelegramConfig:
    """Telegram bot alerting configuration"""
    bot_token = get_env('TELEGRAM_BOT_TOKEN', '')
    chat_id = get_env('TELEGRAM_CHAT_ID', '')
    enabled = get_bool_env('ENABLE_TELEGRAM_ALERTS', False)


# ========================================
# MEV PROTECTION CONFIGURATION
# ========================================
class MEVConfig:
    """MEV protection and private relay configuration"""
    use_private_relay = get_bool_env('USE_PRIVATE_RELAY', True)
    flashbots_relay_url = get_env('FLASHBOTS_RELAY_URL', 'https://relay.flashbots.net')
    eden_relay_url = get_env('EDEN_RELAY_URL', 'https://api.edennetwork.io/v1/rpc')


# ========================================
# DATABASE CONFIGURATION
# ========================================
class DatabaseConfig:
    """Database configuration"""
    path = get_env('DB_PATH', 'data/apex.db')


# ========================================
# LOGGING CONFIGURATION
# ========================================
class LoggingConfig:
    """Logging configuration"""
    level = get_env('LOG_LEVEL', 'info')
    directory = get_env('LOG_DIR', 'logs')


# ========================================
# EXECUTION CONFIGURATION
# ========================================
class ExecutionConfig:
    """Mode-aware execution configuration"""
    mode = CURRENT_MODE
    # All modes collect and process real live DEX data
    collect_real_data = True
    # Only LIVE mode executes actual transactions
    execute_transactions = (CURRENT_MODE == ExecutionMode.LIVE)
    # DEV and SIM modes simulate transactions
    simulate_transactions = (CURRENT_MODE in [ExecutionMode.DEV, ExecutionMode.SIM])
    # SIM mode can use historical data for backtesting
    allow_historical_data = (CURRENT_MODE == ExecutionMode.SIM)
    # Additional safety checks for LIVE mode
    require_confirmation = (CURRENT_MODE == ExecutionMode.LIVE)
    # Log all opportunities in DEV/SIM modes for analysis
    log_all_opportunities = (CURRENT_MODE != ExecutionMode.LIVE)
    # Dry-run indicator
    dry_run = (CURRENT_MODE != ExecutionMode.LIVE)


def should_execute_real_transactions() -> bool:
    """
    Check if system should execute real transactions
    
    Returns:
        True if in LIVE mode, False otherwise
    """
    return ExecutionConfig.execute_transactions


def get_mode_display() -> str:
    """
    Get execution mode display string
    
    Returns:
        Mode display string with description
    """
    emoji = {
        ExecutionMode.LIVE: '🔴',
        ExecutionMode.DEV: '🟡',
        ExecutionMode.SIM: '🔵'
    }
    return f"{emoji[CURRENT_MODE]} {CURRENT_MODE.value} MODE - {MODE_DESCRIPTIONS[CURRENT_MODE]}"


def validate_config() -> bool:
    """
    Validate that all required configuration is present
    
    Returns:
        True if configuration is valid
        
    Raises:
        ValueError: If required configuration is missing
    """
    errors = []
    
    # Check RPC URLs for critical chains
    if not CHAINS[ChainType.POLYGON].rpc_url:
        errors.append('POLYGON_RPC_URL is required')
    if not CHAINS[ChainType.ETHEREUM].rpc_url:
        errors.append('ETHEREUM_RPC_URL is required')
    
    # Validate private key in LIVE mode
    if CURRENT_MODE == ExecutionMode.LIVE and not WalletConfig.private_key:
        errors.append('PRIVATE_KEY is required in LIVE mode')
    
    # Validate safety parameters
    if SafetyConfig.min_profit_usd < 0:
        errors.append('MIN_PROFIT_USD must be non-negative')
    if SafetyConfig.max_gas_price_gwei <= 0:
        errors.append('MAX_GAS_PRICE_GWEI must be positive')
    
    if errors:
        raise ValueError(f"Configuration validation failed:\n" + "\n".join(f"  - {e}" for e in errors))
    
    return True


def get_config_summary() -> dict:
    """
    Get all configuration as a single object (for logging/debugging)
    Note: Sensitive values are redacted
    
    Returns:
        Complete configuration dictionary with sensitive values redacted
    """
    return {
        'mode': CURRENT_MODE.value,
        'chains': {
            chain.value: {
                'name': config.name,
                'chain_id': config.chain_id,
                'native_currency': config.native_currency,
                'rpc_url': '***' if config.rpc_url else None,
                'wss_url': '***' if config.wss_url else None,
                'explorer_url': config.explorer_url
            }
            for chain, config in CHAINS.items()
        },
        'ml': {
            'confidence_threshold': MLConfig.confidence_threshold,
            'enable_filtering': MLConfig.enable_filtering,
            'xgboost_model_path': MLConfig.xgboost_model_path,
            'onnx_model_path': MLConfig.onnx_model_path
        },
        'safety': {
            'min_profit_usd': SafetyConfig.min_profit_usd,
            'max_gas_price_gwei': SafetyConfig.max_gas_price_gwei,
            'slippage_bps': SafetyConfig.slippage_bps,
            'max_daily_loss_usd': SafetyConfig.max_daily_loss_usd,
            'max_consecutive_failures': SafetyConfig.max_consecutive_failures
        },
        'system': {
            'scan_interval': SystemConfig.scan_interval,
            'enable_cross_chain': SystemConfig.enable_cross_chain,
            'enable_mempool_monitoring': SystemConfig.enable_mempool_monitoring,
            'rust_engine_enabled': SystemConfig.rust_engine_enabled
        },
        'ai': {
            'live_trading': AIEngineConfig.live_trading,
            'model_path': AIEngineConfig.model_path,
            'threshold': AIEngineConfig.threshold,
            'engine_port': AIEngineConfig.engine_port,
            'rust_engine_url': AIEngineConfig.rust_engine_url
        },
        'bloxroute': {
            'enabled': BloxrouteConfig.enabled,
            'auth_token': '***' if BloxrouteConfig.auth_token else None
        },
        'redis': {
            'host': RedisConfig.host,
            'port': RedisConfig.port
        },
        'prometheus': {
            'port': PrometheusConfig.port
        },
        'telegram': {
            'enabled': TelegramConfig.enabled,
            'bot_token': '***' if TelegramConfig.bot_token else None,
            'chat_id': '***' if TelegramConfig.chat_id else None
        },
        'mev': {
            'use_private_relay': MEVConfig.use_private_relay
        },
        'database': {
            'path': DatabaseConfig.path
        },
        'logging': {
            'level': LoggingConfig.level,
            'directory': LoggingConfig.directory
        },
        'execution': {
            'mode': ExecutionConfig.mode.value,
            'execute_transactions': ExecutionConfig.execute_transactions,
            'simulate_transactions': ExecutionConfig.simulate_transactions,
            'dry_run': ExecutionConfig.dry_run
        },
        'wallet': {
            'private_key': '***' if WalletConfig.private_key else None
        }
    }


if __name__ == '__main__':
    """Test configuration loading"""
    print("=" * 60)
    print("APEX SYSTEM CONFIGURATION - PYTHON")
    print("=" * 60)
    print(f"\n{get_mode_display()}\n")
    
    try:
        validate_config()
        print("✅ Configuration validation passed")
    except ValueError as e:
        print(f"❌ Configuration validation failed:\n{e}")
    
    print("\nConfiguration Summary:")
    import json
    print(json.dumps(get_config_summary(), indent=2))
