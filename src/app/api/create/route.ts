// app/api/create/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "../../lib/storage";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { url, expiresAt, customSlug } = await req.json();
    const storage = getStorage();

    const result = await storage.create({
      url,
      expiresAt: expiresAt ?? null,
      customSlug: customSlug ?? null,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to create";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
