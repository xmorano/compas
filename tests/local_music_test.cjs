const fs=require('node:fs'),assert=require('node:assert/strict'),cp=require('node:child_process');
const puppeteer=require('/home/xmorano/Work/Eventos/whatsapp-service/node_modules/puppeteer');
(async()=>{
 const fixture='/tmp/compas-test-audio.mp3';
 cp.execFileSync('ffmpeg',['-v','error','-y','-f','lavfi','-i','sine=frequency=440:duration=10',fixture]);
 const browser=await puppeteer.launch({executablePath:process.env.CHROME_BINARY||(['/usr/bin/google-chrome','/opt/google/chrome/chrome'].find(path=>fs.existsSync(path))),headless:true,args:['--no-sandbox']});
 try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8134/');await page.click('[data-page="coreos"]');
 const box='[data-local-music="r1"]';await page.waitForSelector(box+'[data-ready]');
 const [chooser]=await Promise.all([page.waitForFileChooser(),page.click(box+' [data-music="choose"]')]);await chooser.accept([fixture]);
 await page.waitForSelector(box+' [data-music="play"]');
 await page.evaluate(()=>{activeSession='s1';render();});await page.waitForSelector(box+' [data-music="play"]');assert.equal(await page.$(box+' [data-music="choose"]'),null);
 await page.click(box+' [data-music="play"]');await page.waitForFunction(()=>document.querySelector('audio')?.currentTime>0);
 await page.$eval('#music-speed',el=>{el.value='75';el.dispatchEvent(new Event('input',{bubbles:true}));});
 assert.equal(await page.$eval('audio',el=>el.playbackRate),0.75);
 assert.equal(await page.$eval('audio',el=>el.preservesPitch),true);
 assert.equal(await page.$eval('#music-speed-value',el=>el.textContent),'75 %');
 await page.click('[data-cycle-state="0"]');assert(await page.$('.local-player audio'));
 assert(await page.evaluate(()=>!document.querySelector('audio').paused));
 assert.equal(await page.$eval('audio',el=>el.playbackRate),0.75);
 await page.click('[data-speed-reset]');assert.equal(await page.$eval('audio',el=>el.playbackRate),1);
 assert(await page.evaluate(()=>!document.querySelector('audio').paused));
 await page.reload();await page.click('[data-open="s1"]');await page.waitForSelector(box+' [data-music="play"]');
 await page.setOfflineMode(true);await page.click(box+' [data-music="play"]');await page.waitForFunction(()=>document.querySelector('audio')?.currentTime>0);await page.setOfflineMode(false);
 // Another account on the same device cannot see this local account's track.
 await page.evaluate(()=>{window.COMPAS_CLOUD=true;window.cloudUser={id:'other-teacher'};render();});
 await page.waitForSelector(box+'[data-ready]');await new Promise(r=>setTimeout(r,150));assert.equal(await page.$(box+' [data-music="play"]'),null);
 await page.evaluate(()=>{window.COMPAS_CLOUD=false;render();});await page.waitForSelector(box+' [data-music="play"]');
 await page.evaluate(()=>go('coreos'));await page.waitForSelector(box+' [data-music="remove"]');
 page.once('dialog',d=>d.accept());await page.click(box+' [data-music="remove"]');await page.waitForFunction(()=>!document.querySelector('[data-local-music="r1"] [data-music="play"]'));assert.equal(await page.$('.local-player'),null);
 assert.deepEqual(errors,[]);
 // Generated public edition still meets Chrome installability criteria.
 const pwa=await browser.newPage();await pwa.setRequestInterception(true);pwa.on('request',r=>r.url().includes('/api/')?r.respond({status:200,contentType:'application/json',body:JSON.stringify({user:null,csrf:'test',needsSetup:false})}):r.continue());
 await pwa.goto('http://127.0.0.1:8134/dist/clases/');await pwa.evaluate(()=>navigator.serviceWorker.ready);await pwa.waitForFunction(()=>!!navigator.serviceWorker.controller);
 const cdp=await pwa.createCDPSession();assert.deepEqual((await cdp.send('Page.getInstallabilityErrors')).installabilityErrors,[]);
 assert.equal(await pwa.$eval('#pwa-install',e=>e.textContent),'Instalar Compás');
 console.log('OK: importación, persistencia, reproducción sin red, reproducción durante marcado, aislamiento por cuenta, eliminación e instalación PWA.');
 }finally{await browser.close();fs.unlinkSync(fixture);}
})().catch(e=>{console.error(e);process.exitCode=1;});
