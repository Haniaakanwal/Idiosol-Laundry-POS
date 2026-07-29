import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function mapCustomer(row: any) {
  const { tenantId, creditLogs, ...rest } = row;
  return {
    ...rest,
    clientId: tenantId,
    creditLogs: (creditLogs ?? []).map((l: any) => ({ ...l, date: l.date.toISOString().slice(0, 10) })),
  };
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { clientId, newCreditLog, ...rest } = await req.json();
  const data: any = clientId !== undefined ? { ...rest, tenantId: clientId } : rest;
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