#!/bin/bash
# PreToolUse hook: block git push if code changed but npm version is behind.
# Skips for docs-only pushes (same logic as version bump check).

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

BRANCH=$(git -C "$PROJECT_DIR" rev-parse --abbrev-ref HEAD 2>/dev/null)

# Skip if only docs/config changed (no code changes)
CHANGED_FILES=$(git -C "$PROJECT_DIR" diff --name-only "origin/${BRANCH}..HEAD" 2>/dev/null)
HAS_CODE_CHANGES=$(echo "$CHANGED_FILES" | grep -E '^(src/|package\.json|tsup\.config)' || true)
if [ -z "$HAS_CODE_CHANGES" ]; then
  exit 0
fi

LOCAL_VERSION=$(jq -r '.version' "$PKG")
NPM_VERSION=$(npm view dart-fss-cli version 2>/dev/null)

if [ -z "$NPM_VERSION" ] || [ "$NPM_VERSION" = "null" ]; then
  exit 0
fi

if [ "$LOCAL_VERSION" != "$NPM_VERSION" ]; then
  jq -n '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: ("npm version (" + $npm + ") != local (" + $local + "). Run: npm publish --access public")
    }
  }' --arg npm "$NPM_VERSION" --arg local "$LOCAL_VERSION"
  exit 0
fi

exit 0
