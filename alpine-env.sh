#!/usr/bin/env bash
set -euo pipefail

# ── Alpine dev environment for opencode + gentle-ai ──────────────────
# Creates a persistent chroot with opencode, gentle-ai, and all deps.
# Usage: ./alpine-env.sh          — enter interactive shell
#        ./alpine-env.sh --setup  — setup only (no shell)
#        ./alpine-env.sh --destroy — remove environment

ENV_DIR="${ENV_DIR:-/opt/alpine-opencode}"
ALPINE_VERSION="3.21.3"
ALPINE_TARBALL="alpine-minirootfs-${ALPINE_VERSION}-x86_64.tar.gz"
ALPINE_URL="https://dl-cdn.alpinelinux.org/alpine/v3.21/releases/x86_64/${ALPINE_TARBALL}"

# ── helpers ──────────────────────────────────────────────────────────
info()  { printf "\033[1;34m➜\033[0m %s\n" "$*"; }
ok()    { printf "\033[1;32m✓\033[0m %s\n" "$*"; }
err()   { printf "\033[1;31m✗\033[0m %s\n" "$*" >&2; }

# ── setup ────────────────────────────────────────────────────────────
setup() {
  # skip if already set up
  if [ -f "$ENV_DIR/.setup-done" ]; then
    ok "Environment already set up at $ENV_DIR"
    return 0
  fi

  info "Creating Alpine environment at $ENV_DIR..."
  mkdir -p "$ENV_DIR"

  # download rootfs
  if [ ! -f "$ENV_DIR/$ALPINE_TARBALL" ]; then
    info "Downloading Alpine minirootfs..."
    curl -sSL "$ALPINE_URL" -o "$ENV_DIR/$ALPINE_TARBALL"
  fi

  # extract
  if [ ! -f "$ENV_DIR/bin/sh" ]; then
    info "Extracting rootfs..."
    tar xzf "$ENV_DIR/$ALPINE_TARBALL" -C "$ENV_DIR"
  fi

  # DNS
  cp /etc/resolv.conf "$ENV_DIR/etc/resolv.conf"

  # fake distro (gentle-ai needs Debian/Ubuntu/Arch/Fedora)
  cat > "$ENV_DIR/etc/os-release" <<'OSRELEASE'
ID=debian
ID_LIKE=debian
VERSION_ID=12
PRETTY_NAME="Debian GNU/Linux 12"
OSRELEASE

  # mounts
  sudo mount --bind /proc "$ENV_DIR/proc" 2>/dev/null || true
  sudo mount --bind /sys  "$ENV_DIR/sys"  2>/dev/null || true
  sudo mount --bind /dev  "$ENV_DIR/dev"  2>/dev/null || true

  # install deps + tools
  info "Installing dependencies (this takes a while)..."
  sudo chroot "$ENV_DIR" /bin/sh -c "
apk add --no-cache bash jq curl git go npm nodejs python3 make g++ >/dev/null 2>&1 && \
curl -fsSL https://opencode.ai/install | bash >/dev/null 2>&1 && \
curl -fsSL https://raw.githubusercontent.com/Gentleman-Programming/gentle-ai/main/scripts/install.sh | bash >/dev/null 2>&1
"

  # gentle-ai install + model config
  info "Configuring gentle-ai..."
  sudo chroot "$ENV_DIR" /bin/bash -c "
export PATH=/root/.opencode/bin:/usr/local/bin:/root/go/bin:\$PATH

gentle-ai install --agents opencode --scope global --channel stable --preset full-gentleman >/dev/null 2>&1

OPENCODE_JSON=/root/.config/opencode/opencode.json
if [ -f \"\$OPENCODE_JSON\" ]; then
  declare -A MODEL_MAP=(
    [gentle-orchestrator]=\"opencode/mimo-v2.5-free\"
    [sdd-init]=\"opencode/nemotron-3-ultra-free\"
    [sdd-onboard]=\"opencode/mimo-v2.5-free\"
    [sdd-explore]=\"opencode/big-pickle\"
    [sdd-propose]=\"opencode/big-pickle\"
    [sdd-spec]=\"opencode/big-pickle\"
    [sdd-design]=\"opencode/north-mini-code-free\"
    [sdd-tasks]=\"opencode/north-mini-code-free\"
    [sdd-apply]=\"opencode/north-mini-code-free\"
    [sdd-verify]=\"opencode/mimo-v2.5-free\"
    [sdd-archive]=\"opencode/deepseek-v4-flash-free\"
  )
  for agent in \${!MODEL_MAP[@]}; do
    model=\${MODEL_MAP[\$agent]}
    if jq -e \".agent.\\\"\$agent\\\"\" \"\$OPENCODE_JSON\" > /dev/null 2>&1; then
      tmp=\$(mktemp)
      jq \".agent.\\\"\$agent\\\".model = \\\"\$model\\\"\" \"\$OPENCODE_JSON\" > \"\$tmp\" && mv \"\$tmp\" \"\$OPENCODE_JSON\"
    fi
  done
fi
"
  touch "$ENV_DIR/.setup-done"
  ok "Environment ready."
}

# ── enter shell ──────────────────────────────────────────────────────
enter_shell() {
  info "Entering Alpine environment..."
  info "Inside: opencode, gentle-ai, go, git, node, npm"
  info "Type 'exit' to leave."
  echo ""

  sudo chroot "$ENV_DIR" /bin/bash -c "
export HOME=/root
export PATH=/root/.opencode/bin:/usr/local/bin:/root/go/bin:\$PATH
export PS1='\033[1;32m[alpine]\033[0m \w \$ '
cd /root
exec bash --norc
"
}

# ── destroy ──────────────────────────────────────────────────────────
destroy() {
  info "Destroying Alpine environment..."
  sudo umount "$ENV_DIR/proc" 2>/dev/null || true
  sudo umount "$ENV_DIR/sys"  2>/dev/null || true
  sudo umount "$ENV_DIR/dev"  2>/dev/null || true
  sudo rm -rf "$ENV_DIR"
  ok "Destroyed."
}

# ── main ─────────────────────────────────────────────────────────────
case "${1:-}" in
  --setup)   setup ;;
  --destroy) destroy ;;
  *)         setup; enter_shell ;;
esac
