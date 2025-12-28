# DrPitz.club - Task Management System

A secure, authenticated task management application featuring a custom landing page with login functionality.

## Features

- 🔐 Secure authentication with JWT tokens
- 🐕 Beautiful landing page with custom background (Pitz!)
- 🌈 Red-Yellow-Blue color scheme (Italian art gallery inspired)
- 📱 Responsive design (works on mobile and desktop)
- 🔒 HTTPS support
- 🚀 Production-ready with Gunicorn and Nginx

## Quick Start (Local Testing)

1. Clone or download this repository
2. Run the local testing script:
```bash
cd drpitz-app
./run_local.sh
```
3. Open your browser to `http://localhost:5000`
4. Login with:
   - Username: `admin`
   - Password: `admin123`

## Project Structure

```
drpitz-app/
├── index.html              # Landing page with login form
├── pitz_background.jpeg    # Background image (your dog!)
├── auth_server.py         # Flask authentication server
├── requirements.txt       # Python dependencies
├── gunicorn_config.py    # Gunicorn production configuration
├── nginx_config          # Nginx reverse proxy configuration
├── drpitz.service        # Systemd service file
├── .env.example          # Environment variables template
├── run_local.sh          # Local testing script
├── DEPLOYMENT_GUIDE.md   # Complete deployment instructions
└── README.md             # This file
```

## Deployment to drpitz.club

See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for complete step-by-step instructions.

Quick deployment steps:
1. Set up a VPS with Ubuntu
2. Point drpitz.club to your server IP
3. Upload files to `/var/www/drpitz-app`
4. Install dependencies
5. Configure Nginx
6. Set up SSL with Let's Encrypt
7. Start the systemd service

## Security

⚠️ **IMPORTANT**: Before deploying to production:

1. **Change the default credentials** in `auth_server.py`
2. **Generate new secret keys** in `.env`
3. **Set up SSL certificate** (HTTPS)
4. **Configure firewall** (only allow ports 22, 80, 443)
5. **Disable debug mode** in production

## Customization

### Changing Login Credentials

Edit `auth_server.py`:
```python
USERS = {
    'your_username': generate_password_hash('your_secure_password'),
}
```

### Adding Multiple Users

```python
USERS = {
    'noa': generate_password_hash('password1'),
    'admin': generate_password_hash('password2'),
    'user3': generate_password_hash('password3'),
}
```

### Changing Colors

Edit the gradient in `index.html`:
```css
background: linear-gradient(135deg, #dc143c 0%, #ffd700 50%, #4169e1 100%);
```

### Changing Background Image

Replace `pitz_background.jpeg` with your own image (keep the same filename, or update references in HTML and Python).

## Integrating Your Task Management App

1. Build your React app: `npm run build`
2. Copy build files to `/var/www/drpitz-app/app/`
3. Update routes in `auth_server.py` to serve your app
4. Add authentication checks to your React app

Example React authentication:
```javascript
const token = localStorage.getItem('auth_token');
if (!token) {
    window.location.href = '/';
}

// Add to API calls
fetch('/api/endpoint', {
    headers: {
        'Authorization': 'Bearer ' + token
    }
})
```

## API Endpoints

- `GET /` - Landing page with login form
- `POST /api/login` - Authenticate user, returns JWT token
- `GET /api/verify` - Verify token validity (requires authentication)
- `GET /app` - Main application (requires authentication)

## Technologies Used

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Backend**: Python Flask
- **Authentication**: JWT (JSON Web Tokens)
- **Web Server**: Nginx
- **Application Server**: Gunicorn
- **SSL**: Let's Encrypt (Certbot)

## Maintenance

### View Logs
```bash
sudo journalctl -u drpitz -f
```

### Restart Application
```bash
sudo systemctl restart drpitz
```

### Update Application
```bash
cd /var/www/drpitz-app
# Pull updates (if using git)
git pull
# Restart service
sudo systemctl restart drpitz
```

## Troubleshooting

### Can't login
- Check credentials in `auth_server.py`
- Check browser console (F12) for errors
- Verify Flask server is running: `sudo systemctl status drpitz`

### 502 Bad Gateway
- Check if Gunicorn is running: `sudo systemctl status drpitz`
- Check logs: `sudo journalctl -u drpitz -n 50`

### Background image not showing
- Check file path in `auth_server.py`
- Verify file permissions: `chmod 644 pitz_background.jpeg`

## Future Enhancements

- [ ] Database-backed user management
- [ ] Password reset functionality
- [ ] Two-factor authentication
- [ ] Session management dashboard
- [ ] Activity logging
- [ ] User roles and permissions
- [ ] Email notifications

## License

This is a personal project for Noa's task management system.

## Support

For issues or questions, check the logs or refer to the DEPLOYMENT_GUIDE.md file.

---

Made with ❤️ for Pitz
