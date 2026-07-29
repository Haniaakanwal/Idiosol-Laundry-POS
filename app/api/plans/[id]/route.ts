import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json();
  const plan = await prisma.plan.update({ where: { id: params.id as any }, data: body });
  return NextResponse.json(plan);
}