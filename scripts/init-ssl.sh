#!/usr/bin/env bash
# Run ONCE on the VDS to obtain the Let's Encrypt certificate.
# After this script completes, the normal CI/CD pipeline takes over.
#
# Prerequisites:
#   - nginx installed (apt install nginx)
#   - certbot installed (apt install certbot python3-certbot-nginx)
#   - DNS A record: admin.germany-erp.esharq.com -> this server's IP
#   - Ports 80 and 443 open in the firewall

set -euo pipefail

DOMAIN="admin.germany-erp.esharq.com"
EMAIL="${1:-admin@esharq.com}"
NGINX_AVAILABLE="/etc/nginx/sites-available/$DOMAIN"
NGINX_ENABLED="/etc/nginx/sites-enabled/$DOMAIN"
REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "==> Copying nginx site config..."
cp "$REPO_DIR/nginx/$DOMAIN" "$NGINX_AVAILABLE"
ln -sf "$NGINX_AVAILABLE" "$NGINX_ENABLED"
nginx -t
systemctl reload nginx

echo "==> Obtaining certificate for $DOMAIN (email: $EMAIL)..."
certbot --nginx \
  -d "$DOMAIN" \
  --email "$EMAIL" \
  --agree-tos \
  --no-eff-email \
  --redirect

echo "==> Verifying certbot auto-renew timer..."
systemctl status certbot.timer --no-pager || true

echo ""
echo "Done. Certificate installed. Nginx is serving HTTPS."
echo "Run the full stack: docker compose -f docker-compose.prod.yml up -d"
