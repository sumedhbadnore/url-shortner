// src/app/r/[code]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "../../lib/storage";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ code: string }> }   // ← params is a Promise
) {
  const { code } = await ctx.params;           // ← await it

  const storage = getStorage();
  try {
    const { url } = await storage.resolve(code);
    return NextResponse.redirect(url, { status: 302 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "invalid";
    return new NextResponse(`Link error: ${message}`, {
      status: 410,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }
}
