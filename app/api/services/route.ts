import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const rows = await prisma.pOSService.findMany();
  const services = rows.map(({ tenantId, ...rest }) => ({ ...rest, clientId: tenantId }));
  return NextResponse.json(services);
}

export async function POST(req: Request) {
  const { clientId, ...rest } = await req.json();
  const row = await prisma.pOSService.create({ data: { ...rest, tenantId: clientId } });
  const { tenantId, ...serviceRest } = row;
  return NextResponse.json({ ...serviceRest, clientId: tenantId });
}