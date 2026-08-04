import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromHeaders } from "@/lib/api-auth";

export async function GET(req: Request) {
  const session = getSessionFromHeaders(req);
  const url = new URL(req.url);
  const requested = url.searchParams.get("tenantId");
  const tenantId = session.role === "admin" ? requested : session.tenantId;
  if (session.role === "staff" && !tenantId) {
    return NextResponse.json({ error: "No tenant on session" }, { status: 403 });
  }
  if (!tenantId) return NextResponse.json({ error: "tenantId required" }, { status: 400 });

  // Two lightweight aggregates instead of loading every order row: an order
  // count per customer (all statuses, matches what the Orders link next to
  // each customer shows) and an outstanding-balance sum per customer that
  // excludes Cancelled orders (matches the old client-side balanceFor()).
  const [counts, balances] = await Promise.all([
    prisma.pOSOrder.groupBy({ by: ["customerId"], where: { tenantId }, _count: { _all: true } }),
    prisma.pOSOrder.groupBy({
      by: ["customerId"],
      where: { tenantId, status: { not: "Cancelled" } },
      _sum: { balance: true },
    }),
  ]);

  const stats: Record<string, { orderCount: number; balance: number }> = {};
  for (const c of counts) stats[c.customerId] = { orderCount: c._count._all, balance: 0 };
  for (const b of balances) {
    const entry = stats[b.customerId] ?? { orderCount: 0, balance: 0 };
    entry.balance = Math.round((b._sum.balance ?? 0) * 100) / 100;
    stats[b.customerId] = entry;
  }

  return NextResponse.json(stats);
}
