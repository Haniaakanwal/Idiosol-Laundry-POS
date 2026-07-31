import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromHeaders } from "@/lib/api-auth";

function mapCustomer(row: any) {
  const { tenantId, creditLogs, ...rest } = row;
  return {
    ...rest,
    clientId: tenantId,
    creditLogs: (creditLogs ?? []).map((l: any) => ({ ...l, date: l.date.toISOString().slice(0, 10) })),
  };
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = getSessionFromHeaders(req);
  const existing = await prisma.pOSCustomer.findUnique({ where: { id: params.id }, select: { tenantId: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (session.role !== "admin" && existing.tenantId !== session.tenantId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { clientId, newCreditLog, ...rest } = await req.json();
  const data: any = clientId !== undefined && session.role === "admin" ? { ...rest, tenantId: clientId } : rest;
  if (newCreditLog) {
    data.creditLogs = { create: { type: newCreditLog.type, amount: newCreditLog.amount } };
  }
  const row = await prisma.pOSCustomer.update({
    where: { id: params.id },
    data,
    include: { creditLogs: { orderBy: { date: "desc" } } },
  });
  return NextResponse.json(mapCustomer(row));
}