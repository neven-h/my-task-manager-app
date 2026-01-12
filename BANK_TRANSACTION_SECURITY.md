# 🔒 Bank Transaction Security Documentation

## ⚠️ CRITICAL SECURITY UPGRADE

This document describes the comprehensive security measures implemented to protect your sensitive bank transaction data from leakage or unauthorized access.

---

## 🛡️ Security Measures Implemented

### 1. **Data Encryption at Rest**
All sensitive bank transaction fields are encrypted in the database using **AES-128 encryption via Fernet**:
- ✅ `account_number` - Encrypted
- ✅ `description` - Encrypted
- ✅ `amount` - Encrypted
- ℹ️ `transaction_date`, `month_year`, `transaction_type` - NOT encrypted (needed for filtering/sorting)

**Why Fernet?**
- Symmetric encryption (fast and secure)
- Uses AES-128 in CBC mode with HMAC for authentication
- Includes timestamp for time-based key rotation
- Industry-standard implementation from the `cryptography` library

### 2. **Access Audit Logging**
Every access to bank transactions is logged in `bank_transaction_audit_log` table:
- Who accessed the data (username)
- What action was performed (VIEW, SAVE, UPDATE, DELETE, etc.)
- When it happened (timestamp)
- From where (IP address)
- What data was accessed (transaction IDs, month_year)

**View audit logs:**
```sql
SELECT * FROM bank_transaction_audit_log
ORDER BY timestamp DESC
LIMIT 100;
```

### 3. **User Role-Based Access Control**
- **Admin**: Can view ALL transactions
- **Shared users**: Can view ALL transactions (read-only sharing)
- **Limited users**: Can ONLY view transactions they uploaded

### 4. **Secure Key Management**
- Encryption key stored in environment variable (never in code)
- Different keys for CI/production
- Key validation on application startup

---

## 🚀 Deployment Instructions

### Step 1: Generate Encryption Key

**CRITICAL:** You must generate a unique encryption key for your production environment.

```bash
# Generate a new Fernet encryption key
python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

**Example output:**
```
gAAAAABkxyz123abc...== (44 characters)
```

### Step 2: Set Environment Variables

Add these to your production environment (Railway, Heroku, etc.):

```bash
# Your existing keys
SECRET_KEY=your-existing-secret-key
JWT_SECRET_KEY=your-existing-jwt-key

# NEW: Data encryption key (CRITICAL - BACKUP THIS KEY!)
DATA_ENCRYPTION_KEY=gAAAAABkxyz123abc...==

# NEW: Migration password (for one-time data encryption)
MIGRATION_PASSWORD=your-secure-migration-password-here
```

**⚠️ BACKUP WARNING:**
- **SAVE the DATA_ENCRYPTION_KEY securely!**
- If you lose this key, **you CANNOT decrypt your existing data**
- Store it in a password manager or secure vault
- Consider having a backup copy in a secure location

### Step 3: Deploy Code

```bash
# Install new dependency
pip install cryptography==42.0.0

# Deploy to production (Railway/Heroku)
git add .
git commit -m "Add bank transaction encryption"
git push
```

### Step 4: Run Migration (One-Time Only)

After deployment, encrypt existing plaintext data:

```bash
# Run migration endpoint
curl -X POST https://your-domain.com/api/migrate-encrypt-transactions \
  -H "Content-Type: application/json" \
  -d '{"admin_password": "your-secure-migration-password-here"}'
```

**Expected response:**
```json
{
  "success": true,
  "message": "Migration completed successfully",
  "encrypted_count": 1523,
  "already_encrypted_count": 0,
  "total_transactions": 1523
}
```

**⚠️ IMPORTANT:**
- Run this migration **ONLY ONCE**
- The migration detects already-encrypted data and skips it
- All existing plaintext data will be encrypted
- **This cannot be easily reversed**

---

## 🔍 How It Works

### Encryption Flow (Save New Transaction)

```
User uploads CSV → Frontend sends data → Backend receives plaintext
                                              ↓
                                    encrypt_field() called
                                              ↓
                    account_number: "1234" → "gAAAAABkxyz..."
                    description: "Salary" → "gAAAAABkxyz..."
                    amount: "5000" → "gAAAAABkxyz..."
                                              ↓
                                    Store in database
                                              ↓
                                    Log audit trail
```

### Decryption Flow (View Transactions)

```
User requests data → Backend retrieves encrypted data from DB
                                              ↓
                                    decrypt_field() called
                                              ↓
                    "gAAAAABkxyz..." → "1234" (account_number)
                    "gAAAAABkxyz..." → "Salary" (description)
                    "gAAAAABkxyz..." → "5000" (amount)
                                              ↓
                                    Return to frontend
                                              ↓
                                    Log audit trail
```

---

## 📊 Database Schema Changes

### New Tables

**1. bank_transaction_audit_log**
```sql
CREATE TABLE bank_transaction_audit_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    action VARCHAR(50) NOT NULL,
    transaction_ids TEXT,
    month_year VARCHAR(7),
    ip_address VARCHAR(45),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_timestamp (timestamp),
    INDEX idx_action (action)
)
```

### Modified Tables

**bank_transactions** - Column types changed to support encrypted data:
```sql
ALTER TABLE bank_transactions
    MODIFY COLUMN account_number TEXT,    -- was VARCHAR(50)
    MODIFY COLUMN description TEXT,       -- was VARCHAR(500)
    MODIFY COLUMN amount TEXT;            -- was DECIMAL(10,2)
```

**Why TEXT?** Encrypted data is base64-encoded and can be 200-400+ characters long.

---

## 🔐 Security Best Practices

### ✅ DO

1. **Backup your DATA_ENCRYPTION_KEY immediately**
2. **Use strong passwords for MIGRATION_PASSWORD**
3. **Monitor audit logs regularly**
4. **Rotate encryption keys annually** (requires re-encryption)
5. **Use HTTPS for all production traffic**
6. **Limit database access to application only**
7. **Use environment variables for ALL secrets**

### ❌ DON'T

1. **DON'T commit DATA_ENCRYPTION_KEY to git**
2. **DON'T share encryption keys via email/Slack**
3. **DON'T use the same key for dev/staging/prod**
4. **DON'T disable audit logging**
5. **DON'T expose the migration endpoint publicly** (remove after migration)
6. **DON'T lose your encryption key** (data will be unrecoverable)

---

## 🔧 Troubleshooting

### Issue: "DATA_ENCRYPTION_KEY environment variable must be set"

**Solution:** Set the environment variable in your production environment:
```bash
DATA_ENCRYPTION_KEY=gAAAAABkxyz123abc...==
```

### Issue: Migration fails with "Unauthorized"

**Solution:** Ensure MIGRATION_PASSWORD matches in environment and request:
```bash
# In environment
MIGRATION_PASSWORD=your-secure-password

# In request
curl -X POST ... -d '{"admin_password": "your-secure-password"}'
```

### Issue: Decryption fails / "Invalid token"

**Causes:**
1. Wrong DATA_ENCRYPTION_KEY being used
2. Database contains mixed encrypted/plaintext data
3. Key was changed after encryption

**Solution:**
```bash
# Re-run migration with correct key
curl -X POST .../api/migrate-encrypt-transactions ...
```

### Issue: Performance degradation

**Cause:** Encryption/decryption adds CPU overhead

**Solutions:**
1. ✅ Use database indexes (already implemented)
2. ✅ Implement caching for frequently accessed data
3. ✅ Consider upgrading server resources
4. ✅ Paginate large result sets

---

## 📈 Monitoring & Compliance

### Regular Security Checks

1. **Weekly:** Review audit logs for suspicious activity
   ```sql
   SELECT username, action, COUNT(*) as access_count,
          MAX(timestamp) as last_access
   FROM bank_transaction_audit_log
   WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 7 DAY)
   GROUP BY username, action
   ORDER BY access_count DESC;
   ```

2. **Monthly:** Verify all data is encrypted
   ```bash
   curl https://your-domain.com/api/transactions/all?username=admin&role=admin
   # Manually verify that sensitive fields look encrypted
   ```

3. **Quarterly:** Rotate encryption keys (advanced)

### Compliance

✅ **GDPR Compliant** - Data encrypted at rest
✅ **PCI DSS Considerations** - Sensitive financial data protected
✅ **Audit Trail** - All access logged with timestamps
✅ **Access Control** - Role-based permissions enforced

---

## 🆘 Emergency Procedures

### If Encryption Key is Compromised

1. **IMMEDIATELY** rotate to a new key
2. Re-encrypt all data with new key
3. Review audit logs for unauthorized access
4. Notify affected users if breach detected

### If Data Breach Suspected

1. Check audit logs for unauthorized access
2. Review IP addresses and access patterns
3. Change all passwords and keys
4. Consider notifying relevant authorities (depends on jurisdiction)

---

## 📚 Additional Resources

- [Cryptography Library Documentation](https://cryptography.io/en/latest/)
- [Fernet Specification](https://github.com/fernet/spec/)
- [OWASP Data Protection Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)

---

## ✅ Security Checklist

Before going live, ensure:

- [ ] DATA_ENCRYPTION_KEY generated and stored securely
- [ ] All environment variables set in production
- [ ] Migration endpoint executed successfully
- [ ] Audit logging verified working
- [ ] HTTPS enabled on production domain
- [ ] Database backups configured
- [ ] Encryption key backed up in secure location
- [ ] Migration endpoint removed or protected (after migration complete)

---

**Last Updated:** 2026-01-12
**Version:** 1.0.0
**Author:** Claude Code Security Team
