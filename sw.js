/* AVA Recruit independent App Shell lifecycle.
   Network-first for shell assets: a new deployment is discovered on reopen without
   a manual cache version bump, query-string busting or reinstall. */
const SHELL_CACHE = "ava-recruit-shell";
const SHELL_FILES = new Set([
  "", "index.html", "styles.css", "ava-recruit-ui.css",
  "design-system/tokens.css", "design-system/components.css",
  "app.js", "recruit-content.js", "recruit-engine.js", "recruit-cloud.js", "recruit-user-edit.js", "recruit-admin.js",
  "manifest.json", "icon-192.png", "icon-512.png"
]);
const scopeURL = new URL(self.registration.scope);
self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(caches.open(SHELL_CACHE));
});
self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names
      .filter(name => name.startsWith("ava-recruit-") && name !== SHELL_CACHE)
      .map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});
self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== scopeURL.origin || !url.pathname.startsWith(scopeURL.pathname)) return;
  const relative = decodeURIComponent(url.pathname.slice(scopeURL.pathname.length));
  if (!SHELL_FILES.has(relative) && req.mode !== "navigate") return;
  event.respondWith((async () => {
    const cache = await caches.open(SHELL_CACHE);
    try {
      const fresh = await fetch(req, {cache:"no-store"});
      if (fresh.ok && fresh.type === "basic") {
        await cache.put(req, fresh.clone());
      }
      return fresh;
    } catch (error) {
      const stored = await cache.match(req);
      if (stored) return stored;
      if (req.mode === "navigate") {
        const fallback = await cache.match(new URL("index.html",scopeURL).href);
        if (fallback) return fallback;
      }
      throw error;
    }
  })());
});
