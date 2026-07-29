import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Provisions a starter service catalog for a tenant that has none yet.
export async function POST(req: Request) {
  const { tenantId, services } = await req.json(); // services = output of seedServices(clientId), ids stripped by caller
  const created = await prisma.pOSService.createManyAndReturn({
    data: services.map((s: any) => ({
      tenantId,
      name: s.name,
      nameArabic: s.nameArabic,
      category: s.category,
      prices: s.prices,
      active: s.active,
    })),
  });
  const mapped = created.map(({ tenantId, ...rest }) => ({ ...rest, clientId: tenantId }));
  return NextResponse.json(mapped);
}