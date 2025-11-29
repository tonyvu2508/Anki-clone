#!/bin/bash

# System Health Check Script for Anki Production Server
# Run this script on the production server to check system status

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}           ANKI PRODUCTION SERVER HEALTH CHECK${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Project directory
PROJECT_DIR="$HOME/anki-clone"
COMPOSE_FILE="docker-compose.prod.yml"

# 1. System Information
echo -e "${BLUE}📊 SYSTEM INFORMATION${NC}"
echo "─────────────────────────────────────────────────────────"
echo "Hostname: $(hostname)"
echo "Uptime: $(uptime -p 2>/dev/null || uptime)"
echo "Date: $(date)"
echo "Public IP: $(curl -s ifconfig.me 2>/dev/null || echo 'Unable to fetch')"
echo ""

# 2. System Resources
echo -e "${BLUE}💻 SYSTEM RESOURCES${NC}"
echo "─────────────────────────────────────────────────────────"
echo "CPU Usage:"
top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print "  Idle: " 100 - $1 "%"}'
echo ""
echo "Memory Usage:"
free -h | grep -E "^Mem|^Swap" | awk '{if ($2 != "0B" && $2 != "0") {used_pct = ($3/$2)*100; printf "  %s: %s / %s (%.1f%%)\n", $1, $3, $2, used_pct} else {print "  " $1 ": " $3 " / " $2}}'
echo ""
echo "Disk Usage:"
df -h / | tail -1 | awk '{print "  Root: " $3 " / " $2 " (" $5 " used)"}'
if [ -d "$PROJECT_DIR" ]; then
    du -sh "$PROJECT_DIR" 2>/dev/null | awk '{print "  Project: " $1}'
fi
echo ""

# 3. Docker Status
echo -e "${BLUE}🐳 DOCKER STATUS${NC}"
echo "─────────────────────────────────────────────────────────"
if command -v docker &> /dev/null; then
    echo "Docker Version: $(docker --version)"
    echo "Docker Compose: $(docker compose version 2>/dev/null || docker-compose --version 2>/dev/null || echo 'Not available')"
    echo ""
    echo "Docker System Info:"
    docker system df 2>/dev/null | head -5
    echo ""
    
    # Check if Docker daemon is running
    if docker info &>/dev/null; then
        echo -e "${GREEN}✅ Docker daemon is running${NC}"
    else
        echo -e "${RED}❌ Docker daemon is not running${NC}"
    fi
else
    echo -e "${RED}❌ Docker is not installed${NC}"
fi
echo ""

# 4. Container Status
echo -e "${BLUE}📦 CONTAINER STATUS${NC}"
echo "─────────────────────────────────────────────────────────"
if [ -d "$PROJECT_DIR" ] && [ -f "$PROJECT_DIR/$COMPOSE_FILE" ]; then
    cd "$PROJECT_DIR"
    
    # Check container status
    if command -v docker &> /dev/null && docker info &>/dev/null; then
        echo "Container Status:"
        sg docker -c "cd $PROJECT_DIR && docker compose -f $COMPOSE_FILE ps" 2>/dev/null || \
        docker compose -f "$COMPOSE_FILE" ps 2>/dev/null || \
        docker-compose -f "$COMPOSE_FILE" ps 2>/dev/null || echo "  Unable to check containers"
        echo ""
        
        # Check running containers
        RUNNING=$(sg docker -c "cd $PROJECT_DIR && docker compose -f $COMPOSE_FILE ps -q" 2>/dev/null | wc -l || echo "0")
        TOTAL=$(sg docker -c "cd $PROJECT_DIR && docker compose -f $COMPOSE_FILE ps -a -q" 2>/dev/null | wc -l || echo "0")
        echo "Running containers: $RUNNING / $TOTAL"
    fi
else
    echo -e "${YELLOW}⚠️  Project directory not found at $PROJECT_DIR${NC}"
fi
echo ""

# 5. Service Health Checks
echo -e "${BLUE}🏥 SERVICE HEALTH CHECKS${NC}"
echo "─────────────────────────────────────────────────────────"

# Check MongoDB
if docker ps | grep -q mongo; then
    echo -n "MongoDB: "
    if sg docker -c "cd $PROJECT_DIR && docker compose -f $COMPOSE_FILE exec -T mongo mongosh --quiet --eval 'db.runCommand(\"ping\").ok' anki_clone" 2>/dev/null | grep -q "1"; then
        echo -e "${GREEN}✅ Healthy${NC}"
    else
        echo -e "${RED}❌ Unhealthy${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  MongoDB container not running${NC}"
fi

# Check Backend
if docker ps | grep -q anki-clone-backend; then
    echo -n "Backend API: "
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/api/health 2>/dev/null || echo "000")
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "404" ]; then
        echo -e "${GREEN}✅ Accessible (HTTP $HTTP_CODE)${NC}"
    else
        echo -e "${RED}❌ Not accessible (HTTP $HTTP_CODE)${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Backend container not running${NC}"
fi

# Check Frontend
if docker ps | grep -q anki-clone-frontend; then
    echo -n "Frontend: "
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null || echo "000")
    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}✅ Accessible (HTTP $HTTP_CODE)${NC}"
    else
        echo -e "${RED}❌ Not accessible (HTTP $HTTP_CODE)${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Frontend container not running${NC}"
fi

# Check Nginx
echo -n "Nginx: "
if systemctl is-active --quiet nginx 2>/dev/null; then
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost 2>/dev/null || echo "000")
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "301" ] || [ "$HTTP_CODE" = "302" ]; then
        echo -e "${GREEN}✅ Running and accessible (HTTP $HTTP_CODE)${NC}"
    else
        echo -e "${YELLOW}⚠️  Running but returned HTTP $HTTP_CODE${NC}"
    fi
else
    echo -e "${RED}❌ Not running${NC}"
fi
echo ""

# 6. Network Connectivity
echo -e "${BLUE}🌐 NETWORK CONNECTIVITY${NC}"
echo "─────────────────────────────────────────────────────────"
echo -n "Internet connectivity: "
if ping -c 1 -W 2 8.8.8.8 &>/dev/null; then
    echo -e "${GREEN}✅ OK${NC}"
else
    echo -e "${RED}❌ Failed${NC}"
fi

echo -n "DNS resolution: "
if nslookup google.com &>/dev/null; then
    echo -e "${GREEN}✅ OK${NC}"
else
    echo -e "${RED}❌ Failed${NC}"
fi
echo ""

# 7. Firewall Status
echo -e "${BLUE}🔥 FIREWALL STATUS${NC}"
echo "─────────────────────────────────────────────────────────"
if command -v ufw &> /dev/null; then
    UFW_STATUS=$(sudo ufw status 2>/dev/null | head -1)
    echo "Status: $UFW_STATUS"
    echo "Rules:"
    sudo ufw status numbered 2>/dev/null | grep -E "22|80|443|3000|4000" || echo "  No relevant rules found"
else
    echo -e "${YELLOW}⚠️  UFW not installed${NC}"
fi
echo ""

# 8. Recent Logs (Last 5 lines per service)
echo -e "${BLUE}📋 RECENT LOGS (Last 5 lines)${NC}"
echo "─────────────────────────────────────────────────────────"
if [ -d "$PROJECT_DIR" ] && [ -f "$PROJECT_DIR/$COMPOSE_FILE" ]; then
    cd "$PROJECT_DIR"
    
    if docker ps | grep -q mongo; then
        echo "MongoDB logs:"
        sg docker -c "cd $PROJECT_DIR && docker compose -f $COMPOSE_FILE logs --tail=5 mongo" 2>/dev/null | tail -5 || echo "  Unable to fetch logs"
        echo ""
    fi
    
    if docker ps | grep -q anki-clone-backend; then
        echo "Backend logs:"
        sg docker -c "cd $PROJECT_DIR && docker compose -f $COMPOSE_FILE logs --tail=5 backend" 2>/dev/null | tail -5 || echo "  Unable to fetch logs"
        echo ""
    fi
    
    if docker ps | grep -q anki-clone-frontend; then
        echo "Frontend logs:"
        sg docker -c "cd $PROJECT_DIR && docker compose -f $COMPOSE_FILE logs --tail=5 frontend" 2>/dev/null | tail -5 || echo "  Unable to fetch logs"
        echo ""
    fi
fi

# 9. Git Status
echo -e "${BLUE}📝 GIT STATUS${NC}"
echo "─────────────────────────────────────────────────────────"
if [ -d "$PROJECT_DIR/.git" ]; then
    cd "$PROJECT_DIR"
    BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
    COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
    STATUS=$(git status --short 2>/dev/null | wc -l)
    echo "Branch: $BRANCH"
    echo "Latest commit: $COMMIT"
    echo "Uncommitted changes: $STATUS"
    
    # Check if behind remote
    git fetch -q 2>/dev/null || true
    BEHIND=$(git rev-list HEAD..origin/$BRANCH 2>/dev/null | wc -l)
    if [ "$BEHIND" -gt 0 ]; then
        echo -e "${YELLOW}⚠️  Behind remote by $BEHIND commits${NC}"
    else
        echo -e "${GREEN}✅ Up to date with remote${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Not a git repository${NC}"
fi
echo ""

# 10. Environment Check
echo -e "${BLUE}⚙️  ENVIRONMENT CHECK${NC}"
echo "─────────────────────────────────────────────────────────"
if [ -f "$PROJECT_DIR/.env.production" ]; then
    echo -e "${GREEN}✅ .env.production exists${NC}"
    if grep -q "JWT_SECRET" "$PROJECT_DIR/.env.production" && ! grep -q "change_this_in_production" "$PROJECT_DIR/.env.production"; then
        echo -e "${GREEN}✅ JWT_SECRET is set${NC}"
    else
        echo -e "${RED}❌ JWT_SECRET not properly configured${NC}"
    fi
else
    echo -e "${RED}❌ .env.production not found${NC}"
fi
echo ""

# Summary
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}                    SUMMARY${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"

# Count issues
ISSUES=0
if ! docker ps | grep -q mongo; then ((ISSUES++)); fi
if ! docker ps | grep -q anki-clone-backend; then ((ISSUES++)); fi
if ! docker ps | grep -q anki-clone-frontend; then ((ISSUES++)); fi
if ! systemctl is-active --quiet nginx 2>/dev/null; then ((ISSUES++)); fi

if [ $ISSUES -eq 0 ]; then
    echo -e "${GREEN}✅ All critical services are running${NC}"
else
    echo -e "${YELLOW}⚠️  Found $ISSUES potential issue(s)${NC}"
fi

echo ""
echo "For detailed logs, run:"
echo "  cd $PROJECT_DIR && docker compose -f $COMPOSE_FILE logs -f [service]"
echo ""
echo "To restart services:"
echo "  cd $PROJECT_DIR && ./deploy-prod.sh"
echo ""

