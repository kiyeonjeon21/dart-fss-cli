#!/bin/bash
# PostToolUse hook: after git push, remind if npm version is behind local version

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command')

# Only check git push commands
if ! echo "$COMMAND" | grep -qE '^git push'; then
  exit 0
fi

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-.}"
PKG="$PROJECT_DIR/package.json"

if [ ! -f "$PKG" ]; then
  exit 0
fi

LOCAL_VERSION=$(jq -r '.version' "$PKG")
NPM_VERSION=$(npm view dart-fss-cli version 2>/dev/null)

if [ -z "$NPM_VERSION" ] || [ "$NPM_VERSION" = "null" ]; then
  exit 0
fi

if [ "$LOCAL_VERSION" != "$NPM_VERSION" ]; then
  echo "npm registry version ($NPM_VERSION) differs from local ($LOCAL_VERSION). Run 'npm publish --access public' if this is a release."
fi

exit 0
