# /etc/nginx/sites-available/admin.germany-erp.esharq.com
# Symlink to sites-enabled and reload nginx after placing this file.

# HTTP — redirect all traffic to HTTPS, serve ACME challenges for certbot
server {
    listen 80;
    listen [::]:80;
    server_name admin.germany-erp.esharq.com;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

# HTTPS — terminate TLS, reverse-proxy to Next.js on localhost:3000
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name admin.germany-erp.esharq.com;

    ssl_certificate     /etc/letsencrypt/live/admin.germany-erp.esharq.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/admin.germany-erp.esharq.com/privkey.pem;
    include             /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam         /etc/letsencrypt/ssl-dhparams.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Frame-Options           SAMEORIGIN                                      always;
    add_header X-Content-Type-Options    nosniff                                         always;
    add_header Referrer-Policy           strict-origin-when-cross-origin                 always;

    # Next.js static assets — immutable, cache 1 year
    location /_next/static/ {
        proxy_pass http://127.0.0.1:3100;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # Next.js image optimisation
    location /_next/image {
        proxy_pass         http://127.0.0.1:3100;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }

    # All other requests
    location / {
        proxy_pass         http://127.0.0.1:3100;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade           $http_upgrade;
        proxy_set_header   Connection        "upgrade";
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
