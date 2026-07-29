import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const rows = await prisma.whatsAppMessage.findMany({ orderBy: { sentAt: "desc" } });
  const messages = rows.map(({ tenantId, sentAt, ...rest }) => ({ ...rest, clientId: tenantId, sentAt: sentAt.toISOString() }));
  return NextResponse.json(messages);
}

export async function POST(req: Request) {
  const { clientId, sentAt, ...rest } = await req.json();
  const row = await prisma.whatsAppMessage.create({
    data: { ...rest, tenantId: clientId, sentAt: sentAt ? new Date(sentAt) : undefined },
  });
  const { tenantId, sentAt: rowSentAt, ...msgRest } = row;
  return NextResponse.json({ ...msgRest, clientId: tenantId, sentAt: rowSentAt.toISOString() });
}