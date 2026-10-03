import { addrUrl } from "../config";
import { short } from "../format";

// Shortened address: click copies, arrow opens Explorer.
export function Addr({ value }: { value: string }) {
  return (
    <span className="addr">
      <code title={`${value} (kliknij, aby skopiować)`} onClick={() => navigator.clipboard.writeText(value)}>
        {short(value)}
      </code>{" "}
      <a href={addrUrl(value)} target="_blank" rel="noreferrer">↗</a>
    </span>
  );
}
