# Fix Vercel Root Directory - CRITICAL

## The Problem

You're getting 404 on `/api/proxy/*` routes because **Vercel's Root Directory is NOT set to `frontend`**.

Your project structure:
```
/
├── backend/
├── frontend/          ← Next.js app is HERE
│   ├── src/
│   │   └── app/
│   │       └── api/
│   │           └── proxy/
│   └── package.json
└── docker-compose.yml
```

Vercel is looking in `/` (root) but your Next.js app is in `/frontend`.

## Solution: Set Root Directory

### Option 1: In Vercel Dashboard (Easiest)

1. **Go to Vercel Dashboard**
   - https://vercel.com
   - Select your project

2. **Go to Settings**
   - Click "Settings" tab
   - Click "General" in sidebar

3. **Set Root Directory**
   - Scroll down to "Root Directory"
   - Click "Edit"
   - Enter: **`frontend`**
   - Click "Save"

4. **Redeploy**
   - Go to "Deployments" tab
   - Click "..." on latest deployment
   - Click "Redeploy"
   - **UNCHECK** "Use existing Build Cache"
   - Click "Redeploy"

5. **Wait for deployment** (2-3 minutes)

6. **Test**
   - Visit: `https://shop.sankaretech.com/api/proxy/test`
   - Should return JSON, not 404

### Option 2: Re-import Project (If Option 1 Doesn't Work)

If setting Root Directory doesn't work, re-import the project:

1. **Delete Current Project**
   - Vercel Dashboard → Your Project
   - Settings → General → Delete Project
   - Confirm deletion

2. **Re-import from GitHub**
   - Vercel Dashboard → "Add New Project"
   - Import your repository
   - **IMPORTANT:** When asked for Root Directory, enter: **`frontend`**
   - Deploy

3. **Configure Domain**
   - After deployment, go to Settings → Domains
   - Add: `shop.sankaretech.com`
   - Follow DNS instructions

## Verification

After setting root directory and redeploying:

### Test 1: Proxy Test Endpoint
```bash
curl https://shop.sankaretech.com/api/proxy/test
```

**Expected:**
```json
{
  "status": "ok",
  "message": "Proxy route is working",
  "backendUrl": "http://89.116.229.113:3001/api"
}
```

**If still 404:** Root directory not set correctly

### Test 2: Products Endpoint
```bash
curl https://shop.sankaretech.com/api/proxy/products?limit=1
```

**Expected:** JSON with products

### Test 3: Featured Products
```bash
curl https://shop.sankaretech.com/api/proxy/products/featured?limit=1
```

**Expected:** JSON with featured products

### Test 4: Homepage
Visit: `https://shop.sankaretech.com`

**Expected:**
- Homepage loads
- Products display
- No 404 errors in console

## Why This Happens

Vercel needs to know where your Next.js app is located. Without setting the root directory:

- ❌ Vercel looks for `package.json` in `/`
- ❌ Vercel looks for `src/app/` in `/`
- ❌ Can't find Next.js app
- ❌ Routes return 404

With root directory set to `frontend`:

- ✅ Vercel looks for `package.json` in `/frontend`
- ✅ Vercel looks for `src/app/` in `/frontend`
- ✅ Finds Next.js app
- ✅ Routes work correctly

## Common Mistakes

### Mistake 1: Not Setting Root Directory
**Symptom:** All routes return 404

**Fix:** Set Root Directory to `frontend` in Vercel settings

### Mistake 2: Typo in Root Directory
**Symptom:** Build fails or 404

**Fix:** Make sure it's exactly `frontend` (lowercase, no trailing slash)

### Mistake 3: Not Redeploying After Change
**Symptom:** Still 404 after setting root directory

**Fix:** Redeploy without cache after changing settings

### Mistake 4: Using Build Cache
**Symptom:** Old version still showing

**Fix:** Redeploy with "Use existing Build Cache" UNCHECKED

## Screenshots Guide

### Step 1: Go to Settings
![Settings Tab](Look for "Settings" tab at top)

### Step 2: Find Root Directory
![Root Directory](Scroll down to "Root Directory" section)

### Step 3: Edit and Set to "frontend"
![Edit](Click "Edit" button, enter "frontend", click "Save")

### Step 4: Redeploy
![Redeploy](Go to Deployments, click "...", click "Redeploy")

## Alternative: Check Build Logs

If you're not sure if root directory is set:

1. Go to Deployments
2. Click on latest deployment
3. View build logs
4. Look for "Building..." section
5. Should say: "Building from frontend/"

If it says "Building from /" then root directory is NOT set.

## Still Not Working?

### Check 1: Verify Files Exist in GitHub

Go to your GitHub repository:
```
https://github.com/YOUR_USERNAME/YOUR_REPO/tree/main/frontend/src/app/api/proxy
```

Should see:
- `[...path]/route.ts`
- `test/route.ts`

If files are missing, they weren't pushed.

### Check 2: Test Locally

```bash
cd frontend
npm install
npm run dev
```

Visit: `http://localhost:3000/api/proxy/test`

If this works locally but not on Vercel, it's definitely a root directory issue.

### Check 3: Check Vercel Function Logs

1. Vercel Dashboard → Deployments
2. Click latest deployment
3. Go to "Functions" tab
4. Look for `/api/proxy/[...path]`

If you don't see this function, the route wasn't deployed.

## Summary

**The fix is simple:**

1. ✅ Set Root Directory to `frontend` in Vercel settings
2. ✅ Redeploy without cache
3. ✅ Test `/api/proxy/test` endpoint

**This is the #1 cause of 404 errors in monorepo Next.js deployments!**

---

## Quick Fix Checklist

- [ ] Go to Vercel Dashboard
- [ ] Settings → General
- [ ] Root Directory → Edit → Enter `frontend` → Save
- [ ] Deployments → ... → Redeploy (without cache)
- [ ] Wait 2-3 minutes
- [ ] Test: `https://shop.sankaretech.com/api/proxy/test`
- [ ] Should return JSON, not 404

**If still 404 after this, re-import the project with root directory set from the start.**
