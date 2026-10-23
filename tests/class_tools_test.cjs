const assert=require('node:assert/strict'),cp=require('node:child_process');
const puppeteer=require('/home/xmorano/Work/Eventos/whatsapp-service/node_modules/puppeteer');
(async()=>{
 const mp3='/tmp/compas-class-tools.mp3';cp.execFileSync('ffmpeg',['-v','error','-y','-f','lavfi','-i','sine=frequency=440:duration=12',mp3]);
 const browser=await puppeteer.launch({executablePath:'/opt/google/chrome/chrome',headless:true,args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
 try{const p=await browser.newPage(),errors=[];p.setDefaultTimeout(6000);p.on('pageerror',e=>errors.push(e.message));await p.goto('http://127.0.0.1:8134/');
 await p.evaluate(()=>{
  const item=(coreo,mode='Nueva',done=true,planned=true)=>({coreo,mode,done,planned,note:''});
  const session=(id,date,items,group='g')=>({id,date,group,items,start:'19:00',end:'20:00',term:'T1',closed:true});
  db={centers:[{id:'center',name:'Centro de prueba',address:'Calle'}],groups:[{id:'g',center:'center',level:'Inicial',day:'Lunes',start:'19:00',end:'20:00',total:8},{id:'other',center:'center',level:'Otro',day:'Lunes',start:'19:00',end:'20:00',total:8}],coreos:[{id:'a',name:'Antigua',level:'Inicial'},{id:'b',name:'Pendiente',level:'Inicial'},{id:'c',name:'Reciente',level:'Inicial'},{id:'d',name:'Clase actual',level:'Inicial',sheet:'https://example.test/hoja',video:'https://example.test/video'}],sessions:[session('old','2026-09-01',[item('a')]),session('recent','2026-10-15',[item('c')]),session('pending','2026-10-20',[item('b','Nueva',false)]),session('future','2026-10-25',[item('b')]),session('other-class','2026-10-22',[item('a')],'other'),session('current','2026-10-23',[{...item('d'),note:'SECRETO privado'}])]};
  activeSession='current';render();
 });
 assert.deepEqual(await p.evaluate(()=>classRecommendations(db.sessions.at(-1)).map(r=>r.coreo)),['b','c','a']);
 await p.click('.class-suggestions summary');await p.click('[data-class-suggest=b]');
 assert.equal(await p.evaluate(()=>db.sessions.at(-1).items.filter(i=>i.coreo==='b').length),1);
 assert.equal(await p.evaluate(()=>db.sessions.at(-1).items.find(i=>i.coreo==='b').done),false);
 await p.click('.class-suggestions summary');await p.click('[data-class-suggest=a]');
 await p.click('[data-class-tool=attendance]');await p.click('#attendance-roster');await p.type('#student-new','Ana\nLuis');await p.click('#form [type=submit]');
 assert.equal(await p.evaluate(()=>db.students.length),2);
 await p.click('[data-class-tool=attendance]');
 const students=await p.evaluate(()=>db.students.map(s=>({id:s.id,name:s.name})));
 await p.select(`[data-attendance-student="${students[0].id}"]`,'absent');await p.select(`[data-attendance-student="${students[1].id}"]`,'present');await p.click('#form [type=submit]');
 assert.equal(await p.evaluate(()=>db.sessions.at(-1).attendance.length),2);
 await p.click('[data-class-tool=attendance]');await p.click('#attendance-roster');await p.click(`[data-student-history="${students[0].id}"]`);
 assert((await p.$eval('#fields',e=>e.textContent)).includes('No asistió a esta enseñanza'));
 await p.click('#form [type=submit]');
 await p.evaluate(()=>go('coreos'));
 for(const id of ['b','d']){await p.waitForSelector(`[data-local-music="${id}"] [data-music=choose]`);const [chooser]=await Promise.all([p.waitForFileChooser(),p.click(`[data-local-music="${id}"] [data-music=choose]`)]);await chooser.accept([mp3]);await p.waitForSelector(`[data-local-music="${id}"] [data-music=play]`);}
 await p.evaluate(()=>{activeSession='current';render();});await p.click('[data-class-tool=playlist]');
 await p.click('[data-playlist-move="0"][data-direction="1"]');assert.deepEqual(await p.evaluate(()=>db.sessions.at(-1).items.map(i=>i.coreo)),['b','d','a']);
 await p.click('#playlist-start');await p.waitForFunction(()=>document.querySelector('audio')?.currentTime>0);
 await p.waitForFunction(()=>!document.getElementById('modal').open);assert((await p.$eval('#toast',e=>e.textContent)).includes('1 sin MP3'));
 assert((await p.$eval('.local-player strong',e=>e.textContent)).includes('Pendiente'));
 await p.evaluate(()=>document.querySelector('audio').dispatchEvent(new Event('ended')));
 await p.waitForFunction(()=>document.querySelector('.local-player strong').textContent==='Clase actual');
 await p.click('[data-queue-prev]');await p.waitForFunction(()=>document.querySelector('.local-player strong').textContent==='Pendiente');
 await p.click('[data-player-close]');assert.equal(await p.$('.local-player'),null);
 await p.click('[data-class-tool=summary]');
 assert.equal(await p.$$eval('[data-student-summary]',els=>els.length),1);
 assert((await p.$eval('#student-summary-preview',e=>e.textContent)).includes('Aprendimos'));
 const exported=await p.evaluate(()=>{const s=db.sessions.at(-1),items=classSummaryItems(s,s.items.map(i=>i.coreo));return {text:classSummaryText(s,items),html:classSummaryDocument(s,items)};});
 for(const content of Object.values(exported)){assert(!content.includes('SECRETO'));assert(!content.includes('Ana'));assert(!content.includes('Luis'));assert(content.includes('https://example.test/hoja'));assert(!content.includes('Antigua'));}
 await p.click('[data-student-summary]');assert.equal(await p.$eval('#form [type=submit]',e=>e.disabled),true);await p.click('#cancel');
 const rolledBack=await p.evaluate(()=>{const originalSave=save,s=db.sessions.at(-1),before=JSON.stringify(s);save=()=>{throw Error('Fallo simulado');};try{saveClassChange(()=>s.attendance=[]);}catch{}save=originalSave;return JSON.stringify(s)===before;});assert(rolledBack);
 await p.reload();assert.equal(await p.evaluate(()=>db.students.length),2);assert.deepEqual(await p.evaluate(()=>db.sessions.at(-1).items.map(i=>i.coreo)),['b','d','a']);
 assert.deepEqual(errors,[]);console.log('OK: sugerencias por grupo, roster, asistencia e historial, orden persistido, MP3 en cola y avance, resumen sin datos privados y rollback. Chrome local real.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
