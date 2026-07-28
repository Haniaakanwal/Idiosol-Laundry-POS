"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { SEED_TENANTS } from "./mock-data";
import {
  POSCustomer,
  POSService,
  POSOrder,
  POSOrderItem,
  POSPayment,
  OrderStatus,
  PaymentType,
  ServiceCategory,
  ServiceType,
  seedServices,
  seedCustomers,
  seedOrders,
computeTotals,
  WhatsAppMessage,
  CreditLog,
  CreditAddMethod
} from "./pos";

const LS_KEY = "laundry-saas-pos:v1";

function todayStr() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD, real system date
}
function nowTimeStr() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); // real system time
}
interface PosDB {
  services: POSService[];
  orders: POSOrder[];
  activeClientId: string | null;
  messages: WhatsAppMessage[];
}

function seed(): PosDB {
  const services: POSService[] = [];
  const orders: POSOrder[] = [];
  for (const t of SEED_TENANTS) {
    const svc = seedServices(t.id);
    const cust = seedCustomers(t.id); // only used to build realistic seed orders below — real customers now live in Supabase
    services.push(...svc);
    orders.push(...seedOrders(t.id, svc, cust));
  }
return { services, orders, activeClientId: null, messages: [] };
}
export interface NewOrderInput {
  clientId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  taxRate?: number;
  deliveryType: POSOrder["deliveryType"];
  deliveryDate: string;
  pickupTime?: string;
  placement?: POSOrder["placement"];
  items: POSOrderItem[];
  discount: number;
  salesman: string;
  notes?: string;
  payment?: { type: PaymentType; amount: number };
}

interface PosStoreValue extends PosDB {
  ready: boolean;
  customers: POSCustomer[];
  setActiveClient: (id: string | null) => void;
  customersFor: (clientId: string) => POSCustomer[];
  servicesFor: (clientId: string) => POSService[];
  ordersFor: (clientId: string) => POSOrder[];
  orderById: (id: string) => POSOrder | undefined;
addCustomer: (c: Omit<POSCustomer, "id" | "balance" | "createdAt" | "creditBalance">) => Promise<POSCustomer>;
sendWhatsApp: (clientId: string, customerId: string, to: string, text: string, orderId?: string) => Promise<boolean>;
messagesFor: (customerId: string) => WhatsAppMessage[];
  updateCustomer: (id: string, patch: Partial<POSCustomer>) => void;
  addService: (s: Omit<POSService, "id">) => void;
  updateService: (id: string, patch: Partial<POSService>) => void;
  createOrder: (o: NewOrderInput) => POSOrder;
  setOrderStatus: (id: string, status: OrderStatus) => void;
  addOrderPayment: (orderId: string, type: PaymentType, amount: number) => void;
  bulkStatus: (ids: string[], status: OrderStatus) => void;
  bulkPay: (ids: string[], type: PaymentType) => void;
  reset: () => void;
 useCredit: (customerId: string, amount: number) => void;
  balanceFor: (customerId: string) => number;
addCredit: (customerId: string, amount: number, type: CreditAddMethod) => void;
 
}

const Ctx = createContext<PosStoreValue | null>(null);

export function PosStoreProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<PosDB>(() => seed());
  const [customers, setCustomers] = useState<POSCustomer[]>([]);
  const [ready, setReady] = useState(false);

  // Load customers from the real database (Supabase via Prisma).
  useEffect(() => {
    fetch("/api/customers")
      .then((r) => r.json())
      .then((data) => setCustomers(data))
      .catch(() => {});
  }, []);

useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(LS_KEY) : null;
      if (raw) {
        const parsed = JSON.parse(raw);
        setDb(parsed);
      }
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(LS_KEY, JSON.stringify(db));
    } catch {
      /* ignore */
    }
  }, [db, ready]);

const value = useMemo<PosStoreValue>(() => {
    return {
      ...db,
      ready,
      customers,

      setActiveClient(id) {
        setDb((prev) => {
          // Auto-provision a starter service catalog for tenants created in the
          // admin console that have no POS data yet.
          let services = prev.services;
          if (id && !prev.services.some((s) => s.clientId === id)) {
            services = [...prev.services, ...seedServices(id)];
          }
          return { ...prev, services, activeClientId: id };
        });
      },
customersFor: (clientId) => customers.filter((c) => c.clientId === clientId),
      servicesFor: (clientId) => db.services.filter((s) => s.clientId === clientId),
      ordersFor: (clientId) => db.orders.filter((o) => o.clientId === clientId),
      orderById: (id) => db.orders.find((o) => o.id === id),

   async addCustomer(c) {
        const res = await fetch("/api/customers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(c),
        });
        const customer: POSCustomer = await res.json();
        setCustomers((prev) => [customer, ...prev]);
        return customer;
      },

      updateCustomer(id, patch) {
        setCustomers((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
        fetch(`/api/customers/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        }).catch(() => {});
      },
async sendWhatsApp(clientId, customerId, to, text, orderId) {
  let ok = false;
  try {
    const res = await fetch("/api/send-whatsapp", { method: "POST", body: JSON.stringify({ to, text }) });
    ok = res.ok;
  } catch {
    ok = false; // network error, WASENDER_API_KEY missing, etc.
  }
  const msg: WhatsAppMessage = { id: `wa_${Date.now()}`, clientId, customerId, orderId, text, to, sentAt: new Date().toISOString(), status: ok ? "sent" : "failed" };
  setDb((prev) => ({ ...prev, messages: [msg, ...prev.messages] }));
  return ok;
},
messagesFor(customerId) { return db.messages.filter((m) => m.customerId === customerId); },
      addService(s) {
        const id = `${s.clientId}_svc_${db.services.filter((x) => x.clientId === s.clientId).length + 1}`;
        setDb((prev) => ({ ...prev, services: [...prev.services, { ...s, id }] }));
      },

      updateService(id, patch) {
        setDb((prev) => ({ ...prev, services: prev.services.map((s) => (s.id === id ? { ...s, ...patch } : s)) }));
      },
createOrder(o) {
        const existing = db.orders.filter((x) => x.clientId === o.clientId);
        const seq = 1040 + existing.length + 1;

        const id = `${o.clientId}_ord_${seq}`;
const customer = customers.find((c) => c.id === o.customerId);
        const isCredit = o.payment?.type === "Credit";
        const rawAmount = o.payment?.amount ?? 0;
        const payAmount = isCredit ? Math.min(rawAmount, customer?.creditBalance ?? 0) : rawAmount;

        const totals = computeTotals(o.items, o.discount, 0, o.taxRate ?? 0);
        const applied = Math.min(payAmount, totals.total);   // goes to this order
        const overpay = isCredit ? 0 : Math.max(0, payAmount - totals.total); // excess -> credit (cash/card only)
        const balance = Math.round((totals.total - applied) * 100) / 100;

        const payments: POSPayment[] = payAmount > 0
          ? [{ id: `${id}_p1`, date: todayStr(), type: o.payment!.type, amount: payAmount, ref: `RCPT-${seq}` }]
          : [];
      const order: POSOrder = {
          id,
          clientId: o.clientId,
          reference: `JO-${seq}`,
          customerId: o.customerId,
          customerName: o.customerName,
          customerPhone: o.customerPhone,
          date: todayStr(),
          orderTime: nowTimeStr(),
          deliveryType: o.deliveryType,
          deliveryDate: o.deliveryDate,
          pickupTime: o.pickupTime,
          placement: o.placement,
          status: "Job Order",
          items: o.items,
          sub: totals.sub,
          discount: o.discount,
      taxRate: o.taxRate ?? 0,
      tax: totals.Tax,
          total: totals.total,
          paid: applied,
          balance,
          payments,
          salesman: o.salesman,
          notes: o.notes,
          createdAt: todayStr(),
        };
setDb((prev) => ({ ...prev, orders: [order, ...prev.orders] }));
        setCustomers((prev) => prev.map((c) => {
          if (c.id !== o.customerId) return c;
          const creditDelta = isCredit ? -applied : overpay;
          const newBalance = Math.round((c.balance + balance) * 100) / 100;
          const newCredit = Math.round((c.creditBalance + creditDelta) * 100) / 100;
          fetch(`/api/customers/${c.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ balance: newBalance, creditBalance: newCredit }),
          }).catch(() => {});
          return { ...c, balance: newBalance, creditBalance: newCredit };
        }));
        return order;
      },
      setOrderStatus(id, status) {
        setDb((prev) => ({ ...prev, orders: prev.orders.map((o) => (o.id === id ? { ...o, status } : o)) }));
      },
      addOrderPayment(orderId, type, amount) {
  const order = db.orders.find((o) => o.id === orderId);
  if (!order) return;
  const customer = customers.find((c) => c.id === order.customerId);
  const isCredit = type === "Credit";
  const payAmount = isCredit ? Math.min(amount, customer?.creditBalance ?? 0) : amount;

  const dueBefore = order.balance;
  const applied = Math.min(payAmount, dueBefore);
  const overpay = isCredit ? 0 : Math.max(0, payAmount - dueBefore);

  const paid = Math.round((order.paid + applied) * 100) / 100;
  const balance = Math.round((order.total - paid) * 100) / 100;
  const payment: POSPayment = { id: `${orderId}_p${order.payments.length + 1}`, date: todayStr(), type, amount: payAmount, ref: `RCPT-${order.reference}` };

  setDb((prev) => ({
    ...prev,
    orders: prev.orders.map((o) => (o.id === orderId ? { ...o, paid, balance, payments: [...o.payments, payment] } : o)),
  }));

  setCustomers((prev) => prev.map((c) => {
    if (c.id !== order.customerId) return c;
    const creditDelta = isCredit ? -applied : overpay;
    const newBalance = Math.round((c.balance - applied) * 100) / 100;
    const newCredit = Math.round((c.creditBalance + creditDelta) * 100) / 100;
    fetch(`/api/customers/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ balance: newBalance, creditBalance: newCredit }),
    }).catch(() => {});
    return { ...c, balance: newBalance, creditBalance: newCredit };
  }));
},
useCredit(customerId, amount) {
  setCustomers((prev) => prev.map((c) => {
    if (c.id !== customerId) return c;
    const newCredit = Math.round((c.creditBalance - amount) * 100) / 100;
    fetch(`/api/customers/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creditBalance: newCredit }),
    }).catch(() => {});
    return { ...c, creditBalance: newCredit };
  }));
},
balanceFor(customerId) {
  const total = db.orders
    .filter((o) => o.customerId === customerId && o.status !== "Cancelled")
    .reduce((sum, o) => sum + o.balance, 0);
  return Math.round(total * 100) / 100;
},
addCredit(customerId, amount, type) {
  setCustomers((prev) => prev.map((c) => {
    if (c.id !== customerId) return c;
    const log: CreditLog = { id: `${customerId}_cr${(c.creditLogs?.length ?? 0) + 1}`, date: todayStr(), type, amount };
    const newCredit = Math.round((c.creditBalance + amount) * 100) / 100;
    fetch(`/api/customers/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creditBalance: newCredit }),
    }).catch(() => {});
    return { ...c, creditBalance: newCredit, creditLogs: [log, ...(c.creditLogs ?? [])] };
  }));
},
      bulkStatus(ids, status) {
        const idset = new Set(ids);
        setDb((prev) => ({ ...prev, orders: prev.orders.map((o) => (idset.has(o.id) && o.status !== "Cancelled" ? { ...o, status } : o)) }));
      },

      bulkPay(ids, type) {
        const idset = new Set(ids);
        const custDelta: Record<string, number> = {};
        setDb((prev) => {
          const orders = prev.orders.map((o) => {
            if (!idset.has(o.id) || o.balance <= 0) return o;
            const amt = o.balance;
            custDelta[o.customerId] = (custDelta[o.customerId] ?? 0) + amt;
            const payment: POSPayment = { id: `${o.id}_p${o.payments.length + 1}`, date: todayStr(), type, amount: amt, ref: `RCPT-${o.reference}` };
            return { ...o, paid: o.total, balance: 0, payments: [...o.payments, payment] };
          });
          return { ...prev, orders };
        });
        setCustomers((prev) => prev.map((c) => {
          if (!custDelta[c.id]) return c;
          const newBalance = Math.round((c.balance - custDelta[c.id]) * 100) / 100;
          fetch(`/api/customers/${c.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ balance: newBalance }),
          }).catch(() => {});
          return { ...c, balance: newBalance };
        }));
      },

      reset() {
        setDb(seed());
      },
    };
}, [db, ready, customers]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export function usePos() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePos must be used within PosStoreProvider");
  return ctx;
}
