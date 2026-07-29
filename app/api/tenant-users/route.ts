import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const users = await prisma.tenantUser.findMany({
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
  const body = await req.json();
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