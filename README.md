# OpenCode + Gentle AI

Web-based terminal with [opencode](https://opencode.ai) and [gentle-ai](https://github.com/Gentleman-Programming/gentle-ai) pre-configured with free-tier models. Runs on Cloudflare Sandboxes.

## Deploy

### One-click deploy

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button.svg)](https://deploy.workers.cloudflare.com/?url=https://github.com/reflecterlabs/alpine-opencode-gentleai)

After deploy, set your password:

```bash
wrangler secret put AUTH_PASSWORD
```

### Manual deploy

```bash
git clone https://github.com/reflecterlabs/alpine-opencode-gentleai.git
cd alpine-opencode-gentleai
npm install
wrangler secret put AUTH_PASSWORD   # set a password
wrangler deploy
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

## Architecture

```
Browser → xterm.js → WebSocket → Cloudflare Worker → Sandbox Container
                                                          ├── opencode
                                                          ├── gentle-ai
                                                          └── bash (persistent)
```

- **Sandbox**: Debian container with opencode + gentle-ai installed on first boot
- **Terminal**: xterm.js over WebSocket, real PTY
- **Auth**: Password-protected (set via `AUTH_PASSWORD` secret)
- **State**: Persistent across requests (same sandbox ID)

## Scripts

| Script | Description |
|--------|-------------|
| `setup.sh` | Standalone installer for Ubuntu/Debian/Arch/Fedora |
| `alpine-env.sh` | Persistent Alpine chroot with interactive shell |

## License

MIT
