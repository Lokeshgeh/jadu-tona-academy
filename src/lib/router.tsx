import { useEffect, useState } from "react";
import type { ReactNode } from "react";

export interface Route {
  /** Normalised path, always starts with "/" and has no trailing slash. */
  path: string;
  parts: string[];
  query: URLSearchParams;
  hash: string;
}

function decodePart(part: string): string {
  try {
    return decodeURIComponent(part);
  } catch {
    // A malformed percent escape is user-controlled URL input, not a reason to
    // crash the app. Keep the raw segment so the route can fall through to 404.
    return part;
  }
}

export function parseHash(hash: string): Route {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  const [pathPart = "", queryPart = ""] = raw.split("?", 2);
  let path = pathPart || "/";
  if (!path.startsWith("/")) path = `/${path}`;
  if (path.length > 1) path = path.replace(/\/+$/, "");
  const parts = path.split("/").filter(Boolean).map(decodePart);
  return { path, parts, query: new URLSearchParams(queryPart), hash: raw };
}

export function href(path: string): string {
  return `#${path.startsWith("/") ? path : `/${path}`}`;
}

export function Link({
  to,
  className,
  children,
  title,
  onClick,
}: {
  to: string;
  className?: string;
  children: ReactNode;
  title?: string;
  onClick?: () => void;
}) {
  return (
    <a href={href(to)} className={className} title={title} onClick={onClick}>
      {children}
    </a>
  );
}

export function navigate(path: string, replace = false): void {
  const target = href(path);
  if (replace) {
    window.history.replaceState(null, "", target);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  } else {
    window.location.hash = target;
  }
}

export function useHashRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));
  useEffect(() => {
    const onChange = () => setRoute(parseHash(window.location.hash));
    window.addEventListener("hashchange", onChange);
    if (!window.location.hash) window.history.replaceState(null, "", "#/dashboard");
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return route;
}
