import "dotenv/config";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
const TENANT_ID = "cms5qzdsq002s5c553w2fpsrk"; // from Supabase Tenant table

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const FIRST_NAMES = ["Ali", "Sara", "Omar", "Layla", "Ahmed", "Noura", "Yusuf", "Mona", "Zaid", "Huda"];
const LAST_NAMES = ["Khan", "Hassan", "Ibrahim", "Rahim", "Aziz", "Farooq", "Malik", "Saeed"];
const SERVICE_TYPES = ["Wash & Iron", "Dry Clean", "Dry Clean Urgent"];
const SERVICE_NAMES = ["Shirt", "Trousers", "Kandoora", "Bed Cover", "Blanket Single", "Pillow"];
const HANG_FOLD = ["Fold", "Hang"];
const DELIVERY_TYPES = ["Pickup", "Home Delivery"];
const PAYMENT_TYPES = ["Cash", "Card", "EFT"];
const STATUSES = ["Draft", "JobOrder", "Ready", "Delivered", "Cancelled"];

function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randDateWithinDays(days) {
  const d = new Date();
  d.setDate(d.getDate() - randInt(0, days));
  return d;
}
function id(prefix) { return `${prefix}_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`; }

async function main() {
  console.log("Generating customers...");
  const customers = Array.from({ length: 500 }).map(() => ({
    id: id("cust"),
    tenantId: TENANT_ID,
    fullName: `${rand(FIRST_NAMES)} ${rand(LAST_NAMES)}`,
    phone: `05${randInt(10000000, 99999999)}`,
    address: `Building ${randInt(1, 50)}, Street ${randInt(1, 20)}`,
    balance: 0,
    creditBalance: 0,
    isBlacklist: false,
  }));
  await prisma.pOSCustomer.createMany({ data: customers });
  console.log(`Created ${customers.length} customers.`);

  console.log("Generating orders...");
  const orders = [];
  const items = [];
  const payments = [];

  for (let i = 0; i < 10000; i++) {
    const cust = rand(customers);
    const orderId = id("ord");
    const date = randDateWithinDays(180);
    const deliveryDate = new Date(date);
    deliveryDate.setDate(deliveryDate.getDate() + randInt(1, 3));
    const status = rand(STATUSES);

    let sub = 0;
    const itemCount = randInt(1, 4);
    for (let j = 0; j < itemCount; j++) {
      const unitPrice = randInt(3, 25);
      const qty = randInt(1, 3);
      const lineTotal = unitPrice * qty;
      sub += lineTotal;
      items.push({
        id: id("item"),
        orderId,
        serviceId: id("svc"),
        serviceName: rand(SERVICE_NAMES),
        serviceType: rand(SERVICE_TYPES),
        qty,
        unitPrice,
        hangFold: rand(HANG_FOLD),
        urgent: Math.random() < 0.15,
        nasha: "None",
        lineTotal,
      });
    }

    const discount = Math.random() < 0.1 ? randInt(1, 10) : 0;
    const total = Math.max(0, sub - discount);
    const isPaid = status === "Delivered" || Math.random() < 0.6;
    const paid = isPaid ? total : Math.random() < 0.5 ? Math.round(total * 0.5) : 0;
    const balance = total - paid;

    orders.push({
      id: orderId,
      tenantId: TENANT_ID,
      reference: `JO-${10000 + i}`,
      customerId: cust.id,
      customerName: cust.fullName,
      customerPhone: cust.phone,
      date,
      deliveryType: rand(DELIVERY_TYPES),
      deliveryDate,
      status,
      sub,
      discount,
      total,
      paid,
      balance,
      salesman: "Load Test",
    });

    if (paid > 0) {
      payments.push({
        id: id("pay"),
        orderId,
        date,
        type: rand(PAYMENT_TYPES),
        amount: paid,
      });
    }

    if ((i + 1) % 1000 === 0) console.log(`  ...prepared ${i + 1} orders`);
  }

  console.log("Inserting orders...");
  for (let i = 0; i < orders.length; i += 1000) {
    await prisma.pOSOrder.createMany({ data: orders.slice(i, i + 1000) });
    console.log(`  inserted orders ${i + 1}-${Math.min(i + 1000, orders.length)}`);
  }

  console.log("Inserting order items...");
  for (let i = 0; i < items.length; i += 1000) {
    await prisma.pOSOrderItem.createMany({ data: items.slice(i, i + 1000) });
  }

  console.log("Inserting payments...");
  for (let i = 0; i < payments.length; i += 1000) {
    await prisma.pOSPayment.createMany({ data: payments.slice(i, i + 1000) });
  }

  console.log(`Done. ${customers.length} customers, ${orders.length} orders, ${items.length} items, ${payments.length} payments.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});