export const ROLE_PAGES: Record<string, string[]> = {
  Owner: ["*"],
  Admin: ["*"],
  Manager: ["/pos", "/pos/new", "/pos/orders", "/pos/customers", "/pos/services", "/pos/payments", "/pos/reports"],
  Cashier: ["/pos", "/pos/new", "/pos/orders", "/pos/customers", "/pos/payments"],
  Driver: ["/pos", "/pos/orders"],
};

export function canAccess(role: string, path: string) {
  const allowed = ROLE_PAGES[role] || [];
  if (allowed.includes("*")) return true;
  if (path === "/pos") return true;
  return allowed.some((p) => p !== "/pos" && (path === p || path.startsWith(p + "/")));
}