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
  activeClientId: string | null;
}

function seed(): PosDB {
  return { activeClientId: null };
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
  services: POSService[];
  orders: POSOrder[];
  messages: WhatsAppMessage[];
  setActiveClient: (id: string | null) => void;
  customersFor: (clientId: string) => POSCustomer[];
  servicesFor: (clientId: string) => POSService[];
  ordersFor: (clientId: string) => POSOrder[];
  orderById: (id: string) => POSOrder | undefined;
addCustomer: (c: Omit<POSCustomer, "id" | "balance" | "createdAt" | "creditBalance">) => Promise<POSCustomer>;
sendWhatsApp: (clientId: string, customerId: string, to: string, text: string, orderId?: string) => Promise<boolean>;
messagesFor: (customerId: string) => WhatsAppMessage[];
  updateCustomer: (id: string, patch: Partial<POSCustomer>) => void;
  addService: (s: Omit<POSService, "id">) => Promise<void>;
  updateService: (id: string, patch: Partial<POSService>) => void;
 createOrder: (o: NewOrderInput) => Promise<POSOrder>;
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
  const [services, setServices] = useState<POSService[]>([]);
  const [ready, setReady] = useState(false);

  // Load customers from the real database (Supabase via Prisma).
  useEffect(() => {
    fetch("/api/customers")
      .then((r) => r.json())
      .then((data) => setCustomers(data))
      .catch(() => {});
  }, []);

const [servicesLoaded, setServicesLoaded] = useState(false);

// Load services from the real database (Supabase via Prisma).
useEffect(() => {
    fetch("/api/services")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setServices(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setServicesLoaded(true));
  }, []);

  const [orders, setOrders] = useState<POSOrder[]>([]);

  // Load orders from the real database (Supabase via Prisma).
  useEffect(() => {
    fetch("/api/orders")
      .then((r) => r.json())
      .then((data) => setOrders(data))
      .catch(() => {});
  }, []);

  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);

  // Load WhatsApp messages from the real database (Supabase via Prisma).
  useEffect(() => {
    fetch("/api/whatsapp-messages")
      .then((r) => r.json())
      .then((data) => setMessages(data))
      .catch(() => {});
  }, []);
  // Auto-provision a starter service catalog for the active tenant if it has none yet.
  // Runs whenever the active client, or the loaded services list, changes — not just
  // when setActiveClient() is explicitly called (activeClientId can already be set
  // from a previous session via localStorage).
  useEffect(() => {
    const id = db.activeClientId;
    if (!ready || !servicesLoaded || !id) return;
    if (services.some((s) => s.clientId === id)) return;
    const starter = seedServices(id).map(({ id: _drop, clientId: _drop2, ...rest }) => rest);
   fetch("/api/services/seed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenantId: id, services: starter }),
    })
      .then((r) => (r.ok ? r.json() : []))
      .then((created) => setServices((prev) => [...prev, ...(Array.isArray(created) ? created : [])]))
      .catch(() => {});
  }, [db.activeClientId, ready, servicesLoaded, services]);

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
      services,
      orders,
      messages,

      setActiveClient(id) {
        setDb((prev) => ({ ...prev, activeClientId: id }));
      },
customersFor: (clientId) => customers.filter((c) => c.clientId === clientId),
      servicesFor: (clientId) => services.filter((s) => s.clientId === clientId),
  ordersFor: (clientId) => orders.filter((o) => o.clientId === clientId),
      orderById: (id) => orders.find((o) => o.id === id),

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
  const res2 = await fetch("/api/whatsapp-messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientId, customerId, orderId, text, to, sentAt: new Date().toISOString(), status: ok ? "sent" : "failed" }),
  });
  const msg: WhatsAppMessage = await res2.json();
  setMessages((prev) => [msg, ...prev]);
  return ok;
},
messagesFor(customerId) { return messages.filter((m) => m.customerId === customerId); },
    async addService(s) {
        const res = await fetch("/api/services", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(s),
        });
        const service: POSService = await res.json();
        setServices((prev) => [...prev, service]);
      },

      updateService(id, patch) {
        setServices((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
        fetch(`/api/services/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        }).catch(() => {});
      },
      async createOrder(o) {
        const existing = orders.filter((x) => x.clientId === o.clientId);
        const seq = 1040 + existing.length + 1;

        const customer = customers.find((c) => c.id === o.customerId);
        const isCredit = o.payment?.type === "Credit";
        const rawAmount = o.payment?.amount ?? 0;
        const payAmount = isCredit ? Math.min(rawAmount, customer?.creditBalance ?? 0) : rawAmount;

        const totals = computeTotals(o.items, o.discount, 0, o.taxRate ?? 0);
        const applied = Math.min(payAmount, totals.total);
        const overpay = isCredit ? 0 : Math.max(0, payAmount - totals.total);
        const balance = Math.round((totals.total - applied) * 100) / 100;

        const payments = payAmount > 0
          ? [{ date: todayStr(), type: o.payment!.type, amount: payAmount, ref: `RCPT-${seq}` }]
          : [];

        const res = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
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
          }),
        });
        const order: POSOrder = await res.json();

        setOrders((prev) => [order, ...prev]);
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
        setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
        fetch(`/api/orders/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        }).catch(() => {});
      },addOrderPayment(orderId, type, amount) {
  const order = orders.find((o) => o.id === orderId);
  if (!order) return;
  const customer = customers.find((c) => c.id === order.customerId);
  const isCredit = type === "Credit";
  const payAmount = isCredit ? Math.min(amount, customer?.creditBalance ?? 0) : amount;

  const dueBefore = order.balance;
  const applied = Math.min(payAmount, dueBefore);
  const overpay = isCredit ? 0 : Math.max(0, payAmount - dueBefore);

  const paid = Math.round((order.paid + applied) * 100) / 100;
  const balance = Math.round((order.total - paid) * 100) / 100;
  const newPayment = { date: todayStr(), type, amount: payAmount, ref: `RCPT-${order.reference}` };

  setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, paid, balance, payments: [...o.payments, { id: `local_${Date.now()}`, ...newPayment }] } : o)));
  fetch(`/api/orders/${orderId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ paid, balance, newPayment }),
  }).catch(() => {});

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
},useCredit(customerId, amount) {
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
  const total = orders
    .filter((o) => o.customerId === customerId && o.status !== "Cancelled")
    .reduce((sum, o) => sum + o.balance, 0);
  return Math.round(total * 100) / 100;
},
addCredit(customerId, amount, type) {
  const target = customers.find((c) => c.id === customerId);
  if (!target) return;
  const newCredit = Math.round((target.creditBalance + amount) * 100) / 100;
  const log: CreditLog = { id: `local_${Date.now()}`, date: todayStr(), type, amount };

  setCustomers((prev) =>
    prev.map((c) => (c.id === customerId ? { ...c, creditBalance: newCredit, creditLogs: [log, ...(c.creditLogs ?? [])] } : c))
  );

  fetch(`/api/customers/${customerId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creditBalance: newCredit, newCreditLog: { type, amount } }),
  }).catch(() => {});
},
      bulkStatus(ids, status) {
        const idset = new Set(ids);
        setOrders((prev) => prev.map((o) => (idset.has(o.id) && o.status !== "Cancelled" ? { ...o, status } : o)));
        ids.forEach((id) => {
          fetch(`/api/orders/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
          }).catch(() => {});
        });
      },

      bulkPay(ids, type) {
        const idset = new Set(ids);
        const custDelta: Record<string, number> = {};
        setOrders((prev) => prev.map((o) => {
          if (!idset.has(o.id) || o.balance <= 0) return o;
          const amt = o.balance;
          custDelta[o.customerId] = (custDelta[o.customerId] ?? 0) + amt;
          const newPayment = { date: todayStr(), type, amount: amt, ref: `RCPT-${o.reference}` };
          fetch(`/api/orders/${o.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ paid: o.total, balance: 0, newPayment }),
          }).catch(() => {});
          return { ...o, paid: o.total, balance: 0, payments: [...o.payments, { id: `local_${Date.now()}_${o.id}`, ...newPayment }] };
        }));
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
}, [db, ready, customers, services, servicesLoaded, orders, messages]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export function usePos() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePos must be used within PosStoreProvider");
  return ctx;
}
