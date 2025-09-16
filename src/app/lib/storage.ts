// lib/storage.ts
export type CreateRequest = {
  url: string;
  // optional features
  expiresAt?: number | null; // epoch ms
  customSlug?: string | null; // only for DB mode
};

export type CreateResult = {
  code: string;     // what we append after /r/
  fullShortUrl: string;
};

export interface Storage {
  create(req: CreateRequest): Promise<CreateResult>;
  resolve(code: string): Promise<{ url: string }>;
}

/**
 * STATELESS STORAGE (no DB):
 * We issue a compact, signed token that *contains* the destination URL (+ expiry).
 * Tamper-proof via HMAC; verified on read. No persistence required.
 */
import { SignJWT, jwtVerify } from "jose";

function getSecretKey() {
  const secret = process.env.SECRET_KEY;
  if (!secret) throw new Error("SECRET_KEY missing");
  return new TextEncoder().encode(secret);
}

const ALG = "HS256";
const ISS = "urlie";

export class StatelessStorage implements Storage {
  constructor(private baseUrl: string) {}

  async create(req: CreateRequest): Promise<CreateResult> {
    const { url, expiresAt } = req;

    // Normalize & basic validation
    let dest: URL;
    try { dest = new URL(url); } catch { throw new Error("Invalid URL"); }

    const now = Math.floor(Date.now() / 1000);
    const payload: Record<string, unknown> = { u: dest.toString() };
    const key = getSecretKey();

    const jwt = await new SignJWT(payload)
      .setProtectedHeader({ alg: ALG })
      .setIssuer(ISS)
      .setIssuedAt(now)
      .setExpirationTime(expiresAt ? Math.floor(expiresAt / 1000) : now + 60 * 60 * 24 * 365) // default 1 year
      .sign(key);

    // A JWT is URL-safe already (base64url). Use it as the "code".
    const code = jwt;
    return {
      code,
      fullShortUrl: `${this.baseUrl}/r/${code}`,
    };
  }

  async resolve(code: string): Promise<{ url: string }> {
    try {
      const { payload } = await jwtVerify(code, getSecretKey(), { issuer: ISS });
      const u = payload["u"];
      if (typeof u !== "string") throw new Error("Malformed token");
      return { url: u };
    } catch {
      // invalid or expired
      throw new Error("Link is invalid or has expired");
    }
  }
}

/**
 * DB STORAGE (future-ready):
 * Implement with Prisma/Postgres, Vercel KV, Turso, etc.
 * Slugs can be short (6–8 chars), support custom slugs, analytics, etc.
 */
export class DbStorage implements Storage {
  // Stubbed; swap in real queries later.
  constructor(private baseUrl: string) {}
  async create(_req: CreateRequest): Promise<CreateResult> {
    throw new Error("DB storage not configured yet");
  }
  async resolve(_code: string): Promise<{ url: string }> {
    throw new Error("DB storage not configured yet");
  }
}

// Factory
export function getStorage(): Storage {
  const baseUrl = process.env.BASE_URL || "http://localhost:3000";
  const mode = process.env.STORAGE_MODE || "stateless"; // 'db' later
  if (mode === "db") return new DbStorage(baseUrl);
  return new StatelessStorage(baseUrl);
}

