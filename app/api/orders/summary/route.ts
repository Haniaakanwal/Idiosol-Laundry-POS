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

  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const where: any = { tenantId };
  if (from || to) {
    where.date = {};
    if (from) where.date.gte = new Date(`${from}T00:00:00.000Z`);
    if (to) where.date.lte = new Date(`${to}T23:59:59.999Z`);
  }

  const wantsLists = url.searchParams.get("include") === "lists";

  const [agg, statusGroups, recentRows, readyRows] = await Promise.all([
    prisma.pOSOrder.aggregate({ where, _sum: { total: true, paid: true, balance: true }, _count: { _all: true } }),
    prisma.pOSOrder.groupBy({ by: ["status"], where, _count: { _all: true } }),
    wantsLists
      ? prisma.pOSOrder.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: 9,
          select: { id: true, reference: true, customerName: true, total: true, status: true },
        })
      : Promise.resolve([]),
    wantsLists
      ? prisma.pOSOrder.findMany({
          where: { ...where, status: "Ready" },
          orderBy: { createdAt: "desc" },
          take: 6,
          select: {
            id: true,
            reference: true,
            customerName: true,
            balance: true,
            _count: { select: { items: true } },
          },
        })
      : Promise.resolve([]),
  ]);

  const statusCounts: Record<string, number> = {};
  for (const g of statusGroups) statusCounts[toAppStatus(g.status)] = g._count._all;

  return NextResponse.json({
    gross: agg._sum.total ?? 0,
    collected: agg._sum.paid ?? 0,
    outstanding: agg._sum.balance ?? 0,
    totalCount: agg._count._all,
    statusCounts,
    ...(wantsLists
      ? {
          recent: recentRows.map((o) => ({ id: o.id, reference: o.reference, customerName: o.customerName, total: o.total, status: toAppStatus(o.status) })),
          ready: readyRows.map((o) => ({ id: o.id, reference: o.reference, customerName: o.customerName, balance: o.balance, itemsCount: o._count.items })),
        }
      : {}),
  });
}