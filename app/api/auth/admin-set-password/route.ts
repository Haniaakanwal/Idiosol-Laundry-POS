import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/session";

export async function POST(req: Request) {
  const session = await verifySession(cookies().get("session")?.value);
  if (!session || session.role !== "admin") {
    return NextResponse.json({ ok: false, error: "Not authorized." }, { status: 401 });
  }

  const { newPassword } = await req.json();
  const admin = await prisma.adminAccount.findFirst({ where: { id: session.id } });
  if (!admin) return NextResponse.json({ ok: false, error: "No admin account found." }, { status: 404 });

  await prisma.adminAccount.update({
    where: { id: admin.id },
    data: { passwordHash: bcrypt.hashSync(newPassword, 10), mustReset: false },
  });
  return NextResponse.json({ ok: true });
}