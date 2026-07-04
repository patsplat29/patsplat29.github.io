// functions/api/login.js
//
// Cloudflare Pages Function — verifies the owner passphrase server-side.
// Requires an environment variable "OWNER_PASSPHRASE" set in Pages settings
// (Settings -> Environment variables -> add as a Secret, not plaintext).

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

export async function onRequestPost({ request, env }) {
  try {
    const { passphrase } = await request.json();
    const ok = !!env.OWNER_PASSPHRASE && passphrase === env.OWNER_PASSPHRASE;
    return jsonResponse({ ok });
  } catch (err) {
    return jsonResponse({ ok: false, error: "Bad request" }, 400);
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
