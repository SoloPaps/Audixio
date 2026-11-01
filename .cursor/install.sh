#!/usr/bin/env bash
# Prépare un agent cloud : Node 22 (.nvmrc), pnpm (corepack), dépendances, Chromium, CLI Supabase, Docker.
# Idempotent. Ne démarre pas Supabase (voir start.sh).
set -euo pipefail
cd "$(dirname "$0")/.."

required="$(tr -d '[:space:]' < .nvmrc)"
# /usr/local/bin est sur le PATH des shells de login, y compris non interactifs.
# sudo ne voit pas nvm ni un node hors secure_path.
if [[ ! -x /usr/local/bin/node ]] || [[ "$(/usr/local/bin/node -v 2>/dev/null || true)" != "v${required}" ]]; then
  archive="$(mktemp)"
  curl -fsSL "https://nodejs.org/dist/v${required}/node-v${required}-linux-x64.tar.xz" -o "$archive"
  sudo tar -xJf "$archive" -C /usr/local --strip-components=1 --no-same-owner
  rm -f "$archive"
fi

sudo /usr/local/bin/corepack enable
sudo /usr/local/bin/corepack prepare --activate
hash -r
pnpm install --frozen-lockfile

if ! command -v supabase >/dev/null 2>&1 || [[ "$(supabase --version 2>/dev/null || true)" != *2.122.0* ]]; then
  archive="$(mktemp)"
  curl -fsSL -o "$archive" https://github.com/supabase/cli/releases/download/v2.122.0/supabase_linux_amd64.tar.gz
  sudo tar -xzf "$archive" -C /usr/local/bin
  rm -f "$archive"
fi

if ! command -v dockerd >/dev/null 2>&1; then
  sudo apt-get update
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    -o Dpkg::Options::=--force-confdef \
    -o Dpkg::Options::=--force-confold \
    docker.io fuse-overlayfs iptables
  sudo usermod -aG docker "${USER}"
fi
if ! id -nG "${USER}" | tr ' ' '\n' | grep -qx docker; then
  sudo usermod -aG docker "${USER}"
fi

pnpm --filter @audigy/web exec playwright install --with-deps chromium
pnpm --filter @audigy/browser-runner exec playwright install chromium
