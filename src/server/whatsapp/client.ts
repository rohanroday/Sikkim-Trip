import { createHmac, timingSafeEqual } from "crypto";
import type { Types } from "mongoose";
import { connectDB } from "@/server/db/connect";
import { Message } from "@/server/db/models";
import { maskPhone, toWhatsappId } from "@/lib/phone";

const GRAPH = "https://graph.facebook.com/v21.0";

export function isWhatsappConfigured(): boolean {
  return Boolean(process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_ACCESS_TOKEN);
}

export type TemplateSend = {
  to: string; // E.164
  template: string;
  bodyParams: string[];
  /** Quick-reply payloads, one per button in the approved template, in order. */
  quickReplies?: string[];
  /** Dynamic suffix for a URL button (index 0), e.g. the OTP for copy-code. */
  urlButtonParam?: string;
  bookingId?: Types.ObjectId;
  language?: string;
};

/** Every send goes through here and is recorded in `messages`. Never throws on delivery failure. */
export async function sendTemplate(msg: TemplateSend): Promise<{ ok: boolean; id?: string }> {
  await connectDB();
  const record = await Message.create({ to: msg.to, template: msg.template, bookingId: msg.bookingId, status: "queued" });

  if (!isWhatsappConfigured()) {
    await Message.updateOne({ _id: record._id }, { status: "skipped", error: "whatsapp not configured" });
    if (process.env.NODE_ENV !== "test") console.info(`[whatsapp:skipped] ${msg.template} -> ${maskPhone(msg.to)}`);
    return { ok: false };
  }

  const components: unknown[] = [];
  if (msg.bodyParams.length) {
    components.push({ type: "body", parameters: msg.bodyParams.map((text) => ({ type: "text", text })) });
  }
  msg.quickReplies?.forEach((payload, index) => {
    components.push({ type: "button", sub_type: "quick_reply", index: String(index), parameters: [{ type: "payload", payload }] });
  });
  if (msg.urlButtonParam) {
    components.push({ type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: msg.urlButtonParam }] });
  }

  try {
    const res = await fetch(`${GRAPH}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: toWhatsappId(msg.to),
        type: "template",
        template: { name: msg.template, language: { code: msg.language ?? "en" }, components },
      }),
    });
    const json = (await res.json().catch(() => ({}))) as { messages?: { id: string }[]; error?: { message?: string } };
    if (!res.ok) throw new Error(json.error?.message ?? `HTTP ${res.status}`);
    const id = json.messages?.[0]?.id;
    await Message.updateOne({ _id: record._id }, { status: "sent", providerMessageId: id });
    return { ok: true, id };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    await Message.updateOne({ _id: record._id }, { status: "failed", error });
    console.error(`[whatsapp:failed] ${msg.template} -> ${maskPhone(msg.to)}: ${error}`);
    return { ok: false };
  }
}

/** Verify X-Hub-Signature-256 on the raw webhook body. */
export function verifyWhatsappSignature(rawBody: string, header: string | null): boolean {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret || !header?.startsWith("sha256=")) return false;
  const expected = "sha256=" + createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(header);
  return a.length === b.length && timingSafeEqual(a, b);
}

export type InboundButton = { from: string; payload: string; messageId: string };
export type StatusUpdate = { id: string; status: string; error?: string };

/** Pull quick-reply button presses and delivery statuses out of a webhook payload. */
export function parseWebhook(body: unknown): { buttons: InboundButton[]; statuses: StatusUpdate[] } {
  const buttons: InboundButton[] = [];
  const statuses: StatusUpdate[] = [];
  type Change = {
    value?: {
      messages?: { from: string; id: string; type: string; button?: { payload?: string }; interactive?: { button_reply?: { id?: string } } }[];
      statuses?: { id: string; status: string; errors?: { title?: string }[] }[];
    };
  };
  const entries = (body as { entry?: { changes?: Change[] }[] })?.entry ?? [];
  for (const entry of entries) {
    for (const change of entry.changes ?? []) {
      for (const m of change.value?.messages ?? []) {
        const payload = m.button?.payload ?? m.interactive?.button_reply?.id;
        if (payload) buttons.push({ from: "+" + m.from.replace(/^\+/, ""), payload, messageId: m.id });
      }
      for (const s of change.value?.statuses ?? []) {
        statuses.push({ id: s.id, status: s.status, error: s.errors?.[0]?.title });
      }
    }
  }
  return { buttons, statuses };
}
