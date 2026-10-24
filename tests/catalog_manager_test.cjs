const puppeteer=require('/home/xmorano/Work/Eventos/whatsapp-service/node_modules/puppeteer');
const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{const browser=await puppeteer.launch({executablePath:'/opt/google/chrome/chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});try{
 const p=await browser.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.setContent('<aside><nav><button id="cloud-admin">Administración</button></nav></aside><main><span id="crumb"></span><div id="content"></div></main><dialog id="modal"><form id="form"><h2 id="modal-title"></h2><button id="close" type="button">Cerrar</button><div id="fields"></div><button id="cancel" type="button">Cancelar</button><button type="submit">Guardar</button></form></dialog>');
 await p.addStyleTag({content:fs.readFileSync('style.css','utf8').split('\n').slice(1).join('\n')+fs.readFileSync('server/cloud.css','utf8')});
 let code=fs.readFileSync('server/cloud.js','utf8');code=code.slice(0,code.indexOf('(async()=>{try{'))+code.slice(code.indexOf('function libraryCopies'));await p.addScriptTag({content:code});await p.addScriptTag({content:fs.readFileSync('custom-levels.js','utf8')});await p.evaluate(()=>window.esc=cloudEscape);
 await p.evaluate(()=>{
  cloudUser={id:'admin',role:'admin'};window.page='agenda';window.activeSession=null;
  window.db={coreos:[{id:'private',name:'Privada',level:'Inicial'},{id:'live',name:'Publicada',level:'Intermedio'}]};
  window.catalog=[{id:'live',name:'Publicada',level:'Intermedio',publicationVersion:1},{id:'external',name:'Propuesta de profe',level:'Inicial',publicationVersion:1}];window.version=1;window.calls=[];
  window.render=()=>cloudRenderLibraryManager();window.toast=()=>{};window.go=()=>{};
  window.modal=(title,html)=>{document.getElementById('modal-title').textContent=title;document.getElementById('fields').innerHTML=html;document.querySelector('[type=submit]').disabled=false;document.getElementById('modal').showModal();};
  cloudRefreshCoreoStates=async()=>{};cloudRefreshNotifications=async()=>{};
  cloudApi=async(action,body)=>{calls.push({action,body});if(action==='library'&&!body)return {coreos:structuredClone(catalog),version};
   if(action==='library-unpublish'){if(body.version!==version)throw Error('Conflicto');for(const c of catalog)if(body.ids.includes(c.id))c.published=false;version++;return {version};}
   if(action==='library'&&body){if(body.version!==version)throw Error('Conflicto');for(const c of body.coreos){const old=catalog.findIndex(x=>x.id===c.id);const value={...c,published:true,publicationVersion:version+1};if(old>=0)catalog[old]=value;else catalog.push(value);}version++;return {version};}
   throw Error('Acción inesperada '+action);
  };cloudPublishLibrary();
 });
 await p.evaluate(()=>{
  const draft={id:'draft-check',name:'Aceptada',published:false,acceptedDraft:true,originTeacherName:'Profe Ana'};
  const row=cloudManagerRows([draft],[])[0];
  if(row.published||row.archived)throw Error('Una propuesta aceptada debe ser un borrador');
  if(!cloudProvenanceMarkup(draft).includes('Profe Ana')||!cloudProvenanceMarkup(draft).includes('Sin compartir'))throw Error('Falta la procedencia del borrador');
  if(!cloudProvenanceMarkup({...draft,published:true,publishedById:cloudUser.id}).includes('Publicada por ti'))throw Error('Falta la autoría de publicación');
 });
 await p.waitForSelector('[data-manager-select]');assert.equal(await p.$$eval('.manager-card',els=>els.length),3);
 assert.equal(await p.$eval('#modal',e=>e.open),false);
 await p.select('#manager-filter','published');assert.equal(await p.$$eval('.manager-card',els=>els.length),2);
 await p.click('#manager-all');await p.click('#manager-unpublish');
 assert.equal(await p.evaluate(()=>calls.filter(c=>c.action==='library-unpublish').length),0);
 await p.evaluate(()=>document.getElementById('modal').close());
 await p.click('#manager-unpublish');await p.click('#form [type=submit]');
 await p.waitForFunction(()=>!document.getElementById('modal').open&&!cloudLibraryManager.loading);
 assert.equal(await p.evaluate(()=>catalog.filter(c=>c.published!==false).length),0);
 await p.select('#manager-filter','archived');assert.equal(await p.$$eval('.manager-card',els=>els.length),2);
 await p.click('[data-manager-id=external]');await p.click('#form [type=submit]');
 await p.waitForFunction(()=>!document.getElementById('modal').open&&!cloudLibraryManager.loading);
 assert.equal(await p.evaluate(()=>catalog.find(c=>c.id==='external').published),true);
 await p.select('#manager-filter','unpublished');await p.click('#manager-all');await p.click('#manager-publish');await p.click('#form [type=submit]');
 await p.waitForFunction(()=>!document.getElementById('modal').open&&!cloudLibraryManager.loading);
 assert.equal(await p.evaluate(()=>catalog.filter(c=>c.published!==false).length),3);
 for(const width of [1280,390]){await p.setViewport({width,height:900});await p.select('#manager-filter','all');assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);}
 await p.type('#manager-search','Privada');assert.equal(await p.$$eval('.manager-card',els=>els.length),1);
 await p.evaluate(()=>{cloudUser.role='teacher';page='agenda';cloudPublishLibrary();});assert.equal(await p.evaluate(()=>page),'agenda');
 assert.deepEqual(errors,[]);console.log('OK: pantalla, filtros, confirmación, retirada por lote, republicación de propuesta externa, publicación múltiple y adaptación móvil. API simulada.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
