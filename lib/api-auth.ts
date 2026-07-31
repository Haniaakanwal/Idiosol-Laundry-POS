// Reads the identity middleware.ts already verified and attached as headers.
// Route handlers use this instead of trusting tenantId/clientId from the
// request body or query string, which the client fully controls.
export function getSessionFromHeaders(req: Request) {
  return {
    id: req.headers.get("x-session-id"),
    role: req.headers.get("x-session-role") as "admin" | "staff" | null,
    tenantId: req.headers.get("x-session-tenant-id"),
  };
}
