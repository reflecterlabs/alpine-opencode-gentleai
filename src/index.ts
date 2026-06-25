interface Env {
  AUTH_PASSWORD: string;
  TERMINAL_URL: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // ── auth ─────────────────────────────────────────────────────────
    const cookie = request.headers.get("Cookie") || "";
    const hasAuth = cookie.includes("auth=ok");

    if (url.pathname === "/login" && request.method === "POST") {
      const form = await request.formData();
      const password = form.get("password");
      if (password === env.AUTH_PASSWORD) {
        const terminalUrl = env.TERMINAL_URL || "https://opencode-gentle.style.dev/";
        return new Response(null, {
          status: 302,
          headers: {
            Location: terminalUrl,
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

    // ── serve frontend ───────────────────────────────────────────────
    return new Response(htmlPage(env.TERMINAL_URL), {
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

function htmlPage(terminalUrl: string): string {
  return `<!DOCTYPE html>
<html><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>OpenCode + Gentle AI</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{background:#1a1b26;color:#c0caf5;height:100vh;display:flex;flex-direction:column;font-family:system-ui}
  #bar{padding:8px 16px;background:#16161e;border-bottom:1px solid #292e42;display:flex;align-items:center;gap:12px;font-size:13px}
  #bar .logo{font-weight:600}
  iframe{flex:1;border:none;width:100%}
</style></head><body>
<div id="bar"><span class="logo">OpenCode + Gentle AI</span></div>
<iframe src="${terminalUrl}"></iframe>
</body></html>`;
}
