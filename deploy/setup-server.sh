#!/bin/bash

set -e

echo "🚀 Starting server setup for Anki MERN Stack deployment..."

# Update system packages
echo "📦 Updating system packages..."
sudo apt-get update
sudo apt-get upgrade -y

# Install basic utilities
echo "🔧 Installing basic utilities..."
sudo apt-get install -y \
    curl \
    wget \
    git \
    vim \
    build-essential \
    software-properties-common \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release

# Install Node.js (LTS version)
echo "📦 Installing Node.js..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
    sudo apt-get install -y nodejs
    echo "✅ Node.js $(node --version) installed"
    echo "✅ npm $(npm --version) installed"
else
    echo "✅ Node.js already installed: $(node --version)"
fi

# Install Docker
echo "🐳 Installing Docker..."
if ! command -v docker &> /dev/null; then
    # Remove old versions
    sudo apt-get remove -y docker docker-engine docker.io containerd runc || true
    
    # Add Docker's official GPG key
    sudo install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    sudo chmod a+r /etc/apt/keyrings/docker.gpg
    
    # Set up repository
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
      sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # Install Docker Engine
    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    
    # Add current user to docker group (to run docker without sudo)
    sudo usermod -aG docker $USER
    
    echo "✅ Docker installed: $(docker --version)"
else
    echo "✅ Docker already installed: $(docker --version)"
fi

# Install Docker Compose (standalone, if not using plugin)
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "🐳 Installing Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    echo "✅ Docker Compose installed"
else
    echo "✅ Docker Compose already available"
fi

# Install Nginx (optional, for reverse proxy)
echo "🌐 Installing Nginx (optional)..."
if ! command -v nginx &> /dev/null; then
    sudo apt-get install -y nginx
    echo "✅ Nginx installed"
else
    echo "✅ Nginx already installed"
fi

# Create project directory
echo "📁 Creating project directory..."
PROJECT_DIR="$HOME/anki-clone"
mkdir -p $PROJECT_DIR
echo "✅ Project directory: $PROJECT_DIR"

# Set up firewall (if ufw is available)
if command -v ufw &> /dev/null; then
    echo "🔥 Configuring firewall..."
    sudo ufw allow 22/tcp   # SSH
    sudo ufw allow 80/tcp   # HTTP
    sudo ufw allow 443/tcp  # HTTPS
    sudo ufw allow 3000/tcp # Frontend (if not using nginx)
    sudo ufw allow 4000/tcp # Backend API
    sudo ufw --force enable || true
    echo "✅ Firewall configured"
fi

echo ""
echo "✅ Server setup completed!"
echo ""
echo "📋 Summary:"
echo "  - Node.js: $(node --version 2>/dev/null || echo 'Not installed')"
echo "  - npm: $(npm --version 2>/dev/null || echo 'Not installed')"
echo "  - Docker: $(docker --version 2>/dev/null || echo 'Not installed')"
echo "  - Docker Compose: $(docker compose version 2>/dev/null || docker-compose --version 2>/dev/null || echo 'Not installed')"
echo "  - Git: $(git --version 2>/dev/null || echo 'Not installed')"
echo ""
echo "⚠️  IMPORTANT: You may need to log out and log back in for Docker group changes to take effect."
echo "   Or run: newgrp docker"
echo ""
echo "📝 Next steps:"
echo "  1. cd $PROJECT_DIR"
echo "  2. git clone <your-repo-url> ."
echo "  3. docker-compose up -d"

