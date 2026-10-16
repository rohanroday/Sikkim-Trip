import { createHmac, timingSafeEqual } from "crypto";
import type { Paise } from "@/lib/money";

const API = "https://api.razorpay.com/v1";

export function isRazorpayConfigured(): boolean {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

/** Dev-only stand-in for checkout when no Razorpay keys are set. Never available in production. */
export function devPaymentsAllowed(): boolean {
  return process.env.NODE_ENV !== "production" && !isRazorpayConfigured();
}

function authHeader(): string {
  const id = process.env.RAZORPAY_KEY_ID ?? "";
  const secret = process.env.RAZORPAY_KEY_SECRET ?? "";
  return "Basic " + Buffer.from(`${id}:${secret}`).toString("base64");
}

async function call<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { Authorization: authHeader(), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as T & { error?: { description?: string } };
  if (!res.ok) throw new Error(`Razorpay ${path} failed: ${json.error?.description ?? res.status}`);
  return json;
}

export async function createOrder(args: { amount: Paise; receipt: string; notes: Record<string, string> }) {
  return call<{ id: string; amount: number; currency: string; status: string }>("/orders", {
    amount: args.amount,
    currency: "INR",
    receipt: args.receipt,
    notes: args.notes,
  });
}

export async function createRefund(args: { paymentId: string; amount: Paise; notes?: Record<string, string> }) {
  return call<{ id: string; status: string; amount: number }>(`/payments/${args.paymentId}/refund`, {
    amount: args.amount,
    speed: "normal",
    notes: args.notes ?? {},
  });
}

function safeEqualHex(a: string, b: string): boolean {
  const ba = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

/** Verify X-Razorpay-Signature against the RAW request body. */
export function verifyWebhookSignature(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature || !secret) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeEqualHex(expected, signature);
}

/** Verify the signature Razorpay Checkout hands the browser after payment. */
export function verifyCheckoutSignature(orderId: string, paymentId: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET ?? "";
  if (!secret) return false;
  const expected = createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
  return safeEqualHex(expected, signature);
}
