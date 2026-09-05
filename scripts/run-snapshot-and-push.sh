#!/usr/bin/env bash
# Corre el snapshot histórico diario y, si hay cambios, los commitea y
# pushea. Pensado para correr con el cron/launchd de TU máquina real (no
# desde una sesión de Claude) — ver la sección "Rutina de snapshot
# histórico" en references/finanzar-REFERENCE.md para el porqué.
#
# Uso manual: ./scripts/run-snapshot-and-push.sh
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_DIR"

LOG_FILE="$REPO_DIR/scripts/snapshot-historico.log"
echo "===== $(date -u +%Y-%m-%dT%H:%M:%SZ) =====" >> "$LOG_FILE"

node scripts/snapshot-historico.mjs >> "$LOG_FILE" 2>&1

if ! git diff --quiet -- public/historico || ! git diff --cached --quiet -- public/historico; then
  git add public/historico
  git commit -m "chore: snapshot histórico $(date +%Y-%m-%d)" >> "$LOG_FILE" 2>&1
  git push origin main >> "$LOG_FILE" 2>&1
  echo "Snapshot commiteado y pusheado." >> "$LOG_FILE"
else
  echo "Sin cambios en public/historico (nada para commitear)." >> "$LOG_FILE"
fi
