import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const events = await prisma.activityEvent.findMany({ orderBy: { at: "desc" }, take: 50 });
  return NextResponse.json(events);
}

export async function POST(req: Request) {
  const body = await req.json();
  const event = await prisma.activityEvent.create({ data: body });
  return NextResponse.json(event);
}