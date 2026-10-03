// Prints the demo wallets' secret keys in base58 for import into Phantom
// ("Import private key"). Output goes to this terminal only: never commit or paste it.
// Devnet demo wallets only.
import { utils } from "@anchor-lang/core";
import * as path from "path";
import { KEYS_DIR, loadKeypair } from "./common";

for (const name of ["client", "freelancer"]) {
  const kp = loadKeypair(path.join(KEYS_DIR, `${name}.json`));
  console.log(`${name.padEnd(10)} ${kp.publicKey.toBase58()}`);
  console.log(`  secret   ${utils.bytes.bs58.encode(kp.secretKey)}\n`);
}
