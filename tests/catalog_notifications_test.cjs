// UI test with mocked API; does not replace PHP/MySQL integration tests.
const puppeteer=require('/home/xmorano/Work/Eventos/whatsapp-service/node_modules/puppeteer');
const fs=require('node:fs');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await puppeteer.launch({executablePath:'/opt/google/chrome/chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setContent('<main><div id="cloud-warning"></div></main><dialog id="modal"><form id="form"><h2 id="modal-title"></h2><button type="button" id="close">Cerrar</button><div id="fields"></div><button type="button" id="cancel">Cancelar</button><button type="submit">Guardar</button></form></dialog>');
  let source=fs.readFileSync('server/cloud.js','utf8');
  source=source.slice(0,source.indexOf('(async()=>{try{'))+source.slice(source.indexOf('function libraryCopies'));
  await page.addScriptTag({content:source});
  await page.evaluate(()=>{
   if(!crypto.randomUUID)crypto.randomUUID=()=> 'test-copy-'+Math.random().toString(16).slice(2);
   window.db={coreos:[{id:'private',name:'Mi coreo',level:'Inicial',music:'https://example.test/song',extras:'<img src=x onerror=alert(1)>'}]};
   window.matchingRoutines=(rows,q)=>rows.filter(c=>c.name.includes(q));window.save=()=>{};window.render=()=>{};window.toast=message=>window.lastToast=message;
   window.modal=(title,html)=>{document.getElementById('modal-title').textContent=title;document.getElementById('fields').innerHTML=html;document.querySelector('[type=submit]').disabled=false;document.getElementById('modal').showModal();};
   window.calls=[];window.proposals=[];window.seen=[];
   cloudUser={id:'teacher',role:'teacher'};
   cloudApi=async(action,body)=>{
    calls.push({action,body});
    if(action==='notifications')return {newCoreos:seen.includes('new')?0:1,pendingSuggestions:cloudUser.role==='admin'?proposals.filter(s=>s.status==='pending').length:0};
    if(action==='library')return {coreos:[{id:'old',name:'Anterior',level:'Inicial'},{id:'new',name:'Nueva',level:'Inicial'}],unseenIds:seen.includes('new')?[]:['new']};
    if(action==='library-seen'){seen.push(...body.ids);return {ok:true};}
    if(action==='suggestions'&&!body)return {suggestions:proposals};
    if(action==='suggestions'){proposals.push({id:'p1',source_id:'private',status:'pending',teacher_name:'Profe <script>',teacher_email:'profe@example.test',coreo:db.coreos[0]});return {id:'p1'};}
    if(action==='review-suggestion'){proposals[0].status=body.decision;return {ok:true};}
    throw Error('Acción no simulada: '+action);
   };
   cloudStartNotifications();
  });
  await page.waitForSelector('[data-new-coreos]');await page.click('[data-new-coreos]');
  await page.waitForSelector('#library-list input');
  assert.equal(await page.$eval('#library-new',e=>e.checked),true);
  assert.equal(await page.$$eval('#library-list input',es=>es.length),1);
  assert((await page.$eval('#library-list',e=>e.textContent)).includes('NUEVA'));
  await page.click('#library-all');await page.click('#form [type=submit]');
  await page.waitForFunction(()=>!document.getElementById('modal').open);
  assert.equal(await page.evaluate(()=>db.coreos.some(c=>c.name==='Nueva'&&c.libraryId==='new')),true);
  await page.waitForFunction(()=>document.getElementById('cloud-notifications').hidden);
  await page.evaluate(()=>cloudSuggestions());await page.select('#suggestion-source','private');
  assert.equal(await page.$('#suggestion-preview img'),null);
  await page.click('#form [type=submit]');await page.waitForFunction(()=>document.getElementById('suggestion-list').textContent.includes('Pendiente'));
  assert.equal(await page.$eval('#suggestion-source option[value=private]',e=>e.disabled),true);
  await page.evaluate(()=>{document.getElementById('modal').close();cloudUser.role='admin';return cloudRefreshNotifications();});
  await page.waitForSelector('[data-pending-suggestions]');await page.click('[data-pending-suggestions]');
  await page.waitForSelector('[data-review=accepted]');
  assert((await page.$eval('#suggestion-list',e=>e.textContent)).includes('Profe <script>'));
  assert.equal(await page.$('#suggestion-list script'),null);
  await page.click('[data-review=accepted]');await page.waitForFunction(()=>document.getElementById('suggestion-list').textContent.includes('No hay propuestas'));
  assert.equal(await page.evaluate(()=>proposals[0].status),'accepted');
  assert.equal(await page.$('[data-pending-suggestions]'),null);
  assert.deepEqual(errors,[]);
  console.log('OK: aviso, lista de novedades, copia privada, propuesta, autor, aprobación y escape de HTML. API simulada.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
