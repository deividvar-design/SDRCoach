/**
 * Resolves once the page has finished loading and the browser has a quiet moment (or after two seconds at most), so
 * third-party scripts never compete with the page becoming usable or with the first clicks.
 */
export function afterLoadIdle(): Promise<void> {
  return new Promise((resolve) => {
    const idle = () => {
      if (typeof window.requestIdleCallback === "function") window.requestIdleCallback(() => resolve(), { timeout: 2000 });
      else setTimeout(resolve, 1);
    };
    if (document.readyState === "complete") idle();
    else window.addEventListener("load", idle, { once: true });
  });
}
