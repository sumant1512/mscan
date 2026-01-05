# TMS System - Deployment Guide

## Production Deployment Checklist

### Pre-Deployment Requirements

- [ ] Production server with Node.js 20+ installed
- [ ] PostgreSQL 14+ database server
- [ ] Domain name with DNS configured
- [ ] SSL/TLS certificates
- [ ] SMTP email service credentials
- [ ] Backup strategy in place
- [ ] Monitoring tools configured

---

## Environment Setup

### 1. Server Requirements

**Minimum Specifications**:
- **CPU**: 2 cores
- **RAM**: 4GB
- **Storage**: 20GB SSD
- **OS**: Ubuntu 20.04+ / CentOS 8+ / Amazon Linux 2

**Recommended Specifications**:
- **CPU**: 4 cores
- **RAM**: 8GB
- **Storage**: 50GB SSD
- **OS**: Ubuntu 22.04 LTS

### 2. Install Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL 14
sudo apt install -y postgresql-14 postgresql-contrib

# Install NGINX
sudo apt install -y nginx

# Install PM2 (process manager)
sudo npm install -g pm2

# Install certbot (SSL certificates)
sudo apt install -y certbot python3-certbot-nginx
```

---

## Database Setup

### 1. Create Production Database

```bash
# Switch to postgres user
sudo -u postgres psql

# Create database and user
CREATE DATABASE mscan_production;
CREATE USER mscan_admin WITH PASSWORD 'your-secure-password-here';
GRANT ALL PRIVILEGES ON DATABASE mscan_production TO mscan_admin;
\q
```

### 2. Configure PostgreSQL

Edit `/etc/postgresql/14/main/postgresql.conf`:

```conf
# Performance tuning
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
work_mem = 6553kB
min_wal_size = 1GB
max_wal_size = 4GB

# Connection settings
max_connections = 100
```

Edit `/etc/postgresql/14/main/pg_hba.conf`:

```conf
# Allow local connections
local   all             all                                     md5
host    all             all             127.0.0.1/32            md5
host    all             all             ::1/128                 md5
```

Restart PostgreSQL:

```bash
sudo systemctl restart postgresql
```

---

## Backend Deployment

### 1. Clone Repository

```bash
cd /var/www
sudo git clone <repository-url> tms
sudo chown -R $USER:$USER tms
cd tms/mscan-server
```

### 2. Install Dependencies

```bash
npm ci --production
```

### 3. Configure Environment

Create production `.env` file:

```bash
nano .env
```

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mscan_production
DB_USER=mscan_admin
DB_PASSWORD=your-secure-password-here

# JWT Secrets (generate secure random strings)
JWT_SECRET=your-production-jwt-secret-minimum-32-chars
REFRESH_TOKEN_SECRET=your-production-refresh-secret-minimum-32-chars

# Email Configuration (Production SMTP)
EMAIL_USER=noreply@yourdomain.com
EMAIL_PASSWORD=your-smtp-password
EMAIL_FROM=TMS System <noreply@yourdomain.com>
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587

# Application
PORT=3000
NODE_ENV=production
```

**Generate secure secrets**:
```bash
# Generate JWT secrets
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 4. Run Database Migration

```bash
node database/migrate.js
```

### 5. Configure PM2

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'tms-backend',
    script: './src/server.js',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/tms/error.log',
    out_file: '/var/log/tms/access.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_memory_restart: '1G',
    watch: false
  }]
};
```

Create log directory:

```bash
sudo mkdir -p /var/log/tms
sudo chown -R $USER:$USER /var/log/tms
```

### 6. Start Application

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd
```

Verify running:

```bash
pm2 status
pm2 logs tms-backend
```

---

## Frontend Deployment

### 1. Build Angular Application

```bash
cd /var/www/tms/mscan-client
npm ci
```

Update production environment:

```typescript
// src/environments/environment.prod.ts
export const environment = {
  production: true,
  apiUrl: 'https://api.yourdomain.com/api'
};
```

Build for production:

```bash
npm run build
```

### 2. Configure NGINX

Create NGINX configuration:

```bash
sudo nano /etc/nginx/sites-available/tms
```

```nginx
# Backend API
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# Frontend Application
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    root /var/www/tms/mscan-client/dist/mscan-client/browser;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}
```

Enable site:

```bash
sudo ln -s /etc/nginx/sites-available/tms /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## SSL/TLS Configuration

### 1. Obtain SSL Certificates

```bash
# For both domains
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com -d api.yourdomain.com
```

### 2. Auto-Renewal Setup

```bash
# Test renewal
sudo certbot renew --dry-run

# Certbot automatically sets up cron job
# Verify:
sudo systemctl status certbot.timer
```

---

## Security Hardening

### 1. Firewall Configuration

```bash
# UFW firewall
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
sudo ufw status
```

### 2. PostgreSQL Security

```bash
# Edit pg_hba.conf to restrict connections
sudo nano /etc/postgresql/14/main/pg_hba.conf

# Only allow local connections
local   mscan_production    mscan_admin                  md5
```

### 3. Application Security

Update backend `.env`:

```env
# Rate limiting
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100

# CORS (production domain only)
CORS_ORIGIN=https://yourdomain.com
```

---

## Monitoring Setup

### 1. PM2 Monitoring

```bash
# Enable PM2 monitoring
pm2 install pm2-logrotate

# Configure log rotation
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
pm2 set pm2-logrotate:compress true
```

### 2. Health Check Script

Create `/var/www/tms/health-check.sh`:

```bash
#!/bin/bash

# Check backend health
BACKEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health)

if [ $BACKEND_STATUS -ne 200 ]; then
    echo "Backend health check failed: $BACKEND_STATUS"
    pm2 restart tms-backend
    # Send alert email
    echo "Backend health check failed" | mail -s "TMS Alert" admin@yourdomain.com
fi

# Check database connection
psql -U mscan_admin -d mscan_production -c "SELECT 1" > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "Database connection failed"
    # Send alert email
    echo "Database connection failed" | mail -s "TMS Alert" admin@yourdomain.com
fi
```

Make executable and schedule:

```bash
chmod +x /var/www/tms/health-check.sh

# Add to crontab (every 5 minutes)
crontab -e
*/5 * * * * /var/www/tms/health-check.sh >> /var/log/tms/health-check.log 2>&1
```

---

## Backup Strategy

### 1. Database Backup Script

Create `/var/www/tms/backup-db.sh`:

```bash
#!/bin/bash

BACKUP_DIR="/var/backups/tms"
DATE=$(date +%Y%m%d_%H%M%S)
FILENAME="mscan_production_$DATE.sql.gz"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
pg_dump -U mscan_admin mscan_production | gzip > $BACKUP_DIR/$FILENAME

# Keep only last 30 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete

echo "Backup completed: $FILENAME"
```

Schedule daily backups:

```bash
chmod +x /var/www/tms/backup-db.sh

# Add to crontab (daily at 2 AM)
crontab -e
0 2 * * * /var/www/tms/backup-db.sh >> /var/log/tms/backup.log 2>&1
```

### 2. Off-site Backup

```bash
# Sync to S3 (install AWS CLI first)
aws s3 sync /var/backups/tms s3://your-bucket/tms-backups/
```

---

## Maintenance

### 1. Update Application

```bash
cd /var/www/tms

# Backend
cd mscan-server
git pull origin main
npm ci --production
pm2 restart tms-backend

# Frontend
cd ../mscan-client
git pull origin main
npm ci
npm run build
```

### 2. Database Maintenance

```bash
# Cleanup expired OTPs (daily)
psql -U mscan_admin -d mscan_production -c "DELETE FROM otps WHERE expires_at < CURRENT_TIMESTAMP;"

# Cleanup expired blacklisted tokens (daily)
psql -U mscan_admin -d mscan_production -c "DELETE FROM token_blacklist WHERE expires_at < CURRENT_TIMESTAMP;"

# Vacuum database (weekly)
psql -U mscan_admin -d mscan_production -c "VACUUM ANALYZE;"
```

Create maintenance script `/var/www/tms/maintenance.sh`:

```bash
#!/bin/bash
psql -U mscan_admin -d mscan_production << EOF
DELETE FROM otps WHERE expires_at < CURRENT_TIMESTAMP;
DELETE FROM token_blacklist WHERE expires_at < CURRENT_TIMESTAMP;
VACUUM ANALYZE;
EOF
```

Schedule:

```bash
chmod +x /var/www/tms/maintenance.sh
crontab -e
0 3 * * * /var/www/tms/maintenance.sh >> /var/log/tms/maintenance.log 2>&1
```

---

## Rollback Procedure

### If Deployment Fails

```bash
# Rollback backend
cd /var/www/tms/mscan-server
git reset --hard HEAD~1
pm2 restart tms-backend

# Rollback frontend
cd /var/www/tms/mscan-client
git reset --hard HEAD~1
npm run build

# Restore database (if needed)
gunzip < /var/backups/tms/mscan_production_YYYYMMDD.sql.gz | psql -U mscan_admin mscan_production
```

---

## Performance Tuning

### 1. Node.js Optimization

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'tms-backend',
    script: './src/server.js',
    instances: 'max',  // Use all CPU cores
    exec_mode: 'cluster',
    max_memory_restart: '512M',
    node_args: '--max-old-space-size=512'
  }]
};
```

### 2. PostgreSQL Connection Pooling

```javascript
// src/config/database.js
const pool = new Pool({
  max: 20,           // Maximum connections
  min: 5,            // Minimum connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});
```

### 3. NGINX Caching

```nginx
# Add to nginx config
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=api_cache:10m max_size=100m inactive=60m;

location /api/dashboard/stats {
    proxy_cache api_cache;
    proxy_cache_valid 200 5m;
    proxy_pass http://localhost:3000;
}
```

---

## Troubleshooting

### Common Issues

**Backend won't start**:
```bash
pm2 logs tms-backend --lines 50
# Check for port conflicts, database connection issues
```

**Database connection errors**:
```bash
sudo -u postgres psql -c "\conninfo"
# Verify credentials in .env
```

**NGINX errors**:
```bash
sudo nginx -t
sudo tail -f /var/log/nginx/error.log
```

**PM2 process crashes**:
```bash
pm2 describe tms-backend
pm2 restart tms-backend --update-env
```

---

## Post-Deployment Verification

```bash
# 1. Check backend health
curl https://api.yourdomain.com/health

# 2. Check frontend loads
curl -I https://yourdomain.com

# 3. Test OTP login flow
curl -X POST https://api.yourdomain.com/api/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@mscan.com"}'

# 4. Check PM2 status
pm2 status

# 5. Check logs
pm2 logs tms-backend --lines 50 --nostream
```

---

**Deployment Version**: 1.0  
**Last Updated**: December 26, 2024  
**Production Ready**: Yes
