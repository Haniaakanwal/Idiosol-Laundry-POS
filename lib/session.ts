import { SignJWT, jwtVerify } from "jose";

const SECRET_KEY = new TextEncoder().encode(
  process.env.SESSION_SECRET || "dev-only-insecure-secret-change-me"
);

export async function signSession(
  payload: { id: string; role: "admin" | "staff"; tenantId?: string },
  maxAgeSeconds = 60 * 60 * 24 * 7
) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${maxAgeSeconds}s`)
    .sign(SECRET_KEY);
}

export async function verifySession(
  token: string | undefined | null
): Promise<{ id: string; role: "admin" | "staff"; tenantId?: string } | null> {
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return {
      id: payload.id as string,
      role: payload.role as "admin" | "staff",
      tenantId: payload.tenantId as string | undefined,
    };
  } catch {
    return null;
  }
}