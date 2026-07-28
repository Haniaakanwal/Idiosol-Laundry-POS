import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { clientId, ...rest } = await req.json();
  const data = clientId !== undefined ? { ...rest, tenantId: clientId } : rest;
  const row = await prisma.pOSCustomer.update({ where: { id: params.id }, data });
  const { tenantId, ...customerRest } = row;
  return NextResponse.json({ ...customerRest, clientId: tenantId });
}