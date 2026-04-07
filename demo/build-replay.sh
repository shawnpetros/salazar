#!/bin/bash
# Pre-baked build output replay — simulates a real salazar run
# Used by the VHS tape to create a demo GIF without spending $10

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
DIM='\033[2m'
BOLD='\033[1m'
NC='\033[0m'

log() { echo -e "${CYAN}[salazar]${NC} $1"; }
pass() { echo -e "${CYAN}[salazar]${NC} Validator $1: ${GREEN}PASS${NC}"; }
feat() { echo -e "${CYAN}[salazar]${NC} Feature $1 ${GREEN}PASSED${NC} ${DIM}($2)${NC}"; }
cost() { echo -e "${CYAN}[salazar]${NC} ${DIM}Cost: \$$1${NC}"; }

sleep 0.5
log "Session a1b2c3d4e5f6"
sleep 1
log "${BOLD}Planner: 15 features${NC}"
sleep 0.8

# Feature loop — show a representative subset
log "Feature F001: Initialize TypeScript project ${DIM}(0/15)${NC}"
sleep 0.4; pass "typecheck"; sleep 0.2; pass "build"; sleep 0.2; pass "test"
feat "F001" "45s"; cost "0.31"
sleep 0.3

log "Feature F002: Define Counter interface ${DIM}(1/15)${NC}"
sleep 0.4; pass "typecheck"; sleep 0.2; pass "build"; sleep 0.2; pass "test"
feat "F002" "38s"; cost "0.58"
sleep 0.3

log "Feature F003: Create counter with default value ${DIM}(2/15)${NC}"
sleep 0.4; pass "typecheck"; sleep 0.2; pass "build"; sleep 0.2; pass "test"
feat "F003" "42s"; cost "0.89"
sleep 0.3

log "Feature F004: Increment by 1 ${DIM}(3/15)${NC}"
sleep 0.4; pass "typecheck"; sleep 0.2; pass "build"; sleep 0.2; pass "test"
feat "F004" "35s"; cost "1.15"
sleep 0.3

log "Feature F005: Increment by custom amount ${DIM}(4/15)${NC}"
sleep 0.4; pass "typecheck"; sleep 0.2; pass "build"; sleep 0.2; pass "test"
feat "F005" "41s"; cost "1.44"
sleep 0.3

log "Feature F006: Decrement by 1 ${DIM}(5/15)${NC}"
sleep 0.4; pass "typecheck"; sleep 0.2; pass "build"; sleep 0.2; pass "test"
feat "F006" "37s"; cost "1.72"
sleep 0.3

log "Feature F007: Decrement by custom amount ${DIM}(6/15)${NC}"
sleep 0.4; pass "typecheck"; sleep 0.2; pass "build"; sleep 0.2; pass "test"
feat "F007" "39s"; cost "2.01"
sleep 0.3

log "Feature F008: Reset to initial value ${DIM}(7/15)${NC}"
sleep 0.4; pass "typecheck"; sleep 0.2; pass "build"; sleep 0.2; pass "test"
feat "F008" "33s"; cost "2.28"
sleep 0.3

log "Feature F009: Get current count ${DIM}(8/15)${NC}"
sleep 0.4; pass "typecheck"; sleep 0.2; pass "build"; sleep 0.2; pass "test"
feat "F009" "31s"; cost "2.54"
sleep 0.3

log "Feature F010: Floor at zero on decrement ${DIM}(9/15)${NC}"
sleep 0.4; pass "typecheck"; sleep 0.2; pass "build"
sleep 0.2; echo -e "${CYAN}[salazar]${NC} Validator test: ${RED}FAIL${NC}"
sleep 0.3
log "${YELLOW}Retrying with feedback...${NC}"
sleep 0.4; pass "typecheck"; sleep 0.2; pass "build"; sleep 0.2; pass "test"
sleep 0.2; log "${DIM}Evaluator: 8.4/10${NC}"
feat "F010" "72s"; cost "3.21"
sleep 0.3

log "Feature F011: Floor applies to custom decrement ${DIM}(10/15)${NC}"
sleep 0.4; pass "typecheck"; sleep 0.2; pass "build"; sleep 0.2; pass "test"
feat "F011" "36s"; cost "3.49"
sleep 0.3

log "Feature F012: Counter is immutable ${DIM}(11/15)${NC}"
sleep 0.4; pass "typecheck"; sleep 0.2; pass "build"; sleep 0.2; pass "test"
feat "F012" "40s"; cost "3.78"
sleep 0.3

log "Feature F013: Export as named export ${DIM}(12/15)${NC}"
sleep 0.4; pass "typecheck"; sleep 0.2; pass "build"; sleep 0.2; pass "test"
feat "F013" "29s"; cost "4.02"
sleep 0.3

log "Feature F014: TypeScript strict mode ${DIM}(13/15)${NC}"
sleep 0.4; pass "typecheck"; sleep 0.2; pass "build"; sleep 0.2; pass "test"
feat "F014" "34s"; cost "4.30"
sleep 0.3

log "Feature F015: Comprehensive test coverage ${DIM}(14/15)${NC}"
sleep 0.4; pass "typecheck"; sleep 0.2; pass "build"; sleep 0.2; pass "test"
sleep 0.2; log "${DIM}Evaluator: 9.1/10${NC}"
feat "F015" "58s"; cost "4.89"
sleep 0.5

echo ""
echo -e "${GREEN}${BOLD}  ✓ Complete: 15/15 features in 9m 42s — \$4.89${NC}"
echo -e "${DIM}  Output: ~/projects/counter-lib${NC}"
echo -e "${DIM}  Tests: 66 passing${NC}"
echo ""
sleep 2
