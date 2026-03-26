#!/bin/bash
# First-time setup for Assured Trade on VPS
set -e

APP_DIR="/opt/AssuredTrade"
TRAEFIK_DYNAMIC="/docker/traefik/dynamic"

echo "=========================================="
echo "  Assured Trade — VPS Setup"
echo "=========================================="

# Clone repo if not exists
if [ ! -d "$APP_DIR" ]; then
  echo "Cloning repository..."
  git clone https://github.com/XLIVIX87/assured-trade.git "$APP_DIR"
else
  echo "Repository already exists at $APP_DIR"
fi

# Copy Traefik config
if [ -d "$TRAEFIK_DYNAMIC" ]; then
  cp "$APP_DIR/deploy/traefik/assuredtrade.yml" "$TRAEFIK_DYNAMIC/assuredtrade.yml"
  echo "Traefik config deployed. Subdomain will be active shortly."
else
  echo "WARNING: Traefik dynamic config directory not found at $TRAEFIK_DYNAMIC"
  echo "Skipping Traefik config. Set up manually if needed."
fi

# Create .env from example if not exists
if [ ! -f "$APP_DIR/.env" ]; then
  cp "$APP_DIR/apps/web/.env.example" "$APP_DIR/.env"
  echo ""
  echo "============================================================"
  echo "  IMPORTANT: .env created from example."
  echo "  Edit $APP_DIR/.env with real secrets before continuing!"
  echo ""
  echo "  Required:"
  echo "    - DATABASE_URL (with production password)"
  echo "    - AUTH_SECRET (generate: openssl rand -base64 32)"
  echo "    - AUTH_URL (production domain)"
  echo "    - DB_PASSWORD (for PostgreSQL container)"
  echo "============================================================"
  exit 1
fi

# Start services
cd "$APP_DIR"
echo "Building and starting services..."
docker compose -f docker-compose.prod.yml up -d --build

# Wait for DB to be healthy
echo "Waiting for database to be ready..."
for i in $(seq 1 12); do
  if docker compose -f docker-compose.prod.yml exec -T db pg_isready -U assuredtrade > /dev/null 2>&1; then
    echo "Database is ready."
    break
  fi
  if [ "$i" -eq 12 ]; then
    echo "ERROR: Database failed to start within 60 seconds."
    docker compose -f docker-compose.prod.yml logs db
    exit 1
  fi
  echo "  Waiting... (attempt $i/12)"
  sleep 5
done

# Run migrations
echo "Running database migrations..."
docker compose -f docker-compose.prod.yml exec -T web npx prisma migrate deploy

echo ""
echo "=========================================="
echo "  Assured Trade is running!"
echo "  https://assuredtrade.srv1528810.hstgr.cloud"
echo "=========================================="
