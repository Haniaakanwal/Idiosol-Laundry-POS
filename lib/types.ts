// ---------------------------------------------------------------------------
// Domain types for the Laundry POS multi-tenant control plane.
//
// In the FileMaker world each client got a *copy* of LaundryPOS.fmp12.
// On Vercel every client (tenant) shares the same Postgres tables, and every
// row carries a `clientId`. This admin console is the PRODUCT control plane:
// it manages the tenants themselves and what each one is allowed to use.
// ---------------------------------------------------------------------------

export type PlanId = "starter" | "professional" | "enterprise";

export type TenantStatus = "active" | "trial" | "suspended" | "churned";

export type UserRole = "Owner" | "Admin" | "Manager" | "Cashier" | "Driver";

export type UserStatus = "active" | "invited" | "disabled";

// A feature module maps 1:1 to a functional area of the Laundry POS,
// derived directly from the FileMaker DDR (tables + Modules navigation).
export type FeatureKey =
  | "pos" // Point of Sale — Transaction / Items
  | "orders" // Order tracking board — Dashboard_Orders
  | "customers" // Individual customers — Customers
  | "services" // Service catalog & price matrix — Services / Service Types / Services_Price
  | "inventory" // Stock items — Items
  | "payments" // Payment capture & reconciliation — Payments
  | "reports" // Dashboards & summaries
  | "sms" // SMS templates & campaigns — SMS_TEMPLATES
  | "whatsapp" // WhatsApp messaging — WHATSAPP_LOGS
  | "promotions" // Promo files & marketing — PromoFile
  | "multibranch" // Branch transfers — uuid_BranchFrom
  | "arabic"; // Arabic / RTL localization — *Arabic / *AR fields

export interface FeatureModule {
  key: FeatureKey;
  name: string;
  description: string;
  category: "Core" | "Finance" | "Growth" | "Platform";
  fmTables: string[]; // source tables in the FileMaker DDR (for traceability)
}

export interface Plan {
  id: PlanId;
  name: string;
  priceMonthly: number; // in tenant billing currency (USD baseline)
  blurb: string;
  seatLimit: number | null; // null = unlimited
  branchLimit: number | null;
  storageLimitMB: number;
  features: FeatureKey[];
}

export interface TenantUser {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  status: UserStatus;
  lastActive: string; // ISO date
  passwordHash: string;
  username: string;
  password: string;
moduleOverrides: Partial<Record<FeatureKey, boolean>>;
}

export interface Tenant {
  id: string; // clientId — the tenant discriminator on every shared table
  name: string; // laundry / business name
  slug: string; // subdomain: {slug}.laundrypos.app
  contactName: string;
  email: string;
  phone: string;
  country: string;
  currency: string;
  locale: "en" | "ar";
  plan: PlanId;
  status: TenantStatus;
  createdAt: string; // ISO
  trialEndsAt?: string; // ISO, when status === "trial"
  branches: number;
  seatsUsed: number;
  storageUsedMB: number;
  monthlyOrders: number; // rolling 30-day transaction count
  mrr: number; // monthly recurring revenue
  // Per-tenant feature overrides on top of the plan defaults.
  // A key present here wins over the plan; absent = inherit plan.
  featureOverrides: Partial<Record<FeatureKey, boolean>>;
  taxEnabled: boolean;
taxRate: number;
logoUrl?: string;
}
}

export interface ActivityEvent {
  id: string;
  tenantId: string;
  tenantName: string;
  kind: "signup" | "upgrade" | "downgrade" | "suspend" | "reactivate" | "invite" | "payment" | "login";
  message: string;
  at: string; // ISO
}
