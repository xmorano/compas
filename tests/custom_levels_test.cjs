const assert=require('node:assert/strict'),fs=require('node:fs');
const puppeteer=require('/home/xmorano/Work/Eventos/whatsapp-service/node_modules/puppeteer');
(async()=>{const browser=await puppeteer.launch({executablePath:'/opt/google/chrome/chrome',headless:true,args:['--no-sandbox']});try{
 const p=await browser.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('http://127.0.0.1:8134/');
 const original=await p.evaluate(()=>structuredClone(db));await p.click('[data-page=coreos]');await p.click('[data-action=coreo]');
 await p.type('#f-name','Coreo con nivel propio');await p.select('#f-level','__new_level__');await p.type('#f-new-level','Improver');await p.$eval('#extras-editor',e=>{e.innerHTML='<p><strong>Extras conservados</strong></p>';e.dispatchEvent(new Event('input',{bubbles:true}));});await p.click('#form [type=submit]');
 const id=await p.evaluate(()=>db.coreos.find(c=>c.name==='Coreo con nivel propio').id);assert.equal(await p.evaluate(id=>coreo(id).level,id),'Improver');
 await p.reload();await p.evaluate(()=>go('coreos'));await p.click(`[data-edit-coreo="${id}"]`);assert.equal(await p.$eval('#f-level',e=>e.value),'Improver');assert((await p.$eval('#extras-editor',e=>e.textContent)).includes('Extras conservados'));await p.click('#cancel');
 await p.click('[data-action=coreo]');await p.type('#f-name','Otra coreo');await p.select('#f-level','__new_level__');await p.type('#f-new-level','impróver');await p.click('#form [type=submit]');
 assert.deepEqual(await p.evaluate(()=>db.customLevels),['Improver']);
 await p.click('[data-action=coreo]');await p.select('#f-level','__new_level__');await p.type('#f-new-level','No guardar');await p.click('#cancel');assert.equal(await p.evaluate(()=>db.customLevels.includes('No guardar')),false);
 await p.evaluate(()=>{go('centros');editGroup(null,'g1');});assert(await p.$eval('#f-level',e=>[...e.options].some(o=>o.value==='Improver')));await p.click('#cancel');
 const isolated=await p.evaluate(original=>{const mine=db;db=original;const levels=userCoreoLevels();db=mine;return !levels.includes('Improver');},original);assert(isolated);
 // Use real dialogs and editor with mocked delivery endpoints; no emails or external writes.
 let code=fs.readFileSync('server/cloud.js','utf8');code=code.slice(0,code.indexOf('(async()=>{try{'))+code.slice(code.indexOf('function libraryCopies'));await p.addScriptTag({content:code});
 await p.evaluate(()=>{cloudUser={id:'teacher',name:'Profe',role:'teacher'};window.calls=[];window.shared=[{id:'new-one',name:'Nueva uno',level:'Nouveau'},{id:'new-two',name:'Nueva dos',level:'NiveauX'}];cloudRefreshNotifications=async()=>{};cloudRefreshCoreoStates=async()=>{};cloudApi=async(action,body)=>{calls.push({action,body});if(action==='library')return {coreos:shared,version:0,unseenIds:shared.map(c=>c.id)};if(action==='suggestions'&&!body)return {suggestions:[]};return {ok:true};};return cloudLibrary();});
 await p.click('#library-all');await p.waitForSelector('[data-transfer-level=Nouveau]');await p.select('[data-transfer-level=Nouveau]','Intermedio');await p.click('#form [type=submit]');await p.waitForFunction(()=>!document.getElementById('modal').open);
 const copies=await p.evaluate(()=>db.coreos.filter(c=>c.libraryId));assert.equal(copies.find(c=>c.libraryId==='new-one').level,'Intermedio');assert.equal(copies.find(c=>c.libraryId==='new-two').level,'NiveauX');assert((await p.evaluate(()=>db.customLevels)).includes('NiveauX'));assert.equal(await p.evaluate(()=>shared[0].level),'Nouveau');
 await p.evaluate(()=>{cloudUser.role='admin';db.coreos.push({id:'own-new',name:'Coreo para compartir',level:'Enseignement'});return cloudShareCoreo('own-new');});
 await p.select('[data-transfer-level=Enseignement]','Avanzado');await p.click('#form [type=submit]');await p.waitForFunction(()=>!document.getElementById('modal').open);
 const publication=await p.evaluate(()=>calls.filter(c=>c.action==='library'&&c.body).at(-1));assert.equal(publication.body.coreos[0].level,'Avanzado');assert.equal(await p.evaluate(()=>coreo('own-new').level),'Enseignement');
 await p.evaluate(()=>cloudReviewSuggestion({id:'proposal',teacher_name:'Otra profe',teacher_email:'otra@example.test',coreo:{id:'source',name:'Propuesta con nivel',level:'ExpertPro'}},'accepted'));
 assert.equal(await p.$eval('#review-level',e=>e.value),'__new_level__');assert.equal(await p.$eval('#review-new-level',e=>e.value),'ExpertPro');await p.select('#review-level','Intermedio');await p.click('#form [type=submit]');await p.waitForSelector('#suggestion-filter');
 const review=await p.evaluate(()=>calls.find(c=>c.action==='review-suggestion'));assert.equal(review.body.coreo.level,'Intermedio');assert.equal('new_level' in review.body.coreo,false);
 assert.deepEqual(errors,[]);console.log('OK: niveles propios persistentes, deduplicación, cancelación, extras, grupos, aislamiento, importación, publicación y revisión con mapeo. Chrome real y API de intercambio simulada.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
