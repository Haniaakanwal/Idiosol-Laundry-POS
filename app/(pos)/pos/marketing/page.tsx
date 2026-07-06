"use client";

import { useState } from "react";
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

const TEMPLATES = [
  { id: "ready", name: "Order ready", body: "Hi {name}, your laundry order {ref} is ready for pickup. Thank you!", segment: "ready" as const },
  { id: "balance", name: "Balance reminder", body: "Dear {name}, you have an outstanding balance of {balance}. Please settle at your convenience.", segment: "balance" as const },
  { id: "promo", name: "Promotion", body: "{name}, enjoy 20% off dry cleaning this week only! Visit us today.", segment: "all" as const },
];

export default function MarketingPage() {
  const { tenants } = useStore();
  const pos = usePos();
  const t = tenants.find((x) => x.id === pos.activeClientId)!;
  const channels = CHANNELS.filter((c) => isFeatureOn(t.plan, t.featureOverrides, c.key));
  const customers = pos.customersFor(t.id);
  const orders = pos.ordersFor(t.id);

  const [channel, setChannel] = useState(channels[0]?.key ?? "sms");
  const [tpl, setTpl] = useState(TEMPLATES[0]);
  const [sent, setSent] = useState<number | null>(null);

  const recipients = tpl.segment === "ready"
    ? orders.filter((o) => o.status === "Ready")
    : tpl.segment === "balance"
    ? customers.filter((c) => c.balance > 0)
    : customers;

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
            <div className="text-3xl font-semibold text-slate-900">{recipients.length}</div>
            <div className="text-xs text-slate-400">recipients · {tpl.segment === "ready" ? "orders ready" : tpl.segment === "balance" ? "with balance" : "all customers"}</div>
          </div>
          <div className="mt-3 text-sm"><Badge tone="brand">{channels.find((c) => c.key === channel)?.label}</Badge></div>
          {sent === null ? (
            <Button className="mt-4 w-full" disabled={recipients.length === 0} onClick={() => setSent(recipients.length)}><Send className="h-4 w-4" /> Send campaign</Button>
          ) : (
            <div className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-emerald-50 py-2.5 text-sm font-medium text-emerald-700"><CheckCircle2 className="h-4 w-4" /> Queued to {sent} recipients</div>
          )}
        </Card>
      </div>
    </>
  );
}
