// app/api/create/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "../../lib/storage";

export const runtime = "edge";

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
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed to create" }, { status: 400 });
  }
}
