import { Sandbox } from "@cloudflare/sandbox";

export class OpenCodeSandbox extends Sandbox {
  // Install opencode + gentle-ai on first boot
  async onStart() {
    await this.exec("bash", [
      "-c",
      `
      # skip if already installed
      if command -v opencode &>/dev/null && command -v gentle-ai &>/dev/null; then
        echo "Already installed, skipping..."
        exit 0
      fi

      echo "=== Installing dependencies ==="
      apt-get update -qq && apt-get install -y -qq curl git jq > /dev/null 2>&1

      echo "=== Installing Node.js ==="
      curl -fsSL https://deb.nodesource.com/setup_22.x | bash - > /dev/null 2>&1
      apt-get install -y -qq nodejs > /dev/null 2>&1

      echo "=== Installing opencode ==="
      curl -fsSL https://opencode.ai/install | bash > /dev/null 2>&1

      echo "=== Installing gentle-ai ==="
      curl -fsSL https://raw.githubusercontent.com/Gentleman-Programming/gentle-ai/main/scripts/install.sh | bash > /dev/null 2>&1

      echo "=== Installing Go ==="
      curl -fsSL https://go.dev/dl/go1.23.9.linux-amd64.tar.gz | tar -C /usr/local -xzf - > /dev/null 2>&1
      export PATH=/usr/local/go/bin:\$PATH

      echo "=== Configuring gentle-ai ==="
      export PATH=/root/.opencode/bin:/usr/local/bin:/root/go/bin:\$PATH
      gentle-ai install --agents opencode --scope global --channel stable --preset full-gentleman > /dev/null 2>&1 || true

      echo "=== Done ==="
      `,
    ]);
  }
}
