"""Download Kaggle dataset for e-commerce data."""
import os
import zipfile
import shutil
from pathlib import Path

def download_kaggle_dataset():
    """
    Download the Kaggle e-commerce dataset.
    
    Requires Kaggle API credentials:
    1. Go to https://www.kaggle.com/account
    2. Create API token (download kaggle.json)
    3. Place it in ~/.kaggle/kaggle.json
    """
    try:
        import kaggle
    except ImportError:
        print("Installing kaggle package...")
        os.system("pip install kaggle")
        import kaggle
    
    dataset_name = "imranalishahh/comprehensive-synthetic-e-commerce-dataset"
    data_dir = Path("data/kaggle")
    data_dir.mkdir(parents=True, exist_ok=True)
    
    print(f"📥 Downloading dataset: {dataset_name}")
    print("This may take a few minutes...")
    
    try:
        kaggle.api.dataset_download_files(
            dataset_name,
            path=str(data_dir),
            unzip=True
        )
        print(f"✅ Dataset downloaded to {data_dir}")
        return data_dir
    except Exception as e:
        print(f"❌ Error downloading dataset: {e}")
        print("\nMake sure you have:")
        print("1. Kaggle account (https://www.kaggle.com)")
        print("2. API token at ~/.kaggle/kaggle.json")
        print("3. Accepted the dataset terms on Kaggle")
        raise

if __name__ == "__main__":
    download_kaggle_dataset()

