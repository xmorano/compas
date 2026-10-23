const puppeteer=require('/home/xmorano/Work/Eventos/whatsapp-service/node_modules/puppeteer');
const assert=require('node:assert/strict');
(async()=>{
const browser=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});
try{
const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:8123/clases/');await page.waitForSelector('#auth-email');await page.type('#auth-email','admin@example.test');await page.type('#auth-password','Admin-test-123456');await page.click('#auth-form button');await page.waitForFunction(()=>window.COMPAS_LOADED);
await page.evaluate(async()=>{
const fixture={centers:[{id:'c',name:'Centro prueba estados',address:'Calle'}],groups:[{id:'g',center:'c',level:'Iniciación',day:'Lunes',start:'19:00',end:'20:00',total:8}],coreos:[{id:'a',name:'Alfa',level:'Iniciación'},{id:'b',name:'Beta',level:'Iniciación'}],sessions:[{id:'s',group:'g',date:'2026-10-07',start:'19:00',end:'20:00',term:'T1',closed:false,items:[{coreo:'a',done:false,mode:'Nueva',note:'Nota original'},{coreo:'b',done:true,mode:'Bailar',note:''}]}]};const result=await cloudApi('workspace',{version:cloudVersion,data:fixture});cloudVersion=result.version;db=fixture;activeSession='s';render();
});
assert(await page.$('[data-cycle-state="0"].none'));assert(await page.$('[data-cycle-state="1"].done'));
await page.click('[data-cycle-state="0"]');assert(await page.$('[data-cycle-state="0"].planned'));
assert.equal(await page.evaluate(()=>first('a','g')),undefined);
await page.click('[data-share]');assert.equal(await page.$$eval('[data-share-index]',els=>els.length),1);assert((await page.$eval('#share-preview',e=>e.value)).includes('Beta'));await page.click('#cancel');
await page.click('[data-cycle-state="0"]');assert(await page.$('[data-cycle-state="0"].done'));assert.equal(await page.evaluate(()=>first('a','g')),'2026-10-07');
await page.click('[data-cycle-state="0"]');assert(await page.$('[data-cycle-state="0"].none'));
await page.click('[data-bulk-state="planned"]');assert(await page.$('[data-cycle-state="0"].planned'));assert(await page.$('[data-cycle-state="1"].done'));
await page.waitForFunction(()=>!cloudPending&&!cloudBusy);await page.reload();await page.waitForFunction(()=>window.COMPAS_LOADED);
await page.evaluate(()=>{activeSession='s';render()});assert(await page.$('[data-cycle-state="0"].planned'));assert(await page.$('[data-cycle-state="1"].done'));
const copied=await page.evaluate(()=>previousClassItems({items:[]},db.sessions[0],['a','b']));assert(copied.every(i=>i.planned&&!i.done));assert.equal(copied[0].mode,'Nueva');
await page.click('[data-cycle-state="0"]');await page.waitForFunction(()=>!cloudPending&&!cloudBusy);const copiedDone=await page.evaluate(()=>previousClassItems({items:[]},db.sessions[0],['a']));assert.equal(copiedDone[0].mode,'Repaso');
await page.click('[data-bulk-state="none"]');assert.equal(await page.$$eval('.routine-state.none',els=>els.length),2);
await page.click('[data-bulk-state="done"]');assert.equal(await page.$$eval('.routine-state.done',els=>els.length),2);await page.waitForFunction(()=>!cloudPending&&!cloudBusy);
assert.equal(await page.evaluate(()=>db.sessions[0].items[0].note),'Nota original');assert.deepEqual(errors,[]);
console.log('Estados verificados: ciclo, datos anteriores, guardado/recarga, acciones globales, WhatsApp solo verdes, enseñanza e importación.');
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
