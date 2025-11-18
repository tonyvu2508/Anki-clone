# Production Deployment Guide

## Files Overview

- `docker-compose.prod.yml` - Production Docker Compose configuration
- `.env.production.example` - Example environment variables file
- `deploy/deploy-prod.sh` - Production deployment script

## Key Differences from Development

### Security
- Services bind to `127.0.0.1` (localhost only) instead of `0.0.0.0`
- Access via Nginx reverse proxy only
- No volume mounts for code (uses built images)
- Environment variables loaded from `.env.production`

### Performance
- Health checks enabled for all services
- Proper service dependencies with health conditions
- No hot-reload (production builds)

### Configuration
- Uses production environment variables
- JWT_SECRET must be set in `.env.production`
- VITE_API_URL should point to your domain

## Setup Instructions

### 1. Create Environment File

```bash
cp .env.production.example .env.production
```

Edit `.env.production` and set:
- `JWT_SECRET` - Generate a strong secret: `openssl rand -base64 32`
- `VITE_API_URL` - Your domain with `/api` (e.g., `http://yourdomain.com/api`)

### 2. Deploy to Server

```bash
# Copy files to server
scp docker-compose.prod.yml .env.production deploy/deploy-prod.sh ec2_free_1:~/anki-clone/

# SSH to server
ssh ec2_free_1

# Run deployment
cd ~/anki-clone
chmod +x deploy-prod.sh
./deploy-prod.sh
```

### 3. Verify Deployment

```bash
# Check container status
docker compose -f docker-compose.prod.yml ps

# Check logs
docker compose -f docker-compose.prod.yml logs -f

# Test health endpoints
curl http://localhost:4000/api/health
```

## Maintenance

### Update Application

```bash
cd ~/anki-clone
git pull origin main
./deploy-prod.sh
```

### View Logs

```bash
# All services
docker compose -f docker-compose.prod.yml logs -f

# Specific service
docker compose -f docker-compose.prod.yml logs -f backend
```

### Restart Services

```bash
docker compose -f docker-compose.prod.yml restart
```

### Stop Services

```bash
docker compose -f docker-compose.prod.yml down
```

### Backup Database

```bash
docker compose -f docker-compose.prod.yml exec mongo mongodump --out=/data/backup --db=anki_clone
```

## Security Checklist

- [ ] JWT_SECRET is set to a strong random value
- [ ] `.env.production` is not committed to git
- [ ] MongoDB only accessible from localhost
- [ ] Backend/Frontend only accessible from localhost
- [ ] Nginx is configured as reverse proxy
- [ ] Firewall rules are properly configured
- [ ] SSL/HTTPS is configured (recommended)

## Troubleshooting

### Containers not starting

```bash
# Check logs
docker compose -f docker-compose.prod.yml logs

# Check health status
docker compose -f docker-compose.prod.yml ps
```

### Health checks failing

```bash
# Manually test health endpoint
docker compose -f docker-compose.prod.yml exec backend wget -q -O- http://localhost:4000/api/health
```

### MongoDB connection issues

```bash
# Check MongoDB logs
docker compose -f docker-compose.prod.yml logs mongo

# Test MongoDB connection
docker compose -f docker-compose.prod.yml exec backend node -e "require('mongoose').connect('mongodb://mongo:27017/anki_clone').then(() => console.log('OK')).catch(e => console.error(e))"
```

