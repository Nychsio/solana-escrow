import { ArrowRight, Check, Copy, type Icon } from "@phosphor-icons/react";
import { useState, type ReactNode } from "react";

// Presentational building blocks only: no chain logic here.

export function IconBadge({ icon: I, danger, small }: { icon: Icon; danger?: boolean; small?: boolean }) {
  return (
    <span className={`badge-icon${danger ? " danger" : ""}${small ? " small" : ""}`}>
      <I size={small ? 16 : 26} weight="duotone" />
    </span>
  );
}

export function Card({
  icon,
  title,
  danger,
  children,
  className = "",
}: {
  icon: Icon;
  title: string;
  danger?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`card ${className}`}>
      <IconBadge icon={icon} danger={danger} />
      <h3>{title}</h3>
      {children}
    </section>
  );
}

// Hero at the top of every page: the only overline on the page, then a big H1.
export function Hero({ overline, children, lead, meta }: { overline: string; children: ReactNode; lead?: ReactNode; meta?: ReactNode }) {
  return (
    <div className="hero">
      <p className="overline">{overline}</p>
      <h1>{children}</h1>
      {meta && <div className="hero-meta">{meta}</div>}
      {lead && <p className="lead">{lead}</p>}
    </div>
  );
}

export function useCopy(value: string) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return { copied, copy };
}

export function CopyIcon({ value, label }: { value: string; label?: string }) {
  const { copied, copy } = useCopy(value);
  return (
    <button type="button" className="icon-btn" onClick={copy} aria-label={label ?? "Kopiuj"} title={label ?? "Kopiuj"}>
      {copied ? <Check size={18} weight="duotone" /> : <Copy size={18} weight="duotone" />}
    </button>
  );
}

// Action button with the instruction name as a small caption below it.
export function Act({
  kind = "neutral",
  icon: I,
  label,
  caption,
  onClick,
  disabled,
}: {
  kind?: "neutral" | "primary" | "danger";
  icon: Icon;
  label: string;
  caption: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="act">
      <button className={kind === "neutral" ? "" : kind} onClick={onClick} disabled={disabled}>
        <I size={18} weight="duotone" />
        {label}
        {kind === "primary" && <ArrowRight size={18} weight="bold" />}
      </button>
      <span className="cap">{caption}</span>
    </div>
  );
}
