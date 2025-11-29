#!/bin/bash

# SSH and System Check Helper Script
# This script helps you SSH to the production server and run system checks

set -e

# Configuration
SERVER_ALIAS="${1:-ec2_free_1}"
SERVER_IP="${2:-3.27.86.45}"
PROJECT_DIR="~/anki-clone"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}           SSH & SYSTEM CHECK HELPER${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Check if SSH alias exists in config
if [ -f ~/.ssh/config ] && grep -q "^Host $SERVER_ALIAS" ~/.ssh/config; then
    echo -e "${GREEN}✅ Found SSH alias: $SERVER_ALIAS${NC}"
    SSH_TARGET="$SERVER_ALIAS"
else
    echo -e "${YELLOW}⚠️  SSH alias '$SERVER_ALIAS' not found in ~/.ssh/config${NC}"
    echo -e "${YELLOW}   Using IP address: $SERVER_IP${NC}"
    SSH_TARGET="$SERVER_IP"
fi

echo ""
echo "Options:"
echo "  1. SSH to server (interactive)"
echo "  2. Run system check remotely"
echo "  3. Copy system-check.sh to server and run"
echo "  4. View container logs"
echo "  5. Run disk cleanup (dry-run - preview only)"
echo "  6. Run disk cleanup (actual cleanup)"
echo "  7. Exit"
echo ""
read -p "Select option (1-7): " choice

case $choice in
    1)
        echo -e "${BLUE}Connecting to $SSH_TARGET...${NC}"
        ssh "$SSH_TARGET"
        ;;
    2)
        echo -e "${BLUE}Running system check on $SSH_TARGET...${NC}"
        ssh "$SSH_TARGET" "bash -s" < "$(dirname "$0")/system-check.sh"
        ;;
    3)
        echo -e "${BLUE}Copying system-check.sh to server...${NC}"
        scp "$(dirname "$0")/system-check.sh" "$SSH_TARGET:$PROJECT_DIR/deploy/" || \
        scp "$(dirname "$0")/system-check.sh" "$SSH_TARGET:~/system-check.sh"
        
        echo -e "${BLUE}Running system check on server...${NC}"
        ssh "$SSH_TARGET" "chmod +x ~/system-check.sh && ~/system-check.sh" || \
        ssh "$SSH_TARGET" "chmod +x $PROJECT_DIR/deploy/system-check.sh && $PROJECT_DIR/deploy/system-check.sh"
        ;;
    4)
        echo -e "${BLUE}Fetching container logs...${NC}"
        echo "Select service:"
        echo "  1. All services"
        echo "  2. Backend"
        echo "  3. Frontend"
        echo "  4. MongoDB"
        read -p "Choice (1-4): " log_choice
        
        case $log_choice in
            1) SERVICE="" ;;
            2) SERVICE="backend" ;;
            3) SERVICE="frontend" ;;
            4) SERVICE="mongo" ;;
            *) SERVICE="" ;;
        esac
        
        if [ -z "$SERVICE" ]; then
            ssh "$SSH_TARGET" "cd $PROJECT_DIR && sg docker -c 'docker compose -f docker-compose.prod.yml logs --tail=50'"
        else
            ssh "$SSH_TARGET" "cd $PROJECT_DIR && sg docker -c 'docker compose -f docker-compose.prod.yml logs --tail=50 $SERVICE'"
        fi
        ;;
    5)
        echo -e "${BLUE}Running disk cleanup preview (dry-run) on $SSH_TARGET...${NC}"
        echo -e "${YELLOW}⚠️  This will show what would be cleaned without actually deleting${NC}"
        echo ""
        
        # Copy cleanup script to server
        scp "$(dirname "$0")/cleanup-disk.sh" "$SSH_TARGET:~/cleanup-disk.sh" 2>/dev/null || \
        scp "$(dirname "$0")/cleanup-disk.sh" "$SSH_TARGET:$PROJECT_DIR/deploy/cleanup-disk.sh" 2>/dev/null
        
        # Run cleanup script in dry-run mode
        ssh "$SSH_TARGET" "chmod +x ~/cleanup-disk.sh && ~/cleanup-disk.sh --dry-run" || \
        ssh "$SSH_TARGET" "chmod +x $PROJECT_DIR/deploy/cleanup-disk.sh && $PROJECT_DIR/deploy/cleanup-disk.sh --dry-run"
        ;;
    6)
        echo -e "${BLUE}Running disk cleanup on $SSH_TARGET...${NC}"
        echo -e "${RED}⚠️  WARNING: This will actually delete files!${NC}"
        read -p "Are you sure you want to proceed? (yes/no): " confirm
        if [ "$confirm" != "yes" ]; then
            echo "Cleanup cancelled."
            exit 0
        fi
        echo ""
        
        # Copy cleanup script to server
        scp "$(dirname "$0")/cleanup-disk.sh" "$SSH_TARGET:~/cleanup-disk.sh" 2>/dev/null || \
        scp "$(dirname "$0")/cleanup-disk.sh" "$SSH_TARGET:$PROJECT_DIR/deploy/cleanup-disk.sh" 2>/dev/null
        
        # Run cleanup script
        ssh "$SSH_TARGET" "chmod +x ~/cleanup-disk.sh && ~/cleanup-disk.sh" || \
        ssh "$SSH_TARGET" "chmod +x $PROJECT_DIR/deploy/cleanup-disk.sh && $PROJECT_DIR/deploy/cleanup-disk.sh"
        ;;
    7)
        echo "Exiting..."
        exit 0
        ;;
    *)
        echo -e "${YELLOW}Invalid option${NC}"
        exit 1
        ;;
esac

