#!/bin/bash

# Script to help set up Kaggle API credentials

KAGGLE_DIR="$HOME/.kaggle"
KAGGLE_FILE="$KAGGLE_DIR/kaggle.json"

echo "🔧 Setting up Kaggle API credentials..."
echo ""

# Create .kaggle directory if it doesn't exist
if [ ! -d "$KAGGLE_DIR" ]; then
    echo "Creating ~/.kaggle directory..."
    mkdir -p "$KAGGLE_DIR"
    chmod 700 "$KAGGLE_DIR"
fi

# Check if kaggle.json already exists
if [ -f "$KAGGLE_FILE" ]; then
    echo "✅ Kaggle credentials file already exists at $KAGGLE_FILE"
    echo ""
    echo "To update it:"
    echo "1. Go to https://www.kaggle.com/account"
    echo "2. Scroll to 'API' section"
    echo "3. Click 'Create New Token'"
    echo "4. Save the downloaded kaggle.json file"
    echo "5. Run: cp ~/Downloads/kaggle.json ~/.kaggle/kaggle.json"
    echo "6. Run: chmod 600 ~/.kaggle/kaggle.json"
    exit 0
fi

echo "📋 Instructions to get Kaggle API token:"
echo ""
echo "1. Go to: https://www.kaggle.com/account"
echo "2. Scroll down to the 'API' section"
echo "3. Click 'Create New Token' button"
echo "   This will download a file named 'kaggle.json'"
echo ""
echo "4. Once downloaded, run these commands:"
echo "   cp ~/Downloads/kaggle.json ~/.kaggle/kaggle.json"
echo "   chmod 600 ~/.kaggle/kaggle.json"
echo ""
echo "5. Accept the dataset terms:"
echo "   https://www.kaggle.com/datasets/imranalishahh/comprehensive-synthetic-e-commerce-dataset"
echo ""
read -p "Press Enter after you've downloaded kaggle.json and placed it in ~/.kaggle/..."

# Check if file was placed
if [ -f "$KAGGLE_FILE" ]; then
    chmod 600 "$KAGGLE_FILE"
    echo "✅ Kaggle credentials set up successfully!"
else
    echo "❌ kaggle.json not found. Please follow the instructions above."
    exit 1
fi

