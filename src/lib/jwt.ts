// Minimal HS-256 JWT — no external dependencies, works in Edge Runtime and Node.js

function strToBase64Url(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function bufToBase64Url(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

function base64UrlToUint8(str: string): Uint8Array<ArrayBuffer> {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded.padEnd(padded.length + (4 - (padded.length % 4)) % 4, "="));
  // Use an explicit ArrayBuffer so TypeScript infers Uint8Array<ArrayBuffer>
  // (not Uint8Array<ArrayBufferLike>), satisfying crypto.subtle's BufferSource type.
  const ab = new ArrayBuffer(raw.length);
  const buf = new Uint8Array(ab);
  for (let i = 0; i < raw.length; i++) buf[i] = raw.charCodeAt(i);
  return buf;
}

async function hmacKey(secret: string, usage: KeyUsage): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    [usage],
  );
}

export async function signJWT(
  payload: Record<string, unknown>,
  secret: string,
): Promise<string> {
  const header = strToBase64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = strToBase64Url(JSON.stringify(payload));
  const msg = `${header}.${body}`;
  const key = await hmacKey(secret, "sign");
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(msg));
  return `${msg}.${bufToBase64Url(sig)}`;
}

export async function verifyJWT(
  token: string,
  secret: string,
): Promise<Record<string, unknown> | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const key = await hmacKey(secret, "verify");
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      base64UrlToUint8(parts[2]),
      new TextEncoder().encode(`${parts[0]}.${parts[1]}`),
    );
    if (!valid) return null;

    const payload = JSON.parse(
      atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")),
    );
    if (typeof payload.exp === "number" && Date.now() / 1000 > payload.exp) return null;

    return payload;
  } catch {
    return null;
  }
}
