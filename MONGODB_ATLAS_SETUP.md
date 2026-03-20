# MongoDB Atlas Setup Guide for CypherMIND

## Step-by-Step Setup (5-10 minutes)

### Step 1: Create MongoDB Atlas Account

1. Go to: **https://www.mongodb.com/cloud/atlas/register**
2. Sign up with:
   - Email address
   - OR Google account
   - OR GitHub account
3. No credit card required for free tier!

### Step 2: Create a Free Cluster

1. After login, click **"Build a Database"** or **"Create"**
2. Choose **M0 (Free)** tier:
   - ✅ 512 MB Storage
   - ✅ Shared RAM
   - ✅ Vector Search included
   - ✅ Free forever
3. Select **Cloud Provider & Region**:
   - Provider: AWS, Google Cloud, or Azure (any is fine)
   - Region: Choose closest to your location
4. **Cluster Name**: `CypherMIND` (or keep default)
5. Click **"Create Deployment"**
6. Wait 1-3 minutes for cluster creation

### Step 3: Create Database User

You'll see a security quickstart screen:

1. **Authentication Method**: Username and Password
2. **Username**: `cyphermind_user` (or your choice)
3. **Password**: Click "Autogenerate Secure Password" 
   - ⚠️ **SAVE THIS PASSWORD!** You'll need it
   - Or create your own strong password
4. Click **"Create Database User"**

### Step 4: Configure Network Access

1. **Where would you like to connect from?**
2. Choose **"My Local Environment"**
3. Click **"Add My Current IP Address"**
   - This allows your computer to connect
4. OR for development, click **"Allow Access from Anywhere"**
   - IP Address: `0.0.0.0/0`
   - ⚠️ Only for development! Not for production!
5. Click **"Finish and Close"**

### Step 5: Get Connection String

1. Click **"Connect"** button on your cluster
2. Choose **"Connect your application"**
3. **Driver**: Node.js
4. **Version**: 5.5 or later
5. Copy the connection string:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
6. **Replace** `<username>` and `<password>` with your credentials:
   ```
   mongodb+srv://cyphermind_user:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

### Step 6: Update Your .env File

Open your `.env` file and update:

```env
# MongoDB Configuration
MONGODB_URI=mongodb+srv://cyphermind_user:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB_NAME=cyphermind

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRATION=24h

# Google Gemini API
GEMINI_API_KEY=AIzaSyBpIzvJ2F7IX3mMZtZEyJl0cgjqxBsW_DE

# Server Configuration
PORT=3000
NODE_ENV=development

# Frontend URLs (for CORS)
FRONTEND_URL=http://localhost:3001
```

⚠️ **Important**: 
- Replace `YOUR_PASSWORD` with your actual password
- Keep the `?retryWrites=true&w=majority` at the end
- No spaces in the connection string

### Step 7: Test Connection

Run this command to test the connection:

```bash
npm run test-connection
```

Or manually test:

```bash
node -e "const mongoose = require('mongoose'); require('dotenv').config(); mongoose.connect(process.env.MONGODB_URI).then(() => console.log('✅ Connected!')).catch(err => console.error('❌ Error:', err.message));"
```

---

## Step 8: Create Vector Search Index

### Option A: Using MongoDB Atlas UI (Recommended)

1. Go to your cluster in Atlas
2. Click **"Browse Collections"**
3. Click **"Create Database"**:
   - Database name: `cyphermind`
   - Collection name: `document_chunks`
4. Click on the `document_chunks` collection
5. Go to **"Search Indexes"** tab
6. Click **"Create Search Index"**
7. Choose **"Atlas Vector Search"**
8. Click **"Next"**
9. Use this JSON configuration:

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 3072,
      "similarity": "cosine"
    },
    {
      "type": "filter",
      "path": "metadata.clearance_level"
    }
  ]
}
```

10. Index name: `vector_index`
11. Click **"Create Search Index"**
12. Wait 1-2 minutes for index to build

### Option B: Using Script (After Connection Works)

```bash
npm run create-vector-index
```

---

## Step 9: Seed the Database

Once connected, populate with test data:

```bash
# Seed all data at once
npm run seed-all

# Or seed individually:
npm run seed-users      # Creates 2 test users
npm run seed-documents  # Creates test documents with embeddings
npm run seed-events     # Creates test security events
```

**Test Users Created**:
1. **Junior Employee**
   - Email: `junior@cyphermind.com`
   - Password: `junior123`
   - Clearance Level: 1

2. **Security Admin**
   - Email: `admin@cyphermind.com`
   - Password: `admin123`
   - Clearance Level: 3

---

## Step 10: Verify Setup

### Check Database in Atlas UI:
1. Go to **"Browse Collections"**
2. You should see:
   - `users` collection (2 documents)
   - `document_chunks` collection (multiple documents)
   - `security_events` collection (sample events)
   - `audit_logs` collection (empty initially)

### Check with MongoDB Compass:
1. Open MongoDB Compass
2. Click **"New Connection"**
3. Paste your connection string
4. Click **"Connect"**
5. Browse the `cyphermind` database

---

## Troubleshooting

### Error: "Authentication failed"
- Check username and password in connection string
- Make sure password is URL-encoded (no special characters issues)
- Verify user was created in Atlas

### Error: "IP not whitelisted"
- Go to Network Access in Atlas
- Add your current IP or use `0.0.0.0/0` for development

### Error: "Connection timeout"
- Check your internet connection
- Verify firewall isn't blocking MongoDB ports
- Try different region when creating cluster

### Error: "Vector search not available"
- Make sure you're using M0 or higher tier
- Vector search is available on free tier (M0)
- Check if index was created successfully

### Connection String Format Issues
- Make sure there are no spaces
- Password should be URL-encoded
- Format: `mongodb+srv://user:pass@cluster.mongodb.net/`

---

## Next Steps After Setup

Once MongoDB Atlas is connected:

1. **Run Tests**:
   ```bash
   npm test
   ```

2. **Start Backend**:
   ```bash
   npm run dev
   ```

3. **Start Frontend** (in another terminal):
   ```bash
   cd client
   npm start
   ```

4. **Test the System**:
   - Login at: http://localhost:3001
   - Use test credentials above
   - Try querying documents
   - Check SOC Dashboard (admin only)

---

## Security Best Practices

### For Development:
- ✅ Use `0.0.0.0/0` for IP whitelist (easy testing)
- ✅ Use simple passwords
- ✅ Keep credentials in `.env` file

### For Production:
- ⚠️ Whitelist only specific IPs
- ⚠️ Use strong, unique passwords
- ⚠️ Enable 2FA on Atlas account
- ⚠️ Use environment variables (never commit `.env`)
- ⚠️ Enable MongoDB encryption at rest
- ⚠️ Set up monitoring and alerts

---

## MongoDB Atlas Free Tier Limits

- **Storage**: 512 MB (plenty for testing)
- **RAM**: Shared
- **Connections**: 500 concurrent
- **Backup**: Not included (manual exports only)
- **Vector Search**: ✅ Included
- **Change Streams**: ✅ Included (replica set)

For this project, free tier is more than sufficient!

---

## Quick Reference

### Connection String Format:
```
mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>?retryWrites=true&w=majority
```

### Example:
```
mongodb+srv://cyphermind_user:MyP@ssw0rd@cluster0.abc123.mongodb.net/cyphermind?retryWrites=true&w=majority
```

### Collections Created:
- `users` - User accounts with clearance levels
- `document_chunks` - Documents with vector embeddings
- `security_events` - Security incidents and alerts
- `audit_logs` - Audit trail of all actions

---

## Need Help?

If you encounter any issues:
1. Check the troubleshooting section above
2. Verify your connection string format
3. Make sure IP is whitelisted
4. Check Atlas status page: https://status.mongodb.com/

Once you have the connection string, paste it here and I'll help you configure everything!
