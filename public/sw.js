/* Only the public app shell is cached. Financial data stays in localStorage. */
const ROOT = new URL(self.registration?.scope || "/", self.location.origin);
const BASE_PATH = ROOT.pathname.replace(/\/$/, "");
const CACHE_PREFIX = BASE_PATH ? `whereditgo-${BASE_PATH.slice(1)}-shell-` : "whereditgo-shell-";
const SHELL_CACHE = `${CACHE_PREFIX}v1`;
const scoped = (path) => `${BASE_PATH}${path}`;
let development = false;

self.addEventListener("message", (event) => {
  if (event.data?.type === "DEVELOPMENT_MODE") development = true;
});

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    const response = await fetch(ROOT.pathname, { cache: "reload" });
    if (!response.ok) throw new Error("App shell unavailable");
    const html = await response.clone().text();
    const assets = new Set(["/icon", "/icon1", "/icon2", "/icon3", "/favicon.ico", "/apple-icon", "/manifest.webmanifest", "/brand/paper-detective.png", "/brand/detective-inspecting.png", "/brand/detective-waiting.png", "/brand/detective-celebrating.png", "/brand/detective-expressions.png", "/brand/detective-cooking.png", "/brand/detective-icon.png", "/brand/providers/gcash.svg", "/brand/providers/maya.svg", "/brand/providers/bpi.svg", "/brand/providers/bdo.svg", "/brand/providers/metrobank.png"].map(scoped));
    for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
      const value = match[1].replace(/&amp;/g, "&");
      if (value.startsWith(scoped("/_next/static/"))) assets.add(value);
    }
    await cache.addAll([...assets]);
    await cache.put(ROOT.pathname, response);
    // An update waits for existing tabs to close rather than replacing their JS.
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== SHELL_CACHE)
      .map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  if (development) return;
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || request.headers.get("RSC") === "1") return;
  const navigation = request.mode === "navigate" && url.pathname === ROOT.pathname;
  const asset = url.pathname.startsWith(scoped("/_next/static/")) ||
    ["/icon", "/icon1", "/icon2", "/icon3", "/favicon.ico", "/apple-icon", "/manifest.webmanifest", "/brand/paper-detective.png", "/brand/detective-inspecting.png", "/brand/detective-waiting.png", "/brand/detective-celebrating.png", "/brand/detective-expressions.png", "/brand/detective-cooking.png", "/brand/detective-icon.png", "/brand/providers/gcash.svg", "/brand/providers/maya.svg", "/brand/providers/bpi.svg", "/brand/providers/bdo.svg", "/brand/providers/metrobank.png"].map(scoped).includes(url.pathname);
  if (!navigation && !asset) return;

  event.respondWith((async () => {
    const cache = await caches.open(SHELL_CACHE);
    if (asset) {
      const saved = await cache.match(request);
      if (saved) return saved;
    }
    try {
      const response = await fetch(request);
      if (response.ok) await cache.put(navigation ? ROOT.pathname : request, response.clone());
      if (!response.ok && navigation) return (await cache.match(ROOT.pathname)) || response;
      return response;
    } catch (error) {
      const saved = await cache.match(navigation ? ROOT.pathname : request);
      if (saved) return saved;
      throw error;
    }
  })());
});
