interface Env {
  AUTH_PASSWORD: string;
  FREESTYLE_API_KEY: string;
  TERMINAL_URL: string;
  VM_ID: string;
  FRONTEND_URL: string;
}

const FREESTYLE_API = "https://api.freestyle.sh/v1";

async function freestyleRequest(
  apiKey: string,
  path: string,
  method: string = "GET",
  body?: object
): Promise<any> {
  const isPost = method === "POST" || method === "PUT" || method === "PATCH";
  const res = await fetch(`${FREESTYLE_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      ...(isPost ? { "Content-Type": "application/json" } : {}),
    },
    body: isPost ? JSON.stringify(body || {}) : undefined,
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
        const frontendUrl = env.FRONTEND_URL || "https://workstation-center.pages.dev/";
        return new Response(null, {
          status: 302,
          headers: {
            Location: frontendUrl,
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

    // ── API: VM restart (stop + start) ─────────────────────────────────
    if (url.pathname === "/api/vm/restart" && hasAuth && request.method === "POST") {
      try {
        await freestyleRequest(
          env.FREESTYLE_API_KEY,
          `/vms/${env.VM_ID}/stop`,
          "POST"
        );
        await new Promise(r => setTimeout(r, 2000));
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

    // ── authenticated → redirect to frontend ───────────────────────────
    const frontendUrl = env.FRONTEND_URL || "https://workstation-center.pages.dev/";
    return new Response(null, {
      status: 302,
      headers: { Location: frontendUrl },
    });
  },
};

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
