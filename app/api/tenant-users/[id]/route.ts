import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromHeaders } from "@/lib/api-auth";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = getSessionFromHeaders(req);
  const existing = await prisma.tenantUser.findUnique({ where: { id: params.id }, select: { tenantId: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (session.role !== "admin" && existing.tenantId !== session.tenantId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const user = await prisma.tenantUser.update({ where: { id: params.id }, data: body });
  return NextResponse.json(user);
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = getSessionFromHeaders(req);
  const existing = await prisma.tenantUser.findUnique({ where: { id: params.id }, select: { tenantId: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (session.role !== "admin" && existing.tenantId !== session.tenantId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await prisma.tenantUser.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}