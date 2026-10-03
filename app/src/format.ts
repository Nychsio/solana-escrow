import { BN } from "@anchor-lang/core";
import { DECIMALS } from "./config";

export const short = (a: string) => `${a.slice(0, 4)}…${a.slice(-4)}`;

// Base units -> "12.5" (tokens). Exact, no floating point.
export function fromBase(v: BN | bigint | string, decimals = DECIMALS): string {
  const s = v.toString().padStart(decimals + 1, "0");
  const int = s.slice(0, -decimals);
  const frac = s.slice(-decimals).replace(/0+$/, "");
  return frac ? `${int}.${frac}` : int;
}

// "12.5" (tokens) -> base units. Throws on bad input.
export function toBase(tokens: string, decimals = DECIMALS): BN {
  const t = tokens.trim().replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(t)) throw new Error("Nieprawidłowa kwota");
  const [int, frac = ""] = t.split(".");
  if (frac.length > decimals) throw new Error(`Max ${decimals} miejsc po przecinku`);
  return new BN(int + frac.padEnd(decimals, "0"));
}

export function countdown(secs: number): string {
  if (secs <= 0) return "minął";
  const d = Math.floor(secs / 86400);
  const h = Math.floor((secs % 86400) / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  return d > 0 ? `${d}d ${h}h ${m}m` : h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`;
}

export const toHex = (bytes: ArrayLike<number>) =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

export const fmtDate = (ts: number) => new Date(ts * 1000).toLocaleString("pl-PL");
