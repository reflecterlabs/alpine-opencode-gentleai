#!/usr/bin/env bash
set -euo pipefail

# ── helpers ──────────────────────────────────────────────────────────
info()  { printf "\033[1;34m➜\033[0m %s\n" "$*"; }
ok()    { printf "\033[1;32m✓\033[0m %s\n" "$*"; }
err()   { printf "\033[1;31m✗\033[0m %s\n" "$*" >&2; }
ask()   { printf "\033[1;33m?\033[0m %s " "$*"; }

GENTLE_VERSION="${GENTLE_VERSION:-v1.42.0}"
INSTALL_DIR="${INSTALL_DIR:-$HOME/.local/bin}"

# ── fun_opencode_install ─────────────────────────────────────────────
fun_opencode_install() {
  info "Installing opencode..."
  curl -fsSL https://opencode.ai/install | bash
  ok "opencode installed."
}

# ── fun_gentleai_binary ──────────────────────────────────────────────
fun_gentleai_binary() {
  info "Installing gentle-ai via official install script..."
  curl -fsSL https://raw.githubusercontent.com/Gentleman-Programming/gentle-ai/main/scripts/install.sh | bash
  ok "gentle-ai binary installed."
}

# ── fun_gentleai_install ─────────────────────────────────────────────
fun_gentleai_install() {
  CONFIG_DIR="${CONFIG_DIR:-$HOME/.config/opencode}"
  SCOPE="${SCOPE:-global}"
  AGENTS="${AGENTS:-opencode}"
  CHANNEL="${CHANNEL:-stable}"
  PRESET="${PRESET:-full-gentleman}"

  # install binary if missing
  if ! command -v gentle-ai &>/dev/null; then
    fun_gentleai_binary
  fi

  # dry-run
  info "Previsualizando plan..."
  gentle-ai install \
    --agents "$AGENTS" --scope "$SCOPE" \
    --channel "$CHANNEL" --preset "$PRESET" --dry-run 2>&1
  echo ""

  # install
  gentle-ai install \
    --agents "$AGENTS" --scope "$SCOPE" \
    --channel "$CHANNEL" --preset "$PRESET" 2>&1
  echo ""

  # configure models per SDD phase
  OPENCODE_JSON="$CONFIG_DIR/opencode.json"
  if [ ! -f "$OPENCODE_JSON" ]; then
    err "opencode.json not found at $OPENCODE_JSON"
    return 1
  fi

  info "Configurando modelos por fase SDD..."
  declare -A MODEL_MAP=(
    [gentle-orchestrator]="opencode/mimo-v2.5-free"
    [sdd-init]="opencode/nemotron-3-ultra-free"
    [sdd-onboard]="opencode/mimo-v2.5-free"
    [sdd-explore]="opencode/big-pickle"
    [sdd-propose]="opencode/big-pickle"
    [sdd-spec]="opencode/big-pickle"
    [sdd-design]="opencode/north-mini-code-free"
    [sdd-tasks]="opencode/north-mini-code-free"
    [sdd-apply]="opencode/north-mini-code-free"
    [sdd-verify]="opencode/mimo-v2.5-free"
    [sdd-archive]="opencode/deepseek-v4-flash-free"
  )

  for agent in "${!MODEL_MAP[@]}"; do
    model="${MODEL_MAP[$agent]}"
    if jq -e ".agent.\"$agent\"" "$OPENCODE_JSON" > /dev/null 2>&1; then
      tmp=$(mktemp)
      jq ".agent.\"$agent\".model = \"$model\"" "$OPENCODE_JSON" > "$tmp" \
        && mv "$tmp" "$OPENCODE_JSON"
      ok "$agent → $model"
    fi
  done

  echo ""
  ok "gentle-ai configurado."
}

# ── main ─────────────────────────────────────────────────────────────
main() {
  cat <<'EOF'
╔══════════════════════════════════════════╗
║       gentle-ai + opencode setup         ║
╚══════════════════════════════════════════╝
EOF
  echo ""

  # install opencode if missing
  if command -v opencode &>/dev/null; then
    ok "opencode already installed: $(opencode --version 2>/dev/null || echo 'unknown')"
  else
    fun_opencode_install
  fi
  echo ""

  # install gentle-ai binary + agent config + model config
  fun_gentleai_install
  echo ""

  # verify
  info "Verificando..."
  opencode --version 2>/dev/null && ok "opencode OK" || err "opencode not found"
  "$INSTALL_DIR/gentle-ai" doctor 2>/dev/null && ok "gentle-ai OK" || err "gentle-ai doctor failed"
  echo ""

  ok "Setup completo."
  info "Reiniciá opencode para aplicar los cambios."
}

main "$@"
