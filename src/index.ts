interface Env {
  AUTH_PASSWORD: string;
  FREESTYLE_API_KEY: string;
  TERMINAL_URL: string;
  VM_ID: string;
}

const FREESTYLE_API = "https://api.freestyle.sh/v1";

async function freestyleRequest(
  apiKey: string,
  path: string,
  method: string = "GET",
  body?: object
): Promise<any> {
  const res = await fetch(`${FREESTYLE_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Freestyle API ${res.status}: ${text}`);
  }
  return res.json();
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const cookie = request.headers.get("Cookie") || "";
    const hasAuth = cookie.includes("auth=ok");

    // ── login ──────────────────────────────────────────────────────────
    if (url.pathname === "/login" && request.method === "POST") {
      const form = await request.formData();
      const password = form.get("password");
      if (password === env.AUTH_PASSWORD) {
        return new Response(null, {
          status: 302,
          headers: {
            Location: "/",
            "Set-Cookie":
              "auth=ok; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=86400",
          },
        });
      }
      return new Response("Invalid password", { status: 401 });
    }

    // ── logout ─────────────────────────────────────────────────────────
    if (url.pathname === "/logout") {
      return new Response(null, {
        status: 302,
        headers: {
          Location: "/",
          "Set-Cookie": "auth=; Path=/; Max-Age=0",
        },
      });
    }

    // ── API: VM status ─────────────────────────────────────────────────
    if (url.pathname === "/api/vm/status" && hasAuth) {
      try {
        const data = await freestyleRequest(
          env.FREESTYLE_API_KEY,
          `/vms/${env.VM_ID}`
        );
        return Response.json(data);
      } catch (e: any) {
        return Response.json({ error: e.message }, { status: 500 });
      }
    }

    // ── API: VM start ──────────────────────────────────────────────────
    if (url.pathname === "/api/vm/start" && hasAuth && request.method === "POST") {
      try {
        const data = await freestyleRequest(
          env.FREESTYLE_API_KEY,
          `/vms/${env.VM_ID}/start`,
          "POST"
        );
        return Response.json(data);
      } catch (e: any) {
        return Response.json({ error: e.message }, { status: 500 });
      }
    }

    // ── API: VM stop ───────────────────────────────────────────────────
    if (url.pathname === "/api/vm/stop" && hasAuth && request.method === "POST") {
      try {
        const data = await freestyleRequest(
          env.FREESTYLE_API_KEY,
          `/vms/${env.VM_ID}/stop`,
          "POST"
        );
        return Response.json(data);
      } catch (e: any) {
        return Response.json({ error: e.message }, { status: 500 });
      }
    }

    // ── API: VM restart ────────────────────────────────────────────────
    if (url.pathname === "/api/vm/restart" && hasAuth && request.method === "POST") {
      try {
        const data = await freestyleRequest(
          env.FREESTYLE_API_KEY,
          `/vms/${env.VM_ID}/restart`,
          "POST"
        );
        return Response.json(data);
      } catch (e: any) {
        return Response.json({ error: e.message }, { status: 500 });
      }
    }

    // ── API: list all VMs ──────────────────────────────────────────────
    if (url.pathname === "/api/vms" && hasAuth) {
      try {
        const data = await freestyleRequest(env.FREESTYLE_API_KEY, "/vms");
        return Response.json(data);
      } catch (e: any) {
        return Response.json({ error: e.message }, { status: 500 });
      }
    }

    // ── unauthenticated → login page ───────────────────────────────────
    if (!hasAuth) {
      return new Response(loginPage(), {
        headers: { "Content-Type": "text/html" },
      });
    }

    // ── authenticated → dashboard ──────────────────────────────────────
    const terminalUrl = env.TERMINAL_URL || "https://opencode-gentle.style.dev/";
    const vmId = env.VM_ID || "";
    return new Response(dashboardPage(terminalUrl, vmId), {
      headers: { "Content-Type": "text/html" },
    });
  },
};

// ── Dashboard ───────────────────────────────────────────────────────────
function dashboardPage(terminalUrl: string, vmId: string): string {
  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>OpenCode + Gentle AI</title>
<style>
  :root {
    --bg: #1a1b26; --bg2: #16161e; --border: #292e42;
    --fg: #c0caf5; --dim: #565f89; --accent: #7aa2f7;
    --green: #9ece6a; --red: #f7768e; --yellow: #e0af68;
  }
  * { margin:0; padding:0; box-sizing:border-box; }
  body { background:var(--bg); color:var(--fg); font-family:system-ui,sans-serif;
         height:100vh; display:flex; flex-direction:column; overflow:hidden; }

  /* ── header ─────────────────────────────────────────────── */
  header { display:flex; align-items:center; gap:12px; padding:8px 16px;
           background:var(--bg2); border-bottom:1px solid var(--border); flex-shrink:0; }
  header h1 { font-size:14px; font-weight:600; white-space:nowrap; }
  .vm-badge { font-size:11px; padding:2px 8px; border-radius:4px; font-weight:600; }
  .vm-badge.running { background:rgba(158,206,106,.15); color:var(--green); }
  .vm-badge.stopped { background:rgba(247,118,142,.15); color:var(--red); }
  .vm-badge.unknown { background:rgba(224,176,104,.15); color:var(--yellow); }
  .spacer { flex:1; }
  .header-btn { background:var(--border); border:1px solid var(--border); color:var(--fg);
                padding:4px 10px; border-radius:4px; font-size:11px; cursor:pointer; }
  .header-btn:hover { border-color:var(--accent); color:var(--accent); }
  .header-btn.danger:hover { border-color:var(--red); color:var(--red); }
  .header-btn:disabled { opacity:.4; cursor:default; }

  /* ── main layout ────────────────────────────────────────── */
  .main { display:flex; flex:1; overflow:hidden; }

  /* ── sidebar ────────────────────────────────────────────── */
  .sidebar { width:220px; background:var(--bg2); border-right:1px solid var(--border);
             display:flex; flex-direction:column; padding:12px; gap:8px; flex-shrink:0; }
  .sidebar h2 { font-size:11px; text-transform:uppercase; letter-spacing:1px;
                color:var(--dim); margin-bottom:4px; }
  .vm-controls { display:flex; flex-direction:column; gap:6px; }
  .vm-btn { background:var(--border); border:1px solid var(--border); color:var(--fg);
            padding:8px 12px; border-radius:4px; font-size:12px; cursor:pointer;
            text-align:left; display:flex; align-items:center; gap:8px; }
  .vm-btn:hover { border-color:var(--accent); }
  .vm-btn:disabled { opacity:.4; cursor:default; }
  .vm-btn .icon { font-size:14px; width:18px; text-align:center; }
  .vm-btn.green:hover { border-color:var(--green); color:var(--green); }
  .vm-btn.red:hover { border-color:var(--red); color:var(--red); }
  .vm-btn.yellow:hover { border-color:var(--yellow); color:var(--yellow); }
  .vm-info { font-size:11px; color:var(--dim); line-height:1.6; margin-top:8px; }
  .vm-info span { color:var(--fg); }
  .divider { border-top:1px solid var(--border); margin:8px 0; }
  .session-info { font-size:11px; color:var(--dim); line-height:1.6; }
  .session-info span { color:var(--fg); }

  /* ── terminal area ──────────────────────────────────────── */
  .terminal-wrap { flex:1; position:relative; overflow:hidden; }
  .terminal-wrap iframe { width:100%; height:100%; border:none; }
  .terminal-overlay { position:absolute; inset:0; background:var(--bg);
                      display:flex; align-items:center; justify-content:center;
                      flex-direction:column; gap:12px; }
  .terminal-overlay.hidden { display:none; }
  .spinner { width:24px; height:24px; border:3px solid var(--border);
             border-top-color:var(--accent); border-radius:50%; animation:spin .8s linear infinite; }
  @keyframes spin { to { transform:rotate(360deg); } }
  .overlay-text { font-size:13px; color:var(--dim); }
  .overlay-text .error { color:var(--red); }
</style>
</head><body>

<header>
  <h1>opencode + gentle ai</h1>
  <span id="vmBadge" class="vm-badge unknown">checking…</span>
  <div class="spacer"></div>
  <button class="header-btn" onclick="refreshStatus()" title="Refresh status">↻</button>
  <button class="header-btn danger" onclick="location.href='/logout'" title="Logout">✕</button>
</header>

<div class="main">
  <aside class="sidebar">
    <h2>VM Controls</h2>
    <div class="vm-controls">
      <button class="vm-btn green" id="btnStart" onclick="vmAction('start')" disabled>
        <span class="icon">▶</span> Start
      </button>
      <button class="vm-btn red" id="btnStop" onclick="vmAction('stop')" disabled>
        <span class="icon">■</span> Stop
      </button>
      <button class="vm-btn yellow" id="btnRestart" onclick="vmAction('restart')" disabled>
        <span class="icon">↻</span> Restart
      </button>
    </div>

    <div class="divider"></div>
    <h2>VM Info</h2>
    <div class="vm-info" id="vmInfo">Loading…</div>

    <div class="divider"></div>
    <h2>Session</h2>
    <div class="session-info">
      <div>Terminal: <span id="termStatus">connecting…</span></div>
      <div>VM: <span id="vmIdDisplay">${vmId}</span></div>
    </div>
  </aside>

  <div class="terminal-wrap">
    <div class="terminal-overlay" id="overlay">
      <div class="spinner"></div>
      <div class="overlay-text" id="overlayText">Connecting to terminal…</div>
    </div>
    <iframe id="termFrame" src="${terminalUrl}"
            allow="clipboard-read; clipboard-write"
            onload="onFrameLoad()" onerror="onFrameError()"></iframe>
  </div>
</div>

<script>
  let vmStatus = 'unknown';

  async function refreshStatus() {
    try {
      const res = await fetch('/api/vm/status');
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      vmStatus = data.status || 'unknown';
      updateUI(data);
    } catch (e) {
      vmStatus = 'unknown';
      document.getElementById('vmBadge').className = 'vm-badge unknown';
      document.getElementById('vmBadge').textContent = 'unknown';
      document.getElementById('vmInfo').innerHTML = '<span class="error">' + e.message + '</span>';
    }
  }

  function updateUI(data) {
    const badge = document.getElementById('vmBadge');
    badge.className = 'vm-badge ' + (data.status === 'running' ? 'running' : 'stopped');
    badge.textContent = data.status || 'unknown';

    const info = document.getElementById('vmInfo');
    const lines = [];
    if (data.name) lines.push('Name: <span>' + data.name + '</span>');
    if (data.region) lines.push('Region: <span>' + data.region + '</span>');
    if (data.vcpu) lines.push('vCPU: <span>' + data.vcpu + '</span>');
    if (data.memory_mb) lines.push('RAM: <span>' + data.memory_mb + ' MB</span>');
    if (data.rootfs_gb) lines.push('Disk: <span>' + data.rootfs_gb + ' GB</span>');
    if (data.created_at) lines.push('Created: <span>' + new Date(data.created_at).toLocaleDateString() + '</span>');
    info.innerHTML = lines.join('<br>') || '<span>No data</span>';

    document.getElementById('btnStart').disabled = data.status === 'running';
    document.getElementById('btnStop').disabled = data.status !== 'running';
    document.getElementById('btnRestart').disabled = data.status !== 'running';
  }

  async function vmAction(action) {
    const btn = document.getElementById('btn' + action.charAt(0).toUpperCase() + action.slice(1));
    btn.disabled = true;
    btn.textContent = '⏳ Working…';
    try {
      const res = await fetch('/api/vm/' + action, { method: 'POST' });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setTimeout(refreshStatus, 2000);
    } catch (e) {
      alert('Error: ' + e.message);
      refreshStatus();
    }
  }

  function onFrameLoad() {
    document.getElementById('overlay').classList.add('hidden');
    document.getElementById('termStatus').textContent = 'connected';
    document.getElementById('termStatus').style.color = 'var(--green)';
  }

  function onFrameError() {
    document.getElementById('overlayText').innerHTML =
      '<span class="error">Failed to connect. Is the VM running?</span>';
  }

  // init
  refreshStatus();
  setInterval(refreshStatus, 30000);
</script>
</body></html>`;
}

// ── Login page ──────────────────────────────────────────────────────────
function loginPage(): string {
  return `<!DOCTYPE html>
<html><head><title>Login</title>
<style>
  body{margin:0;height:100vh;display:flex;align-items:center;justify-content:center;
       background:#1a1b26;color:#c0caf5;font-family:system-ui}
  form{background:#16161e;padding:32px;border-radius:8px;border:1px solid #292e42;width:300px}
  h2{margin-bottom:16px;font-size:18px}
  input{width:100%;padding:8px 12px;background:#1a1b26;border:1px solid #292e42;
        border-radius:4px;color:#c0caf5;font-size:14px;margin-bottom:12px}
  button{width:100%;padding:8px;background:#7aa2f7;color:#1a1b26;border:none;
         border-radius:4px;font-size:14px;cursor:pointer;font-weight:600}
</style></head><body>
<form method="POST" action="/login">
  <h2>OpenCode + Gentle AI</h2>
  <input type="password" name="password" placeholder="Password" autofocus>
  <button type="submit">Enter</button>
</form></body></html>`;
}
