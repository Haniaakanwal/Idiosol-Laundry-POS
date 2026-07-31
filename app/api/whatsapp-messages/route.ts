import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromHeaders } from "@/lib/api-auth";

export async function GET(req: Request) {
  const session = getSessionFromHeaders(req);
  const requested = new URL(req.url).searchParams.get("tenantId");
  const tenantId = session.role === "admin" ? requested : session.tenantId;
  if (session.role === "staff" && !tenantId) {
    return NextResponse.json({ error: "No tenant on session" }, { status: 403 });
  }
  const rows = await prisma.whatsAppMessage.findMany({ where: tenantId ? { tenantId } : undefined, orderBy: { sentAt: "desc" } });
  const messages = rows.map(({ tenantId, sentAt, ...rest }) => ({ ...rest, clientId: tenantId, sentAt: sentAt.toISOString() }));
  return NextResponse.json(messages);
}

export async function POST(req: Request) {
  const session = getSessionFromHeaders(req);
  const { clientId: bodyClientId, sentAt, ...rest } = await req.json();
  const clientId = session.role === "admin" ? bodyClientId : session.tenantId;
  if (!clientId) return NextResponse.json({ error: "No tenant on session" }, { status: 403 });
  const row = await prisma.whatsAppMessage.create({
    data: { ...rest, tenantId: clientId, sentAt: sentAt ? new Date(sentAt) : undefined },
  });
  const { tenantId, sentAt: rowSentAt, ...msgRest } = row;
  return NextResponse.json({ ...msgRest, clientId: tenantId, sentAt: rowSentAt.toISOString() });
}