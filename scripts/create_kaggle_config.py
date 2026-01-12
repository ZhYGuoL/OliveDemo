#!/usr/bin/env python3
"""Create Kaggle API config file from username and key."""
import json
import os
from pathlib import Path

def create_kaggle_config(username, api_key):
    """Create kaggle.json file with credentials."""
    kaggle_dir = Path.home() / ".kaggle"
    kaggle_file = kaggle_dir / "kaggle.json"
    
    # Create directory if it doesn't exist
    kaggle_dir.mkdir(mode=0o700, exist_ok=True)
    
    # Create config
    config = {
        "username": username,
        "key": api_key
    }
    
    # Write file
    with open(kaggle_file, 'w') as f:
        json.dump(config, f)
    
    # Set permissions
    os.chmod(kaggle_file, 0o600)
    
    print(f"✅ Kaggle credentials saved to {kaggle_file}")
    print("You can now download datasets!")

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) != 3:
        print("Usage: python create_kaggle_config.py <username> <api_key>")
        print("\nExample:")
        print("  python create_kaggle_config.py myusername KGAT_4d0faeaaad5a2c2042bd5b71cefec5ff")
        sys.exit(1)
    
    username = sys.argv[1]
    api_key = sys.argv[2]
    
    create_kaggle_config(username, api_key)

