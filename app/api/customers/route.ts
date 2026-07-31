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

export async function GET(req: Request) {
  const session = getSessionFromHeaders(req);
  const requested = new URL(req.url).searchParams.get("tenantId");
  const tenantId = session.role === "admin" ? requested : session.tenantId;
  if (session.role === "staff" && !tenantId) {
    return NextResponse.json({ error: "No tenant on session" }, { status: 403 });
  }
  const rows = await prisma.pOSCustomer.findMany({
    where: tenantId ? { tenantId } : undefined,
    orderBy: { createdAt: "desc" },
    include: { creditLogs: { orderBy: { date: "desc" } } },
  });
  return NextResponse.json(rows.map(mapCustomer));
}

export async function POST(req: Request) {
  const session = getSessionFromHeaders(req);
  const { clientId: bodyClientId, ...rest } = await req.json();
  const clientId = session.role === "admin" ? bodyClientId : session.tenantId;
  if (!clientId) return NextResponse.json({ error: "No tenant on session" }, { status: 403 });
  const row = await prisma.pOSCustomer.create({
    data: { ...rest, tenantId: clientId },
    include: { creditLogs: true },
  });
  return NextResponse.json(mapCustomer(row));
}