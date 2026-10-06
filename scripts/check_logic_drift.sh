#!/usr/bin/env bash
# scripts/check_logic_drift.sh
#
# Compares src/ logic files against backend/app/services/ copies.
# Only import-line differences are allowed; anything else fails the check.
#
# Usage:  bash scripts/check_logic_drift.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/src"
BACKEND="$ROOT/backend/app/services"

# Pairs: src_relative_path:backend_filename
PAIRS=(
    "database/db.py:db.py"
    "database/exceptions.py:exceptions.py"
    "pipelines/face_pipeline.py:face_pipeline.py"
    "pipelines/voice_pipeline.py:voice_pipeline.py"
    "utils/logger.py:logger.py"
    "services/attendance.py:attendance.py"
    "services/roster.py:roster.py"
    "services/auth_helpers.py:auth_helpers.py"
)

strip_imports() {
    # Remove lines that are import statements or from...import statements
    # (leading whitespace is preserved to catch conditional imports too)
    grep -v '^\s*import \|^\s*from ' "$1" 2>/dev/null || true
}

FAILED=0
CHECKED=0

echo "=== Logic Drift Check ==="
echo ""

for pair in "${PAIRS[@]}"; do
    SRC_FILE="$SRC/${pair%%:*}"
    BACKEND_FILE="$BACKEND/${pair##*:}"

    if [[ ! -f "$SRC_FILE" ]]; then
        echo "SKIP: $SRC_FILE not found"
        continue
    fi
    if [[ ! -f "$BACKEND_FILE" ]]; then
        echo "FAIL: $BACKEND_FILE not found (expected copy of $SRC_FILE)"
        FAILED=1
        continue
    fi

    DIFF=$(diff <(strip_imports "$SRC_FILE") <(strip_imports "$BACKEND_FILE") || true)

    if [[ -n "$DIFF" ]]; then
        echo "FAIL: Logic drift between $SRC_FILE and $BACKEND_FILE"
        echo "$DIFF"
        echo ""
        FAILED=1
    else
        echo "  OK: ${pair%%:*} ↔ ${pair##*:}"
    fi
    CHECKED=$((CHECKED + 1))
done

echo ""
echo "Checked $CHECKED file pairs."

if [[ $FAILED -ne 0 ]]; then
    echo ""
    echo "❌ Logic drift detected! Only import lines may differ."
    exit 1
fi

echo ""
echo "✅ No logic drift detected."
exit 0
