#!/usr/bin/env bash
# scripts/deploy_hf.sh
# Deploys backend/ to a Hugging Face Space (Docker SDK).
#
# Required environment variables:
#   HF_USER   - Hugging Face username or organization
#   HF_SPACE  - Space name
#   HF_TOKEN  - Hugging Face write token (never printed or stored)

set -euo pipefail

# Ensure command echoing is disabled so token values cannot leak
set +x

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND_DIR="$ROOT/backend"
README_FILE="$ROOT/deploy/hf-space/README.md"

# Validate required environment variables without echoing their values
if [[ -z "${HF_USER:-}" ]]; then
    echo "ERROR: HF_USER environment variable is not set." >&2
    echo "Usage: HF_USER=<user> HF_SPACE=<space> HF_TOKEN=<token> bash scripts/deploy_hf.sh" >&2
    exit 1
fi

if [[ -z "${HF_SPACE:-}" ]]; then
    echo "ERROR: HF_SPACE environment variable is not set." >&2
    echo "Usage: HF_USER=<user> HF_SPACE=<space> HF_TOKEN=<token> bash scripts/deploy_hf.sh" >&2
    exit 1
fi

if [[ -z "${HF_TOKEN:-}" ]]; then
    echo "ERROR: HF_TOKEN environment variable is not set." >&2
    echo "Usage: HF_USER=<user> HF_SPACE=<space> HF_TOKEN=<token> bash scripts/deploy_hf.sh" >&2
    exit 1
fi

if [[ ! -d "$BACKEND_DIR" ]]; then
    echo "ERROR: backend directory not found at $BACKEND_DIR" >&2
    exit 1
fi

if [[ ! -f "$README_FILE" ]]; then
    echo "ERROR: README file not found at $README_FILE" >&2
    exit 1
fi

echo "==> Preparing deployment bundle for Hugging Face Space: ${HF_USER}/${HF_SPACE}..."

# Create isolated temporary directory
TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT

# Copy backend files to temporary directory root
# (Note: backend/ is self-contained with zero imports from src/)
cp -R "$BACKEND_DIR"/. "$TMP_DIR"/

# Copy the Space README (with YAML frontmatter) to root
cp "$README_FILE" "$TMP_DIR/README.md"

# Remove any accidental local secrets, logs, or caches from the bundle
rm -f "$TMP_DIR/.env" "$TMP_DIR"/*.log
find "$TMP_DIR" -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
find "$TMP_DIR" -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true

# Initialize git repo in the temp directory
cd "$TMP_DIR"
git init -b main >/dev/null 2>&1
git config user.email "deploy@snapclass.local"
git config user.name "SnapClass Deploy"
git add .
git commit -m "Deploy SnapClass backend to Hugging Face Spaces" >/dev/null 2>&1

REMOTE_URL="https://huggingface.co/spaces/${HF_USER}/${HF_SPACE}"
git remote add origin "$REMOTE_URL"

echo "==> Pushing to Hugging Face Space (credentials passed securely via HTTP header)..."
# Use http.extraHeader so HF_TOKEN is never embedded in the git remote URL or git config
git -c http.extraHeader="Authorization: Bearer $HF_TOKEN" push --force origin main

echo ""
echo "✅ Deployment push succeeded!"
echo "Space URL: https://huggingface.co/spaces/${HF_USER}/${HF_SPACE}"
echo "Direct App URL: https://${HF_USER}-${HF_SPACE}.hf.space"
echo "Health check endpoint: https://${HF_USER}-${HF_SPACE}.hf.space/health"
