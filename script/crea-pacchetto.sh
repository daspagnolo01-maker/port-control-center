#!/usr/bin/env bash
# Crea l'archivio ZIP pronto all'uso: applicazione compilata, componenti di
# esecuzione e componente del database precompilato per i sistemi supportati.
set -e
cd "$(dirname "$0")/.."
SRC="$PWD"
VER_SQLITE=$(node -p "require('./node_modules/better-sqlite3/package.json').version")
OUT="$SRC/pacchetto"
DEST="$OUT/port-control-center"

npm run build

rm -rf "$OUT"
mkdir -p "$DEST/node_modules/better-sqlite3/build/Release" "$DEST/prebuilds"
cp -r dist "$DEST/dist"
cp MANUALE.md Manuale-Port-Control-Center.pdf LEGGIMI.txt "$DEST/" 2>/dev/null || cp MANUALE.md Manuale-Port-Control-Center.pdf "$DEST/"
cp avvia-windows.cmd avvia-mac-linux.sh "$DEST/"
for m in bindings file-uri-to-path dotenv; do cp -r "node_modules/$m" "$DEST/node_modules/$m"; done
cp -r node_modules/better-sqlite3/lib node_modules/better-sqlite3/package.json node_modules/better-sqlite3/LICENSE "$DEST/node_modules/better-sqlite3/"

BASE="https://github.com/WiseLibs/better-sqlite3/releases/download/v$VER_SQLITE"
for t in node-v115-win32-x64 node-v127-win32-x64 node-v131-win32-x64 node-v115-darwin-arm64 node-v115-linux-x64; do
  mkdir -p "$DEST/prebuilds/$t"
  curl -sL -o /tmp/pkg.tar.gz "$BASE/better-sqlite3-v$VER_SQLITE-$t.tar.gz"
  tar xzf /tmp/pkg.tar.gz -C "$DEST/prebuilds/$t" --strip-components=2
  rm -f /tmp/pkg.tar.gz
done

cd "$OUT"
zip -rq Port-Control-Center-pronto-all-uso.zip port-control-center
echo "creato $OUT/Port-Control-Center-pronto-all-uso.zip"
