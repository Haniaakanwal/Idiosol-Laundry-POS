import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const tenantId = new URL(req.url).searchParams.get("tenantId");
  const rows = await prisma.pOSService.findMany({ where: tenantId ? { tenantId } : undefined });
  const services = rows.map(({ tenantId, ...rest }) => ({ ...rest, clientId: tenantId }));
  return NextResponse.json(services);
}

export async function POST(req: Request) {
  const { clientId, ...rest } = await req.json();
  const row = await prisma.pOSService.create({ data: { ...rest, tenantId: clientId } });
  const { tenantId, ...serviceRest } = row;
  return NextResponse.json({ ...serviceRest, clientId: tenantId });
}