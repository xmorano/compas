const puppeteer=require('/home/xmorano/Work/Eventos/whatsapp-service/node_modules/puppeteer');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8123/clases/');
 await page.waitForSelector('#auth-email');
 await page.type('#auth-email','admin@example.test');await page.type('#auth-password','Admin-test-123456');await page.click('#auth-form button');
 await page.waitForSelector('#cloud-account',{visible:true});await page.waitForFunction(()=>window.COMPAS_LOADED===true);
 assert.equal(await page.$eval('.saved',e=>e.textContent),'● Guardado en tu cuenta');
 await page.click('button[data-page="centros"]');await page.click('[data-action="center"]');
 await page.type('#f-name','Centro del administrador');await page.type('#f-address','Calle de prueba');await page.click('#form button[type="submit"]');
 await page.waitForFunction(()=>document.querySelector('.saved').textContent==='● Guardado en tu cuenta');
 await page.reload();await page.waitForFunction(()=>window.COMPAS_LOADED===true);
 await page.click('[data-page="centros"]');assert((await page.$eval('#content',e=>e.textContent)).includes('Centro del administrador'));
 await page.click('#cloud-account');await page.click('#account-users');
 await page.type('#f-name','Profesora de prueba');await page.type('#f-email','browser-teacher@example.test');await page.click('#form button[type="submit"]');
 await page.waitForFunction(()=>document.getElementById('invite-link').value.includes('#acceso='));
 const link=await page.$eval('#invite-link',e=>e.value);
 const context=await browser.createBrowserContext();const teacher=await context.newPage();teacher.on('pageerror',e=>errors.push(e.message));
 await teacher.goto(link.replace('https://example.test','http://127.0.0.1:8123'));await teacher.waitForSelector('#auth-name');await teacher.$eval('#auth-name',e=>e.value='Profesora de prueba');await teacher.type('#auth-password','Browser-test-123456');await teacher.click('#auth-form button');
 await teacher.waitForFunction(()=>window.COMPAS_LOADED===true);
 await teacher.click('[data-page="centros"]');assert(!(await teacher.$eval('#content',e=>e.textContent)).includes('Centro del administrador'));
 await teacher.click('[data-page="coreos"]');await teacher.click('[onclick="cloudLibrary()"]');
 await teacher.waitForSelector('#library-list input');await teacher.click('#library-list input');await teacher.click('#form button[type="submit"]');
 await teacher.waitForFunction(()=>!document.getElementById('modal').open&&document.querySelector('.saved').textContent==='● Guardado en tu cuenta');
 assert((await teacher.$eval('#content',e=>e.textContent)).includes('Baile común'));
 await teacher.click('[data-edit-coreo]');await teacher.$eval('#f-name',e=>e.value='Mi baile independiente');await teacher.click('#form button[type="submit"]');
 await teacher.waitForFunction(()=>document.querySelector('.saved').textContent==='● Guardado en tu cuenta');
 await teacher.click('[onclick="cloudLibrary()"]');await teacher.waitForSelector('#library-list input');
 assert((await teacher.$eval('#library-list',e=>e.textContent)).includes('Baile común'));
 assert.equal(await teacher.$eval('#library-list input',e=>e.disabled),true);
 await teacher.click('#cancel');await teacher.click('#cloud-account');await teacher.click('#account-logout');await teacher.waitForSelector('#auth-email');
 assert.deepEqual(errors,[]);
 console.log('Navegador: acceso, guardado y recarga, invitación, aislamiento, copia del catálogo, edición independiente, duplicados y cierre correctos.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
