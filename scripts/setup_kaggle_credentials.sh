#!/bin/bash

# Script to set up Kaggle credentials

KAGGLE_DIR="$HOME/.kaggle"
KAGGLE_FILE="$KAGGLE_DIR/kaggle.json"

# Your API key
API_KEY="KGAT_4d0faeaaad5a2c2042bd5b71cefec5ff"

echo "🔧 Setting up Kaggle API credentials..."
echo ""
echo "Your API key: $API_KEY"
echo ""
read -p "Enter your Kaggle username: " USERNAME

if [ -z "$USERNAME" ]; then
    echo "❌ Username is required!"
    exit 1
fi

# Create directory if it doesn't exist
mkdir -p "$KAGGLE_DIR"
chmod 700 "$KAGGLE_DIR"

# Create kaggle.json file
cat > "$KAGGLE_FILE" << EOF
{
  "username": "$USERNAME",
  "key": "$API_KEY"
}
EOF

# Set proper permissions
chmod 600 "$KAGGLE_FILE"

echo ""
echo "✅ Kaggle credentials saved to $KAGGLE_FILE"
echo ""
echo "Next steps:"
echo "1. Accept dataset terms: https://www.kaggle.com/datasets/imranalishahh/comprehensive-synthetic-e-commerce-dataset"
echo "2. Run: python3 scripts/download_kaggle_dataset.py"

