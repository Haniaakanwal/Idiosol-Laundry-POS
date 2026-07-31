import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromHeaders } from "@/lib/api-auth";

export async function GET(req: Request) {
  const session = getSessionFromHeaders(req);
  const requested = new URL(req.url).searchParams.get("tenantId");
  const tenantId = session.role === "admin" ? requested : session.tenantId;
  if (session.role === "staff" && !tenantId) {
    return NextResponse.json({ error: "No tenant on session" }, { status: 403 });
  }
  const rows = await prisma.pOSService.findMany({ where: tenantId ? { tenantId } : undefined });
  const services = rows.map(({ tenantId, ...rest }) => ({ ...rest, clientId: tenantId }));
  return NextResponse.json(services);
}

export async function POST(req: Request) {
  const session = getSessionFromHeaders(req);
  const { clientId: bodyClientId, ...rest } = await req.json();
  const clientId = session.role === "admin" ? bodyClientId : session.tenantId;
  if (!clientId) return NextResponse.json({ error: "No tenant on session" }, { status: 403 });
  const row = await prisma.pOSService.create({ data: { ...rest, tenantId: clientId } });
  const { tenantId, ...serviceRest } = row;
  return NextResponse.json({ ...serviceRest, clientId: tenantId });
}