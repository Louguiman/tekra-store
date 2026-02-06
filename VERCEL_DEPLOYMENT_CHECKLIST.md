# Vercel Deployment Checklist

## Issue: 404 on /api/proxy routes

If you're getting 404 errors on `/api/proxy/*` routes, follow this checklist:

## Pre-Deployment Checklist

### 1. Verify Files Exist Locally

```bash
# Check proxy route exists
ls frontend/src/app/api/proxy/[...path]/route.ts

# Should show: frontend/src/app/api/proxy/[...path]/route.ts
```

### 2. Test Locally First

```bash
# Start backend
docker-compose up -d

# Start frontend
cd frontend
npm run dev
```

Visit: http://localhost:3000

Test these URLs in browser console:
```javascript
// Test proxy test endpoint
fetch('/api/proxy/test').then(r => r.json()).then(console.log)

// Test products endpoint
fetch('/api/proxy/products?limit=5').then(r => r.json()).then(console.log)

// Test featured products
fetch('/api/proxy/products/featured?limit=5').then(r => r.json()).then(console.log)
```

All should return data without errors.

### 3. Commit and Push

```bash
git add .
git commit -m "Add Vercel proxy for mixed content fix"
git push origin main
```

## Vercel Deployment Steps

### Step 1: Import/Update Project

1. Go to https://vercel.com
2. If first time:
   - Click "Add New Project"
   - Import your GitHub repository
3. If updating:
   - Go to your project
   - It should auto-deploy on push

### Step 2: Configure Build Settings

**IMPORTANT:** Set these correctly

- **Framework Preset:** Next.js
- **Root Directory:** `frontend` ⚠️ CRITICAL
- **Build Command:** `npm run build` (default)
- **Output Directory:** `.next` (default)
- **Install Command:** `npm install` (default)

### Step 3: Environment Variables

Add in Vercel dashboard (Settings → Environment Variables):

```
BACKEND_API_URL=http://89.116.229.113:3001/api
NEXT_PUBLIC_APP_URL=https://shop.sankaretech.com
```

**Important:**
- Variable names are case-sensitive
- No quotes around values
- Apply to: Production, Preview, Development (all)

### Step 4: Deploy

1. Click "Deploy" (or it auto-deploys on push)
2. Wait for build to complete (~2-5 minutes)
3. Check build logs for errors

### Step 5: Verify Deployment

After deployment completes:

#### Test 1: Proxy Test Endpoint

Visit: `https://shop.sankaretech.com/api/proxy/test`

Should return:
```json
{
  "status": "ok",
  "message": "Proxy route is working",
  "backendUrl": "http://89.116.229.113:3001/api",
  "timestamp": "2024-..."
}
```

If you get 404, the proxy route isn't deployed correctly.

#### Test 2: Products Endpoint

Visit: `https://shop.sankaretech.com/api/proxy/products?limit=1`

Should return products JSON.

#### Test 3: Featured Products

Visit: `https://shop.sankaretech.com/api/proxy/products/featured?limit=1`

Should return featured products JSON.

#### Test 4: Homepage

Visit: `https://shop.sankaretech.com`

- Should load without errors
- Check browser console (F12)
- Should see no 404 or mixed content errors

## Troubleshooting 404 Errors

### Issue 1: Root Directory Not Set

**Symptoms:** 404 on all routes

**Solution:**
1. Go to Vercel project settings
2. Settings → General → Root Directory
3. Set to: `frontend`
4. Redeploy

### Issue 2: Files Not Committed

**Symptoms:** 404 on /api/proxy routes only

**Solution:**
```bash
# Check git status
git status

# Make sure proxy route is tracked
git add frontend/src/app/api/proxy/
git commit -m "Add proxy routes"
git push
```

### Issue 3: Build Failed

**Symptoms:** Deployment shows error

**Solution:**
1. Check Vercel build logs
2. Look for TypeScript errors
3. Fix errors locally
4. Test with `npm run build`
5. Push fixes

### Issue 4: Environment Variable Not Set

**Symptoms:** Proxy works but returns errors from backend

**Solution:**
1. Vercel Dashboard → Settings → Environment Variables
2. Add `BACKEND_API_URL=http://89.116.229.113:3001/api`
3. Redeploy (Settings → Deployments → ... → Redeploy)

### Issue 5: Caching Issues

**Symptoms:** Old version still showing

**Solution:**
1. Hard refresh browser: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
2. Clear browser cache
3. Try incognito/private window
4. Check Vercel deployment URL (not custom domain) to verify latest version

### Issue 6: Route Not Found in Build

**Symptoms:** 404 specifically on dynamic routes

**Solution:**

Check `next.config.js` doesn't have conflicting settings:

```javascript
// frontend/next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Make sure these are NOT set:
  // output: 'export', // This breaks API routes!
  // trailingSlash: true,
}

module.exports = nextConfig
```

If `output: 'export'` is set, remove it and redeploy.

## Verification Commands

### Local Testing

```bash
# Test proxy locally
curl http://localhost:3000/api/proxy/test

# Test products
curl http://localhost:3000/api/proxy/products?limit=1

# Test featured
curl http://localhost:3000/api/proxy/products/featured?limit=1
```

### Production Testing

```bash
# Test proxy
curl https://shop.sankaretech.com/api/proxy/test

# Test products
curl https://shop.sankaretech.com/api/proxy/products?limit=1

# Test featured
curl https://shop.sankaretech.com/api/proxy/products/featured?limit=1
```

## Common Mistakes

❌ **Root directory not set to `frontend`**
✅ Set in Vercel settings

❌ **Environment variable has wrong name**
✅ Use exactly: `BACKEND_API_URL`

❌ **Files not committed to git**
✅ Check `git status` and commit all files

❌ **Using `output: 'export'` in next.config.js**
✅ Remove it (breaks API routes)

❌ **Testing old cached version**
✅ Hard refresh or use incognito

## Success Indicators

✅ `/api/proxy/test` returns JSON (not 404)
✅ `/api/proxy/products` returns products
✅ Homepage loads without errors
✅ No mixed content errors in console
✅ Products display on homepage

## Still Having Issues?

### Check Vercel Function Logs

1. Vercel Dashboard → Your Project
2. Click on latest deployment
3. Go to "Functions" tab
4. Look for `/api/proxy/[...path]`
5. Check logs for errors

### Check Build Logs

1. Vercel Dashboard → Deployments
2. Click on latest deployment
3. View build logs
4. Look for errors during build

### Force Redeploy

1. Vercel Dashboard → Deployments
2. Click "..." on latest deployment
3. Click "Redeploy"
4. Check "Use existing Build Cache" is OFF
5. Redeploy

## Summary

The most common issue is **Root Directory not set to `frontend`**.

Make sure:
1. ✅ Root Directory = `frontend`
2. ✅ Environment variable `BACKEND_API_URL` is set
3. ✅ All files committed and pushed
4. ✅ Test `/api/proxy/test` endpoint first

If `/api/proxy/test` works but other routes don't, the issue is with the backend, not Vercel.

---

**Quick Test:** Visit `https://shop.sankaretech.com/api/proxy/test`

If this returns JSON, proxy is working! ✅
