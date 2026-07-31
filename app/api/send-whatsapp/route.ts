import { NextResponse } from "next/server";

// WhatsApp locks the connected number if it sees messages going out too fast.
// Sohaib confirmed the rule: no more than 1 message per minute. So instead of
// firing every request straight to WasenderAPI, we queue them and space them
// out — nothing here can burst multiple messages in the same minute anymore.
const MIN_GAP_MS = 60_000;
let lastSentAt = 0;
let queue: Promise<void> = Promise.resolve();

async function sleep(ms: number) {
  if (ms > 0) await new Promise((r) => setTimeout(r, ms));
}

export async function POST(req: Request) {
  const { to, text } = await req.json();

  // Chain this send onto the queue so it waits its turn and respects the gap,
  // regardless of how many requests land at once.
  let result: { data: any; status: number } = { data: null, status: 500 };
  queue = queue.then(async () => {
    const wait = MIN_GAP_MS - (Date.now() - lastSentAt);
    await sleep(wait);
    lastSentAt = Date.now();

    const res = await fetch("https://wasenderapi.com/api/send-message", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.WASENDER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ to, text }),
    });
    const data = await res.json();
    result = { data, status: res.ok ? 200 : res.status };
  });

  await queue;
  // Forward WasenderAPI's real success/failure status instead of always returning 200
  return NextResponse.json(result.data, { status: result.status });
}