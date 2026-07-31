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

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = getSessionFromHeaders(req);
  const row = await prisma.pOSOrder.findUnique({
    where: { id: params.id },
    include: { items: true, payments: true },
  });
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (session.role !== "admin" && row.tenantId !== session.tenantId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return NextResponse.json(mapOrder(row));
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = getSessionFromHeaders(req);
  const existing = await prisma.pOSOrder.findUnique({ where: { id: params.id }, select: { tenantId: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (session.role !== "admin" && existing.tenantId !== session.tenantId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const { newPayment, ...patch } = body;
  const data: any = { ...patch };
  if (data.status) data.status = toPrismaStatus(data.status);
  if (newPayment) {
    data.payments = { create: { date: new Date(newPayment.date), type: newPayment.type, amount: newPayment.amount, ref: newPayment.ref } };
  }
  const row = await prisma.pOSOrder.update({ where: { id: params.id }, data, include: { items: true, payments: true } });
  return NextResponse.json(mapOrder(row));
}