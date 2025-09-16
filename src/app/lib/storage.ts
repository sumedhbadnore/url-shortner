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

  async create(req: CreateRequest): Promise<CreateResult> {
    const { url, expiresAt } = req;
    const r = getRedis();
    const ttlMs = typeof expiresAt === "number" ? Math.max(0, expiresAt - Date.now()) : undefined;

    let code = genCode();
    let res: "OK" | null;

    if (ttlMs !== undefined) {
      res = await r.set(code, url, "PX", ttlMs, "NX");  // ← order matters
    } else {
      res = await r.set(code, url, "NX");
    }

    while (res === null) {
      code = genCode();
      if (ttlMs !== undefined) {
        res = await r.set(code, url, "PX", ttlMs, "NX");
      } else {
        res = await r.set(code, url, "NX");
      }
    }

    return { code, fullShortUrl: `${this.baseUrl}/r/${code}` };
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
