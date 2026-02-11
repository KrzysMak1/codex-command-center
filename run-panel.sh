#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

echo "[1/5] Sprawdzam wymagania..."
command -v docker >/dev/null 2>&1 || { echo "❌ Docker nie jest zainstalowany"; exit 1; }
command -v node >/dev/null 2>&1 || { echo "❌ Node.js nie jest zainstalowany"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "❌ npm nie jest zainstalowany"; exit 1; }

if command -v codex >/dev/null 2>&1; then
  echo "✅ Codex CLI wykryty ($(codex --version 2>/dev/null || echo 'version unknown'))"
else
  echo "⚠️  Codex CLI nie znaleziony (tryb CLI logowania będzie niedostępny)."
  echo "   Zainstaluj opcjonalnie: npm i -g @openai/codex"
fi

echo "[2/5] Sprawdzam dostęp do dockera..."
if ! docker info >/dev/null 2>&1; then
  echo "❌ Docker daemon nie działa lub brak uprawnień"
  exit 1
fi

echo "[3/5] Instaluję zależności npm..."
npm install

echo "[4/5] Build kontrolny frontendu..."
npm run build >/dev/null

echo "[5/5] Uruchamiam backend + panel..."
echo "➡ Otwórz: http://localhost:5173"
echo "➡ Możesz zalogować się przez Codex CLI albo API key"
exec npm run dev:full
