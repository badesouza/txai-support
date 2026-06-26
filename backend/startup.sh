#!/bin/sh
set -e

echo "🚀 Starting backend initialization..."

SEED_ON_STARTUP="${SEED_ON_STARTUP:-true}"

if [ -n "$DATABASE_URL" ]; then
  echo "🐘 PostgreSQL mode configured"
else
  echo "⚠️ WARNING: DATABASE_URL is not set"
fi

if [ "${SEED_ON_STARTUP}" = "true" ]; then
  echo "🌱 Seeding database (will skip if admin exists)..."
  node dist/scripts/seed.js || echo "⚠️ Seed completed with warnings (may already be seeded)"
else
  echo "⏭️  Skipping seed (SEED_ON_STARTUP=false)"
fi

echo "🚀 Starting server..."
exec node dist/server.js
