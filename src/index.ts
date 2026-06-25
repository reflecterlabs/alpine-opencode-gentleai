import { OpenCodeSandbox } from "./sandbox";
import { getSandbox } from "@cloudflare/sandbox";

export { OpenCodeSandbox as Sandbox };

interface Env {
  Sandbox: any;
  AUTH_PASSWORD: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // ── auth check ──────────────────────────────────────────────────
    const cookie = request.headers.get("Cookie") || "";
    const hasAuth = cookie.includes("auth=ok");

    if (url.pathname === "/login" && request.method === "POST") {
      const form = await request.formData();
      const password = form.get("password");
      if (password === env.AUTH_PASSWORD) {
        return new Response(null, {
          status: 302,
          headers: {
            Location: "/",
            "Set-Cookie": "auth=ok; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=86400",
          },
        });
      }
      return new Response("Invalid password", { status: 401 });
    }

    if (!hasAuth && url.pathname !== "/login") {
      return new Response(loginPage(), {
        headers: { "Content-Type": "text/html" },
      });
    }

    // ── terminal websocket ──────────────────────────────────────────
    if (url.pathname === "/terminal") {
      const sandbox = getSandbox(env.Sandbox, "opencode-session");
      return sandbox.terminal(request, { cols: 120, rows: 40 });
    }

    // ── serve frontend ──────────────────────────────────────────────
    return new Response(htmlPage(), {
      headers: { "Content-Type": "text/html" },
    });
  },
};

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

function htmlPage(): string {
  return `<!DOCTYPE html>
<html><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>OpenCode + Gentle AI</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@xterm/xterm@5.5.0/css/xterm.min.css">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{background:#1a1b26;color:#c0caf5;height:100vh;display:flex;flex-direction:column;font-family:system-ui}
  #bar{padding:8px 16px;background:#16161e;border-bottom:1px solid #292e42;display:flex;align-items:center;gap:12px;font-size:13px}
  #bar .logo{font-weight:600}
  #st{margin-left:auto} #st.ok{color:#9ece6a} #st.err{color:#f7768e} #st.wait{color:#e0af68}
  #terminal{flex:1;padding:4px}
</style></head><body>
<div id="bar"><span class="logo">OpenCode + Gentle AI</span><span id="st" class="wait">Connecting...</span></div>
<div id="terminal"></div>
<script src="https://cdn.jsdelivr.net/npm/@xterm/xterm@5.5.0/lib/xterm.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@xterm/addon-attach@0.11.0/lib/addon-attach.min.js"></script>
<script>
  var term = new Terminal({cursorBlink:true,fontSize:14,theme:{
    background:'#1a1b26',foreground:'#c0caf5',cursor:'#c0caf5',
    black:'#15161e',red:'#f7768e',green:'#9ece6a',yellow:'#e0af68',
    blue:'#7aa2f7',magenta:'#bb9af7',cyan:'#7dcfff',white:'#a9b1d6'}});
  term.open(document.getElementById('terminal'));
  var p = location.protocol==='https:'?'wss:':'ws:';
  var ws = new WebSocket(p+'//'+location.host+'/terminal');
  var addon = new AttachAddon.AttachAddon(ws);
  term.loadAddon(addon);
  ws.onopen=function(){document.getElementById('st').textContent='Connected';document.getElementById('st').className='ok'};
  ws.onclose=function(){document.getElementById('st').textContent='Disconnected';document.getElementById('st').className='err'};

  // resize terminal to fill viewport
  function fit(){
    var el=document.getElementById('terminal');
    if(!el||!term._core)return;
    var d=term._core.renderer._dimensions.css;
    var cols=Math.floor((el.clientWidth-8)/d.cell.width);
    var rows=Math.floor((el.clientHeight-8)/d.cell.height);
    if(cols>0&&rows>0)term.resize(cols,rows);
  }
  window.addEventListener('resize',fit);
  setTimeout(fit,100);
</script></body></html>`;
}
