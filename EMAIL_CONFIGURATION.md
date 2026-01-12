# Email Configuration Guide

This guide explains how to configure email functionality for the Task Manager app, enabling features like:
- Task sharing via email
- Password reset emails

## 🔧 Configuration Steps

### Option 1: Gmail (Recommended)

#### Step 1: Enable 2-Step Verification
1. Go to your Google Account: https://myaccount.google.com/
2. Click on "Security" in the left sidebar
3. Under "How you sign in to Google", click "2-Step Verification"
4. Follow the prompts to enable 2-Step Verification

#### Step 2: Generate App Password
1. After enabling 2-Step Verification, go back to Security
2. Under "How you sign in to Google", click "App passwords"
3. Select "Mail" for the app and "Other" for the device
4. Name it "Task Manager App"
5. Click "Generate"
6. Copy the 16-character password (it will look like: `xxxx xxxx xxxx xxxx`)

#### Step 3: Update .env File
Edit your `.env` file with the following:

```env
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USE_TLS=True
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-16-char-app-password
MAIL_DEFAULT_SENDER=your-email@gmail.com
```

**Replace:**
- `your-email@gmail.com` with your actual Gmail address
- `your-16-char-app-password` with the app password you generated (remove spaces)

### Option 2: Outlook/Office 365

```env
MAIL_SERVER=smtp-mail.outlook.com
MAIL_PORT=587
MAIL_USE_TLS=True
MAIL_USERNAME=your-email@outlook.com
MAIL_PASSWORD=your-password
MAIL_DEFAULT_SENDER=your-email@outlook.com
```

### Option 3: Custom SMTP Server

```env
MAIL_SERVER=smtp.your-domain.com
MAIL_PORT=587
MAIL_USE_TLS=True
MAIL_USERNAME=your-username
MAIL_PASSWORD=your-password
MAIL_DEFAULT_SENDER=noreply@your-domain.com
```

## 🔄 Applying Configuration

### Development (Local)
1. Update the `.env` file in the project root
2. Restart the backend server:
   ```bash
   cd backend
   python app.py
   ```

### Production (Railway)
1. Go to your Railway project dashboard
2. Click on your backend service
3. Go to "Variables" tab
4. Add/update the following variables:
   - `MAIL_SERVER`
   - `MAIL_PORT`
   - `MAIL_USE_TLS`
   - `MAIL_USERNAME`
   - `MAIL_PASSWORD`
   - `MAIL_DEFAULT_SENDER`
4. Railway will automatically redeploy with the new configuration

## ✅ Testing Email Configuration

### Test Task Sharing
1. Log in to the app
2. Create or select a task
3. Click the "Share" button
4. Enter a recipient email address
5. Click "Send"
6. Check if you receive a success message

### Test Password Reset
1. Go to the login page
2. Click "Forgot Password?"
3. Enter your email address
4. Check your inbox for the reset link

## ⚠️ Troubleshooting

### Error: "Email service is not configured"
**Cause:** Email credentials are not set or still using placeholder values

**Solution:**
- Verify your `.env` file has real email credentials
- Make sure `MAIL_USERNAME` is not `your-email@gmail.com`
- Make sure `MAIL_PASSWORD` is not `your-app-password`
- Restart the backend server after updating

### Error: "Failed to send email"
**Possible causes:**
1. **Incorrect credentials**
   - Double-check your email and password
   - For Gmail, ensure you're using an app password, not your regular password

2. **2-Step Verification not enabled (Gmail)**
   - Gmail requires 2-Step Verification to generate app passwords
   - Follow Step 1 above to enable it

3. **SMTP port blocked**
   - Some networks block port 587
   - Try using port 465 with SSL:
     ```env
     MAIL_PORT=465
     MAIL_USE_TLS=False
     MAIL_USE_SSL=True
     ```

4. **"Less secure app access" (Gmail Legacy)**
   - Gmail has deprecated this feature
   - You must use app passwords instead

### Error: "Authentication failed"
**Gmail users:**
- Ensure you're using an app password (16 characters)
- Don't include spaces in the password
- The app password is different from your Google account password

**Outlook users:**
- If you have 2FA enabled, you need an app password
- Go to https://account.microsoft.com/security
- Create a new app password under "App passwords"

### Still having issues?
1. Check the backend logs for detailed error messages
2. Verify the SMTP server and port are correct for your email provider
3. Test with a simple email client (like Thunderbird) to confirm credentials work
4. Make sure your email provider allows SMTP access

## 🔒 Security Best Practices

1. **Never commit credentials to Git**
   - The `.env` file is already in `.gitignore`
   - Always use environment variables for sensitive data

2. **Use app-specific passwords**
   - Never use your main email password
   - Generate separate app passwords for each service

3. **Rotate passwords regularly**
   - Change your app passwords every 6-12 months
   - Revoke old passwords when no longer needed

4. **Limit permissions**
   - Use a dedicated email account for the app if possible
   - This limits potential damage if credentials are compromised

## 📧 Email Features

Once configured, the following features will work:

### Task Sharing
- Share task details via email
- Recipients receive formatted task information including:
  - Task title and description
  - Date, time, and duration
  - Status, categories, and tags
  - Client information and notes

### Password Reset
- Users can request password reset links
- Links expire after 1 hour for security
- Links are single-use (token is invalidated after reset)

## 🌐 Railway Deployment

For Railway deployment, email configuration is handled via environment variables:

1. **Never include email credentials in the `.env` file committed to Git**
2. **Set environment variables in Railway dashboard:**
   - Go to your project → Variables tab
   - Add the MAIL_* variables listed above
   - Railway encrypts and secures these values

3. **Deployment is automatic:**
   - Any variable changes trigger a redeploy
   - The app picks up new configuration on restart

## 💡 Development Mode

If email is not configured, the app will:
- Return clear error messages
- Not crash or throw 500 errors
- Continue to work for all non-email features

This allows development without email setup if you don't need those features.
