import { AnchorProvider, BN, Program, type Wallet } from "@anchor-lang/core";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { Buffer } from "buffer";
import { PublicKey, Transaction, VersionedTransaction } from "@solana/web3.js";
import { useEffect, useMemo, useState } from "react";
import idl from "./idl/escrow.json";
import type { Escrow } from "./idl/escrow";
import { PROGRAM_ID } from "./config";

export type EscrowProgram = Program<Escrow>;
export type EscrowAccount = Awaited<ReturnType<EscrowProgram["account"]["escrow"]["fetch"]>>;
export type StateName =
  | "funded" | "delivered" | "released" | "refunded" | "frozen" | "settled" | "burned";

export const stateOf = (e: EscrowAccount) => Object.keys(e.state)[0] as StateName;

// Used before a wallet is connected: reads work, signing throws.
const readOnlyWallet: Wallet = {
  publicKey: PublicKey.default,
  signTransaction: async <T extends Transaction | VersionedTransaction>(_tx: T): Promise<T> => {
    throw new Error("Połącz portfel");
  },
  signAllTransactions: async <T extends Transaction | VersionedTransaction>(_txs: T[]): Promise<T[]> => {
    throw new Error("Połącz portfel");
  },
} as Wallet;

// Anchor client built from the program IDL. The frontend only builds and sends transactions;
// every rule is checked by the on-chain program.
export function useProgram(): EscrowProgram {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();
  return useMemo(
    () =>
      new Program<Escrow>(
        idl as Escrow,
        new AnchorProvider(connection, (wallet as Wallet) ?? readOnlyWallet, {
          commitment: "confirmed",
        })
      ),
    [connection, wallet]
  );
}

// PDA seeds must match the program: ["escrow", client, id (u64 LE)].
export const escrowPda = (client: PublicKey, id: BN) =>
  PublicKey.findProgramAddressSync(
    [Buffer.from("escrow"), client.toBuffer(), id.toArrayLike(Buffer, "le", 8)],
    PROGRAM_ID
  )[0];

// Vault = associated token account owned by the escrow PDA.
export const vaultOf = (mint: PublicKey, escrow: PublicKey) =>
  getAssociatedTokenAddressSync(mint, escrow, true);

// Cluster clock estimate: the program checks deadlines against the on-chain clock,
// so buttons follow chain time (browser clock + measured offset), refreshed every minute.
let offset = 0;
export function useChainNow(): number {
  const { connection } = useConnection();
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    let alive = true;
    const sync = async () => {
      try {
        const t = await connection.getBlockTime(await connection.getSlot("confirmed"));
        if (alive && t) offset = t - Date.now() / 1000;
      } catch {
        /* keep last offset */
      }
    };
    sync();
    const s = setInterval(sync, 60_000);
    const t = setInterval(() => setNow(Math.floor(Date.now() / 1000 + offset)), 1000);
    return () => {
      alive = false;
      clearInterval(s);
      clearInterval(t);
    };
  }, [connection]);
  return now;
}
