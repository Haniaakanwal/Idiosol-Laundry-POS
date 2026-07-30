import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  const { email } = await req.json();
  const e = String(email).trim().toLowerCase();
  const admin = await prisma.adminAccount.findFirst({ where: { email: e } });

  // Always return the same response whether or not the account exists —
  // otherwise this endpoint could be used to check which emails are valid admins.
  if (!admin) return NextResponse.json({ ok: true });

  const tempPassword = Math.random().toString(36).slice(-8);
  await prisma.adminAccount.update({
    where: { id: admin.id },
    data: { passwordHash: bcrypt.hashSync(tempPassword, 10), mustReset: true },
  });

  await resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to: admin.email,
    subject: "Your admin password has been reset",
    html: `<p>Hi ${admin.name},</p>
           <p>Your temporary password: <b>${tempPassword}</b></p>
           <p>Login here: <a href="${process.env.NEXT_PUBLIC_APP_URL}/admin-login">${process.env.NEXT_PUBLIC_APP_URL}/admin-login</a></p>`,
  });

  return NextResponse.json({ ok: true });
}