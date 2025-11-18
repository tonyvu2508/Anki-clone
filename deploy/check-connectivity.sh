#!/bin/bash

echo "🔍 Checking server connectivity..."

# Check if Nginx is running
if systemctl is-active --quiet nginx; then
    echo "✅ Nginx is running"
else
    echo "❌ Nginx is not running"
    exit 1
fi

# Check if containers are running
if docker ps | grep -q anki-clone-frontend; then
    echo "✅ Frontend container is running"
else
    echo "❌ Frontend container is not running"
fi

if docker ps | grep -q anki-clone-backend; then
    echo "✅ Backend container is running"
else
    echo "❌ Backend container is not running"
fi

# Test local connectivity
echo ""
echo "🔍 Testing local connectivity..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q "200"; then
    echo "✅ Frontend accessible on localhost:3000"
else
    echo "❌ Frontend not accessible on localhost:3000"
fi

if curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/api/health | grep -q "[24]"; then
    echo "✅ Backend accessible on localhost:4000"
else
    echo "❌ Backend not accessible on localhost:4000"
fi

if curl -s -o /dev/null -w "%{http_code}" http://localhost | grep -q "200"; then
    echo "✅ Nginx proxy working on localhost:80"
else
    echo "❌ Nginx proxy not working on localhost:80"
fi

# Check firewall
echo ""
echo "🔍 Checking firewall..."
if sudo ufw status | grep -q "80/tcp.*ALLOW"; then
    echo "✅ Port 80 is allowed in UFW"
else
    echo "❌ Port 80 is not allowed in UFW"
fi

# Get public IP
PUBLIC_IP=$(curl -s ifconfig.me)
echo ""
echo "📋 Server Information:"
echo "  Public IP: $PUBLIC_IP"
echo ""
echo "⚠️  If you cannot access http://$PUBLIC_IP from outside:"
echo "   1. Check AWS Security Groups - ensure port 80 (HTTP) is open"
echo "   2. Security Group should allow:"
echo "      - Type: HTTP"
echo "      - Protocol: TCP"
echo "      - Port: 80"
echo "      - Source: 0.0.0.0/0 (or your IP)"
echo ""
echo "   To check Security Groups:"
echo "   - Go to AWS Console > EC2 > Security Groups"
echo "   - Find the Security Group attached to your instance"
echo "   - Add Inbound Rule: HTTP (port 80) from 0.0.0.0/0"

