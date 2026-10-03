import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider, WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Wallet } from "@phosphor-icons/react";
import { siGithub, siSolana } from "simple-icons";
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
              <div className="wrap header-in">
                <a href="#/" className="brand"><b>Escrow bez arbitra</b></a>
                <span className="badge">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d={siSolana.path} /></svg>
                  devnet
                </span>
                <WalletMultiButton startIcon={<Wallet size={18} weight="duotone" />} />
              </div>
            </header>
            <main className="wrap">
              <Router />
            </main>
            <footer>
              <div className="wrap footer-in">
                <a href="https://github.com/Nychsio/solana-escrow" target="_blank" rel="noreferrer">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d={siGithub.path} /></svg>
                  Nychsio/solana-escrow
                </a>
                <span>program: <Addr value={PROGRAM_ID.toBase58()} /></span>
              </div>
            </footer>
          </TxProvider>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
