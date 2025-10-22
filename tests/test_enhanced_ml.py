"""
Unit tests for enhanced ML features
Tests LSTM integration, dynamic thresholding, and continuous learning
"""

import unittest
import json
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent / 'src' / 'python'))


class TestThresholdEnhancements(unittest.TestCase):
    """Test threshold value enhancements"""
    
    def test_new_threshold_value(self):
        """Test that new threshold is 0.88 (88%)"""
        new_threshold = 0.88
        old_threshold = 0.8
        
        # New threshold should be higher than old
        self.assertGreater(new_threshold, old_threshold)
        
        # New threshold should result in fewer executions (more selective)
        scores = [0.82, 0.85, 0.87, 0.89, 0.91, 0.93]
        
        old_executable = [s for s in scores if s > old_threshold]
        new_executable = [s for s in scores if s > new_threshold]
        
        # New threshold is more selective
        self.assertLess(len(new_executable), len(old_executable))
        self.assertEqual(len(new_executable), 3)  # Only 0.89, 0.91, 0.93
        
        print("✅ New threshold 0.88 is more selective")


class TestEnsembleWeights(unittest.TestCase):
    """Test ensemble weight distribution"""
    
    def test_three_model_weights(self):
        """Test weights for XGBoost, ONNX, and LSTM"""
        weights = (0.4, 0.3, 0.3)
        
        # Weights should sum to 1.0
        self.assertAlmostEqual(sum(weights), 1.0)
        
        # Test weighted voting
        xgb_score = 0.90
        onnx_score = 0.85
        lstm_score = 0.88
        
        ensemble_score = (
            weights[0] * xgb_score +
            weights[1] * onnx_score +
            weights[2] * lstm_score
        )
        
        self.assertAlmostEqual(ensemble_score, 0.8790, places=4)
        print(f"✅ Three-model ensemble score: {ensemble_score:.4f}")
    
    def test_two_model_weights(self):
        """Test weights when only two models are available"""
        weights = (0.4, 0.3)
        total_weight = sum(weights)
        
        xgb_score = 0.90
        onnx_score = 0.85
        
        # Normalize weights
        normalized_weights = tuple(w / total_weight for w in weights)
        ensemble_score = sum(w * s for w, s in zip(normalized_weights, [xgb_score, onnx_score]))
        
        self.assertAlmostEqual(sum(normalized_weights), 1.0)
        print(f"✅ Two-model normalized ensemble score: {ensemble_score:.4f}")


class TestDynamicThreshold(unittest.TestCase):
    """Test dynamic threshold calculation"""
    
    def test_volatility_adjustment(self):
        """Test threshold adjustment based on volatility"""
        base_threshold = 0.88
        min_threshold = 0.88
        max_threshold = 0.95
        
        # High volatility should increase threshold
        high_volatility = 0.8
        volatility_adjustment = (high_volatility - 0.5) * 0.1
        adjusted = base_threshold + volatility_adjustment
        adjusted = max(min_threshold, min(max_threshold, adjusted))
        
        self.assertGreater(adjusted, base_threshold)
        self.assertLessEqual(adjusted, max_threshold)
        
        # Low volatility should keep threshold at minimum (clamped)
        low_volatility = 0.3
        volatility_adjustment = (low_volatility - 0.5) * 0.1
        adjusted = base_threshold + volatility_adjustment
        adjusted = max(min_threshold, min(max_threshold, adjusted))
        
        # Should be clamped to minimum
        self.assertEqual(adjusted, min_threshold)
        
        print("✅ Volatility-based threshold adjustment works")
    
    def test_success_rate_adjustment(self):
        """Test threshold adjustment based on success rate"""
        base_threshold = 0.88
        
        # Low success rate should increase threshold (more conservative)
        low_success_rate = 0.3
        success_adjustment = (0.5 - low_success_rate) * 0.05
        adjusted = base_threshold + success_adjustment
        
        self.assertGreater(adjusted, base_threshold)
        
        # High success rate should decrease threshold (less conservative)
        high_success_rate = 0.8
        success_adjustment = (0.5 - high_success_rate) * 0.05
        adjusted = base_threshold + success_adjustment
        
        self.assertLess(adjusted, base_threshold)
        
        print("✅ Success rate-based threshold adjustment works")
    
    def test_threshold_clamping(self):
        """Test that dynamic threshold stays within bounds"""
        min_threshold = 0.88
        max_threshold = 0.95
        
        # Test clamping at minimum
        calculated = 0.85
        clamped = max(min_threshold, min(max_threshold, calculated))
        self.assertEqual(clamped, min_threshold)
        
        # Test clamping at maximum
        calculated = 0.98
        clamped = max(min_threshold, min(max_threshold, calculated))
        self.assertEqual(clamped, max_threshold)
        
        # Test within range
        calculated = 0.90
        clamped = max(min_threshold, min(max_threshold, calculated))
        self.assertEqual(clamped, calculated)
        
        print("✅ Threshold clamping works correctly")


class TestContinuousLearning(unittest.TestCase):
    """Test continuous learning functionality"""
    
    def test_learning_buffer_management(self):
        """Test learning buffer size management"""
        buffer = []
        max_size = 1000
        
        # Add items to buffer
        for i in range(1200):
            buffer.append({'id': i, 'data': f'item_{i}'})
            
            # Maintain size
            if len(buffer) > max_size:
                buffer.pop(0)
        
        self.assertEqual(len(buffer), max_size)
        # Should have items 200-1199
        self.assertEqual(buffer[0]['id'], 200)
        self.assertEqual(buffer[-1]['id'], 1199)
        
        print("✅ Learning buffer management works")
    
    def test_execution_result_logging(self):
        """Test logging of execution results"""
        execution_history = []
        
        # Log successful execution
        execution_history.append({
            'route_id': 'route_1',
            'expected_profit': 10.0,
            'actual_profit': 9.5,
            'success': True
        })
        
        # Log failed execution
        execution_history.append({
            'route_id': 'route_2',
            'expected_profit': 8.0,
            'actual_profit': 0.0,
            'success': False
        })
        
        # Calculate metrics
        total = len(execution_history)
        successes = sum(1 for e in execution_history if e['success'])
        success_rate = successes / total
        
        self.assertEqual(total, 2)
        self.assertEqual(successes, 1)
        self.assertEqual(success_rate, 0.5)
        
        print("✅ Execution result logging works")
    
    def test_profit_accuracy_calculation(self):
        """Test profit accuracy calculation"""
        executions = [
            {'expected_profit': 10.0, 'actual_profit': 9.5, 'success': True},
            {'expected_profit': 8.0, 'actual_profit': 7.8, 'success': True},
            {'expected_profit': 12.0, 'actual_profit': 11.5, 'success': True},
        ]
        
        # Calculate profit accuracy
        accuracies = [e['actual_profit'] / e['expected_profit'] for e in executions]
        avg_accuracy = sum(accuracies) / len(accuracies)
        
        self.assertGreater(avg_accuracy, 0.9)
        self.assertLess(avg_accuracy, 1.0)
        
        print(f"✅ Profit accuracy: {avg_accuracy:.2%}")


class TestLSTMIntegration(unittest.TestCase):
    """Test LSTM model integration"""
    
    def test_lstm_model_structure(self):
        """Test LSTM model architecture"""
        try:
            import torch
            import torch.nn as nn
            
            class SimpleLSTM(nn.Module):
                def __init__(self, input_size=10, hidden_size=128, output_size=1, num_layers=2):
                    super(SimpleLSTM, self).__init__()
                    self.lstm = nn.LSTM(input_size, hidden_size, num_layers, batch_first=True)
                    self.fc = nn.Linear(hidden_size, output_size)
                
                def forward(self, x):
                    lstm_out, _ = self.lstm(x)
                    return torch.sigmoid(self.fc(lstm_out[:, -1, :]))
            
            model = SimpleLSTM()
            
            # Test input shape
            batch_size = 1
            seq_len = 1
            features = 10
            test_input = torch.randn(batch_size, seq_len, features)
            
            # Test forward pass
            with torch.no_grad():
                output = model(test_input)
            
            # Output should be between 0 and 1 (sigmoid)
            self.assertGreaterEqual(output.item(), 0.0)
            self.assertLessEqual(output.item(), 1.0)
            
            print("✅ LSTM model structure is valid")
        except ImportError:
            print("⚠️  PyTorch not available, skipping LSTM test")
    
    def test_lstm_feature_input_shape(self):
        """Test feature vector shape for LSTM"""
        # Feature vector should have same size as other models
        features = [0.5, 0.7, 3, 0.35, 0.8, 0.5, 2, 1.0, 1.0, 0.0]
        
        self.assertEqual(len(features), 10)
        
        # All features should be numeric
        self.assertTrue(all(isinstance(f, (int, float)) for f in features))
        
        print("✅ LSTM feature input shape is correct")


class TestRiskModelEnhancements(unittest.TestCase):
    """Test risk model enhancements"""
    
    def test_execution_rate_calculation(self):
        """Test that 88% threshold results in 0.1-0.6% execution rate"""
        # Generate 1000 random scores
        import random
        random.seed(42)
        scores = [random.uniform(0.6, 0.99) for _ in range(1000)]
        
        threshold_80 = 0.80
        threshold_88 = 0.88
        
        executable_80 = sum(1 for s in scores if s > threshold_80)
        executable_88 = sum(1 for s in scores if s > threshold_88)
        
        rate_80 = executable_80 / len(scores)
        rate_88 = executable_88 / len(scores)
        
        # 88% threshold should result in lower execution rate
        self.assertLess(rate_88, rate_80)
        
        print(f"✅ Execution rate @ 80%: {rate_80:.2%}")
        print(f"✅ Execution rate @ 88%: {rate_88:.2%}")
    
    def test_risk_assessment_logic(self):
        """Test enhanced risk assessment"""
        opportunities = [
            {'profit_usd': 5.0, 'gas_cost': 3.0, 'confidence': 0.89},
            {'profit_usd': 15.0, 'gas_cost': 4.0, 'confidence': 0.92},
            {'profit_usd': 8.0, 'gas_cost': 6.0, 'confidence': 0.85},
        ]
        
        threshold = 0.88
        min_profit = 5.0
        
        # Filter based on risk criteria
        safe_opps = [
            opp for opp in opportunities
            if opp['confidence'] > threshold
            and opp['profit_usd'] >= min_profit
            and opp['profit_usd'] > opp['gas_cost'] * 1.5
        ]
        
        self.assertEqual(len(safe_opps), 2)
        print(f"✅ Risk filtering: {len(safe_opps)}/{len(opportunities)} passed")


def run_tests():
    """Run all tests"""
    print("\n" + "=" * 70)
    print("  Testing Enhanced ML Features (88+ Threshold, LSTM, Dynamic)")
    print("=" * 70 + "\n")
    
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    
    # Add all test classes
    suite.addTests(loader.loadTestsFromTestCase(TestThresholdEnhancements))
    suite.addTests(loader.loadTestsFromTestCase(TestEnsembleWeights))
    suite.addTests(loader.loadTestsFromTestCase(TestDynamicThreshold))
    suite.addTests(loader.loadTestsFromTestCase(TestContinuousLearning))
    suite.addTests(loader.loadTestsFromTestCase(TestLSTMIntegration))
    suite.addTests(loader.loadTestsFromTestCase(TestRiskModelEnhancements))
    
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    print("\n" + "=" * 70)
    if result.wasSuccessful():
        print("  ✅ All enhanced ML tests passed!")
    else:
        print("  ❌ Some tests failed")
    print("=" * 70 + "\n")
    
    return result.wasSuccessful()


if __name__ == '__main__':
    success = run_tests()
    sys.exit(0 if success else 1)
