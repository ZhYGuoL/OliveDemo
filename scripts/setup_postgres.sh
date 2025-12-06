#!/bin/bash

# Script to set up PostgreSQL database with Docker

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker daemon is not running!"
    echo ""
    echo "Please start Docker Desktop and try again."
    echo "On macOS: Open Docker Desktop application"
    exit 1
fi

echo "✅ Docker is running"
echo "🚀 Starting PostgreSQL container..."
docker-compose up -d

echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 5

# Wait for PostgreSQL to be fully ready
until docker exec ecommerce_postgres pg_isready -U postgres > /dev/null 2>&1; do
  echo "Waiting for PostgreSQL..."
  sleep 2
done

echo "✅ PostgreSQL is ready!"
echo ""
echo "Connection details:"
echo "  Host: localhost"
echo "  Port: 5433"
echo "  Database: ecommerce"
echo "  Username: postgres"
echo "  Password: postgres"
echo ""
echo "Connection string:"
echo "  postgresql://postgres:postgres@localhost:5433/ecommerce"
echo ""
echo "To stop the database: docker-compose down"
echo "To view logs: docker-compose logs -f"

