#!/bin/sh
set -eu

cat > /usr/share/nginx/html/config.js <<EOF
window.__AI_BOOKINGMATE_CONFIG__ = {
  VITE_API_URL: "${VITE_API_URL:-http://localhost:3000}"
};
EOF
