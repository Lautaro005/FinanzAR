#!/usr/bin/env bash
# Corre el snapshot histórico diario y, si hay cambios, los commitea y los
# pushea a main. Lo usa el workflow de GitHub Actions
# (.github/workflows/snapshot-historico.yml) y también sirve a mano.
#
# Uso:
#   ./scripts/run-snapshot-and-push.sh                  # fecha = hoy en Buenos Aires
#   ./scripts/run-snapshot-and-push.sh --fecha 2026-09-29
#
# Los argumentos se pasan tal cual a scripts/snapshot-historico.mjs.
#
# Antes el push fallaba en silencio: todo iba solo al log, se commiteaba en
# la rama que estuviera activa y `git push origin main` era rechazado si
# origin/main había avanzado (por ejemplo, tras mergear un PR). Ahora:
#   - la salida se ve en consola y además queda en el log;
#   - se trabaja siempre sobre main actualizado desde origin;
#   - el push reintenta con rebase si main avanzó mientras tanto;
#   - cualquier falla termina con código distinto de 0.
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_DIR"

LOG_FILE="$REPO_DIR/scripts/snapshot-historico.log"
exec > >(tee -a "$LOG_FILE") 2>&1
echo "===== $(date -u +%Y-%m-%dT%H:%M:%SZ) ====="

# Fecha del snapshot: la de --fecha si vino, si no hoy en Buenos Aires.
FECHA="$(TZ=America/Argentina/Buenos_Aires date +%Y-%m-%d)"
prev=""
for arg in "$@"; do
  if [ "$prev" = "--fecha" ]; then FECHA="$arg"; fi
  case "$arg" in --fecha=*) FECHA="${arg#--fecha=}" ;; esac
  prev="$arg"
done

# Siempre sobre main al día con origin, sin pisar trabajo local sin commitear.
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "Hay cambios sin commitear en el repo; guardalos o descartalos antes de correr el snapshot" >&2
  echo "(si son solo JSON de una corrida anterior: git checkout -- public/historico)." >&2
  exit 1
fi
RAMA_ACTUAL="$(git rev-parse --abbrev-ref HEAD)"
if [ "$RAMA_ACTUAL" != "main" ]; then
  echo "Cambiando de '$RAMA_ACTUAL' a main."
  git checkout main
fi
git pull --rebase origin main

node scripts/snapshot-historico.mjs "$@"

if git diff --quiet -- public/historico; then
  echo "Sin cambios en public/historico (nada para commitear)."
  exit 0
fi

git add public/historico
git commit -m "chore: snapshot histórico $FECHA"

for intento in 1 2 3 4; do
  if git push origin HEAD:main; then
    echo "Snapshot $FECHA commiteado y pusheado a main."
    exit 0
  fi
  echo "Push rechazado (intento $intento); actualizando main y reintentando..."
  sleep $((2 ** intento))
  git pull --rebase origin main
done

echo "No se pudo pushear el snapshot $FECHA después de 4 intentos." >&2
exit 1
