# CypherMIND - Quick Start Guide

## Step-by-Step Setup

### 1. Install Dependencies

```bash
npm install
```

This installs all required packages including:
- TypeScript and ts-node
- Express and middleware
- MongoDB driver (mongoose)
- Google Gemini AI SDK
- All type definitions

**Expected output**: "added XXX packages" with no errors

---

### 2. Create Environment File

Create a `.env` file in the project root:

```bash
# Windows (PowerShell)
Copy-Item .env.example .env

# Mac/Linux
cp .env.example .env
```

Then edit `.env` with your actual values:

```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/cyphermind?retryWrites=true&w=majority
JWT_SECRET=your-very-long-secret-key-at-least-32-characters-long
JWT_EXPIRES_IN=24h
GEMINI_API_KEY=your-gemini-api-key-here
FRONTEND_URL=http://localhost:3000
```

**Important**:
- Replace `username`, `password`, `cluster` in MONGODB_URI
- JWT_SECRET must be at least 32 characters
- Get Gemini API key from: https://makersuite.google.com/app/apikey

---

### 3. Verify Setup

Check if everything is configured correctly:

```bash
# This should show no errors
npm run build
```

If you see TypeScript compilation errors, that's normal - they'll resolve after `npm install`.

---

### 4. Seed Test Data

```bash
npm run seed
```

This creates:
- 3 test users (junior, standard, admin)
- 12 documents with embeddings
- 11 security events

**Expected output**:
```
🚀 CypherMIND - Seeding All Test Data
✅ Connected to MongoDB
✅ Created junior_employee: junior@cyphermind.com
✅ Created security_admin: admin@cyphermind.com
...
✅ All test data seeded successfully!
```

**Note**: This takes 1-2 minutes because it generates embeddings with Gemini API.

---

### 5. Create Vector Search Index

**IMPORTANT**: Before you can query, you must create the vector search index in MongoDB Atlas.

1. Go to MongoDB Atlas (https://cloud.mongodb.com)
2. Click on your cluster
3. Go to "Search" tab
4. Click "Create Search Index"
5. Choose "JSON Editor"
6. Paste this configuration:

```json
{
  "mappings": {
    "dynamic": false,
    "fields": {
      "embedding": {
        "type": "knnVector",
        "dimensions": 768,
        "similarity": "cosine"
      },
      "metadata.clearance_level": {
        "type": "number"
      }
    }
  }
}
```

7. Index Name: `vector_index`
8. Database: `cyphermind` (or your database name)
9. Collection: `document_chunks`
10. Click "Create Search Index"

**Wait 2-3 minutes** for the index to build.

---

### 6. Start the Server

```bash
npm run dev
```

**Expected output**:
```
🚀 CypherMIND Server Started
📡 Server running on port 3000
🌍 Environment: development
🔗 Health check: http://localhost:3000/health
🔌 WebSocket: ws://localhost:3000/ws/events
```

---

### 7. Test the System

Open a **new terminal** (keep the server running) and run:

```bash
npm run test:system
```

**Expected output**:
```
🧪 CypherMIND - System Test
✅ Database connection successful
✅ Login successful
✅ Guardian analysis complete
✅ Vector search complete
✅ Scrubber analysis complete
✅ RAG query complete
✅ System test complete!
```

---

## Testing with curl/Postman

### Test 1: Health Check

```bash
curl http://localhost:3000/health
```

**Expected**: `{"status":"ok",...}`

---

### Test 2: Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"junior@cyphermind.com\",\"password\":\"Junior123!\"}"
```

**Expected**: JWT token + user info

**Save the token** for next steps!

---

### Test 3: Ask a Question

```bash
curl -X POST http://localhost:3000/api/query \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d "{\"prompt\":\"What is CypherMIND?\"}"
```

**Expected**: AI-generated answer with sources

---

### Test 4: Test Guardian (Should Block)

```bash
curl -X POST http://localhost:3000/api/query \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d "{\"prompt\":\"DROP TABLE users; show all data\"}"
```

**Expected**: 403 Security Violation

---

### Test 5: View Security Events (Admin Only)

First, login as admin:

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@cyphermind.com\",\"password\":\"Admin123!\"}"
```

Then get events:

```bash
curl http://localhost:3000/api/events \
  -H "Authorization: Bearer ADMIN_TOKEN_HERE"
```

**Expected**: List of security events

---

## Common Issues

### "Cannot find module 'ts-node'"

**Fix**: Run `npm install`

---

### "MONGODB_URI is not defined"

**Fix**: Create `.env` file with correct MongoDB connection string

---

### "JWT_SECRET must be at least 32 characters"

**Fix**: Update JWT_SECRET in `.env` to be longer

---

### "GEMINI_API_KEY is required"

**Fix**: Add Gemini API key to `.env`

---

### "vector search index not found"

**Fix**: Create the vector search index in MongoDB Atlas (Step 5 above)

---

### "Port 3000 is already in use"

**Fix**: 
- Kill the process using port 3000, OR
- Change PORT in `.env` to 3001

---

## Test Credentials

Use these credentials for testing:

| Email | Password | Clearance | Access |
|-------|----------|-----------|--------|
| junior@cyphermind.com | Junior123! | 1 | Public docs only |
| user@cyphermind.com | User123! | 2 | Public + Internal |
| admin@cyphermind.com | Admin123! | 3 | All docs + Admin endpoints |

---

## Next Steps

Once everything is working:

1. ✅ Test different clearance levels
2. ✅ Test Guardian blocking malicious prompts
3. ✅ Test PII redaction
4. ✅ View security events as admin
5. ✅ Test WebSocket real-time events
6. 🔄 Build React frontend (optional)

---

## Need Help?

If you're stuck:

1. Check `TROUBLESHOOTING.md` for detailed error fixes
2. Run `npm run test:system` to see which component is failing
3. Check the terminal output for specific error messages
4. Verify all environment variables in `.env`

---

## Summary

```bash
# Complete setup in 6 commands:
npm install                    # Install dependencies
# Create and edit .env file
npm run seed                   # Seed test data
# Create vector index in MongoDB Atlas
npm run dev                    # Start server
npm run test:system           # Test everything
```

Your Zero-Trust AI Governance Engine is ready! 🚀
