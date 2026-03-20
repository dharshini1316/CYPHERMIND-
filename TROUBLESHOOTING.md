# CypherMIND - Troubleshooting Guide

## Common Terminal Errors and Fixes

### Error: "Cannot find module '@google/generative-ai'"

**Cause**: Dependencies not installed

**Fix**:
```bash
npm install
```

---

### Error: "MONGODB_URI is not defined" or "Environment validation failed"

**Cause**: Missing or incorrect `.env` file

**Fix**:
1. Create `.env` file in project root:
```bash
cp .env.example .env
```

2. Edit `.env` with your values:
```
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/cyphermind?retryWrites=true&w=majority
JWT_SECRET=your-secret-key-minimum-32-characters-long
JWT_EXPIRES_IN=24h
GEMINI_API_KEY=your-gemini-api-key-here
FRONTEND_URL=http://localhost:3000
```

---

### Error: "MongoServerError: bad auth" or "Authentication failed"

**Cause**: Incorrect MongoDB credentials

**Fix**:
1. Check MongoDB Atlas username/password
2. Verify connection string in `.env`
3. Ensure IP address is whitelisted in MongoDB Atlas:
   - Go to Network Access
   - Add your IP or use `0.0.0.0/0` for testing

---

### Error: "JWT_SECRET must be at least 32 characters"

**Cause**: JWT secret too short

**Fix**:
Update `.env`:
```
JWT_SECRET=this-is-a-very-long-secret-key-for-jwt-tokens-minimum-32-chars
```

---

### Error: "GEMINI_API_KEY is required"

**Cause**: Missing Gemini API key

**Fix**:
1. Get API key from https://makersuite.google.com/app/apikey
2. Add to `.env`:
```
GEMINI_API_KEY=your-api-key-here
```

---

### Error: "Cannot find name 'console'" or "Cannot find name 'process'"

**Cause**: TypeScript configuration issue (already fixed in tsconfig.json)

**Fix**: Already fixed - tsconfig.json includes "DOM" in lib array

---

### Error: "Port 3000 is already in use"

**Cause**: Another process using port 3000

**Fix**:
1. Kill the process:
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:3000 | xargs kill -9
```

2. Or change port in `.env`:
```
PORT=3001
```

---

### Error: "vector search index not found" when querying

**Cause**: Vector search index not created in MongoDB Atlas

**Fix**:
1. Go to MongoDB Atlas → Your Cluster → Search
2. Click "Create Search Index"
3. Choose "JSON Editor"
4. Use this configuration:
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
5. Name: `vector_index`
6. Database: `cyphermind` (or your database name)
7. Collection: `document_chunks`

---

### Error: "No documents found" when seeding

**Cause**: Gemini API error or network issue

**Fix**:
1. Check Gemini API key is valid
2. Check internet connection
3. Check Gemini API quota/billing
4. Try seeding again:
```bash
npm run seed:documents
```

---

### Error: "User already exists" when seeding

**Not an error** - Script skips if users exist

**To recreate users**:
1. Delete users from MongoDB Atlas
2. Run seed again:
```bash
npm run seed:users
```

---

### Error: TypeScript compilation errors

**Cause**: Missing type definitions

**Fix**:
```bash
npm install --save-dev @types/node @types/express @types/bcrypt @types/jsonwebtoken @types/cors @types/ws @types/uuid
```

---

### Error: "Cannot start server" or "Failed to connect to MongoDB"

**Cause**: MongoDB connection issue

**Fix**:
1. Verify MongoDB Atlas cluster is running
2. Check connection string format:
```
mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>?retryWrites=true&w=majority
```
3. Replace `<username>`, `<password>`, `<cluster>`, `<database>` with actual values
4. Ensure password doesn't contain special characters (or URL encode them)

---

### Error: "WebSocket connection failed"

**Cause**: Server not running or wrong URL

**Fix**:
1. Ensure server is running: `npm run dev`
2. Check WebSocket URL: `ws://localhost:3000/ws/events?token=<jwt>`
3. Ensure JWT token is valid (not expired)
4. Ensure user has clearance level 3 (admin)

---

### Error: "403 Forbidden" when accessing admin endpoints

**Cause**: User doesn't have sufficient clearance

**Fix**:
1. Login as admin user:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@cyphermind.com","password":"Admin123!"}'
```
2. Use the returned token for admin endpoints

---

### Error: "401 Unauthorized" on protected routes

**Cause**: Missing or invalid JWT token

**Fix**:
1. Login first to get token
2. Include token in Authorization header:
```bash
curl http://localhost:3000/api/query \
  -H "Authorization: Bearer <your-jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"test"}'
```

---

## Quick Fixes Checklist

Before running the server, ensure:

- [ ] `npm install` completed successfully
- [ ] `.env` file exists with all required variables
- [ ] MongoDB Atlas cluster is running
- [ ] IP address whitelisted in MongoDB Atlas
- [ ] Gemini API key is valid
- [ ] JWT_SECRET is at least 32 characters
- [ ] Port 3000 is available (or changed in .env)

---

## Testing the Setup

Run this command to test all components:
```bash
npm run test:system
```

This will verify:
- ✅ Database connection
- ✅ Authentication
- ✅ Guardian
- ✅ Vector search
- ✅ Scrubber
- ✅ RAG pipeline

---

## Getting Help

If you're still having issues:

1. **Check the logs**: Look at the terminal output for specific error messages
2. **Verify environment**: Run `npm run test:system` to see which component is failing
3. **Check MongoDB Atlas**: Ensure cluster is running and accessible
4. **Check Gemini API**: Verify API key and quota
5. **Check network**: Ensure firewall isn't blocking connections

---

## Common Setup Steps

### First Time Setup

```bash
# 1. Install dependencies
npm install

# 2. Create .env file
cp .env.example .env
# Edit .env with your values

# 3. Seed test data
npm run seed

# 4. Create vector index in MongoDB Atlas
# (See instructions above)

# 5. Start server
npm run dev

# 6. Test in another terminal
npm run test:system
```

### Daily Development

```bash
# Start server
npm run dev

# In another terminal, test
curl http://localhost:3000/health
```

---

## Environment Variables Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| PORT | Yes | Server port | 3000 |
| NODE_ENV | Yes | Environment | development |
| MONGODB_URI | Yes | MongoDB connection string | mongodb+srv://... |
| JWT_SECRET | Yes | JWT signing secret (32+ chars) | your-secret-key... |
| JWT_EXPIRES_IN | Yes | Token expiration | 24h |
| GEMINI_API_KEY | Yes | Google Gemini API key | AIza... |
| FRONTEND_URL | Yes | CORS allowed origin | http://localhost:3000 |

---

## Still Having Issues?

Share the exact error message from your terminal, and I can provide specific fixes!
