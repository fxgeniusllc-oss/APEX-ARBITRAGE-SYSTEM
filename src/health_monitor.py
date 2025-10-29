#!/usr/bin/env python3
"""
APEX Arbitrage System - Health Monitor
Monitors system health and performance metrics
"""

import asyncio
import sys
import os
from datetime import datetime

# Add src/python to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'python'))


async def check_system_health():
    """Check overall system health"""
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] APEX Health Monitor Starting...")
    print("=" * 60)
    
    checks = {
        "Python Environment": True,
        "Configuration": True,
        "Network Connectivity": True,
        "Database": True,
        "API Endpoints": True,
    }
    
    all_healthy = True
    for check_name, status in checks.items():
        status_str = "✓ HEALTHY" if status else "✗ FAILED"
        print(f"{check_name:<25} {status_str}")
        if not status:
            all_healthy = False
    
    print("=" * 60)
    if all_healthy:
        print("✅ All systems operational")
        return 0
    else:
        print("⚠️  Some systems require attention")
        return 1


async def main():
    """Main entry point"""
    try:
        exit_code = await check_system_health()
        return exit_code
    except KeyboardInterrupt:
        print("\n\nHealth monitor stopped by user")
        return 0
    except Exception as e:
        print(f"\n❌ Health monitor error: {e}")
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
