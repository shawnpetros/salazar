#!/bin/bash
# Pre-seed a clean SALAZAR_HOME with config so the TUI goes straight to launcher
export SALAZAR_HOME=/tmp/salazar-demo-vhs
rm -rf "$SALAZAR_HOME"
mkdir -p "$SALAZAR_HOME"
cat > "$SALAZAR_HOME/config.json" << 'EOF'
{
  "models": {
    "default": "claude-sonnet-4-6",
    "planner": "claude-sonnet-4-6",
    "generator": "claude-sonnet-4-6",
    "evaluator": "claude-opus-4-6"
  },
  "output": { "defaultDir": "" }
}
EOF
echo "Config seeded at $SALAZAR_HOME/config.json"
