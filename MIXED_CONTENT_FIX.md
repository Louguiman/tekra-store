# Mixed Content Error - Quick Fix

## The Problem

```
❌ blocked:mixed-content
Frontend (HTTPS) → Backend (HTTP) = BLOCKED
```

Your frontend is on HTTPS (`https://shop.sankaretech.com`) but backend is on HTTP (`http://89.116.229.113:3001/api`).

Browsers block this for security.

## The Solution

Add HTTPS to your backend using a subdomain: `api.sankaretech.com`

---

## Quick Setup (10 minutes)

### 1. SSH to Server

```bash
ssh root@89.116.229.113
```

### 2. Install Nginx + Certbot

```bash
apt update && apt install nginx certbot python3-certbot-nginx -y
```

### 3. Create Nginx Config

```bash
cat > /etc/nginx/sites-available/api.sankaretech.com << 'EOF'
server {
    listen 80;
    server_name api.sankaretech.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF
```

### 4. Enable Site

```bash
ln -s /etc/nginx/sites-available/api.sankaretech.com /etc/nginx/sites-enabled/
nginx -t && systemctl restart nginx
```

### 5. Add DNS Record

In your DNS provider:
```
Type: A
Name: api
Value: 89.116.229.113
```

Wait 5 minutes for DNS to propagate.

### 6. Get SSL Certificate

```bash
certbot --nginx -d api.sankaretech.com
```

Choose option 2 (redirect HTTP to HTTPS).

### 7. Update Vercel

In Vercel environment variables:
```
NEXT_PUBLIC_API_URL=https://api.sankaretech.com/api
```

Redeploy frontend.

### 8. Test

```bash
curl https://api.sankaretech.com/api/health
```

Visit: https://shop.sankaretech.com

✅ No more mixed content errors!

---

## Alternative: Use Cloudflare (Even Easier)

1. Add `sankaretech.com` to Cloudflare
2. Create DNS record: `api` → `89.116.229.113` (with proxy ON)
3. Set SSL to "Flexible"
4. Update Vercel: `NEXT_PUBLIC_API_URL=https://api.sankaretech.com/api`

Done! Cloudflare handles HTTPS for you.

---

## Need More Help?

See `SETUP_BACKEND_HTTPS.md` for detailed instructions.

---

**TL;DR:** Add HTTPS to backend using `api.sankaretech.com` subdomain
