import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

export async function GET() {
  const rows = await prisma.pOSOrder.findMany({
    include: { items: true, payments: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(rows.map(mapOrder));
}

export async function POST(req: Request) {
  const body = await req.json();
  const { clientId, items, payments, date, deliveryDate, status, ...rest } = body;
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