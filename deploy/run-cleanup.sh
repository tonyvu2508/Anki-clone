#!/bin/bash

# Quick script to run disk cleanup on production server
# Usage: ./run-cleanup.sh [server_alias]

set -e

SERVER_ALIAS="${1:-ec2_free_1}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "🚀 Running disk cleanup on $SERVER_ALIAS..."
echo ""

# Copy cleanup script to server
scp "$SCRIPT_DIR/cleanup-disk.sh" "$SERVER_ALIAS:~/cleanup-disk.sh" 2>/dev/null || {
    echo "⚠️  Could not copy to ~/cleanup-disk.sh, trying project directory..."
    scp "$SCRIPT_DIR/cleanup-disk.sh" "$SERVER_ALIAS:~/anki-clone/deploy/cleanup-disk.sh" 2>/dev/null || {
        echo "❌ Failed to copy cleanup script"
        exit 1
    }
}

# Run cleanup script
echo "📋 Executing cleanup script..."
ssh "$SERVER_ALIAS" "chmod +x ~/cleanup-disk.sh && ~/cleanup-disk.sh" || \
ssh "$SERVER_ALIAS" "chmod +x ~/anki-clone/deploy/cleanup-disk.sh && ~/anki-clone/deploy/cleanup-disk.sh"

