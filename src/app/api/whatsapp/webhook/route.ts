import { NextResponse } from "next/server";
import { connectDB } from "@/server/db/connect";
import { Message, WebhookEvent } from "@/server/db/models";
import { parseWebhook, verifyWhatsappSignature } from "@/server/whatsapp/client";
import { parseButtonPayload, recordPartnerResponse } from "@/server/booking/confirmations";
import { DomainError } from "@/lib/errors";

/** Meta's subscription check. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = process.env.WHATSAPP_VERIFY_TOKEN;
  if (token && url.searchParams.get("hub.mode") === "subscribe" && url.searchParams.get("hub.verify_token") === token) {
    return new Response(url.searchParams.get("hub.challenge") ?? "", { status: 200 });
  }
  return new Response("forbidden", { status: 403 });
}

/** P-01: partner Confirm/Decline buttons, plus delivery statuses. */
export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifyWhatsappSignature(raw, req.headers.get("x-hub-signature-256"))) {
    return NextResponse.json({ error: "bad signature" }, { status: 400 });
  }
  const { buttons, statuses } = parseWebhook(JSON.parse(raw));
  await connectDB();

  for (const s of statuses) {
    await Message.updateOne({ providerMessageId: s.id }, { status: s.status === "failed" ? "failed" : s.status, error: s.error });
  }

  for (const b of buttons) {
    try {
      await WebhookEvent.create({ provider: "whatsapp", eventId: b.messageId, type: "button" });
    } catch {
      continue; // already handled
    }
    const parsed = parseButtonPayload(b.payload);
    if (!parsed) continue;
    try {
      await recordPartnerResponse({ ...parsed, fromPhone: b.from, actor: `partner:whatsapp:${parsed.partnerId}` });
    } catch (err) {
      if (!(err instanceof DomainError)) throw err;
      console.warn(`whatsapp button ignored: ${err.message}`);
    }
  }
  return NextResponse.json({ ok: true });
}
