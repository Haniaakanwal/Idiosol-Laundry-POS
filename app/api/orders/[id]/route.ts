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

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
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