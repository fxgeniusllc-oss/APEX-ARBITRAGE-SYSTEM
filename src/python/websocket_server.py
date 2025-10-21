"""
WebSocket Streaming Server for Real-Time Updates
Streams opportunities, predictions, and execution results in real-time
"""

import asyncio
import json
import time
from typing import Set, Dict, Any, Optional
from datetime import datetime
import websockets
from websockets.server import WebSocketServerProtocol
from dataclasses import asdict


class WebSocketStreamer:
    """
    WebSocket server for real-time streaming of:
    - New arbitrage opportunities
    - ML predictions
    - Execution results
    - System metrics
    """
    
    def __init__(self, host: str = "0.0.0.0", port: int = 8765):
        self.host = host
        self.port = port
        self.clients: Set[WebSocketServerProtocol] = set()
        self.server = None
        
        # Statistics
        self.stats = {
            "total_messages": 0,
            "connected_clients": 0,
            "start_time": time.time()
        }
        
        # Message queue for buffering
        self.message_queue = asyncio.Queue()
    
    async def register_client(self, websocket: WebSocketServerProtocol):
        """Register a new client connection"""
        self.clients.add(websocket)
        self.stats["connected_clients"] = len(self.clients)
        
        # Send welcome message
        await self.send_to_client(websocket, {
            "type": "connection",
            "status": "connected",
            "message": "Connected to APEX WebSocket stream",
            "timestamp": datetime.now().isoformat()
        })
        
        print(f"✅ Client connected: {websocket.remote_address}")
    
    async def unregister_client(self, websocket: WebSocketServerProtocol):
        """Unregister a client connection"""
        self.clients.discard(websocket)
        self.stats["connected_clients"] = len(self.clients)
        print(f"❌ Client disconnected: {websocket.remote_address}")
    
    async def send_to_client(self, websocket: WebSocketServerProtocol, message: Dict[str, Any]):
        """Send message to a specific client"""
        try:
            await websocket.send(json.dumps(message))
        except websockets.exceptions.ConnectionClosed:
            await self.unregister_client(websocket)
    
    async def broadcast(self, message: Dict[str, Any]):
        """Broadcast message to all connected clients"""
        if not self.clients:
            return
        
        self.stats["total_messages"] += 1
        message_json = json.dumps(message)
        
        # Send to all clients (handle disconnections)
        disconnected = set()
        for client in self.clients:
            try:
                await client.send(message_json)
            except websockets.exceptions.ConnectionClosed:
                disconnected.add(client)
        
        # Remove disconnected clients
        for client in disconnected:
            await self.unregister_client(client)
    
    async def stream_opportunity(self, opportunity: Dict[str, Any]):
        """
        Stream a new arbitrage opportunity
        
        Args:
            opportunity: Opportunity data dictionary
        """
        message = {
            "type": "opportunity",
            "data": opportunity,
            "timestamp": datetime.now().isoformat()
        }
        await self.broadcast(message)
    
    async def stream_prediction(
        self,
        route_id: str,
        prediction_score: float,
        should_execute: bool,
        model_versions: Dict[str, str],
        inference_time_ms: float
    ):
        """
        Stream an ML prediction result
        
        Args:
            route_id: Route identifier
            prediction_score: ML confidence score
            should_execute: Whether to execute
            model_versions: Dict of model types and versions used
            inference_time_ms: Inference time
        """
        message = {
            "type": "prediction",
            "data": {
                "route_id": route_id,
                "prediction_score": prediction_score,
                "should_execute": should_execute,
                "model_versions": model_versions,
                "inference_time_ms": inference_time_ms
            },
            "timestamp": datetime.now().isoformat()
        }
        await self.broadcast(message)
    
    async def stream_execution(
        self,
        route_id: str,
        status: str,
        profit_usd: float,
        tx_hash: Optional[str] = None,
        error_message: Optional[str] = None
    ):
        """
        Stream an execution result
        
        Args:
            route_id: Route identifier
            status: 'success' or 'failed'
            profit_usd: Profit amount
            tx_hash: Transaction hash if successful
            error_message: Error message if failed
        """
        message = {
            "type": "execution",
            "data": {
                "route_id": route_id,
                "status": status,
                "profit_usd": profit_usd,
                "tx_hash": tx_hash,
                "error_message": error_message
            },
            "timestamp": datetime.now().isoformat()
        }
        await self.broadcast(message)
    
    async def stream_metrics(self, metrics: Dict[str, Any]):
        """
        Stream system metrics
        
        Args:
            metrics: Metrics dictionary
        """
        message = {
            "type": "metrics",
            "data": metrics,
            "timestamp": datetime.now().isoformat()
        }
        await self.broadcast(message)
    
    async def stream_alert(self, alert_type: str, message_text: str, severity: str = "info"):
        """
        Stream a system alert
        
        Args:
            alert_type: Type of alert (e.g., 'warning', 'error', 'info')
            message_text: Alert message
            severity: Severity level ('info', 'warning', 'error')
        """
        message = {
            "type": "alert",
            "data": {
                "alert_type": alert_type,
                "message": message_text,
                "severity": severity
            },
            "timestamp": datetime.now().isoformat()
        }
        await self.broadcast(message)
    
    async def handle_client_message(self, websocket: WebSocketServerProtocol, message: str):
        """
        Handle incoming message from client
        
        Clients can subscribe to specific channels or request data
        """
        try:
            data = json.loads(message)
            command = data.get("command")
            
            if command == "subscribe":
                channels = data.get("channels", [])
                response = {
                    "type": "subscription",
                    "status": "success",
                    "channels": channels,
                    "message": f"Subscribed to {len(channels)} channels"
                }
                await self.send_to_client(websocket, response)
            
            elif command == "stats":
                response = {
                    "type": "stats",
                    "data": self.stats,
                    "uptime_seconds": time.time() - self.stats["start_time"]
                }
                await self.send_to_client(websocket, response)
            
            elif command == "ping":
                response = {
                    "type": "pong",
                    "timestamp": datetime.now().isoformat()
                }
                await self.send_to_client(websocket, response)
            
            else:
                response = {
                    "type": "error",
                    "message": f"Unknown command: {command}"
                }
                await self.send_to_client(websocket, response)
        
        except json.JSONDecodeError:
            response = {
                "type": "error",
                "message": "Invalid JSON"
            }
            await self.send_to_client(websocket, response)
    
    async def client_handler(self, websocket: WebSocketServerProtocol, path: str):
        """Handle a client connection"""
        await self.register_client(websocket)
        
        try:
            async for message in websocket:
                await self.handle_client_message(websocket, message)
        except websockets.exceptions.ConnectionClosed:
            pass
        finally:
            await self.unregister_client(websocket)
    
    async def heartbeat_loop(self):
        """Send periodic heartbeat to all clients"""
        while True:
            await asyncio.sleep(30)  # Every 30 seconds
            
            if self.clients:
                heartbeat = {
                    "type": "heartbeat",
                    "connected_clients": len(self.clients),
                    "uptime_seconds": time.time() - self.stats["start_time"],
                    "timestamp": datetime.now().isoformat()
                }
                await self.broadcast(heartbeat)
    
    async def start(self):
        """Start the WebSocket server"""
        print(f"🌐 Starting WebSocket server on {self.host}:{self.port}")
        
        # Start server
        self.server = await websockets.serve(
            self.client_handler,
            self.host,
            self.port,
            ping_interval=20,
            ping_timeout=20
        )
        
        print(f"✅ WebSocket server running on ws://{self.host}:{self.port}")
        
        # Start heartbeat loop
        asyncio.create_task(self.heartbeat_loop())
        
        # Keep server running
        await asyncio.Future()  # Run forever
    
    async def stop(self):
        """Stop the WebSocket server"""
        if self.server:
            self.server.close()
            await self.server.wait_closed()
            print("🛑 WebSocket server stopped")


# Example usage and test client
async def example_stream_data(streamer: WebSocketStreamer):
    """Example function showing how to stream data"""
    # Simulate streaming opportunities
    for i in range(5):
        await asyncio.sleep(2)
        
        opportunity = {
            "route_id": f"route_{i}",
            "tokens": ["USDC", "USDT", "USDC"],
            "dexes": ["quickswap", "sushiswap"],
            "profit_usd": 10 + i * 2,
            "confidence_score": 0.85
        }
        
        await streamer.stream_opportunity(opportunity)
        
        # Simulate prediction
        await streamer.stream_prediction(
            route_id=f"route_{i}",
            prediction_score=0.87,
            should_execute=True,
            model_versions={"xgboost": "v1.0.0", "onnx": "v1.0.0"},
            inference_time_ms=2.5
        )
        
        # Simulate execution
        await streamer.stream_execution(
            route_id=f"route_{i}",
            status="success",
            profit_usd=10 + i * 2,
            tx_hash=f"0xabc{i:03d}"
        )


async def main():
    """Main entry point for standalone server"""
    streamer = WebSocketStreamer(host="0.0.0.0", port=8765)
    
    # Start example data streaming (for testing)
    asyncio.create_task(example_stream_data(streamer))
    
    # Start server
    await streamer.start()


if __name__ == "__main__":
    print("🚀 APEX WebSocket Streaming Server")
    print("=" * 50)
    asyncio.run(main())
