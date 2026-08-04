import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromHeaders } from "@/lib/api-auth";

function toAppStatus(s: string) {
  return s === "JobOrder" ? "Job Order" : s;
}

export async function GET(req: Request) {
  const session = getSessionFromHeaders(req);
  const url = new URL(req.url);
  const requested = url.searchParams.get("tenantId");
  const tenantId = session.role === "admin" ? requested : session.tenantId;
  if (session.role === "staff" && !tenantId) {
    return NextResponse.json({ error: "No tenant on session" }, { status: 403 });
  }
  if (!tenantId) return NextResponse.json({ error: "tenantId required" }, { status: 400 });

  const [totals, statusCounts] = await Promise.all([
    prisma.pOSOrder.aggregate({ where: { tenantId }, _sum: { total: true, paid: true, balance: true }, _count: true }),
    prisma.pOSOrder.groupBy({ by: ["status"], where: { tenantId }, _count: true }),
  ]);

  return NextResponse.json({
    totalOrders: totals._count,
    grossSales: totals._sum.total ?? 0,
    collected: totals._sum.paid ?? 0,
    outstanding: totals._sum.balance ?? 0,
    statusCounts: Object.fromEntries(statusCounts.map((s) => [toAppStatus(s.status), s._count])),
  });
}
