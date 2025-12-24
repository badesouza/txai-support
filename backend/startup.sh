#!/bin/sh
set -e

echo "🚀 Starting backend initialization..."

# Feature flag for seeding
SEED_ON_STARTUP="${SEED_ON_STARTUP:-true}"

# Check Firebase/Firestore configuration
if [ -n "$FIRESTORE_EMULATOR_HOST" ]; then
  echo "🔥 Firestore emulator mode: $FIRESTORE_EMULATOR_HOST"
elif [ -n "$GCP_PROJECT_ID" ] || [ -n "$FIREBASE_PROJECT_ID" ]; then
  echo "🔥 Firestore production mode: ${GCP_PROJECT_ID:-$FIREBASE_PROJECT_ID}"
else
  echo "⚠️ WARNING: No Firestore configuration found"
  echo "   Set FIRESTORE_EMULATOR_HOST for local dev or GCP_PROJECT_ID for cloud"
fi

# Run seed if enabled (compiled JavaScript)
if [ "${SEED_ON_STARTUP}" = "true" ]; then
  echo "🌱 Seeding database (will skip if admin exists)..."
  # Run the compiled seed script - it's idempotent and won't fail if admin exists
  node dist/scripts/seed.js || echo "⚠️ Seed completed with warnings (may already be seeded)"
else
  echo "⏭️  Skipping seed (SEED_ON_STARTUP=false)"
fi

# Start the server
echo "🚀 Starting server..."
exec node dist/server.js
