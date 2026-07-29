import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const { email, newPassword } = await req.json();
  const e = String(email).trim().toLowerCase();
  const admin = await prisma.adminAccount.findFirst({ where: { email: e } });
  if (!admin) return NextResponse.json({ ok: false, error: "No admin account found." }, { status: 404 });

  await prisma.adminAccount.update({
    where: { id: admin.id },
    data: { passwordHash: bcrypt.hashSync(newPassword, 10), mustReset: false },
  });
  return NextResponse.json({ ok: true });
}