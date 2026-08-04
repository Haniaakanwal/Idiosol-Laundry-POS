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

  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const fromDate = from ? new Date(`${from}T00:00:00.000Z`) : new Date("1970-01-01T00:00:00.000Z");
  const toDate = to ? new Date(`${to}T23:59:59.999Z`) : new Date("2999-12-31T23:59:59.999Z");

  const orderWhere = { tenantId, date: { gte: fromDate, lte: toDate }, status: { not: "Cancelled" } } as const;

  const [paymentGroups, orderAgg, deliveredItemsAgg] = await Promise.all([
    // Cash/Card/EFT breakdown — payments are dated independently of the order,
    // so this filters on payment date, matching the original page's behavior.
    prisma.pOSPayment.groupBy({
      by: ["type"],
      where: { order: { tenantId }, date: { gte: fromDate, lte: toDate } },
      _sum: { amount: true },
    }),
    prisma.pOSOrder.aggregate({
      where: orderWhere,
      _count: { _all: true },
      _sum: { sub: true, discount: true, tax: true, total: true, paid: true, balance: true },
    }),
    prisma.pOSOrderItem.aggregate({
      where: { order: { tenantId, date: { gte: fromDate, lte: toDate }, status: "Delivered" } },
      _sum: { qty: true },
    }),
  ]);

  const byType = (ty: string) => paymentGroups.find((g) => g.type === ty)?._sum.amount ?? 0;
  const cash = byType("Cash");
  const card = byType("Card");
  const eft = byType("EFT");
  const acp = 0; // no ACP payment type exists in this system yet — kept for parity with the print layout

  return NextResponse.json({
    cash,
    card,
    eft,
    acp,
    cashTotal: cash + card + eft + acp,
    totalOrders: orderAgg._count._all,
    salesAmount: orderAgg._sum.sub ?? 0,
    discount: orderAgg._sum.discount ?? 0,
    tax: orderAgg._sum.tax ?? 0,
    grandTotal: orderAgg._sum.total ?? 0,
    received: orderAgg._sum.paid ?? 0,
    credit: orderAgg._sum.balance ?? 0,
    deliveredItems: deliveredItemsAgg._sum.qty ?? 0,
  });
}