export function createScope() {
  const controller = new AbortController();
  const cleanups = new Set();
  let disposed = false;
  return {
    signal: controller.signal,
    get disposed() { return disposed; },
    cleanup(fn) {
      if (typeof fn !== 'function') return;
      if (disposed) fn(); else cleanups.add(fn);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      controller.abort();
      for (const fn of cleanups) { try { fn(); } catch {} }
      cleanups.clear();
    }
  };
}
