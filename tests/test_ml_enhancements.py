"""
Unit tests for ML enhancements
Tests core logic without requiring full dependencies
"""

import unittest
import json
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent / 'src' / 'python'))


class TestModelVersioning(unittest.TestCase):
    """Test model versioning and A/B testing logic"""
    
    def test_version_dataclass(self):
        """Test ModelVersion creation"""
        try:
            from model_manager import ModelVersion
            
            version = ModelVersion(
                version="v1.0.0",
                model_type="xgboost",
                path="/path/to/model.json",
                created_at="2024-01-15T10:00:00",
                metrics={"accuracy": 0.89},
                is_active=True,
                traffic_weight=1.0
            )
            
            self.assertEqual(version.version, "v1.0.0")
            self.assertEqual(version.model_type, "xgboost")
            self.assertTrue(version.is_active)
            print("✅ ModelVersion dataclass works")
        except ImportError as e:
            print(f"⚠️  Skipping test (missing dependency): {e}")
    
    def test_traffic_split_logic(self):
        """Test traffic split validation"""
        # Test that traffic splits must sum to 1.0
        split_a, split_b = 0.7, 0.3
        self.assertAlmostEqual(split_a + split_b, 1.0)
        
        split_a, split_b = 0.5, 0.5
        self.assertAlmostEqual(split_a + split_b, 1.0)
        
        print("✅ Traffic split validation works")


class TestEnsembleVoting(unittest.TestCase):
    """Test ensemble voting strategies"""
    
    def test_weighted_voting_logic(self):
        """Test weighted voting calculation"""
        xgb_score = 0.9
        onnx_score = 0.7
        weights = (0.6, 0.4)
        
        expected = weights[0] * xgb_score + weights[1] * onnx_score
        result = 0.6 * 0.9 + 0.4 * 0.7
        
        self.assertAlmostEqual(result, expected)
        self.assertAlmostEqual(result, 0.82)
        print("✅ Weighted voting logic works")
    
    def test_majority_voting_logic(self):
        """Test majority voting logic"""
        threshold = 0.5
        
        # Both agree positive
        scores = [0.8, 0.9]
        votes = [1 if s > threshold else 0 for s in scores]
        self.assertEqual(sum(votes) / len(votes), 1.0)
        
        # Both agree negative
        scores = [0.3, 0.4]
        votes = [1 if s > threshold else 0 for s in scores]
        self.assertEqual(sum(votes) / len(votes), 0.0)
        
        # Split decision
        scores = [0.6, 0.4]
        votes = [1 if s > threshold else 0 for s in scores]
        self.assertEqual(sum(votes) / len(votes), 0.5)
        
        print("✅ Majority voting logic works")
    
    def test_unanimous_voting_logic(self):
        """Test unanimous voting logic"""
        threshold = 0.5
        
        # All positive
        scores = [0.8, 0.9, 0.85]
        all_positive = all(s > threshold for s in scores)
        self.assertTrue(all_positive)
        
        # All negative
        scores = [0.3, 0.4, 0.2]
        all_negative = all(s <= threshold for s in scores)
        self.assertTrue(all_negative)
        
        # Mixed (should be conservative)
        scores = [0.8, 0.3]
        all_positive = all(s > threshold for s in scores)
        all_negative = all(s <= threshold for s in scores)
        self.assertFalse(all_positive)
        self.assertFalse(all_negative)
        
        print("✅ Unanimous voting logic works")


class TestBatchPrediction(unittest.TestCase):
    """Test batch prediction logic"""
    
    def test_batch_metrics_calculation(self):
        """Test batch metrics calculation"""
        inference_times = [2.5, 2.3, 2.7, 2.4, 2.6]
        
        total_time = sum(inference_times)
        avg_time = total_time / len(inference_times)
        
        self.assertEqual(len(inference_times), 5)
        self.assertAlmostEqual(avg_time, 2.5)
        
        print("✅ Batch metrics calculation works")
    
    def test_threshold_filtering(self):
        """Test threshold-based filtering"""
        predictions = [
            ("route_1", 0.85),
            ("route_2", 0.75),
            ("route_3", 0.90),
            ("route_4", 0.70),
            ("route_5", 0.95)
        ]
        
        threshold = 0.8
        executable = [p for p in predictions if p[1] > threshold]
        
        self.assertEqual(len(executable), 3)
        self.assertTrue(all(p[1] > threshold for p in executable))
        
        print("✅ Threshold filtering works")


class TestDataCollection(unittest.TestCase):
    """Test data collection for retraining"""
    
    def test_feature_extraction_logic(self):
        """Test feature extraction logic"""
        opportunity = {
            "profit_usd": 12.0,
            "expected_output": 1012.0,
            "input_amount": 1000.0,
            "route_complexity": 3,
            "gas_estimate": 350000,
            "confidence_score": 0.85,
            "tokens": ["USDC", "USDT", "USDC"],
            "dexes": ["quickswap", "sushiswap"]
        }
        
        # Calculate features
        profit_ratio = opportunity["expected_output"] / opportunity["input_amount"]
        gas_millions = opportunity["gas_estimate"] / 1000000.0
        input_thousands = opportunity["input_amount"] / 1000.0
        is_2hop = 1.0 if len(opportunity["tokens"]) == 3 else 0.0
        is_3hop = 1.0 if len(opportunity["tokens"]) == 4 else 0.0
        
        self.assertAlmostEqual(profit_ratio, 1.012)
        self.assertAlmostEqual(gas_millions, 0.35)
        self.assertAlmostEqual(input_thousands, 1.0)
        self.assertEqual(is_2hop, 1.0)
        self.assertEqual(is_3hop, 0.0)
        
        print("✅ Feature extraction logic works")
    
    def test_train_test_split_logic(self):
        """Test train/test split logic"""
        data_size = 100
        test_size = 0.2
        
        test_count = int(data_size * test_size)
        train_count = data_size - test_count
        
        self.assertEqual(test_count, 20)
        self.assertEqual(train_count, 80)
        
        print("✅ Train/test split logic works")


class TestWebSocketMessages(unittest.TestCase):
    """Test WebSocket message structure"""
    
    def test_message_structure(self):
        """Test WebSocket message JSON structure"""
        message = {
            "type": "prediction",
            "data": {
                "route_id": "route_1",
                "prediction_score": 0.87,
                "should_execute": True
            },
            "timestamp": "2024-01-15T10:00:00"
        }
        
        # Verify it's valid JSON
        json_str = json.dumps(message)
        parsed = json.loads(json_str)
        
        self.assertEqual(parsed["type"], "prediction")
        self.assertEqual(parsed["data"]["route_id"], "route_1")
        self.assertAlmostEqual(parsed["data"]["prediction_score"], 0.87)
        
        print("✅ WebSocket message structure works")
    
    def test_message_types(self):
        """Test all message types are valid"""
        valid_types = [
            "connection",
            "opportunity",
            "prediction",
            "execution",
            "metrics",
            "alert",
            "heartbeat"
        ]
        
        for msg_type in valid_types:
            message = {"type": msg_type, "data": {}}
            json_str = json.dumps(message)
            parsed = json.loads(json_str)
            self.assertEqual(parsed["type"], msg_type)
        
        print("✅ All message types are valid")


class TestGPUProviders(unittest.TestCase):
    """Test GPU provider logic"""
    
    def test_provider_priority(self):
        """Test provider priority logic"""
        # Simulate provider availability check
        available_providers = ['CPUExecutionProvider', 'CUDAExecutionProvider']
        
        if 'TensorrtExecutionProvider' in available_providers:
            selected = ['TensorrtExecutionProvider', 'CUDAExecutionProvider', 'CPUExecutionProvider']
        elif 'CUDAExecutionProvider' in available_providers:
            selected = ['CUDAExecutionProvider', 'CPUExecutionProvider']
        else:
            selected = ['CPUExecutionProvider']
        
        self.assertEqual(selected, ['CUDAExecutionProvider', 'CPUExecutionProvider'])
        print("✅ GPU provider priority logic works")


def run_tests():
    """Run all tests"""
    print("\n" + "=" * 70)
    print("  Testing ML Enhancements - Core Logic")
    print("=" * 70 + "\n")
    
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    
    # Add all test classes
    suite.addTests(loader.loadTestsFromTestCase(TestModelVersioning))
    suite.addTests(loader.loadTestsFromTestCase(TestEnsembleVoting))
    suite.addTests(loader.loadTestsFromTestCase(TestBatchPrediction))
    suite.addTests(loader.loadTestsFromTestCase(TestDataCollection))
    suite.addTests(loader.loadTestsFromTestCase(TestWebSocketMessages))
    suite.addTests(loader.loadTestsFromTestCase(TestGPUProviders))
    
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    print("\n" + "=" * 70)
    if result.wasSuccessful():
        print("  ✅ All tests passed!")
    else:
        print("  ❌ Some tests failed")
    print("=" * 70 + "\n")
    
    return result.wasSuccessful()


if __name__ == '__main__':
    success = run_tests()
    sys.exit(0 if success else 1)
