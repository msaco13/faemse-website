#!/usr/bin/env bash
# Every automatic check of the daily site audit, in order, ending with one
# report block that says which checks ran and what they found. Used by the
# site-audit skill (.claude/skills/site-audit/SKILL.md).
#
#   bash scripts/site-audit.sh
#
# Exit code: 0 = every check ran and found nothing, 1 = every check ran and
# something needs a look, 2 = a check could not run (the report says which).
# Nothing here changes the site, the database, or any file in the repo.

set -u
cd "$(dirname "$0")/.."

export AUDIT_CHROME="${AUDIT_CHROME:-/opt/pw-browsers/chromium}"
export A11Y_CHROME="${A11Y_CHROME:-$AUDIT_CHROME}"
PORT="${AUDIT_PORT:-4173}"
SITE="http://localhost:$PORT"
LOGS="$(mktemp -d)"
PREVIEW_PID=""

declare -a ROWS=()
row() { ROWS+=("$(printf '%-15s %-11s %s' "$1" "$2" "$3")"); }
incomplete=""
issues=0

report() {
  [ -n "$PREVIEW_PID" ] && kill "$PREVIEW_PID" 2>/dev/null
  echo
  echo "==================== SITE AUDIT REPORT ===================="
  printf '%s\n' "${ROWS[@]}"
  echo "-----------------------------------------------------------"
  if [ -n "$incomplete" ]; then
    echo "RESULT: INCOMPLETE. Could not run: $(echo "${incomplete% }" | sed 's/ /, /g'). Do not report the site as clean."
    echo "==========================================================="
    exit 2
  elif [ "$issues" -gt 0 ]; then
    echo "RESULT: ALL CHECKS RAN. $issues check(s) found something to look at."
    echo "==========================================================="
    exit 1
  else
    echo "RESULT: ALL CHECKS RAN. Nothing found."
    echo "==========================================================="
    exit 0
  fi
}

section() { echo; echo "---------- $1 ----------"; }

# 1. Install
section "Install"
if npm ci --no-audit --no-fund >"$LOGS/install.log" 2>&1; then
  row "Install" "ran" "ok"
else
  tail -20 "$LOGS/install.log"
  row "Install" "FAILED" "npm ci failed (log above)"
  incomplete+="install, build, pages, accessibility "
  report
fi

# 2. Build (type check + build). A failed build stops everything else.
section "Build"
if npm run build >"$LOGS/build.log" 2>&1; then
  row "Build" "ran" "ok"
else
  grep -E "error|Error" "$LOGS/build.log" | head -30
  row "Build" "FAILED" "type check or build failed (errors above)"
  incomplete+="pages, accessibility "
  issues=$((issues + 1))
  report
fi

# 3. Local copy of the site
node node_modules/vite/bin/vite.js preview --port "$PORT" --strictPort >"$LOGS/preview.log" 2>&1 &
PREVIEW_PID=$!
for _ in $(seq 1 30); do
  curl -sf "$SITE/" >/dev/null 2>&1 && break
  sleep 1
done
if ! curl -sf "$SITE/" >/dev/null 2>&1; then
  cat "$LOGS/preview.log"
  row "Local copy" "FAILED" "preview server did not start"
  incomplete+="pages, accessibility "
  report
fi

# 4. Every page, desktop and phone
section "Pages"
AUDIT_SITE="$SITE" node scripts/audit.mjs 2>&1 | tee "$LOGS/pages.log"
if ! grep -q "^Outside sites linked" "$LOGS/pages.log"; then
  row "Pages" "FAILED" "page check stopped before finishing (output above)"
  incomplete+="pages "
else
  pages=$(grep -oE "^Pages: [0-9]+" "$LOGS/pages.log" | grep -oE "[0-9]+")
  found=$(grep -oE "^FOUND [0-9]+" "$LOGS/pages.log" | grep -oE "[0-9]+" || true)
  members=$(grep -oE "Members-only pages: [^.]+" "$LOGS/pages.log" | sed 's/Members-only pages: //')
  if [ -n "$found" ] || grep -q "^Slower than" "$LOGS/pages.log"; then
    row "Pages" "ran" "$pages pages x 2 widths: ${found:-0} issue(s)$(grep -q '^Slower than' "$LOGS/pages.log" && echo ', some slow pages'). Members-only: $members"
    issues=$((issues + 1))
  else
    row "Pages" "ran" "$pages pages x 2 widths: 0 issues. Members-only: $members"
  fi
fi

# 5. Accessibility
section "Accessibility"
A11Y_SITE="$SITE" node scripts/a11y.mjs 2>&1 | tee "$LOGS/a11y.log"
ok=$(grep -c "^ok " "$LOGS/a11y.log" || true)
bad=$(grep -c "^FAIL " "$LOGS/a11y.log" || true)
if [ $((ok + bad)) -eq 0 ]; then
  row "Accessibility" "FAILED" "check did not run (output above)"
  incomplete+="accessibility "
elif [ "$bad" -gt 0 ]; then
  row "Accessibility" "ran" "$ok of $((ok + bad)) pages pass; $bad with problems"
  issues=$((issues + 1))
else
  row "Accessibility" "ran" "$ok of $ok pages pass"
fi

# 6. Dependencies (reported here; the skill decides what may be fixed)
section "Dependencies"
if npm audit --json >"$LOGS/deps.json" 2>/dev/null || [ -s "$LOGS/deps.json" ]; then
  deps=$(node -e '
    const a = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
    const v = Object.values(a.vulnerabilities || {});
    const n = (s) => v.filter((x) => x.severity === s).length;
    console.log(`${v.length} advisories (${n("critical")} critical, ${n("high")} high, ${n("moderate")} moderate, ${n("low")} low)`);
  ' "$LOGS/deps.json" 2>/dev/null)
  if [ -n "$deps" ]; then
    npm audit 2>/dev/null | tail -4
    row "Dependencies" "ran" "$deps"
  else
    row "Dependencies" "FAILED" "could not read npm audit output"
    incomplete+="dependencies "
  fi
else
  row "Dependencies" "FAILED" "npm audit did not run"
  incomplete+="dependencies "
fi

# 7. Locked doors: the private tables give an outsider nothing
section "Locked doors"
node scripts/locked-doors.mjs 2>&1 | tee "$LOGS/doors.log"
doors=${PIPESTATUS[0]}
doors_line=$(grep -E "^Locked doors:" "$LOGS/doors.log" | sed 's/^Locked doors: //')
if [ "$doors" -eq 2 ] || [ -z "$doors_line" ]; then
  row "Locked doors" "FAILED" "could not reach the database (output above)"
  incomplete+="locked-doors "
elif [ "$doors" -eq 1 ]; then
  row "Locked doors" "ran" "PROBLEM: $doors_line"
  issues=$((issues + 1))
else
  row "Locked doors" "ran" "$doors_line"
fi

# 8. Membership date tests
section "Membership tests"
npm test 2>&1 | tee "$LOGS/tests.log"
tests=${PIPESTATUS[0]}
passed=$(grep -E "^(ℹ|#) pass [0-9]+" "$LOGS/tests.log" | tail -1 | grep -oE "[0-9]+")
failed=$(grep -E "^(ℹ|#) fail [0-9]+" "$LOGS/tests.log" | tail -1 | grep -oE "[0-9]+")
if [ -z "$passed" ] && [ -z "$failed" ]; then
  row "Tests" "FAILED" "tests did not run (output above)"
  incomplete+="tests "
elif [ "$tests" -ne 0 ] || [ "${failed:-0}" -gt 0 ]; then
  row "Tests" "ran" "${failed:-some} failed, ${passed:-0} passed"
  issues=$((issues + 1))
else
  row "Tests" "ran" "$passed of $passed passed"
fi

report
