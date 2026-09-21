#!/usr/bin/env bash
# Avvio di Port Control Center su macOS o Linux senza diritti di amministratore.
set -e
cd "$(dirname "$0")"

if [ -x "./nodejs/bin/node" ]; then
  export PATH="$PWD/nodejs/bin:$PATH"
fi

if ! command -v node > /dev/null; then
  echo "Node.js non trovato. Estrarre Node.js 20 nella sottocartella \"nodejs\" di questa cartella."
  exit 1
fi

[ -d node_modules ] || { echo "Installazione delle dipendenze..."; npm install; }
[ -f dist/index.cjs ] || { echo "Compilazione..."; npm run build; }

echo "Applicazione in avvio su http://localhost:5000 (CTRL+C per chiudere)"
npm start
