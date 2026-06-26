# OpenCode + Gentle AI

Web-based terminal with [opencode](https://opencode.ai) and [gentle-ai](https://github.com/Gentleman-Programming/gentle-ai) pre-configured with free-tier models. Runs on Cloudflare Workers + Freestyle.sh VMs.

## Live Demo

> Demo no disponible por el momento.

## Architecture

```
Browser → Cloudflare Worker (auth) → Freestyle VM (ttyd + opencode)
```

- **Worker**: Handles login, redirects to terminal
- **Freestyle VM**: Debian VM running ttyd (web terminal) with opencode
- **Domain**: Freestyle preview domain (*.style.dev) — free, no DNS setup needed
- **Auth**: Password-protected (set via `AUTH_PASSWORD` secret)

## Deploy

### One-click deploy

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button.svg)](https://deploy.workers.cloudflare.com/?url=https://github.com/reflecterlabs/alpine-opencode-gentleai)

After deploy, set your password and Freestyle API key:

```bash
wrangler secret put AUTH_PASSWORD
wrangler secret put FREESTYLE_API_KEY
wrangler secret put TERMINAL_URL  # e.g., https://your-vm.style.dev/
```

### Manual deploy

```bash
git clone https://github.com/reflecterlabs/alpine-opencode-gentleai.git
cd alpine-opencode-gentleai
npm install
wrangler secret put AUTH_PASSWORD
wrangler secret put FREESTYLE_API_KEY
wrangler secret put TERMINAL_URL
wrangler deploy
```

### Set up Freestyle VM (automated)

```bash
# Install Freestyle CLI
npm install -g freestyle

# Set API key
export FREESTYLE_API_KEY="your-key"

# Run setup script
./setup-vm.sh --all
```

### Set up Freestyle VM (manual)

```bash
# Install Freestyle CLI
npm install -g freestyle

# Set API key
export FREESTYLE_API_KEY="your-key"

# Create VM
freestyle vm create --name opencode-gentle

# Install dependencies
freestyle vm exec <vm-id> "curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && apt-get install -y nodejs"
freestyle vm exec <vm-id> "npm install -g opencode-ai"

# Install gentle-ai
freestyle vm exec <vm-id> "curl -sL https://github.com/Gentleman-Programming/gentle-ai/releases/download/v1.42.0/gentle-ai_1.42.0_linux_amd64.tar.gz | tar xz -C /tmp && mv /tmp/gentle-ai /usr/local/bin/gentle-ai && chmod +x /usr/local/bin/gentle-ai"

# Install ttyd
freestyle vm exec <vm-id> "curl -sL https://github.com/tsl0922/ttyd/releases/download/1.7.7/ttyd.x86_64 -o /usr/local/bin/ttyd && chmod +x /usr/local/bin/ttyd"

# Create user and configure
freestyle vm exec <vm-id> "useradd -m -s /bin/bash opencode && su - opencode -c 'export PATH=/home/opencode/.nvm/versions/node/v24.16.0/bin:\$PATH && npm install -g opencode-ai'"

# Start ttyd
freestyle vm exec <vm-id> "nohup ttyd --port 7682 --credential user:pass -- su - opencode -c 'export PATH=/home/opencode/.nvm/versions/node/v24.16.0/bin:\$PATH && exec bash --login' > /dev/null 2>&1 &"

# Map domain
freestyle domains map "your-domain.style.dev" --vm-id <vm-id> --vm-port 7682
```

## Local install (no Cloudflare)

```bash
curl -fsSL https://raw.githubusercontent.com/reflecterlabs/alpine-opencode-gentleai/main/setup.sh | bash
```

## What's Included

| Tool | Purpose |
|------|---------|
| opencode | AI coding agent |
| gentle-ai | SDD orchestrator + skills |
| engram | Persistent memory |
| gga | Git guardian angel |

## SDD Phase Models (free tier)

| Phase | Model |
|-------|-------|
| Orchestrator | MiMo V2.5 |
| Init | Nemotron 3 Ultra (1M ctx) |
| Explore | Big Pickle |
| Propose | Big Pickle |
| Spec | Big Pickle |
| Design | North Mini Code |
| Tasks | North Mini Code |
| Apply | North Mini Code |
| Verify | MiMo V2.5 |
| Archive | DeepSeek V4 Flash |

## Scripts

| Script | Description |
|--------|-------------|
| setup.sh | Standalone installer for Ubuntu/Debian/Arch/Fedora |
| alpine-env.sh | Persistent Alpine chroot with interactive shell |

## License

MIT
