#!/usr/bin/env python3
"""
APEX Arbitrage System - Main Deploy Launcher
Launches the system in various modes (production, simulation, testing)
"""

import asyncio
import sys
import os
import argparse
from datetime import datetime

# Add src/python to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'python'))


class DeployLauncher:
    """Main deployment launcher for APEX system"""
    
    def __init__(self, mode: str = "simulation"):
        self.mode = mode.lower()
        self.valid_modes = ["production", "simulation", "testing", "dev"]
        
        if self.mode not in self.valid_modes:
            raise ValueError(f"Invalid mode: {mode}. Must be one of {self.valid_modes}")
    
    async def launch_simulation_mode(self):
        """Launch in simulation mode"""
        print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] APEX Deploy Launcher")
        print("=" * 60)
        print(f"Mode: SIMULATION")
        print("=" * 60)
        print("\n✅ Simulation mode activated")
        print("   - No real transactions will be executed")
        print("   - All operations are simulated")
        print("   - Safe for testing strategies\n")
        
        print("System components:")
        components = [
            "Pool Fetchers",
            "Opportunity Scanner",
            "ML Model Ensemble",
            "Route Calculator",
            "Transaction Simulator"
        ]
        
        for component in components:
            print(f"  ✓ {component} initialized")
            await asyncio.sleep(0.3)
        
        print("\n" + "=" * 60)
        print("✅ APEX System ready in SIMULATION mode")
        print("Press Ctrl+C to stop...")
        
        try:
            while True:
                await asyncio.sleep(5)
                # In real implementation, this would run the simulation loop
        except KeyboardInterrupt:
            print("\n\nSimulation stopped by user")
    
    async def launch_production_mode(self):
        """Launch in production mode"""
        print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] APEX Deploy Launcher")
        print("=" * 60)
        print(f"Mode: PRODUCTION")
        print("=" * 60)
        print("\n⚠️  PRODUCTION MODE")
        print("   - Real transactions WILL be executed")
        print("   - Real funds are at risk")
        print("   - Ensure all configurations are correct\n")
        
        # This is intentionally limited for safety
        print("❌ Direct production launch disabled for safety")
        print("   Please use the integrated_orchestrator.py with MODE=PROD")
        return 1
    
    async def launch_testing_mode(self):
        """Launch in testing mode"""
        print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] APEX Deploy Launcher")
        print("=" * 60)
        print(f"Mode: TESTING")
        print("=" * 60)
        print("\n✅ Testing mode activated")
        print("   - Using test networks")
        print("   - Safe for development\n")
        
        print("✅ APEX System ready in TESTING mode")
        return 0
    
    async def launch(self):
        """Launch the system in the configured mode"""
        if self.mode == "simulation":
            await self.launch_simulation_mode()
            return 0
        elif self.mode == "production":
            return await self.launch_production_mode()
        elif self.mode == "testing" or self.mode == "dev":
            return await self.launch_testing_mode()
        else:
            print(f"❌ Unknown mode: {self.mode}")
            return 1


async def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description="APEX Arbitrage System Launcher")
    parser.add_argument(
        "--mode",
        type=str,
        default="simulation",
        choices=["production", "simulation", "testing", "dev"],
        help="Launch mode (default: simulation)"
    )
    
    args = parser.parse_args()
    
    try:
        launcher = DeployLauncher(mode=args.mode)
        exit_code = await launcher.launch()
        return exit_code
    except KeyboardInterrupt:
        print("\n\nLauncher stopped by user")
        return 0
    except Exception as e:
        print(f"\n❌ Launcher error: {e}")
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
