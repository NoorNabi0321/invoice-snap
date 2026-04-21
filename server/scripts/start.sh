#!/bin/bash
set -e

echo "⏳ Waiting for PostgreSQL to be ready..."

until pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" 2>/dev/null; do
  echo "   PostgreSQL not ready yet — retrying in 2s..."
  sleep 2
done

echo "✅ PostgreSQL is ready"

echo "🔄 Running database migrations..."
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  -f /app/migrations/001_initial_schema.sql 2>&1 || true

echo "🚀 Starting server..."
node dist/app.js
