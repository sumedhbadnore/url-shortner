"use client";
import { useEffect, useMemo, useState } from "react";
import styles from "./page.module.css";
import QRCode from "qrcode";

type CreateResp = { code: string; fullShortUrl: string; error?: string };

const EXPIRY_PRESETS = [
  { label: "Never", days: 0 },
  { label: "1 day", days: 1 },
  { label: "7 days", days: 7 },
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
];

function isValidUrl(v: string) {
  try {
    const u = new URL(v.trim());
    return !!u.protocol && !!u.host;
  } catch { return false; }
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [preset, setPreset] = useState<number>(30);
  const [customDays, setCustomDays] = useState<number | "">("");
  const [customSlug, setCustomSlug] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const days = useMemo(() => {
    if (preset === -1) return Number(customDays) || 0;
    return preset;
  }, [preset, customDays]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null); setResult(null); setQr(null); setCopied(false);
    if (!isValidUrl(url)) { setErr("Please enter a valid URL (https://…)"); return; }
    setLoading(true);
    try {
      const expiresAt = days ? Date.now() + days * 24 * 60 * 60 * 1000 : null;
      const res = await fetch("/api/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          url: url.trim(),
          expiresAt,
          customSlug: customSlug.trim() || null,
        }),
      });
      const data: CreateResp = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create link");
      setResult(data.fullShortUrl);
      // Generate QR
      const qrPng = await QRCode.toDataURL(data.fullShortUrl, { margin: 2, width: 160 });
      setQr(qrPng);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
    } finally { setLoading(false); }
  }

  async function copy() {
    if (!result) return;
    await navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  // Keep simple local history (client-only)
  useEffect(() => {
    if (!result) return;
    try {
      const arr = JSON.parse(localStorage.getItem("recent") || "[]") as string[];
      const next = [result, ...arr.filter((x) => x !== result)].slice(0, 5);
      localStorage.setItem("recent", JSON.stringify(next));
    } catch {}
  }, [result]);

  const hasCustom = customSlug.trim().length > 0;

  return (
    <main className={styles.container}>
      <h1 className={styles.h1}>urlie ✂️</h1>
      <p className={styles.sub}>Create short links with expiry and optional custom slug.</p>

      <form onSubmit={onSubmit} className={styles.card}>
        <div className={styles.row}>
          <label className={styles.meta}>Destination URL</label>
          <input
            className={styles.input}
            placeholder="https://example.com/really/long/link?with=params"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </div>

        <div className={styles.grid}>
          <div className={styles.row}>
            <label className={styles.meta}>Expiry</label>
            <select
              className={styles.select}
              value={preset}
              onChange={(e) => setPreset(Number(e.target.value))}
            >
              {EXPIRY_PRESETS.map((p) => (
                <option key={p.label} value={p.days}>{p.label}</option>
              ))}
              <option value={-1}>Custom…</option>
            </select>
          </div>

          <div className={styles.row}>
            <label className={styles.meta}>Custom days (optional)</label>
            <input
              className={styles.input}
              type="number"
              min={0}
              placeholder="e.g. 365"
              disabled={preset !== -1}
              value={customDays}
              onChange={(e) => setCustomDays(e.target.value === "" ? "" : Number(e.target.value))}
            />
          </div>
        </div>

        <div className={styles.row}>
          <label className={styles.meta}>Custom slug (optional)</label>
          <input
            className={styles.input}
            placeholder="my-link (A–Z, a–z, 0–9, _ or -)"
            value={customSlug}
            onChange={(e) => setCustomSlug(e.target.value)}
          />
          <span className={styles.meta}>
            <span className={styles.tag}>/r/{hasCustom ? customSlug.trim() : "<auto>"}</span>
          </span>
        </div>

        <div className={styles.actions}>
          <button className={styles.btn} disabled={loading}>
            {loading ? "Creating…" : "Create link"}
          </button>
          {err && <span className={styles.error}>{err}</span>}
        </div>

        {result && (
          <div className={styles.result}>
            <div className={styles.linkBox}>
              <div className={styles.meta}>Short link</div>
              <div style={{ marginTop: 6 }}>
                <a href={result} target="_blank" rel="noreferrer">{result}</a>
              </div>
              <div className={styles.actions}>
                <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={copy}>
                  {copied ? "Copied ✓" : "Copy"}
                </button>
                <a className={`${styles.btn} ${styles.btnGhost}`} href={result} target="_blank" rel="noreferrer">
                  Open
                </a>
              </div>
            </div>
            {qr && (
              <div style={{ textAlign: "center" }}>
                <img src={qr} alt="QR" width={160} height={160} style={{ borderRadius: 12, border: `1px solid var(--border)` }} />
                <div className={styles.meta} style={{ marginTop: 6 }}>Scan to open</div>
              </div>
            )}
          </div>
        )}
      </form>
    </main>
  );
}
