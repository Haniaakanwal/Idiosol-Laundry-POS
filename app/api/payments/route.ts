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

  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit")) || 50));
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const type = url.searchParams.get("type");

  const where: any = { order: { tenantId } };
  if (type && type !== "all") where.type = type;

  const [rows, total, sumAgg] = await Promise.all([
    prisma.pOSPayment.findMany({
      where,
      include: { order: { select: { id: true, reference: true, customerName: true } } },
      orderBy: { date: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.pOSPayment.count({ where }),
    prisma.pOSPayment.aggregate({ where, _sum: { amount: true } }),
  ]);

  return NextResponse.json({
    rows: rows.map((r) => ({
      id: r.id,
      ref: r.ref,
      date: r.date.toISOString().slice(0, 10),
      type: r.type,
      amount: r.amount,
      order: r.order,
    })),
    total,
    totalAmount: sumAgg._sum.amount ?? 0,
  });
}