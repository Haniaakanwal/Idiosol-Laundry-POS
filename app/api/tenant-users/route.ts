import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromHeaders } from "@/lib/api-auth";

export async function GET(req: Request) {
  const session = getSessionFromHeaders(req);
  const users = await prisma.tenantUser.findMany({
    where: session.role === "admin" ? undefined : { tenantId: session.tenantId ?? "__none__" },
    orderBy: { name: "asc" },
    select: {
      id: true,
      tenantId: true,
      name: true,
      email: true,
      role: true,
      department: true,
      status: true,
      lastActive: true,
      username: true,
      moduleOverrides: true,
    },
  });
  return NextResponse.json(users);
}
export async function POST(req: Request) {
  const session = getSessionFromHeaders(req);
  const body = await req.json();
  if (session.role !== "admin" && body.tenantId !== session.tenantId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const user = await prisma.tenantUser.create({ data: body });
    return NextResponse.json(user);
  } catch (err: any) {
    if (err.code === "P2002") {
      return NextResponse.json(
        { error: "That username is already taken for this client. Please choose another." },
        { status: 409 }
      );
    }
    throw err;
  }
}