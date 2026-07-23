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
  customers: POSCustomer[];
  services: POSService[];
  orders: POSOrder[];
  activeClientId: string | null;
  messages: WhatsAppMessage[];
}

function seed(): PosDB {
  const customers: POSCustomer[] = [];
  const services: POSService[] = [];
  const orders: POSOrder[] = [];
  for (const t of SEED_TENANTS) {
    const svc = seedServices(t.id);
    const cust = seedCustomers(t.id);
    services.push(...svc);
    customers.push(...cust);
    orders.push(...seedOrders(t.id, svc, cust));
  }
return { customers, services, orders, activeClientId: null, messages: [] };
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
  setActiveClient: (id: string | null) => void;
  customersFor: (clientId: string) => POSCustomer[];
  servicesFor: (clientId: string) => POSService[];
  ordersFor: (clientId: string) => POSOrder[];
  orderById: (id: string) => POSOrder | undefined;
addCustomer: (c: Omit<POSCustomer, "id" | "balance" | "createdAt" | "creditBalance">) => POSCustomer;
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
  const [ready, setReady] = useState(false);

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

      customersFor: (clientId) => db.customers.filter((c) => c.clientId === clientId),
      servicesFor: (clientId) => db.services.filter((s) => s.clientId === clientId),
      ordersFor: (clientId) => db.orders.filter((o) => o.clientId === clientId),
      orderById: (id) => db.orders.find((o) => o.id === id),

   addCustomer(c) {
        const id = `${c.clientId}_cust_${db.customers.filter((x) => x.clientId === c.clientId).length + 1}_${c.phone.length}`;
        const customer: POSCustomer = { ...c, id, balance: 0, createdAt: "todayStr()", creditBalance: 0 };
        setDb((prev) => ({ ...prev, customers: [customer, ...prev.customers] }));
        return customer;
      },

      updateCustomer(id, patch) {
        setDb((prev) => ({ ...prev, customers: prev.customers.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
      },
async sendWhatsApp(clientId, customerId, to, text, orderId) {
  const res = await fetch("/api/send-whatsapp", { method: "POST", body: JSON.stringify({ to, text }) });
  const ok = res.ok;
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

        const customer = db.customers.find((c) => c.id === o.customerId);
        const isCredit = o.payment?.type === "Credit";
        const rawAmount = o.payment?.amount ?? 0;
        const payAmount = isCredit ? Math.min(rawAmount, customer?.creditBalance ?? 0) : rawAmount;

        const totals = computeTotals(o.items, o.discount, 0, o.taxRate ?? 0);
        const applied = Math.min(payAmount, totals.total);   // goes to this order
        const overpay = isCredit ? 0 : Math.max(0, payAmount - totals.total); // excess -> credit (cash/card only)
        const balance = Math.round((totals.total - applied) * 100) / 100;

        const payments: POSPayment[] = payAmount > 0
          ? [{ id: `${id}_p1`, date: "todayStr()", type: o.payment!.type, amount: payAmount, ref: `RCPT-${seq}` }]
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
          createdAt: "todayStr()",
        };
   setDb((prev) => ({
          ...prev,
          orders: [order, ...prev.orders],
          customers: prev.customers.map((c) => {
            if (c.id !== o.customerId) return c;
            const creditDelta = isCredit ? -applied : overpay;
            return { ...c, balance: Math.round((c.balance + balance) * 100) / 100, creditBalance: Math.round((c.creditBalance + creditDelta) * 100) / 100 };
          }),
        }));
        return order;
      },
      setOrderStatus(id, status) {
        setDb((prev) => ({ ...prev, orders: prev.orders.map((o) => (o.id === id ? { ...o, status } : o)) }));
      },
addOrderPayment(orderId, type, amount) {
  setDb((prev) => {
    const order = prev.orders.find((o) => o.id === orderId);
    if (!order) return prev;
    const customer = prev.customers.find((c) => c.id === order.customerId);
    const isCredit = type === "Credit";
    // paying "with Credit" can never exceed what the customer actually has
    const payAmount = isCredit ? Math.min(amount, customer?.creditBalance ?? 0) : amount;

    const dueBefore = order.balance;
    const applied = Math.min(payAmount, dueBefore); // portion that goes to this order
    const overpay = isCredit ? 0 : Math.max(0, payAmount - dueBefore); // credit payments never create more credit

    const paid = Math.round((order.paid + applied) * 100) / 100;
    const balance = Math.round((order.total - paid) * 100) / 100;
    const payment: POSPayment = { id: `${orderId}_p${order.payments.length + 1}`, date: "todayStr()", type, amount: payAmount, ref: `RCPT-${order.reference}` };

    return {
      ...prev,
      orders: prev.orders.map((o) => (o.id === orderId ? { ...o, paid, balance, payments: [...o.payments, payment] } : o)),
      customers: prev.customers.map((c) => {
        if (c.id !== order.customerId) return c;
        const creditDelta = isCredit ? -applied : overpay;
        return { ...c, balance: Math.round((c.balance - applied) * 100) / 100, creditBalance: Math.round((c.creditBalance + creditDelta) * 100) / 100 };
      }),
    };
  });
},
useCredit(customerId, amount) {
  setDb((prev) => ({
    ...prev,
    customers: prev.customers.map((c) => (c.id === customerId ? { ...c, creditBalance: Math.round((c.creditBalance - amount) * 100) / 100 } : c)),
  }));
},
balanceFor(customerId) {
  const total = db.orders
    .filter((o) => o.customerId === customerId && o.status !== "Cancelled")
    .reduce((sum, o) => sum + o.balance, 0);
  return Math.round(total * 100) / 100;
},
addCredit(customerId, amount, type) {
  setDb((prev) => ({
    ...prev,
    customers: prev.customers.map((c) => {
      if (c.id !== customerId) return c;
      const log: CreditLog = { id: `${customerId}_cr${(c.creditLogs?.length ?? 0) + 1}`, date: "todayStr()", type, amount };
      return { ...c, creditBalance: Math.round((c.creditBalance + amount) * 100) / 100, creditLogs: [log, ...(c.creditLogs ?? [])] };
    }),
  }));
},
      bulkStatus(ids, status) {
        const idset = new Set(ids);
        setDb((prev) => ({ ...prev, orders: prev.orders.map((o) => (idset.has(o.id) && o.status !== "Cancelled" ? { ...o, status } : o)) }));
      },

      bulkPay(ids, type) {
        const idset = new Set(ids);
        setDb((prev) => {
          const custDelta: Record<string, number> = {};
          const orders = prev.orders.map((o) => {
            if (!idset.has(o.id) || o.balance <= 0) return o;
            const amt = o.balance;
            custDelta[o.customerId] = (custDelta[o.customerId] ?? 0) + amt;
            const payment: POSPayment = { id: `${o.id}_p${o.payments.length + 1}`, date: "todayStr()", type, amount: amt, ref: `RCPT-${o.reference}` };
            return { ...o, paid: o.total, balance: 0, payments: [...o.payments, payment] };
          });
          const customers = prev.customers.map((c) => (custDelta[c.id] ? { ...c, balance: Math.round((c.balance - custDelta[c.id]) * 100) / 100 } : c));
          return { ...prev, orders, customers };
        });
      },

      reset() {
        setDb(seed());
      },
    };
  }, [db, ready]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePos() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePos must be used within PosStoreProvider");
  return ctx;
}
