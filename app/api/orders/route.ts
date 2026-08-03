import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromHeaders } from "@/lib/api-auth";

function toDateStr(d: any) {
  return d ? new Date(d).toISOString().slice(0, 10) : d;
}
function toPrismaStatus(s: string) {
  return s === "Job Order" ? "JobOrder" : s;
}
function toAppStatus(s: string) {
  return s === "JobOrder" ? "Job Order" : s;
}
function mapOrder(row: any) {
  const { tenantId, items, payments, date, deliveryDate, createdAt, status, ...rest } = row;
  return {
    ...rest,
    status: toAppStatus(status),
    clientId: tenantId,
    date: toDateStr(date),
    deliveryDate: toDateStr(deliveryDate),
    createdAt: toDateStr(createdAt),
    items: items.map(({ orderId, ...it }: any) => it),
    payments: payments.map(({ orderId, date: pdate, ...p }: any) => ({ ...p, date: toDateStr(pdate) })),
  };
}

export async function GET(req: Request) {
  const session = getSessionFromHeaders(req);
  const url = new URL(req.url);
  const requested = url.searchParams.get("tenantId");
  // Staff can only ever see their own tenant's data, regardless of what the
  // query string asks for. Only an admin session can cross tenants.
  const tenantId = session.role === "admin" ? requested : session.tenantId;
  if (session.role === "staff" && !tenantId) {
    return NextResponse.json({ error: "No tenant on session" }, { status: 403 });
  }

  const page = url.searchParams.get("page");

  // Legacy behavior: no `page` param → return everything (dashboard, reports,
  // payments page, and the in-memory store still rely on this).
  if (!page) {
    const rows = await prisma.pOSOrder.findMany({
      where: tenantId ? { tenantId } : undefined,
      include: { items: true, payments: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(rows.map(mapOrder));
  }

  // Real server-side pagination + filtering, used by the Orders list page so
  // it never has to download the tenant's full order history just to show 50 rows.
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit")) || 50));
  const pageNum = Math.max(1, Number(page) || 1);
  const q = url.searchParams.get("q")?.trim();
  const status = url.searchParams.get("status");
  const paid = url.searchParams.get("paid"); // "Paid" | "Balance"
  const delivery = url.searchParams.get("delivery");
  const customerId = url.searchParams.get("customerId");
  const dateFrom = url.searchParams.get("dateFrom");
  const dateTo = url.searchParams.get("dateTo");

  const where: any = { ...(tenantId ? { tenantId } : {}) };
  if (customerId) where.customerId = customerId;
  if (status && status !== "All") where.status = toPrismaStatus(status);
  if (delivery && delivery !== "All") where.deliveryType = delivery;
  if (paid === "Paid") where.balance = { lte: 0 };
  if (paid === "Balance") where.balance = { gt: 0 };
  if (dateFrom || dateTo) {
    where.date = {};
    if (dateFrom) where.date.gte = new Date(dateFrom);
    if (dateTo) where.date.lte = new Date(dateTo);
  }
  if (q) {
    where.OR = [
      { reference: { contains: q, mode: "insensitive" } },
      { customerName: { contains: q, mode: "insensitive" } },
      { customerPhone: { contains: q } },
    ];
  }

  const [rows, total, balanceAgg, statusCounts] = await Promise.all([
    prisma.pOSOrder.findMany({
      where,
      include: { items: true, payments: true },
      orderBy: { createdAt: "desc" },
      skip: (pageNum - 1) * limit,
      take: limit,
    }),
    prisma.pOSOrder.count({ where }),
    prisma.pOSOrder.aggregate({ where, _sum: { balance: true } }),
    prisma.pOSOrder.groupBy({ by: ["status"], where: tenantId ? { tenantId } : undefined, _count: true }),
  ]);

  return NextResponse.json({
    rows: rows.map(mapOrder),
    total,
    totalBalance: balanceAgg._sum.balance ?? 0,
    statusCounts: Object.fromEntries(statusCounts.map((s) => [toAppStatus(s.status), s._count])),
  });
}
export async function POST(req: Request) {
  const session = getSessionFromHeaders(req);
  const body = await req.json();
  const { clientId: bodyClientId, items, payments, date, deliveryDate, status, ...rest } = body;
  const clientId = session.role === "admin" ? bodyClientId : session.tenantId;
  if (!clientId) return NextResponse.json({ error: "No tenant on session" }, { status: 403 });
  const row = await prisma.pOSOrder.create({
    data: {
      ...rest,
      status: toPrismaStatus(status),
      tenantId: clientId,
      date: new Date(date),
      deliveryDate: new Date(deliveryDate),
      items: { create: items.map((it: any) => { const { id, ...itRest } = it; return itRest; }) },
      payments: { create: (payments ?? []).map((p: any) => { const { id, ...pRest } = p; return { ...pRest, date: new Date(pRest.date) }; }) },
    },
    include: { items: true, payments: true },
  });
  return NextResponse.json(mapOrder(row));
}