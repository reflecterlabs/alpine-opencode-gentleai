# Alpine OpenCode + Gentle AI

Minimal Alpine Linux environment with [opencode](https://opencode.ai) and [gentle-ai](https://github.com/Gentleman-Programming/gentle-ai) pre-configured with free-tier models.

## Quick Start

### Local install (Ubuntu/Debian/Arch/Fedora)

```bash
curl -fsSL https://raw.githubusercontent.com/reflecterlabs/alpine-opencode-gentleai/main/setup.sh | bash
```

### Alpine chroot (any host with sudo)

```bash
git clone https://github.com/reflecterlabs/alpine-opencode-gentleai.git
cd alpine-opencode-gentleai
chmod +x alpine-env.sh
./alpine-env.sh
```

## What's Included

| Tool | Version | Purpose |
|------|---------|---------|
| opencode | 1.17.10 | AI coding agent |
| gentle-ai | 1.42.0 | SDD orchestrator + skills |
| engram | latest | Persistent memory |
| gga | latest | Git guardian angel |

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

## Compatibility

- **Direct install**: Ubuntu, Debian, Arch, Fedora, RHEL
- **Alpine chroot**: Any Linux with `sudo` and `curl`

## Scripts

| Script | Description |
|--------|-------------|
| `setup.sh` | Standalone installer for supported distros |
| `alpine-env.sh` | Persistent Alpine chroot with interactive shell |

### alpine-env.sh

```bash
./alpine-env.sh            # setup + enter shell
./alpine-env.sh --setup    # setup only
./alpine-env.sh --destroy  # remove environment
```

## License

MIT
