// app/r/[code]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "../../lib/storage";

export const runtime = "edge";

export async function GET(
  _req: NextRequest,
  { params }: { params: { code: string } }
) {
  const storage = getStorage();
  try {
    const { url } = await storage.resolve(params.code);
    return NextResponse.redirect(url, { status: 302 });
  } catch (e: any) {
    return new NextResponse(
      `Link error: ${e?.message ?? "invalid"}`,
      { status: 410, headers: { "content-type": "text/plain; charset=utf-8" } }
    );
  }
}
