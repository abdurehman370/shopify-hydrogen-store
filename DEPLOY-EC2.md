# Deploy Hydrogen to EC2

This project includes an Express server for running on EC2 or any Node.js hosting.

## Quick start

```bash
# 1. Build
npm run build

# 2. Run (production)
npm run start:node
```

The server runs on port 3000 by default. Set `PORT` to use a different port.

## Environment variables

Ensure `.env` includes:

- `PUBLIC_STORE_DOMAIN` – your-store.myshopify.com
- `PUBLIC_STOREFRONT_API_TOKEN` – Storefront API token
- `PRIVATE_STOREFRONT_API_TOKEN` – Private API token
- `SESSION_SECRET` – 32+ character secret
- `PUBLIC_CHECKOUT_DOMAIN` – (optional) for checkout
- `PUBLIC_STOREFRONT_ID` – (optional) for analytics

## EC2 deployment steps

### 1. Prepare the server

```bash
# Install Node.js 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 2. Deploy the app

```bash
# Clone or upload your project
cd ~/hydrogen-storefront

# Install dependencies
npm ci

# Build
npm run build

# Copy .env with your credentials
nano .env
```

### 3. Run with PM2

```bash
sudo npm install -g pm2
pm2 start express-server.mjs --name hydrogen
pm2 save
pm2 startup
```

### 4. Nginx reverse proxy (optional)

```nginx
server {
  listen 80;
  server_name your-domain.com;
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

Then enable HTTPS with Let's Encrypt (Certbot).

## Notes

- `express-server.mjs` wraps the Hydrogen Worker build for Node.js
- Use `npm run dev` for local development (MiniOxygen)
- Use `npm run start:node` for production on EC2
- Security group: allow inbound traffic on port 3000 (or 80/443 with Nginx)
