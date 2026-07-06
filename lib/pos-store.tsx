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
  VAT_RATE,
} from "./pos";

const LS_KEY = "laundry-saas-pos:v1";

interface PosDB {
  customers: POSCustomer[];
  services: POSService[];
  orders: POSOrder[];
  activeClientId: string | null;

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
return { customers, services, orders, activeClientId: null, };
}

export interface NewOrderInput {
  clientId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
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
  addCustomer: (c: Omit<POSCustomer, "id" | "balance" | "createdAt">) => POSCustomer;

  updateCustomer: (id: string, patch: Partial<POSCustomer>) => void;
  addService: (s: Omit<POSService, "id">) => void;
  updateService: (id: string, patch: Partial<POSService>) => void;
  createOrder: (o: NewOrderInput) => POSOrder;
  setOrderStatus: (id: string, status: OrderStatus) => void;
  addOrderPayment: (orderId: string, type: PaymentType, amount: number) => void;
  bulkStatus: (ids: string[], status: OrderStatus) => void;
  bulkPay: (ids: string[], type: PaymentType) => void;
  reset: () => void;
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
        const customer: POSCustomer = { ...c, id, balance: 0, createdAt: "2026-07-03" };
        setDb((prev) => ({ ...prev, customers: [customer, ...prev.customers] }));
        return customer;
      },

      updateCustomer(id, patch) {
        setDb((prev) => ({ ...prev, customers: prev.customers.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
      },

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
    
const totals = computeTotals(o.items, o.discount, o.payment?.amount ?? 0, VAT_RATE, o.taxRate ?? 0);
        const payments: POSPayment[] = o.payment && o.payment.amount > 0
          ? [{ id: `${id}_p1`, date: "2026-07-03", type: o.payment.type, amount: o.payment.amount, ref: `RCPT-${seq}` }]
          : [];
        const order: POSOrder = {
          id,
          clientId: o.clientId,
          reference: `JO-${seq}`,
          customerId: o.customerId,
          customerName: o.customerName,
          customerPhone: o.customerPhone,
          date: "2026-07-03",
          deliveryType: o.deliveryType,
          deliveryDate: o.deliveryDate,
          pickupTime: o.pickupTime,
          placement: o.placement,
          status: "Job Order",
          items: o.items,
          sub: totals.sub,
          discount: o.discount,
          vatRate: VAT_RATE,
          vat: totals.vat,
      taxRate: o.taxRate ?? 0,
      tax: totals.bohTax,
          total: totals.total,
          paid: o.payment?.amount ?? 0,
          balance: totals.balance,
          payments,
          salesman: o.salesman,
          notes: o.notes,
          createdAt: "2026-07-03",
        };
        setDb((prev) => ({
          ...prev,
          orders: [order, ...prev.orders],
          customers: prev.customers.map((c) => (c.id === o.customerId ? { ...c, balance: Math.round((c.balance + totals.balance) * 100) / 100 } : c)),
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
          const paid = Math.round((order.paid + amount) * 100) / 100;
          const balance = Math.round((order.total - paid) * 100) / 100;
          const payment: POSPayment = { id: `${orderId}_p${order.payments.length + 1}`, date: "2026-07-03", type, amount, ref: `RCPT-${order.reference}` };
          return {
            ...prev,
            orders: prev.orders.map((o) => (o.id === orderId ? { ...o, paid, balance, payments: [...o.payments, payment] } : o)),
            customers: prev.customers.map((c) => (c.id === order.customerId ? { ...c, balance: Math.round((c.balance - amount) * 100) / 100 } : c)),
          };
        });
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
            const payment: POSPayment = { id: `${o.id}_p${o.payments.length + 1}`, date: "2026-07-03", type, amount: amt, ref: `RCPT-${o.reference}` };
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
