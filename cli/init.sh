#!/usr/bin/env bash
# init.sh — Project setup script for harness-cli
# Installs dependencies, verifies TypeScript compiles, and runs the test suite.

set -euo pipefail

echo "==> Setting up harness-cli..."

# Ensure we are in the project root (the directory containing this script)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ── Dependencies ──────────────────────────────────────────────────────────────
echo "==> Installing npm dependencies..."
npm install

# ── TypeScript type-check ─────────────────────────────────────────────────────
echo "==> Running TypeScript type check..."
npm run typecheck

# ── Build ─────────────────────────────────────────────────────────────────────
echo "==> Building project..."
npm run build

# ── Tests ─────────────────────────────────────────────────────────────────────
echo "==> Running test suite..."
npm test

echo ""
echo "✓ harness-cli setup complete."
echo "  Binary:  dist/index.js"
echo "  Command: harness <command>"
