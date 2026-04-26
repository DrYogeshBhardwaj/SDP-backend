#!/bin/bash
set -e

# ==========================================
# SDP VPS Deployment Script (Ubuntu 22.04 LTS)
# ==========================================

DOMAIN="yourdomain.com"
DB_NAME="sdp_db"
DB_USER="sdp_admin"
DB_PASS=$(openssl rand -base64 12) # Generate strong random password
JWT_SECRET=$(openssl rand -hex 64)
APP_DIR="/var/www/sdp/backend"
GIT_REPO="" # Replace with your git repository URL if pulling from Git

echo "=========================================="
echo "🚀 Starting SDP Deployment Script..."
echo "=========================================="

# 1. Update and install basic tools
echo "[1/10] Updating system packages..."
sudo apt-get update && sudo apt-get upgrade -y
sudo apt-get install -y curl build-essential openssl ufw git

# 2. Install Node.js LTS (20.x)
echo "[2/10] Installing Node.js LTS..."
if ! command -v node > /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    echo "Node.js is already installed. Skipping..."
fi

# 3. Install PM2
echo "[3/10] Installing PM2..."
if ! command -v pm2 > /dev/null; then
    sudo npm install -g pm2
else
    echo "PM2 is already installed. Skipping..."
fi

# 4. Install PostgreSQL
echo "[4/10] Installing PostgreSQL..."
sudo apt-get install -y postgresql postgresql-contrib

# 5. Configure Database
echo "[5/10] Configuring PostgreSQL Database..."
sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" | grep -q 1 || \
sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';"

sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" | grep -q 1 || \
sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"

# 6. Install Nginx and Certbot
echo "[6/10] Installing Nginx & Certbot..."
sudo apt-get install -y nginx certbot python3-certbot-nginx

# 7. Setup Application Directory
echo "[7/10] Setting up Application Directory..."
sudo mkdir -p /var/www/sdp
sudo chown -R $USER:$USER /var/www/sdp

# If you want to git clone automatically (uncomment below and set GIT_REPO)
# if [ ! -d "$APP_DIR" ]; then
#     git clone $GIT_REPO /var/www/sdp
# fi

# Note: The script assumes your project files are already in $APP_DIR.
if [ ! -d "$APP_DIR" ]; then
    echo "Creating empty app directory. Please copy your project files to $APP_DIR before running PM2!"
    mkdir -p $APP_DIR
fi

# 8. Setup Environment Variables
echo "[8/10] Creating .env.production..."
cat <<EOF > $APP_DIR/.env.production
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://sinaank.com
DATABASE_URL="postgresql://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME?schema=public"
JWT_SECRET=$JWT_SECRET
EOF

# Secure the environment file
sudo chmod 600 $APP_DIR/.env.production

# 9. Configure Firewall
echo "[9/10] Configuring UFW Firewall..."
sudo ufw allow OpenSSH # CRITICAL: Do not remove this, or you will lose SSH access
sudo ufw allow 'Nginx Full' # Allows 80 and 443
# sudo ufw --force enable 

# 10. Install Dependencies, Migrate, and Start PM2
echo "[10/10] Initializing Application..."
cd $APP_DIR
if [ -f "package.json" ]; then
    npm install
    
    # Run Prisma Migrate (Safe if run multiple times)
    set -a
    source .env.production
    set +a
    npx prisma migrate deploy

    echo "[PM2] Starting application..."
    pm2 install pm2-logrotate
    pm2 start ecosystem.config.js --env production
    pm2 save
    pm2 startup | tail -n 1 | sudo bash || true
else
    echo "⚠️ Warning: package.json not found in $APP_DIR. Skipping npm install, prisma, and PM2 start."
    echo "Please upload your project files to $APP_DIR and run them manually."
fi

# Test Health Endpoint locally
sleep 5
echo "Testing Application Health:"
curl -s http://localhost:5000/api/health || echo "Application is offline"

echo ""
echo "=========================================="
echo "✅ Deployment Script Completed!"
echo "=========================================="
echo "Database credentials and JWT Secret are securely stored in $APP_DIR/.env.production"
echo "They have not been printed here for security reasons."
echo ""
echo "Next Steps:"
echo "1. Ensure your domain ($DOMAIN) points to this server's IP address."
echo "2. Copy the Nginx config file to /etc/nginx/sites-available/sdp"
echo "3. Run: sudo ln -s /etc/nginx/sites-available/sdp /etc/nginx/sites-enabled/"
echo "4. Run: sudo certbot --nginx -d $DOMAIN"
echo "=========================================="
