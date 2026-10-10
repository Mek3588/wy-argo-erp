#!/bin/bash
set -e

echo "🚀 Starting WY Argo Dairy ERP Deployment..."

# 1. Pull latest code if in a git directory
if [ -d ".git" ]; then
  echo "📥 Pulling latest changes from Git..."
  git pull origin main
fi

# 2. Check if .env exists, if not copy from example
if [ ! -f ".env" ]; then
  echo "⚙️  Generating default .env from .env.example..."
  cp .env.example .env
fi

# 3. Build and launch with Docker Compose
echo "🐳 Building and starting Docker containers..."
docker compose down || true
docker compose up -d --build

echo "✅ WY Argo Dairy ERP is successfully deployed and running!"
echo "🌐 Web Dashboard: http://localhost"
echo "🥛 Backend API:    http://localhost:5000/api"

