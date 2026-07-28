import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const tenants = await prisma.tenant.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(tenants);
}

export async function POST(req: Request) {
  const body = await req.json();
  const tenant = await prisma.tenant.create({ data: body });
  return NextResponse.json(tenant);
}