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

export async function GET(req: Request) {
  const tenantId = new URL(req.url).searchParams.get("tenantId");
  const rows = await prisma.pOSCustomer.findMany({
    where: tenantId ? { tenantId } : undefined,
    orderBy: { createdAt: "desc" },
    include: { creditLogs: { orderBy: { date: "desc" } } },
  });
  return NextResponse.json(rows.map(mapCustomer));
}

export async function POST(req: Request) {
  const { clientId, ...rest } = await req.json();
  const row = await prisma.pOSCustomer.create({
    data: { ...rest, tenantId: clientId },
    include: { creditLogs: true },
  });
  return NextResponse.json(mapCustomer(row));
}