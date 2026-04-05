#!/bin/bash
# PreToolUse hook: block git push if version in package.json hasn't been bumped
# compared to the remote branch.

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

# Get remote version from the branch we're pushing to
BRANCH=$(git -C "$PROJECT_DIR" rev-parse --abbrev-ref HEAD 2>/dev/null)
REMOTE_VERSION=$(git -C "$PROJECT_DIR" show "origin/${BRANCH}:package.json" 2>/dev/null | jq -r '.version' 2>/dev/null)

if [ -z "$REMOTE_VERSION" ] || [ "$REMOTE_VERSION" = "null" ]; then
  # No remote version to compare (new repo or new branch), allow push
  exit 0
fi

if [ "$LOCAL_VERSION" = "$REMOTE_VERSION" ]; then
  jq -n '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: ("Version not bumped. Current version is " + $ver + " (same as remote). Please bump the version in package.json (and rebuild with npm run build) before pushing.")
    }
  }' --arg ver "$LOCAL_VERSION"
  exit 0
fi

exit 0
