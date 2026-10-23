const puppeteer=require('/home/xmorano/Work/Eventos/whatsapp-service/node_modules/puppeteer');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const workerPath=path.resolve(__dirname,'../dist/clases/sw.js'),original=fs.readFileSync(workerPath,'utf8');
 const browser=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8123/clases/');
 await page.evaluate(()=>navigator.serviceWorker.ready);await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
 const manifest=await page.evaluate(async()=> (await fetch('manifest.webmanifest')).json());
 assert.equal(manifest.start_url,'./');assert.equal(manifest.scope,'./');assert.equal(manifest.display,'standalone');
 for(const icon of manifest.icons){assert(await page.evaluate(src=>new Promise(resolve=>{const img=new Image();img.onload=()=>resolve(img.naturalWidth>=192);img.onerror=()=>resolve(false);img.src=src}),icon.src));}
 const cdp=await page.createCDPSession();const install=await cdp.send('Page.getInstallabilityErrors');assert.deepEqual(install.installabilityErrors,[]);
 assert(await page.$('#pwa-install'));await page.$eval('#pwa-help',e=>e.showModal());await page.click('#pwa-help-close');
 await page.waitForSelector('#auth-email');await page.type('#auth-email','admin@example.test');await page.type('#auth-password','Admin-test-123456');await page.click('#auth-form button');await page.waitForFunction(()=>window.COMPAS_LOADED,{timeout:10000}).catch(async e=>{console.error('DOM:',await page.$eval('#auth',el=>el.textContent),'JS:',errors);throw e});
 const cacheUrls=await page.evaluate(async()=>{const keys=await caches.keys();const result=[];for(const key of keys)for(const r of await (await caches.open(key)).keys())result.push(r.url);return result;});
 assert(cacheUrls.length>5);assert(!cacheUrls.some(url=>url.includes('/api/')||url.endsWith('/clases/')||url.endsWith('/index.html')));
 await page.evaluate(()=>caches.open('another-site-cache'));
 // A service-worker update must wait for consent and preserve unsaved work.
 fs.writeFileSync(workerPath,original.replace("const CACHE_NAME=CACHE_PREFIX+'", "const CACHE_NAME=CACHE_PREFIX+'test-update-"));
 await page.evaluate(async()=>{const reg=await navigator.serviceWorker.getRegistration();await reg.update();});
 await page.waitForFunction(async()=>!!(await navigator.serviceWorker.getRegistration()).waiting);
 await page.waitForSelector('#pwa-update',{visible:true});
 await page.evaluate(()=>{cloudPending='test-pending';});await page.click('#pwa-update-now');assert((await page.$eval('#pwa-update-text',e=>e.textContent)).includes('Guarda los cambios'));
 assert(await page.evaluate(async()=>!!(await navigator.serviceWorker.getRegistration()).waiting));
 await page.evaluate(()=>{cloudPending=null;});await Promise.all([page.waitForNavigation(),page.click('#pwa-update-now')]);await page.waitForFunction(()=>window.COMPAS_LOADED);
 const keys=await page.evaluate(()=>caches.keys());assert(keys.includes('another-site-cache'));assert.equal(keys.filter(k=>k.startsWith('compas-pwa-')).length,1);
 // Authenticated requests are not served from cache when the network goes away.
 await page.setOfflineMode(true);
 const apiFailed=await page.evaluate(async()=>{try{await fetch('api/index.php?action=workspace');return false}catch{return true}});assert(apiFailed);
 await page.reload();assert((await page.$eval('body',e=>e.textContent)).includes('Necesitas conexión'));assert(!(await page.$eval('body',e=>e.textContent)).includes('Centro migrado'));
 await page.setOfflineMode(false);await page.goto('http://127.0.0.1:8123/clases/');await page.waitForFunction(()=>window.COMPAS_LOADED);
 await page.setViewport({width:390,height:844,isMobile:true,hasTouch:true});
 await page.screenshot({path:path.resolve(__dirname,'runtime/pwa-mobile.png'),fullPage:true});
 assert.deepEqual(errors,[]);
 console.log('PWA: manifiesto e iconos instalables, caché pública, API sin caché, pantalla sin conexión, actualización con consentimiento y protección de cambios comprobados en Chrome.');
 }finally{fs.writeFileSync(workerPath,original);await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
