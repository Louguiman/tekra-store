# Setup HTTPS for Backend - Fix Mixed Content Error

## Problem

Frontend (HTTPS) → Backend (HTTP) = **BLOCKED by browser**

Error: `blocked:mixed-content`

Browsers block HTTP requests from HTTPS pages for security.

## Solution: Add HTTPS to Backend

### Option 1: Using Nginx Reverse Proxy with Let's Encrypt (Recommended)

#### Step 1: Install Nginx and Certbot

```bash
# On your server (89.116.229.113)
sudo apt update
sudo apt install nginx certbot python3-certbot-nginx -y
```

#### Step 2: Configure Nginx

Create nginx config:

```bash
sudo nano /etc/nginx/sites-available/api.sankaretech.com
```

Add this configuration:

```nginx
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
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/api.sankaretech.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### Step 3: Get SSL Certificate

```bash
sudo certbot --nginx -d api.sankaretech.com
```

Follow the prompts:
- Enter your email
- Agree to terms
- Choose to redirect HTTP to HTTPS (option 2)

#### Step 4: Update DNS

Add A record in your DNS:
```
api.sankaretech.com → 89.116.229.113
```

#### Step 5: Update Frontend Environment Variable

In Vercel, update:
```
NEXT_PUBLIC_API_URL=https://api.sankaretech.com/api
```

#### Step 6: Test

```bash
# Test HTTPS
curl https://api.sankaretech.com/api/health

# Should return: {"status":"ok"}
```

---

### Option 2: Using Cloudflare (Easiest)

#### Step 1: Add Domain to Cloudflare

1. Go to https://cloudflare.com
2. Add your domain `sankaretech.com`
3. Update nameservers at your domain registrar

#### Step 2: Create DNS Record

In Cloudflare DNS:
```
Type: A
Name: api
Content: 89.116.229.113
Proxy: ON (orange cloud)
```

#### Step 3: Configure SSL

In Cloudflare:
- SSL/TLS → Overview → Set to "Flexible"
- This gives you HTTPS without configuring backend

#### Step 4: Update Frontend

In Vercel:
```
NEXT_PUBLIC_API_URL=https://api.sankaretech.com/api
```

---

### Option 3: Using Caddy (Simplest)

#### Step 1: Install Caddy

```bash
# On your server
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy
```

#### Step 2: Configure Caddy

```bash
sudo nano /etc/caddy/Caddyfile
```

Add:
```
api.sankaretech.com {
    reverse_proxy localhost:3001
}
```

#### Step 3: Restart Caddy

```bash
sudo systemctl restart caddy
```

Caddy automatically gets SSL certificate from Let's Encrypt!

#### Step 4: Update Frontend

In Vercel:
```
NEXT_PUBLIC_API_URL=https://api.sankaretech.com/api
```

---

## Quick Fix (Temporary - Not Recommended)

### Use Vercel as Proxy

Keep the proxy routes but make them call the backend server-side (which allows HTTP).

This is NOT recommended because:
- Adds latency
- Defeats the purpose of separation
- More complex

---

## Recommended Approach

**Use Nginx + Let's Encrypt** (Option 1)

Why?
- ✅ Free SSL certificate
- ✅ Auto-renewal
- ✅ Industry standard
- ✅ Full control
- ✅ Better performance

---

## Step-by-Step: Nginx + Let's Encrypt

### 1. SSH to Your Server

```bash
ssh root@89.116.229.113
```

### 2. Install Nginx and Certbot

```bash
apt update
apt install nginx certbot python3-certbot-nginx -y
```

### 3. Create Nginx Config

```bash
nano /etc/nginx/sites-available/api.sankaretech.com
```

Paste:
```nginx
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
        
        # CORS headers (if needed)
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization' always;
    }
}
```

### 4. Enable Site

```bash
ln -s /etc/nginx/sites-available/api.sankaretech.com /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

### 5. Update DNS

In your DNS provider, add:
```
Type: A
Name: api
Value: 89.116.229.113
TTL: 300
```

Wait 5-10 minutes for DNS propagation.

### 6. Get SSL Certificate

```bash
certbot --nginx -d api.sankaretech.com
```

Follow prompts:
- Enter email
- Agree to terms
- Choose option 2 (redirect HTTP to HTTPS)

### 7. Test

```bash
curl https://api.sankaretech.com/api/health
```

Should return: `{"status":"ok"}`

### 8. Update Vercel

In Vercel environment variables:
```
NEXT_PUBLIC_API_URL=https://api.sankaretech.com/api
```

Redeploy frontend.

### 9. Test Frontend

Visit: https://shop.sankaretech.com

Check browser console - no more mixed content errors!

---

## Auto-Renewal

Certbot automatically renews certificates. Test renewal:

```bash
certbot renew --dry-run
```

---

## Troubleshooting

### DNS Not Resolving

```bash
# Check DNS
nslookup api.sankaretech.com

# Should return: 89.116.229.113
```

### Nginx Error

```bash
# Check nginx status
systemctl status nginx

# Check nginx logs
tail -f /var/log/nginx/error.log
```

### Certbot Error

```bash
# Check if port 80 is open
netstat -tulpn | grep :80

# Make sure nginx is running
systemctl status nginx
```

### Still Getting Mixed Content

1. Clear browser cache
2. Check Vercel environment variable is updated
3. Redeploy frontend in Vercel
4. Check browser console for actual URL being called

---

## Summary

1. ✅ Install Nginx + Certbot
2. ✅ Configure Nginx reverse proxy
3. ✅ Add DNS record for api.sankaretech.com
4. ✅ Get SSL certificate with Certbot
5. ✅ Update Vercel environment variable
6. ✅ Redeploy frontend

**Result:** 
- Frontend: `https://shop.sankaretech.com` ✅
- Backend: `https://api.sankaretech.com/api` ✅
- No more mixed content errors! ✅

---

## Alternative: Keep HTTP Backend

If you can't setup HTTPS on backend, you have two options:

### Option A: Use Cloudflare (Easiest)

Cloudflare provides HTTPS for free without touching your server.

### Option B: Restore Proxy Routes

Restore the Next.js proxy routes we deleted. The proxy runs server-side where HTTP is allowed.

**Not recommended** because it defeats the purpose of separation.

---

**Recommended:** Setup HTTPS with Nginx + Let's Encrypt (takes 10 minutes)
