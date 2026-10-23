const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const today=()=>{let d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`},uid=()=>crypto.randomUUID(),dateLabel=d=>new Date(d+'T12:00:00').toLocaleDateString('es-ES',{day:'numeric',month:'long'}),levels=['Iniciación','Intermedio','Avanzado'];
const seed={centers:[{id:'c1',name:'Centro Cívico La Estación',address:'Calle de la Estación, 12',email:'',phone:'',photo:''},{id:'c2',name:'Espacio de Danza Norte',address:'Avenida del Norte, 28',email:'',phone:'',photo:''},{id:'c3',name:'Centro Cultural El Molino',address:'Plaza del Molino, 4',email:'',phone:'',photo:''}],groups:[{id:'g1',center:'c1',level:'Iniciación',day:'Martes',start:'19:30',end:'20:30',total:8,whatsapp:''},{id:'g2',center:'c2',level:'Intermedio',day:'Jueves',start:'18:00',end:'19:00',total:8,whatsapp:''},{id:'g3',center:'c3',level:'Avanzado',day:'Viernes',start:'19:00',end:'20:00',total:10,whatsapp:''}],coreos:[{id:'r1',name:'A Bar Song',author:'Ben Murphy',level:'Iniciación',walls:4,counts:32,music:'',video:'',sheet:''},{id:'r2',name:'Texas Hold ’Em',author:'Guylaine Bourdages',level:'Iniciación',walls:4,counts:32,music:'',video:'',sheet:''},{id:'r3',name:'Stand By Me',author:'',level:'Iniciación',walls:4,counts:32,music:'',video:'',sheet:''},{id:'r4',name:'Beautiful Things',author:'',level:'Intermedio',walls:2,counts:32,music:'',video:'',sheet:''},{id:'r5',name:'Footloose',author:'',level:'Intermedio',walls:4,counts:48,music:'',video:'',sheet:''},{id:'r6',name:'Mamma Maria',author:'Frank Trace',level:'Iniciación',walls:4,counts:32,music:'',video:'',sheet:''}],sessions:[{id:'s1',group:'g1',date:today(),start:'19:30',end:'20:30',term:'Otoño 2026',closed:false,items:[{coreo:'r1',done:false,mode:'Nueva',note:''},{coreo:'r2',done:false,mode:'Repaso',note:''},{coreo:'r3',done:false,mode:'Bailar',note:''}]},{id:'s2',group:'g2',date:today(),start:'20:30',end:'21:30',term:'Otoño 2026',closed:false,items:[{coreo:'r4',done:false,mode:'Nueva',note:''},{coreo:'r5',done:false,mode:'Repaso',note:''}]}]};
let db;try{db=JSON.parse(localStorage.getItem('compas-v1'))||structuredClone(seed)}catch{db=structuredClone(seed)}let page='agenda',selected=today(),weekOffset=0,activeSession=null;const center=id=>db.centers.find(c=>c.id===id),group=id=>db.groups.find(g=>g.id===id),coreo=id=>db.coreos.find(c=>c.id===id);function save(){localStorage.setItem('compas-v1',JSON.stringify(db))}function toast(t){$('#toast').textContent=t;$('#toast').classList.add('show');setTimeout(()=>$('#toast').classList.remove('show'),2500)}function go(p){page=p;activeSession=null;render()}function heading(k,t,s,action,label){return `<div class="heading"><div><div class="eyebrow">${k}</div><h1>${t}</h1><p class="sub">${s}</p></div>${action?`<button class="button" data-action="${action}">＋ ${label}</button>`:''}</div>`}function render(){document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('active',b.dataset.page===page));$('#crumb').textContent={agenda:'Mi agenda',coreos:'Coreografías',centros:'Centros y grupos',historial:'Historial de clases'}[page];$('#content').innerHTML=activeSession?sessionView():({agenda:agenda,coreos:catalog,centros:centersView,historial:history}[page])()}
function agenda(){let ds=new Date(selected+'T12:00:00');ds.setDate(ds.getDate()-((ds.getDay()+6)%7)+weekOffset*7);let days=Array.from({length:7},(_,i)=>{let d=new Date(ds);d.setDate(d.getDate()+i);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`});let sessions=db.sessions.filter(s=>s.date===selected).sort((a,b)=>a.start.localeCompare(b.start));return heading('UN NUEVO DÍA, UN NUEVO PASO','Tu semana, a buen ritmo','Planifica, enseña y disfruta. Todo lo demás, aquí.','session','Nueva clase')+`<div class="stats">${[['Clases esta semana',db.sessions.filter(s=>days.includes(s.date)).length,'En tu agenda','▦'],['Coreografías',db.coreos.length,'Pasos que cuentan historias','♫'],['Centros activos',db.centers.length,db.groups.length+' grupos con mucho ritmo','⌂'],['Clases realizadas',db.sessions.filter(s=>s.closed).length,'<span>✧</span> Sigue sumando momentos','✓']].map(x=>`<div class="stat"><div class="stat-top">${x[0]}<span class="stat-icon">${x[3]}</span></div><strong>${x[1]}</strong><small>${x[2]}</small></div>`).join('')}</div><div class="grid"><section class="panel"><div class="panel-head"><div><h2>Tu agenda</h2><p class="sub">Un vistazo a tus próximos pasos</p></div><div class="week-nav"><button data-week="-1" aria-label="Semana anterior">‹</button>${dateLabel(days[0])}<button data-week="1" aria-label="Semana siguiente">›</button></div></div><div class="week">${days.map((d,i)=>`<button class="day ${d===selected?'selected':''}" data-date="${d}">${['LUN','MAR','MIÉ','JUE','VIE','SÁB','DOM'][i]}<b>${Number(d.slice(-2))}</b><i style="opacity:${db.sessions.some(s=>s.date===d)?1:0}"></i></button>`).join('')}</div><div class="day-label"><span>${selected===today()?'HOY · ':''}${dateLabel(selected).toUpperCase()}</span><span>${sessions.length} CLASES</span></div>${sessions.map(sessionCard).join('')||'<div class="empty">Un día para coger aire.<br><br> Añade una clase para empezar a planificar.</div>'}<p class="bottom-note" style="padding-bottom:22px">✧ Un buen plan deja espacio para improvisar.</p></section><div class="side-stack"><div class="feature"><span class="decoration">♫</span><div class="eyebrow">TU PRÓXIMA CLASE</div><h2>Menos improvisar.<br>Más disfrutar.</h2><p>Prepara las coreos de tu próxima sesión y llega con todo a punto.</p><button class="button" data-action="session">Preparar una clase ↗</button></div><section class="panel"><div class="panel-head"><h3>En tu repertorio</h3><button class="text-button" data-page="coreos">Ver todas →</button></div><div class="recent">${db.coreos.slice(-3).reverse().map(c=>`<div class="mini"><div class="music-icon">♫</div><div><strong>${esc(c.name)}</strong><small>${esc(c.level)} · ${c.counts?esc(c.counts)+' counts':'Counts pendientes'}</small></div><button class="text-button arrow" data-edit-coreo="${c.id}">↗</button></div>`).join('')}</div></section><p class="sub" style="font-size:10px;padding:0 8px">◉ Datos de ejemplo para explorar tu estudio. Puedes editarlos y crear tus propios centros y clases.</p></div></div>`}
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
function catalog(){return heading('EL REPERTORIO','Cada coreo, en su sitio','Tus pasos, tu música y todos los recursos para enseñarlos.','coreo','Nueva coreografía')+`<div class="toolbar"><button class="button secondary" data-action="import-csv">↥ Importar CSV</button><input id="search" value="${esc(catalogFilters.query)}" placeholder="Buscar una coreografía…" aria-label="Buscar coreografía">${['level','walls','counts'].map(filterMenu).join('')}<button class="text-button" data-action="clear-filters">Limpiar filtros</button></div><p class="sub catalog-help">Puedes elegir varios valores en cada filtro. Sin seleccionar ninguno, se muestran todos.</p><p id="catalog-count" class="sub history-count" role="status">${filteredCoreos().length} de ${db.coreos.length} coreografías · Ordenadas por nombre</p><div class="cards" id="coreo-cards">${coreoCards()}</div>`}
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
function first(c,gid){return db.sessions.filter(s=>(!gid||s.group===gid)&&s.items.some(i=>i.coreo===c&&i.done&&i.mode==='Nueva')).map(s=>s.date).sort()[0]}function coreoCards(){return filteredCoreos().map(c=>`<article class="card"><span class="tag">${esc(c.level)}</span><h3>${esc(c.name)}</h3><p>${esc(c.author)||'Autor pendiente'}<br>${c.walls?esc(c.walls)+' paredes':'Paredes pendientes'} · ${c.counts?esc(c.counts)+' counts':'Counts pendientes'}</p>${coreoExtras(c)}${CompasMusic.markup(c)}<small>${first(c.id)?'Primera enseñanza: '+dateLabel(first(c.id)):'Sin primera enseñanza registrada'}</small>${teachingReachMarkup(c.id)}<div class="card-actions">${[['music','♫ Música'],['video','▷ Vídeo'],['sheet','↗ Hoja']].filter(([k])=>safeUrl(c[k])).map(([k,t])=>`<a target="_blank" rel="noopener" href="${esc(safeUrl(c[k]))}">${t}</a>`).join('')}</div><div class="card-actions"><button class="button secondary" data-edit-coreo="${c.id}">Editar coreografía</button><button class="text-button" data-delete-coreo="${c.id}">Eliminar</button></div></article>`).join('')||(db.coreos.length?'<div class="empty">No hay coincidencias. Cambia o limpia los filtros para ver más coreografías.</div>':'<div class="empty">No hay coreografías. Añade tu primer baile.</div>')}function safeUrl(v){try{let u=new URL(v);return ['https:','http:'].includes(u.protocol)?u.href:''}catch{return ''}}
function centersView(){return heading('LOS LUGARES DONDE BAILAMOS','Centros y grupos','Un espacio para cada centro. Un ritmo para cada grupo.','center','Nuevo centro')+`<div class="cards">${db.centers.map(c=>`<article class="card"><div class="center-photo" ${safeUrl(c.photo)?`style="background-image:url('${esc(safeUrl(c.photo))}')"`:''}>${safeUrl(c.photo)?'':'⌂'}</div><h3>${esc(c.name)}</h3><p>${esc(c.address)}<br>${esc(c.email)||'Correo pendiente'}<br>${esc(c.phone)||'Teléfono pendiente'}</p>${db.groups.filter(g=>g.center===c.id).map(g=>`<div class="group"><span class="tag">${esc(g.level)}</span><button class="text-button" data-edit-group="${g.id}">Editar</button><p class="sub">${esc(g.day)} · ${esc(g.start)}–${esc(g.end)}<br>${g.total} clases por trimestre</p>${safeUrl(g.whatsapp)?`<a class="text-button" href="${esc(safeUrl(g.whatsapp))}" target="_blank" rel="noopener">Abrir grupo de WhatsApp ↗</a>`:''}</div>`).join('')}<div class="card-actions"><button class="button secondary" data-edit-center="${c.id}">Editar centro</button><button class="text-button" data-add-group="${c.id}">＋ Grupo</button><button class="text-button danger-text" data-delete-center="${c.id}">Eliminar centro</button></div></article>`).join('')}</div>`}
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
    db = {...db, centers:db.centers.filter(c => c.id !== id), groups:db.groups.filter(g => !groupIds.has(g.id)), sessions:db.sessions.filter(s => !groupIds.has(s.group))};
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
function sessionView(){let s=db.sessions.find(s=>s.id===activeSession),g=group(s.group),c=center(g.center),n=db.sessions.filter(x=>x.group===g.id&&x.term===s.term&&x.closed).length;return `<div class="detail-top"><button class="button secondary" data-back>← Volver</button><span class="tag ${s.closed?'green':''}">${s.closed?'Clase realizada':'En preparación'}</span></div>`+heading(esc(g.level).toUpperCase(),esc(c.name),`${dateLabel(s.date)} ${s.date.slice(0,4)} · ${esc(s.start)}–${esc(s.end)} · ${esc(s.term)} · ${n}/${g.total} clases realizadas`)+previousClassBanner(s)+`<div class="panel"><div class="panel-head"><div><h2>El baile de hoy</h2><p class="sub">Pulsa para cambiar: sin marcar → azul (planeada) → verde (realizada) → sin marcar.</p></div><button class="button secondary" data-action="add-routine">＋ Coreografía</button></div><div class="session-selection"><div class="session-selection-buttons"><button class="button secondary" data-bulk-state="planned" ${!s.items.some(i=>routineState(i)==='none')?'disabled':''}>Planear todas</button><button class="button secondary" data-bulk-state="done" ${!s.items.some(i=>!i.done)?'disabled':''}>Todas realizadas</button><button class="button secondary" data-bulk-state="none" ${!s.items.some(i=>routineState(i)!=='none')?'disabled':''}>Desmarcar todas</button></div><span class="sub" role="status">${s.items.filter(i=>routineState(i)==='planned').length} planeadas pendientes · ${s.items.filter(i=>i.done).length} realizadas · ${s.items.length} en la lista</span></div>${sortedSessionItems(s.items).map(({item:i,index})=>`<div class="routine-row">${routineStateButton(i,index)}<div class="routine-main"><strong>${esc(coreo(i.coreo)?.name)}</strong><small>${first(i.coreo,g.id)?'Primera enseñanza al grupo: '+dateLabel(first(i.coreo,g.id)):'Sin enseñanza previa registrada en este grupo'}</small>${lastCoreoActivityMarkup(i.coreo,s)}${classCoreoResources(coreo(i.coreo))}</div><div class="routine-controls"><select data-mode="${index}" aria-label="Tipo de práctica">${['Nueva','Repaso','Bailar'].map(m=>`<option ${i.mode===m?'selected':''}>${m}</option>`).join('')}</select><input data-note="${index}" placeholder="Notas, dificultad…" aria-label="Notas de la coreografía" value="${esc(i.note)}"><button class="text-button" data-remove="${index}" aria-label="Quitar del plan">✕</button></div></div>`).join('')||'<div class="empty">Añade coreografías antes o durante la clase.</div>'}</div><div class="card-actions"><button class="button" data-finish>${s.closed?'Reabrir clase':'Finalizar clase'} ✓</button><button class="button secondary" data-share>Compartir resumen ↗</button><button class="text-button" data-edit-session="${s.id}">Editar fecha y grupo</button><button class="text-button" data-delete-session="${s.id}">Eliminar clase</button></div>`}
function field(k,label,value='',type='text',required=false){return `<label for="f-${k}">${label}</label><input id="f-${k}" name="${k}" type="${type}" value="${esc(value)}" ${required?'required':''} ${type==='number'?'min="1" max="999"':''}>`}function select(k,label,options,value){return `<label for="f-${k}">${label}</label><select id="f-${k}" name="${k}">${options.map(o=>{let [v,t]=Array.isArray(o)?o:[o,o];return `<option value="${esc(v)}" ${v===value?'selected':''}>${esc(t)}</option>`}).join('')}</select>`}function modal(title,html,submit){$('#form button[type="submit"]').textContent='Guardar';$('#form button[type="submit"]').disabled=false;$('#modal-title').textContent=title;$('#fields').innerHTML=html;$('#form').onsubmit=e=>{e.preventDefault();let values=Object.fromEntries(new FormData(e.target));submit(values);save();$('#modal').close();render();toast('Cambios guardados')};$('#modal').showModal()}
function editCoreo(id){if(typeof extrasEditorMarkup!=='function'||typeof mountExtrasEditor!=='function'){toast('No se ha cargado el editor. Recarga la página para editar sin perder el formato.');return;}let c=coreo(id)||{};modal(id?'Editar coreografía':'Nueva coreografía',field('name','Nombre',c.name,'text',true)+field('author','Coreógrafo/a',c.author)+select('level','Nivel',['Sin definir',...levels],c.level)+`<div class="form-grid"><div>${field('walls','Paredes',c.walls??4,'number')}</div><div>${field('counts','Counts',c.counts??32,'number')}</div></div>`+extrasEditorMarkup(c.extras)+field('music','Enlace a música',c.music,'url')+field('video','Enlace a vídeo',c.video,'url')+field('sheet','Enlace a hoja de pasos',c.sheet,'url'),v=>{if(id)Object.assign(c,v);else db.coreos.push({id:uid(),...v})});mountExtrasEditor();}function editCenter(id){let c=center(id)||{};modal(id?'Editar centro':'Nuevo centro',field('name','Nombre',c.name,'text',true)+field('address','Dirección',c.address,'text',true)+field('email','Correo',c.email,'email')+field('phone','Teléfono',c.phone,'tel')+field('photo','URL de la foto',c.photo,'url'),v=>{if(id)Object.assign(c,v);else db.centers.push({id:uid(),...v})})}function editGroup(cid,id){let g=group(id)||{};modal(id?'Editar grupo':'Nuevo grupo',select('level','Nivel',levels,g.level)+select('day','Día habitual',['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'],g.day)+`<div class="form-grid"><div>${field('start','Hora de inicio',g.start||'19:30','time',true)}</div><div>${field('end','Hora de fin',g.end||'20:30','time',true)}</div></div>`+field('total','Clases previstas por trimestre',g.total||8,'number',true)+field('whatsapp','Enlace al grupo de WhatsApp',g.whatsapp,'url')+select('whatsappGroupId','Grupo para enviar los resúmenes', [['','Sin grupo asignado'],...(g.whatsappGroupId?[[g.whatsappGroupId,g.whatsappGroupName||g.whatsappGroupId]]:[])],g.whatsappGroupId||'')+'<p id="course-whatsapp-status" class="sub csv-help" role="status"></p><button type="button" class="text-button" id="course-whatsapp-reload">Actualizar grupos de WhatsApp</button>',v=>{v.whatsappGroupName=v.whatsappGroupId===g.whatsappGroupId?(g.whatsappGroupName||v.whatsappGroupId):v.whatsappGroupId?$('#f-whatsappGroupId').selectedOptions[0].textContent.split(' · ')[0]:'';if(id)Object.assign(g,v);else db.groups.push({id:uid(),center:cid,...v})});
  const picker=$('#f-whatsappGroupId'), status=$('#course-whatsapp-status'), reload=$('#course-whatsapp-reload');
  async function loadCourseGroups(){
    reload.disabled=true;
    // Keep the selected destination if the service is unavailable.
    const savedId=picker.value;
    try{await loadWhatsappGroups(picker,status,savedId,()=>{}, {preserveSaved:true,savedName:g.whatsappGroupName,emptyLabel:'Sin grupo asignado',help:'Guarda el curso para usar este grupo automáticamente en sus resúmenes.'});}
    finally{picker.disabled=false;reload.disabled=false;}
  }
  reload.onclick=loadCourseGroups;
  loadCourseGroups();
}
function editSession(id){if(!db.groups.length){toast('Crea un centro y un grupo primero');go('centros');return}let s=db.sessions.find(x=>x.id===id)||{},g=group(s.group)||db.groups[0];modal(id?'Editar clase':'Planificar una clase',select('group','Centro y nivel',db.groups.map(g=>[g.id,center(g.center).name+' · '+g.level]),g.id)+field('date','Fecha',s.date||selected,'date',true)+`<div class="form-grid"><div>${field('start','Inicio',s.start||g.start,'time',true)}</div><div>${field('end','Fin',s.end||g.end,'time',true)}</div></div>`+field('term','Trimestre',s.term||'Otoño 2026','text',true),v=>{if(id)Object.assign(s,v);else{let newId=uid();db.sessions.push({id:newId,...v,closed:false,items:[]});activeSession=newId}});$('#f-group').onchange=e=>{let g=group(e.target.value);$('#f-start').value=g.start;$('#f-end').value=g.end}}
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
  reloadGroups();
  update();
}

document.addEventListener('click',e=>{let b=e.target.closest('button,[data-open]');if(!b)return;let d=b.dataset;if(d.page)go(d.page);else if(d.action)({coreo:editCoreo,center:editCenter,session:editSession,'add-routine':addRoutine,'import-csv':importCsv,'clear-filters':clearCatalogFilters,'import-previous':importPreviousClass}[d.action])();else if(d.date){selected=d.date;weekOffset=0;render()}else if(d.week){weekOffset+=Number(d.week);render()}else if(d.open){activeSession=d.open;render()}else if('back'in d){activeSession=null;render()}else if(d.editCoreo)editCoreo(d.editCoreo);else if(d.editCenter)editCenter(d.editCenter);else if(d.deleteCenter)deleteCenter(d.deleteCenter);else if(d.addGroup)editGroup(d.addGroup);else if(d.editGroup)editGroup(null,d.editGroup);else if(d.editSession)editSession(d.editSession);else if(d.deleteCoreo){if(db.sessions.some(s=>s.items.some(i=>i.coreo===d.deleteCoreo)))toast('Esta coreografía tiene clases asociadas. Conservamos su historial.');else if(confirm('¿Eliminar esta coreografía?')){db.coreos=db.coreos.filter(c=>c.id!==d.deleteCoreo);save();render()}}else if(d.deleteSession){if(confirm('¿Eliminar esta clase y su registro?')){db.sessions=db.sessions.filter(s=>s.id!==d.deleteSession);activeSession=null;save();render()}}else if('cycleState'in d){cycleSessionState(Number(d.cycleState))}else if(d.bulkState){const items=db.sessions.find(s=>s.id===activeSession).items;setSessionStates(items.map((i,index)=>index).filter(index=>d.bulkState!=='planned'||routineState(items[index])==='none'),d.bulkState)}else if('remove'in d){db.sessions.find(s=>s.id===activeSession).items.splice(Number(d.remove),1);save();render()}else if('finish'in d){let s=db.sessions.find(s=>s.id===activeSession);s.closed=!s.closed;save();render();toast(s.closed?'Clase finalizada. ¡Un paso más!':'Clase reabierta')}else if('share'in d)share()});
document.addEventListener('change',e=>{let d=e.target.dataset,s=db.sessions.find(s=>s.id===activeSession);if(d.catalogFilter){catalogFilters[d.catalogFilter]=[...document.querySelectorAll('[data-catalog-filter="'+d.catalogFilter+'"]:checked')].map(input=>input.value);refreshCatalog();}if('mode'in d){s.items[d.mode].mode=e.target.value;save();render()}});document.addEventListener('input',e=>{if(e.target.id==='search'){catalogFilters.query=e.target.value;refreshCatalog();}if('note'in e.target.dataset){db.sessions.find(s=>s.id===activeSession).items[e.target.dataset.note].note=e.target.value;save()}});$('#close').onclick=$('#cancel').onclick=()=>$('#modal').close();$('#export').onclick=()=>{let blob=new Blob([JSON.stringify(db,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='compas-copia-'+today()+'.json';a.click();URL.revokeObjectURL(a.href);toast('Copia de seguridad exportada')};document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.matches('.history-row')){activeSession=e.target.dataset.open;render()}});render();
