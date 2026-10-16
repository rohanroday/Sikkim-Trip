import { readLocalSigned } from "@/lib/storage/storage";
import { requireAdmin } from "@/lib/auth/session";
import { handle } from "@/lib/http";
import { NotFoundError } from "@/lib/errors";

/** Development-only file server for the local storage fallback. Signed URL AND admin session required. */
export async function GET(req: Request, { params }: { params: Promise<{ key: string[] }> }) {
  return handle(async () => {
    if (process.env.NODE_ENV === "production") throw new NotFoundError();
    await requireAdmin();
    const { key } = await params;
    const url = new URL(req.url);
    const body = await readLocalSigned(key.join("/"), Number(url.searchParams.get("exp")), url.searchParams.get("sig") ?? "");
    if (!body) throw new NotFoundError();
    const ext = key.at(-1)?.split(".").pop();
    const type = ext === "pdf" ? "application/pdf" : ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
    return new Response(new Uint8Array(body), { headers: { "Content-Type": type, "Cache-Control": "private, no-store" } });
  });
}
