// src/app/lib/storage.ts
import { getRedis } from "./redis";
import { customAlphabet } from "nanoid";

export type CreateRequest = { url: string; expiresAt?: number | null; customSlug?: string | null };
export type CreateResult  = { code: string; fullShortUrl: string };
export interface Storage {
  create(req: CreateRequest): Promise<CreateResult>;
  resolve(code: string): Promise<{ url: string }>;
}

const genCode = customAlphabet("23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz", 6);

class RedisStorage implements Storage {
  constructor(private baseUrl: string) {}

 // Inside RedisStorage class in src/app/lib/storage.ts
async create(req: CreateRequest): Promise<CreateResult> {
  const { url, expiresAt, customSlug } = req;
  const r = getRedis();

  // 1) Validate & normalize the destination URL
  let dest: URL;
  try {
    dest = new URL(url);
  } catch {
    throw new Error("Please provide a valid URL (e.g., https://example.com)");
  }

  // 2) Compute TTL in ms (optional)
  const ttlMs =
    typeof expiresAt === "number" ? Math.max(0, expiresAt - Date.now()) : undefined;

  // 3) Custom slug path
  const wanted = (customSlug ?? "").trim().toLowerCase();
  if (wanted) {
    // allow letters/numbers/_/-; 3–32 chars
    if (!/^[A-Za-z0-9_-]{3,32}$/.test(wanted)) {
      throw new Error("Slug must be 3–32 chars using A–Z, a–z, 0–9, _ or -");
    }

    // Optional: reserve some words
    const RESERVED = new Set(["api", "r", "_next"]);
    if (RESERVED.has(wanted)) {
      throw new Error("That slug is reserved");
    }

    // Only set if not exists (NX), with optional PX ttl
    const ok =
      ttlMs !== undefined
        ? await r.set(wanted, dest.toString(), "PX", ttlMs, "NX")
        : await r.set(wanted, dest.toString(), "NX");

    if (ok === null) {
      throw new Error("That slug is already taken");
    }
    return { code: wanted, fullShortUrl: `${this.baseUrl}/r/${wanted}` };
  }

  // 4) Auto-generate a unique 6-char code
  // genCode comes from: const genCode = customAlphabet("23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz", 6);
  for (let attempts = 0; attempts < 6; attempts++) {
    const code = genCode();
    const ok =
      ttlMs !== undefined
        ? await r.set(code, dest.toString(), "PX", ttlMs, "NX")
        : await r.set(code, dest.toString(), "NX");
    if (ok === "OK") {
      return { code, fullShortUrl: `${this.baseUrl}/r/${code}` };
    }
  }

  // Extremely unlikely unless the keyspace is saturated
  throw new Error("Could not generate a unique code, please try again");
}


  async resolve(code: string) {
    const r = getRedis();
    const target = await r.get(code);
    if (!target) throw new Error("Not found or expired");
    return { url: target };
  }
}

export function getStorage(): Storage {
  const baseUrl =
    process.env.BASE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  return new RedisStorage(baseUrl);
}
