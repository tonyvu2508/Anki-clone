#!/bin/bash

# Disk Cleanup Script for Anki Production Server
# This script safely cleans up disk space on the production server

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project directory
PROJECT_DIR="$HOME/anki-clone"
COMPOSE_FILE="docker-compose.prod.yml"

# Check if dry-run mode
DRY_RUN=false
if [ "$1" = "--dry-run" ] || [ "$1" = "-n" ]; then
    DRY_RUN=true
    echo -e "${YELLOW}⚠️  DRY-RUN MODE: No files will be deleted${NC}"
    echo ""
fi

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}           DISK CLEANUP SCRIPT${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Function to get disk usage
get_disk_usage() {
    df -h / | tail -1 | awk '{print $5}' | sed 's/%//'
}

# Function to get disk space in GB
get_disk_space() {
    df -BG / | tail -1 | awk '{print "Used: " $3 " / Total: " $2 " (" $5 ")"}'
}

# Show initial disk usage
echo -e "${BLUE}📊 CURRENT DISK USAGE${NC}"
echo "─────────────────────────────────────────────────────────"
INITIAL_USAGE=$(get_disk_usage)
echo "Disk usage: $(get_disk_space)"
echo ""

# Calculate space to free
SPACE_TO_FREE=0

# 1. Docker cleanup
echo -e "${BLUE}🐳 DOCKER CLEANUP${NC}"
echo "─────────────────────────────────────────────────────────"

if command -v docker &> /dev/null && docker info &>/dev/null; then
    # Check Docker disk usage
    echo "Docker disk usage:"
    docker system df 2>/dev/null || echo "  Unable to check Docker disk usage"
    echo ""
    
    # Calculate space from unused images
    UNUSED_IMAGES=$(docker images -f "dangling=true" -q 2>/dev/null | wc -l)
    if [ "$UNUSED_IMAGES" -gt 0 ]; then
        echo "  Found $UNUSED_IMAGES dangling images"
        if [ "$DRY_RUN" = false ]; then
            docker image prune -f 2>/dev/null
            echo -e "  ${GREEN}✅ Removed dangling images${NC}"
        else
            echo -e "  ${YELLOW}Would remove dangling images${NC}"
        fi
    fi
    
    # Remove unused containers
    STOPPED_CONTAINERS=$(docker ps -a -f "status=exited" -q 2>/dev/null | wc -l)
    if [ "$STOPPED_CONTAINERS" -gt 0 ]; then
        echo "  Found $STOPPED_CONTAINERS stopped containers"
        if [ "$DRY_RUN" = false ]; then
            docker container prune -f 2>/dev/null
            echo -e "  ${GREEN}✅ Removed stopped containers${NC}"
        else
            echo -e "  ${YELLOW}Would remove stopped containers${NC}"
        fi
    fi
    
    # Remove unused volumes (be careful with this)
    UNUSED_VOLUMES=$(docker volume ls -f "dangling=true" -q 2>/dev/null | wc -l)
    if [ "$UNUSED_VOLUMES" -gt 0 ]; then
        echo "  Found $UNUSED_VOLUMES unused volumes"
        if [ "$DRY_RUN" = false ]; then
            docker volume prune -f 2>/dev/null
            echo -e "  ${GREEN}✅ Removed unused volumes${NC}"
        else
            echo -e "  ${YELLOW}Would remove unused volumes${NC}"
        fi
    fi
    
    # Remove build cache
    BUILD_CACHE_SIZE=$(docker system df 2>/dev/null | grep "Build Cache" | awk '{print $4}' || echo "0B")
    if [ "$BUILD_CACHE_SIZE" != "0B" ] && [ "$BUILD_CACHE_SIZE" != "" ]; then
        echo "  Build cache size: $BUILD_CACHE_SIZE"
        if [ "$DRY_RUN" = false ]; then
            docker builder prune -f 2>/dev/null
            echo -e "  ${GREEN}✅ Removed build cache${NC}"
        else
            echo -e "  ${YELLOW}Would remove build cache${NC}"
        fi
    fi
    
    # Remove all unused resources (more aggressive)
    if [ "$DRY_RUN" = false ]; then
        echo "  Cleaning up all unused Docker resources..."
        docker system prune -f --volumes 2>/dev/null || true
        echo -e "  ${GREEN}✅ Cleaned up unused Docker resources${NC}"
    else
        echo -e "  ${YELLOW}Would clean up all unused Docker resources${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Docker is not available${NC}"
fi
echo ""

# 2. Log cleanup
echo -e "${BLUE}📋 LOG CLEANUP${NC}"
echo "─────────────────────────────────────────────────────────"

# Docker container logs
if command -v docker &> /dev/null && docker info &>/dev/null; then
    if [ -d "$PROJECT_DIR" ] && [ -f "$PROJECT_DIR/$COMPOSE_FILE" ]; then
        cd "$PROJECT_DIR"
        
        # Check log file sizes
        echo "Checking container log sizes..."
        for container in $(sg docker -c "cd $PROJECT_DIR && docker compose -f $COMPOSE_FILE ps -q" 2>/dev/null || docker compose -f "$COMPOSE_FILE" ps -q 2>/dev/null); do
            if [ -n "$container" ]; then
                LOG_SIZE=$(docker inspect --format='{{.LogPath}}' "$container" 2>/dev/null | xargs ls -lh 2>/dev/null | awk '{print $5}' || echo "0")
                if [ "$LOG_SIZE" != "0" ] && [ -n "$LOG_SIZE" ]; then
                    CONTAINER_NAME=$(docker inspect --format='{{.Name}}' "$container" 2>/dev/null | sed 's/\///')
                    echo "  $CONTAINER_NAME: $LOG_SIZE"
                fi
            fi
        done
        
        # Truncate large logs (keep last 1000 lines)
        if [ "$DRY_RUN" = false ]; then
            echo "  Truncating large container logs..."
            for container in $(sg docker -c "cd $PROJECT_DIR && docker compose -f $COMPOSE_FILE ps -q" 2>/dev/null || docker compose -f "$COMPOSE_FILE" ps -q 2>/dev/null); do
                if [ -n "$container" ]; then
                    LOG_PATH=$(docker inspect --format='{{.LogPath}}' "$container" 2>/dev/null)
                    if [ -n "$LOG_PATH" ] && [ -f "$LOG_PATH" ]; then
                        LOG_SIZE=$(stat -f%z "$LOG_PATH" 2>/dev/null || stat -c%s "$LOG_PATH" 2>/dev/null || echo "0")
                        # If log is larger than 100MB, truncate
                        if [ "$LOG_SIZE" -gt 104857600 ]; then
                            tail -n 1000 "$LOG_PATH" > "${LOG_PATH}.tmp" 2>/dev/null && mv "${LOG_PATH}.tmp" "$LOG_PATH" 2>/dev/null || true
                        fi
                    fi
                fi
            done
            echo -e "  ${GREEN}✅ Cleaned up container logs${NC}"
        else
            echo -e "  ${YELLOW}Would truncate large container logs${NC}"
        fi
    fi
fi

# System logs
echo "Checking system logs..."
if [ -d "/var/log" ]; then
    # Journal logs (systemd)
    if command -v journalctl &> /dev/null; then
        JOURNAL_SIZE=$(journalctl --disk-usage 2>/dev/null | awk '{print $7}' || echo "0")
        if [ "$JOURNAL_SIZE" != "0" ] && [ -n "$JOURNAL_SIZE" ]; then
            echo "  System journal: $JOURNAL_SIZE"
            if [ "$DRY_RUN" = false ]; then
                # Keep last 3 days
                journalctl --vacuum-time=3d 2>/dev/null || true
                echo -e "  ${GREEN}✅ Cleaned system journal (kept last 3 days)${NC}"
            else
                echo -e "  ${YELLOW}Would clean system journal${NC}"
            fi
        fi
    fi
    
    # Old log files
    OLD_LOGS=$(find /var/log -type f -name "*.log.*" -mtime +7 2>/dev/null | wc -l)
    if [ "$OLD_LOGS" -gt 0 ]; then
        echo "  Found $OLD_LOGS old log files (>7 days)"
        if [ "$DRY_RUN" = false ]; then
            find /var/log -type f -name "*.log.*" -mtime +7 -delete 2>/dev/null || true
            echo -e "  ${GREEN}✅ Removed old log files${NC}"
        else
            echo -e "  ${YELLOW}Would remove old log files${NC}"
        fi
    fi
fi
echo ""

# 3. Temporary files cleanup
echo -e "${BLUE}🗑️  TEMPORARY FILES CLEANUP${NC}"
echo "─────────────────────────────────────────────────────────"

# /tmp directory
TMP_SIZE=$(du -sh /tmp 2>/dev/null | awk '{print $1}' || echo "0")
if [ "$TMP_SIZE" != "0" ]; then
    echo "  /tmp size: $TMP_SIZE"
    OLD_TMP_FILES=$(find /tmp -type f -mtime +7 2>/dev/null | wc -l)
    if [ "$OLD_TMP_FILES" -gt 0 ]; then
        echo "  Found $OLD_TMP_FILES old files in /tmp (>7 days)"
        if [ "$DRY_RUN" = false ]; then
            find /tmp -type f -mtime +7 -delete 2>/dev/null || true
            echo -e "  ${GREEN}✅ Removed old temporary files${NC}"
        else
            echo -e "  ${YELLOW}Would remove old temporary files${NC}"
        fi
    fi
fi

# apt cache
if command -v apt-get &> /dev/null; then
    APT_CACHE_SIZE=$(du -sh /var/cache/apt/archives 2>/dev/null | awk '{print $1}' || echo "0")
    if [ "$APT_CACHE_SIZE" != "0" ] && [ "$APT_CACHE_SIZE" != "" ]; then
        echo "  APT cache: $APT_CACHE_SIZE"
        if [ "$DRY_RUN" = false ]; then
            apt-get clean 2>/dev/null || true
            apt-get autoclean 2>/dev/null || true
            echo -e "  ${GREEN}✅ Cleaned APT cache${NC}"
        else
            echo -e "  ${YELLOW}Would clean APT cache${NC}"
        fi
    fi
fi

# npm cache (if exists)
if command -v npm &> /dev/null; then
    NPM_CACHE_SIZE=$(npm cache verify 2>/dev/null | grep "Cache size" | awk '{print $3, $4}' || echo "0")
    if [ "$NPM_CACHE_SIZE" != "0" ] && [ -n "$NPM_CACHE_SIZE" ]; then
        echo "  npm cache: $NPM_CACHE_SIZE"
        if [ "$DRY_RUN" = false ]; then
            npm cache clean --force 2>/dev/null || true
            echo -e "  ${GREEN}✅ Cleaned npm cache${NC}"
        else
            echo -e "  ${YELLOW}Would clean npm cache${NC}"
        fi
    fi
fi
echo ""

# 4. Project-specific cleanup
echo -e "${BLUE}📁 PROJECT-SPECIFIC CLEANUP${NC}"
echo "─────────────────────────────────────────────────────────"

if [ -d "$PROJECT_DIR" ]; then
    cd "$PROJECT_DIR"
    
    # Node modules in project (if any)
    if [ -d "backend/node_modules" ]; then
        BACKEND_NM_SIZE=$(du -sh backend/node_modules 2>/dev/null | awk '{print $1}' || echo "0")
        echo "  backend/node_modules: $BACKEND_NM_SIZE"
    fi
    
    if [ -d "frontend/node_modules" ]; then
        FRONTEND_NM_SIZE=$(du -sh frontend/node_modules 2>/dev/null | awk '{print $1}' || echo "0")
        echo "  frontend/node_modules: $FRONTEND_NM_SIZE"
    fi
    
    # Old build artifacts
    if [ -d "frontend/dist" ]; then
        DIST_SIZE=$(du -sh frontend/dist 2>/dev/null | awk '{print $1}' || echo "0")
        echo "  frontend/dist: $DIST_SIZE"
    fi
    
    # Git objects (if repo is large)
    if [ -d ".git" ]; then
        GIT_SIZE=$(du -sh .git 2>/dev/null | awk '{print $1}' || echo "0")
        echo "  .git: $GIT_SIZE"
        if [ "$DRY_RUN" = false ]; then
            git gc --prune=now 2>/dev/null || true
            echo -e "  ${GREEN}✅ Optimized git repository${NC}"
        else
            echo -e "  ${YELLOW}Would optimize git repository${NC}"
        fi
    fi
else
    echo -e "${YELLOW}⚠️  Project directory not found${NC}"
fi
echo ""

# Show final disk usage
echo -e "${BLUE}📊 FINAL DISK USAGE${NC}"
echo "─────────────────────────────────────────────────────────"
FINAL_USAGE=$(get_disk_usage)
echo "Disk usage: $(get_disk_space)"

if [ "$DRY_RUN" = false ]; then
    USAGE_DIFF=$((INITIAL_USAGE - FINAL_USAGE))
    if [ "$USAGE_DIFF" -gt 0 ]; then
        echo -e "${GREEN}✅ Freed up approximately ${USAGE_DIFF}% disk space${NC}"
    elif [ "$USAGE_DIFF" -lt 0 ]; then
        echo -e "${YELLOW}⚠️  Disk usage increased by $((USAGE_DIFF * -1))%${NC}"
    else
        echo -e "${YELLOW}⚠️  No significant change in disk usage${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  DRY-RUN: No changes made${NC}"
fi
echo ""

# Recommendations
if [ "$FINAL_USAGE" -gt 90 ]; then
    echo -e "${RED}⚠️  WARNING: Disk usage is still above 90%${NC}"
    echo "Additional recommendations:"
    echo "  1. Consider upgrading disk size"
    echo "  2. Move old backups to external storage"
    echo "  3. Review and remove unnecessary files manually"
    echo "  4. Check for large files: find / -type f -size +100M 2>/dev/null"
    echo ""
fi

echo -e "${GREEN}✅ Cleanup completed!${NC}"
echo ""
