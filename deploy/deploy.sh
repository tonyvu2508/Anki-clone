#!/bin/bash

set -e

echo "🚀 Starting deployment..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="$HOME/anki-clone"
REPO_URL="https://github.com/tonyvu2508/Anki-clone.git"

# Check if running as ubuntu user
if [ "$USER" != "ubuntu" ]; then
    echo -e "${YELLOW}Warning: This script is designed to run as 'ubuntu' user${NC}"
fi

# Navigate to project directory
cd $PROJECT_DIR || {
    echo -e "${RED}Error: Project directory not found. Cloning repository...${NC}"
    mkdir -p $PROJECT_DIR
    cd $PROJECT_DIR
    git clone $REPO_URL .
}

# Pull latest changes
echo -e "${GREEN}📥 Pulling latest changes from repository...${NC}"
git pull origin main || {
    echo -e "${YELLOW}Warning: git pull failed, continuing anyway...${NC}"
}

# Stop existing containers
echo -e "${GREEN}🛑 Stopping existing containers...${NC}"
sg docker -c "cd $PROJECT_DIR && docker compose down" || true

# Build and start containers
echo -e "${GREEN}🔨 Building and starting containers...${NC}"
sg docker -c "cd $PROJECT_DIR && docker compose up -d --build"

# Wait for services to be ready
echo -e "${GREEN}⏳ Waiting for services to start...${NC}"
sleep 10

# Check container status
echo -e "${GREEN}📊 Container status:${NC}"
sg docker -c "cd $PROJECT_DIR && docker compose ps"

# Check backend logs
echo -e "${GREEN}📋 Backend logs (last 10 lines):${NC}"
sg docker -c "cd $PROJECT_DIR && docker compose logs --tail=10 backend"

# Test connectivity
echo -e "${GREEN}🔍 Testing connectivity...${NC}"
if curl -f -s http://localhost:3000 > /dev/null; then
    echo -e "${GREEN}✅ Frontend is accessible${NC}"
else
    echo -e "${RED}❌ Frontend is not accessible${NC}"
fi

if curl -f -s http://localhost:4000 > /dev/null; then
    echo -e "${GREEN}✅ Backend is accessible${NC}"
else
    echo -e "${RED}❌ Backend is not accessible${NC}"
fi

echo -e "${GREEN}✅ Deployment completed!${NC}"
echo ""
echo "📝 Services:"
echo "  - Frontend: http://localhost:3000"
echo "  - Backend API: http://localhost:4000"
echo ""
echo "📋 Useful commands:"
echo "  - View logs: cd $PROJECT_DIR && sg docker -c 'docker compose logs -f'"
echo "  - Restart: cd $PROJECT_DIR && sg docker -c 'docker compose restart'"
echo "  - Stop: cd $PROJECT_DIR && sg docker -c 'docker compose down'"

