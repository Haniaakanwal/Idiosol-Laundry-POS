"use client";

import { OrderStatus } from "@/lib/pos";
import { Badge } from "@/components/ui";

const TONE: Record<OrderStatus, "slate" | "amber" | "brand" | "green" | "rose" | "violet"> = {
  Draft: "slate",
  "Job Order": "brand",
  Ready: "violet",
  Delivered: "green",
  Cancelled: "rose",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge tone={TONE[status]}>{status}</Badge>;
}
