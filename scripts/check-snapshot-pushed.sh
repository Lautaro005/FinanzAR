#!/usr/bin/env bash
# Chequea si el snapshot histórico de HOY (hora Argentina, UTC-3, sin
# horario de verano) ya se commiteó Y pusheó a origin/main. Pensado para
# que lo dispare una tarea programada de Cowork (Claude) por la tarde/
# noche y decida si hay que avisarle al usuario por mail.
#
# Salida (una sola palabra por stdout, para que la tarea programada la
# lea fácil):
#   ALREADY_PUSHED         -> ya está, no hay que hacer nada
#   FIRST_MISS_TODAY       -> todavía no se hizo hoy y es la primera vez
#                             que este chequeo lo detecta hoy -> avisar
#                             por mail
#   ALREADY_ALERTED_TODAY  -> todavía no se hizo, pero ya se avisó por
#                             mail antes hoy -> no volver a mandar mail
#   CHECK_ERROR            -> no se pudo determinar (ej. sin red a
#                             GitHub); no manda mail, para no generar
#                             falsos positivos
set -uo pipefail
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_DIR"

MARKER_DIR="$REPO_DIR/scripts/.cache"
MARKER_FILE="$MARKER_DIR/last-alert-date.txt"
mkdir -p "$MARKER_DIR"

# "Hoy" en hora Argentina (UTC-3 fijo, sin DST).
ARG_TODAY="$(date -u -d '3 hours ago' +%Y-%m-%d 2>/dev/null || date -u -v-3H +%Y-%m-%d)"
if [ -z "$ARG_TODAY" ]; then
  echo "CHECK_ERROR"
  exit 1
fi

if ! git fetch origin main --quiet 2>/dev/null; then
  echo "CHECK_ERROR"
  exit 1
fi

if git log origin/main --oneline --grep="snapshot histórico ${ARG_TODAY}" 2>/dev/null | grep -q .; then
  echo "ALREADY_PUSHED"
  exit 0
fi

PREV_ALERT="$(cat "$MARKER_FILE" 2>/dev/null || true)"
if [ "$PREV_ALERT" = "$ARG_TODAY" ]; then
  echo "ALREADY_ALERTED_TODAY"
  exit 0
fi

echo "$ARG_TODAY" > "$MARKER_FILE"
echo "FIRST_MISS_TODAY"
exit 0
