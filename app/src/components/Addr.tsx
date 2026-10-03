import { ArrowSquareOut } from "@phosphor-icons/react";
import { addrUrl } from "../config";
import { short } from "../format";
import { CopyIcon } from "./ui";

// Shortened address pill (mono), copy icon, Explorer link.
export function Addr({ value }: { value: string }) {
  return (
    <span className="addr">
      <code title={value}>{short(value)}</code>
      <CopyIcon value={value} label="Kopiuj adres" />
      <a href={addrUrl(value)} target="_blank" rel="noreferrer" aria-label="Explorer" className="icon-btn">
        <ArrowSquareOut size={18} weight="duotone" />
      </a>
    </span>
  );
}
