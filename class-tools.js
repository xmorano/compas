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
