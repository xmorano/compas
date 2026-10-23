// Audio stays in this browser; it never enters the workspace JSON or the server.
window.CompasMusic = (() => {
  let connection, player, currentUrl, currentKey, queue=[], queueIndex=0;
  const scope = () => location.pathname.replace(/[^/]*$/, '') + ':' + (window.COMPAS_CLOUD ? (typeof cloudUser !== 'undefined' && cloudUser?.id || 'unavailable') : 'local');
  const key = id => scope() + ':' + id;
  const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function database() {
    if (!connection) connection = new Promise((resolve, reject) => {
      const request = indexedDB.open('compas-local-music', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('tracks', {keyPath:'key'});
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    }).catch(error => {connection = null; throw error;});
    return connection;
  }
  async function record(id, operation = 'get', value) {
    const databaseHandle = await database();
    return new Promise((resolve, reject) => {
      const transaction = databaseHandle.transaction('tracks', operation === 'get' ? 'readonly' : 'readwrite');
      const request = transaction.objectStore('tracks')[operation](operation === 'put' ? value : key(id));
      transaction.oncomplete = () => resolve(request.result);
      transaction.onabort = transaction.onerror = () => reject(transaction.error || request.error);
    });
  }
  function markup(c, manage = true) {
    return c ? `<div class="local-music" data-local-music="${escape(c.id)}" data-music-manage="${manage}" data-track-title="${escape(c.name)}"><span class="sub" role="status">Cargando música local…</span></div>` : '';
  }
  async function refresh(box) {
    try {
      const track = await record(box.dataset.localMusic);
      if (!box.isConnected) return;
      const manage = box.dataset.musicManage === 'true';
      const controls = manage ? '<button type="button" class="text-button" data-music="choose">Cambiar MP3</button><button type="button" class="text-button" data-music="remove">Quitar MP3</button>' : '';
      box.innerHTML = track ? `<button type="button" class="button secondary" data-music="play">▶ Reproducir</button>${controls}<small>${escape(track.name)} · Solo en este dispositivo</small>` : manage ? '<button type="button" class="button secondary" data-music="choose">Añadir MP3 local</button><span class="sub" role="status">Solo en este dispositivo</span>' : '<span class="sub">Sin MP3 local. Añádelo desde Coreografías en este dispositivo.</span>';
    } catch { box.querySelector('[role="status"]')?.replaceChildren(document.createTextNode('No se puede acceder a la música local. Permite el almacenamiento del navegador y recarga.')); }
  }
  function refreshAll(id) { document.querySelectorAll('[data-local-music]').forEach(box => { if(box.dataset.localMusic === id) refresh(box); }); }
  function stop(clearQueue=true) {
    if(clearQueue){queue=[];queueIndex=0;}
    if(player) {player.querySelector('audio').pause();player.remove();player = null;}
    if(currentUrl) URL.revokeObjectURL(currentUrl);
    currentUrl = currentKey = null;
  }
  async function play(id, title, fromQueue=false) {
    const track = await record(id);
    if(!track) throw new Error('Vuelve a añadir el MP3 en este dispositivo.');
    if(currentKey === key(id) && player) {await player.querySelector('audio').play();return;}
    stop(!fromQueue);
    currentKey = key(id);currentUrl = URL.createObjectURL(track.file);
    player = document.createElement('section');player.className = 'local-player';player.setAttribute('aria-label', 'Reproductor de música local');
    player.innerHTML = `<strong>${escape(title)}</strong><audio controls preload="metadata"></audio><div class="music-speed"><label for="music-speed">Velocidad <output id="music-speed-value" for="music-speed">100 %</output></label><input id="music-speed" type="range" min="50" max="100" step="5" value="100" aria-valuetext="100 %"><button type="button" class="button secondary" data-speed-reset>Normal (100 %)</button></div>${fromQueue?`<div class="music-queue"><button type="button" class="button secondary" data-queue-prev ${queueIndex===0?'disabled':''}>Anterior</button><span>${queueIndex+1} / ${queue.length}</span><button type="button" class="button secondary" data-queue-next ${queueIndex===queue.length-1?'disabled':''}>Siguiente</button></div>`:''}<button data-player-close type="button" class="button secondary" aria-label="Cerrar reproductor">Cerrar ✕</button><small role="status"></small>`;
    document.body.append(player);
    const audio = player.querySelector('audio');audio.src = currentUrl;
    audio.onerror = () => {if(player)player.querySelector('small').textContent = 'No se puede reproducir este archivo. Prueba con otro MP3.';};
    const speed = player.querySelector('#music-speed');
    const speedValue = player.querySelector('#music-speed-value');
    audio.preservesPitch = true;
    function updateSpeed() {
      const percent = Math.round(audio.playbackRate * 100);
      speed.value = String(percent);
      speed.setAttribute('aria-valuetext', percent + ' %');
      speedValue.textContent = percent + ' %';
    }
    speed.oninput = () => {audio.playbackRate = Number(speed.value) / 100;updateSpeed();};
    audio.addEventListener('ratechange', updateSpeed);
    player.querySelector('[data-speed-reset]').onclick = () => {audio.playbackRate = 1;updateSpeed();};
    player.querySelector('[data-player-close]').onclick = ()=>stop();
    if(fromQueue){
      player.querySelector('[data-queue-prev]').onclick=()=>playQueueAt(queueIndex-1).catch(error=>toast(error.message));
      player.querySelector('[data-queue-next]').onclick=()=>playQueueAt(queueIndex+1).catch(error=>toast(error.message));
      audio.onended=()=>{if(queueIndex<queue.length-1)playQueueAt(queueIndex+1).catch(error=>toast(error.message));};
    }
    await audio.play();
  }
  function choose(box) {
    const input = document.createElement('input');input.type = 'file';input.accept = '.mp3,audio/mpeg';
    input.onchange = async () => {
      const file = input.files[0];if(!file)return;
      try {
        if(!/\.mp3$/i.test(file.name) && file.type !== 'audio/mpeg') throw new Error('Selecciona un archivo MP3.');
        if(!file.size) throw new Error('El archivo está vacío.');
        box.querySelector('button').disabled = true;
        // Ask while the import follows a user action; rejection must not block playback.
        navigator.storage?.persist?.().catch(()=>{});
        const id = box.dataset.localMusic;
        await record(id, 'put', {key:key(id), name:file.name, file});
        if(currentKey === key(id))stop();
        refreshAll(id);toast('MP3 guardado en este dispositivo');
      } catch(error) {toast(error.name === 'QuotaExceededError' ? 'No hay espacio suficiente. Libera espacio o quita otros MP3.' : error.message || 'No se pudo guardar el MP3.');}
      finally {const button=box.querySelector('button');if(button)button.disabled=false;}
    };
    input.click();
  }
  document.addEventListener('click', async event => {
    const button = event.target.closest('[data-music]');if(!button)return;
    const box = button.closest('[data-local-music]'), id = box.dataset.localMusic;
    try {
      if(button.dataset.music === 'choose') choose(box);
      if(button.dataset.music === 'play') await play(id, box.dataset.trackTitle);
      if(button.dataset.music === 'remove' && confirm('¿Quitar la copia de este MP3 de Compás en este dispositivo? El archivo original se conserva.')) {
        await record(id,'delete');if(currentKey === key(id))stop();refreshAll(id);
      }
    } catch(error) {toast(error.message || 'No se pudo abrir el MP3.');}
  });
  function hydrate() {
    document.querySelectorAll('[data-local-music]:not([data-ready])').forEach(box => {box.dataset.ready='true';refresh(box);});
  }
  new MutationObserver(hydrate).observe(document.getElementById('content'), {childList:true,subtree:true});
  window.addEventListener('pagehide', ()=>stop());
  async function available(ids){const results=await Promise.all(ids.map(async id=>await record(id)?id:null));return results.filter(Boolean);}
  async function playQueueAt(index){if(index<0||index>=queue.length)return;queueIndex=index;const track=queue[index];await play(track.id,track.title,true);}
  async function playList(tracks){
    const ids=new Set(await available(tracks.map(t=>t.id))),ready=tracks.filter(t=>ids.has(t.id));
    if(!ready.length)throw new Error('No hay MP3 locales para esta lista. Añádelos desde Coreografías en este dispositivo.');
    stop();queue=ready;queueIndex=0;await playQueueAt(0);
    return {played:ready.length,skipped:tracks.length-ready.length};
  }
  return {markup, stop:()=>stop(), available, playList};
})();

// Optional private student directory. Existing single-group records remain readable.
function studentsEnabled(){return typeof db.studentsEnabled==='boolean'?db.studentsEnabled:!!db.students?.length;}
function studentGroups(student){return Array.isArray(student.groups)?student.groups:student.group?[student.group]:[];}
function studentWithoutGroups(student,removed){const {group,...copy}=student;return {...copy,groups:studentGroups(student).filter(id=>!removed.has(id)),pastGroups:(student.pastGroups||[]).filter(id=>!removed.has(id))};}
function studentGroupLabel(id){const g=group(id);return g?`${center(g.center)?.name||''} · ${g.level} · ${g.day||''} ${g.start||''}`:'Grupo no disponible';}
function setStudentGroups(student,groups){const {group,...copy}=student;return {...copy,groups:[...new Set(groups)],pastGroups:[...new Set([...(student.pastGroups||[]),...studentGroups(student).filter(id=>!groups.includes(id))])].filter(id=>!groups.includes(id))};}
let studentDirectory={query:'',group:'',active:'active'};
function openStudentsPage(groupId=''){studentDirectory.group=groupId;page='students';activeSession=null;render();}
function renderStudentsPage(){
  document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('active',b.dataset.page==='students'));
  $('#crumb').textContent='Alumnos';
  if(!studentsEnabled()){
    $('#content').innerHTML='<div class="heading"><div><div class="eyebrow">TU ESTUDIO</div><h1>Alumnos</h1><p class="sub">Un apartado opcional para quienes quieren llevar fichas y asistencia.</p></div></div><section class="panel students-opt-in"><div class="students-opt-icon">♧</div><h2>Actívalo cuando lo necesites</h2><p class="sub">Puedes usar Compás para organizar centros, coreografías y clases sin registrar alumnos. Si activas esta opción, tendrás una ficha por persona, varias inscripciones y asistencia por clase.</p><p class="sub">Nombre, teléfono, correo, foto, nivel y notas. Solo el nombre es obligatorio. Desactivarlo después conserva las fichas y el historial.</p><button type="button" class="button" id="students-enable">Activar gestión de alumnos</button></section>';
    $('#students-enable').onclick=()=>{try{saveClassChange(()=>db.studentsEnabled=true);render();toast('Gestión de alumnos activada');}catch(error){toast(error.message);}};return;
  }
  $('#content').innerHTML=`<div class="heading"><div><div class="eyebrow">TU ESTUDIO</div><h1>Alumnos</h1><p class="sub">Una ficha por persona, aunque asista a varios grupos o centros.</p></div><button type="button" class="button" id="student-add">＋ Nuevo alumno</button></div><div class="toolbar students-toolbar"><input id="student-search" type="search" aria-label="Buscar alumno" placeholder="Buscar por nombre, teléfono o correo…"><label>Grupo<select id="student-group-filter"><option value="">Todos los grupos</option><option value="none">Sin inscripciones</option>${db.groups.map(g=>`<option value="${esc(g.id)}">${esc(studentGroupLabel(g.id))}</option>`).join('')}</select></label><label>Estado<select id="student-active-filter"><option value="active">Activos</option><option value="inactive">Inactivos</option><option value="all">Todos</option></select></label></div><div class="students-tools"><p id="student-directory-count" class="sub" role="status"></p><div class="card-actions"><button type="button" class="button secondary" id="student-enroll">Gestionar inscripciones del grupo</button><button type="button" class="text-button" id="students-disable">Desactivar gestión de alumnos</button></div></div><div id="student-directory-list" class="cards students-cards"></div>`;
  $('#student-search').value=studentDirectory.query;$('#student-group-filter').value=studentDirectory.group;$('#student-active-filter').value=studentDirectory.active;
  function draw(){
    const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es'),q=normalize(studentDirectory.query);
    const rows=(db.students||[]).filter(s=>(studentDirectory.active==='all'||s.active===(studentDirectory.active==='active'))&&(!studentDirectory.group||(studentDirectory.group==='none'?!studentGroups(s).length:studentGroups(s).includes(studentDirectory.group)))&&(!q||normalize([s.name,s.phone,s.email,s.level].join(' ')).includes(q))).sort((a,b)=>a.name.localeCompare(b.name,'es'));
    $('#student-directory-count').textContent=rows.length+' alumnos · '+(db.students||[]).length+' fichas en tu cuenta';
    $('#student-enroll').hidden=!db.groups.some(g=>g.id===studentDirectory.group);
    $('#student-directory-list').innerHTML=rows.map(s=>`<article class="card student-card"><div class="student-card-head"><div class="student-avatar"><span>${esc([...s.name.trim()][0]?.toLocaleUpperCase('es')||'A')}</span>${s.photo?`<img src="${esc(studentPhotoUrl(s.photo))}" alt="" loading="lazy" referrerpolicy="no-referrer">`:''}</div><div><h3>${esc(s.name)}</h3><span class="tag">${esc(s.level||'Nivel sin indicar')}</span>${s.active?'':'<small>Inactivo</small>'}</div></div>${s.phone?`<p class="student-contact">Teléfono: ${esc(s.phone)}</p>`:''}${s.email?`<p class="student-contact">Correo: ${esc(s.email)}</p>`:''}<div class="student-memberships">${studentGroups(s).map(id=>`<small>${esc(studentGroupLabel(id))}</small>`).join('')||'<small>Sin inscripciones</small>'}</div>${s.notes?`<p class="student-notes">${esc(s.notes)}</p>`:''}<div class="card-actions"><button type="button" class="button secondary" data-student-edit="${esc(s.id)}">Editar ficha</button><button type="button" class="text-button" data-student-history="${esc(s.id)}">Asistencia e historial</button></div></article>`).join('')||'<div class="empty">No hay alumnos con estos filtros. Añade una ficha o cambia los filtros.</div>';
    document.querySelectorAll('.student-avatar img').forEach(img=>img.onerror=()=>img.remove());
  }
  $('#student-search').oninput=event=>{studentDirectory.query=event.target.value;draw();};
  $('#student-group-filter').onchange=event=>{studentDirectory.group=event.target.value;draw();};
  $('#student-active-filter').onchange=event=>{studentDirectory.active=event.target.value;draw();};
  $('#student-add').onclick=()=>editStudentProfile();
  $('#student-enroll').onclick=()=>manageStudentEnrollments(studentDirectory.group);
  $('#students-disable').onclick=()=>classDialog('Desactivar alumnos','<p class="sub">Se ocultarán los controles de alumnos y asistencia en las clases. Tus fichas, fotos, inscripciones y asistencia se conservarán. Puedes reactivarlo desde este apartado.</p>',async()=>{saveClassChange(()=>db.studentsEnabled=false);$('#modal').close();render();},'Desactivar y conservar datos');
  draw();
}
function studentPhotoUrl(value){return /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(value||'')?value:safeUrl(value);}
function editStudentProfile(id){
  if(!studentsEnabled())return;
  const existing=(db.students||[]).find(s=>s.id===id),s=existing||{name:'',active:true,groups:db.groups.some(g=>g.id===studentDirectory.group)?[studentDirectory.group]:[]};
  let photo=studentPhotoUrl(s.photo||'');
  classDialog(existing?'Ficha del alumno':'Nuevo alumno',`<p class="sub">Solo el nombre es obligatorio. Inscribe a esta misma persona en todos sus grupos, sin duplicar la ficha.</p>${field('student-name','Nombre',s.name,'text',true)}<div class="form-grid"><div>${field('student-phone','Teléfono',s.phone||'','tel')}</div><div>${field('student-email','Correo',s.email||'','email')}</div></div>${field('student-level','Nivel',s.level||'')}<label for="student-photo-link">Enlace a foto (opcional)</label><input id="student-photo-link" type="url" value="${esc(/^https?:/i.test(photo)?photo:'')}" placeholder="https://…"><div class="student-photo-editor"><img id="student-photo-preview" alt="Vista previa de la foto" ${photo?'src="'+esc(photo)+'"':'hidden'}><div><label for="student-photo-file">O subir foto</label><input id="student-photo-file" type="file" accept="image/jpeg,image/png,image/webp"><button type="button" class="text-button" id="student-photo-clear">Quitar foto</button><p class="sub" id="student-photo-status" role="status">La foto se reduce y se guarda en tu cuenta.</p></div></div><label for="student-profile-notes">Notas privadas</label><textarea id="student-profile-notes" name="notes" rows="4" maxlength="10000">${esc(s.notes||'')}</textarea><label class="share-option"><input type="checkbox" id="student-profile-active" ${s.active?'checked':''}>Alumno activo</label><h3 class="student-enrollment-title">Inscripciones</h3><p class="sub">Puede pertenecer a varios grupos y centros a la vez. También puedes guardar la ficha sin inscripciones.</p><div class="share-list">${db.groups.map(g=>`<label class="share-option"><input type="checkbox" data-student-membership="${esc(g.id)}" ${studentGroups(s).includes(g.id)?'checked':''}><span>${esc(studentGroupLabel(g.id))}</span></label>`).join('')||'<p class="empty">Crea centros y grupos para poder inscribir alumnos.</p>'}</div>`,async values=>{
    const name=values['student-name'].trim();if(!name||name.length>120)throw Error('Indica un nombre de hasta 120 caracteres.');
    const groups=[...document.querySelectorAll('[data-student-membership]:checked')].map(el=>el.dataset.studentMembership);
    for(const gid of groups)if((db.students||[]).filter(other=>other.id!==id&&studentGroups(other).includes(gid)).length>=1000)throw Error('Ese grupo ya tiene 1000 alumnos.');
    const finalPhoto=$('#student-photo-link').value.trim()||photo;
    if(finalPhoto&&!studentPhotoUrl(finalPhoto))throw Error('Indica un enlace HTTP/HTTPS o sube una foto válida.');
    const value={...setStudentGroups(s,groups),id:existing?.id||uid(),name,phone:values['student-phone'].trim(),email:values['student-email'].trim(),photo:finalPhoto,level:values['student-level'].trim(),notes:values.notes,active:$('#student-profile-active').checked};
    if(value.phone.length>80||value.level.length>120)throw Error('Teléfono demasiado largo (máximo 80) o nivel demasiado largo (máximo 120).');
    if(!existing&&(db.students||[]).length>=5000)throw Error('La cuenta admite hasta 5000 alumnos.');
    saveClassChange(()=>{db.students=[...(db.students||[]).filter(other=>other.id!==id),value];db.studentsEnabled=true;});$('#modal').close();render();toast('Ficha guardada');
  });
  let photoBusy=false;
  const preview=()=>{const value=$('#student-photo-link').value.trim()||photo;$('#student-photo-preview').hidden=!value;if(value)$('#student-photo-preview').src=value;};
  $('#student-photo-link').oninput=preview;
  $('#student-photo-clear').onclick=()=>{photo='';$('#student-photo-link').value='';$('#student-photo-file').value='';preview();};
  $('#student-photo-file').onchange=async event=>{
    const file=event.target.files[0];if(!file||photoBusy)return;
    const submit=$('#form button[type="submit"]'),target=$('#student-photo-status');photoBusy=true;submit.disabled=true;target.textContent='Preparando foto…';
    let url;
    try{
      if(!/^image\/(jpeg|png|webp)$/.test(file.type)||file.size>8*1024*1024)throw Error('Elige una imagen JPG, PNG o WebP de hasta 8 MB.');
      url=URL.createObjectURL(file);const image=await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error('No se pudo abrir la foto.'));img.src=url;});
      const canvas=document.createElement('canvas'),scale=Math.min(1,256/Math.max(image.width,image.height));canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));const context=canvas.getContext('2d');context.fillStyle='white';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(image,0,0,canvas.width,canvas.height);const result=canvas.toDataURL('image/jpeg',.78);if(result.length>150000)throw Error('La imagen es demasiado grande. Prueba con otra foto.');
      photo=result;if(target.isConnected){$('#student-photo-link').value='';preview();target.textContent='Foto lista para guardar.';}
    }catch(error){if(target.isConnected)target.textContent=error.message;}
    finally{if(url)URL.revokeObjectURL(url);photoBusy=false;submit.disabled=false;}
  };
}
function manageStudentEnrollments(groupId){
  const g=group(groupId);if(!g||!studentsEnabled())return;
  const students=(db.students||[]).filter(s=>s.active||studentGroups(s).includes(groupId)).sort((a,b)=>a.name.localeCompare(b.name,'es'));
  classDialog('Inscripciones del grupo',`<p class="sub">${esc(studentGroupLabel(groupId))}. Marca las personas que asisten a este grupo; sus otras inscripciones se conservan.</p><div class="share-list">${students.map(s=>`<label class="share-option"><input type="checkbox" data-enroll-student="${esc(s.id)}" ${studentGroups(s).includes(groupId)?'checked':''}><span>${esc(s.name)}<small>${esc(s.email||s.phone||s.level||'')}${s.active?'':' · Inactivo'}</small></span></label>`).join('')||'<p class="empty">Crea primero una ficha desde Alumnos.</p>'}</div>`,async()=>{
    const selected=new Set([...document.querySelectorAll('[data-enroll-student]:checked')].map(el=>el.dataset.enrollStudent));if(selected.size>1000)throw Error('El grupo admite hasta 1000 alumnos.');
    const shown=new Set(students.map(s=>s.id));saveClassChange(()=>{db.students=(db.students||[]).map(s=>{if(!shown.has(s.id))return s;const groups=studentGroups(s).filter(id=>id!==groupId);if(selected.has(s.id))groups.push(groupId);return setStudentGroups(s,groups);});});$('#modal').close();render();toast('Inscripciones guardadas');
  });
}
document.addEventListener('click',event=>{const b=event.target.closest('[data-student-edit]');if(b)editStudentProfile(b.dataset.studentEdit);});

// Class planning and student data stay in the teacher's existing workspace.
function classDialog(title,html,handler,label='Guardar'){
  modal(title,html+'<p id="class-tool-error" class="csv-errors" role="alert" hidden></p>',()=>{});
  const submit=$('#form button[type="submit"]');submit.hidden=false;submit.textContent=label;
  $('#form').onsubmit=async event=>{event.preventDefault();if(submit.disabled)return;submit.disabled=true;
    try{await handler(Object.fromEntries(new FormData(event.target)));}
    catch(error){const box=$('#class-tool-error');if(box){box.hidden=false;box.textContent=error.message||'No se pudo guardar.';}}
    finally{submit.disabled=false;}
  };
}
function saveClassChange(change){
  const original=structuredClone(db);
  function restore(target,source){for(const key of Object.keys(target))if(!(key in source))delete target[key];if(Array.isArray(target))target.length=source.length;for(const key of Object.keys(source)){const v=source[key];if(v&&typeof v==='object'&&target[key]&&typeof target[key]==='object'&&Array.isArray(v)===Array.isArray(target[key]))restore(target[key],v);else target[key]=structuredClone(v);}}
  try{change();save();}catch(error){restore(db,original);throw error;}
}
function classRecommendations(session){
  const at=s=>s.date+'T'+s.start,cutoff=at(session),existing=new Set(session.items.map(i=>i.coreo));
  const prior=db.sessions.filter(s=>s.group===session.group&&s.id!==session.id&&at(s)<cutoff).sort((a,b)=>at(b).localeCompare(at(a)));
  const output=[];
  for(const c of db.coreos){
    if(existing.has(c.id))continue;
    const records=prior.flatMap(s=>s.items.filter(i=>i.coreo===c.id).map(item=>({session:s,item})));
    const latest=records[0],lastDone=records.find(r=>r.item.done),taught=records.find(r=>r.item.done&&r.item.mode==='Nueva');
    if(!latest)continue;
    let reason,priority,mode='Repaso';
    if(latest.item.planned&&!latest.item.done){reason='Planeada sin realizar el '+dateLabel(latest.session.date);priority=0;mode=taught?'Repaso':latest.item.mode;}
    else if(taught&&prior.slice(0,2).some(s=>s.id===taught.session.id)){reason='Enseñada recientemente: '+dateLabel(taught.session.date);priority=1;}
    else if(taught&&lastDone){const days=Math.floor((new Date(session.date+'T12:00:00')-new Date(lastDone.session.date+'T12:00:00'))/86400000);if(days<21)continue;reason=days+' días sin bailarla con este grupo';priority=2;}
    else continue;
    output.push({coreo:c.id,reason,priority,mode});
  }
  return output.sort((a,b)=>a.priority-b.priority||(coreo(a.coreo)?.name||'').localeCompare(coreo(b.coreo)?.name||'','es')).slice(0,8);
}
function classPreparationPanel(s){
  const suggestions=classRecommendations(s),attendance=s.attendance||[],present=attendance.filter(a=>a.status==='present').length;
  return `<div class="class-tools-bar"><button type="button" class="button secondary" data-class-tool="playlist">♫ Lista de reproducción</button>${studentsEnabled()?`<button type="button" class="button secondary" data-class-tool="attendance">Asistencia${attendance.length?' · '+present+' presentes':''}</button>`:''}<button type="button" class="button secondary" data-class-tool="summary">Resumen para alumnos</button></div><details class="panel class-suggestions"><summary>Sugerencias para preparar esta clase <span class="tag">${suggestions.length}</span></summary><p class="sub">Según el historial de este grupo: pendientes, recién enseñadas o al menos 21 días sin bailar. Se añaden como planeadas; tú decides qué realizar.</p>${suggestions.map(r=>`<div class="class-suggestion"><div><strong>${esc(coreo(r.coreo)?.name)}</strong><small>${esc(r.reason)}</small></div><button type="button" class="button secondary" data-class-suggest="${esc(r.coreo)}">Añadir · ${esc(r.mode)}</button></div>`).join('')||'<p class="sub">No hay sugerencias nuevas con el historial actual.</p>'}</details>`;
}
function classRoster(groupId){return (db.students||[]).filter(s=>studentGroups(s).includes(groupId));}
function manageClassStudents(groupId){openStudentsPage(groupId);}
function classStudentHistory(id){
  const student=(db.students||[]).find(s=>s.id===id);if(!student)return;
  const sessions=db.sessions.filter(s=>(s.attendance||[]).some(a=>a.student===id)).sort((a,b)=>b.date.localeCompare(a.date));
  classDialog('Historial de '+student.name,`<p class="sub">Asistencia y coreografías nuevas realizadas en cada clase registrada.</p>${sessions.map(s=>{const record=s.attendance.find(a=>a.student===id),names=s.items.filter(i=>i.done&&i.mode==='Nueva').map(i=>coreo(i.coreo)?.name).filter(Boolean);return `<article class="student-history"><strong>${esc(dateLabel(s.date))} ${esc(s.date.slice(0,4))}</strong><span class="tag">${esc({present:'Presente',absent:'Ausente',excused:'Ausencia justificada'}[record.status])}</span><p class="sub">${esc(studentGroupLabel(s.group))}</p><p class="sub">Nuevas enseñadas: ${esc(names.join(', ')||'Ninguna registrada')}${record.status!=='present'&&names.length?' · No asistió a esta enseñanza.':''}</p></article>`;}).join('')||'<p class="empty">Sin asistencia registrada.</p>'}`,async()=>{$('#modal').close();},'Cerrar');
}
function classAttendance(session){
  if(!studentsEnabled()){openStudentsPage();return;}
  const recorded=new Map((session.attendance||[]).map(a=>[a.student,a.status]));
  const students=(db.students||[]).filter(s=>(s.active&&studentGroups(s).includes(session.group))||recorded.has(s.id));
  classDialog('Asistencia de la clase',`<p class="sub">${esc(dateLabel(session.date))} · ${esc(group(session.group)?.level)}. Sin marcar no cuenta como ausencia.</p><button type="button" class="text-button" id="attendance-roster">Gestionar alumnos</button><div class="card-actions"><button type="button" class="button secondary" data-attendance-all="present">Todos presentes</button><button type="button" class="text-button" data-attendance-all="">Limpiar marcas</button></div><div class="attendance-list">${students.map(s=>`<label class="attendance-row"><span>${esc(s.name)}${s.active?'':' · Inactivo'}</span><select data-attendance-student="${esc(s.id)}" aria-label="Asistencia de ${esc(s.name)}">${[['','Sin marcar'],['present','Presente'],['absent','Ausente'],['excused','Justificada']].map(([v,t])=>`<option value="${v}" ${recorded.get(s.id)===v?'selected':''}>${t}</option>`).join('')}</select></label>`).join('')||'<p class="empty">Añade alumnos a este grupo para registrar asistencia.</p>'}</div><p class="sub">La asistencia y los nombres nunca se incluyen en el resumen para alumnos.</p>`,async()=>{
    const attendance=[...document.querySelectorAll('[data-attendance-student]')].filter(el=>el.value).map(el=>({student:el.dataset.attendanceStudent,status:el.value}));
    saveClassChange(()=>{session.attendance=attendance;});$('#modal').close();render();toast('Asistencia guardada');
  });
  $('#attendance-roster').onclick=()=>{$('#modal').close();manageClassStudents(session.group);};
  document.querySelectorAll('[data-attendance-all]').forEach(b=>b.onclick=()=>document.querySelectorAll('[data-attendance-student]').forEach(el=>el.value=b.dataset.attendanceAll));
}
function classPlaylist(session){
  classDialog('Lista de reproducción',`<p class="sub">El orden se guarda en esta clase. La reproducción continua usa los MP3 que tengas en este dispositivo; los enlaces externos se abren aparte.</p><div class="card-actions"><button type="button" class="button" id="playlist-start">▶ Reproducir MP3 disponibles</button><button type="button" class="button secondary" id="playlist-stop">Detener música</button></div><p id="playlist-status" class="sub" role="status"></p><div id="playlist-rows"></div>`,async()=>{$('#modal').close();},'Cerrar');
  function draw(){const target=$('#playlist-rows');if(!target)return;target.innerHTML=session.items.map((item,index)=>{const c=coreo(item.coreo);return `<div class="playlist-row"><span class="playlist-number">${index+1}</span><div><strong>${esc(c?.name||'Coreografía no disponible')}</strong><small data-playlist-track="${esc(item.coreo)}">Comprobando MP3 local…</small>${safeUrl(c?.music)?`<a href="${esc(safeUrl(c.music))}" target="_blank" rel="noopener noreferrer">Abrir música ↗</a>`:''}</div><div class="playlist-order"><button type="button" class="icon" data-playlist-move="${index}" data-direction="-1" aria-label="Subir ${esc(c?.name)}" ${index===0?'disabled':''}>↑</button><button type="button" class="icon" data-playlist-move="${index}" data-direction="1" aria-label="Bajar ${esc(c?.name)}" ${index===session.items.length-1?'disabled':''}>↓</button></div></div>`;}).join('')||'<p class="empty">Añade coreografías a la clase para crear la lista.</p>';
    CompasMusic.available(session.items.map(i=>i.coreo)).then(ids=>{if(!target.isConnected)return;target.querySelectorAll('[data-playlist-track]').forEach(el=>el.textContent=ids.includes(el.dataset.playlistTrack)?'MP3 disponible en este dispositivo':'Sin MP3 local');}).catch(()=>{if(target.isConnected)target.querySelectorAll('[data-playlist-track]').forEach(el=>el.textContent='No se pudo consultar la música local');});
  }
  $('#playlist-rows').onclick=event=>{const b=event.target.closest('[data-playlist-move]');if(!b)return;const index=Number(b.dataset.playlistMove),next=index+Number(b.dataset.direction);if(next<0||next>=session.items.length)return;try{saveClassChange(()=>{[session.items[index],session.items[next]]=[session.items[next],session.items[index]];});draw();}catch(error){toast(error.message);}};
  $('#playlist-start').onclick=async event=>{const b=event.currentTarget;b.disabled=true;try{const result=await CompasMusic.playList(session.items.map(i=>({id:i.coreo,title:coreo(i.coreo)?.name||''})));const message=result.played+' MP3 en la lista'+(result.skipped?' · '+result.skipped+' sin MP3 local; no se reproducirán.':'.');$('#modal').close();toast(message);}catch(error){if($('#playlist-status'))$('#playlist-status').textContent=error.message;}finally{b.disabled=false;}};
  $('#playlist-stop').onclick=()=>CompasMusic.stop();draw();
}
function classSummaryItems(session,ids){const chosen=new Set(ids);return session.items.filter(i=>i.done&&chosen.has(i.coreo)&&coreo(i.coreo));}
function classSummaryText(session,items){const g=group(session.group),c=center(g.center);return `💃 ${c.name} · ${g.level}\n📅 ${dateLabel(session.date)} ${session.date.slice(0,4)}\n\n`+['Nueva','Repaso','Bailar'].map(mode=>{const rows=items.filter(i=>i.mode===mode);return rows.length?`${{Nueva:'✨ Aprendimos',Repaso:'🔁 Repasamos',Bailar:'🎶 Bailamos'}[mode]}\n`+rows.map(i=>{const c=coreo(i.coreo);return '• '+c.name+[['video','Vídeo'],['music','Música'],['sheet','Hoja de pasos']].filter(([k])=>safeUrl(c[k])).map(([k,label])=>'\n  '+label+': '+safeUrl(c[k])).join('');}).join('\n\n'):'';}).filter(Boolean).join('\n\n')+'\n\n¡Nos vemos en la próxima clase!\nCompás · VaDeCountry';}
function classSummaryCards(session,items){return ['Nueva','Repaso','Bailar'].map(mode=>{const rows=items.filter(i=>i.mode===mode);return rows.length?`<section class="student-summary-section"><h2>${{Nueva:'✨ Aprendimos',Repaso:'🔁 Repasamos',Bailar:'🎶 Bailamos'}[mode]}</h2>${rows.map(i=>{const c=coreo(i.coreo);return `<article><h3>${esc(c.name)}</h3><p>${esc(c.author||'')}</p><div>${[['video','Vídeo'],['music','Música'],['sheet','Hoja de pasos']].filter(([k])=>safeUrl(c[k])).map(([k,label])=>`<a href="${esc(safeUrl(c[k]))}" target="_blank" rel="noopener noreferrer">${label} ↗</a>`).join(' ')}</div></article>`;}).join('')}</section>`:'';}).join('');}
function classSummaryDocument(session,items){const g=group(session.group),c=center(g.center);return '<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Resumen de clase · '+esc(session.date)+'</title><style>body{margin:0;background:#f6f7f9;color:#232939;font:15px Arial,sans-serif;line-height:1.7}main{max-width:700px;margin:30px auto;padding:24px}header{background:#eee8fa;padding:25px;border-radius:14px}h1{font-size:25px;margin:0}h2{font-size:18px;color:#7860cc;margin-top:28px}h3{font-size:16px;margin:0}article{background:white;border:1px solid #e9ebef;padding:18px;margin:12px 0;border-radius:10px;break-inside:avoid}article p{margin:4px 0;color:#687080}a{display:inline-block;color:#6850b0;padding:7px 14px 7px 0;overflow-wrap:anywhere}footer{margin-top:25px;color:#687080}@media print{body{background:white}main{margin:0;max-width:none}a{color:#232939}a:after{content:" (" attr(href) ")";font-size:10px}}</style></head><body><main><header><p>COMPÁS · TU CLASE DE BAILE</p><h1>'+esc(c.name)+'</h1><p>'+esc(g.level)+' · '+esc(dateLabel(session.date))+' '+esc(session.date.slice(0,4))+'</p></header>'+classSummaryCards(session,items)+'<footer>¡Nos vemos en la próxima clase!<br>Powered by VaDeCountry</footer></main></body></html>';}
function classStudentSummary(session){
  const items=session.items.filter(i=>i.done&&coreo(i.coreo));if(!items.length){toast('Marca alguna coreografía como realizada primero');return;}
  classDialog('Resumen para alumnos',`<p class="sub">Solo lo realizado. Incluye enlaces y agrupa lo aprendido, repasado y bailado. No incluye asistencia, nombres de alumnos ni notas privadas.</p><div class="share-list">${items.map(i=>`<label class="share-option"><input type="checkbox" data-student-summary="${esc(i.coreo)}" checked><span>${esc(coreo(i.coreo).name)}<small>${esc(i.mode)}</small></span></label>`).join('')}</div><div class="card-actions"><button type="button" class="button secondary" id="summary-whatsapp">WhatsApp ↗</button><button type="button" class="button secondary" id="summary-copy">Copiar texto</button><button type="button" class="button secondary" id="summary-open">Abrir para imprimir / PDF</button></div><div id="student-summary-preview" class="student-summary-preview"></div>`,async()=>{const selected=chosen();if(!selected.length)throw Error('Selecciona alguna coreografía.');const url=URL.createObjectURL(new Blob([classSummaryDocument(session,selected)],{type:'text/html;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='compas-clase-'+session.date+'.html';a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);},'Descargar resumen HTML');
  const chosen=()=>classSummaryItems(session,[...document.querySelectorAll('[data-student-summary]:checked')].map(el=>el.dataset.studentSummary));
  function update(){const selected=chosen();$('#student-summary-preview').innerHTML=classSummaryCards(session,selected);$('#form button[type="submit"]').disabled=!selected.length;['summary-whatsapp','summary-copy','summary-open'].forEach(id=>$('#'+id).disabled=!selected.length);}
  document.querySelectorAll('[data-student-summary]').forEach(el=>el.onchange=update);
  $('#summary-whatsapp').onclick=()=>window.open('https://wa.me/?text='+encodeURIComponent(classSummaryText(session,chosen())),'_blank','noopener,noreferrer');
  $('#summary-copy').onclick=async()=>{try{await navigator.clipboard.writeText(classSummaryText(session,chosen()));toast('Resumen copiado');}catch{toast('No se pudo copiar. Usa WhatsApp o descarga el resumen.');}};
  $('#summary-open').onclick=()=>{const url=URL.createObjectURL(new Blob([classSummaryDocument(session,chosen())],{type:'text/html;charset=utf-8'}));window.open(url,'_blank','noopener,noreferrer');setTimeout(()=>URL.revokeObjectURL(url),60000);};update();
}
document.addEventListener('click',event=>{
  const b=event.target.closest('button');if(!b)return;
  if(b.dataset.classRoster){manageClassStudents(b.dataset.classRoster);return;}
  if(b.dataset.studentHistory){$('#modal').close();classStudentHistory(b.dataset.studentHistory);return;}
  const session=db.sessions.find(s=>s.id===activeSession);if(!session)return;
  if(b.dataset.classSuggest){const suggestion=classRecommendations(session).find(r=>r.coreo===b.dataset.classSuggest);if(!suggestion)return;try{saveClassChange(()=>session.items.push({coreo:suggestion.coreo,mode:suggestion.mode,done:false,planned:true,note:''}));render();toast('Coreografía añadida como planeada');}catch(error){toast(error.message);}return;}
  if(b.dataset.classTool)({playlist:classPlaylist,attendance:classAttendance,summary:classStudentSummary}[b.dataset.classTool])?.(session);
});

function centerPhotoUrl(value){return /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(value||'')?value:safeUrl(value);}
function editCenterPhotoForm(id){
  const existing=center(id),c=existing||{};let uploaded=/^data:image\//.test(c.photo||'')?c.photo:'',busy=false;
  classDialog(existing?'Editar centro':'Nuevo centro',field('name','Nombre',c.name,'text',true)+field('address','Dirección',c.address,'text',true)+field('email','Correo',c.email,'email')+field('phone','Teléfono',c.phone,'tel')+field('photo','URL de la foto',/^https?:/i.test(c.photo||'')?c.photo:'','url')+'<div class="center-photo-editor"><div id="center-photo-preview" class="center-photo-preview" aria-label="Vista previa de la foto"></div><label for="center-photo-file">O subir una foto</label><input id="center-photo-file" type="file" accept="image/jpeg,image/png,image/webp"><div class="card-actions"><button type="button" class="button secondary" id="center-photo-remove">Quitar foto</button></div><p class="sub" id="center-photo-status" role="status">Puedes sustituir la imagen por otra URL o subir un archivo JPG, PNG o WebP.</p></div>',async values=>{
    if(busy)throw Error('Espera a que termine de prepararse la foto.');
    const photo=values.photo.trim()||uploaded;
    if(photo&&!centerPhotoUrl(photo))throw Error('Indica una URL HTTP/HTTPS o sube una imagen válida.');
    const data={name:values.name,address:values.address,email:values.email,phone:values.phone,photo};
    saveClassChange(()=>{if(existing)Object.assign(existing,data);else db.centers.push({id:uid(),...data});});
    $('#modal').close();render();toast('Centro guardado');
  });
  const preview=()=>{const value=$('#f-photo').value.trim()||uploaded,box=$('#center-photo-preview');box.innerHTML=value&&centerPhotoUrl(value)?`<img src="${esc(centerPhotoUrl(value))}" alt="Vista previa del centro" referrerpolicy="no-referrer">`:'<span>⌂ Sin foto</span>';const img=box.querySelector('img');if(img)img.onerror=()=>box.replaceChildren(document.createTextNode('No se pudo cargar la imagen. Comprueba la URL.'));};
  $('#f-photo').oninput=()=>{uploaded='';$('#center-photo-file').value='';preview();};
  $('#center-photo-remove').onclick=()=>{uploaded='';$('#f-photo').value='';$('#center-photo-file').value='';$('#center-photo-status').textContent='La foto se quitará al guardar.';preview();};
  $('#center-photo-file').onchange=async event=>{
    const file=event.target.files[0];if(!file||busy)return;
    const submit=$('#form button[type="submit"]'),status=$('#center-photo-status');busy=true;submit.disabled=true;$('#center-photo-remove').disabled=true;$('#f-photo').disabled=true;status.textContent='Preparando foto…';let url;
    try{
      if(!/^image\/(jpeg|png|webp)$/.test(file.type)||file.size>8*1024*1024)throw Error('Elige un JPG, PNG o WebP de hasta 8 MB.');
      url=URL.createObjectURL(file);const image=await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error('No se pudo abrir la imagen.'));img.src=url;});
      const canvas=document.createElement('canvas');let result;
      for(const size of [768,512,384]){const scale=Math.min(1,size/Math.max(image.width,image.height));canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);result=canvas.toDataURL('image/jpeg',.76);if(result.length<=300000)break;}
      if(result.length>300000)throw Error('No se pudo reducir suficiente la foto. Prueba con otra imagen.');
      uploaded=result;if(status.isConnected){$('#f-photo').value='';preview();status.textContent='Foto lista. Guarda el centro para conservarla.';}
    }catch(error){if(status.isConnected)status.textContent=error.message;}
    finally{if(url)URL.revokeObjectURL(url);busy=false;submit.disabled=false;if(status.isConnected){$('#center-photo-remove').disabled=false;$('#f-photo').disabled=false;}}
  };preview();
}

const COMPAS_BUNDLED_EXTRAS_PREFIX='<!--compas-rich-v1-->';
function cleanExtrasHtml(html) {
  const template=document.createElement('template');template.innerHTML=html;
  const allowed=new Set(['P','DIV','BR','STRONG','B','EM','I','U','UL','OL','LI','A']);
  const blocked=new Set(['SCRIPT','STYLE','IFRAME','OBJECT','EMBED','SVG','MATH','TEMPLATE','IMG','VIDEO','AUDIO','LINK','META','FORM','INPUT','BUTTON']);
  function clean(node) {
    if(node.nodeType===Node.TEXT_NODE)return document.createTextNode(node.textContent);
    if(node.nodeType!==Node.ELEMENT_NODE||blocked.has(node.tagName))return document.createDocumentFragment();
    const out=allowed.has(node.tagName)?document.createElement(node.tagName.toLowerCase()):document.createDocumentFragment();
    if(node.tagName==='A'){
      const href=safeUrl(node.getAttribute('href'));
      if(href){out.setAttribute('href',href);out.setAttribute('target','_blank');out.setAttribute('rel','noopener noreferrer');}
    }
    for(const child of node.childNodes)out.append(clean(child));
    return out;
  }
  const result=document.createElement('div');for(const child of template.content.childNodes)result.append(clean(child));
  return result.innerHTML;
}
function extrasHtml(value='') {
  value=String(value||'');
  return value.startsWith(COMPAS_BUNDLED_EXTRAS_PREFIX)?cleanExtrasHtml(value.slice(COMPAS_BUNDLED_EXTRAS_PREFIX.length)):esc(value).replace(/\r?\n/g,'<br>');
}
function extrasEditorMarkup(value='') {
  return `<label id="extras-label" for="extras-editor">Extras (restarts, tags…)</label><div class="extras-edit-box"><div class="extras-toolbar" role="toolbar" aria-label="Formato de extras">${[['bold','Negrita','<b>B</b>'],['italic','Cursiva','<i>I</i>'],['underline','Subrayado','<u>U</u>'],['insertUnorderedList','Lista con viñetas','• Lista'],['insertOrderedList','Lista numerada','1. Lista'],['createLink','Añadir o editar enlace','Enlace'],['unlink','Quitar enlace','Sin enlace'],['removeFormat','Quitar formato','Limpiar']].map(([cmd,label,text])=>`<button type="button" data-extras-command="${cmd}" title="${label}" aria-label="${label}">${text}</button>`).join('')}</div><div id="extras-editor" class="extras-rich extras-editor" contenteditable="true" role="textbox" aria-multiline="true" aria-labelledby="extras-label" aria-describedby="extras-help" spellcheck="true">${extrasHtml(value)}</div></div><input type="hidden" id="f-extras" name="extras" value="${esc(value)}"><p id="extras-help" class="sub csv-help">Selecciona texto para darle formato o añadir un enlace.</p><p id="extras-error" class="csv-errors" role="alert" hidden></p>`;
}
function mountExtrasEditor() {
  const editor=$('#extras-editor'),hidden=$('#f-extras'),error=$('#extras-error'),form=$('#form'),submit=form.querySelector('[type="submit"]');
  let selection;
  const remember=()=>{const s=window.getSelection();if(s.rangeCount&&editor.contains(s.getRangeAt(0).commonAncestorContainer))selection=s.getRangeAt(0).cloneRange();};
  function restore(){editor.focus();const s=window.getSelection();s.removeAllRanges();if(selection&&editor.contains(selection.commonAncestorContainer))s.addRange(selection);else{const r=document.createRange();r.selectNodeContents(editor);r.collapse(false);s.addRange(r);}}
  function sync(){
    const html=cleanExtrasHtml(editor.innerHTML),text=document.createElement('div');text.innerHTML=html;
    hidden.value=text.textContent.trim()?COMPAS_BUNDLED_EXTRAS_PREFIX+html:'';
    const tooLong=new TextEncoder().encode(hidden.value).length>9500;
    error.hidden=!tooLong;error.textContent=tooLong?'Los extras son demasiado largos. Reduce el texto o el formato antes de guardar.':'';
    submit.disabled=tooLong;return !tooLong;
  }
  editor.addEventListener('input',()=>{remember();sync();});
  editor.addEventListener('keyup',remember);editor.addEventListener('mouseup',remember);editor.addEventListener('touchend',remember);editor.addEventListener('blur',remember);
  document.querySelectorAll('[data-extras-command]').forEach(button=>{
    button.onmousedown=e=>{e.preventDefault();remember();};
    button.onclick=()=>{
      restore();let command=button.dataset.extrasCommand,value=null;
      if(command==='createLink'){
        const anchor=window.getSelection().anchorNode?.parentElement?.closest('a');
        const url=prompt('Dirección del enlace (https://…)',anchor?.getAttribute('href')||'https://');
        if(url===null)return;value=safeUrl(url.trim());
        if(!value){error.hidden=false;error.textContent='Indica un enlace válido que empiece por https:// o http://.';return;}
        restore();
        if(window.getSelection().isCollapsed&&!anchor){document.execCommand('insertHTML',false,`<a href="${esc(value)}">${esc(value)}</a>`);remember();sync();return;}
      }
      document.execCommand(command,false,value);remember();sync();
    };
  });
  editor.addEventListener('paste',e=>{
    e.preventDefault();const html=e.clipboardData.getData('text/html'),text=e.clipboardData.getData('text/plain');
    document.execCommand('insertHTML',false,html?cleanExtrasHtml(html):esc(text).replace(/\r?\n/g,'<br>'));remember();sync();
  });
  editor.addEventListener('drop',e=>e.preventDefault());
  const original=form.onsubmit;
  form.onsubmit=e=>{if(!sync()){e.preventDefault();editor.focus();return;}original(e);};
  sync();
}

const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const today=()=>{let d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`},uid=()=>crypto.randomUUID(),dateLabel=d=>new Date(d+'T12:00:00').toLocaleDateString('es-ES',{day:'numeric',month:'long'}),levels=['Iniciación','Intermedio','Avanzado'];
const seed={centers:[{id:'c1',name:'Centro Cívico La Estación',address:'Calle de la Estación, 12',email:'',phone:'',photo:''},{id:'c2',name:'Espacio de Danza Norte',address:'Avenida del Norte, 28',email:'',phone:'',photo:''},{id:'c3',name:'Centro Cultural El Molino',address:'Plaza del Molino, 4',email:'',phone:'',photo:''}],groups:[{id:'g1',center:'c1',level:'Iniciación',day:'Martes',start:'19:30',end:'20:30',total:8,whatsapp:''},{id:'g2',center:'c2',level:'Intermedio',day:'Jueves',start:'18:00',end:'19:00',total:8,whatsapp:''},{id:'g3',center:'c3',level:'Avanzado',day:'Viernes',start:'19:00',end:'20:00',total:10,whatsapp:''}],coreos:[{id:'r1',name:'A Bar Song',author:'Ben Murphy',level:'Iniciación',walls:4,counts:32,music:'',video:'',sheet:''},{id:'r2',name:'Texas Hold ’Em',author:'Guylaine Bourdages',level:'Iniciación',walls:4,counts:32,music:'',video:'',sheet:''},{id:'r3',name:'Stand By Me',author:'',level:'Iniciación',walls:4,counts:32,music:'',video:'',sheet:''},{id:'r4',name:'Beautiful Things',author:'',level:'Intermedio',walls:2,counts:32,music:'',video:'',sheet:''},{id:'r5',name:'Footloose',author:'',level:'Intermedio',walls:4,counts:48,music:'',video:'',sheet:''},{id:'r6',name:'Mamma Maria',author:'Frank Trace',level:'Iniciación',walls:4,counts:32,music:'',video:'',sheet:''}],sessions:[{id:'s1',group:'g1',date:today(),start:'19:30',end:'20:30',term:'Otoño 2026',closed:false,items:[{coreo:'r1',done:false,mode:'Nueva',note:''},{coreo:'r2',done:false,mode:'Repaso',note:''},{coreo:'r3',done:false,mode:'Bailar',note:''}]},{id:'s2',group:'g2',date:today(),start:'20:30',end:'21:30',term:'Otoño 2026',closed:false,items:[{coreo:'r4',done:false,mode:'Nueva',note:''},{coreo:'r5',done:false,mode:'Repaso',note:''}]}]};
let db=structuredClone(window.COMPAS_INITIAL_DATA);let page='agenda',selected=today(),weekOffset=0,activeSession=null;const center=id=>db.centers.find(c=>c.id===id),group=id=>db.groups.find(g=>g.id===id),coreo=id=>db.coreos.find(c=>c.id===id);function save(){window.cloudSave(db)}function toast(t){$('#toast').textContent=t;$('#toast').classList.add('show');setTimeout(()=>$('#toast').classList.remove('show'),2500)}function go(p){page=p;activeSession=null;render()}function heading(k,t,s,action,label){return `<div class="heading"><div><div class="eyebrow">${k}</div><h1>${t}</h1><p class="sub">${s}</p></div>${action?`<button class="button" data-action="${action}">＋ ${label}</button>`:''}</div>`}function render(){if(page==='library-admin'){cloudRenderLibraryManager();return;}if(page==='students'){renderStudentsPage();return;}document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('active',b.dataset.page===page));$('#crumb').textContent={agenda:'Mi agenda',coreos:'Coreografías',centros:'Centros y grupos',historial:'Historial de clases'}[page];$('#content').innerHTML=activeSession?sessionView():({agenda:agenda,coreos:catalog,centros:centersView,historial:history}[page])()}
function agenda(){let ds=new Date(selected+'T12:00:00');ds.setDate(ds.getDate()-((ds.getDay()+6)%7)+weekOffset*7);let days=Array.from({length:7},(_,i)=>{let d=new Date(ds);d.setDate(d.getDate()+i);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`});let sessions=db.sessions.filter(s=>s.date===selected).sort((a,b)=>a.start.localeCompare(b.start));return heading('UN NUEVO DÍA, UN NUEVO PASO','Tu semana, a buen ritmo','Planifica, enseña y disfruta. Todo lo demás, aquí.','session','Nueva clase')+`<div class="stats">${[['Clases esta semana',db.sessions.filter(s=>days.includes(s.date)).length,'En tu agenda','▦'],['Coreografías',db.coreos.length,'Pasos que cuentan historias','♫'],['Centros activos',db.centers.length,db.groups.length+' grupos con mucho ritmo','⌂'],['Clases realizadas',db.sessions.filter(s=>s.closed).length,'<span>✧</span> Sigue sumando momentos','✓']].map(x=>`<div class="stat"><div class="stat-top">${x[0]}<span class="stat-icon">${x[3]}</span></div><strong>${x[1]}</strong><small>${x[2]}</small></div>`).join('')}</div><div class="grid"><section class="panel"><div class="panel-head"><div><h2>Tu agenda</h2><p class="sub">Un vistazo a tus próximos pasos</p></div><div class="week-nav"><button data-week="-1" aria-label="Semana anterior">‹</button>${dateLabel(days[0])}<button data-week="1" aria-label="Semana siguiente">›</button></div></div><div class="week">${days.map((d,i)=>`<button class="day ${d===selected?'selected':''}" data-date="${d}">${['LUN','MAR','MIÉ','JUE','VIE','SÁB','DOM'][i]}<b>${Number(d.slice(-2))}</b><i style="opacity:${db.sessions.some(s=>s.date===d)?1:0}"></i></button>`).join('')}</div><div class="day-label"><span>${selected===today()?'HOY · ':''}${dateLabel(selected).toUpperCase()}</span><span>${sessions.length} CLASES</span></div>${sessions.map(sessionCard).join('')||'<div class="empty">Un día para coger aire.<br><br> Añade una clase para empezar a planificar.</div>'}<p class="bottom-note" style="padding-bottom:22px">✧ Un buen plan deja espacio para improvisar.</p></section><div class="side-stack"><div class="feature"><span class="decoration">♫</span><div class="eyebrow">TU PRÓXIMA CLASE</div><h2>Menos improvisar.<br>Más disfrutar.</h2><p>Prepara las coreos de tu próxima sesión y llega con todo a punto.</p><button class="button" data-action="session">Preparar una clase ↗</button></div><section class="panel"><div class="panel-head"><h3>En tu repertorio</h3><button class="text-button" data-page="coreos">Ver todas →</button></div><div class="recent">${db.coreos.slice(-3).reverse().map(c=>`<div class="mini"><div class="music-icon">♫</div><div><strong>${esc(c.name)}</strong><small>${esc(c.level)} · ${c.counts?esc(c.counts)+' counts':'Counts pendientes'}</small></div><button class="text-button arrow" data-edit-coreo="${c.id}">↗</button></div>`).join('')}</div></section><p class="sub" style="font-size:10px;padding:0 8px">◉ Tu espacio es privado. Empieza creando tus centros y cursos.</p></div></div>`}
function sessionCard(s){let g=group(s.group),c=center(g.center);return `<article class="session"><div class="time">${esc(s.start)}<small>${esc(s.end)}</small></div><div class="session-info"><h3>${esc(c.name)}</h3><span class="tag ${g.level==='Intermedio'?'green':''}">${esc(g.level)}</span> <span class="tag ${s.closed?'green':'orange'}">${s.closed?'Realizada':'Planificada'}</span><div class="session-meta">⌂ ${esc(c.address)} · ${esc(s.term)}</div><div class="session-bottom"><span class="planned">♫ ${s.items.filter(i=>i.done).length} realizadas · ${s.items.filter(i=>i.planned&&!i.done).length} planeadas</span><button class="button ${s.closed?'secondary':''}" data-open="${s.id}">${s.closed?'Ver clase':'Abrir clase'} →</button></div></div></article>`}
const catalogFilters = {query:'', level:[], walls:[], counts:[]};
const filterLabels = {level:'Nivel', walls:'Paredes', counts:'Counts'};
function filterValue(c, key) { return String(c[key] ?? '').trim() || 'Sin definir'; }
function filterOptions(key) {
  return [...new Set([...db.coreos.map(c => filterValue(c,key)), ...catalogFilters[key]])].sort((a,b) => {
    if (a === b) return 0;
    if (a === 'Sin definir') return 1;
    if (b === 'Sin definir') return -1;
    return a.localeCompare(b, 'es', {numeric:true, sensitivity:'base'});
  });
}
function filterMenu(key) {
  return `<details class="catalog-filter"><summary id="filter-label-${key}">${filterLabels[key]}${catalogFilters[key].length ? ' ('+catalogFilters[key].length+')' : ': todos'}</summary><div class="filter-options" role="group" aria-label="Filtrar por ${filterLabels[key]}">${filterOptions(key).map(value => `<label><input type="checkbox" data-catalog-filter="${key}" value="${esc(value)}" ${catalogFilters[key].includes(value)?'checked':''}><span>${esc(value)}</span></label>`).join('') || '<p class="sub">Sin valores disponibles</p>'}</div></details>`;
}
function filteredCoreos() {
  const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es').trim();
  return db.coreos.filter(c => normalize(c.name).includes(normalize(catalogFilters.query)) &&
    ['level','walls','counts'].every(key => !catalogFilters[key].length || catalogFilters[key].includes(filterValue(c,key))))
    .sort((a,b) => a.name.localeCompare(b.name,'es',{sensitivity:'base',numeric:true}));
}
function refreshCatalog() {
  $('#coreo-cards').innerHTML = coreoCards();
  $('#catalog-count').textContent = `${filteredCoreos().length} de ${db.coreos.length} coreografías · Ordenadas por nombre`;
  for (const key of ['level','walls','counts']) $('#filter-label-'+key).textContent = filterLabels[key] + (catalogFilters[key].length ? ' ('+catalogFilters[key].length+')' : ': todos');
}
function clearCatalogFilters() {
  catalogFilters.query = '';
  for (const key of ['level','walls','counts']) catalogFilters[key] = [];
  $('#search').value = '';
  document.querySelectorAll('[data-catalog-filter]').forEach(input => { input.checked = false; });
  refreshCatalog();
}
function catalog(){return heading('EL REPERTORIO','Cada coreo, en su sitio','Tus pasos, tu música y todos los recursos para enseñarlos.','coreo','Nueva coreografía')+`<div class="toolbar"><button class="button secondary" type="button" onclick="cloudLibrary()">Catálogo común</button><button class="button secondary" type="button" onclick="cloudSuggestions()">Propuestas al catálogo</button><button class="button secondary" data-action="import-csv">↥ Importar CSV</button><input id="search" value="${esc(catalogFilters.query)}" placeholder="Buscar una coreografía…" aria-label="Buscar coreografía">${['level','walls','counts'].map(filterMenu).join('')}<button class="text-button" data-action="clear-filters">Limpiar filtros</button></div><p class="sub catalog-help">Puedes elegir varios valores en cada filtro. Sin seleccionar ninguno, se muestran todos.</p><p id="catalog-count" class="sub history-count" role="status">${filteredCoreos().length} de ${db.coreos.length} coreografías · Ordenadas por nombre</p><div class="cards" id="coreo-cards">${coreoCards()}</div>`}
function teachingReach(coreoId) {
  const centers = new Map(), levels = new Map();
  for (const session of db.sessions) {
    if (!session.items.some(item => item.coreo === coreoId && item.done)) continue;
    const g = group(session.group);
    if (!g) continue;
    const c = center(g.center);
    if (c) centers.set(c.id, c.name);
    const level = (g.level || '').trim();
    const key = level.toLocaleLowerCase('es');
    if (level && key !== 'sin definir') levels.set(key, level);
  }
  return {centers:[...centers.values()], levels:[...levels.values()]};
}
function teachingReachMarkup(coreoId) {
  const reach = teachingReach(coreoId);
  return `<div class="teaching-reach" aria-label="Centros y niveles donde se ha bailado o enseñado"><span title="${esc(reach.centers.join(', ') || 'Sin centros con práctica registrada')}">⌂ <strong>${reach.centers.length}</strong> ${reach.centers.length === 1 ? 'centro' : 'centros'}</span><span title="${esc(reach.levels.join(', ') || 'Sin niveles con práctica registrada')}">▤ <strong>${reach.levels.length}</strong> ${reach.levels.length === 1 ? 'nivel' : 'niveles'}</span><small>Bailada o enseñada · Centros y niveles distintos</small></div>`;
}
function coreoExtras(c) {
  return c?.extras ? `<div class="coreo-extras"><strong>Extras:</strong><div class="extras-rich">${typeof extrasHtml==='function'?extrasHtml(c.extras):esc(c.extras)}</div></div>` : '';
}
function classCoreoResources(c) {
  const links=[['sheet','Coreografía'],['music','Música'],['video','Clase']]
    .filter(([key])=>safeUrl(c?.[key]))
    .map(([key,label])=>`<a class="coreo-sheet" href="${esc(safeUrl(c[key]))}" target="_blank" rel="noopener noreferrer">${label}</a>`);
  return CompasMusic.markup(c,false)+coreoExtras(c)+(links.length?`<div class="class-coreo-links">${links.join('<span aria-hidden="true">·</span>')}</div>`:'');
}

// Only completed activities in earlier classes of this same group count.
function lastCoreoActivity(coreoId, session) {
  const latest = {};
  const sessionTime = session.date + 'T' + (session.start || '00:00');
  for (const previous of db.sessions) {
    if (previous.id === session.id || previous.group !== session.group || previous.date + 'T' + (previous.start || '00:00') >= sessionTime) continue;
    for (const item of previous.items) {
      if (item.coreo !== coreoId || !item.done) continue;
      if (!latest[item.mode] || previous.date > latest[item.mode]) latest[item.mode] = previous.date;
    }
  }
  return latest;
}
function lastCoreoActivityMarkup(coreoId, session) {
  const latest = lastCoreoActivity(coreoId, session);
  const labels = [['Nueva', 'Se enseñó'], ['Bailar', 'Se bailó'], ['Repaso', 'Se repasó']];
  const text = labels.filter(([mode]) => latest[mode]).map(([mode, label]) => label + ' el ' + dateLabel(latest[mode]) + ' de ' + latest[mode].slice(0,4));
  return '<small class="coreo-last-activity">' + (text.length ? esc(text.join(' · ')) : 'Sin actividad anterior registrada en este grupo') + '</small>';
}
function first(c,gid){return db.sessions.filter(s=>(!gid||s.group===gid)&&s.items.some(i=>i.coreo===c&&i.done&&i.mode==='Nueva')).map(s=>s.date).sort()[0]}function coreoCards(){return filteredCoreos().map(c=>`<article class="card"><span class="tag">${esc(c.level)}</span>${cloudCoreoStateMarkup(c)}<h3>${esc(c.name)}</h3><p>${esc(c.author)||'Autor pendiente'}<br>${c.walls?esc(c.walls)+' paredes':'Paredes pendientes'} · ${c.counts?esc(c.counts)+' counts':'Counts pendientes'}</p>${coreoExtras(c)}${CompasMusic.markup(c)}<small>${first(c.id)?'Primera enseñanza: '+dateLabel(first(c.id)):'Sin primera enseñanza registrada'}</small>${teachingReachMarkup(c.id)}<div class="card-actions">${[['music','♫ Música'],['video','▷ Vídeo'],['sheet','↗ Hoja']].filter(([k])=>safeUrl(c[k])).map(([k,t])=>`<a target="_blank" rel="noopener" href="${esc(safeUrl(c[k]))}">${t}</a>`).join('')}</div><div class="card-actions">${cloudShareCoreoButton(c)}<button class="button secondary" data-edit-coreo="${c.id}">Editar coreografía</button><button class="text-button" data-delete-coreo="${c.id}">Eliminar</button></div></article>`).join('')||(db.coreos.length?'<div class="empty">No hay coincidencias. Cambia o limpia los filtros para ver más coreografías.</div>':'<div class="empty">No hay coreografías. Añade tu primer baile.</div>')}function safeUrl(v){try{let u=new URL(v);return ['https:','http:'].includes(u.protocol)?u.href:''}catch{return ''}}
function centersView(){return heading('LOS LUGARES DONDE BAILAMOS','Centros y grupos','Un espacio para cada centro. Un ritmo para cada grupo.','center','Nuevo centro')+`<div class="cards">${db.centers.map(c=>`<article class="card"><div class="center-photo">${centerPhotoUrl(c.photo)?`<img src="${esc(centerPhotoUrl(c.photo))}" alt="${esc(c.name)}" loading="lazy" referrerpolicy="no-referrer">`:'⌂'}</div><h3>${esc(c.name)}</h3><p>${esc(c.address)}<br>${esc(c.email)||'Correo pendiente'}<br>${esc(c.phone)||'Teléfono pendiente'}</p>${db.groups.filter(g=>g.center===c.id).map(g=>`<div class="group"><span class="tag">${esc(g.level)}</span><button class="text-button" data-edit-group="${g.id}">Editar</button>${studentsEnabled()?`<button type="button" class="text-button" data-class-roster="${g.id}">Alumnos</button>`:''}<p class="sub">${esc(g.day)} · ${esc(g.start)}–${esc(g.end)}<br>${g.total} clases por trimestre</p>${safeUrl(g.whatsapp)?`<a class="text-button" href="${esc(safeUrl(g.whatsapp))}" target="_blank" rel="noopener">Abrir grupo de WhatsApp ↗</a>`:''}</div>`).join('')}<div class="card-actions"><button class="button secondary" data-edit-center="${c.id}">Editar centro</button><button class="text-button" data-add-group="${c.id}">＋ Grupo</button><button class="text-button danger-text" data-delete-center="${c.id}">Eliminar centro</button></div></article>`).join('')}</div>`}
function history() {
  const sessions = [...db.sessions].sort((a,b) => b.date.localeCompare(a.date) || b.start.localeCompare(a.start));
  return heading('TODAS TUS SESIONES', 'La memoria de tus clases', 'Todas las clases de tus centros, incluidas las pendientes de registrar.') +
    `<p class="sub history-count">${sessions.length} clases en total</p><div class="panel">${sessions.map(s => {
      const g = group(s.group), performed = s.items.filter(i => i.done);
      const status = s.closed ? 'Finalizada' : performed.length ? 'En curso' : 'Pendiente';
      return `<div class="history-row" data-open="${s.id}" tabindex="0" role="button"><div><h3>${esc(center(g.center).name)} · ${esc(g.level)}</h3><p class="sub">${dateLabel(s.date)} ${s.date.slice(0,4)} · ${esc(s.start)}–${esc(s.end)}</p><p class="sub">${performed.map(i => esc(coreo(i.coreo)?.name)).join(', ') || (s.items.length ? s.items.filter(i=>i.planned).length + ' planeadas · ' + s.items.length + ' en la lista · Sin realizadas todavía' : 'Sin coreografías registradas')}</p></div><div class="history-status"><span class="tag ${s.closed ? 'green' : 'orange'}">${status}</span><span aria-hidden="true">→</span></div></div>`;
    }).join('') || '<div class="empty">Todavía no hay clases. Crea la primera desde Mi agenda.</div>'}</div>`;
}
function centerDependencies(id) {
  const groupIds = new Set(db.groups.filter(g => g.center === id).map(g => g.id));
  return {groupIds, sessions: db.sessions.filter(s => groupIds.has(s.group))};
}
function deleteCenter(id) {
  const c = center(id);
  if (!c) return;
  const dependencies = centerDependencies(id);
  modal('Eliminar centro', `<p class="sub">Vas a eliminar <strong>${esc(c.name)}</strong>.</p><div class="csv-errors">También se eliminarán sus ${dependencies.groupIds.size} grupos y sus ${dependencies.sessions.length} clases, con su planificación, notas y registros del historial. Esta acción no se puede deshacer.</div><p class="sub">Las coreografías del catálogo se conservan.</p>`, () => {});
  $('#form button[type="submit"]').textContent = 'Eliminar centro y sus clases';
  $('#form').onsubmit = e => {
    e.preventDefault();
    const {groupIds} = centerDependencies(id), previous = db;
    db = {...db, centers:db.centers.filter(c => c.id !== id), groups:db.groups.filter(g => !groupIds.has(g.id)), sessions:db.sessions.filter(s => !groupIds.has(s.group)), ...(db.students?{students:db.students.map(s=>studentWithoutGroups(s,groupIds))}:{})};
    try { save(); }
    catch { db = previous; toast('No se pudo guardar. El centro no se ha eliminado.'); return; }
    activeSession = null;
    $('#modal').close(); render(); toast('Centro eliminado');
  };
}

function sortedSessionItems(items) {
  return items.map((item,index) => ({item,index})).sort((a,b) =>
    (coreo(a.item.coreo)?.name || '').localeCompare(coreo(b.item.coreo)?.name || '', 'es', {sensitivity:'base',numeric:true}));
}
function routineState(item) { return item.done ? 'done' : item.planned ? 'planned' : 'none'; }
function routineStateLabel(item) { return {none:'Sin marcar',planned:'Planeada',done:'Realizada'}[routineState(item)]; }
function routineStateButton(item,index) {
  const state=routineState(item),next={none:'Marcar como planeada',planned:'Marcar como realizada',done:'Desmarcar'}[state];
  return `<button type="button" class="routine-state ${state}" data-cycle-state="${index}" title="${next}" aria-label="${esc(coreo(item.coreo)?.name)}: ${routineStateLabel(item)}. ${next}"><span class="state-check" aria-hidden="true">${state==='none'?'':'✓'}</span><span class="state-caption">${routineStateLabel(item)}</span></button>`;
}
function setSessionStates(indices,state) {
  const session=db.sessions.find(s=>s.id===activeSession);
  if(!session)return;
  const previous=session.items.map(i=>({...i}));
  indices.forEach(index=>{const item=session.items[index];if(item){item.done=state==='done';item.planned=state!=='none';}});
  try{save();}catch{session.items=previous;toast('No se pudo guardar el cambio. Inténtalo de nuevo.');return;}
  render();
}
function cycleSessionState(index) {
  const item=db.sessions.find(s=>s.id===activeSession)?.items[index];
  if(!item)return;
  setSessionStates([index],{none:'planned',planned:'done',done:'none'}[routineState(item)]);
  document.querySelector(`[data-cycle-state="${index}"]`)?.focus();
}
function sessionView(){let s=db.sessions.find(s=>s.id===activeSession),g=group(s.group),c=center(g.center),n=db.sessions.filter(x=>x.group===g.id&&x.term===s.term&&x.closed).length;return `<div class="detail-top"><button class="button secondary" data-back>← Volver</button><span class="tag ${s.closed?'green':''}">${s.closed?'Clase realizada':'En preparación'}</span></div>`+heading(esc(g.level).toUpperCase(),esc(c.name),`${dateLabel(s.date)} ${s.date.slice(0,4)} · ${esc(s.start)}–${esc(s.end)} · ${esc(s.term)} · ${n}/${g.total} clases realizadas`)+previousClassBanner(s)+classPreparationPanel(s)+`<div class="panel"><div class="panel-head"><div><h2>El baile de hoy</h2><p class="sub">Pulsa para cambiar: sin marcar → azul (planeada) → verde (realizada) → sin marcar.</p></div><button class="button secondary" data-action="add-routine">＋ Coreografía</button></div><div class="session-selection"><div class="session-selection-buttons"><button class="button secondary" data-bulk-state="planned" ${!s.items.some(i=>routineState(i)==='none')?'disabled':''}>Planear todas</button><button class="button secondary" data-bulk-state="done" ${!s.items.some(i=>!i.done)?'disabled':''}>Todas realizadas</button><button class="button secondary" data-bulk-state="none" ${!s.items.some(i=>routineState(i)!=='none')?'disabled':''}>Desmarcar todas</button></div><span class="sub" role="status">${s.items.filter(i=>routineState(i)==='planned').length} planeadas pendientes · ${s.items.filter(i=>i.done).length} realizadas · ${s.items.length} en la lista</span></div>${sortedSessionItems(s.items).map(({item:i,index})=>`<div class="routine-row">${routineStateButton(i,index)}<div class="routine-main"><strong>${esc(coreo(i.coreo)?.name)}</strong><small>${first(i.coreo,g.id)?'Primera enseñanza al grupo: '+dateLabel(first(i.coreo,g.id)):'Sin enseñanza previa registrada en este grupo'}</small>${lastCoreoActivityMarkup(i.coreo,s)}${classCoreoResources(coreo(i.coreo))}</div><div class="routine-controls"><select data-mode="${index}" aria-label="Tipo de práctica">${['Nueva','Repaso','Bailar'].map(m=>`<option ${i.mode===m?'selected':''}>${m}</option>`).join('')}</select><input data-note="${index}" placeholder="Notas, dificultad…" aria-label="Notas de la coreografía" value="${esc(i.note)}"><button class="text-button" data-remove="${index}" aria-label="Quitar del plan">✕</button></div></div>`).join('')||'<div class="empty">Añade coreografías antes o durante la clase.</div>'}</div><div class="card-actions"><button class="button" data-finish>${s.closed?'Reabrir clase':'Finalizar clase'} ✓</button><button class="button secondary" data-share>Compartir resumen ↗</button><button class="text-button" data-edit-session="${s.id}">Editar fecha y grupo</button><button class="text-button" data-delete-session="${s.id}">Eliminar clase</button></div>`}
function field(k,label,value='',type='text',required=false){return `<label for="f-${k}">${label}</label><input id="f-${k}" name="${k}" type="${type}" value="${esc(value)}" ${required?'required':''} ${type==='number'?'min="1" max="999"':''}>`}function select(k,label,options,value){return `<label for="f-${k}">${label}</label><select id="f-${k}" name="${k}">${options.map(o=>{let [v,t]=Array.isArray(o)?o:[o,o];return `<option value="${esc(v)}" ${v===value?'selected':''}>${esc(t)}</option>`}).join('')}</select>`}function modal(title,html,submit){$('#form button[type="submit"]').hidden=false;$('#form button[type="submit"]').textContent='Guardar';$('#form button[type="submit"]').disabled=false;$('#modal-title').textContent=title;$('#fields').innerHTML=html;$('#form').onsubmit=e=>{e.preventDefault();let values=Object.fromEntries(new FormData(e.target));submit(values);save();$('#modal').close();render();toast('Cambios preparados para guardar')};$('#modal').showModal()}
function editCoreo(id){if(typeof extrasEditorMarkup!=='function'||typeof mountExtrasEditor!=='function'){toast('No se ha cargado el editor. Recarga la página para editar sin perder el formato.');return;}let c=coreo(id)||{};modal(id?'Editar coreografía':'Nueva coreografía',field('name','Nombre',c.name,'text',true)+field('author','Coreógrafo/a',c.author)+select('level','Nivel',['Sin definir',...levels],c.level)+`<div class="form-grid"><div>${field('walls','Paredes',c.walls??4,'number')}</div><div>${field('counts','Counts',c.counts??32,'number')}</div></div>`+extrasEditorMarkup(c.extras)+field('music','Enlace a música',c.music,'url')+field('video','Enlace a vídeo',c.video,'url')+field('sheet','Enlace a hoja de pasos',c.sheet,'url'),v=>{if(id)Object.assign(c,v);else db.coreos.push({id:uid(),...v})});mountExtrasEditor();}function editCenter(id){editCenterPhotoForm(id)}function editGroup(cid,id){let g=group(id)||{};modal(id?'Editar grupo':'Nuevo grupo',select('level','Nivel',levels,g.level)+select('day','Día habitual',['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'],g.day)+`<div class="form-grid"><div>${field('start','Hora de inicio',g.start||'19:30','time',true)}</div><div>${field('end','Hora de fin',g.end||'20:30','time',true)}</div></div>`+field('total','Clases previstas por trimestre',g.total||8,'number',true)+field('whatsapp','Enlace al grupo de WhatsApp',g.whatsapp,'url')+select('whatsappGroupId','Grupo para enviar los resúmenes', [['','Sin grupo asignado'],...(g.whatsappGroupId?[[g.whatsappGroupId,g.whatsappGroupName||g.whatsappGroupId]]:[])],g.whatsappGroupId||'')+'<p id="course-whatsapp-status" class="sub csv-help" role="status"></p><button type="button" class="text-button" id="course-whatsapp-reload">Actualizar grupos de WhatsApp</button>',v=>{v.whatsappGroupName=v.whatsappGroupId===g.whatsappGroupId?(g.whatsappGroupName||v.whatsappGroupId):v.whatsappGroupId?$('#f-whatsappGroupId').selectedOptions[0].textContent.split(' · ')[0]:'';if(id)Object.assign(g,v);else db.groups.push({id:uid(),center:cid,...v})});
  const picker=$('#f-whatsappGroupId'), status=$('#course-whatsapp-status'), reload=$('#course-whatsapp-reload');
  async function loadCourseGroups(){
    reload.disabled=true;
    // Keep the selected destination if the service is unavailable.
    const savedId=picker.value;
    try{await loadWhatsappGroups(picker,status,savedId,()=>{}, {preserveSaved:true,savedName:g.whatsappGroupName,emptyLabel:'Sin grupo asignado',help:'Guarda el curso para usar este grupo automáticamente en sus resúmenes.'});}
    finally{picker.disabled=false;reload.disabled=false;}
  }
  reload.onclick=loadCourseGroups;
  picker.closest('form').querySelector('label[for="f-whatsappGroupId"]').hidden=true;picker.hidden=true;status.textContent='Comparte los resúmenes desde tu propio WhatsApp.';reload.hidden=true;
}
function editSession(id){if(!db.groups.length){toast('Crea un centro y un grupo primero');go('centros');return}let s=db.sessions.find(x=>x.id===id)||{},g=group(s.group)||db.groups[0];modal(id?'Editar clase':'Planificar una clase',select('group','Centro y nivel',db.groups.map(g=>[g.id,center(g.center).name+' · '+g.level]),g.id)+field('date','Fecha',s.date||selected,'date',true)+`<div class="form-grid"><div>${field('start','Inicio',s.start||g.start,'time',true)}</div><div>${field('end','Fin',s.end||g.end,'time',true)}</div></div>`+field('term','Trimestre',s.term||'Otoño 2026','text',true)+(id&&s.attendance?.length?'<p class="sub">Si cambias el grupo, se limpiará la asistencia de esta clase.</p>':''),v=>{if(id){if(s.group!==v.group)delete s.attendance;Object.assign(s,v);}else{let newId=uid();db.sessions.push({id:newId,...v,closed:false,items:[]});activeSession=newId}});$('#f-group').onchange=e=>{let g=group(e.target.value);$('#f-start').value=g.start;$('#f-end').value=g.end}}
function matchingRoutines(routines, query) {
  const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').trim();
  const words = normalize(query).split(/\s+/).filter(Boolean);
  return routines.filter(c => words.every(word => normalize(c.name).includes(word)));
}
function addRoutine() {
  const s = db.sessions.find(s => s.id === activeSession);
  const available = db.coreos.filter(c => !s.items.some(i => i.coreo === c.id))
    .sort((a,b) => a.name.localeCompare(b.name, 'es', {sensitivity:'base', numeric:true}));
  if (!available.length) { toast('Añade nuevas coreografías al catálogo primero'); return; }
  modal('Añadir al plan',
    '<label for="routine-search">Buscar por nombre</label><input id="routine-search" type="search" placeholder="Escribe el nombre de una coreografía…" autocomplete="off" aria-controls="routine-matches" aria-describedby="routine-status">' +
    '<p id="routine-status" class="sub routine-status" role="status"></p><div id="routine-matches" class="routine-matches"></div>' +
    select('coreo', 'Coreografía', available.map(c => [c.id, c.name + ' · ' + c.level])) +
    select('mode', 'Qué vais a hacer', ['Nueva', 'Repaso', 'Bailar'], 'Bailar'),
    v => { if (available.some(c => c.id === v.coreo) && !s.items.some(i => i.coreo === v.coreo)) s.items.push({...v, done:false, planned:false, note:''}); });
  const search = $('#routine-search'), dropdown = $('#f-coreo');
  const results = $('#routine-matches'), status = $('#routine-status');
  const submit = $('#form button[type="submit"]');
  dropdown.required = true;
  function update() {
    const matches = matchingRoutines(available, search.value), previous = dropdown.value;
    dropdown.innerHTML = matches.map(c => `<option value="${esc(c.id)}">${esc(c.name)} · ${esc(c.level)}</option>`).join('');
    if (matches.some(c => c.id === previous)) dropdown.value = previous;
    dropdown.disabled = submit.disabled = !matches.length;
    status.textContent = matches.length ? `${matches.length} coreografías disponibles` : 'No hay coincidencias. Prueba con otro nombre.';
    results.innerHTML = search.value.trim() ? matches.map(c => `<button type="button" class="routine-match" data-choice="${esc(c.id)}" aria-pressed="${c.id === dropdown.value}"><span>${esc(c.name)}</span><small>${esc(c.level)}</small></button>`).join('') : '';
  }
  function reflectSelection() {
    results.querySelectorAll('[data-choice]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.choice === dropdown.value)));
  }
  search.oninput = update;
  dropdown.onchange = reflectSelection;
  results.onclick = e => {
    const choice = e.target.closest('[data-choice]');
    if (!choice) return;
    dropdown.value = choice.dataset.choice;
    reflectSelection();
  };
  update();
  search.focus();
}

function sortedShareItems(items) {
  return [...items].sort((a, b) => coreo(a.coreo).name.localeCompare(coreo(b.coreo).name, 'es', {sensitivity:'base', numeric:true}));
}
function shareSummary(session, items) {
  const g = group(session.group);
  return `💃 ${center(g.center).name} · ${g.level}\n${dateLabel(session.date)} ${session.date.slice(0,4)}\n\nCoreografías bailadas:\n` +
    sortedShareItems(items).map(item => {
      const c = coreo(item.coreo), video = safeUrl(c.video), music = safeUrl(c.music);
      return `- ${c.name}${item.mode === 'Nueva' ? ' ✨ Nueva' : ''}${item.note ? ' — ' + item.note : ''}${video ? '\n  - baile: ' + video : ''}${music ? '\n  - música: ' + music : ''}`;
    }).join('\n\n');
}
function share() {
  const session = db.sessions.find(s => s.id === activeSession);
  const items = sortedShareItems(session.items.filter(i => i.done && coreo(i.coreo)));
  if (!items.length) { toast('Marca alguna coreografía como realizada primero'); return; }
  modal('Compartir resumen',
    '<p class="sub">Selecciona las coreografías realizadas que quieres compartir. Se enviarán por orden alfabético, con sus enlaces de baile y música cuando estén disponibles.</p>' +
    '<div class="share-toolbar"><button type="button" class="button secondary" id="share-toggle">Desmarcar todas</button><span id="share-count" class="sub" role="status"></span></div>' +
    '<div class="share-list">' + items.map((item, index) => {
      const c = coreo(item.coreo);
      return `<label class="share-option"><input type="checkbox" data-share-index="${index}" checked><span>${esc(c.name)}<small>${safeUrl(c.video) ? 'Baile incluido' : 'Sin enlace de baile'} · ${safeUrl(c.music) ? 'Música incluida' : 'Sin enlace de música'}</small></span></label>`;
    }).join('') + '</div><label for="share-destination">Destino de WhatsApp</label><select id="share-destination"><option value="">Elegir destinatario en WhatsApp (envío manual)</option></select><p id="share-service-status" class="sub csv-help" role="status"></p><button type="button" class="text-button" id="share-reload-groups">Actualizar grupos</button><label for="share-preview">Vista previa del mensaje</label><textarea id="share-preview" rows="8" readonly></textarea>', () => {});
  const boxes = [...document.querySelectorAll('[data-share-index]')];
  const toggle = $('#share-toggle'), submit = $('#form button[type="submit"]');
  const selectedItems = () => boxes.filter(b => b.checked).map(b => items[Number(b.dataset.shareIndex)]);
  const destination = $('#share-destination'), serviceStatus = $('#share-service-status');
  const classGroup = group(session.group);
  let sending = false;
  function update() {
    const selected = selectedItems();
    toggle.textContent = selected.length === items.length ? 'Desmarcar todas' : 'Marcar todas';
    $('#share-count').textContent = `${selected.length} de ${items.length} seleccionadas`;
    $('#share-preview').value = selected.length ? (destination.value ? whatsappSummaryPreview(shareSummary(session, selected)) : shareSummary(session, selected)) : '';
    submit.textContent = destination.value ? 'Enviar al grupo' : 'Abrir WhatsApp ↗';
    submit.disabled = sending || !selected.length;
  }
  toggle.onclick = () => {
    const checked = !boxes.every(b => b.checked);
    boxes.forEach(b => { b.checked = checked; });
    update();
  };
  boxes.forEach(b => { b.onchange = update; });
  destination.onchange = () => {
    classGroup.whatsappGroupId = destination.value;
    try { save(); } catch { toast('No se pudo recordar el grupo en este navegador.'); }
    update();
  };
  const reload = $('#share-reload-groups');
  async function reloadGroups() {
    reload.disabled = true;
    await loadWhatsappGroups(destination, serviceStatus, classGroup.whatsappGroupId || '', update);
    reload.disabled = false;
  }
  reload.onclick = reloadGroups;
  $('#form').onsubmit = async e => {
    e.preventDefault();
    const selected = selectedItems();
    if (sending || !selected.length) return;
    const summary = shareSummary(session, selected);
    if (!destination.value) {
      window.open('https://wa.me/?text=' + encodeURIComponent(summary), '_blank', 'noopener');
      $('#modal').close();
      toast('Elige tu grupo en WhatsApp para enviar el resumen');
      return;
    }
    const payload = whatsappPayload(destination.value, summary);
    const destinationName = destination.selectedOptions[0].textContent;
    sending = true;
    const controls = [submit, destination, toggle, reload, $('#close'), $('#cancel'), ...boxes];
    const states = controls.map(control => control.disabled);
    controls.forEach(control => { control.disabled = true; });
    const preventClose = event => event.preventDefault();
    $('#modal').addEventListener('cancel', preventClose);
    submit.textContent = 'Enviando…';
    serviceStatus.textContent = 'Enviando a ' + destinationName + '…';
    try {
      const result = await whatsappRequest('/api/whatsapp/send', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)});
      if (!Array.isArray(result.sent) || result.sent.length !== 1) throw new Error('El servicio no confirmó el envío.');
      $('#modal').close();
      toast('Resumen enviado a ' + (result.group || destinationName));
    } catch (error) {
      serviceStatus.textContent = 'No se pudo confirmar el envío. Revisa el grupo antes de volver a enviar para evitar duplicados. ' + (error.name === 'AbortError' ? 'El servicio ha tardado demasiado en responder.' : error.message);
    } finally {
      sending = false;
      controls.forEach((control,index) => { control.disabled = states[index]; });
      $('#modal').removeEventListener('cancel', preventClose);
      update();
    }
  };
  destination.value='';destination.hidden=true;document.querySelector('label[for="share-destination"]').hidden=true;reload.hidden=true;serviceStatus.textContent='Se abrirá tu WhatsApp para que elijas el grupo y confirmes el envío.';
  update();
}

document.addEventListener('click',e=>{let b=e.target.closest('button,[data-open]');if(!b)return;let d=b.dataset;if(d.page)go(d.page);else if(d.action)({coreo:editCoreo,center:editCenter,session:editSession,'add-routine':addRoutine,'import-csv':importCsv,'clear-filters':clearCatalogFilters,'import-previous':importPreviousClass}[d.action])();else if(d.date){selected=d.date;weekOffset=0;render()}else if(d.week){weekOffset+=Number(d.week);render()}else if(d.open){activeSession=d.open;render()}else if('back'in d){activeSession=null;render()}else if(d.editCoreo)editCoreo(d.editCoreo);else if(d.editCenter)editCenter(d.editCenter);else if(d.deleteCenter)deleteCenter(d.deleteCenter);else if(d.addGroup)editGroup(d.addGroup);else if(d.editGroup)editGroup(null,d.editGroup);else if(d.editSession)editSession(d.editSession);else if(d.deleteCoreo){if(db.sessions.some(s=>s.items.some(i=>i.coreo===d.deleteCoreo)))toast('Esta coreografía tiene clases asociadas. Conservamos su historial.');else if(confirm('¿Eliminar esta coreografía?')){db.coreos=db.coreos.filter(c=>c.id!==d.deleteCoreo);save();render()}}else if(d.deleteSession){if(confirm('¿Eliminar esta clase y su registro?')){db.sessions=db.sessions.filter(s=>s.id!==d.deleteSession);activeSession=null;save();render()}}else if('cycleState'in d){cycleSessionState(Number(d.cycleState))}else if(d.bulkState){const items=db.sessions.find(s=>s.id===activeSession).items;setSessionStates(items.map((i,index)=>index).filter(index=>d.bulkState!=='planned'||routineState(items[index])==='none'),d.bulkState)}else if('remove'in d){db.sessions.find(s=>s.id===activeSession).items.splice(Number(d.remove),1);save();render()}else if('finish'in d){let s=db.sessions.find(s=>s.id===activeSession);s.closed=!s.closed;save();render();toast(s.closed?'Clase finalizada. ¡Un paso más!':'Clase reabierta')}else if('share'in d)share()});
document.addEventListener('change',e=>{let d=e.target.dataset,s=db.sessions.find(s=>s.id===activeSession);if(d.catalogFilter){catalogFilters[d.catalogFilter]=[...document.querySelectorAll('[data-catalog-filter="'+d.catalogFilter+'"]:checked')].map(input=>input.value);refreshCatalog();}if('mode'in d){s.items[d.mode].mode=e.target.value;save();render()}});document.addEventListener('input',e=>{if(e.target.id==='search'){catalogFilters.query=e.target.value;refreshCatalog();}if('note'in e.target.dataset){db.sessions.find(s=>s.id===activeSession).items[e.target.dataset.note].note=e.target.value;save()}});$('#close').onclick=$('#cancel').onclick=()=>$('#modal').close();$('#export').onclick=()=>{let blob=new Blob([JSON.stringify(db,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='compas-copia-'+today()+'.json';a.click();URL.revokeObjectURL(a.href);toast('Copia de seguridad exportada')};document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.matches('.history-row')){activeSession=e.target.dataset.open;render()}});render();
