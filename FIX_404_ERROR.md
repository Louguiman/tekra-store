# Fix 404 Error on /api/proxy Routes

## Quick Fix

The 404 error on `/api/proxy/*` routes is likely because:

### Most Common: Root Directory Not Set

**In Vercel:**
1. Go to your project settings
2. Settings → General → Root Directory
3. Set to: **`frontend`** ⚠️
4. Save
5. Redeploy

This is the #1 cause of 404 errors!

---

## Other Possible Causes

### 2. Files Not Deployed

**Check:**
```bash
git status
git log --oneline -5
```

**Fix:**
```bash
git add frontend/src/app/api/proxy/
git commit -m "Add proxy routes"
git push origin main
```

### 3. Environment Variable Missing

**In Vercel:**
- Settings → Environment Variables
- Add: `BACKEND_API_URL=http://89.116.229.113:3001/api`
- Redeploy

### 4. Cache Issue

**Try:**
- Hard refresh: Ctrl+Shift+R
- Incognito window
- Different browser

---

## Test Steps

### 1. Test Proxy Test Endpoint

Visit: `https://shop.sankaretech.com/api/proxy/test`

**Expected:**
```json
{
  "status": "ok",
  "message": "Proxy route is working"
}
```

**If 404:** Root directory not set or files not deployed

### 2. Test Products Endpoint

Visit: `https://shop.sankaretech.com/api/proxy/products?limit=1`

**Expected:** JSON with products

**If 404:** Backend issue or wrong BACKEND_API_URL

### 3. Test Homepage

Visit: `https://shop.sankaretech.com`

**Expected:** Products load, no console errors

---

## Verification

After fixing, verify:

```bash
# Test proxy
curl https://shop.sankaretech.com/api/proxy/test

# Should return JSON, not 404
```

---

## Still 404?

1. Check Vercel build logs for errors
2. Verify `frontend` is set as root directory
3. Check all files are committed: `git status`
4. Force redeploy in Vercel (without cache)

---

**TL;DR:** Set Root Directory to `frontend` in Vercel settings!
