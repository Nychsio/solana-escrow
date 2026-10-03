import { PublicKey } from "@solana/web3.js";
import idl from "./idl/escrow.json";

export const RPC_URL: string =
  import.meta.env.VITE_RPC_URL ?? "https://api.devnet.solana.com";
export const PROGRAM_ID = new PublicKey(idl.address);
// Demo test mint (classic SPL Token, 6 decimals), created by `yarn demo:setup`.
export const DEMO_MINT = new PublicKey("DeCDjMQm8CJY87Xga9upzC9WmJZsuipHCVqzz9ptTpH9");
export const DECIMALS = 6;

export const txUrl = (sig: string) =>
  `https://explorer.solana.com/tx/${sig}?cluster=devnet`;
export const addrUrl = (addr: string) =>
  `https://explorer.solana.com/address/${addr}?cluster=devnet`;
