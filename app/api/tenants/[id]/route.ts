import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromHeaders } from "@/lib/api-auth";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = getSessionFromHeaders(req);
  if (session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const tenant = await prisma.tenant.update({ where: { id: params.id }, data: body });
  return NextResponse.json(tenant);
}