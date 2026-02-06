# ⚠️ ACTION REQUIRED - Fix Vercel Root Directory

## The Issue

Your Vercel deployment is returning 404 on `/api/proxy/*` routes because **Root Directory is NOT set to `frontend`**.

## What You Need to Do NOW

### Step 1: Go to Vercel Dashboard

Visit: https://vercel.com

### Step 2: Open Your Project Settings

1. Click on your project (shop.sankaretech.com)
2. Click "Settings" tab
3. Click "General" in the left sidebar

### Step 3: Set Root Directory

1. Scroll down to find "Root Directory" section
2. Click "Edit" button
3. Enter exactly: **`frontend`** (no quotes, lowercase)
4. Click "Save"

### Step 4: Redeploy

1. Go to "Deployments" tab
2. Find the latest deployment
3. Click the "..." (three dots) button
4. Click "Redeploy"
5. **IMPORTANT:** UNCHECK "Use existing Build Cache"
6. Click "Redeploy" button

### Step 5: Wait

- Deployment takes 2-3 minutes
- Watch the progress in Vercel dashboard
- Wait for "Ready" status

### Step 6: Test

Visit this URL in your browser:
```
https://shop.sankaretech.com/api/proxy/test
```

**Expected Result:**
```json
{
  "status": "ok",
  "message": "Proxy route is working",
  "backendUrl": "http://89.116.229.113:3001/api"
}
```

**If you see this JSON:** ✅ SUCCESS! The proxy is working!

**If you still see 404:** ❌ Root directory not set correctly, try again or re-import project

## Alternative: Re-import Project

If setting root directory doesn't work:

### Step 1: Delete Current Project

1. Vercel Dashboard → Your Project
2. Settings → General → Scroll to bottom
3. Click "Delete Project"
4. Confirm deletion

### Step 2: Re-import from GitHub

1. Vercel Dashboard → Click "Add New Project"
2. Click "Import" next to your GitHub repository
3. **CRITICAL:** In "Configure Project" screen:
   - Find "Root Directory" field
   - Click "Edit"
   - Enter: **`frontend`**
   - Click "Continue"
4. Add environment variable (optional):
   - Name: `BACKEND_API_URL`
   - Value: `http://89.116.229.113:3001/api`
5. Click "Deploy"

### Step 3: Configure Domain

After deployment:
1. Go to Settings → Domains
2. Add: `shop.sankaretech.com`
3. Follow DNS configuration instructions

### Step 4: Test

Visit: `https://shop.sankaretech.com/api/proxy/test`

Should return JSON!

## Why This Is Happening

Your project structure:
```
/                          ← Vercel is looking HERE (wrong!)
├── backend/
├── frontend/              ← Next.js app is HERE (correct!)
│   ├── src/
│   │   └── app/
│   │       └── api/
│   │           └── proxy/  ← This is where the routes are
│   └── package.json
└── docker-compose.yml
```

Without setting root directory to `frontend`, Vercel can't find your Next.js app!

## Visual Guide

```
❌ WRONG (Current):
Vercel looks in: /
Next.js app is in: /frontend
Result: 404 on all routes

✅ CORRECT (After fix):
Vercel looks in: /frontend
Next.js app is in: /frontend
Result: Routes work!
```

## Verification Steps

After fixing, verify these URLs work:

1. ✅ `https://shop.sankaretech.com/api/proxy/test`
   - Returns JSON

2. ✅ `https://shop.sankaretech.com/api/proxy/products?limit=1`
   - Returns products

3. ✅ `https://shop.sankaretech.com/api/proxy/products/featured?limit=1`
   - Returns featured products

4. ✅ `https://shop.sankaretech.com`
   - Homepage loads with products
   - No errors in console

## Need Help?

See detailed guide: `VERCEL_ROOT_DIRECTORY_FIX.md`

## Summary

🎯 **Action:** Set Root Directory to `frontend` in Vercel settings
⏱️ **Time:** 2 minutes to configure + 3 minutes to deploy
✅ **Result:** All routes will work

**This is a simple configuration issue, not a code problem!**

---

## Quick Checklist

- [ ] Go to Vercel Dashboard
- [ ] Settings → General → Root Directory
- [ ] Edit → Enter `frontend` → Save
- [ ] Deployments → Redeploy (without cache)
- [ ] Wait 3 minutes
- [ ] Test `/api/proxy/test` endpoint
- [ ] Should see JSON, not 404

**Do this NOW and your site will work!** 🚀
