#!/usr/bin/env bash
set -euo pipefail

PACKAGE_NAME="dart-fss-cli"
BIN_NAME="dart-fss"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m'

info()  { printf "${CYAN}▸${NC} %s\n" "$1"; }
ok()    { printf "${GREEN}✔${NC} %s\n" "$1"; }
warn()  { printf "${YELLOW}⚠${NC} %s\n" "$1"; }
error() { printf "${RED}✖${NC} %s\n" "$1" >&2; exit 1; }

# ── Check prerequisites ──────────────────────────────────────────
command -v node >/dev/null 2>&1 || error "Node.js is required. Install it from https://nodejs.org"
command -v npm  >/dev/null 2>&1 || error "npm is required."

NODE_MAJOR=$(node -p 'process.versions.node.split(".")[0]')
if [ "$NODE_MAJOR" -lt 18 ]; then
  error "Node.js 18+ is required. (current: $(node -v))"
fi

# ── Clean up broken previous installation ────────────────────────
NPM_GLOBAL_DIR="$(npm prefix -g)/lib/node_modules/${PACKAGE_NAME}"
if [ -L "$NPM_GLOBAL_DIR" ] && [ ! -e "$NPM_GLOBAL_DIR" ]; then
  warn "Removing broken previous installation..."
  rm "$NPM_GLOBAL_DIR"
fi

# ── Install from npm registry ────────────────────────────────────
info "Installing dart-fss-cli..."
npm install -g "${PACKAGE_NAME}" 2>&1

if command -v "$BIN_NAME" >/dev/null 2>&1; then
  ok "Installed dart-fss-cli $(${BIN_NAME} --version 2>/dev/null)"
else
  NPM_BIN="$(npm prefix -g)/bin"
  warn "${BIN_NAME} is not in your PATH."
  warn "Add this to your shell profile:"
  echo ""
  echo "  export PATH=\"${NPM_BIN}:\$PATH\""
  echo ""
fi

# ── Onboarding: API key setup ────────────────────────────────────
echo ""
info "Setup: DART API key is required to use this CLI."
info "Get a free key at: https://opendart.fss.or.kr"
echo ""

if [ -n "${DART_API_KEY:-}" ]; then
  ok "DART_API_KEY is already set."
else
  printf "${CYAN}▸${NC} Enter your DART API key (or press Enter to skip): "
  stty -echo < /dev/tty 2>/dev/null
  read -r API_KEY < /dev/tty
  stty echo < /dev/tty 2>/dev/null
  echo ""
  if [ -n "$API_KEY" ]; then
    DART_DIR="$HOME/.dart-fss"
    mkdir -p "$DART_DIR"
    echo "DART_API_KEY=$API_KEY" > "$DART_DIR/.env"
    chmod 600 "$DART_DIR/.env"
    ok "API key saved to ~/.dart-fss/.env"
  else
    warn "Skipped. Set it later:"
    echo "  export DART_API_KEY=your_api_key_here"
  fi
fi

echo ""
ok "Ready! Try: dart-fss lookup \"삼성전자\""
