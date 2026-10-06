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
    "services/records.py:records.py"
)

# strip_imports — removes single-line AND multi-line import statements.
#   Single-line: ^import ... or ^from ... import ...
#   Multi-line:  ^from ... import (\n  ...\n) — parenthesised continuation
#   Also removes indented imports (conditional imports inside try/if).
#
# Prints the stripped lines to stderr so you can audit what was removed.
strip_imports() {
    python3 -c "
import sys, re

with open(sys.argv[1]) as f:
    lines = f.readlines()

i = 0
while i < len(lines):
    line = lines[i]
    stripped = line.lstrip()

    # Single-line import or from...import (no trailing open paren)
    if re.match(r'(import |from\s+\S+\s+import\s+)', stripped) and '(' not in stripped:
        print(f'  [stripped] {line.rstrip()}', file=sys.stderr)
        i += 1
        continue

    # Multi-line from...import (
    if re.match(r'from\s+\S+\s+import\s*\(', stripped):
        print(f'  [stripped] {line.rstrip()}', file=sys.stderr)
        i += 1
        # consume until closing )
        while i < len(lines):
            cont = lines[i]
            print(f'  [stripped] {cont.rstrip()}', file=sys.stderr)
            i += 1
            if ')' in cont:
                break
        continue

    # Bare 'import X' with open paren (unlikely but safe)
    if re.match(r'import\s+', stripped) and '(' in stripped:
        print(f'  [stripped] {line.rstrip()}', file=sys.stderr)
        i += 1
        while i < len(lines):
            cont = lines[i]
            print(f'  [stripped] {cont.rstrip()}', file=sys.stderr)
            i += 1
            if ')' in cont:
                break
        continue

    # Not an import — emit to stdout
    sys.stdout.write(line)
    i += 1
" "$1"
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

    echo "--- ${pair%%:*} ---"

    # Create temp files (avoids process substitution / /dev/fd sandbox issues)
    TMP_SRC=$(mktemp)
    TMP_BACK=$(mktemp)
    strip_imports "$SRC_FILE" > "$TMP_SRC" 2>&1
    strip_imports "$BACKEND_FILE" > "$TMP_BACK" 2>&1

    # Compare only stdout portions (re-run without stderr mixing)
    strip_imports "$SRC_FILE" > "$TMP_SRC" 2>/dev/null
    strip_imports "$BACKEND_FILE" > "$TMP_BACK" 2>/dev/null

    DIFF=$(diff "$TMP_SRC" "$TMP_BACK" || true)
    rm -f "$TMP_SRC" "$TMP_BACK"

    if [[ -n "$DIFF" ]]; then
        echo "FAIL: Logic drift between ${pair%%:*} and ${pair##*:}"
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
