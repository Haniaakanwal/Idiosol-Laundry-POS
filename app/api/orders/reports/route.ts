import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
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

  switch (kind) {
    case "dailyCash": {
      const type = url.searchParams.get("type");
      const payments = await prisma.pOSPayment.findMany({
        where: {
          ...(range ? { date: range } : {}),
          ...(type && type !== "All" ? { type } : {}),
          order: { tenantId },
        },
        include: { order: { select: { reference: true, customerName: true, total: true, tax: true } } },
        orderBy: { date: "asc" },
      });
      let amount = 0, vat = 0, total = 0;
      const rows = payments.map((p) => {
        const vatShare = p.order.total > 0 ? (p.order.tax ?? 0) * (p.amount / p.order.total) : 0;
        amount += p.amount - vatShare;
        vat += vatShare;
        total += p.amount;
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
      });
      return NextResponse.json({ rows, totals: { amount, vat, total } });
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
      const rows = await prisma.pOSOrder.findMany({
        where: { tenantId, ...(range ? { date: range } : {}) },
        include: { items: { select: { qty: true } } },
        orderBy: { date: "asc" },
      });
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
