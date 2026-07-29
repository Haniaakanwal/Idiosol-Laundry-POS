const encoder = new TextEncoder();

async function getKey() {
  const secret = process.env.SESSION_SECRET || "dev-only-insecure-secret-change-me";
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

function toBase64Url(bytes: ArrayBuffer | Uint8Array) {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let str = "";
  for (const b of arr) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(str: string) {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  const bin = atob(str);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export async function signSession(payload: { id: string; role: "admin" | "staff" }, maxAgeSeconds = 60 * 60 * 24 * 7) {
  const data = { ...payload, exp: Date.now() + maxAgeSeconds * 1000 };
  const json = toBase64Url(encoder.encode(JSON.stringify(data)));
  const key = await getKey();
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(json));
  return `${json}.${toBase64Url(sig)}`;
}

export async function verifySession(token: string | undefined | null): Promise<{ id: string; role: "admin" | "staff" } | null> {
  if (!token) return null;
  const [json, sig] = token.split(".");
  if (!json || !sig) return null;
  const key = await getKey();
  const valid = await crypto.subtle.verify("HMAC", key, fromBase64Url(sig), encoder.encode(json));
  if (!valid) return null;
  try {
    const data = JSON.parse(new TextDecoder().decode(fromBase64Url(json)));
    if (data.exp < Date.now()) return null;
    return { id: data.id, role: data.role };
  } catch {
    return null;
  }
}