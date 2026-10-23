const assert=require('node:assert/strict'),fs=require('node:fs');
const puppeteer=require('/home/xmorano/Work/Eventos/whatsapp-service/node_modules/puppeteer');
(async()=>{const browser=await puppeteer.launch({executablePath:'/opt/google/chrome/chrome',headless:true,args:['--no-sandbox']});try{
 const p=await browser.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('http://127.0.0.1:8134/');
 await p.evaluate(()=>{db={centers:[{id:'c1',name:'Centro uno',address:'Calle'},{id:'c2',name:'Centro dos',address:'Calle'}],groups:[{id:'g1',center:'c1',level:'Inicial',day:'Lunes',start:'19:00',end:'20:00'},{id:'g2',center:'c2',level:'Medio',day:'Martes',start:'19:00',end:'20:00'}],coreos:[{id:'r',name:'Coreo',level:'Inicial'}],sessions:[{id:'s1',group:'g1',date:'2026-10-22',start:'19:00',end:'20:00',term:'T1',closed:true,items:[{coreo:'r',mode:'Nueva',done:true,note:''}]},{id:'s2',group:'g2',date:'2026-10-23',start:'19:00',end:'20:00',term:'T1',closed:false,items:[]}]};activeSession='s1';render();});
 assert.equal(await p.$('[data-class-tool=attendance]'),null);
 await p.click('[data-page=students]');await p.click('#students-enable');await p.click('#student-add');
 await p.type('#f-student-name','Ana García');await p.type('#f-student-phone','600123456');await p.type('#f-student-email','ana@example.test');await p.type('#f-student-level','Intermedio');await p.type('#student-profile-notes','Nota privada del perfil');
 await p.click('[data-student-membership=g1]');await p.click('[data-student-membership=g2]');
 const png='/tmp/compas-student-photo.png';fs.writeFileSync(png,Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aQ0cAAAAASUVORK5CYII=','base64'));
 const [chooser]=await Promise.all([p.waitForFileChooser(),p.click('#student-photo-file')]);await chooser.accept([png]);await p.waitForFunction(()=>document.getElementById('student-photo-status').textContent==='Foto lista para guardar.');
 await p.click('#form [type=submit]');await p.waitForSelector('[data-student-edit]');
 const student=await p.evaluate(()=>db.students[0]);assert.deepEqual(student.groups,['g1','g2']);assert(student.photo.startsWith('data:image/jpeg;base64,'));assert.equal(student.email,'ana@example.test');assert.equal(await p.$$eval('.student-card',els=>els.length),1);
 for(const gid of ['g1','g2']){await p.select('#student-group-filter',gid);assert.equal(await p.$$eval('.student-card',els=>els.length),1);}
 for(const sid of ['s1','s2']){await p.evaluate(id=>{page='agenda';activeSession=id;render();},sid);await p.click('[data-class-tool=attendance]');await p.select(`[data-attendance-student="${student.id}"]`,sid==='s1'?'absent':'present');await p.click('#form [type=submit]');}
 await p.click('[data-page=students]');await p.select('#student-group-filter','');await p.click('[data-student-edit]');await p.click('[data-student-membership=g1]');await p.click('#form [type=submit]');
 assert.deepEqual(await p.evaluate(()=>db.students[0].groups),['g2']);assert.deepEqual(await p.evaluate(()=>db.students[0].pastGroups),['g1']);
 await p.click('[data-student-history]');const history=await p.$eval('#fields',e=>e.textContent);assert(history.includes('Centro uno'));assert(history.includes('Centro dos'));await p.click('#form [type=submit]');
 await p.click('#students-disable');await p.click('#form [type=submit]');assert.equal(await p.evaluate(()=>db.students.length),1);
 await p.evaluate(()=>{page='agenda';activeSession='s1';render();});assert.equal(await p.$('[data-class-tool=attendance]'),null);
 await p.click('[data-page=students]');await p.click('#students-enable');await p.select('#student-group-filter','g1');await p.click('#student-enroll');await p.click(`[data-enroll-student="${student.id}"]`);await p.click('#form [type=submit]');
 assert.deepEqual(new Set(await p.evaluate(()=>db.students[0].groups)),new Set(['g1','g2']));
 await p.reload();await p.click('[data-page=students]');assert.equal(await p.$$eval('.student-card',els=>els.length),1);
 await p.evaluate(()=>{const removed=new Set(['g1']);db.students=db.students.map(s=>studentWithoutGroups(s,removed));});assert.deepEqual(await p.evaluate(()=>db.students[0].groups),['g2']);
 // Existing four-field records retain their identity and attendance without a data migration.
 const legacy=await p.evaluate(()=>{db.students=[{id:'legacy',name:'Antes',group:'g1',active:true}];delete db.studentsEnabled;return {enabled:studentsEnabled(),groups:studentGroups(db.students[0])};});assert(legacy.enabled);assert.deepEqual(legacy.groups,['g1']);
 for(const width of [1280,390]){await p.setViewport({width,height:900});await p.evaluate(()=>render());assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
 assert.deepEqual(errors,[]);console.log('OK: opción alumnos, ficha con foto, una persona en dos centros, asistencia e historial, bajas de grupo, desactivación sin pérdida, legado y móvil. Chrome real.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
