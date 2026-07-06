import { Resend } from "resend";
import { NextResponse } from "next/server";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  const { email, name, tempPassword, loginUrl } = await req.json();

  await resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to: email,
    subject: "Your account is ready",
    html: `<p>Hi ${name},</p>
           <p>You've been added. Login here: <a href="${loginUrl}">${loginUrl}</a></p>
           <p>Email: ${email}<br/>Temporary password: <b>${tempPassword}</b></p>`,
  });

  return NextResponse.json({ ok: true });
}