// Generated version changes whenever a bundled public asset changes.
const CACHE_PREFIX='compas-pwa-'+new URL(self.registration.scope).pathname+'-';
const CACHE_NAME=CACHE_PREFIX+'15f9edc07cc901c0';
const ASSETS=["app.js", "assets/vadecountry-logo.png", "cloud.css", "cloud.js", "csv.js", "icons/apple-touch-icon.png", "icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-512.png", "icons/icon.svg", "manifest.webmanifest", "offline.html", "previous-class.js", "pwa.js", "rich-extras.js", "style.css", "whatsapp.js"];
const urls=new Set(ASSETS.map(path=>new URL(path,self.registration.scope).href));
const offlineUrl=new URL('offline.html',self.registration.scope).href;
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(ASSETS.map(path=>new Request(new URL(path,self.registration.scope),{cache:'reload'})))));
});
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    for(const key of await caches.keys())if(key.startsWith(CACHE_PREFIX)&&key!==CACHE_NAME)await caches.delete(key);
    await self.clients.claim();
  })());
});
self.addEventListener('message',event=>{
  if(event.data?.type==='ACTIVATE_UPDATE')event.waitUntil(self.skipWaiting());
});
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url),scope=new URL(self.registration.scope);
  // Never intercept mutations, API responses, external resources or other websites.
  if(request.method!=='GET'||url.origin!==scope.origin||!url.pathname.startsWith(scope.pathname)||url.pathname.startsWith(scope.pathname+'api/'))return;
  if(request.mode==='navigate'){
    event.respondWith(fetch(request).catch(async()=> (await caches.open(CACHE_NAME)).match(offlineUrl)));
    return;
  }
  // Exact allowlist: query strings, session data and user-provided URLs are not cached.
  if(!urls.has(url.href))return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE_NAME);
    try {
      const response=await fetch(request,{cache:'no-store'});
      if(response.ok)await cache.put(request,response.clone());
      return response;
    } catch(error) {const cached=await cache.match(request);if(cached)return cached;throw error;}
  })());
});
