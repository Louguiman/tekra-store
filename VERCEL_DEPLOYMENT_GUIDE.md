# Vercel Deployment Guide

## Overview

The frontend has been decoupled from the Docker Compose setup and is now ready for deployment on Vercel. The backend remains in Docker and can be deployed separately on any server.

## Architecture Changes

### Before (Proxy Architecture)
```
Browser → Frontend (Docker) → Proxy API Routes → Backend (Docker)
```

### After (Direct API Calls)
```
Browser → Frontend (Vercel) → Backend API (Your Server)
```

## What Was Changed

### 1. Redux API Configuration
**File:** `frontend/src/store/api.ts`

**Before:**
```typescript
baseUrl: '/api/backend', // Proxy through Next.js API routes
```

**After:**
```typescript
baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
```

### 2. Removed Proxy API Routes
Deleted the following files/directories:
- `frontend/src/app/api/backend/[...path]/route.ts` - Main proxy route
- `frontend/src/app/api/health/route.ts` - Health check proxy
- `frontend/src/app/api/products/` - Product proxy routes (featured, deals, trending, new-arrivals)

### 3. Updated Homepage
**File:** `frontend/src/app/page.tsx`

**Before:**
```typescript
fetch('/api/products/featured?limit=8')
```

**After:**
```typescript
const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
fetch(`${apiUrl}/products/featured?limit=8`)
```

### 4. Removed Frontend from Docker Compose
**File:** `docker-compose.yml`

Removed the entire `frontend` service. Now only contains:
- postgres
- redis
- backend

### 5. Updated Environment Configuration
**Files:** `frontend/.env`, `frontend/.env.example`

**New configuration:**
```env
# Backend API URL (for Vercel deployment)
NEXT_PUBLIC_API_URL=http://localhost:3001/api

# Public app URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Deployment Steps

### Step 1: Deploy Backend

1. **Deploy backend to your server** (VPS, DigitalOcean, AWS, etc.):
   ```bash
   # On your server
   cd backend
   docker-compose up -d
   ```

2. **Ensure backend is accessible** via public URL:
   ```
   http://your-server-ip:3001/api
   # or
   https://api.yourdomain.com
   ```

3. **Configure CORS** in backend to allow Vercel domain:
   ```typescript
   // backend/src/main.ts
   app.enableCors({
     origin: [
       'http://localhost:3000',
       'https://your-vercel-app.vercel.app',
       'https://yourdomain.com'
     ],
     credentials: true,
   });
   ```

### Step 2: Deploy Frontend to Vercel

1. **Push code to GitHub** (if not already):
   ```bash
   git add .
   git commit -m "Prepare frontend for Vercel deployment"
   git push origin main
   ```

2. **Import project in Vercel**:
   - Go to https://vercel.com
   - Click "Add New Project"
   - Import your GitHub repository
   - Select the `frontend` directory as the root

3. **Configure Environment Variables** in Vercel:
   ```
   NEXT_PUBLIC_API_URL=https://api.yourdomain.com
   NEXT_PUBLIC_APP_URL=https://your-vercel-app.vercel.app
   ```

4. **Configure Build Settings**:
   - Framework Preset: Next.js
   - Root Directory: `frontend`
   - Build Command: `npm run build` (default)
   - Output Directory: `.next` (default)

5. **Deploy**:
   - Click "Deploy"
   - Wait for build to complete
   - Your app will be live at `https://your-project.vercel.app`

### Step 3: Update Backend CORS

After deployment, update backend CORS to include your Vercel URL:

```typescript
// backend/src/main.ts
app.enableCors({
  origin: [
    'https://your-project.vercel.app', // Add your Vercel URL
    'https://yourdomain.com', // Add custom domain if you have one
  ],
  credentials: true,
});
```

Rebuild and restart backend:
```bash
docker-compose build backend
docker-compose up -d backend
```

## Environment Variables

### Frontend (Vercel)

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | `https://api.yourdomain.com` |
| `NEXT_PUBLIC_APP_URL` | Frontend URL | `https://your-app.vercel.app` |

### Backend (Docker)

| Variable | Description | Example |
|----------|-------------|---------|
| `FRONTEND_URL` | Frontend URL for CORS | `https://your-app.vercel.app` |
| `POSTGRES_DB` | Database name | `ecommerce_db` |
| `POSTGRES_USER` | Database user | `postgres` |
| `POSTGRES_PASSWORD` | Database password | `your-secure-password` |
| `JWT_SECRET` | JWT secret key | `your-super-secret-key` |

## Testing

### Test Backend API

```bash
# Health check
curl https://api.yourdomain.com/health

# Get countries
curl https://api.yourdomain.com/countries

# Get products
curl https://api.yourdomain.com/products?limit=5
```

### Test Frontend

1. Visit your Vercel URL: `https://your-project.vercel.app`
2. Check browser console for any API errors
3. Test key features:
   - Homepage loads with products
   - Country selector works
   - Product pages load
   - Cart functionality works
   - Authentication works

## Troubleshooting

### Issue 1: CORS Errors

**Symptoms:**
```
Access to fetch at 'https://api.yourdomain.com/products' from origin 'https://your-app.vercel.app' has been blocked by CORS policy
```

**Solution:**
Update backend CORS configuration to include your Vercel domain.

### Issue 2: API URL Not Set

**Symptoms:**
```
Failed to fetch: http://localhost:3001/api/products
```

**Solution:**
Set `NEXT_PUBLIC_API_URL` environment variable in Vercel dashboard.

### Issue 3: Build Fails on Vercel

**Symptoms:**
```
Error: Cannot find module '@/components/...'
```

**Solution:**
- Ensure `frontend` is set as root directory in Vercel
- Check that all imports use correct paths
- Verify `tsconfig.json` paths are correct

### Issue 4: Environment Variables Not Working

**Symptoms:**
API calls go to localhost instead of production URL

**Solution:**
- Environment variables must start with `NEXT_PUBLIC_` to be available in browser
- Redeploy after adding/changing environment variables
- Clear Vercel cache and redeploy

## Custom Domain Setup

### Add Custom Domain to Vercel

1. Go to your project settings in Vercel
2. Navigate to "Domains"
3. Add your custom domain (e.g., `shop.yourdomain.com`)
4. Follow DNS configuration instructions

### Update Environment Variables

After adding custom domain:

1. **Update Vercel environment variables:**
   ```
   NEXT_PUBLIC_APP_URL=https://shop.yourdomain.com
   ```

2. **Update backend CORS:**
   ```typescript
   app.enableCors({
     origin: ['https://shop.yourdomain.com'],
     credentials: true,
   });
   ```

3. **Redeploy both frontend and backend**

## Backend Deployment Options

### Option 1: VPS (DigitalOcean, Linode, etc.)

```bash
# Install Docker and Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Clone repository
git clone your-repo-url
cd your-repo

# Start backend
docker-compose up -d

# Setup nginx reverse proxy (optional)
# Point domain to server IP
```

### Option 2: AWS EC2

```bash
# Launch EC2 instance
# Install Docker
# Clone repository
# Configure security groups (allow port 3001)
# Start backend with docker-compose
```

### Option 3: Railway/Render

- Import backend directory
- Configure environment variables
- Deploy PostgreSQL and Redis
- Deploy backend service

## Production Checklist

### Backend
- [ ] Backend deployed and accessible via public URL
- [ ] CORS configured with Vercel domain
- [ ] Database migrations run
- [ ] Environment variables set
- [ ] SSL certificate configured (HTTPS)
- [ ] Health check endpoint working
- [ ] File uploads configured (if needed)

### Frontend
- [ ] Code pushed to GitHub
- [ ] Project imported in Vercel
- [ ] Root directory set to `frontend`
- [ ] Environment variables configured
- [ ] Build successful
- [ ] Custom domain added (optional)
- [ ] SSL certificate active (automatic with Vercel)

### Testing
- [ ] Homepage loads correctly
- [ ] Products display with correct prices
- [ ] Country selector works
- [ ] Cart functionality works
- [ ] Checkout flow works
- [ ] Payment integration works
- [ ] Admin panel accessible
- [ ] Authentication works
- [ ] No console errors

## Monitoring

### Vercel Analytics

Enable Vercel Analytics in your project settings to monitor:
- Page views
- Performance metrics
- Error rates
- User demographics

### Backend Monitoring

Consider adding:
- Application monitoring (PM2, New Relic)
- Log aggregation (Logtail, Papertrail)
- Uptime monitoring (UptimeRobot, Pingdom)
- Error tracking (Sentry)

## Cost Estimation

### Vercel (Frontend)
- **Hobby Plan**: Free
  - 100 GB bandwidth
  - Unlimited deployments
  - Automatic HTTPS
  - Perfect for testing/small projects

- **Pro Plan**: $20/month
  - 1 TB bandwidth
  - Advanced analytics
  - Team collaboration
  - Better for production

### Backend Hosting
- **VPS (DigitalOcean)**: $6-12/month
  - 1-2 GB RAM
  - 25-50 GB SSD
  - 1-2 TB transfer

- **AWS EC2**: $10-30/month
  - t3.small or t3.medium
  - Pay as you go

## Support

For issues or questions:
1. Check Vercel deployment logs
2. Check backend Docker logs: `docker logs ecommerce_backend`
3. Review browser console for errors
4. Check network tab for failed API calls

## Summary

✅ **Frontend**: Ready for Vercel deployment  
✅ **Backend**: Remains in Docker, deploy separately  
✅ **API Calls**: Direct from browser to backend  
✅ **No Proxy**: Removed all proxy API routes  
✅ **CORS**: Must be configured on backend  
✅ **Environment Variables**: Use `NEXT_PUBLIC_` prefix  

Your e-commerce platform is now ready for production deployment with frontend on Vercel and backend on your preferred hosting provider!
