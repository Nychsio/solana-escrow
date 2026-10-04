// Sealed delivery, client side only (native WebCrypto, no libraries).
// .sealed format: "SEAL1" (5 B) | name length (1 B) | file name (UTF-8) | IV (12 B) | AES-256-GCM ciphertext (with tag).
// deliverable_hash = SHA-256 of the whole .sealed file; key_hash = SHA-256 of the raw 32-byte key.
import { useEffect, useState } from "react";

const MAGIC = new TextEncoder().encode("SEAL1");
export const ZERO32 = new Uint8Array(32);

export async function sha256(data: Uint8Array): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", data));
}

export const isZero = (b: ArrayLike<number>) => Array.from(b).every((x) => x === 0);
export const bytesEqual = (a: ArrayLike<number>, b: ArrayLike<number>) =>
  a.length === b.length && Array.from(a).every((x, i) => x === b[i]);
export const toHexStr = (b: ArrayLike<number>) => Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");

export async function sealBytes(data: Uint8Array, name: string) {
  const nameBytes = new TextEncoder().encode(name);
  if (nameBytes.length > 255) throw new Error("Nazwa pliku jest za długa (max 255 bajtów).");
  const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
  const raw = new Uint8Array(await crypto.subtle.exportKey("raw", key));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data));
  const sealed = new Uint8Array(MAGIC.length + 1 + nameBytes.length + 12 + ct.length);
  let o = 0;
  sealed.set(MAGIC, o); o += MAGIC.length;
  sealed[o++] = nameBytes.length;
  sealed.set(nameBytes, o); o += nameBytes.length;
  sealed.set(iv, o); o += 12;
  sealed.set(ct, o);
  return { sealed, key: raw, hash: await sha256(sealed), keyHash: await sha256(raw) };
}

export async function unsealBytes(sealed: Uint8Array, rawKey: Uint8Array): Promise<{ name: string; data: Uint8Array }> {
  if (sealed.length < MAGIC.length + 1 + 12 + 16 || !MAGIC.every((x, i) => sealed[i] === x)) {
    throw new Error("To nie jest plik .sealed (zły nagłówek).");
  }
  const nl = sealed[MAGIC.length];
  const start = MAGIC.length + 1;
  const name = new TextDecoder().decode(sealed.subarray(start, start + nl));
  const iv = sealed.subarray(start + nl, start + nl + 12);
  const ct = sealed.subarray(start + nl + 12);
  try {
    const key = await crypto.subtle.importKey("raw", rawKey, "AES-GCM", false, ["decrypt"]);
    const data = new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct));
    return { name, data };
  } catch {
    throw new Error("Nie udało się odszyfrować: klucz nie pasuje do tego pliku.");
  }
}

// Key kept in the browser so the freelancer can claim later; the .key download is the backup.
const keyName = (pda: string) => `sealkey:${pda}`;
export function saveKey(pda: string, key: Uint8Array) {
  try {
    localStorage.setItem(keyName(pda), toHexStr(key));
  } catch {
    /* storage unavailable: the .key file is the only copy */
  }
}
export function loadKey(pda: string): Uint8Array | null {
  try {
    const h = localStorage.getItem(keyName(pda));
    return h && /^[0-9a-f]{64}$/.test(h) ? new Uint8Array(h.match(/../g)!.map((x) => parseInt(x, 16))) : null;
  } catch {
    return null;
  }
}

// A .key file is the raw 32 bytes; a 64-char hex text is accepted too.
export function parseKeyFile(bytes: Uint8Array): Uint8Array | null {
  if (bytes.length === 32) return bytes;
  const text = new TextDecoder().decode(bytes).trim();
  return /^[0-9a-fA-F]{64}$/.test(text) ? new Uint8Array(text.match(/../g)!.map((x) => parseInt(x, 16))) : null;
}

export function download(bytes: Uint8Array, filename: string) {
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: "application/octet-stream" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

// In-memory cache of the .sealed file a page visitor loaded (so decrypting needs no second upload).
const cache = new Map<string, Uint8Array>();
const listeners = new Set<() => void>();
export function cacheSealed(pda: string, bytes: Uint8Array) {
  cache.set(pda, bytes);
  listeners.forEach((l) => l());
}
export function useCachedSealed(pda: string): Uint8Array | null {
  const [, tick] = useState(0);
  useEffect(() => {
    const l = () => tick((n) => n + 1);
    listeners.add(l);
    return () => void listeners.delete(l);
  }, []);
  return cache.get(pda) ?? null;
}
