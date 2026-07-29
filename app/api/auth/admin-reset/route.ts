import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const { email } = await req.json();
  const e = String(email).trim().toLowerCase();
  const admin = await prisma.adminAccount.findFirst({ where: { email: e } });
  if (!admin) return NextResponse.json({ ok: false, error: "No admin account found for that email." }, { status: 404 });

  const tempPassword = Math.random().toString(36).slice(-8);
  await prisma.adminAccount.update({
    where: { id: admin.id },
    data: { passwordHash: bcrypt.hashSync(tempPassword, 10), mustReset: true },
  });
  return NextResponse.json({ ok: true, tempPassword });
}