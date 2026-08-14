const CACHE = "kb-cache-v3";
const ASSETS = [".", "index.html", "manifest.webmanifest", "icon.svg", "apple-touch-icon.png"];
self.addEventListener("install", function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(ASSETS).catch(function(){}); }));
  self.skipWaiting();
});
self.addEventListener("activate", function(e){
  e.waitUntil(caches.keys().then(function(ks){
    return Promise.all(ks.filter(function(k){ return k !== CACHE; }).map(function(k){ return caches.delete(k); }));
  }));
  self.clients.claim();
});
self.addEventListener("fetch", function(e){
  var req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  if (req.mode === "navigate"){
    /* 关键修复：每次导航强制绕过 HTTP/CDN 缓存拉取最新 index.html，
       避免部署新版本后 Service Worker 一直吐旧页面 */
    e.respondWith(fetch(req, {cache: "no-store"}).then(function(r){
      if (r && (r.status === 200 || r.status === 304)){
        var cp = r.clone(); caches.open(CACHE).then(function(c){ c.put(".", cp); });
      }
      return r;
    }).catch(function(){ return caches.match(".").then(function(r){ return r || caches.match("index.html"); }); }));
    return;
  }
  e.respondWith(caches.match(req).then(function(r){
    return r || fetch(req, {cache: "no-store"}).then(function(fr){ var cp = fr.clone(); caches.open(CACHE).then(function(c){ c.put(req, cp); }); return fr; }).catch(function(){ return r; });
  }));
});
