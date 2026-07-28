import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json();
  const user = await prisma.tenantUser.update({ where: { id: params.id }, data: body });
  return NextResponse.json(user);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await prisma.tenantUser.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}