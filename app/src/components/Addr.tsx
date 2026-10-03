import { Check, Copy, ExternalLink } from "lucide-react";
import { useState } from "react";
import { addrUrl } from "../config";
import { short } from "../format";

// Shortened address: click copies, arrow opens Explorer.
export function Addr({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <span className="addr">
      <code title={`${value} (kliknij, aby skopiować)`} onClick={copy}>
        {short(value)}
        {copied ? <Check size={16} strokeWidth={2} /> : <Copy size={16} strokeWidth={2} />}
      </code>{" "}
      <a href={addrUrl(value)} target="_blank" rel="noreferrer" aria-label="Explorer"><ExternalLink size={16} strokeWidth={2} /></a>
    </span>
  );
}
