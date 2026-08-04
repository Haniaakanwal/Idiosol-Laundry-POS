import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/lib/generated/prisma/client";
import { getSessionFromHeaders } from "@/lib/api-auth";

function toAppStatus(s: string) {
  return s === "JobOrder" ? "Job Order" : s;
}
function toDateStr(d: any) {
  return d ? new Date(d).toISOString().slice(0, 10) : d;
}
function dateRange(from: string | null, to: string | null) {
  const range: any = {};
  if (from) range.gte = new Date(`${from}T00:00:00.000Z`);
  if (to) range.lte = new Date(`${to}T23:59:59.999Z`);
  return Object.keys(range).length ? range : undefined;
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

  const kind = url.searchParams.get("kind");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const range = dateRange(from, to);

  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit")) || 50));
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const skip = (page - 1) * limit;

  switch (kind) {
    case "dailyCash": {
      const type = url.searchParams.get("type");
      const where = {
        ...(range ? { date: range } : {}),
        ...(type && type !== "All" ? { type } : {}),
        order: { tenantId },
      };

      const fromDate = from ? new Date(`${from}T00:00:00.000Z`) : new Date("1970-01-01T00:00:00.000Z");
      const toDate = to ? new Date(`${to}T23:59:59.999Z`) : new Date("2999-12-31T23:59:59.999Z");

      const [rows, total, totalsRaw] = await Promise.all([
        prisma.pOSPayment.findMany({
          where,
          include: { order: { select: { reference: true, customerName: true, total: true, tax: true } } },
          orderBy: { date: "asc" },
          skip,
          take: limit,
        }),
        prisma.pOSPayment.count({ where }),
        // Computed directly in SQL — the DB sums this instead of Node looping
        // over every matching payment, so it stays fast no matter the range size.
        prisma.$queryRaw<{ amount: number | null; vat: number | null; total: number | null }[]>`
          SELECT
            SUM(p.amount - (o.tax * p.amount / NULLIF(o.total, 0))) as amount,
            SUM(o.tax * p.amount / NULLIF(o.total, 0)) as vat,
            SUM(p.amount) as total
          FROM "POSPayment" p
          JOIN "POSOrder" o ON o.id = p."orderId"
          WHERE o."tenantId" = ${tenantId}
            AND p.date BETWEEN ${fromDate} AND ${toDate}
            ${type && type !== "All" ? Prisma.sql`AND p.type = ${type}` : Prisma.empty}
        `,
      ]);

      const rawTotals = totalsRaw[0] ?? { amount: 0, vat: 0, total: 0 };
      const totals = {
        amount: Number(rawTotals.amount ?? 0),
        vat: Number(rawTotals.vat ?? 0),
        total: Number(rawTotals.total ?? 0),
      };

      return NextResponse.json({
        rows: rows.map((p) => {
          const vatShare = p.order.total > 0 ? (p.order.tax ?? 0) * (p.amount / p.order.total) : 0;
          return {
            id: p.id,
            ref: p.ref,
            orderReference: p.order.reference,
            date: toDateStr(p.date),
            customerName: p.order.customerName,
            type: p.type,
            amount: p.amount,
            vatShare,
          };
        }),
        total,
        totals,
      });
    }

    case "receiving": {
      const serviceType = url.searchParams.get("serviceType");
      const items = await prisma.pOSOrderItem.groupBy({
        by: ["serviceType", "serviceName"],
        where: {
          order: { tenantId, ...(range ? { date: range } : {}) },
          ...(serviceType && serviceType !== "All" ? { serviceType } : {}),
        },
        _sum: { qty: true },
      });
      const groupMap = new Map<string, { serviceType: string; label: string; qty: number }[]>();
      let total = 0;
      for (const it of items) {
        const qty = it._sum.qty ?? 0;
        total += qty;
        const label = `${it.serviceName}-${it.serviceType}`;
        if (!groupMap.has(it.serviceType)) groupMap.set(it.serviceType, []);
        groupMap.get(it.serviceType)!.push({ serviceType: it.serviceType, label, qty });
      }
      const groups = Array.from(groupMap.entries()).map(([serviceType, entries]) => ({ serviceType, items: entries }));
      return NextResponse.json({ groups, total });
    }

    case "jobOrder": {
      const where = { tenantId, ...(range ? { date: range } : {}) };
      const [rows, total] = await Promise.all([
        prisma.pOSOrder.findMany({
          where,
          include: { items: { select: { qty: true } } },
          orderBy: { date: "asc" },
          skip,
          take: limit,
        }),
        prisma.pOSOrder.count({ where }),
      ]);
      return NextResponse.json({
        rows: rows.map((o) => ({
          id: o.id,
          reference: o.reference,
          date: toDateStr(o.date),
          customerName: o.customerName,
          status: toAppStatus(o.status),
          itemsQty: o.items.reduce((s, it) => s + it.qty, 0),
          total: o.total,
          paid: o.paid,
          balance: o.balance,
        })),
        total,
      });
    }

    case "topServices": {
      const items = await prisma.pOSOrderItem.groupBy({
        by: ["serviceName"],
        where: { order: { tenantId, ...(range ? { date: range } : {}) } },
        _sum: { qty: true },
      });
      const sorted = items
        .map((it) => [it.serviceName, it._sum.qty ?? 0] as [string, number])
        .sort((a, b) => b[1] - a[1]);
      return NextResponse.json({ items: sorted });
    }

    case "vat": {
      const where = { tenantId, ...(range ? { date: range } : {}), tax: { gt: 0 } };
      const [rows, agg] = await Promise.all([
        prisma.pOSOrder.findMany({ where, orderBy: { date: "asc" } }),
        prisma.pOSOrder.aggregate({ where, _sum: { sub: true, discount: true, tax: true, total: true } }),
      ]);
      return NextResponse.json({
        rows: rows.map((o) => ({
          id: o.id,
          reference: o.reference,
          date: toDateStr(o.date),
          customerName: o.customerName,
          sub: o.sub,
          discount: o.discount,
          taxRate: o.taxRate ?? 0,
          tax: o.tax ?? 0,
          total: o.total,
        })),
        totals: {
          taxable: (agg._sum.sub ?? 0) - (agg._sum.discount ?? 0),
          vat: agg._sum.tax ?? 0,
          total: agg._sum.total ?? 0,
        },
      });
    }

    default:
      return NextResponse.json({ error: "Unknown report kind" }, { status: 400 });
  }
}