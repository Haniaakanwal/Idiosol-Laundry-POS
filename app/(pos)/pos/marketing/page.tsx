"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { usePos } from "@/lib/pos-store";
import { isFeatureOn } from "@/lib/catalog";
import { FeatureKey } from "@/lib/types";
import { Card, Button, Badge, inputCls } from "@/components/ui";
import { MessageSquare, Send, CheckCircle2 } from "lucide-react";

const CHANNELS: { key: FeatureKey; label: string }[] = [
  { key: "sms", label: "SMS" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "promotions", label: "Promotions" },
];
import { MESSAGE_TEMPLATES } from "@/lib/pos";
const TEMPLATES = MESSAGE_TEMPLATES.map((t) => ({ ...t, segment: t.id === "ready" ? ("ready" as const) : t.id === "balance" ? ("balance" as const) : ("all" as const) }));

export default function MarketingPage() {
const { tenants, plans } = useStore();
  const pos = usePos();
  const t = tenants.find((x) => x.id === pos.activeClientId)!;
  const channels = CHANNELS.filter((c) => isFeatureOn(plans, t.plan, t.featureOverrides, c.key));
  const customers = pos.customersFor(t.id);

  // This page only ever needs recipient *counts*, not the actual order/customer
  // rows — so it pulls those counts from the same lean endpoints the
  // Dashboard/Customers pages use, instead of loading every order.
  const [readyCount, setReadyCount] = useState(0);
  const [balanceCount, setBalanceCount] = useState(0);
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/orders/summary?tenantId=${t.id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (!cancelled) setReadyCount(data?.statusCounts?.Ready ?? 0); })
      .catch(() => {});
    fetch(`/api/customers/order-stats?tenantId=${t.id}`)
      .then((r) => (r.ok ? r.json() : {}))
      .then((stats) => { if (!cancelled) setBalanceCount(Object.values(stats as Record<string, { balance: number }>).filter((s) => s.balance > 0).length); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [t.id]);

  const [channel, setChannel] = useState(channels[0]?.key ?? "sms");
  const [tpl, setTpl] = useState(TEMPLATES[0]);
  const [sent, setSent] = useState<number | null>(null);

  const recipientCount = tpl.segment === "ready" ? readyCount : tpl.segment === "balance" ? balanceCount : customers.length;

  return (
    <>
      <h1 className="mb-1 text-xl font-semibold text-slate-900">Marketing</h1>
      <p className="mb-5 text-sm text-slate-500">Broadcast to customers over the channels enabled for this client.</p>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <Card className="p-5">
          <div className="mb-4">
            <div className="mb-1.5 text-sm font-medium text-slate-700">Channel</div>
            <div className="flex gap-2">
              {channels.map((c) => (
                <button key={c.key} onClick={() => { setChannel(c.key); setSent(null); }} className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${channel === c.key ? "border-brand-600 bg-brand-50 text-brand-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>{c.label}</button>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <div className="mb-1.5 text-sm font-medium text-slate-700">Template</div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {TEMPLATES.map((x) => (
                <button key={x.id} onClick={() => { setTpl(x); setSent(null); }} className={`rounded-lg border p-3 text-left text-sm ${tpl.id === x.id ? "border-brand-600 bg-brand-50" : "border-slate-200 hover:bg-slate-50"}`}>
                  <div className="font-medium text-slate-800">{x.name}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="mb-1.5 text-sm font-medium text-slate-700">Message</div>
          <textarea className={inputCls} rows={4} defaultValue={tpl.body} key={tpl.id} />
          <p className="mt-2 text-xs text-slate-400">Merge tags: <code>{"{name}"}</code>, <code>{"{ref}"}</code>, <code>{"{balance}"}</code> are replaced per recipient.</p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900"><MessageSquare className="h-4 w-4 text-brand-600" /> Send</div>
          <div className="mt-4 rounded-lg bg-slate-50 p-4 text-center">
            <div className="text-3xl font-semibold text-slate-900">{recipientCount}</div>
            <div className="text-xs text-slate-400">recipients · {tpl.segment === "ready" ? "orders ready" : tpl.segment === "balance" ? "with balance" : "all customers"}</div>
          </div>
          <div className="mt-3 text-sm"><Badge tone="brand">{channels.find((c) => c.key === channel)?.label}</Badge></div>
          {sent === null ? (
            <Button className="mt-4 w-full" disabled={recipientCount === 0} onClick={() => setSent(recipientCount)}><Send className="h-4 w-4" /> Send campaign</Button>
          ) : (
            <div className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-emerald-50 py-2.5 text-sm font-medium text-emerald-700"><CheckCircle2 className="h-4 w-4" /> Queued to {sent} recipients</div>
          )}
        </Card>
      </div>
    </>
  );
}
