import { FeatureModule, FeatureKey, Plan } from "./types";

// ---------------------------------------------------------------------------
// Feature module catalog — the "access surface" of the Laundry POS.
// Each entry corresponds to a real functional area found in the FileMaker DDR.
// Toggling these per-tenant is what "controlling client access" means.
// ---------------------------------------------------------------------------
export const FEATURES: FeatureModule[] = [
  {
    key: "pos",
    name: "Point of Sale",
    description: "Take-in counter: create orders, line items, hang/fold, urgent flags, print tickets.",
    category: "Core",
    fmTables: ["Transaction", "Items"],
  },
  {
    key: "orders",
    name: "Order Board",
    description: "Live order tracking — active / ready / delivered, driver assignment, pickup times.",
    category: "Core",
    fmTables: ["Dashboard_Orders", "Transaction"],
  },
  {
    key: "customers",
    name: "Customers",
    description: "Individual customer records, balances, blacklist, order history.",
    category: "Core",
    fmTables: ["Customers"],
  },
  {
    key: "services",
    name: "Services & Pricing",
    description: "Service catalog, service types, and the price matrix (wash, iron, dry-clean…).",
    category: "Core",
    fmTables: ["Services", "Service Types", "Services_Price"],
  },
  {
    key: "inventory",
    name: "Inventory",
    description: "Stock items, reorder levels, barcodes and costing.",
    category: "Core",
    fmTables: ["Items", "Services"],
  },
  {
    key: "payments",
    name: "Payments",
    description: "Cash / card / EFT / account capture, change, and reconciliation.",
    category: "Finance",
    fmTables: ["Payments"],
  },
  {
    key: "reports",
    name: "Reports & Dashboards",
    description: "Daily takings, sales summaries and KPI dashboards.",
    category: "Finance",
    fmTables: ["Order_Details", "Transaction"],
  },
  {
    key: "sms",
    name: "SMS Campaigns",
    description: "SMS templates and bulk 'order ready' / balance reminders.",
    category: "Growth",
    fmTables: ["SMS_TEMPLATES"],
  },
  {
    key: "whatsapp",
    name: "WhatsApp",
    description: "WhatsApp Business messaging and delivery logs.",
    category: "Growth",
    fmTables: ["WHATSAPP_LOGS"],
  },
  {
    key: "promotions",
    name: "Promotions",
    description: "Promo campaigns and marketing broadcast files.",
    category: "Growth",
    fmTables: ["PromoFile"],
  },
  {
    key: "multibranch",
    name: "Multi-Branch",
    description: "Multiple locations with inter-branch item transfers and consolidated reporting.",
    category: "Platform",
    fmTables: ["Items (uuid_BranchFrom)"],
  },
  {
    key: "arabic",
    name: "Arabic / RTL",
    description: "Arabic service names, receipts and right-to-left interface.",
    category: "Platform",
    fmTables: ["Services.itemNameArabic", "Service Types.serviceNameAR"],
  },
];

export const FEATURE_MAP: Record<FeatureKey, FeatureModule> = Object.fromEntries(
  FEATURES.map((f) => [f.key, f])
) as Record<FeatureKey, FeatureModule>;

// ---------------------------------------------------------------------------
// Subscription plans. Each plan unlocks a set of feature modules; per-tenant
// overrides can then grant/revoke individual modules on top.
// ---------------------------------------------------------------------------
export const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    priceMonthly: 49,
    blurb: "Single-shop counter POS.",
    seatLimit: 3,
    branchLimit: 1,
    storageLimitMB: 1024,
    features: ["pos", "orders", "customers", "services", "inventory", "payments", "reports"],
  },
  {
    id: "professional",
    name: "Professional",
    priceMonthly: 129,
    blurb: "Growing laundries with accounts & marketing.",
    seatLimit: 10,
    branchLimit: 2,
    storageLimitMB: 10240,
    features: [
      "pos",
      "orders",
      "customers",
      "services",
      "inventory",
      "payments",
      "reports",
      "sms",
      "promotions",
      "arabic",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    priceMonthly: 349,
    blurb: "Multi-branch chains, full marketing suite.",
    seatLimit: null,
    branchLimit: null,
    storageLimitMB: 102400,
    features: [
      "pos",
      "orders",
      "customers",
      "services",
      "inventory",
      "payments",
      "reports",
      "sms",
      "whatsapp",
      "promotions",
      "multibranch",
      "arabic",
    ],
  },
];

export const PLAN_MAP: Record<string, Plan> = Object.fromEntries(PLANS.map((p) => [p.id, p]));

// Resolve the *effective* access for a tenant: plan defaults + overrides.
export function effectiveFeatures(
  planId: string,
  overrides: Partial<Record<FeatureKey, boolean>>
): Record<FeatureKey, boolean> {
  const plan = PLAN_MAP[planId];
  const base = new Set(plan?.features ?? []);
  const result = {} as Record<FeatureKey, boolean>;
  for (const f of FEATURES) {
    const inPlan = base.has(f.key);
    const override = overrides[f.key];
    result[f.key] = override === undefined ? inPlan : override;
  }
  return result;
}

export function isFeatureOn(
  planId: string,
  overrides: Partial<Record<FeatureKey, boolean>>,
  key: FeatureKey
): boolean {
  const override = overrides[key];
  if (override !== undefined) return override;
  return (PLAN_MAP[planId]?.features ?? []).includes(key);
}
