# How to Run CypherMIND

## Prerequisites
Make sure MongoDB Atlas is:
1. Running (not paused)
2. Your IP is whitelisted in Network Access (or use 0.0.0.0/0 for all IPs)
3. User `CypherMind` exists with correct password in Database Access

## Step 1: Start Backend
Open a terminal in the project root:
```bash
npm run dev
```
Wait for: `✅ MongoDB Atlas connected successfully`
Backend will be on `http://localhost:3000`

## Step 2: Start Frontend (New Terminal)
Open a second terminal:
```bash
cd client
npm start
```
Frontend will start on `http://localhost:3003`

## Step 3: Login
Open browser: `http://localhost:3003`

**Test Accounts:**
- Junior: `junior@cyphermind.com` / `Junior123!`
- Standard: `user@cyphermind.com` / `User123!`
- Admin: `admin@cyphermind.com` / `Admin123!`

## First Time Setup?
If database is empty, seed it first:
```bash
npm run seed:all
```

## Troubleshooting

### "Not allowed by CORS" Error
- Make sure backend is running on port 3000
- Make sure frontend is running on port 3003
- Restart both servers if you changed ports

### Backend Won't Start
- Check MongoDB Atlas is running (not paused)
- Verify IP is whitelisted in Atlas Network Access
- Check credentials in `.env` file match Atlas

### Frontend Won't Start
- Make sure you're in the `client` folder
- Run `npm install` if packages are missing
- Check that port 3003 is not already in use

### Database Empty
Run: `npm run seed:all` to create test users and documents
