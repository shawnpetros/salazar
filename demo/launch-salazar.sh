#!/bin/bash
# Wrapper that runs the npm-linked salazar with a clean home dir
export SALAZAR_HOME=/tmp/salazar-demo
export PATH="/opt/homebrew/bin:$PATH"
rm -rf /tmp/salazar-demo 2>/dev/null
exec /opt/homebrew/bin/salazar "$@"
