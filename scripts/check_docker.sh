#!/bin/bash

# Check if Docker is running and wait for it if needed

echo "Checking Docker status..."

if docker info > /dev/null 2>&1; then
    echo "✅ Docker is running!"
    exit 0
else
    echo "❌ Docker daemon is not running!"
    echo ""
    echo "To start Docker Desktop on macOS:"
    echo "  1. Open Finder"
    echo "  2. Go to Applications"
    echo "  3. Double-click 'Docker' application"
    echo "  4. Wait for Docker to start (whale icon in menu bar)"
    echo ""
    echo "Or run: open -a Docker"
    echo ""
    read -p "Press Enter after starting Docker Desktop, or Ctrl+C to cancel..."
    
    # Wait for Docker to start (max 60 seconds)
    echo "Waiting for Docker to start..."
    for i in {1..60}; do
        if docker info > /dev/null 2>&1; then
            echo "✅ Docker is now running!"
            exit 0
        fi
        sleep 1
        echo -n "."
    done
    
    echo ""
    echo "❌ Docker did not start. Please check Docker Desktop."
    exit 1
fi

