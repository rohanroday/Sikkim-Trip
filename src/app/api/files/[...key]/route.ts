import { readSigned } from "@/server/storage/storage";
import { requireAdmin } from "@/server/auth/session";
import { handle } from "@/server/http";
import { NotFoundError } from "@/lib/errors";

/** Serves files from the GridFS fallback. Signed URL AND admin session required. */
export async function GET(req: Request, { params }: { params: Promise<{ key: string[] }> }) {
  return handle(async () => {
    await requireAdmin();
    const { key } = await params;
    const url = new URL(req.url);
    const file = await readSigned(key.join("/"), Number(url.searchParams.get("exp")), url.searchParams.get("sig") ?? "");
    if (!file) throw new NotFoundError();
    return new Response(new Uint8Array(file.body), {
      headers: { "Content-Type": file.contentType, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" },
    });
  });
}
