#!/usr/bin/env bash
set -euo pipefail

# ── Freestyle VM setup for opencode + gentle-ai ───────────────────────
# Creates and configures a VM with ttyd, opencode, and gentle-ai.
# Usage: ./setup-vm.sh [--create] [--configure] [--all]
#
# Prerequisites:
#   npm install -g freestyle
#   export FREESTYLE_API_KEY="your-key"

# ── helpers ───────────────────────────────────────────────────────────
info()  { printf "\033[1;34m➜\033[0m %s\n" "$*"; }
ok()    { printf "\033[1;32m✓\033[0m %s\n" "$*"; }
err()   { printf "\033[1;31m✗\033[0m %s\n" "$*" >&2; }

# ── config ────────────────────────────────────────────────────────────
VM_NAME="${VM_NAME:-opencode-gentle}"
VM_VCPU="${VM_VCPU:-4}"
VM_MEMORY="${VM_MEMORY:-8192}"
VM_DISK="${VM_DISK:-16384}"
TTYD_PORT="${TTYD_PORT:-7682}"
TTYD_USER="${TTYD_USER:-opencode}"
TTYD_PASS="${TTYD_PASS:-opencode2026}"
DOMAIN="${DOMAIN:-opencode-gentle.style.dev}"
NODE_VERSION="${NODE_VERSION:-24.16.0}"
GENTLE_VERSION="${GENTLE_VERSION:-v1.42.0}"

# ── check freestyle CLI ──────────────────────────────────────────────
if ! command -v freestyle &>/dev/null; then
  err "freestyle CLI not found. Install: npm install -g freestyle"
  exit 1
fi

if [ -z "${FREESTYLE_API_KEY:-}" ]; then
  err "FREESTYLE_API_KEY not set. Export it first."
  exit 1
fi

VM_ID=""

# ── create VM ─────────────────────────────────────────────────────────
create_vm() {
  info "Creating VM '$VM_NAME' (${VM_VCPU} vCPU, ${VM_MEMORY}MB RAM, ${VM_DISK}MB disk)..."

  local output
  output=$(freestyle vm create \
    --name "$VM_NAME" \
    --vcpu "$VM_VCPU" \
    --memory "$VM_MEMORY" \
    --rootfs "$VM_DISK" 2>&1)

  VM_ID=$(echo "$output" | grep -oP 'vm[a-z0-9]+' | head -1)

  if [ -z "$VM_ID" ]; then
    err "Failed to create VM. Output:"
    echo "$output"
    exit 1
  fi

  ok "VM created: $VM_ID"
  echo "$VM_ID" > .vm-id
  ok "VM ID saved to .vm-id"
}

# ── configure VM ──────────────────────────────────────────────────────
configure_vm() {
  if [ -z "$VM_ID" ]; then
    if [ -f .vm-id ]; then
      VM_ID=$(cat .vm-id)
      info "Using saved VM ID: $VM_ID"
    else
      err "No VM ID. Run with --create first, or set VM_ID env var."
      exit 1
    fi
  fi

  local exec_cmd="freestyle vm exec $VM_ID"

  # ── 1. Install Node.js via nvm ──────────────────────────────────────
  info "Installing Node.js $NODE_VERSION via nvm..."
  $exec_cmd "
    export HOME=/root
    curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash &&
    export NVM_DIR=/root/.nvm &&
    . /root/.nvm/nvm.sh &&
    nvm install $NODE_VERSION &&
    nvm use $NODE_VERSION &&
    nvm alias default $NODE_VERSION
  " 2>&1 | tail -5
  ok "Node.js installed"

  # ── 2. Install opencode ─────────────────────────────────────────────
  info "Installing opencode..."
  $exec_cmd "
    export HOME=/root
    export PATH=/root/.nvm/versions/node/$NODE_VERSION/bin:\$PATH
    npm install -g opencode-ai
  " 2>&1 | tail -3
  ok "opencode installed"

  # ── 3. Install gentle-ai ────────────────────────────────────────────
  info "Installing gentle-ai $GENTLE_VERSION..."
  $exec_cmd "
    curl -sL https://github.com/Gentleman-Programming/gentle-ai/releases/download/$GENTLE_VERSION/gentle-ai_${GENTLE_VERSION#v}_linux_amd64.tar.gz | tar xz -C /tmp &&
    mv /tmp/gentle-ai /usr/local/bin/gentle-ai &&
    chmod +x /usr/local/bin/gentle-ai
  " 2>&1 | tail -3
  ok "gentle-ai installed"

  # ── 4. Install ttyd ─────────────────────────────────────────────────
  info "Installing ttyd..."
  $exec_cmd "
    curl -sL https://github.com/tsl0922/ttyd/releases/download/1.7.7/ttyd.x86_64 -o /usr/local/bin/ttyd &&
    chmod +x /usr/local/bin/ttyd
  " 2>&1 | tail -3
  ok "ttyd installed"

  # ── 5. Create user ──────────────────────────────────────────────────
  info "Creating user '$TTYD_USER'..."
  $exec_cmd "
    useradd -m -s /bin/bash $TTYD_USER 2>/dev/null || true
  " 2>&1 | tail -3
  ok "User created"

  # ── 6. Setup nvm + node for user ────────────────────────────────────
  info "Setting up Node.js for user..."
  $exec_cmd "
    cp -r /root/.nvm /home/$TTYD_USER/.nvm &&
    chown -R $TTYD_USER:$TTYD_USER /home/$TTYD_USER/.nvm
  " 2>&1 | tail -3
  ok "Node.js available for user"

  # ── 7. Configure PATH in .bashrc and .profile ───────────────────────
  info "Configuring PATH..."
  $exec_cmd "
    cat >> /home/$TTYD_USER/.bashrc << 'BASHEOF'

# Node.js PATH
export PATH=\"/home/$TTYD_USER/.nvm/versions/node/$NODE_VERSION/bin:\$PATH\"
export HOME=\"/home/$TTYD_USER\"
BASHEOF

    cat >> /home/$TTYD_USER/.profile << 'PROFEOF'

# Node.js PATH
export PATH=\"/home/$TTYD_USER/.nvm/versions/node/$NODE_VERSION/bin:\$PATH\"
export HOME=\"/home/$TTYD_USER\"
PROFEOF

    chown $TTYD_USER:$TTYD_USER /home/$TTYD_USER/.bashrc /home/$TTYD_USER/.profile
  " 2>&1 | tail -3
  ok "PATH configured"

  # ── 8. Copy SDD config ─────────────────────────────────────────────
  info "Copying SDD config..."
  $exec_cmd "
    mkdir -p /home/$TTYD_USER/.config/opencode &&
    chown -R $TTYD_USER:$TTYD_USER /home/$TTYD_USER/.config
  " 2>&1 | tail -3

  # Copy config files if they exist locally
  local config_dir="${HOME}/.config/opencode"
  if [ -d "$config_dir" ]; then
    for f in opencode.json AGENTS.md tui.json; do
      if [ -f "$config_dir/$f" ]; then
        freestyle vm exec $VM_ID "cat > /home/$TTYD_USER/.config/opencode/$f" < "$config_dir/$f" 2>/dev/null || true
      fi
    done
    for d in skills commands plugins; do
      if [ -d "$config_dir/$d" ]; then
        tar czf - -C "$config_dir" "$d" | freestyle vm exec $VM_ID "tar xzf - -C /home/$TTYD_USER/.config/opencode/" 2>/dev/null || true
      fi
    done
    $exec_cmd "chown -R $TTYD_USER:$TTYD_USER /home/$TTYD_USER/.config" 2>&1 | tail -3
    ok "SDD config copied"
  else
    info "No local config found at $config_dir — skipping copy"
  fi

  # ── 9. Create ttyd start script ─────────────────────────────────────
  info "Creating ttyd start script..."
  $exec_cmd "
    cat > /root/start-terminal.sh << 'SCRIPTEOF'
#!/bin/bash
export PATH=\"/root/.nvm/versions/node/$NODE_VERSION/bin:\$PATH\"
export HOME=\"/root\"
pkill ttyd 2>/dev/null
sleep 1
nohup ttyd --port $TTYD_PORT -W --credential $TTYD_USER:$TTYD_PASS -- su - $TTYD_USER -c 'export PATH=/home/$TTYD_USER/.nvm/versions/node/$NODE_VERSION/bin:\$PATH; echo \"\\n  Welcome to bux. Type opencode to start, or run any bash command.\\n\"; exec bash --login' > /dev/null 2>&1 &
SCRIPTEOF
    chmod +x /root/start-terminal.sh
  " 2>&1 | tail -3
  ok "Start script created"

  # ── 10. Start ttyd ──────────────────────────────────────────────────
  info "Starting ttyd..."
  $exec_cmd "
    pkill ttyd 2>/dev/null || true
    sleep 1
    /root/start-terminal.sh
    sleep 2
    ps aux | grep ttyd | grep -v grep
  " 2>&1 | tail -3
  ok "ttyd running on port $TTYD_PORT"

  # ── 11. Map domain ──────────────────────────────────────────────────
  info "Mapping domain $DOMAIN..."
  freestyle domains map "$DOMAIN" --vm-id "$VM_ID" --vm-port "$TTYD_PORT" 2>&1 | tail -3
  ok "Domain mapped"

  # ── Summary ─────────────────────────────────────────────────────────
  echo ""
  ok "Setup complete!"
  echo ""
  echo "  VM ID:      $VM_ID"
  echo "  Terminal:   https://$DOMAIN/"
  echo "  User:       $TTYD_USER"
  echo "  Password:   $TTYD_PASS"
  echo "  ttyd port:  $TTYD_PORT"
  echo ""
  echo "  Next steps:"
  echo "  1. Set Cloudflare Worker secrets:"
  echo "     echo '$VM_ID' | wrangler secret put VM_ID"
  echo "     echo 'https://$DOMAIN/' | wrangler secret put TERMINAL_URL"
  echo "  2. Deploy Worker: npm run deploy"
  echo ""
}

# ── main ──────────────────────────────────────────────────────────────
case "${1:---all}" in
  --create)    create_vm ;;
  --configure) configure_vm ;;
  --all)       create_vm; configure_vm ;;
  *)
    echo "Usage: $0 [--create|--configure|--all]"
    exit 1
    ;;
esac
