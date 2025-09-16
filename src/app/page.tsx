// app/page.tsx
"use client";

import { useState } from "react";

export default function Home() {
  const [url, setUrl] = useState("");
  const [days, setDays] = useState<number>(365);
  const [result, setResult] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    setResult(null);
    try {
      const expiresAt = days ? Date.now() + days * 24 * 60 * 60 * 1000 : null;
      const res = await fetch("/api/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url, expiresAt }),
      });
      const data: { fullShortUrl?: string; error?: string } = await res.json();
      if (!res.ok || !data.fullShortUrl) {
        throw new Error(data?.error || "Failed");
      }
      setResult(data.fullShortUrl);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Something went wrong";
      setErr(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 680, margin: "40px auto", padding: 16 }}>
      <h1>urlie ✂️</h1>
      <p>Create signed, stateless “short” links (no database required).</p>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <input
          placeholder="https://example.com/some/long/path?with=params"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
          style={{ padding: 12, fontSize: 16 }}
        />
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span>Expires in (days):</span>
          <input
            type="number"
            min={0}
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value || "0", 10))}
            style={{ width: 100, padding: 8 }}
          />
          <small>(0 = never)</small>
        </label>
        <button disabled={loading} style={{ padding: 12, fontSize: 16 }}>
          {loading ? "Creating…" : "Create link"}
        </button>
      </form>

      {err && <p style={{ color: "crimson" }}>{err}</p>}
      {result && (
        <p>
          Short link:{" "}
          <a href={result} target="_blank" rel="noreferrer">{result}</a>
        </p>
      )}
    </main>
  );
}
