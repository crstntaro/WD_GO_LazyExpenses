import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";

function fixture(prefix = "") {
  const origin = "https://example.test";
  const events = {};
  const files = new Map();
  const fetched = [];
  let offline = false;
  const key = (request) => new URL(typeof request === "string" ? request : request.url, origin).href;
  const html = '<link rel="stylesheet" href="/_next/static/app.css"><script src="/_next/static/app.js"></script><img src="/_next/static/mascot.png">'.replaceAll("/_next/", `${prefix}/_next/`);
  async function fetch(request) {
    fetched.push(key(request));
    if (offline) throw new Error("Offline");
    return new Response(key(request) === `${origin}${prefix}/` ? html : "public asset");
  }
  const cache = {
    async match(request) { return files.get(key(request))?.clone(); },
    async put(request, response) { files.set(key(request), response); },
    async addAll(requests) { for (const request of requests) await cache.put(request, await fetch(request)); },
  };
  const deleted = [];
  const self = {
    location: { origin },
    registration: { scope: `${origin}${prefix}/` },
    clients: { claim: async () => {} },
    addEventListener(type, listener) { events[type] = listener; },
  };
  vm.runInNewContext(readFileSync(new URL("../public/sw.js", import.meta.url), "utf8"), {
    self, fetch, URL, caches: {
      open: async () => cache,
      keys: async () => ["whereditgo-shell-old", "whereditgo-shell-v1", "unrelated-cache", "whereditgo-WD_GO_LazyExpenses-shell-old", "whereditgo-WD_GO_LazyExpenses-shell-v1"],
      delete: async (name) => { deleted.push(name); },
    },
  });
  return {
    files, fetched, deleted,
    setOffline() { offline = true; },
    development() { events.message({ data: { type: "DEVELOPMENT_MODE" } }); },
    async lifecycle(type) {
      let work;
      events[type]({ waitUntil(promise) { work = promise; } });
      await work;
    },
    async request(path, mode = "navigate") {
      let work;
      events.fetch({
        request: { url: new URL(path, origin).href, method: "GET", mode, headers: new Headers() },
        respondWith(promise) { work = promise; },
      });
      return work ? await work : null;
    },
  };
}

test("offline install caches the app shell, icons, scripts, styles, and mascot", async () => {
  const f = fixture();
  await f.lifecycle("install");
  for (const file of ["/", "/icon", "/icon1", "/icon2", "/icon3", "/favicon.ico", "/apple-icon", "/manifest.webmanifest", "/brand/paper-detective.png", "/brand/detective-inspecting.png", "/brand/detective-waiting.png", "/brand/detective-celebrating.png", "/brand/detective-expressions.png", "/brand/detective-cooking.webp", "/brand/detective-icon.png", "/_next/static/app.css", "/_next/static/app.js", "/_next/static/mascot.png"]) {
    assert.ok(f.files.has(`https://example.test${file}`), file);
  }
});

test("an installed app can reopen its cached shell and assets offline", async () => {
  const f = fixture();
  await f.lifecycle("install");
  f.setOffline();
  assert.match(await (await f.request("/")).text(), /app.js/);
  assert.equal(await (await f.request("/_next/static/app.js", "cors")).text(), "public asset");
});

test("activation only removes the app's old shell caches", async () => {
  const f = fixture();
  await f.lifecycle("activate");
  assert.deepEqual(f.deleted, ["whereditgo-shell-old"]);
});

test("the worker ignores external requests and non-shell paths", async () => {
  const f = fixture();
  assert.equal(await f.request("https://other.test/"), null);
  assert.equal(await f.request("/some-other-app"), null);
  assert.equal(f.fetched.length, 0);
});

test("a previous production worker stops caching when development starts", async () => {
  const f = fixture();
  await f.lifecycle("install");
  f.development();
  f.setOffline();
  assert.equal(await f.request("/"), null);
  assert.equal(await f.request("/_next/static/app.css", "cors"), null);
});

test("repository-path installs cache only their own scope and reopen offline",async()=>{
  const prefix="/WD_GO_LazyExpenses",f=fixture(prefix);
  await f.lifecycle("install");
  for(const file of ["/","/icon","/manifest.webmanifest","/_next/static/app.js","/brand/detective-icon.png"]){
    assert.ok(f.files.has(`https://example.test${prefix}${file}`));
    assert.ok(!f.files.has(`https://example.test${file}`));
  }
  await f.lifecycle("activate");assert.deepEqual(f.deleted,["whereditgo-WD_GO_LazyExpenses-shell-old"]);
  f.setOffline();assert.match(await(await f.request(`${prefix}/`)).text(),/app.js/);
  assert.equal(await(await f.request(`${prefix}/_next/static/app.js`,"cors")).text(),"public asset");
  assert.equal(await f.request("/_next/static/app.js","cors"),null);
});
