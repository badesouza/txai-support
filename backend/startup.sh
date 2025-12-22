#!/bin/sh
set -e

echo "🚀 Starting backend initialization..."

# Verify required environment variable
if [ -z "$DATABASE_URL" ]; then
  echo "❌ ERROR: DATABASE_URL environment variable is not set!"
  exit 1
fi

echo "✅ DATABASE_URL is set"

# Feature flags (caller/pipeline can override)
MIGRATE_ON_STARTUP="${MIGRATE_ON_STARTUP:-true}"
SEED_ON_STARTUP="${SEED_ON_STARTUP:-true}"

# Step 1: Generate Prisma Client
echo "📦 Generating Prisma Client..."
npx prisma generate

# Step 2: Run migrations (depends on DATABASE_URL)
if [ "${MIGRATE_ON_STARTUP}" = "true" ]; then
  echo "🔄 Running database migrations..."
  npx prisma migrate deploy
else
  echo "⏭️  Skipping migrations (MIGRATE_ON_STARTUP=false)"
fi

# Step 3: Seed database (depends on migrations being complete)
if [ "${SEED_ON_STARTUP}" = "true" ]; then
  echo "🌱 Seeding database..."
  # Fail fast: if seed fails, better to crash+retry than run without initial users.
  npx prisma db seed
else
  echo "⏭️  Skipping seed (SEED_ON_STARTUP=false)"
fi

# Step 4: Start the server (depends on database being ready)
echo "🚀 Starting server..."
exec node dist/server.js

