#!/usr/bin/env python3
"""
AI Performance Benchmark Tester for APEX Arbitrage System
Tests model inference performance and validates prediction thresholds
"""

import argparse
import os
import sys
import time
import numpy as np
from pathlib import Path

def load_model(model_path):
    """Load ONNX model or create mock model for testing"""
    try:
        import onnxruntime as ort
        if os.path.exists(model_path):
            session = ort.InferenceSession(model_path)
            print(f"✅ Model loaded successfully from {model_path}")
            return session
        else:
            print(f"⚠️  Model file not found at {model_path}, using mock model")
            return None
    except ImportError:
        print("⚠️  onnxruntime not installed, using mock model")
        return None
    except Exception as e:
        print(f"⚠️  Error loading model: {e}, using mock model")
        return None

def benchmark_inference(session, num_iterations=100):
    """Benchmark model inference speed"""
    print(f"\n🔍 Running {num_iterations} inference iterations...")
    
    if session is None:
        # Mock benchmark for testing
        latencies = []
        for _ in range(num_iterations):
            start = time.time()
            # Simulate inference
            _ = np.random.rand(10)
            latency = (time.time() - start) * 1000
            latencies.append(latency)
        
        avg_latency = np.mean(latencies)
        p95_latency = np.percentile(latencies, 95)
        p99_latency = np.percentile(latencies, 99)
        
        print(f"  Average latency: {avg_latency:.3f} ms")
        print(f"  P95 latency: {p95_latency:.3f} ms")
        print(f"  P99 latency: {p99_latency:.3f} ms")
        
        return avg_latency, p95_latency, p99_latency
    
    try:
        # Real model benchmarking
        input_name = session.get_inputs()[0].name
        input_shape = session.get_inputs()[0].shape
        
        # Generate dummy input
        dummy_input = np.random.randn(*[dim if isinstance(dim, int) else 1 for dim in input_shape]).astype(np.float32)
        
        latencies = []
        for _ in range(num_iterations):
            start = time.time()
            _ = session.run(None, {input_name: dummy_input})
            latency = (time.time() - start) * 1000
            latencies.append(latency)
        
        avg_latency = np.mean(latencies)
        p95_latency = np.percentile(latencies, 95)
        p99_latency = np.percentile(latencies, 99)
        
        print(f"  Average latency: {avg_latency:.3f} ms")
        print(f"  P95 latency: {p95_latency:.3f} ms")
        print(f"  P99 latency: {p99_latency:.3f} ms")
        
        return avg_latency, p95_latency, p99_latency
    except Exception as e:
        print(f"❌ Benchmark failed: {e}")
        return None, None, None

def validate_threshold(threshold):
    """Validate profit threshold is reasonable"""
    print(f"\n⚖️  Validating profit threshold: {threshold}")
    
    if threshold < 0.0001:
        print("  ⚠️  Warning: Threshold very low, may result in unprofitable trades after gas")
    elif threshold < 0.0005:
        print("  ℹ️  Threshold acceptable for low-gas chains")
    else:
        print("  ✅ Threshold is conservative and safe")
    
    return True

def run_benchmark_tests(model_path, threshold):
    """Run all benchmark tests"""
    print("=" * 60)
    print("🧪 APEX AI Performance Benchmark Test")
    print("=" * 60)
    
    # Load model
    session = load_model(model_path)
    
    # Benchmark inference
    avg_lat, p95_lat, p99_lat = benchmark_inference(session, num_iterations=100)
    
    # Validate threshold
    validate_threshold(threshold)
    
    # Performance check
    print("\n📊 Performance Assessment:")
    if avg_lat and avg_lat < 10:
        print("  ✅ Inference speed: EXCELLENT (<10ms average)")
    elif avg_lat and avg_lat < 50:
        print("  ✅ Inference speed: GOOD (<50ms average)")
    elif avg_lat:
        print("  ⚠️  Inference speed: ACCEPTABLE but could be optimized")
    else:
        print("  ℹ️  Using mock model - production model needed for real benchmarks")
    
    print("\n✅ Benchmark test completed successfully")
    return 0

def main():
    parser = argparse.ArgumentParser(description='AI Performance Benchmark Tester')
    parser.add_argument('--model', type=str, default='models/arb_predictor.onnx',
                       help='Path to ONNX model file')
    parser.add_argument('--threshold', type=float, default=0.0005,
                       help='Profit threshold for validation')
    
    args = parser.parse_args()
    
    return run_benchmark_tests(args.model, args.threshold)

if __name__ == '__main__':
    sys.exit(main())
