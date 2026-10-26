import "@testing-library/jest-dom/vitest";

// jsdom does not implement scrolling or object URLs. Both are browser-only
// side effects that the app calls; stub them so UI tests stay faithful to the
// rendered output without inventing behaviour.
Object.defineProperty(window, "scrollTo", { value: () => undefined, writable: true });
if (typeof URL.createObjectURL !== "function") {
  Object.defineProperty(URL, "createObjectURL", { value: () => "blob:test", writable: true });
  Object.defineProperty(URL, "revokeObjectURL", { value: () => undefined, writable: true });
}
