# DrPitz.club Setup Checklist

Use this checklist to ensure you complete all steps for deployment.

## Pre-Deployment Checklist

### 1. Local Testing ✓

- [ ] Download all files from drpitz-app folder
- [ ] Run `chmod +x run_local.sh` (Mac/Linux)
- [ ] Run `./run_local.sh`
- [ ] Open http://localhost:5000
- [ ] Verify background image appears (Pitz!)
- [ ] Verify title shows "World Wide Pitz" with gradient colors
- [ ] Try logging in with admin/admin123
- [ ] Verify redirect works
- [ ] Try logging out

### 2. Security Configuration ✓

- [ ] Run `python3 password_util.py`
- [ ] Generate 2 secret keys (option 1)
- [ ] Copy keys to .env file
- [ ] Choose your username and password
- [ ] Generate password hash (option 2)
- [ ] Update USERS in auth_server.py with your credentials
- [ ] Test login with new credentials locally
- [ ] Delete or change default admin/admin123 user

### 3. VPS Setup ✓

- [ ] Sign up for VPS provider (DigitalOcean, Linode, AWS, etc.)
- [ ] Choose Ubuntu 20.04 or 22.04
- [ ] Minimum 1GB RAM, 1 CPU, 25GB storage
- [ ] Note your server IP address
- [ ] Set up SSH key access
- [ ] Test SSH connection

### 4. Domain Configuration ✓

- [ ] Log into your domain registrar (where you bought drpitz.club)
- [ ] Go to DNS settings
- [ ] Add A record:
  - Name: @ (or leave blank)
  - Type: A
  - Value: [Your VPS IP address]
  - TTL: 3600 (or default)
- [ ] Add A record for www:
  - Name: www
  - Type: A
  - Value: [Your VPS IP address]
  - TTL: 3600
- [ ] Wait for DNS propagation (check with: `ping drpitz.club`)

### 5. Server Initial Setup ✓

Connect to your server via SSH, then:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y python3 python3-pip python3-venv nginx mysql-server ufw git

# Create application directory
sudo mkdir -p /var/www/drpitz-app
sudo chown -R $USER:$USER /var/www/drpitz-app

# Configure firewall
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

- [ ] All commands completed successfully
- [ ] Firewall is active

### 6. Upload Files ✓

Choose one method:

**Method A: SCP (from your computer)**
```bash
scp -r drpitz-app/* user@your-server-ip:/var/www/drpitz-app/
```

**Method B: Git**
```bash
cd /var/www/drpitz-app
git clone [your-repo-url] .
```

**Method C: SFTP**
Use FileZilla, Cyberduck, or similar

- [ ] All files uploaded
- [ ] Verify with: `ls -la /var/www/drpitz-app`

### 7. Python Environment Setup ✓

```bash
cd /var/www/drpitz-app

# Create virtual environment
python3 -m venv venv

# Activate it
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

- [ ] Virtual environment created
- [ ] All packages installed successfully

### 8. Application Configuration ✓

```bash
# Copy and edit environment file
cp .env.example .env
nano .env
```

Update these values:
- [ ] SECRET_KEY (paste from password_util.py)
- [ ] JWT_SECRET_KEY (paste from password_util.py)
- [ ] FLASK_ENV=production
- [ ] DEBUG=False

```bash
# Edit auth_server.py
nano auth_server.py
```

- [ ] Updated USERS dictionary with your credentials
- [ ] Removed or changed default admin user

### 9. Nginx Configuration ✓

```bash
# Copy nginx config
sudo cp nginx_config /etc/nginx/sites-available/drpitz.club

# Edit the config
sudo nano /etc/nginx/sites-available/drpitz.club
```

Find and replace ALL instances of `/path/to/drpitz-app` with `/var/www/drpitz-app`

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/drpitz.club /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx
```

- [ ] Config file updated
- [ ] nginx -t shows no errors
- [ ] Nginx restarted successfully

### 10. SSL Certificate Setup ✓

```bash
# Install certbot
sudo apt install -y certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d drpitz.club -d www.drpitz.club
```

Follow the prompts:
- Enter your email
- Agree to terms
- Choose whether to redirect HTTP to HTTPS (recommended: yes)

- [ ] Certificate obtained successfully
- [ ] HTTPS redirect enabled
- [ ] Test: https://drpitz.club loads with green lock

### 11. Systemd Service Setup ✓

```bash
# Copy service file
sudo cp drpitz.service /etc/systemd/system/

# Edit service file
sudo nano /etc/systemd/system/drpitz.service
```

Replace ALL `/path/to/drpitz-app` with `/var/www/drpitz-app`

```bash
# Create log directory
sudo mkdir -p /var/log/drpitz
sudo chown www-data:www-data /var/log/drpitz

# Create PID directory
sudo mkdir -p /var/run/drpitz
sudo chown www-data:www-data /var/run/drpitz

# Reload systemd
sudo systemctl daemon-reload

# Start service
sudo systemctl start drpitz

# Enable on boot
sudo systemctl enable drpitz

# Check status
sudo systemctl status drpitz
```

- [ ] Service file configured
- [ ] Service started successfully
- [ ] Service enabled for auto-start
- [ ] Status shows "active (running)"

### 12. Testing ✓

Visit https://drpitz.club in your browser:

- [ ] Landing page loads
- [ ] Background image (Pitz) appears
- [ ] "World Wide Pitz" title visible with gradient colors
- [ ] Login form is in English
- [ ] Can login with your credentials
- [ ] Redirects to /app after login
- [ ] Cannot access /app without logging in
- [ ] Logout works

Test from mobile:
- [ ] Page loads on mobile browser
- [ ] Layout is responsive
- [ ] Can login successfully

### 13. Integration with Task Manager ✓

Follow INTEGRATION_GUIDE.md:

- [ ] Read the integration guide
- [ ] Decide on integration approach (merge or microservices)
- [ ] Update Flask routes
- [ ] Add authentication to API endpoints
- [ ] Build React app
- [ ] Copy build files to /var/www/drpitz-app/app/
- [ ] Update auth_server.py to serve React app
- [ ] Restart service
- [ ] Test full workflow

### 14. Final Security Check ✓

- [ ] Changed all default passwords
- [ ] Secret keys are random and secure
- [ ] HTTPS is working (green lock in browser)
- [ ] Firewall is configured (only ports 22, 80, 443 open)
- [ ] Debug mode is OFF
- [ ] MySQL root password is strong
- [ ] No sensitive data in logs
- [ ] File permissions are correct (644 for files, 755 for directories)

### 15. Backup Setup ✓

```bash
# Create backup script
sudo nano /usr/local/bin/backup-drpitz.sh
```

Paste:
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/drpitz"
mkdir -p $BACKUP_DIR

# Backup application
tar -czf $BACKUP_DIR/app-$DATE.tar.gz /var/www/drpitz-app

# Backup MySQL (if using)
# mysqldump -u root -p your_database > $BACKUP_DIR/db-$DATE.sql

# Keep only last 7 days
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
```

```bash
sudo chmod +x /usr/local/bin/backup-drpitz.sh

# Add to crontab (run daily at 2 AM)
sudo crontab -e
```

Add line:
```
0 2 * * * /usr/local/bin/backup-drpitz.sh
```

- [ ] Backup script created
- [ ] Cron job added
- [ ] Test backup manually

### 16. Monitoring ✓

Set up basic monitoring:

```bash
# Create monitoring script
sudo nano /usr/local/bin/check-drpitz.sh
```

Paste:
```bash
#!/bin/bash
if ! systemctl is-active --quiet drpitz; then
    systemctl start drpitz
    echo "DrPitz service was down, restarted at $(date)" >> /var/log/drpitz/restart.log
fi
```

```bash
sudo chmod +x /usr/local/bin/check-drpitz.sh

# Run every 5 minutes
sudo crontab -e
```

Add line:
```
*/5 * * * * /usr/local/bin/check-drpitz.sh
```

- [ ] Monitoring script created
- [ ] Cron job added

### 17. Documentation ✓

- [ ] Document your credentials (in a secure place!)
- [ ] Note your server IP and SSH key location
- [ ] Save a copy of all configuration files
- [ ] Create internal documentation for your team

## Post-Deployment Checklist

### First Week
- [ ] Monitor logs daily: `sudo journalctl -u drpitz -f`
- [ ] Check SSL certificate expiry date
- [ ] Test all features thoroughly
- [ ] Get feedback from users
- [ ] Monitor server resources (CPU, RAM, disk)

### Monthly
- [ ] Review access logs
- [ ] Check for system updates: `sudo apt update && sudo apt upgrade`
- [ ] Verify backups are working
- [ ] Test restore from backup
- [ ] Review security

## Common Commands

```bash
# View logs
sudo journalctl -u drpitz -f

# Restart service
sudo systemctl restart drpitz

# Check service status
sudo systemctl status drpitz

# Test Nginx config
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx

# Renew SSL certificate (manual)
sudo certbot renew

# Check disk space
df -h

# Check memory usage
free -h

# Check running processes
htop
```

## Emergency Contacts

- VPS Provider Support: [your provider]
- Domain Registrar Support: [your registrar]
- SSL Certificate: Let's Encrypt (free, auto-renews)

## Rollback Plan

If something goes wrong:

1. Stop the service: `sudo systemctl stop drpitz`
2. Restore from backup: `tar -xzf /var/backups/drpitz/app-[date].tar.gz`
3. Start the service: `sudo systemctl start drpitz`

## Success Criteria

Your deployment is complete when:
- ✅ https://drpitz.club loads with green lock
- ✅ Can login with your credentials
- ✅ Background image displays correctly
- ✅ Redirects work properly
- ✅ Works on mobile and desktop
- ✅ Task management app is accessible after login
- ✅ All APIs work with authentication
- ✅ Backups are running
- ✅ Monitoring is active

---

**Congratulations!** You now have a secure, production-ready authentication system for your task management application! 🎉

Made with ❤️ for Pitz 🐕
