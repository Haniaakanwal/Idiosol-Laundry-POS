# LaundryPOS — Multi-tenant Laundry POS SaaS

A SaaS platform for laundry businesses, built for Idiosol. Every client is a **tenant** in one
shared Supabase (Postgres) database — every row is scoped by `tenantId`. Two apps ship in this repo:

1. **Admin control plane** (`/dashboard`, `/clients`, …) — where Idiosol provisions clients and
   controls what each one can access.
2. **Tenant POS** (`/pos`) — the app a laundry's staff actually use day to day.

Bridge them with **"Log in as client"** on any client detail page, or **"Open POS app"** in the
admin sidebar.

## Stack

- **Next.js 14** (App Router) + TypeScript + Tailwind CSS
- **Supabase (Postgres)** — the real database
- **Prisma** — ORM / data access layer, with driver adapters (`@prisma/adapter-pg`)
- **bcryptjs** for password hashing + signed httpOnly session cookies (`lib/session.ts`,
  `middleware.ts`) — all auth is verified server-side, nothing password-related touches the browser
- **Resend** — transactional email (welcome emails, admin password resets)
- **WasenderAPI** — WhatsApp messaging
- Deployed on **Vercel**

## Data model

All app data lives in Supabase, accessed via Prisma from server-side API routes only — the browser
never talks to the database directly. Row Level Security is enabled on every table.

| Table | What it stores |
| --- | --- |
| `Tenant` | Client accounts, plan, status, tax settings, per-client customization lists |
| `TenantUser` | Staff accounts, roles, per-user module overrides |
| `POSCustomer` / `CreditLog` | Customers, balance, credit history |
| `POSService` | Services & Pricing catalog |
| `POSOrder` / `POSOrderItem` / `POSPayment` | Orders, line items, payments |
| `WhatsAppMessage` | Message history per customer/order |
| `Plan` | Starter / Professional / Enterprise definitions and feature entitlements |
| `ActivityEvent` | Platform-wide recent activity feed |
| `AdminAccount` | Platform admin logins |

Only the current session token lives in the browser (localStorage) — everything else is server-side.

## Admin console features

- Client provisioning — sends a real welcome email with login credentials
- **Plans & Billing** — price, seat/branch limits, and feature entitlements are all editable
  directly in the UI, with changes reflected live everywhere they're used
- **Access Control** — grid to toggle individual modules per client, overriding plan defaults
- Client detail — Overview, Access, Users, Billing, Danger zone (suspend/reactivate/cancel)
- **Settings** — add new platform admins (temp password generated + emailed automatically)
- Dashboard — platform KPIs, recent activity feed, plan distribution, trials/suspensions needing
  attention
- **POS Modules** — a reference page mapping each module to its original FileMaker source tables,
  with live per-client adoption counts (not a completeness checklist — shows how many active clients
  currently have each module enabled)

## Tenant POS features (`/pos`)

| Module | What it does |
| --- | --- |
| **Dashboard** | Open/ready orders, collected vs outstanding, ready-for-pickup list |
| **New Order** | Service/type picker, delivery type, hang/fold, urgent flag, discount, tax — all customizable per client |
| **Orders** | Filterable, paginated job-order history; bulk actions; print 80mm thermal receipts |
| **Customers** | Profile, balance, credit history, WhatsApp message history, blacklist |
| **Services & Pricing** | Searchable price matrix, grouped by category |
| **Payments** | Every receipt, filterable by method |
| **Reports** | Daily Cash, Receiving, Job Order, Top Services, VAT Reports — each with its own date filters, totals, and print button |
| **Marketing** | Template-based WhatsApp broadcasts to customer segments |
| **Users** | Staff accounts, per-user module overrides, self-service password change |

Order detail also has quick actions: take payment, deliver, print, and send WhatsApp (order status,
order complete, balance reminder, or a custom message picked from a template).

## Per-client customization

Five value lists are fully customizable per client (Admin Console → client → Overview tab):
Payment Methods, Delivery Types, Hang/Fold options, Service Categories, Placements. Each has a
minimum-of-one-item safeguard. (Service Types and Starch Levels are intentionally out of scope for
now — Service Types is tied into the pricing model and needs a larger change.)

## Security

- Row Level Security on every table
- All authentication server-side — passwords are never compared in the browser
- Signed httpOnly session cookies, validated by `middleware.ts` on every API route
- Staff usernames are unique per client, not globally
- Password hashes are never included in any API response
