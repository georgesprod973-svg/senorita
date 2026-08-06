#!/bin/bash
# Double-clique ce fichier pour lancer Señorita.
cd "$(dirname "$0")" || exit 1
PORT=8777
if lsof -i :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
  echo "Serveur déjà en route sur le port $PORT."
else
  python3 -m http.server $PORT >/dev/null 2>&1 &
  sleep 1
fi
open "http://localhost:$PORT"
echo "Señorita tourne sur http://localhost:$PORT"
echo "Ferme cette fenêtre quand tu as fini (le serveur s'arrête avec elle)."
wait
