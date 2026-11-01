#!/usr/bin/env bash
# Démarre Docker puis Supabase local, comme le job CI. Ne réinstalle rien.
set -euo pipefail
cd "$(dirname "$0")/.."

if ! command -v dockerd >/dev/null 2>&1 || ! command -v supabase >/dev/null 2>&1; then
  echo "Docker ou la CLI Supabase manque. Relancer .cursor/install.sh." >&2
  exit 1
fi

# Le groupe docker est posé à l'install. Un shell déjà ouvert ne l'a pas encore.
if ! id -nG | tr ' ' '\n' | grep -qx docker && id -nG "${USER}" | tr ' ' '\n' | grep -qx docker; then
  exec sg docker -c "bash \"$0\""
fi

if ! docker info >/dev/null 2>&1; then
  if [[ ! -f /etc/docker/daemon.json ]]; then
    echo '{"storage-driver":"fuse-overlayfs"}' | sudo tee /etc/docker/daemon.json >/dev/null
  fi
  if [[ -x /usr/sbin/iptables-legacy ]]; then
    sudo update-alternatives --set iptables /usr/sbin/iptables-legacy || true
    sudo update-alternatives --set ip6tables /usr/sbin/ip6tables-legacy || true
  fi
  sudo mkdir -p /var/run
  sudo dockerd >/tmp/dockerd.log 2>&1 &
  ready=0
  for _ in $(seq 1 60); do
    if docker info >/dev/null 2>&1; then
      ready=1
      break
    fi
    sleep 1
  done
  if [[ "$ready" != 1 ]]; then
    echo "dockerd ne répond pas. Journal : /tmp/dockerd.log" >&2
    exit 1
  fi
fi

if supabase status >/dev/null 2>&1; then
  echo "Supabase déjà prêt"
  exit 0
fi

exec supabase start --yes -x realtime,imgproxy,postgres-meta,studio,edge-runtime,logflare,vector,supavisor
