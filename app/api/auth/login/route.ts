import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signSession } from "@/lib/session";

export async function POST(req: Request) {
  const { email, password } = await req.json();
  const e = String(email).trim().toLowerCase();

  const admin = await prisma.adminAccount.findFirst({ where: { email: e } });
  if (admin) {
    if (!bcrypt.compareSync(password, admin.passwordHash)) {
      return NextResponse.json({ ok: false, error: "Incorrect password." }, { status: 401 });
    }
    const res = NextResponse.json({
      ok: true,
      session: { role: "admin", name: admin.name, email: admin.email, mustReset: admin.mustReset },
    });
    res.cookies.set("session", await signSession({ id: admin.id, role: "admin" }), {
  httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
    return res;
  }

  const staff = await prisma.tenantUser.findFirst({
    where: { OR: [{ username: { equals: e, mode: "insensitive" } }, { email: { equals: e, mode: "insensitive" } }] },
  });
  if (!staff) return NextResponse.json({ ok: false, error: "No account found." }, { status: 401 });
  if (!bcrypt.compareSync(password, staff.passwordHash)) {
    return NextResponse.json({ ok: false, error: "Incorrect password." }, { status: 401 });
  }
  // ...
  const res = NextResponse.json({
    ok: true,
    session: { role: "staff", tenantId: staff.tenantId, name: staff.name, email: staff.email, userRole: staff.role },
  });
  
  res.cookies.set("session", await signSession({ id: staff.id, role: "staff" }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // <-- FIX HERE: changed hardcoded true to dynamic env check
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  
  return res;
}