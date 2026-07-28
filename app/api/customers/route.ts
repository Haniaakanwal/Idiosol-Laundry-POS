import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const rows = await prisma.pOSCustomer.findMany({ orderBy: { createdAt: "desc" } });
  const customers = rows.map(({ tenantId, ...rest }) => ({ ...rest, clientId: tenantId }));
  return NextResponse.json(customers);
}

export async function POST(req: Request) {
  const { clientId, ...rest } = await req.json();
  const row = await prisma.pOSCustomer.create({ data: { ...rest, tenantId: clientId } });
  const { tenantId, ...customerRest } = row;
  return NextResponse.json({ ...customerRest, clientId: tenantId });
}