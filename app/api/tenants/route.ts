import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromHeaders } from "@/lib/api-auth";

export async function GET() {
  const tenants = await prisma.tenant.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(tenants);
}

export async function POST(req: Request) {
  const session = getSessionFromHeaders(req);
  if (session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const tenant = await prisma.tenant.create({ data: body });
  return NextResponse.json(tenant);
}