#!/bin/bash
# Clean environment for TUI demo — shows fake install then launches salazar
export SALAZAR_HOME=/tmp/salazar-demo-vhs
rm -rf "$SALAZAR_HOME" 2>/dev/null
mkdir -p "$SALAZAR_HOME/output"

cat > "$SALAZAR_HOME/config.json" << 'CONF'
{
  "models": {
    "default": "claude-sonnet-4-6",
    "planner": "claude-sonnet-4-6",
    "generator": "claude-sonnet-4-6",
    "evaluator": "claude-opus-4-6"
  },
  "output": { "defaultDir": "" }
}
CONF

cp /Users/shawnpetros/projects/salazar/demo/counter-spec.md /tmp/counter-spec.md

clear
echo "$ npm i -g salazar"
echo ""
echo "added 1 package in 2s"
echo ""
echo "$ salazar"
sleep 1
exec salazar
