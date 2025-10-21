#!/usr/bin/env python3
"""
LSTM Model Training and ONNX Export Script

This script demonstrates how to train an LSTM model on historical
arbitrage data and export it to ONNX format for use with the AI engine.

Usage:
    python scripts/train_lstm_model.py --data-path data/training_data.csv

Note: This is a template. Replace with your actual training data and logic.
"""

import os
import argparse
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
import pandas as pd


class OmniLSTM(nn.Module):
    """LSTM model for arbitrage opportunity prediction"""
    def __init__(self, input_size=8, hidden_size=128, output_size=1, num_layers=2):
        super(OmniLSTM, self).__init__()
        self.lstm = nn.LSTM(input_size, hidden_size, num_layers, batch_first=True)
        self.fc = nn.Linear(hidden_size, output_size)

    def forward(self, x):
        out, _ = self.lstm(x)
        return torch.sigmoid(self.fc(out[:, -1, :]))


class ArbitrageDataset(Dataset):
    """PyTorch Dataset for arbitrage opportunities"""
    def __init__(self, features, labels):
        self.features = torch.FloatTensor(features)
        self.labels = torch.FloatTensor(labels)
    
    def __len__(self):
        return len(self.features)
    
    def __getitem__(self, idx):
        return self.features[idx], self.labels[idx]


def load_training_data(data_path):
    """
    Load and preprocess training data
    
    Expected CSV format:
    profit_usd,profit_ratio,route_complexity,gas_millions,confidence_score,
    time_of_day,dex_count,input_amount_thousands,success
    
    Returns:
        X: Feature matrix
        y: Labels (0 or 1)
    """
    print(f"📂 Loading data from: {data_path}")
    
    if not os.path.exists(data_path):
        print(f"⚠️  Data file not found. Creating sample data...")
        return create_sample_data()
    
    df = pd.read_csv(data_path)
    
    feature_columns = [
        'profit_usd', 'profit_ratio', 'route_complexity', 'gas_millions',
        'confidence_score', 'time_of_day', 'dex_count', 'input_amount_thousands'
    ]
    
    X = df[feature_columns].values
    y = df['success'].values.reshape(-1, 1)
    
    print(f"✅ Loaded {len(X)} samples")
    return X, y


def create_sample_data():
    """
    Create sample training data for demonstration
    In production, replace with actual historical data
    """
    print("🎲 Generating sample training data...")
    
    np.random.seed(42)
    n_samples = 1000
    
    # Generate synthetic features
    profit_usd = np.random.uniform(3, 50, n_samples)
    profit_ratio = np.random.uniform(1.0, 1.1, n_samples)
    route_complexity = np.random.randint(2, 5, n_samples)
    gas_millions = np.random.uniform(0.1, 1.0, n_samples)
    confidence_score = np.random.uniform(0.5, 1.0, n_samples)
    time_of_day = np.random.uniform(0, 1, n_samples)
    dex_count = np.random.randint(1, 4, n_samples)
    input_amount_thousands = np.random.uniform(0.5, 10, n_samples)
    
    # Generate labels based on features (simplified logic)
    success = (
        (profit_usd > 8) & 
        (profit_ratio > 1.01) & 
        (confidence_score > 0.7)
    ).astype(float)
    
    X = np.column_stack([
        profit_usd, profit_ratio, route_complexity, gas_millions,
        confidence_score, time_of_day, dex_count, input_amount_thousands
    ])
    
    y = success.reshape(-1, 1)
    
    print(f"✅ Generated {n_samples} samples (Success rate: {success.mean():.2%})")
    return X, y


def train_model(model, train_loader, val_loader, epochs=50, learning_rate=0.001):
    """Train the LSTM model"""
    print("\n🚀 Training model...")
    
    criterion = nn.BCELoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=learning_rate)
    
    best_val_loss = float('inf')
    
    for epoch in range(epochs):
        # Training
        model.train()
        train_loss = 0.0
        train_correct = 0
        train_total = 0
        
        for features, labels in train_loader:
            optimizer.zero_grad()
            
            # Add sequence dimension
            features = features.unsqueeze(1)
            
            outputs = model(features)
            loss = criterion(outputs, labels)
            
            loss.backward()
            optimizer.step()
            
            train_loss += loss.item()
            predictions = (outputs > 0.5).float()
            train_correct += (predictions == labels).sum().item()
            train_total += labels.size(0)
        
        # Validation
        model.eval()
        val_loss = 0.0
        val_correct = 0
        val_total = 0
        
        with torch.no_grad():
            for features, labels in val_loader:
                features = features.unsqueeze(1)
                outputs = model(features)
                loss = criterion(outputs, labels)
                
                val_loss += loss.item()
                predictions = (outputs > 0.5).float()
                val_correct += (predictions == labels).sum().item()
                val_total += labels.size(0)
        
        train_loss /= len(train_loader)
        val_loss /= len(val_loader)
        train_acc = train_correct / train_total
        val_acc = val_correct / val_total
        
        if (epoch + 1) % 10 == 0:
            print(f"Epoch {epoch+1}/{epochs} - "
                  f"Train Loss: {train_loss:.4f}, Train Acc: {train_acc:.4f} - "
                  f"Val Loss: {val_loss:.4f}, Val Acc: {val_acc:.4f}")
        
        if val_loss < best_val_loss:
            best_val_loss = val_loss
    
    print(f"\n✅ Training complete! Best validation loss: {best_val_loss:.4f}")
    return model


def export_to_onnx(model, output_path):
    """Export trained model to ONNX format"""
    print(f"\n📦 Exporting model to ONNX: {output_path}")
    
    # Create dummy input
    dummy_input = torch.randn(1, 1, 8)
    
    # Export model
    torch.onnx.export(
        model,
        dummy_input,
        output_path,
        input_names=['input'],
        output_names=['output'],
        dynamic_axes={
            'input': {0: 'batch_size'},
            'output': {0: 'batch_size'}
        },
        opset_version=11
    )
    
    print(f"✅ Model exported successfully!")
    
    # Verify export
    try:
        import onnxruntime as ort
        session = ort.InferenceSession(output_path)
        
        test_input = np.random.randn(1, 1, 8).astype(np.float32)
        result = session.run(None, {'input': test_input})
        
        print(f"✅ ONNX model verified! Output shape: {result[0].shape}")
    except ImportError:
        print("⚠️  onnxruntime not installed, skipping verification")


def main():
    parser = argparse.ArgumentParser(description='Train LSTM model for arbitrage prediction')
    parser.add_argument('--data-path', type=str, default='data/training_data.csv',
                        help='Path to training data CSV')
    parser.add_argument('--output-path', type=str, default='data/models/lstm_omni.onnx',
                        help='Path to save ONNX model')
    parser.add_argument('--epochs', type=int, default=50,
                        help='Number of training epochs')
    parser.add_argument('--batch-size', type=int, default=32,
                        help='Training batch size')
    parser.add_argument('--learning-rate', type=float, default=0.001,
                        help='Learning rate')
    
    args = parser.parse_args()
    
    print("=" * 70)
    print("LSTM Model Training for APEX Arbitrage System")
    print("=" * 70)
    
    # Create output directory
    os.makedirs(os.path.dirname(args.output_path), exist_ok=True)
    
    # Load data
    X, y = load_training_data(args.data_path)
    
    # Normalize features
    print("\n🔄 Normalizing features...")
    scaler = StandardScaler()
    X = scaler.fit_transform(X)
    
    # Split data
    X_train, X_val, y_train, y_val = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    
    print(f"📊 Training set: {len(X_train)} samples")
    print(f"📊 Validation set: {len(X_val)} samples")
    
    # Create datasets and loaders
    train_dataset = ArbitrageDataset(X_train, y_train)
    val_dataset = ArbitrageDataset(X_val, y_val)
    
    train_loader = DataLoader(train_dataset, batch_size=args.batch_size, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=args.batch_size)
    
    # Initialize model
    model = OmniLSTM(input_size=8, hidden_size=128, output_size=1, num_layers=2)
    print(f"\n🤖 Model initialized: {sum(p.numel() for p in model.parameters())} parameters")
    
    # Train model
    model = train_model(
        model, train_loader, val_loader,
        epochs=args.epochs,
        learning_rate=args.learning_rate
    )
    
    # Export to ONNX
    export_to_onnx(model, args.output_path)
    
    print("\n" + "=" * 70)
    print("✅ Training and export complete!")
    print(f"📁 Model saved to: {args.output_path}")
    print(f"📝 Use this model with: AI_MODEL_PATH={args.output_path}")
    print("=" * 70)


if __name__ == "__main__":
    main()
