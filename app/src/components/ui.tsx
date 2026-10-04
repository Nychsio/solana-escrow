import { ArrowRight, Check, Copy, ShareNetwork, type Icon } from "@phosphor-icons/react";
import { useState, type ReactNode } from "react";
import { useTx } from "../tx";

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

// Full-width light band at the top of every page: the only overline on the page, then a big H1.
// `after` (state path) stays inside the band; `float` (a card) overlaps the band's bottom edge.
export function Hero({
  overline,
  children,
  lead,
  meta,
  after,
  float,
}: {
  overline: string;
  children: ReactNode;
  lead?: ReactNode;
  meta?: ReactNode;
  after?: ReactNode;
  float?: ReactNode;
}) {
  return (
    <div className={`hero${float ? " has-float" : ""}`}>
      <div className="wrap hero-in">
        <p className="overline">{overline}</p>
        <h1>{children}</h1>
        {meta && <div className="hero-meta">{meta}</div>}
        {lead && <p className="lead">{lead}</p>}
        {after}
        {float && <div className="hero-float">{float}</div>}
      </div>
    </div>
  );
}

// Clipboard with a fallback for contexts where navigator.clipboard is unavailable or rejects.
export async function copyText(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = value;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

export function useCopy(value: string, ms = 1500) {
  const { notify } = useTx();
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    if (!(await copyText(value))) {
      notify({ ok: false, label: "Nie udało się skopiować, zaznacz link ręcznie" });
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), ms);
  };
  return { copied, copy };
}

// Card right under the hero: full URL (read-only, click selects it) and a big copy button.
export function ShareLinkCard({ title }: { title: string }) {
  const url = location.href;
  const { copied, copy } = useCopy(url, 2000);
  return (
    <section className="share">
      <IconBadge icon={ShareNetwork} />
      <div className="share-body">
        <h3>{title}</h3>
        <div className="share-row">
          <input className="share-url" readOnly value={url} onClick={(e) => e.currentTarget.select()} aria-label="Link do umowy" />
          <button className="primary" onClick={copy}>
            {copied ? <Check size={18} weight="bold" /> : <Copy size={18} weight="duotone" />}
            {copied ? "Skopiowano" : "Kopiuj link"}
          </button>
        </div>
      </div>
    </section>
  );
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
