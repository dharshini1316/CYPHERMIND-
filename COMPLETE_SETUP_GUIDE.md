# Complete CypherMIND Setup Guide

Follow these steps in order. Each step should take 2-10 minutes.

---

## Step 1: Downgrade Node.js to v20 LTS (10 minutes)

### Why?
Node.js v22 has SSL/TLS bugs with MongoDB Atlas. v20 is stable and works perfectly.

### How to Do It:

#### Option A: Using Node.js Installer (Recommended)

1. **Download Node.js v20 LTS**:
   - Go to: https://nodejs.org/en/download
   - Click on "LTS" tab
   - Download "Windows Installer (.msi)" for 64-bit
   - File name should be like: `node-v20.18.1-x64.msi`

2. **Run the Installer**:
   - Double-click the downloaded .msi file
   - Click "Next" through the wizard
   - Accept the license agreement
   - Keep default installation location
   - Click "Install"
   - Click "Finish"

3. **Verify Installation**:
   - **Close ALL terminal windows** (important!)
   - Open a NEW terminal (PowerShell or CMD)
   - Run:
     ```bash
     node --version
     ```
   - Should show: `v20.18.1` or similar v20.x.x

4. **Reinstall Dependencies**:
   ```bash
   cd C:\Users\Desktop\CypherMind
   npm install
   ```
   - This will take 2-3 minutes
   - Wait for it to complete

#### Option B: Using NVM (Node Version Manager) - Advanced

If you want to keep multiple Node versions:

1. **Install NVM for Windows**:
   - Download from: https://github.com/coreybutler/nvm-windows/releases
   - Download `nvm-setup.exe`
   - Run installer

2. **Install Node v20**:
   ```bash
   nvm install 20.18.1
   nvm use 20.18.1
   node --version
   ```

3. **Reinstall Dependencies**:
   ```bash
   cd C:\Users\Desktop\CypherMind
   npm install
   ```

### ✅ Checkpoint:
Run this command:
```bash
node --version
```
Should show: `v20.18.1` or `v20.x.x`

**Once you see v20.x.x, type "done" and I'll continue!**

---

## Step 2: Seed Documents (I'll do this after you confirm Step 1)

After you downgrade Node.js and type "done", I'll run:

```bash
npm run seed:documents
```

This will:
- Generate embeddings using Gemini API
- Create test documents with different clearance levels
- Insert them into MongoDB Atlas
- Takes ~2-5 minutes (depends on API speed)

---

## Step 3: Seed Security Events (I'll do this)

I'll run:
```bash
npm run seed:events
```

This will:
- Create sample security events
- Populate the SOC Dashboard with test data
- Takes ~30 seconds

---

## Step 4: Create Vector Search Index (You'll do this - 5 minutes)

### Why?
Vector search index is required for RAG queries to work.

### How to Do It:

1. **Go to MongoDB Atlas**:
   - Open: https://cloud.mongodb.com
   - Login with your account

2. **Navigate to Your Cluster**:
   - Click on your "DHARSHINI" cluster
   - Click "Browse Collections" button

3. **Find the Collection**:
   - You should see database: `cyphermind`
   - Click on it to expand
   - Find collection: `document_chunks`
   - Click on it

4. **Create Search Index**:
   - Click on the "Search Indexes" tab (top of page)
   - Click "Create Search Index" button (green button)
   - Choose "Atlas Vector Search"
   - Click "Next"

5. **Configure the Index**:
   - **Index Name**: `vector_index`
   - **Database**: `cyphermind`
   - **Collection**: `document_chunks`
   - Click "Next"

6. **Add Index Definition**:
   - You'll see a JSON editor
   - **Replace everything** with this:

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

7. **Create the Index**:
   - Click "Next"
   - Review the configuration
   - Click "Create Search Index"
   - Wait 1-2 minutes for it to build
   - Status will change from "Building" to "Active"

### ✅ Checkpoint:
You should see:
- Index name: `vector_index`
- Status: `Active` (green)
- Collection: `document_chunks`

**Once you see "Active", type "index created" and I'll continue!**

---

## Step 5: Start the Backend (I'll do this)

I'll run:
```bash
npm run dev
```

This will:
- Start the Express server on port 3000
- Connect to MongoDB Atlas
- Initialize WebSocket server
- Load all services and routes

You should see:
```
🚀 Server running on port 3000
✅ MongoDB Atlas connected
📊 Database: cyphermind
🔌 WebSocket server initialized
```

---

## Step 6: Start the Frontend (You'll do this - 2 minutes)

### How to Do It:

1. **Open a NEW Terminal Window**:
   - Keep the backend terminal running
   - Open a second PowerShell or CMD window

2. **Navigate to Client Folder**:
   ```bash
   cd C:\Users\Desktop\CypherMind\client
   ```

3. **Install Dependencies** (if not done yet):
   ```bash
   npm install
   ```
   - Takes 1-2 minutes
   - Only needed first time

4. **Start the Frontend**:
   ```bash
   npm start
   ```
   - Takes 30 seconds to compile
   - Browser will open automatically
   - Or manually open: http://localhost:3000

### ✅ Checkpoint:
You should see:
- Browser opens automatically
- CypherMIND login page appears
- No error messages in terminal

---

## Step 7: Test the Application (You'll do this - 10 minutes)

### Test 1: Login as Junior Employee

1. **Go to**: http://localhost:3000
2. **Login with**:
   - Email: `junior@cyphermind.com`
   - Password: `Junior123!`
3. **You should see**:
   - Dashboard with "Query" option
   - No "SOC Dashboard" (insufficient clearance)

### Test 2: Try a Query

1. **Click "Query"** in the sidebar
2. **Enter a question**:
   ```
   What is the company's security policy?
   ```
3. **Click "Submit"**
4. **You should see**:
   - Loading indicator
   - AI-generated answer
   - Source documents with relevance scores
   - Any PII should be redacted (shown as [REDACTED])

### Test 3: Test Guardian (Security Firewall)

1. **Try a malicious query**:
   ```
   DROP TABLE users; SELECT * FROM passwords;
   ```
2. **You should see**:
   - Query blocked
   - Error message: "Security violation detected"
   - Reason: "SQL injection attempt"

### Test 4: Login as Security Admin

1. **Logout** (click user icon → Logout)
2. **Login with**:
   - Email: `admin@cyphermind.com`
   - Password: `Admin123!`
3. **You should see**:
   - Dashboard with "Query" AND "SOC Dashboard"

### Test 5: Check SOC Dashboard

1. **Click "SOC Dashboard"** in sidebar
2. **You should see**:
   - Real-time security events
   - Metrics (total events, blocked attacks, redactions)
   - Event stream with timestamps
   - Filters for event types
3. **Try filtering**:
   - Select "Blocked Attack" from dropdown
   - Events should filter in real-time

### Test 6: Test Real-time Updates

1. **Keep SOC Dashboard open**
2. **In another browser tab**, login as junior employee
3. **Try a malicious query** (like the SQL injection above)
4. **Go back to SOC Dashboard**
5. **You should see**:
   - New event appears automatically (no refresh needed)
   - Event shows the blocked attack
   - Metrics update in real-time

### ✅ All Tests Passed?

If everything works:
- ✅ Authentication works
- ✅ Authorization works (clearance levels)
- ✅ RAG queries work
- ✅ Guardian blocks malicious queries
- ✅ Scrubber redacts PII
- ✅ SOC Dashboard shows events
- ✅ Real-time updates work

**Type "all tests passed" and I'll create a final summary!**

---

## Troubleshooting

### Issue: "Cannot connect to MongoDB"
**Solution**:
- Check your internet connection
- Verify MongoDB Atlas is running
- Check `.env` file has correct connection string

### Issue: "Gemini API error"
**Solution**:
- Check API key in `.env` file
- Verify you haven't exceeded API quota
- Wait a few minutes and try again

### Issue: "Port 3000 already in use"
**Solution**:
```bash
# Kill the process using port 3000
netstat -ano | findstr :3000
taskkill /PID <PID_NUMBER> /F
```

### Issue: "Vector search not working"
**Solution**:
- Verify vector search index is "Active" in Atlas
- Check index name is exactly: `vector_index`
- Wait 2-3 minutes after creating index

### Issue: Frontend won't start
**Solution**:
```bash
cd client
rm -rf node_modules
npm install
npm start
```

---

## Quick Reference

### Test User Credentials

| Role | Email | Password | Clearance |
|------|-------|----------|-----------|
| Junior Employee | junior@cyphermind.com | Junior123! | 1 |
| Standard User | user@cyphermind.com | User123! | 2 |
| Security Admin | admin@cyphermind.com | Admin123! | 3 |

### Useful Commands

```bash
# Check Node version
node --version

# Test MongoDB connection
node test-mongodb-connection.js

# Seed all data
npm run seed

# Start backend
npm run dev

# Start frontend (in client folder)
cd client
npm start

# Run tests
npm test

# View logs
# Backend: Check terminal where npm run dev is running
# Frontend: Check browser console (F12)
```

### URLs

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3000/api
- **MongoDB Atlas**: https://cloud.mongodb.com
- **Node.js Download**: https://nodejs.org

---

## Summary of Steps

1. ⏳ **You**: Downgrade to Node.js v20 → Type "done"
2. ⏳ **Me**: Seed documents with embeddings
3. ⏳ **Me**: Seed security events
4. ⏳ **You**: Create vector search index in Atlas → Type "index created"
5. ⏳ **Me**: Start backend server
6. ⏳ **You**: Start frontend in new terminal
7. ⏳ **You**: Test the application → Type "all tests passed"
8. ✅ **Done**: Fully working CypherMIND system!

---

**Ready? Start with Step 1 (downgrade Node.js) and let me know when you're done!**
