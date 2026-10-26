import type { ReactNode } from "react";
import { levelInfo } from "../domain/progress";
import { href, type Route } from "../lib/router";
import { useProgress } from "../state/store";
import { Badge, ProgressBar } from "./ui";

const NAV = [
  { path: "/dashboard", label: "Dashboard" },
  { path: "/academy", label: "Academy" },
  { path: "/register", label: "Strategy register" },
  { path: "/lab", label: "Chart lab" },
  { path: "/quiz", label: "Quiz arena" },
  { path: "/scenarios", label: "Scenarios" },
  { path: "/analytics", label: "Analytics" },
  { path: "/assessment", label: "Assessment" },
  { path: "/settings", label: "Settings" },
] as const;

export function Shell({ route, children }: { route: Route; children: ReactNode }) {
  const { state, loadWarning, saveWarning, dismissLoadWarning, dismissSaveWarning } = useProgress();
  const level = levelInfo(state.xp);
  const active = `/${route.parts[0] ?? "dashboard"}`;

  return (
    <div className="app-shell">
      <a
        className="skip-link"
        href="#main-content"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById("main-content")?.focus();
        }}
      >
        Skip to content
      </a>
      <header className="topbar">
        <div className="topbar-inner">
          <a className="brand" href={href("/dashboard")}>
            <span className="brand-mark" aria-hidden="true">
              JT
            </span>
            <span>
              <span className="brand-name">JADU TONA</span>
              <span className="brand-sub">Trading Academy</span>
            </span>
          </a>

          <div className="topbar-stats" aria-label="Your local progress summary">
            <span className="topbar-stat">
              Lv {level.level} · {level.title}
            </span>
            <span className="topbar-stat">{state.xp} XP</span>
            <span className="topbar-stat" title="Consecutive days with a scored activity">
              {state.streak.current}-day streak
            </span>
          </div>
        </div>

        <nav className="main-nav" aria-label="Main">
          <div className="main-nav-inner">
            {NAV.map((item) => (
              <a
                key={item.path}
                href={href(item.path)}
                className={active === item.path ? "nav-link nav-link-active" : "nav-link"}
                aria-current={active === item.path ? "page" : undefined}
              >
                {item.label}
              </a>
            ))}
          </div>
        </nav>

        <div className="topbar-progress">
          <ProgressBar
            value={level.progress}
            label={level.nextMin === null ? "Maximum level reached" : `Progress to level ${level.level + 1}`}
          />
          <span className="topbar-progress-text">
            {level.nextMin === null ? "Top level reached" : `${Math.max(0, level.nextMin - state.xp)} XP to level ${level.level + 1}`}
          </span>
        </div>
      </header>

      {(loadWarning || saveWarning) && (
        <div className="warning-stack" role="status">
          {loadWarning && (
            <div className="alert alert-warn">
              <span>{loadWarning}</span>
              <button type="button" className="button button-ghost button-small" onClick={dismissLoadWarning}>
                Dismiss
              </button>
            </div>
          )}
          {saveWarning && (
            <div className="alert alert-warn">
              <span>{saveWarning}</span>
              <button type="button" className="button button-ghost button-small" onClick={dismissSaveWarning}>
                Dismiss
              </button>
            </div>
          )}
        </div>
      )}

      <main id="main-content" className="main-content" tabIndex={-1}>
        {children}
      </main>

      <footer className="site-footer">
        <div>
          <strong>Educational simulation only.</strong> Synthetic charts, no live market data, no order execution, no
          accounts. Nothing here is financial advice or a profitability claim.
        </div>
        <div className="footer-meta">
          <Badge tone="info">Local-first</Badge>
          <span>Progress stays in this browser.</span>
          <a href={href("/settings")}>Data &amp; scope</a>
        </div>
      </footer>
    </div>
  );
}
