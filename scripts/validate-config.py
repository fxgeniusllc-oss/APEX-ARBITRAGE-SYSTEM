#!/usr/bin/env python3
"""
APEX System Configuration Validator - Python Version
Validates that all required environment variables are properly configured
Run this before starting Python components to ensure proper setup
"""

import sys
import os

# Add src/python to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src', 'python'))

from config import (
    validate_config,
    get_config_summary,
    get_mode_display,
    CURRENT_MODE,
    ExecutionMode
)


def print_header():
    """Print header"""
    print("\n" + "=" * 60)
    print("APEX SYSTEM CONFIGURATION VALIDATOR - PYTHON")
    print("=" * 60 + "\n")


def print_summary(config):
    """Print configuration summary"""
    print(get_mode_display())
    print()
    
    print("Configuration Summary:")
    print("─" * 60 + "\n")
    
    # Display execution mode
    print("Execution Mode:")
    print(f"  {config['mode']}\n")
    
    # Display chain configuration
    print("Configured Chains:")
    for chain_name, chain_config in config['chains'].items():
        status = "✓" if chain_config['rpc_url'] else "✗"
        print(f"  {status} {chain_config['name']} ({chain_config['chain_id']})")
    print()
    
    # Display safety parameters
    print("Safety Parameters:")
    print(f"  Min Profit: ${config['safety']['min_profit_usd']}")
    print(f"  Max Gas Price: {config['safety']['max_gas_price_gwei']} Gwei")
    print(f"  Slippage: {config['safety']['slippage_bps']} bps ({config['safety']['slippage_bps'] / 100:.2f}%)")
    print(f"  Max Daily Loss: ${config['safety']['max_daily_loss_usd']}")
    print()
    
    # Display ML configuration
    print("ML Configuration:")
    print(f"  Confidence Threshold: {config['ml']['confidence_threshold']}")
    print(f"  ML Filtering: {'Enabled' if config['ml']['enable_filtering'] else 'Disabled'}")
    print()
    
    # Display advanced features
    print("Advanced Features:")
    print(f"  Cross-Chain: {'Enabled' if config['system']['enable_cross_chain'] else 'Disabled'}")
    print(f"  Mempool Monitoring: {'Enabled' if config['system']['enable_mempool_monitoring'] else 'Disabled'}")
    print(f"  Rust Engine: {'Enabled' if config['system']['rust_engine_enabled'] else 'Disabled'}")
    print(f"  BloXroute: {'Enabled' if config['bloxroute']['enabled'] else 'Disabled'}")
    print(f"  Telegram Alerts: {'Enabled' if config['telegram']['enabled'] else 'Disabled'}")
    print()
    
    # Display execution configuration
    print("Execution Configuration:")
    print(f"  Execute Real Transactions: {'YES' if config['execution']['execute_transactions'] else 'NO (Dry-run)'}")
    print(f"  Simulate Transactions: {'YES' if config['execution']['simulate_transactions'] else 'NO'}")
    print()
    
    # Display warnings
    if config['mode'] == ExecutionMode.LIVE.value:
        print("⚠️  WARNING: LIVE MODE ENABLED")
        print("   This will execute REAL transactions on-chain")
        print("   Ensure you have tested thoroughly in DEV mode first!\n")
    
    if not config['wallet']['private_key']:
        print("⚠️  No private key configured")
        print("   Required for LIVE mode, optional for DEV/SIM\n")


def main():
    """Main validation function"""
    print_header()
    
    try:
        # Run validation
        validate_config()
        
        print("✅ Configuration validation passed!\n")
        
        # Get and display configuration summary
        config = get_config_summary()
        print_summary(config)
        
        print("✅ Python components are ready to start!\n")
        return 0
        
    except ValueError as e:
        print("❌ Configuration validation failed!\n")
        print(str(e))
        print()
        print("Please check your .env file and ensure all required variables are set.")
        print("Refer to .env.example for configuration template.\n")
        return 1
    except Exception as e:
        print(f"❌ Unexpected error during validation: {e}\n")
        return 1


if __name__ == '__main__':
    sys.exit(main())
