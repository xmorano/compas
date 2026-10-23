const assert=require('node:assert/strict'),fs=require('node:fs');
const puppeteer=require('/home/xmorano/Work/Eventos/whatsapp-service/node_modules/puppeteer');
(async()=>{const browser=await puppeteer.launch({executablePath:'/opt/google/chrome/chrome',headless:true,args:['--no-sandbox']});try{
 const p=await browser.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 const file='/tmp/compas-center-photo.png',png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aQ0cAAAAASUVORK5CYII=','base64');fs.writeFileSync(file,png);
 await p.setRequestInterception(true);p.on('request',req=>req.url()==='https://example.test/center.jpg'?req.respond({status:200,contentType:'image/png',body:png}):req.continue());
 await p.goto('http://127.0.0.1:8134/');await p.click('[data-page=centros]');await p.click('[data-action=center]');
 await p.type('#f-name','Centro con foto');await p.type('#f-address','Calle de prueba');
 async function upload(){const [chooser]=await Promise.all([p.waitForFileChooser(),p.click('#center-photo-file')]);await chooser.accept([file]);await p.waitForFunction(()=>document.getElementById('center-photo-status').textContent.startsWith('Foto lista'));}
 await upload();assert.equal(await p.$eval('#form [type=submit]',e=>e.disabled),false);await p.click('#form [type=submit]');
 const id=await p.evaluate(()=>db.centers.find(c=>c.name==='Centro con foto').id);const embedded=await p.evaluate(id=>center(id).photo,id);assert(embedded.startsWith('data:image/jpeg;base64,'));
 assert(await p.$eval(`[data-edit-center="${id}"]`,e=>e.closest('.card').querySelector('.center-photo img').src.startsWith('data:image/jpeg')));
 await p.reload();await p.click('[data-page=centros]');assert.equal(await p.evaluate(id=>center(id).photo,id),embedded);
 await p.click(`[data-edit-center="${id}"]`);assert.equal(await p.$eval('#f-photo',e=>e.value),'');
 await p.type('#f-photo','https://example.test/center.jpg');await p.click('#form [type=submit]');assert.equal(await p.evaluate(id=>center(id).photo,id),'https://example.test/center.jpg');
 await p.click(`[data-edit-center="${id}"]`);await upload();await p.click('#cancel');assert.equal(await p.evaluate(id=>center(id).photo,id),'https://example.test/center.jpg');
 await p.click(`[data-edit-center="${id}"]`);await upload();await p.click('#form [type=submit]');assert((await p.evaluate(id=>center(id).photo,id)).startsWith('data:image/jpeg'));
 await p.click(`[data-edit-center="${id}"]`);await p.click('#center-photo-remove');await p.click('#form [type=submit]');assert.equal(await p.evaluate(id=>center(id).photo,id),'');
 await p.reload();assert.equal(await p.evaluate(id=>center(id).photo,id),'');
 for(const width of [1280,390]){await p.setViewport({width,height:900});await p.evaluate(id=>{go('centros');editCenter(id);},id);assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await p.click('#cancel');}
 assert.deepEqual(errors,[]);console.log('OK: alta con foto, reducción, persistencia, cambio a URL y archivo, cancelación, retirada y móvil. Chrome real.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
