import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromHeaders } from "@/lib/api-auth";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = getSessionFromHeaders(req);
  const existing = await prisma.pOSService.findUnique({ where: { id: params.id }, select: { tenantId: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (session.role !== "admin" && existing.tenantId !== session.tenantId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { clientId, ...rest } = await req.json();
  const data = clientId !== undefined && session.role === "admin" ? { ...rest, tenantId: clientId } : rest;
  const row = await prisma.pOSService.update({ where: { id: params.id }, data });
  const { tenantId, ...serviceRest } = row;
  return NextResponse.json({ ...serviceRest, clientId: tenantId });
}