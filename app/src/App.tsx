import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider, WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useEffect, useState } from "react";
import { Addr } from "./components/Addr";
import { PROGRAM_ID, RPC_URL } from "./config";
import { EscrowPage } from "./pages/EscrowPage";
import { Home } from "./pages/Home";
import { NewEscrow } from "./pages/NewEscrow";
import { TxProvider } from "./tx";

// Hash routing: works on any static host, no server needed.
function useRoute() {
  const [hash, setHash] = useState(location.hash);
  useEffect(() => {
    const f = () => setHash(location.hash);
    addEventListener("hashchange", f);
    return () => removeEventListener("hashchange", f);
  }, []);
  return hash.replace(/^#/, "") || "/";
}

function Router() {
  const route = useRoute();
  const m = route.match(/^\/escrow\/(\w+)/);
  if (m) return <EscrowPage address={m[1]} />;
  if (route === "/new") return <NewEscrow />;
  return <Home />;
}

export default function App() {
  // Empty wallet list: Phantom and Solflare register themselves via Wallet Standard.
  return (
    <ConnectionProvider endpoint={RPC_URL}>
      <WalletProvider wallets={[]} autoConnect>
        <WalletModalProvider>
          <TxProvider>
            <header>
              <a href="#/"><b>Escrow bez arbitra</b></a>
              <span className="badge">devnet</span>
              <span>program: <Addr value={PROGRAM_ID.toBase58()} /></span>
              <WalletMultiButton />
            </header>
            <main>
              <Router />
            </main>
          </TxProvider>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
