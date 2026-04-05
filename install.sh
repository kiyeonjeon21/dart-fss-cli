#!/usr/bin/env bash
set -euo pipefail

REPO="kiyeonjeon21/dart-fss-cli"
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
command -v node >/dev/null 2>&1 || error "Node.js가 필요합니다. https://nodejs.org 에서 설치해주세요."
command -v npm  >/dev/null 2>&1 || error "npm이 필요합니다."

NODE_MAJOR=$(node -p 'process.versions.node.split(".")[0]')
if [ "$NODE_MAJOR" -lt 18 ]; then
  error "Node.js 18 이상이 필요합니다. (현재: $(node -v))"
fi

# ── Clean up broken previous installation ────────────────────────
NPM_GLOBAL_DIR="$(npm prefix -g)/lib/node_modules/${PACKAGE_NAME}"
if [ -L "$NPM_GLOBAL_DIR" ] && [ ! -e "$NPM_GLOBAL_DIR" ]; then
  warn "Removing broken previous installation..."
  rm "$NPM_GLOBAL_DIR"
fi

# ── Install from npm registry ────────────────────────────────────
info "dart-fss-cli 설치 중..."
npm install -g "${PACKAGE_NAME}" 2>&1

if command -v "$BIN_NAME" >/dev/null 2>&1; then
  ok "설치 완료! ($(${BIN_NAME} --version 2>/dev/null || echo 'v0.1.0'))"
else
  # npm global bin이 PATH에 없는 경우
  NPM_BIN="$(npm prefix -g)/bin"
  warn "${BIN_NAME}이 PATH에 없습니다."
  warn "다음을 셸 설정에 추가하세요:"
  echo ""
  echo "  export PATH=\"${NPM_BIN}:\$PATH\""
  echo ""
fi

# ── API key setup hint ───────────────────────────────────────────
echo ""
info "DART API 키 설정:"
echo "  export DART_API_KEY=your_api_key_here"
echo ""
info "API 키 발급: https://opendart.fss.or.kr"
echo ""
ok "사용법: ${BIN_NAME} --help"
