// ---------------------------------------------------------------------------
// Tenant-facing POS domain — types, constants, seeding and money math.
// Modelled on the real idiosol LaundryPOS touch UI: the six service-type tabs
// map 1:1 to the price_* columns on the Services table in the DDR, and the
// garment grid uses the same items staff tap on the counter tablet.
// Every record is scoped by clientId, like the shared Postgres schema.
// ---------------------------------------------------------------------------

export const DELIVERY_TYPES = ["Pickup", "Home Delivery"] as const;
export const HANG_FOLD = ["Fold", "Hang"] as const;
export const PAYMENT_TYPES = ["Cash", "Card", "EFT"] as const;

// The six counter tabs — these are the Services table price columns:
// price_washAndIron / price_Ironing / price_dryClean / price_dryCleanUrgent /
// price_ironingUrgent / price_washAndIronUrgent.
export const SERVICE_TYPES = [
  "Wash & Iron",
  "Ironing",
  "Dry Clean",
  "Dry Clean Urgent",
  "Ironing Urgent",
  "Wash & Iron Urgent",
] as const;

export const SERVICE_CATEGORIES = ["Gents", "Ladies", "Children", "Other"] as const;
export const NASHA_TYPES = ["None", "Low", "Medium", "High"] as const; // starch level
export const PLACEMENTS = ["Cabin", "Cupboard"] as const;
export const ORDER_STATUSES = ["Draft", "Job Order", "Ready", "Delivered", "Cancelled"] as const;

export type DeliveryType = (typeof DELIVERY_TYPES)[number];
export type HangFold = (typeof HANG_FOLD)[number];
export type PaymentType = (typeof PAYMENT_TYPES)[number];
export type ServiceType = (typeof SERVICE_TYPES)[number];
export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number];
export type NashaType = (typeof NASHA_TYPES)[number];
export type Placement = (typeof PLACEMENTS)[number];
export type OrderStatus = (typeof ORDER_STATUSES)[number];

// price multipliers relative to the base (Wash & Iron) price on each garment.
export const TYPE_MULT: Record<ServiceType, number> = {
  "Wash & Iron": 1,
  Ironing: 0.6,
  "Dry Clean": 1.5,
  "Dry Clean Urgent": 2.25,
  "Ironing Urgent": 0.9,
  "Wash & Iron Urgent": 1.5,
};

export function isUrgentType(t: ServiceType): boolean {
  return t.includes("Urgent");
}

export const VAT_RATE = 5; // Gulf VAT %

export interface POSCustomer {
  id: string;
  clientId: string;
  fullName: string;
  phone: string;
  address: string;
  balance: number;
  isBlacklist: boolean;
  note?: string;
  createdAt: string;
}

export interface POSService {
  id: string;
  clientId: string;
  name: string;
  nameArabic?: string;
  category: ServiceCategory;
  prices: Record<ServiceType, number>;
  active: boolean;
}

export interface POSOrderItem {
  id: string;
  serviceId: string;
  serviceName: string;
  serviceType: ServiceType;
  qty: number;
  unitPrice: number;
  hangFold: HangFold;
  urgent: boolean;
  nasha: NashaType;
  placement?: Placement;
  lineTotal: number;
}

export interface POSPayment {
  id: string;
  date: string;
  type: PaymentType;
  amount: number;
  ref?: string;
}

export interface POSOrder {
  id: string;
  clientId: string;
  reference: string; // e.g. JO-1042
  customerId: string;
  customerName: string;
  customerPhone: string;
  date: string;
  deliveryType: DeliveryType;
  deliveryDate: string;
  pickupTime?: string;
  placement?: Placement;
  status: OrderStatus;
  items: POSOrderItem[];
  sub: number;
  discount: number;
  vatRate: number;
  vat: number;
taxRate: number;
tax: number;
  total: number;
  paid: number;
  balance: number;
  payments: POSPayment[];
  salesman: string;
  driver?: string;
  notes?: string;
  createdAt: string;
}

// ---- money math -----------------------------------------------------------
export function lineTotal(unitPrice: number, qty: number): number {
  return Math.round(unitPrice * qty * 100) / 100;
}

export interface Totals {
  sub: number;
  vat: number;
  Tax: number;
  total: number;
  balance: number;
}

export function computeTotals(items: POSOrderItem[], discount: number, paid: number, vatRate = VAT_RATE, TaxRate = 0): Totals {
  const sub = items.reduce((s, i) => s + i.lineTotal, 0);
  const taxable = Math.max(0, sub - discount);
  const vat = Math.round(taxable * (vatRate / 100) * 100) / 100;
  const Tax = Math.round(taxable * (TaxRate / 100) * 100) / 100;
  const total = Math.round((taxable + vat + Tax) * 100) / 100;
  const balance = Math.round((total - paid) * 100) / 100;
  return { sub: Math.round(sub * 100) / 100, vat, Tax, total, balance };
}

export const STATUS_FLOW: Record<OrderStatus, { next?: OrderStatus; label: string; tone: string }> = {
  Draft: { next: "Job Order", label: "Confirm order", tone: "amber" },
  "Job Order": { next: "Ready", label: "Mark ready", tone: "brand" },
  Ready: { next: "Delivered", label: "Mark delivered", tone: "green" },
  Delivered: { label: "Delivered", tone: "slate" },
  Cancelled: { label: "Cancelled", tone: "rose" },
};

// ---------------------------------------------------------------------------
// Garment catalog — the tiles on the counter grid, with their base
// (Wash & Iron) price. Other service-type prices scale from it via TYPE_MULT.
// ---------------------------------------------------------------------------
const CATALOG: { name: string; ar?: string; cat: ServiceCategory; base: number }[] = [
  { name: "Kandoora", ar: "كندورة", cat: "Gents", base: 6 },
  { name: "Kandoora Wool", ar: "كندورة صوف", cat: "Gents", base: 9 },
  { name: "Shirt", ar: "قميص", cat: "Gents", base: 5 },
  { name: "T-Shirt", ar: "تي شيرت", cat: "Gents", base: 5 },
  { name: "Trousers", ar: "بنطلون", cat: "Gents", base: 5 },
  { name: "Shorts", cat: "Gents", base: 4 },
  { name: "Suit", ar: "بدلة", cat: "Gents", base: 15 },
  { name: "Coat", cat: "Gents", base: 12 },
  { name: "Jacket", cat: "Gents", base: 10 },
  { name: "Overcoat", cat: "Gents", base: 12 },
  { name: "Sweater", cat: "Gents", base: 7 },
  { name: "Ghatra", ar: "غترة", cat: "Gents", base: 4 },
  { name: "Ghatra Woolen", cat: "Gents", base: 6 },
  { name: "Topi", cat: "Gents", base: 3 },
  { name: "Cap", cat: "Gents", base: 3 },
  { name: "Tie", cat: "Gents", base: 3 },
  { name: "Lungi", cat: "Gents", base: 3 },
  { name: "Baniyan", cat: "Gents", base: 3 },
  { name: "Under Wear", cat: "Gents", base: 3 },
  { name: "Socks", cat: "Gents", base: 2 },
  { name: "Abaya", ar: "عباية", cat: "Ladies", base: 10 },
  { name: "Sheila", ar: "شيلة", cat: "Ladies", base: 6 },
  { name: "Saree", cat: "Ladies", base: 10 },
  { name: "Dress", cat: "Ladies", base: 15 },
  { name: "Blouse", cat: "Ladies", base: 5 },
  { name: "Skirt", cat: "Ladies", base: 8 },
  { name: "Shalwar Suit", cat: "Ladies", base: 10 },
  { name: "Bra", cat: "Ladies", base: 3 },
  { name: "Frock", cat: "Children", base: 10 },
  { name: "Jump Suit", cat: "Children", base: 10 },
  { name: "Uniform A/P", cat: "Children", base: 12 },
  { name: "Bed Cover", cat: "Other", base: 12 },
  { name: "Bedsheet", cat: "Other", base: 10 },
  { name: "Pillow", cat: "Other", base: 15 },
  { name: "Pillow Cover", cat: "Other", base: 3 },
  { name: "Duvet Double", cat: "Other", base: 20 },
  { name: "Duvet Single", cat: "Other", base: 15 },
  { name: "Blanket Double", cat: "Other", base: 20 },
  { name: "Blanket Single", cat: "Other", base: 15 },
  { name: "Bath Rob", cat: "Other", base: 10 },
  { name: "Towel", cat: "Other", base: 5 },
];

function priceMatrix(base: number): Record<ServiceType, number> {
  // Whole-dirham prices so tile prices, line totals and subtotals stay
  // visually consistent (no fractional currency).
  const prices = {} as Record<ServiceType, number>;
  for (const st of SERVICE_TYPES) prices[st] = Math.round(base * TYPE_MULT[st]);
  return prices;
}

export function seedServices(clientId: string): POSService[] {
  return CATALOG.map((c, i) => ({
    id: `${clientId}_svc${i + 1}`,
    clientId,
    name: c.name,
    nameArabic: c.ar,
    category: c.cat,
    prices: priceMatrix(c.base),
    active: true,
  }));
}

export function newServicePrices(base: number): Record<ServiceType, number> {
  return priceMatrix(base);
}

const NAMES = [
  ["Abdullah", "Al-Mansoori"], ["Fatima", "Hassan"], ["Omar", "Khalil"], ["Layla", "Ibrahim"],
  ["Yousef", "Al-Sayed"], ["Mariam", "Nasser"], ["Khalid", "Rahman"], ["Noura", "Aziz"],
  ["Saeed", "Al-Balushi"], ["Huda", "Farouk"], ["Tariq", "Zayed"], ["Amira", "Salem"],
];

export function seedCustomers(clientId: string): POSCustomer[] {
  return NAMES.map((n, i) => ({
    id: `${clientId}_cust${i + 1}`,
    clientId,
    fullName: `${n[0]} ${n[1]}`,
    phone: `+9715${(50000000 + i * 137651 + clientId.length * 1000).toString().slice(0, 8)}`,
    address: `Villa ${12 + i}, Street ${3 + (i % 9)}, District ${1 + (i % 5)}`,
    balance: i % 4 === 0 ? Math.round((i * 13.5) % 240) : 0,
    isBlacklist: i === 9,
    createdAt: "2025-11-01",
    note: i === 9 ? "Repeated chargebacks" : undefined,
  }));
}

// Ten orders per tenant, built from its seeded services + customers.
export function seedOrders(clientId: string, services: POSService[], customers: POSCustomer[]): POSOrder[] {
  const statuses: OrderStatus[] = ["Job Order", "Job Order", "Ready", "Ready", "Delivered", "Delivered", "Delivered", "Draft", "Cancelled", "Job Order"];
  const dates = ["2026-06-23", "2026-06-25", "2026-06-27", "2026-06-29", "2026-06-30", "2026-07-01", "2026-07-01", "2026-07-02", "2026-07-02", "2026-07-03"];
  const orders: POSOrder[] = [];
  for (let i = 0; i < 10; i++) {
    const cust = customers[(i * 3) % customers.length];
    const nItems = 1 + (i % 4);
    const items: POSOrderItem[] = [];
    for (let j = 0; j < nItems; j++) {
      const svc = services[(i * 5 + j * 7) % services.length];
      const stype = SERVICE_TYPES[(i + j) % SERVICE_TYPES.length];
      const qty = 1 + ((i + j) % 4);
      const unit = svc.prices[stype];
      items.push({
        id: `${clientId}_o${i + 1}_i${j + 1}`,
        serviceId: svc.id,
        serviceName: svc.name,
        serviceType: stype,
        qty,
        unitPrice: unit,
        hangFold: (i + j) % 2 === 0 ? "Hang" : "Fold",
        urgent: isUrgentType(stype),
        nasha: "None",
        lineTotal: lineTotal(unit, qty),
      });
    }
    const discount = i % 3 === 0 ? 5 : 0;
    const status = statuses[i];
    const t = computeTotals(items, discount, 0);
    const paid = status === "Delivered" ? t.total : status === "Ready" ? Math.round(t.total * 0.5 * 100) / 100 : status === "Cancelled" ? 0 : i % 2 === 0 ? t.total : 0;
    const totals = computeTotals(items, discount, paid);
    const payments: POSPayment[] = paid > 0 ? [{ id: `${clientId}_o${i + 1}_p1`, date: dates[i], type: PAYMENT_TYPES[i % 3], amount: paid, ref: `RCPT-${1000 + i}` }] : [];
    orders.push({
      id: `${clientId}_ord${i + 1}`,
      clientId,
      reference: `JO-${1040 + i}`,
      customerId: cust.id,
      customerName: cust.fullName,
      customerPhone: cust.phone,
      date: dates[i],
      deliveryType: i % 2 === 0 ? "Pickup" : "Home Delivery",
      deliveryDate: dates[Math.min(i + 1, dates.length - 1)],
      placement: PLACEMENTS[i % PLACEMENTS.length],
      status,
      items,
      sub: totals.sub,
      discount,
      vatRate: VAT_RATE,
      vat: totals.vat,
      total: totals.total,
      paid,
      balance: totals.balance,
      payments,
      salesman: "Admin",
      driver: i % 2 === 1 ? "Driver 1" : undefined,
      createdAt: dates[i],
    });
  }
  return orders;
}
