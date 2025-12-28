# 🌐 World Wide Pitz - Deployment Guide for drpitz.club

## 📋 What Was Created

1. **LandingPage.jsx** - A beautiful landing page with "World Wide Pitz" branding and your red-yellow-blue color scheme
2. **LoginPage.jsx** - Hebrew login page with username/password authentication
3. **Updated App.jsx** - Main app with authentication flow (Landing → Login → Task Tracker)
4. **Updated app.py** - Backend with authentication endpoints

## 🔐 Default Login Credentials

```
Username: pitz
Password: worldwidepitz2025
```

**⚠️ IMPORTANT: Change these credentials in `backend/app.py` before deploying to production!**

To change the password, edit the `AUTH_USERS` dictionary in `app.py`:
```python
AUTH_USERS = {
    'pitz': hashlib.sha256('YOUR_NEW_PASSWORD'.encode()).hexdigest(),
}
```

---

## 🚀 Deployment Options

### Option 1: VPS/Cloud Server (Recommended)
Best for: Full control, custom domain, professional deployment

**Requirements:**
- A VPS (DigitalOcean, Linode, AWS EC2, etc.) - ~$5-10/month
- Ubuntu 22.04 or newer

**Steps:**

1. **Get a VPS and SSH into it**
   ```bash
   ssh root@your-server-ip
   ```

2. **Install required software**
   ```bash
   # Update system
   apt update && apt upgrade -y
   
   # Install Node.js
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   apt install -y nodejs
   
   # Install MySQL
   apt install -y mysql-server
   
   # Install Python
   apt install -y python3 python3-pip python3-venv
   
   # Install Nginx (web server)
   apt install -y nginx
   
   # Install Certbot for SSL
   apt install -y certbot python3-certbot-nginx
   ```

3. **Configure MySQL**
   ```bash
   mysql_secure_installation
   
   # Create database
   mysql -u root -p
   CREATE DATABASE task_tracker;
   CREATE USER 'taskuser'@'localhost' IDENTIFIED BY 'your_db_password';
   GRANT ALL PRIVILEGES ON task_tracker.* TO 'taskuser'@'localhost';
   FLUSH PRIVILEGES;
   EXIT;
   ```

4. **Upload your project**
   ```bash
   # From your local machine:
   scp -r "/Users/pit/PycharmProjects/My Task Manager App" root@your-server-ip:/var/www/
   ```

5. **Setup Backend**
   ```bash
   cd /var/www/My\ Task\ Manager\ App/backend
   
   # Create virtual environment
   python3 -m venv venv
   source venv/bin/activate
   
   # Install dependencies
   pip install flask flask-cors mysql-connector-python gunicorn
   
   # Update DB_CONFIG in app.py with new credentials
   nano app.py
   ```

6. **Build Frontend**
   ```bash
   cd /var/www/My\ Task\ Manager\ App/frontend
   npm install
   npm run build
   ```

7. **Create systemd service for backend**
   ```bash
   sudo nano /etc/systemd/system/tasktracker.service
   ```
   
   Add:
   ```ini
   [Unit]
   Description=Task Tracker Backend
   After=network.target
   
   [Service]
   User=www-data
   WorkingDirectory=/var/www/My Task Manager App/backend
   Environment="PATH=/var/www/My Task Manager App/backend/venv/bin"
   ExecStart=/var/www/My Task Manager App/backend/venv/bin/gunicorn -w 4 -b 127.0.0.1:5001 app:app
   Restart=always
   
   [Install]
   WantedBy=multi-user.target
   ```
   
   Enable and start:
   ```bash
   sudo systemctl enable tasktracker
   sudo systemctl start tasktracker
   ```

8. **Configure Nginx**
   ```bash
   sudo nano /etc/nginx/sites-available/drpitz.club
   ```
   
   Add:
   ```nginx
   server {
       listen 80;
       server_name drpitz.club www.drpitz.club;
   
       # Frontend
       location / {
           root /var/www/My Task Manager App/frontend/build;
           try_files $uri $uri/ /index.html;
       }
   
       # Backend API
       location /api {
           proxy_pass http://127.0.0.1:5001;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```
   
   Enable site:
   ```bash
   sudo ln -s /etc/nginx/sites-available/drpitz.club /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

9. **Point your domain**
   - Go to your domain registrar (where you bought drpitz.club)
   - Add an A record pointing to your server's IP address:
     - Type: A
     - Name: @ (or drpitz.club)
     - Value: YOUR_SERVER_IP
     - TTL: 3600

10. **Setup SSL (HTTPS)**
    ```bash
    sudo certbot --nginx -d drpitz.club -d www.drpitz.club
    ```

---

### Option 2: Platform as a Service (Easier)
Best for: Quick deployment without server management

**Using Railway.app, Render.com, or Heroku:**

1. **Create accounts** on Railway or Render
2. **Connect your GitHub repository**
3. **Deploy backend** as a Python service
4. **Deploy frontend** as a static site
5. **Add MySQL database** from their marketplace
6. **Configure custom domain** in their dashboard

---

### Option 3: Shared Hosting with cPanel
Best for: Budget-friendly, if you already have hosting

Note: May require some adjustments to work with Python/Node.js

---

## 🔧 Local Testing Before Deployment

1. **Test the new frontend**:
   ```bash
   cd /Users/pit/PycharmProjects/My\ Task\ Manager\ App/frontend
   npm start
   ```

2. **Restart the backend**:
   ```bash
   cd /Users/pit/PycharmProjects/My\ Task\ Manager\ App/backend
   source venv/bin/activate
   python app.py
   ```

3. **Open http://localhost:3000** and you should see the "World Wide Pitz" landing page!

---

## 📁 Files Modified

| File | Changes |
|------|---------|
| `frontend/src/LandingPage.jsx` | NEW - Landing page component |
| `frontend/src/LoginPage.jsx` | NEW - Login page component |
| `frontend/src/App.jsx` | Updated - Auth flow + logout button |
| `backend/app.py` | Updated - Auth endpoints added |

---

## 🔒 Security Checklist Before Going Live

- [ ] Change default login credentials in `app.py`
- [ ] Use a strong database password
- [ ] Enable HTTPS with SSL certificate
- [ ] Update `CORS(app)` to only allow your domain
- [ ] Consider using environment variables for sensitive data
- [ ] Enable firewall (ufw) on your server
- [ ] Setup regular database backups

---

## 📞 Need Help?

The deployment process involves several steps. If you get stuck at any point, let me know:
1. Which deployment option you chose
2. What step you're on
3. Any error messages you see

I'll help you troubleshoot! 🚀
