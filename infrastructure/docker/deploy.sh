#!/bin/bash

# CITURBAREA V150 — Deployment Script
# VPS deployment (DigitalOcean/Hetzner)

set -e

echo "🚀 CITURBAREA V150 — Déploiement automatique"
echo "============================================="

# ═══════════════════════════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════

DOMAIN="citurbarea.ma"
EMAIL="admin@citurbarea.ma"
VPS_USER="root"
VPS_IP="${VPS_IP:-}"

if [ -z "$VPS_IP" ]; then
    echo "❌ Erreur: VPS_IP non défini"
    echo "Usage: VPS_IP=1.2.3.4 ./deploy.sh"
    exit 1
fi

echo "📍 Déploiement vers: $VPS_IP"
echo "🌐 Domaine: $DOMAIN"
echo ""

# ═══════════════════════════════════════════════════════════════════════════
# 1. PREPARATION VPS
# ═══════════════════════════════════════════════════════════════════════════

echo "1️⃣ Préparation du VPS..."

ssh $VPS_USER@$VPS_IP << 'ENDSSH'
    # Update system
    apt-get update
    apt-get upgrade -y

    # Install Docker
    if ! command -v docker &> /dev/null; then
        curl -fsSL https://get.docker.com -o get-docker.sh
        sh get-docker.sh
        systemctl enable docker
        systemctl start docker
    fi

    # Install Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        chmod +x /usr/local/bin/docker-compose
    fi

    # Create app directory
    mkdir -p /opt/citurbarea
    mkdir -p /opt/citurbarea/backups
    mkdir -p /opt/citurbarea/storage
    mkdir -p /opt/citurbarea/logs

    echo "✅ VPS préparé"
ENDSSH

# ═══════════════════════════════════════════════════════════════════════════
# 2. UPLOAD FILES
# ═══════════════════════════════════════════════════════════════════════════

echo ""
echo "2️⃣ Upload des fichiers..."

# Sync code
rsync -avz --exclude='node_modules' \
           --exclude='.git' \
           --exclude='dist' \
           --exclude='.env' \
           ./ $VPS_USER@$VPS_IP:/opt/citurbarea/

echo "✅ Fichiers uploadés"

# ═══════════════════════════════════════════════════════════════════════════
# 3. SETUP ENVIRONMENT
# ═══════════════════════════════════════════════════════════════════════════

echo ""
echo "3️⃣ Configuration de l'environnement..."

# Generate secrets
POSTGRES_PASSWORD=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 64)
GRAFANA_PASSWORD=$(openssl rand -base64 16)

ssh $VPS_USER@$VPS_IP << ENDSSH
    cd /opt/citurbarea

    # Create .env file
    cat > .env << EOF
# Database
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
DATABASE_URL=postgresql://citurbarea:$POSTGRES_PASSWORD@postgres:5432/citurbarea

# Auth
JWT_SECRET=$JWT_SECRET

# APIs
ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}

# Storage
STORAGE_BUCKET=citurbarea-storage

# Monitoring
GRAFANA_PASSWORD=$GRAFANA_PASSWORD

# Domain
DOMAIN=$DOMAIN
EOF

    echo "✅ Environment configuré"
ENDSSH

# ═══════════════════════════════════════════════════════════════════════════
# 4. SSL CERTIFICATES (Let's Encrypt)
# ═══════════════════════════════════════════════════════════════════════════

echo ""
echo "4️⃣ Configuration SSL..."

ssh $VPS_USER@$VPS_IP << ENDSSH
    cd /opt/citurbarea

    # Install certbot
    apt-get install -y certbot python3-certbot-nginx

    # Get certificates
    certbot certonly --standalone \
        --preferred-challenges http \
        --email $EMAIL \
        --agree-tos \
        --no-eff-email \
        -d $DOMAIN \
        -d www.$DOMAIN

    # Copy certs to nginx directory
    mkdir -p nginx/ssl
    cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem nginx/ssl/
    cp /etc/letsencrypt/live/$DOMAIN/privkey.pem nginx/ssl/

    # Setup auto-renewal
    (crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet") | crontab -

    echo "✅ SSL configuré"
ENDSSH

# ═══════════════════════════════════════════════════════════════════════════
# 5. BUILD & START DOCKER
# ═══════════════════════════════════════════════════════════════════════════

echo ""
echo "5️⃣ Build et démarrage Docker..."

ssh $VPS_USER@$VPS_IP << 'ENDSSH'
    cd /opt/citurbarea

    # Build images
    docker-compose build

    # Start services
    docker-compose up -d

    # Wait for services to be ready
    echo "⏳ Attente du démarrage des services..."
    sleep 10

    # Run database migrations
    docker-compose exec -T api npm run prisma:migrate

    # Seed initial data (if needed)
    # docker-compose exec -T api npm run seed

    echo "✅ Services démarrés"
ENDSSH

# ═══════════════════════════════════════════════════════════════════════════
# 6. SETUP MONITORING
# ═══════════════════════════════════════════════════════════════════════════

echo ""
echo "6️⃣ Configuration du monitoring..."

ssh $VPS_USER@$VPS_IP << 'ENDSSH'
    cd /opt/citurbarea

    # Configure Prometheus
    cat > monitoring/prometheus.yml << EOF
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'citurbarea-api'
    static_configs:
      - targets: ['api:3000']
  
  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres:5432']
EOF

    # Restart Prometheus
    docker-compose restart prometheus

    echo "✅ Monitoring configuré"
ENDSSH

# ═══════════════════════════════════════════════════════════════════════════
# 7. SETUP BACKUPS
# ═══════════════════════════════════════════════════════════════════════════

echo ""
echo "7️⃣ Configuration des backups..."

ssh $VPS_USER@$VPS_IP << 'ENDSSH'
    cd /opt/citurbarea

    # Create backup script
    cat > scripts/backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"

# Backup PostgreSQL
pg_dump -h postgres -U citurbarea citurbarea | gzip > $BACKUP_DIR/postgres_$DATE.sql.gz

# Backup storage
tar -czf $BACKUP_DIR/storage_$DATE.tar.gz /app/storage

# Keep only last 7 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup created: $DATE"
EOF

    chmod +x scripts/backup.sh

    # Schedule daily backups (3 AM)
    (crontab -l 2>/dev/null; echo "0 3 * * * docker-compose run --rm backup") | crontab -

    echo "✅ Backups configurés"
ENDSSH

# ═══════════════════════════════════════════════════════════════════════════
# 8. FIREWALL SETUP
# ═══════════════════════════════════════════════════════════════════════════

echo ""
echo "8️⃣ Configuration du firewall..."

ssh $VPS_USER@$VPS_IP << 'ENDSSH'
    # Install ufw
    apt-get install -y ufw

    # Allow SSH
    ufw allow 22/tcp

    # Allow HTTP/HTTPS
    ufw allow 80/tcp
    ufw allow 443/tcp

    # Enable firewall
    ufw --force enable

    echo "✅ Firewall configuré"
ENDSSH

# ═══════════════════════════════════════════════════════════════════════════
# DEPLOYMENT COMPLETE
# ═══════════════════════════════════════════════════════════════════════════

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "✅ DÉPLOIEMENT TERMINÉ"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "🌐 Application: https://$DOMAIN"
echo "📊 Grafana: https://$DOMAIN:3001"
echo "    Username: admin"
echo "    Password: $GRAFANA_PASSWORD"
echo ""
echo "📝 Logs:"
echo "    docker-compose logs -f"
echo ""
echo "🔄 Redémarrer:"
echo "    docker-compose restart"
echo ""
echo "🛑 Arrêter:"
echo "    docker-compose down"
echo ""
echo "═══════════════════════════════════════════════════════════════"
