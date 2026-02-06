# Quick Deployment Guide

## 🚀 Deploy in 3 Steps

### Step 1: Deploy Backend (5 minutes)

```powershell
# Run deployment script
.\deploy-backend.ps1

# Or manually:
docker-compose build backend
docker-compose up -d backend
```

**Verify:**
```bash
curl http://localhost:3001/api/health
```

---

### Step 2: Deploy Frontend to Vercel (10 minutes)

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Deploy to Vercel"
   git push origin main
   ```

2. **Import in Vercel:**
   - Go to https://vercel.com
   - Click "Add New Project"
   - Import your repository
   - **Root Directory:** `frontend`

3. **Environment Variables:**
   ```
   NEXT_PUBLIC_API_URL=http://89.116.229.113:3001/api
   NEXT_PUBLIC_APP_URL=https://shop.sankaretech.com
   ```

4. **Deploy** → Wait for build

---

### Step 3: Configure Domain (5 minutes)

1. **In Vercel:**
   - Project Settings → Domains
   - Add: `shop.sankaretech.com`

2. **In DNS Provider:**
   - Add CNAME: `shop` → `cname.vercel-dns.com`
   - Or follow Vercel's DNS instructions

3. **Wait for DNS** (up to 48 hours, usually 5-10 minutes)

---

## ✅ Test Deployment

```bash
# Test backend
curl http://89.116.229.113:3001/api/health

# Test CORS
curl -H "Origin: https://shop.sankaretech.com" \
     http://89.116.229.113:3001/api/countries

# Visit frontend
open https://shop.sankaretech.com
```

---

## 🔧 Quick Fixes

### CORS Error?
```powershell
.\deploy-backend.ps1
```

### Frontend Not Loading?
Check Vercel environment variables:
- `NEXT_PUBLIC_API_URL` is set
- Root directory is `frontend`

### Build Failed?
Check Vercel logs for errors

---

## 📋 URLs

| Service | URL |
|---------|-----|
| Frontend | https://shop.sankaretech.com |
| Backend | http://89.116.229.113:3001/api |
| Admin | https://shop.sankaretech.com/admin |
| API Docs | http://89.116.229.113:3001/api/docs |

---

## 📚 Full Documentation

- **Complete Guide:** `VERCEL_DEPLOYMENT_GUIDE.md`
- **CORS Setup:** `BACKEND_CORS_SETUP.md`
- **Changes Summary:** `DEPLOYMENT_SUMMARY.md`

---

## 🆘 Need Help?

1. Check Vercel deployment logs
2. Check backend logs: `docker logs ecommerce_backend`
3. Check browser console for errors
4. Review documentation files above
