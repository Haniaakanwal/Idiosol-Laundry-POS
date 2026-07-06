# LaundryPOS — SaaS platform (admin control plane + tenant POS)

Turns the FileMaker **LaundryPOS.fmp12** into a Vercel-hosted SaaS product. In FileMaker every
client got their *own copy* of the file. Here, every client is a **tenant** in one shared database;
every row is tagged with a `clientId`. Two apps ship in this repo:

1. **Admin control plane** (`/dashboard`, `/clients`, …) — where **you** (Idiosol) provision clients
   and control what each one can access.
2. **Tenant POS** (`/pos`) — the app a laundry's staff actually use. It shows **only the modules you
   enabled** for that client, closing the loop between the two apps.

Bridge them with **"Log in as client"** on any client page, or **"Open POS app"** in the admin sidebar.

## Logins (demo credentials)

The app opens on a **sign-in screen** with one-click demo accounts. Staff logins are locked to their
own tenant; the platform admin can switch/impersonate any client.

| Account | Email | Password |
| --- | --- | --- |
| **Platform Admin (Idiosol)** | `pa@healthandlife.com.au` | `idiosol123` |
| Marina Dry Cleaners (Enterprise) | `ahmed@marinadc.ae` | `laundry123` |
| Pressed & Fresh (Professional) | `sarah@pressedfresh.co.uk` | `laundry123` |
| SoapBox Laundry (Professional) | `diego@soapbox.pt` | `laundry123` |
| Limpio Express (Starter) | `valentina@limpio.mx` | `laundry123` |
| Blue Wave Cleaners (Starter trial) | `kenji@bluewave.jp` | `laundry123` |
| Crown Laundromat (Enterprise) | `olivia@crownlaundry.com` | `laundry123` |
| Royal Press (Enterprise) | `m.rashid@royalpress.sa` | `laundry123` |

Every client owner login uses password **`laundry123`**. A Starter client (Limpio) sees only 7
modules; an Enterprise client (Marina) sees all 10 — proving the access control loop.

## What it does

| Screen | Purpose |
| --- | --- |
| **Overview** | Platform KPIs — active clients, MRR, orders, seats, activity feed, trials/suspensions needing attention |
| **Clients** | Every tenant, searchable/filterable; **Provision client** wizard mints a new `clientId` + owner account |
| **Client detail** | Per-tenant tabs: Overview · **Access** (toggle POS modules) · Users (seats/roles) · Billing · Danger (suspend/churn) |
| **Access Control** | Bird's-eye matrix — all clients × all modules; grant/revoke any module with a click |
| **Users** | Every staff account across all tenants, by role |
| **Plans & Billing** | Starter / Professional / Enterprise and the module entitlements each unlocks |
| **POS Modules** | The 14 functional modules, each mapped to its source FileMaker tables, with adoption counts |
| **Data Model** | How per-client `.fmp12` copies collapse into one `clientId`-scoped Postgres schema (with RLS) |

## Access model

- **Plan** sets the baseline set of modules a client gets.
- **Per-client overrides** win over the plan — grant an add-on (e.g. WhatsApp on a Professional plan)
  or revoke a module. Overrides are flagged with an amber dot and can be reset to the plan default.
- Modules were derived directly from the LaundryPOS DDR: POS/Transactions, Order Board, Customers,
  Business accounts, Services & pricing, Inventory, Payments, VAT Returns, Reports, SMS, WhatsApp,
  Promotions, Multi-branch, Arabic/RTL.

## The tenant POS (`/pos`)

The staff-facing app, scoped to one client at a time (switch with the header dropdown). Options come
straight from the DDR value lists (Pickup/Home Delivery, Cash/Card/EFT, Nasha/starch levels,
Dry Clean/Washing/Urgent, statuses Draft→Job Order→Ready→Delivered).

| Module | What it does | Gated by feature |
| --- | --- | --- |
| **Dashboard** | Open/ready orders, collected vs outstanding, ready-for-pickup list | always |
| **New Order** | Touch take-in counter: 6 service-type tabs + tappable garment grid → cart with qty steppers & hang/fold → pick/create customer → payment step (discount, VAT, method) | `pos` |
| **Orders** | Job-order history: date-range + paid/delivery/status filters, **row selection**, and bulk actions (**Pay All · Mark Ready · Deliver All · Ready/Invoice SMS**); open one to advance status, cancel, print, take balance | `orders` |
| **Customers** | Add/edit, phone/address, running balance, blacklist, order counts | `customers` |
| **Business Accounts** | On-account customers with open balances and per-order statements | `business` |
| **Services & Pricing** | Price matrix (garment × service type), inline-edit prices, Arabic names | `services` |
| **Payments** | Every receipt across orders, filter by method | `payments` |
| **Reports** | Revenue by day, collections by method, top garments, VAT collected | `reports` |
| **Counter Cash Report** | Cash-received breakdown (Cash/Card/EFT/ACP) + order sales/discount/tax/grand-total + delivered items over a date range; Generate &amp; Preview / Print | `reports` |
| **VAT Returns** | Output VAT grouped by tax period | `vat` |
| **Marketing** | SMS / WhatsApp / Promotions broadcasts to segments (ready orders, balances) | `sms`/`whatsapp`/`promotions` |

**Quick-action menus** (⋯): the POS top bar has a menu (New Order · Order History · Counter Report);
each order detail has a menu (Add payment · Deliver order · Print order · Custom SMS · Send order).
Tickets, orders and the counter report print clean (the sidebar/top bar are `print:hidden`).

Orders, customers and services live in `lib/pos-store.tsx` (separate `localStorage` key), seeded per
tenant from `lib/pos.ts`. Same swap-to-Postgres seam as the admin store.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
```

Deploy to Vercel: push to a Git repo and import, or `vercel` from this folder. Zero config.

## Prototype data

State is seeded from `lib/mock-data.ts` and persisted to `localStorage` so your edits (new clients,
access toggles, invites) survive refreshes. **Settings → Reset to seed** restores the originals.

## Where the real backend plugs in

`lib/store.tsx` (tenants/users/access) and `lib/pos-store.tsx` (customers/services/orders) are the two
seams. They expose `addTenant`, `setPlan`, `toggleFeature`, `createOrder`, `addOrderPayment`, etc.
against in-memory stores today. Swapping them for API routes backed by Postgres (Vercel Postgres /
Neon) — with `clientId` on every table and Row-Level Security as sketched on the **Data Model** page —
leaves every screen unchanged.

## Stack

Next.js 14 (App Router) · TypeScript · Tailwind CSS · lucide-react. No backend required to demo.
