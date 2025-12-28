# Integration Guide: Connecting Your Task Management App

This guide explains how to integrate your existing Flask/React task management application with the new authentication system.

## Overview

Your current task management app will become the protected area that users access after logging in through the landing page.

## Architecture

```
User Journey:
1. User visits drpitz.club → Sees landing page with login
2. User enters credentials → Gets JWT token
3. User is redirected to /app → Your task management interface
4. All API calls include JWT token → Backend verifies token
```

## Step 1: Update Your Flask Backend

### 1.1 Merge the Authentication Server

You have two options:

**Option A: Merge auth_server.py with your existing Flask app**

Add these imports to your existing Flask app:
```python
import jwt
import datetime
from functools import wraps
from werkzeug.security import generate_password_hash, check_password_hash
```

Add the authentication decorator:
```python
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        
        if not token:
            return jsonify({'message': 'Token is missing!'}), 401
        
        try:
            if token.startswith('Bearer '):
                token = token[7:]
            data = jwt.decode(token, app.config['JWT_SECRET_KEY'], algorithms=["HS256"])
            current_user = data['username']
        except:
            return jsonify({'message': 'Token is invalid!'}), 401
        
        return f(current_user, *args, **kwargs)
    
    return decorated
```

Add login route:
```python
@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data['username']
    password = data['password']
    
    if username in USERS and check_password_hash(USERS[username], password):
        token = jwt.encode({
            'username': username,
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
        }, app.config['JWT_SECRET_KEY'], algorithm="HS256")
        
        return jsonify({'token': token}), 200
    
    return jsonify({'message': 'Invalid credentials'}), 401
```

Protect your existing API routes:
```python
@app.route('/api/tasks', methods=['GET'])
@token_required  # Add this decorator
def get_tasks(current_user):  # Add current_user parameter
    # Your existing code here
    pass

@app.route('/api/tasks', methods=['POST'])
@token_required
def create_task(current_user):
    # Your existing code here
    pass
```

**Option B: Keep them separate (Microservices approach)**

Run auth_server.py on port 5000 and your task app on port 5001, then use Nginx to route:
```nginx
location /api/login {
    proxy_pass http://127.0.0.1:5000;
}

location /api/tasks {
    proxy_pass http://127.0.0.1:5001;
}
```

## Step 2: Update Your React Frontend

### 2.1 Add Authentication Check

At the top of your main App component:
```javascript
import React, { useEffect, useState } from 'react';

function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        checkAuthentication();
    }, []);

    const checkAuthentication = async () => {
        const token = localStorage.getItem('auth_token');
        
        if (!token) {
            window.location.href = '/';
            return;
        }

        try {
            const response = await fetch('/api/verify', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                setIsAuthenticated(true);
            } else {
                localStorage.removeItem('auth_token');
                window.location.href = '/';
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            window.location.href = '/';
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return <div>Loading...</div>;
    }

    if (!isAuthenticated) {
        return null;
    }

    return (
        // Your existing app JSX here
    );
}
```

### 2.2 Add Logout Functionality

Add a logout button to your interface:
```javascript
const handleLogout = () => {
    localStorage.removeItem('auth_token');
    window.location.href = '/';
};

// In your JSX:
<button onClick={handleLogout}>Logout</button>
```

### 2.3 Update API Calls

Create an API utility function:
```javascript
// utils/api.js
export const fetchWithAuth = async (url, options = {}) => {
    const token = localStorage.getItem('auth_token');
    
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(url, {
        ...options,
        headers,
    });
    
    if (response.status === 401) {
        localStorage.removeItem('auth_token');
        window.location.href = '/';
        return;
    }
    
    return response;
};
```

Use it in your components:
```javascript
import { fetchWithAuth } from './utils/api';

// Instead of:
const response = await fetch('/api/tasks');

// Use:
const response = await fetchWithAuth('/api/tasks');
```

## Step 3: Directory Structure

Your final structure should look like:
```
/var/www/drpitz-app/
├── index.html              # Landing page
├── pitz_background.jpeg    # Background image
├── auth_server.py         # Combined Flask app
├── app/                   # Your React app (built)
│   ├── index.html
│   ├── static/
│   │   ├── css/
│   │   └── js/
│   └── ...
├── static/                # Static files
├── templates/             # Flask templates (if needed)
└── ...
```

## Step 4: Serve Your React App

Update auth_server.py to serve your React app:
```python
@app.route('/app')
@app.route('/app/')
def serve_react_app():
    return send_from_directory('app', 'index.html')

@app.route('/app/<path:path>')
def serve_react_static(path):
    return send_from_directory('app', path)

# Catch-all for React Router (if you use it)
@app.route('/app/<path:path>')
def react_routes(path):
    return send_from_directory('app', 'index.html')
```

## Step 5: Build and Deploy

### 5.1 Build Your React App
```bash
cd your-react-app
npm run build
```

### 5.2 Copy to Server
```bash
cp -r build/* /var/www/drpitz-app/app/
```

### 5.3 Restart Service
```bash
sudo systemctl restart drpitz
```

## Step 6: Testing

1. Visit drpitz.club → Should see landing page
2. Login → Should redirect to /app
3. See your task management interface
4. Try API operations → Should work with authentication
5. Logout → Should return to landing page
6. Try accessing /app directly → Should redirect to login

## Common Issues and Solutions

### Issue: CORS Errors
**Solution**: Make sure CORS is configured in your Flask app:
```python
from flask_cors import CORS
CORS(app, origins=['https://drpitz.club'])
```

### Issue: Token Not Sent with Requests
**Solution**: Check that you're using the fetchWithAuth utility and that localStorage has the token.

### Issue: Routes Not Working
**Solution**: Check Nginx configuration and Flask route order (more specific routes first).

### Issue: Hebrew Text Not Displaying
**Solution**: Ensure UTF-8 encoding in your React app and Flask responses:
```python
@app.after_request
def after_request(response):
    response.headers['Content-Type'] = 'application/json; charset=utf-8'
    return response
```

## Database Considerations

If your task app uses MySQL, make sure:
1. Database credentials are in .env file
2. Connection is established in Flask app
3. Character encoding is UTF-8: `charset='utf8mb4'`

## Security Checklist

- [ ] All API routes are protected with @token_required
- [ ] Token expiration is set (24 hours default)
- [ ] HTTPS is enabled
- [ ] CORS is restricted to your domain
- [ ] Database queries use parameterized statements
- [ ] File uploads are validated and sanitized
- [ ] Error messages don't leak sensitive information

## Next Steps

1. Test thoroughly in staging environment
2. Set up monitoring and logging
3. Configure automatic backups
4. Set up error alerting
5. Document API endpoints
6. Create user documentation

## Need Help?

Check:
- Browser console (F12) for frontend errors
- Server logs: `sudo journalctl -u drpitz -f`
- Nginx logs: `/var/log/nginx/error.log`
