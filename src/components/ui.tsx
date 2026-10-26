import type { ReactNode } from "react";
import { Link } from "../lib/router";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p className="page-description">{description}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "good" | "warn" | "bad" | "info";
}) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <div className="stat-card">
      <p className="stat-label">{label}</p>
      <p className="stat-value">{value}</p>
      {hint && <p className="stat-hint">{hint}</p>}
    </div>
  );
}

export function ProgressBar({
  value,
  label,
  tone = "accent",
}: {
  value: number;
  label: string;
  tone?: "accent" | "good";
}) {
  const clamped = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  return (
    <div
      className={`progress ${tone === "good" ? "progress-good" : ""}`}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped * 100)}
    >
      <span style={{ width: `${clamped * 100}%` }} />
    </div>
  );
}

export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

export function Callout({
  title,
  tone = "info",
  children,
}: {
  title: string;
  tone?: "info" | "warn" | "good";
  children: ReactNode;
}) {
  return (
    <aside className={`callout callout-${tone}`}>
      <strong>{title}</strong>
      <div>{children}</div>
    </aside>
  );
}

export function ButtonLink({
  to,
  children,
  variant = "secondary",
}: {
  to: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
}) {
  return (
    <Link to={to} className={`button button-${variant}`}>
      {children}
    </Link>
  );
}

export function RuleChips({ ids }: { ids: readonly string[] }) {
  if (ids.length === 0) return null;
  return (
    <span className="rule-chips">
      {ids.map((id) => (
        <Link key={id} to={`/register?focus=${encodeURIComponent(id)}`} className="rule-chip" title={`Open ${id} in the register`}>
          {id}
        </Link>
      ))}
    </span>
  );
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
