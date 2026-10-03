import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { Connection, Keypair, PublicKey, clusterApiUrl } from "@solana/web3.js";

export const ROOT = path.resolve(__dirname, "..");
export const KEYS_DIR = path.join(ROOT, ".demo-keys");
export const RPC_URL = process.env.DEMO_RPC_URL ?? clusterApiUrl("devnet");
export const DECIMALS = 6;

export const connection = new Connection(RPC_URL, "confirmed");

export const loadKeypair = (file: string): Keypair =>
  Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync(file, "utf8")))
  );

// Creates the keypair file on first use, so reruns keep the same wallet.
export const loadOrCreateKeypair = (name: string): Keypair => {
  const file = path.join(KEYS_DIR, `${name}.json`);
  if (fs.existsSync(file)) return loadKeypair(file);
  fs.mkdirSync(KEYS_DIR, { recursive: true, mode: 0o700 });
  const keypair = Keypair.generate();
  fs.writeFileSync(file, JSON.stringify(Array.from(keypair.secretKey)), {
    mode: 0o600,
  });
  return keypair;
};

// Pays for the demo wallets; defaults to the Solana CLI wallet.
export const funderKeypair = (): Keypair =>
  loadKeypair(
    process.env.DEMO_FUNDER ?? path.join(os.homedir(), ".config/solana/id.json")
  );

export const MINT_FILE = path.join(KEYS_DIR, "mint.json");

export const readMint = (): PublicKey | null =>
  fs.existsSync(MINT_FILE)
    ? new PublicKey(JSON.parse(fs.readFileSync(MINT_FILE, "utf8")).mint)
    : null;

export const writeMint = (mint: PublicKey) =>
  fs.writeFileSync(MINT_FILE, JSON.stringify({ mint: mint.toBase58() }));

export const txLink = (signature: string) =>
  `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
