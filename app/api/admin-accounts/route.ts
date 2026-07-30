import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/session";

const resend = new Resend(process.env.RESEND_API_KEY);

async function requireAdmin() {
  const session = await verifySession(cookies().get("session")?.value);
  return session?.role === "admin" ? session : null;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Not authorized." }, { status: 401 });

  const admins = await prisma.adminAccount.findMany({
    select: { id: true, email: true, name: true, mustReset: true },
    orderBy: { email: "asc" },
  });
  return NextResponse.json(admins);
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Not authorized." }, { status: 401 });

  const { email, name } = await req.json();
  const e = String(email).trim().toLowerCase();

  const existing = await prisma.adminAccount.findFirst({ where: { email: e } });
  if (existing) return NextResponse.json({ error: "An admin with that email already exists." }, { status: 409 });

  const tempPassword = Math.random().toString(36).slice(-8);
  await prisma.adminAccount.create({
    data: { email: e, name, passwordHash: bcrypt.hashSync(tempPassword, 10), mustReset: true },
  });

  await resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to: e,
    subject: "You've been added as a LaundryPOS admin",
    html: `<p>Hi ${name},</p>
           <p>You've been added as a platform admin.</p>
           <p>Email: ${e}<br/>Temporary password: <b>${tempPassword}</b></p>
           <p>Login here: <a href="${process.env.NEXT_PUBLIC_APP_URL}/admin-login">${process.env.NEXT_PUBLIC_APP_URL}/admin-login</a></p>`,
  });

  return NextResponse.json({ ok: true });
}