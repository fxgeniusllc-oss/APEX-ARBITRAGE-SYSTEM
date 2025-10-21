# ML Models Directory

This directory contains the machine learning models used by the APEX Arbitrage System.

## Model Files

### LSTM ONNX Model
- **File**: `lstm_omni.onnx`
- **Purpose**: Fast inference for real-time arbitrage prediction
- **Input**: 8-feature vector representing arbitrage opportunity
- **Output**: Confidence score (0.0 - 1.0)

### XGBoost Model
- **File**: `xgboost_model.json`
- **Purpose**: Accuracy-focused opportunity filtering
- **Input**: 10-feature vector
- **Output**: Success probability

### ONNX Ensemble Model
- **File**: `onnx_model.onnx`
- **Purpose**: Speed-optimized ensemble prediction
- **Input**: 10-feature vector
- **Output**: Probability score

## Feature Vectors

### LSTM Model (8 features)
1. `profit_usd` - Expected profit in USD
2. `profit_ratio` - Output/Input ratio
3. `route_complexity` - Number of tokens in route
4. `gas_millions` - Gas estimate in millions
5. `confidence_score` - Base confidence from scanner
6. `time_of_day` - Normalized time (0.0 - 1.0)
7. `dex_count` - Number of DEXes in route
8. `input_amount_thousands` - Input amount in thousands

### Ensemble Models (10 features)
Includes all LSTM features plus:
9. `is_2_hop` - Binary flag for 2-hop routes
10. `is_3_hop` - Binary flag for 3-hop routes

## Model Training

Models are trained on historical arbitrage execution data with features:
- Success/failure outcomes
- Profit amounts
- Gas costs
- Market conditions
- Route characteristics

## Model Deployment

### Development
Place pre-trained model files in this directory. The system will automatically detect and load them.

### Production
Ensure models are:
- Validated on test data
- Performance tested
- Version controlled
- Backed up regularly

## Model Updates

To update models:
1. Train new model on recent data
2. Export to ONNX format (for PyTorch models)
3. Test inference speed and accuracy
4. Replace old model file
5. Restart AI engine

## Performance Expectations

### LSTM Model
- Inference time: 5-15ms
- Accuracy: 85-90%
- F1 Score: 0.82-0.87

### Ensemble Models
- Inference time: 10-20ms
- Accuracy: 92-95%
- F1 Score: 0.89-0.93

## Notes

- Model files are excluded from git (see .gitignore)
- Download trained models separately
- Contact repository maintainer for access to pre-trained models
- Models should be retrained periodically with fresh data
