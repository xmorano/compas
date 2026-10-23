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
