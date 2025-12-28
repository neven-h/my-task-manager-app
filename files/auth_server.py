from flask import Flask, request, jsonify, send_from_directory, redirect, session
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
import datetime
from functools import wraps
import os

app = Flask(__name__, static_folder='.')
CORS(app)

# Configuration - CHANGE THESE VALUES!
app.config['SECRET_KEY'] = 'your-secret-key-change-this-to-something-random'  # Change this!
app.config['JWT_SECRET_KEY'] = 'your-jwt-secret-change-this-too'  # Change this!

# User credentials - You should store these securely in a database
# For now, we'll use a simple dictionary
# Password is hashed for security
USERS = {
    'admin': generate_password_hash('admin123'),  # Change these credentials!
}

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

@app.route('/')
def index():
    """Serve the login page"""
    return send_from_directory('.', 'index.html')

@app.route('/pitz_background.jpeg')
def background_image():
    """Serve the background image"""
    return send_from_directory('.', 'pitz_background.jpeg')

@app.route('/api/login', methods=['POST'])
def login():
    """Handle login requests"""
    data = request.get_json()
    
    if not data or not data.get('username') or not data.get('password'):
        return jsonify({'message': 'Missing credentials'}), 400
    
    username = data['username']
    password = data['password']
    
    # Check if user exists and password is correct
    if username in USERS and check_password_hash(USERS[username], password):
        # Generate JWT token
        token = jwt.encode({
            'username': username,
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
        }, app.config['JWT_SECRET_KEY'], algorithm="HS256")
        
        return jsonify({
            'token': token,
            'message': 'Login successful'
        }), 200
    
    return jsonify({'message': 'Invalid credentials'}), 401

@app.route('/api/verify', methods=['GET'])
@token_required
def verify_token(current_user):
    """Verify if token is valid"""
    return jsonify({
        'valid': True,
        'username': current_user
    }), 200

@app.route('/app')
@app.route('/app/')
def app_page():
    """Serve your main task management application"""
    # This should redirect or serve your React app
    # For now, we'll create a placeholder
    return '''
    <!DOCTYPE html>
    <html>
    <head>
        <title>Pitz Task Manager</title>
        <meta charset="UTF-8">
    </head>
    <body>
        <h1>Welcome to Pitz Task Manager</h1>
        <p>This is where your React task management app will be loaded.</p>
        <button onclick="logout()">Logout</button>
        <script>
            // Check if user is authenticated
            const token = localStorage.getItem('auth_token');
            if (!token) {
                window.location.href = '/';
            }
            
            function logout() {
                localStorage.removeItem('auth_token');
                window.location.href = '/';
            }
            
            // Verify token
            fetch('/api/verify', {
                headers: {
                    'Authorization': 'Bearer ' + token
                }
            }).then(response => {
                if (!response.ok) {
                    window.location.href = '/';
                }
            });
        </script>
    </body>
    </html>
    '''

if __name__ == '__main__':
    # For production, use a production WSGI server like Gunicorn
    app.run(host='0.0.0.0', port=5000, debug=False)
