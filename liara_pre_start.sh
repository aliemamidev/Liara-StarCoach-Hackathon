#!/bin/sh
set -eu

if [ "${LIARA_RESET_DATABASE_ON_START:-false}" = "true" ]; then
  echo "Resetting the production database before the first seed..."
  npx prisma migrate reset --force
else
  npx prisma migrate deploy
fi
