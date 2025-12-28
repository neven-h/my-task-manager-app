# DrPitz.club Deployment Guide

## Overview
This guide will help you deploy your Task Management application to drpitz.club domain with a secure login page.

## Prerequisites
- A server (VPS) with Ubuntu 20.04 or later
- Domain drpitz.club pointing to your server's IP address
- SSH access to your server
- Python 3.8 or later installed

## Step 1: Server Setup

### 1.1 Update Your Server
```bash
sudo apt update
sudo apt upgrade -y
```

### 1.2 Install Required Packages
```bash
sudo apt install python3-pip python3-venv nginx mysql-server -y
```

### 1.3 Create Application Directory
```bash
sudo mkdir -p /var/www/drpitz-app
sudo chown -R $USER:$USER /var/www/drpitz-app
```

## Step 2: Upload Your Application

### 2.1 Transfer Files to Server
From your local machine:
```bash
scp -r /path/to/drpitz-app/* user@your-server-ip:/var/www/drpitz-app/
```

Or use SFTP, Git, or any other method you prefer.

### 2.2 Set Up Python Virtual Environment
```bash
cd /var/www/drpitz-app
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## Step 3: Configure Application

### 3.1 Set Up Environment Variables
```bash
cp .env.example .env
nano .env
```

Edit the .env file and change:
- SECRET_KEY: Generate a random string (at least 32 characters)
- JWT_SECRET_KEY: Generate another random string
- Any other configuration values

To generate random keys, you can use:
```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

### 3.2 Update User Credentials in auth_server.py
```bash
nano auth_server.py
```

Find the USERS dictionary and change the default credentials:
```python
USERS = {
    'your_username': generate_password_hash('your_secure_password'),
}
```

You can add multiple users:
```python
USERS = {
    'noa': generate_password_hash('secure_password_here'),
    'admin': generate_password_hash('another_secure_password'),
}
```

## Step 4: Set Up Nginx

### 4.1 Copy Nginx Configuration
```bash
sudo cp nginx_config /etc/nginx/sites-available/drpitz.club
```

### 4.2 Edit Nginx Configuration
```bash
sudo nano /etc/nginx/sites-available/drpitz.club
```

Update the paths:
- Replace `/path/to/drpitz-app` with `/var/www/drpitz-app`

### 4.3 Enable the Site
```bash
sudo ln -s /etc/nginx/sites-available/drpitz.club /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Step 5: Set Up SSL Certificate (HTTPS)

### 5.1 Install Certbot
```bash
sudo apt install certbot python3-certbot-nginx -y
```

### 5.2 Obtain SSL Certificate
```bash
sudo certbot --nginx -d drpitz.club -d www.drpitz.club
```

Follow the prompts. Certbot will automatically configure Nginx for HTTPS.

## Step 6: Set Up Systemd Service

### 6.1 Copy Service File
```bash
sudo cp drpitz.service /etc/systemd/system/
```

### 6.2 Edit Service File
```bash
sudo nano /etc/systemd/system/drpitz.service
```

Update the paths:
- Replace `/path/to/drpitz-app` with `/var/www/drpitz-app`

### 6.3 Create Log Directory
```bash
sudo mkdir -p /var/log/drpitz
sudo chown www-data:www-data /var/log/drpitz
```

### 6.4 Start and Enable Service
```bash
sudo systemctl daemon-reload
sudo systemctl start drpitz
sudo systemctl enable drpitz
sudo systemctl status drpitz
```

## Step 7: Integrate Your Task Management App

### 7.1 Copy Your React App Files
Copy your existing React task management application files to:
```bash
/var/www/drpitz-app/app/
```

### 7.2 Update auth_server.py
Edit the `/app` route in auth_server.py to serve your React application:

```python
@app.route('/app')
@app.route('/app/')
def app_page():
    return send_from_directory('app', 'index.html')

# Add route for React app static files
@app.route('/app/<path:path>')
def app_static(path):
    return send_from_directory('app', path)
```

### 7.3 Build Your React App
If you're using Create React App or similar:
```bash
cd /var/www/drpitz-app/your-react-app
npm run build
cp -r build/* /var/www/drpitz-app/app/
```

### 7.4 Update React App to Use Authentication
In your React app, add authentication checks:

```javascript
// Check if user is authenticated
const token = localStorage.getItem('auth_token');
if (!token) {
    window.location.href = '/';
}

// Add token to all API requests
fetch('/api/your-endpoint', {
    headers: {
        'Authorization': 'Bearer ' + token
    }
})
```

## Step 8: Testing

### 8.1 Test the Landing Page
Visit: http://drpitz.club
- You should see the login page with your dog's photo as background
- The title "World Wide Pitz" should be displayed

### 8.2 Test Login
- Enter your username and password
- You should be redirected to `/app`

### 8.3 Test Authentication
- Try accessing `/app` directly without logging in
- You should be redirected to the login page

## Step 9: Maintenance

### 9.1 View Logs
```bash
# Application logs
sudo journalctl -u drpitz -f

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### 9.2 Restart Services
```bash
sudo systemctl restart drpitz
sudo systemctl restart nginx
```

### 9.3 Update Application
```bash
cd /var/www/drpitz-app
git pull  # if using git
sudo systemctl restart drpitz
```

## Security Checklist

- [ ] Changed SECRET_KEY and JWT_SECRET_KEY in .env
- [ ] Changed default username and password in auth_server.py
- [ ] Set up SSL certificate (HTTPS)
- [ ] Configured firewall (ufw) to only allow ports 22, 80, 443
- [ ] Set proper file permissions (644 for files, 755 for directories)
- [ ] Disabled debug mode in production
- [ ] Set up regular backups
- [ ] Configured MySQL with strong password

## Firewall Configuration

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

## Troubleshooting

### Service Won't Start
```bash
sudo journalctl -u drpitz -n 50
```

### 502 Bad Gateway
- Check if Gunicorn is running: `sudo systemctl status drpitz`
- Check logs: `sudo journalctl -u drpitz -f`
- Verify the socket/port configuration

### Login Not Working
- Check browser console for errors (F12)
- Verify credentials in auth_server.py
- Check network tab to see API responses

## Additional Features to Add

1. **Password Reset**: Implement email-based password reset
2. **Session Management**: Add ability to view active sessions
3. **User Management**: Add admin panel to manage users
4. **Two-Factor Authentication**: Add 2FA for extra security
5. **Activity Logs**: Track user logins and actions
6. **Database Storage**: Move user credentials to MySQL database

## Support

For issues or questions, check:
- Application logs: `/var/log/drpitz/`
- Nginx logs: `/var/log/nginx/`
- System logs: `sudo journalctl -u drpitz`
