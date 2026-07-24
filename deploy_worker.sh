set -euo pipefail

echo "Ensure you have logged into wrangler and set your account if necessary."
echo "This script publishes the worker defined by wrangler.toml (RESOURCE_cloudflare-worker.js)."

if ! command -v wrangler >/dev/null 2>&1; then
  echo "wrangler is not installed. Install with: npm install -g wrangler" >&2
  exit 1
fi

echo "Publishing worker..."
wrangler publish

echo "Published. Wrangler will output the worker URL above."
