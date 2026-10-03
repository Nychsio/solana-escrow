import { useState } from "react";

export function Home() {
  const [addr, setAddr] = useState("");
  return (
    <div>
      <h2>Otwórz umowę</h2>
      <input placeholder="Adres umowy (PDA)" value={addr} onChange={(e) => setAddr(e.target.value)} size={50} />
      <button onClick={() => (location.hash = `#/escrow/${addr.trim()}`)} disabled={!addr.trim()}>
        Otwórz
      </button>
    </div>
  );
}
