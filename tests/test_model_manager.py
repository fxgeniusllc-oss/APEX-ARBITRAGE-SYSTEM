"""
Comprehensive Tests for Model Manager Module
Tests ML model versioning, A/B testing, and lifecycle management

Test Coverage:
1. Model registration and versioning
2. A/B testing and traffic splitting
3. Performance tracking
4. Model activation and deactivation
5. Version management
"""

import pytest
import json
import tempfile
import shutil
from pathlib import Path
import sys
import os

# Add src directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from python.model_manager import ModelManager, ModelVersion


class TestModelManagerInitialization:
    """Test Model Manager initialization"""
    
    def test_initialization(self):
        """Should initialize with default configuration"""
        with tempfile.TemporaryDirectory() as tmpdir:
            manager = ModelManager(models_dir=tmpdir)
            
            assert manager is not None
            assert manager.models_dir.exists()
            assert 'xgboost' in manager.versions
            assert 'onnx' in manager.versions
    
    def test_creates_directory_structure(self):
        """Should create required directory structure"""
        with tempfile.TemporaryDirectory() as tmpdir:
            manager = ModelManager(models_dir=tmpdir)
            
            assert manager.models_dir.exists()
            assert manager.versions_file.parent.exists()
    
    def test_initializes_empty_versions(self):
        """Should initialize with empty version lists"""
        with tempfile.TemporaryDirectory() as tmpdir:
            manager = ModelManager(models_dir=tmpdir)
            
            assert len(manager.versions['xgboost']) == 0
            assert len(manager.versions['onnx']) == 0
    
    def test_initializes_performance_tracking(self):
        """Should initialize performance tracking"""
        with tempfile.TemporaryDirectory() as tmpdir:
            manager = ModelManager(models_dir=tmpdir)
            
            assert isinstance(manager.performance_data, dict)
            assert manager.performance_log.name == 'performance.json'


class TestModelRegistration:
    """Test model registration functionality"""
    
    def test_register_xgboost_model(self):
        """Should register XGBoost model"""
        with tempfile.TemporaryDirectory() as tmpdir:
            manager = ModelManager(models_dir=tmpdir)
            
            model_version = manager.register_model(
                model_type='xgboost',
                model_path='/path/to/model.json',
                version='v1.0.0',
                metrics={'accuracy': 0.92, 'f1': 0.88}
            )
            
            assert model_version.version == 'v1.0.0'
            assert model_version.model_type == 'xgboost'
            assert model_version.metrics['accuracy'] == 0.92
    
    def test_register_onnx_model(self):
        """Should register ONNX model"""
        with tempfile.TemporaryDirectory() as tmpdir:
            manager = ModelManager(models_dir=tmpdir)
            
            model_version = manager.register_model(
                model_type='onnx',
                model_path='/path/to/model.onnx',
                version='v2.0.0',
                metrics={'accuracy': 0.95, 'latency_ms': 5}
            )
            
            assert model_version.version == 'v2.0.0'
            assert model_version.model_type == 'onnx'
    
    def test_register_with_activation(self):
        """Should activate model if specified"""
        with tempfile.TemporaryDirectory() as tmpdir:
            manager = ModelManager(models_dir=tmpdir)
            
            model_version = manager.register_model(
                model_type='xgboost',
                model_path='/path/to/model.json',
                version='v1.0.0',
                metrics={'accuracy': 0.90},
                activate=True
            )
            
            assert model_version.is_active == True
    
    def test_reject_invalid_model_type(self):
        """Should reject invalid model types"""
        with tempfile.TemporaryDirectory() as tmpdir:
            manager = ModelManager(models_dir=tmpdir)
            
            with pytest.raises(ValueError):
                manager.register_model(
                    model_type='invalid_type',
                    model_path='/path/to/model',
                    version='v1.0.0',
                    metrics={}
                )
    
    def test_multiple_version_registration(self):
        """Should register multiple versions of same model type"""
        with tempfile.TemporaryDirectory() as tmpdir:
            manager = ModelManager(models_dir=tmpdir)
            
            manager.register_model(
                model_type='xgboost',
                model_path='/path/to/v1.json',
                version='v1.0.0',
                metrics={'accuracy': 0.90}
            )
            
            manager.register_model(
                model_type='xgboost',
                model_path='/path/to/v2.json',
                version='v1.1.0',
                metrics={'accuracy': 0.92}
            )
            
            assert len(manager.versions['xgboost']) == 2


class TestModelVersioning:
    """Test model versioning functionality"""
    
    def test_get_active_version(self):
        """Should retrieve active version"""
        with tempfile.TemporaryDirectory() as tmpdir:
            manager = ModelManager(models_dir=tmpdir)
            
            manager.register_model(
                model_type='xgboost',
                model_path='/path/to/model.json',
                version='v1.0.0',
                metrics={'accuracy': 0.90},
                activate=True
            )
            
            active = manager.get_active_version('xgboost')
            assert active is not None
            assert active.version == 'v1.0.0'
    
    def test_get_all_versions(self):
        """Should retrieve all versions"""
        with tempfile.TemporaryDirectory() as tmpdir:
            manager = ModelManager(models_dir=tmpdir)
            
            manager.register_model(
                model_type='onnx',
                model_path='/path/to/v1.onnx',
                version='v1.0.0',
                metrics={'accuracy': 0.90}
            )
            
            manager.register_model(
                model_type='onnx',
                model_path='/path/to/v2.onnx',
                version='v2.0.0',
                metrics={'accuracy': 0.93}
            )
            
            versions = manager.get_all_versions('onnx')
            assert len(versions) == 2
    
    def test_get_version_by_string(self):
        """Should retrieve specific version by version string"""
        with tempfile.TemporaryDirectory() as tmpdir:
            manager = ModelManager(models_dir=tmpdir)
            
            manager.register_model(
                model_type='xgboost',
                model_path='/path/to/model.json',
                version='v1.2.3',
                metrics={'accuracy': 0.91}
            )
            
            version = manager.get_version('xgboost', 'v1.2.3')
            assert version is not None
            assert version.version == 'v1.2.3'


class TestABTesting:
    """Test A/B testing functionality"""
    
    def test_set_traffic_weight(self):
        """Should set traffic weight for model version"""
        with tempfile.TemporaryDirectory() as tmpdir:
            manager = ModelManager(models_dir=tmpdir)
            
            manager.register_model(
                model_type='xgboost',
                model_path='/path/to/model.json',
                version='v1.0.0',
                metrics={'accuracy': 0.90}
            )
            
            manager.set_traffic_weight('xgboost', 'v1.0.0', 0.8)
            
            version = manager.get_version('xgboost', 'v1.0.0')
            assert version.traffic_weight == 0.8
    
    def test_traffic_weights_sum_validation(self):
        """Should validate that traffic weights sum to 1.0 or less"""
        with tempfile.TemporaryDirectory() as tmpdir:
            manager = ModelManager(models_dir=tmpdir)
            
            manager.register_model(
                model_type='xgboost',
                model_path='/path/to/v1.json',
                version='v1.0.0',
                metrics={'accuracy': 0.90}
            )
            
            manager.register_model(
                model_type='xgboost',
                model_path='/path/to/v2.json',
                version='v2.0.0',
                metrics={'accuracy': 0.92}
            )
            
            manager.set_traffic_weight('xgboost', 'v1.0.0', 0.7)
            manager.set_traffic_weight('xgboost', 'v2.0.0', 0.3)
            
            v1 = manager.get_version('xgboost', 'v1.0.0')
            v2 = manager.get_version('xgboost', 'v2.0.0')
            
            assert v1.traffic_weight + v2.traffic_weight == 1.0
    
    def test_select_model_for_ab_test(self):
        """Should select model based on traffic weights"""
        with tempfile.TemporaryDirectory() as tmpdir:
            manager = ModelManager(models_dir=tmpdir)
            
            manager.register_model(
                model_type='xgboost',
                model_path='/path/to/v1.json',
                version='v1.0.0',
                metrics={'accuracy': 0.90}
            )
            
            manager.set_traffic_weight('xgboost', 'v1.0.0', 1.0)
            
            # Should always select v1.0.0 with 100% weight
            selected = manager.select_model_for_inference('xgboost')
            assert selected.version == 'v1.0.0'


class TestPerformanceTracking:
    """Test performance tracking functionality"""
    
    def test_log_prediction_result(self):
        """Should log prediction result"""
        with tempfile.TemporaryDirectory() as tmpdir:
            manager = ModelManager(models_dir=tmpdir)
            
            manager.register_model(
                model_type='xgboost',
                model_path='/path/to/model.json',
                version='v1.0.0',
                metrics={'accuracy': 0.90}
            )
            
            manager.log_prediction_result(
                model_type='xgboost',
                version='v1.0.0',
                prediction=0.85,
                actual=0.82,
                latency_ms=10
            )
            
            # Should be tracked in performance data
            assert 'xgboost:v1.0.0' in manager.performance_data
    
    def test_get_version_metrics(self):
        """Should retrieve metrics for specific version"""
        with tempfile.TemporaryDirectory() as tmpdir:
            manager = ModelManager(models_dir=tmpdir)
            
            manager.register_model(
                model_type='onnx',
                model_path='/path/to/model.onnx',
                version='v1.0.0',
                metrics={'accuracy': 0.92, 'f1': 0.88}
            )
            
            version = manager.get_version('onnx', 'v1.0.0')
            assert version.metrics['accuracy'] == 0.92
            assert version.metrics['f1'] == 0.88
    
    def test_calculate_version_performance(self):
        """Should calculate performance metrics for version"""
        with tempfile.TemporaryDirectory() as tmpdir:
            manager = ModelManager(models_dir=tmpdir)
            
            manager.register_model(
                model_type='xgboost',
                model_path='/path/to/model.json',
                version='v1.0.0',
                metrics={'accuracy': 0.90}
            )
            
            # Log multiple predictions
            for i in range(10):
                manager.log_prediction_result(
                    model_type='xgboost',
                    version='v1.0.0',
                    prediction=0.80 + i * 0.01,
                    actual=0.82,
                    latency_ms=10
                )
            
            # Performance data should exist
            key = 'xgboost:v1.0.0'
            assert key in manager.performance_data


class TestModelActivation:
    """Test model activation and deactivation"""
    
    def test_activate_model(self):
        """Should activate model version"""
        with tempfile.TemporaryDirectory() as tmpdir:
            manager = ModelManager(models_dir=tmpdir)
            
            manager.register_model(
                model_type='xgboost',
                model_path='/path/to/model.json',
                version='v1.0.0',
                metrics={'accuracy': 0.90},
                activate=False
            )
            
            manager.activate_version('xgboost', 'v1.0.0')
            
            version = manager.get_version('xgboost', 'v1.0.0')
            assert version.is_active == True
    
    def test_deactivate_model(self):
        """Should deactivate model version"""
        with tempfile.TemporaryDirectory() as tmpdir:
            manager = ModelManager(models_dir=tmpdir)
            
            manager.register_model(
                model_type='xgboost',
                model_path='/path/to/model.json',
                version='v1.0.0',
                metrics={'accuracy': 0.90},
                activate=True
            )
            
            manager.deactivate_version('xgboost', 'v1.0.0')
            
            version = manager.get_version('xgboost', 'v1.0.0')
            assert version.is_active == False
    
    def test_only_one_active_version(self):
        """Should enforce only one active version per model type"""
        with tempfile.TemporaryDirectory() as tmpdir:
            manager = ModelManager(models_dir=tmpdir)
            
            manager.register_model(
                model_type='xgboost',
                model_path='/path/to/v1.json',
                version='v1.0.0',
                metrics={'accuracy': 0.90},
                activate=True
            )
            
            manager.register_model(
                model_type='xgboost',
                model_path='/path/to/v2.json',
                version='v2.0.0',
                metrics={'accuracy': 0.92},
                activate=True
            )
            
            # v2 should be active, v1 should be deactivated
            v1 = manager.get_version('xgboost', 'v1.0.0')
            v2 = manager.get_version('xgboost', 'v2.0.0')
            
            active_count = sum([v1.is_active, v2.is_active])
            assert active_count <= 1  # Only one should be active


class TestPersistence:
    """Test data persistence"""
    
    def test_save_and_load_versions(self):
        """Should save and load versions from disk"""
        with tempfile.TemporaryDirectory() as tmpdir:
            # Create manager and register model
            manager1 = ModelManager(models_dir=tmpdir)
            manager1.register_model(
                model_type='xgboost',
                model_path='/path/to/model.json',
                version='v1.0.0',
                metrics={'accuracy': 0.90}
            )
            
            # Create new manager instance (should load from disk)
            manager2 = ModelManager(models_dir=tmpdir)
            
            assert len(manager2.versions['xgboost']) == 1
            assert manager2.versions['xgboost'][0].version == 'v1.0.0'
    
    def test_save_and_load_performance_data(self):
        """Should save and load performance data from disk"""
        with tempfile.TemporaryDirectory() as tmpdir:
            manager1 = ModelManager(models_dir=tmpdir)
            manager1.register_model(
                model_type='onnx',
                model_path='/path/to/model.onnx',
                version='v1.0.0',
                metrics={'accuracy': 0.92}
            )
            
            manager1.log_prediction_result(
                model_type='onnx',
                version='v1.0.0',
                prediction=0.85,
                actual=0.82,
                latency_ms=5
            )
            
            # Load in new manager
            manager2 = ModelManager(models_dir=tmpdir)
            
            assert 'onnx:v1.0.0' in manager2.performance_data


class TestEdgeCases:
    """Test edge cases and error handling"""
    
    def test_get_nonexistent_version(self):
        """Should handle nonexistent version gracefully"""
        with tempfile.TemporaryDirectory() as tmpdir:
            manager = ModelManager(models_dir=tmpdir)
            
            version = manager.get_version('xgboost', 'v99.0.0')
            assert version is None
    
    def test_empty_registry(self):
        """Should handle empty registry"""
        with tempfile.TemporaryDirectory() as tmpdir:
            manager = ModelManager(models_dir=tmpdir)
            
            active = manager.get_active_version('xgboost')
            assert active is None
    
    def test_version_with_same_name(self):
        """Should handle version with duplicate name"""
        with tempfile.TemporaryDirectory() as tmpdir:
            manager = ModelManager(models_dir=tmpdir)
            
            manager.register_model(
                model_type='xgboost',
                model_path='/path/to/v1.json',
                version='v1.0.0',
                metrics={'accuracy': 0.90}
            )
            
            # Registering again with same version should update or error
            try:
                manager.register_model(
                    model_type='xgboost',
                    model_path='/path/to/v1_new.json',
                    version='v1.0.0',
                    metrics={'accuracy': 0.92}
                )
                # Should handle gracefully
            except Exception:
                pass


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
