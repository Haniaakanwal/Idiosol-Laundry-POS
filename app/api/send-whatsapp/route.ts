import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { to, text } = await req.json();
  const res = await fetch("https://wasenderapi.com/api/send-message", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.WASENDER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ to, text }),
  });
  const data = await res.json();
  return NextResponse.json(data);
}