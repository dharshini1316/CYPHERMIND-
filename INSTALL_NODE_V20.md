# Install Node.js v20 LTS - Step by Step Guide

## Step 1: Download Node.js v20 LTS (2 minutes)

### 1.1 Open Your Browser
- Open any browser (Chrome, Edge, Firefox)

### 1.2 Go to Node.js Website
- Type in address bar: **https://nodejs.org/en/download**
- Press Enter

### 1.3 Download the Installer
You'll see the download page. Look for:

**Option 1: Direct Download (Easiest)**
- Look for a big green button that says **"20.18.1 LTS"** or similar
- Click on it
- OR scroll down to find **"Windows Installer (.msi)"**
- Choose **"64-bit"** (most common)
- File name will be: `node-v20.18.1-x64.msi`
- Click to download

**Option 2: If you don't see LTS button**
- Scroll down the page
- Find section: **"Previous Releases"** or **"Other Downloads"**
- Look for **"v20.18.1 LTS"**
- Click **"Windows Installer (.msi) 64-bit"**

### 1.4 Wait for Download
- File size: ~30 MB
- Should take 30 seconds to 2 minutes depending on your internet
- File will be in your Downloads folder

---

## Step 2: Install Node.js v20 (5 minutes)

### 2.1 Find the Downloaded File
- Open **File Explorer** (Windows key + E)
- Go to **Downloads** folder
- Look for: `node-v20.18.1-x64.msi`

### 2.2 Run the Installer
- **Double-click** the .msi file
- If Windows asks "Do you want to allow this app to make changes?", click **Yes**

### 2.3 Follow the Installation Wizard

**Screen 1: Welcome**
- Click **Next**

**Screen 2: License Agreement**
- Check the box: "I accept the terms in the License Agreement"
- Click **Next**

**Screen 3: Destination Folder**
- Keep the default location: `C:\Program Files\nodejs\`
- Click **Next**

**Screen 4: Custom Setup**
- Keep all default options checked:
  - ✅ Node.js runtime
  - ✅ npm package manager
  - ✅ Online documentation shortcuts
  - ✅ Add to PATH
- Click **Next**

**Screen 5: Tools for Native Modules**
- You'll see: "Automatically install the necessary tools..."
- **UNCHECK this box** (we don't need it)
- Click **Next**

**Screen 6: Ready to Install**
- Click **Install**
- Wait 1-2 minutes (progress bar will show)

**Screen 7: Completed**
- Click **Finish**

---

## Step 3: Verify Installation (1 minute)

### 3.1 Close ALL Terminal Windows
**IMPORTANT**: You must close all PowerShell/CMD windows for the new Node version to work!

- Close any open PowerShell windows
- Close any open CMD windows
- Close any open terminals in VS Code

### 3.2 Open a NEW Terminal
- Press **Windows key**
- Type: **PowerShell**
- Click on **Windows PowerShell** (or right-click → Run as Administrator)

### 3.3 Check Node Version
In the new PowerShell window, type:
```bash
node --version
```
Press Enter

**Expected Output**:
```
v20.18.1
```
or
```
v20.18.0
```

**If you see v20.x.x - SUCCESS! ✅**

**If you still see v22.x.x**:
- Close PowerShell completely
- Open a NEW PowerShell window
- Try again

### 3.4 Check npm Version
Type:
```bash
npm --version
```
Press Enter

**Expected Output**:
```
10.8.2
```
or similar (any version is fine)

---

## Step 4: Reinstall Project Dependencies (3 minutes)

### 4.1 Navigate to Your Project
In PowerShell, type:
```bash
cd C:\Users\Desktop\CypherMind
```
Press Enter

### 4.2 Delete Old node_modules (Optional but Recommended)
Type:
```bash
Remove-Item -Recurse -Force node_modules
```
Press Enter
- This removes old dependencies compiled for Node v22
- Takes 30 seconds

### 4.3 Reinstall Dependencies
Type:
```bash
npm install
```
Press Enter

**What you'll see**:
```
npm WARN deprecated ...
added 1234 packages in 2m
```

**Wait for it to complete** (2-3 minutes)

### 4.4 Verify Installation
Type:
```bash
node --version
```
Should show: `v20.18.1`

---

## Step 5: Test MongoDB Connection (30 seconds)

Type:
```bash
node test-mongodb-connection.js
```
Press Enter

**Expected Output**:
```
🔍 Testing MongoDB Atlas connection...
✅ Successfully connected to MongoDB Atlas!
Database: cyphermind
📁 Collections:
   - users: 3 documents
✅ All checks passed!
```

**If you see this - PERFECT! ✅**

---

## Troubleshooting

### Issue: "node is not recognized"
**Solution**:
1. Close PowerShell completely
2. Open a NEW PowerShell window
3. Try again

If still not working:
1. Restart your computer
2. Open PowerShell
3. Try `node --version` again

### Issue: Still shows v22.x.x
**Solution**:
1. Uninstall Node.js v22:
   - Windows Settings → Apps → Apps & features
   - Search for "Node.js"
   - Click → Uninstall
2. Restart computer
3. Install Node.js v20 again (Step 2)

### Issue: npm install fails
**Solution**:
```bash
# Clear npm cache
npm cache clean --force

# Try again
npm install
```

### Issue: Permission denied
**Solution**:
- Close PowerShell
- Right-click PowerShell → Run as Administrator
- Navigate to project: `cd C:\Users\Desktop\CypherMind`
- Try `npm install` again

---

## Quick Checklist

Before moving to next step, verify:

- [ ] Downloaded `node-v20.18.1-x64.msi`
- [ ] Ran the installer
- [ ] Closed all old terminal windows
- [ ] Opened NEW PowerShell
- [ ] `node --version` shows v20.x.x
- [ ] `npm --version` shows a version number
- [ ] Navigated to project folder
- [ ] Ran `npm install` successfully
- [ ] `node test-mongodb-connection.js` works

---

## What's Next?

Once you see `v20.18.1` when you run `node --version`, type here:

**"done"**

And I'll continue with:
1. Seeding documents
2. Seeding events  
3. Creating vector search index
4. Starting the application

---

## Visual Guide Summary

```
1. Download
   └─ nodejs.org/en/download
      └─ node-v20.18.1-x64.msi

2. Install
   └─ Double-click .msi
      └─ Next → Next → Install → Finish

3. Verify
   └─ Close ALL terminals
      └─ Open NEW PowerShell
         └─ node --version
            └─ Should show: v20.18.1 ✅

4. Reinstall
   └─ cd C:\Users\Desktop\CypherMind
      └─ npm install
         └─ Wait 2-3 minutes ✅

5. Test
   └─ node test-mongodb-connection.js
      └─ Should connect ✅
```

---

**Ready? Start with Step 1 and let me know when you reach Step 5!**
