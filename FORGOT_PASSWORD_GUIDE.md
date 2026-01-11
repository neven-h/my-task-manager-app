# Forgot Password Feature - Complete Guide

## 🎉 What Changed

The Forgot Password feature now works in **both development and production environments** with proper error handling!

---

## 🔧 How It Works Now

### Development Mode (DEBUG=true)

When email is **not configured**, the system provides a reset link directly:

1. User enters their email
2. System generates a secure token
3. **Reset link is displayed in the success message**
4. User can copy and use the link immediately
5. No email server needed for testing!

**Example Response:**
```
✅ Email not configured. Use this reset link

Development Mode - Reset Link:
http://localhost:3004/reset-password?token=abc123-xyz789

Token: abc123-xyz789
```

### Production Mode

When email **is configured**, works like a normal password reset:

1. User enters their email
2. System generates a secure token
3. Email is sent with reset link
4. User clicks link in email
5. User resets password

---

## 🚀 Setup for Production

### Option 1: Gmail (Recommended)

**Step 1: Enable 2-Factor Authentication**
1. Go to https://myaccount.google.com/security
2. Click "2-Step Verification"
3. Follow the setup process

**Step 2: Generate App Password**
1. Go to https://myaccount.google.com/apppasswords
2. Select "Mail" and your device
3. Click "Generate"
4. Copy the 16-character password (no spaces)

**Step 3: Set Environment Variables in Railway**
```bash
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USE_TLS=True
MAIL_USERNAME=your-actual-email@gmail.com
MAIL_PASSWORD=abcd efgh ijkl mnop  # The 16-char app password
MAIL_DEFAULT_SENDER=your-actual-email@gmail.com
```

### Option 2: SendGrid

**Step 1: Create SendGrid Account**
1. Sign up at https://sendgrid.com/
2. Verify your email
3. Create an API key

**Step 2: Set Environment Variables**
```bash
MAIL_SERVER=smtp.sendgrid.net
MAIL_PORT=587
MAIL_USE_TLS=True
MAIL_USERNAME=apikey
MAIL_PASSWORD=your-sendgrid-api-key
MAIL_DEFAULT_SENDER=your-verified-email@domain.com
```

### Option 3: AWS SES

**Step 1: Set up AWS SES**
1. Go to AWS SES Console
2. Verify your domain or email
3. Create SMTP credentials

**Step 2: Set Environment Variables**
```bash
MAIL_SERVER=email-smtp.us-east-1.amazonaws.com
MAIL_PORT=587
MAIL_USE_TLS=True
MAIL_USERNAME=your-ses-smtp-username
MAIL_PASSWORD=your-ses-smtp-password
MAIL_DEFAULT_SENDER=your-verified-email@domain.com
```

---

## 🧪 Testing

### Development Testing (No Email Setup)

1. **Make sure DEBUG=true in .env:**
   ```bash
   DEBUG=true
   ```

2. **Create a test user** (if you haven't already):
   - Go to Sign Up page
   - Register with a test email
   - Remember the credentials

3. **Test Forgot Password:**
   - Go to Login page
   - Click "Forgot Password?"
   - Enter the test email
   - **Copy the reset URL from the green success message**
   - Paste URL in browser
   - Set new password
   - Try logging in with new password

### Production Testing (Email Configured)

1. **Set up email credentials in Railway**

2. **Test the flow:**
   - Go to Forgot Password page
   - Enter your email
   - Check your inbox (and spam folder)
   - Click the reset link in email
   - Reset your password
   - Login with new password

---

## 🔍 Troubleshooting

### Issue: "Email service is not configured"

**Problem:** Email credentials not set in production

**Solution:**
1. Go to Railway → Your Project → Variables
2. Add all MAIL_* variables (see setup above)
3. Redeploy the application

### Issue: "Email service is temporarily unavailable"

**Problem:** Email credentials are wrong or Gmail app password not working

**Solution:**

**For Gmail:**
1. Verify 2FA is enabled
2. Generate a NEW app password
3. Copy it exactly (remove spaces)
4. Update MAIL_PASSWORD in Railway
5. Redeploy

**For SendGrid/AWS SES:**
1. Verify API key/credentials are correct
2. Check if sender email is verified
3. Check SendGrid/AWS SES logs for errors

### Issue: Email not arriving

**Check these:**
1. ✅ Check spam/junk folder
2. ✅ Verify sender email is correct
3. ✅ Check Railway logs for errors
4. ✅ Verify recipient email is registered in system
5. ✅ Wait a few minutes (delivery can be slow)

### Issue: "Too many reset requests"

**Problem:** Rate limit reached (3 requests per hour)

**Solution:**
- Wait 1 hour before trying again
- This is a security feature to prevent abuse
- Or contact admin to clear tokens from database:
  ```sql
  DELETE FROM password_reset_tokens WHERE user_id = <user_id>;
  ```

### Issue: Token expired

**Problem:** Tokens expire after 10 minutes

**Solution:**
- Request a new password reset
- Use the link within 10 minutes
- This is a security feature

---

## 🔒 Security Features

1. **Rate Limiting**
   - Max 3 requests per hour per user
   - Prevents abuse

2. **Token Expiration**
   - Tokens expire after 10 minutes
   - Reduces security risk

3. **One-Time Use**
   - Tokens marked as used after reset
   - Can't be reused

4. **No User Enumeration**
   - Same message whether email exists or not
   - Prevents discovering valid emails

5. **Secure Tokens**
   - UUIDv4 tokens (128-bit randomness)
   - Cryptographically secure

---

## 📊 Database Schema

The forgot password feature uses this table:

```sql
CREATE TABLE password_reset_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    used BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_token (token),
    INDEX idx_expires (expires_at),
    INDEX idx_user_id (user_id)
);
```

---

## 🎯 User Flow

### Normal Flow (Email Configured)

```
User → Forgot Password Page
  ↓
Enter Email → Submit
  ↓
Backend → Generate Token → Save to DB
  ↓
Backend → Send Email
  ↓
User → Receive Email → Click Link
  ↓
Reset Password Page → Enter New Password
  ↓
Backend → Validate Token → Update Password
  ↓
Login Page → Success!
```

### Development Flow (Email Not Configured)

```
User → Forgot Password Page
  ↓
Enter Email → Submit
  ↓
Backend → Generate Token → Save to DB
  ↓
Backend → Return Token in Response
  ↓
User → Copy Reset URL from Success Message
  ↓
Paste URL in Browser → Reset Password Page
  ↓
Enter New Password → Submit
  ↓
Login Page → Success!
```

---

## 🛠️ API Endpoint Details

### POST /api/auth/forgot-password

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response (Email Configured):**
```json
{
  "success": true,
  "message": "If that email is registered, you will receive a password reset link"
}
```

**Response (Email Not Configured, DEBUG=true):**
```json
{
  "success": true,
  "message": "Email not configured. Use this reset link",
  "token": "abc123-xyz-789",
  "reset_url": "http://localhost:3004/reset-password?token=abc123-xyz-789"
}
```

**Response (Email Not Configured, DEBUG=false):**
```json
{
  "error": "Email service is not configured. Please contact administrator."
}
```

---

## 📝 Configuration Checklist

### Development:
- [ ] DEBUG=true in .env
- [ ] Test with registered email
- [ ] Verify token appears in success message
- [ ] Copy and test reset URL

### Production:
- [ ] Set MAIL_SERVER in Railway
- [ ] Set MAIL_PORT in Railway
- [ ] Set MAIL_USE_TLS in Railway
- [ ] Set MAIL_USERNAME in Railway
- [ ] Set MAIL_PASSWORD in Railway
- [ ] Set MAIL_DEFAULT_SENDER in Railway
- [ ] Set DEBUG=false in Railway
- [ ] Test email delivery
- [ ] Check spam folder
- [ ] Verify password reset works end-to-end

---

## 💡 Best Practices

1. **Use Gmail App Passwords**
   - More secure than regular password
   - Can be revoked independently
   - Required by Gmail for SMTP

2. **Verify Sender Domain**
   - For production, use custom domain
   - Improves email deliverability
   - Looks more professional

3. **Monitor Email Logs**
   - Check Railway logs for email errors
   - Monitor SendGrid/AWS SES dashboards
   - Track delivery rates

4. **Set Appropriate Rate Limits**
   - Current: 3 requests per hour
   - Adjust in code if needed
   - Balance security vs usability

5. **Keep Tokens Short-Lived**
   - Current: 10 minutes expiration
   - Reduces security risk
   - User can request new one if needed

---

## 🎊 Benefits of This Implementation

✅ **Works Without Email** - Testing in development is easy

✅ **Clear Error Messages** - Users know what's wrong

✅ **Secure** - Rate limiting, token expiration, no user enumeration

✅ **Flexible** - Supports Gmail, SendGrid, AWS SES, and more

✅ **Production Ready** - Handles errors gracefully

✅ **Developer Friendly** - Easy to test without email server

---

## 📞 Support

If you still have issues:

1. Check Railway logs for errors
2. Verify environment variables are set correctly
3. Test with a simple email first
4. Check spam folder
5. Try a different email provider

**Common Log Messages:**
- `Email not configured. Reset token: abc123` - Email vars missing
- `Email sending failed: [error]` - SMTP connection problem
- `Forgot password error: [error]` - Database or other error

---

## ✨ Summary

**Forgot Password now works in development mode!**

- No email setup needed for testing
- Reset URL provided directly in response
- Easy to test password reset flow
- Production-ready when email is configured

**Just deploy and test!** 🚀
