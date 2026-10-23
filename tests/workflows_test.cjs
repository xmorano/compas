const puppeteer=require('/home/xmorano/Work/Eventos/whatsapp-service/node_modules/puppeteer');
const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 const browser=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
 const page=await browser.newPage(),errors=[],localRequests=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.url().includes(':3001'))localRequests.push(r.url())});
 await page.goto('http://127.0.0.1:8123/clases/');await page.waitForSelector('#auth-email');await page.type('#auth-email','admin@example.test');await page.type('#auth-password','Admin-test-123456');await page.click('#auth-form button');await page.waitForFunction(()=>window.COMPAS_LOADED);
 const fixture={centers:[{id:'c',name:'Centro migrado',address:'Calle prueba'}],groups:[{id:'g',center:'c',level:'Iniciación',day:'Lunes',start:'19:00',end:'20:00',total:8,whatsapp:'',whatsappGroupId:'123@g.us'}],coreos:[{id:'dance',name:'Coreo migrada',author:'Autora',level:'Iniciación',walls:4,counts:32,music:'https://example.com/music',video:'https://example.com/video',sheet:''}],sessions:[{id:'session',group:'g',date:'2026-10-01',start:'19:00',end:'20:00',term:'Otoño 2026',closed:true,items:[{coreo:'dance',mode:'Nueva',done:true,note:'Nota de prueba'}]}]};
 const file='/home/xmorano/Work/Clases/tests/runtime/migration.json';fs.writeFileSync(file,JSON.stringify(fixture));
 await page.click('#cloud-account');await page.click('#account-import');await (await page.$('#account-file')).uploadFile(file);await page.click('input[name="confirm"]');await page.click('#form button[type="submit"]');await page.waitForFunction(()=>!document.getElementById('modal').open);
 await page.click('[data-page="historial"]');assert((await page.$eval('#content',e=>e.textContent)).includes('Coreo migrada'));
 await page.click('[data-open="session"]');await page.click('[data-share]');assert(await page.$eval('#share-destination',e=>e.hidden));assert.equal(await page.$eval('#form button[type="submit"]',e=>e.textContent),'Abrir WhatsApp ↗');assert.equal(localRequests.length,0);
 await page.click('#cancel');await page.click('[data-page="centros"]');await page.click('[data-edit-group]');assert(await page.$eval('#f-whatsappGroupId',e=>e.hidden));await page.click('#form button[type="submit"]');await page.waitForFunction(()=>document.querySelector('.saved').textContent==='● Guardado en tu cuenta');
 await page.click('#cloud-admin');await page.click('#account-library');await page.waitForSelector('[data-manager-operation=publish]');await page.click('[data-manager-operation=publish]');await page.click('#form button[type="submit"]');await page.waitForFunction(()=>!document.getElementById('modal').open);
 assert((await page.evaluate(async()=>cloudApi('library'))).coreos.some(c=>c.name==='Coreo migrada'));
 // Simulate a concurrent save from another device.
 await page.evaluate(async()=>{const remote=await cloudApi('workspace');await cloudApi('workspace',{version:remote.version,data:remote.data});});
 await page.click('[data-page="centros"]');await page.click('[data-edit-center]');await page.$eval('#f-name',e=>e.value='Cambio en conflicto');await page.click('#form button[type="submit"]');await page.waitForSelector('#cloud-warning',{visible:true});
 assert((await page.$eval('#cloud-warning-text',e=>e.textContent)).includes('otra pestaña'));
 const remote=await page.evaluate(async()=>cloudApi('workspace'));assert.equal(remote.data.centers[0].name,'Centro migrado');assert(await page.evaluate(()=>Object.keys(localStorage).some(k=>k.startsWith('compas-pending-'))));
 assert.deepEqual(errors,[]);console.log('Flujos: migración de centros/clases, WhatsApp manual sin llamadas locales, edición de curso, publicación común y conflicto recuperable correctos.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
