#!/bin/bash

set -e

echo "🚀 Starting production deployment..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="$HOME/anki-clone"
REPO_URL="https://github.com/tonyvu2508/Anki-clone.git"
COMPOSE_FILE="docker-compose.prod.yml"

# Check if .env.production exists
if [ ! -f "$PROJECT_DIR/.env.production" ]; then
    echo -e "${YELLOW}⚠️  .env.production not found. Creating from example...${NC}"
    if [ -f "$PROJECT_DIR/.env.production.example" ]; then
        cp "$PROJECT_DIR/.env.production.example" "$PROJECT_DIR/.env.production"
        echo -e "${RED}⚠️  IMPORTANT: Please edit .env.production and set JWT_SECRET and other values!${NC}"
        echo -e "${YELLOW}Press Enter to continue after updating .env.production, or Ctrl+C to cancel...${NC}"
        read
    else
        echo -e "${RED}Error: .env.production.example not found${NC}"
        exit 1
    fi
fi

# Load environment variables
if [ -f "$PROJECT_DIR/.env.production" ]; then
    export $(cat "$PROJECT_DIR/.env.production" | grep -v '^#' | xargs)
    echo -e "${GREEN}✅ Loaded environment variables from .env.production${NC}"
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
sg docker -c "cd $PROJECT_DIR && docker compose -f $COMPOSE_FILE down" || true

# Remove old images (optional, to save space)
echo -e "${GREEN}🧹 Cleaning up old images...${NC}"
sg docker -c "docker image prune -f" || true

# Build and start containers
echo -e "${GREEN}🔨 Building and starting containers...${NC}"
sg docker -c "cd $PROJECT_DIR && docker compose -f $COMPOSE_FILE up -d --build"

# Wait for services to be ready
echo -e "${GREEN}⏳ Waiting for services to start...${NC}"
sleep 15

# Check container status
echo -e "${GREEN}📊 Container status:${NC}"
sg docker -c "cd $PROJECT_DIR && docker compose -f $COMPOSE_FILE ps"

# Check health
echo -e "${GREEN}🏥 Checking service health...${NC}"
sleep 5

# Check backend logs
echo -e "${GREEN}📋 Backend logs (last 15 lines):${NC}"
sg docker -c "cd $PROJECT_DIR && docker compose -f $COMPOSE_FILE logs --tail=15 backend"

# Test connectivity
echo -e "${GREEN}🔍 Testing connectivity...${NC}"
if curl -f -s http://localhost:3000 > /dev/null; then
    echo -e "${GREEN}✅ Frontend is accessible${NC}"
else
    echo -e "${RED}❌ Frontend is not accessible${NC}"
fi

if curl -f -s http://localhost:4000 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend is accessible${NC}"
else
    echo -e "${YELLOW}⚠️  Backend may not have a root endpoint (this is normal)${NC}"
fi

# Check MongoDB connection
echo -e "${GREEN}🔍 Checking MongoDB connection...${NC}"
if sg docker -c "cd $PROJECT_DIR && docker compose -f $COMPOSE_FILE exec -T mongo mongosh --quiet --eval 'db.runCommand(\"ping\").ok' anki_clone" | grep -q "1"; then
    echo -e "${GREEN}✅ MongoDB is accessible${NC}"
else
    echo -e "${RED}❌ MongoDB connection check failed${NC}"
fi

echo -e "${GREEN}✅ Production deployment completed!${NC}"
echo ""
echo "📝 Services (accessible via Nginx on port 80):"
echo "  - Frontend: http://localhost:3000 (internal)"
echo "  - Backend API: http://localhost:4000 (internal)"
echo "  - Public: http://3.27.86.45 (via Nginx)"
echo ""
echo "📋 Useful commands:"
echo "  - View logs: cd $PROJECT_DIR && sg docker -c 'docker compose -f $COMPOSE_FILE logs -f'"
echo "  - Restart: cd $PROJECT_DIR && sg docker -c 'docker compose -f $COMPOSE_FILE restart'"
echo "  - Stop: cd $PROJECT_DIR && sg docker -c 'docker compose -f $COMPOSE_FILE down'"
echo "  - Update: ~/deploy-prod.sh"

