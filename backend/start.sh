#!/bin/sh
set -e

echo "=== Syncing database schema with Prisma ==="
npx prisma db push --skip-generate

if [ -n "$ADMIN_INITIAL_PASSWORD" ] && [ -n "$ADMIN_SETUP_KEY" ]; then
  echo "=== Running database seed for admin account and fee groups ==="
  node prisma/seed.js || echo "Seeding completed or already exists"
fi

echo "=== Starting Koshi Hostel API server ==="
exec node src/server.js
