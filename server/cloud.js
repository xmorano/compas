// Cloud bootstrap is loaded before the existing application scripts.
window.COMPAS_CLOUD = true;
window.COMPAS_INITIAL_DATA = null;
let cloudUser, cloudCsrf, cloudVersion=0, cloudPending=null, cloudBusy=false, cloudTimer, cloudFailure=null;
const cloudEl = id => document.getElementById(id);
const cloudEscape = value => String(value ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function cloudApi(action, body, params={}) {
  const controller=new AbortController(), timer=setTimeout(()=>controller.abort(),20000);
  let response;
  try { response=await fetch('api/index.php?action='+encodeURIComponent(action)+'&'+new URLSearchParams(params), {signal:controller.signal, credentials:'same-origin', cache:'no-store', method:body===undefined?'GET':'POST', headers:body===undefined?{}:{'Content-Type':'application/json','X-CSRF-Token':cloudCsrf}, ...(body===undefined?{}:{body:JSON.stringify(body)})}); }
  catch(error){throw new Error(error.name==='AbortError'?'El servidor ha tardado demasiado. El guardado puede no estar confirmado.':'No se pudo conectar con el servidor. Comprueba tu conexión.');}
  finally{clearTimeout(timer);}
  let data;
  try {data=await response.json();} catch {throw new Error('El servidor no devolvió una respuesta válida.');}
  if(!response.ok){const error=new Error(data.error||'No se pudo completar la operación.');error.status=response.status;throw error;}
  if(data.csrf)cloudCsrf=data.csrf;
  return data;
}
function cloudStatus(message, error=false) {
  document.querySelector('.saved').textContent=message;
  const banner=cloudEl('cloud-warning');
  banner.hidden=!error;
  if(error)cloudEl('cloud-warning-text').textContent=message;
}
const cloudCacheKey=()=> 'compas-pending-'+cloudUser.id;
window.cloudSave = data => {
  const snapshot=JSON.stringify(data);
  localStorage.setItem(cloudCacheKey(),JSON.stringify({version:cloudVersion,data:JSON.parse(snapshot)}));
  cloudPending=snapshot;
  cloudStatus(cloudFailure ? cloudFailure.message : '● Cambios pendientes de guardar',!!cloudFailure);
  clearTimeout(cloudTimer);
  if(!cloudFailure)cloudTimer=setTimeout(cloudFlush,400);
};
async function cloudFlush() {
  if(cloudBusy||!cloudPending||cloudFailure)return;
  cloudBusy=true;
  const snapshot=cloudPending;
  cloudStatus('● Guardando en tu cuenta…');
  try {
    const result=await cloudApi('workspace',{version:cloudVersion,data:JSON.parse(snapshot)});
    cloudVersion=result.version;
    if(cloudPending===snapshot){cloudPending=null;localStorage.removeItem(cloudCacheKey());cloudStatus('● Guardado en tu cuenta');}
    else localStorage.setItem(cloudCacheKey(),JSON.stringify({version:cloudVersion,data:JSON.parse(cloudPending)}));
  } catch(error) {cloudFailure=error;cloudStatus(error.message,true);}
  finally {cloudBusy=false;if(cloudPending&&!cloudFailure)cloudFlush();}
}
window.addEventListener('beforeunload',event=>{if(cloudPending||cloudBusy){event.preventDefault();event.returnValue='';}});
window.addEventListener('online',()=>{if(cloudFailure && ![409,401,403,400].includes(cloudFailure.status)){cloudFailure=null;cloudFlush();}});
function cloudShowAuth(mode, token='') {
  const title={login:'Tu estudio, contigo',setup:'Crea tu cuenta de administrador',claim:'Activa tu acceso'}[mode];
  cloudEl('auth').hidden=false;
  cloudEl('auth').innerHTML=`<div class="auth-card"><div class="eyebrow">COMPÁS · LINE DANCE</div><h1>${title}</h1><p class="sub">Organiza tus clases en tu espacio privado.</p><form id="auth-form">${mode!=='login'?'<label for="auth-name">Tu nombre</label><input id="auth-name" name="name" maxlength="120" required autocomplete="name">':''}${mode!=='claim'?'<label for="auth-email">Correo</label><input id="auth-email" name="email" type="email" required autocomplete="username">':''}<label for="auth-password">Contraseña ${mode==='login'?'':'(mínimo 12 caracteres)'}</label><input id="auth-password" name="password" type="password" required ${mode==='login'?'':'minlength="12"'} maxlength="72" autocomplete="${mode==='login'?'current-password':'new-password'}">${mode==='setup'?'<label for="auth-key">Clave de instalación</label><input id="auth-key" name="setup_key" type="password" required autocomplete="off">':''}<p id="auth-error" class="csv-errors" role="alert" hidden></p><button class="button" type="submit">${mode==='login'?'Entrar':'Guardar y entrar'}</button></form><p class="sub csv-help">Acceso por invitación. Si has olvidado la contraseña, solicita un enlace de recuperación al administrador.</p></div>`;
  if(mode==='claim')cloudEl('auth-name').value=new URLSearchParams(location.hash.slice(1)).get('nombre')||'';
  cloudEl('auth-form').onsubmit=async event=>{
    event.preventDefault();const button=event.target.querySelector('button');button.disabled=true;
    try {const values=Object.fromEntries(new FormData(event.target));if(token)values.token=token;const result=await cloudApi(mode,values);cloudUser=result.user;history.replaceState(null,'',location.pathname);await cloudOpen();}
    catch(error){cloudEl('auth').hidden=false;cloudEl('auth-error').hidden=false;cloudEl('auth-error').textContent=error.message;}
    finally{button.disabled=false;}
  };
}
async function cloudLoadScript(src){return new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=src;script.onload=resolve;script.onerror=()=>reject(new Error('No se pudo cargar '+src));document.body.append(script);});}
async function cloudOpen(){
  const workspace=await cloudApi('workspace');cloudVersion=workspace.version;
  window.COMPAS_INITIAL_DATA=workspace.data;
  let cached;
  try{cached=JSON.parse(localStorage.getItem(cloudCacheKey()));}catch{}
  cloudEl('auth').hidden=true;
  document.querySelector('aside').hidden=false;document.querySelector('main').hidden=false;
  document.querySelector('.profile-name').textContent=cloudUser.name;
  document.querySelector('.header-profile').title=cloudUser.name+' · '+cloudUser.email;
  document.querySelector('.profile-role').textContent=cloudUser.role==='admin'?'Administrador':'Profesor';
  document.querySelector('.header-profile b').textContent=[...cloudUser.name.trim()][0]?.toLocaleUpperCase('es')||'P';
  if(!window.COMPAS_LOADED){
    for(const src of ['whatsapp.js','previous-class.js','app.js','csv.js'])await cloudLoadScript(src);
    window.COMPAS_LOADED=true;
  }
  cloudStatus('● Guardado en tu cuenta');
  cloudEl('cloud-account').onclick=cloudAccount;
  cloudConfigureNavigation();
  cloudStartNotifications();
  cloudRefreshCoreoStates();
  cloudEl('cloud-retry').onclick=()=>{
    if(cloudFailure && [409,401,403].includes(cloudFailure.status)){alert('Descarga primero tus cambios con el botón de copia y recarga la página.');return;}
    cloudFailure=null;cloudFlush();
  };
  cloudEl('cloud-backup').onclick=()=>document.getElementById('export').click();
  if(cached?.data){
    const recover=confirm('Hay cambios pendientes de una sesión anterior en este navegador. ¿Quieres recuperarlos? Si cancelas, conservarás lo guardado online.');
    if(recover){db=cached.data;cloudVersion=cached.version;cloudPending=JSON.stringify(db);render();if(cached.version!==workspace.version){cloudFailure=Object.assign(new Error('Tu copia pendiente y los datos online tienen versiones diferentes. Descarga la copia pendiente antes de recargar.'),{status:409});cloudStatus(cloudFailure.message,true);}else cloudFlush();}
    else localStorage.removeItem(cloudCacheKey());
  }
}
function cloudConfigureNavigation(){
  cloudEl('cloud-admin')?.remove();
  if(cloudUser.role!=='admin')return;
  const button=document.createElement('button');
  button.id='cloud-admin';button.type='button';
  button.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 3 8 4v5c0 5-8 9-8 9s-8-4-8-9V7z"/><path d="m8 12 3 3 5-6"/></svg><span>Administración</span>';
  button.onclick=cloudAdministration;
  document.querySelector('aside nav').append(button);
}
function cloudAccount(){cloudSettings(false);}
function cloudAdministration(){if(cloudUser.role==='admin')cloudSettings(true);}
function cloudSettings(administration){
  const admin=cloudUser.role==='admin';
  const icon=path=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
  const icons={
    password:icon('<rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/>'),
    import:icon('<path d="M12 3v12m-4-4 4 4 4-4M5 15v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4"/>'),
    users:icon('<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 5"/>'),
    library:icon('<path d="M4 4h6v16H4zM14 5l5-1 3 15-5 1zM4 8h6M4 16h6"/>'),
    suggestions:icon('<path d="M21 11a8 8 0 0 1-8 8H7l-5 3 2-6a8 8 0 1 1 17-5Z"/><path d="M8 10h8m-8 4h5"/>')
  };
  const action=(id,key,title,description)=>`<button type="button" class="account-action" id="account-${id}"><span class="account-action-icon">${icons[key]}</span><span class="account-action-copy"><strong>${title}</strong><small>${description}</small></span><span class="account-action-arrow" aria-hidden="true">↗</span></button>`;
  modal(administration?'Administración':'Mi cuenta',`<div class="account-panel">
    <section class="account-profile" aria-label="Tu perfil"><div class="account-avatar" aria-hidden="true">${cloudEscape([...cloudUser.name.trim()][0]?.toLocaleUpperCase('es')||'P')}</div><div class="account-identity"><span class="account-role">${admin?'Administrador':'Profesor'}</span><h3>${cloudEscape(cloudUser.name)}</h3><p>${cloudEscape(cloudUser.email)}</p></div><span class="account-profile-mark" aria-hidden="true">✧</span></section>
    ${!administration?`<section class="account-section" aria-labelledby="account-personal-title"><div class="account-section-heading"><h3 id="account-personal-title">Tu espacio</h3><p>Todo listo para seguir a tu ritmo.</p></div><div class="account-action-grid">
      ${action('password','password','Contraseña','Actualiza tu acceso a Compás.')}
      ${action('import','import','Importar una copia','Recupera tus datos desde un archivo JSON.')}
      ${!admin?action('suggestions','suggestions','Propuestas al catálogo','Comparte una coreo y consulta tus propuestas.'):''}
    </div></section>`:''}
    ${administration&&admin?`<section class="account-section" aria-labelledby="account-admin-title"><div class="account-section-heading"><h3 id="account-admin-title">Administración</h3><p>Profesores y repertorio, en un mismo sitio.</p></div><div class="account-action-grid">
      ${action('users','users','Profesores e invitaciones','Invita y consulta los espacios de los profesores.')}
      ${action('library','library','Catálogo común','Publica coreografías para todos los profesores.')}
      ${action('suggestions','suggestions','Propuestas de profesores','Revisa las coreos que quieren compartir.')}
    </div></section>`:''}
    <div class="account-bottom">${!administration?'<button type="button" class="account-logout" id="account-logout">Cerrar sesión <span aria-hidden="true">↗</span></button>':''}<button type="button" class="button secondary" id="account-done">Volver a mi estudio</button></div>
  </div>`,()=>{});
  document.querySelector('#form button[type="submit"]').hidden=false;
  document.getElementById('form').onsubmit=event=>event.preventDefault();
  cloudEl('account-done').onclick=()=>document.getElementById('modal').close();
  if(!administration)cloudEl('account-import').onclick=()=>{document.getElementById('modal').close();cloudImport();};
  if(!administration)cloudEl('account-password').onclick=()=>{document.getElementById('modal').close();cloudPassword();};
  if(administration)cloudEl('account-users').onclick=()=>{document.getElementById('modal').close();cloudInvites();};
  if(administration)cloudEl('account-library').onclick=()=>{document.getElementById('modal').close();cloudPublishLibrary();};
  if(cloudEl('account-suggestions'))cloudEl('account-suggestions').onclick=()=>{document.getElementById('modal').close();cloudSuggestions();};
  if(!administration)cloudEl('account-logout').onclick=async()=>{
    if(cloudPending||cloudBusy){alert('Hay cambios pendientes. Espera a que se guarden o descarga una copia antes de recargar y cerrar sesión.');return;}
    try{await cloudApi('logout',{});location.reload();}catch(error){toast(error.message);}
  };
}
function cloudDialog(title,html,handler,label='Guardar'){
  modal(title,html+'<p id="account-error" class="csv-errors" role="alert" hidden></p>',()=>{});
  const submit=document.querySelector('#form button[type="submit"]');submit.hidden=false;submit.textContent=label;
  document.getElementById('form').onsubmit=async event=>{
    event.preventDefault();if(submit.disabled)return;submit.disabled=true;
    const dialog=document.getElementById('modal'),close=document.getElementById('close'),cancel=document.getElementById('cancel'),preventClose=e=>e.preventDefault();
    close.disabled=cancel.disabled=true;dialog.addEventListener('cancel',preventClose);
    try{await handler(Object.fromEntries(new FormData(event.target)));}
    catch(error){const target=cloudEl('account-error');if(target){target.hidden=false;target.textContent=error.message;}}
    finally{submit.disabled=false;close.disabled=cancel.disabled=false;dialog.removeEventListener('cancel',preventClose);}
  };
}
function cloudPassword(){cloudDialog('Cambiar contraseña',field('current_password','Contraseña actual','','password',true)+field('password','Nueva contraseña (mínimo 12 caracteres)','','password',true),async values=>{await cloudApi('password',values);document.getElementById('modal').close();toast('Contraseña actualizada');});}
function cloudImport(){
  cloudDialog('Importar copia de seguridad','<p class="sub">La copia reemplaza los datos de tu cuenta. Descarga primero una copia de tus datos actuales. Se conservarán los centros, cursos, coreografías e historial del archivo.</p><label for="account-file">Copia JSON de Compás (máximo 4 MB)</label><input id="account-file" type="file" accept=".json,application/json" required><p id="import-info" class="sub" role="status"></p><label class="share-option"><input name="confirm" type="checkbox" required><span>Quiero reemplazar los datos de mi cuenta por esta copia.</span></label>',async()=>{
    if(cloudPending||cloudBusy)throw new Error('Espera a que se guarden los cambios pendientes antes de importar.');
    const file=cloudEl('account-file').files[0];if(!file||file.size>4*1024*1024)throw new Error('Elige una copia JSON de hasta 4 MB.');
    const data=JSON.parse(await file.text());
    const result=await cloudApi('workspace',{version:cloudVersion,data});cloudVersion=result.version;db=data;render();document.getElementById('modal').close();cloudStatus('● Guardado en tu cuenta');toast('Copia importada');
  },'Importar y reemplazar');
  cloudEl('account-file').onchange=async()=>{try{const file=cloudEl('account-file').files[0];if(!file||file.size>4*1024*1024)throw Error();const data=JSON.parse(await file.text());if(!['centers','groups','coreos','sessions'].every(k=>Array.isArray(data[k])))throw Error();cloudEl('import-info').textContent=`${data.centers.length} centros · ${data.groups.length} cursos · ${data.coreos.length} coreografías · ${data.sessions.length} clases`;}catch{cloudEl('import-info').textContent='El archivo no parece una copia válida de Compás.';}};
}
async function cloudInvites(){
  cloudDialog('Profesores e invitaciones',field('name','Nombre del profesor','','text',true)+field('email','Correo del profesor','','email',true)+select('kind','Tipo de enlace',[['invite','Invitar a un nuevo profesor'],['reset','Recuperar acceso de un profesor existente']],'invite')+'<p class="sub csv-help">El enlace caduca en 48 horas y solo sirve una vez. El profesor recibirá un correo para crear su contraseña. Si el envío falla, podrás copiar el enlace y compartirlo en privado.</p><label for="invite-link">Enlace generado</label><input id="invite-link" readonly><p id="invite-status" role="status"></p><div id="account-user-list" class="sub"></div>',async values=>{const result=await cloudApi('invite',values);cloudEl('invite-link').value=result.link;cloudEl('invite-link').select();cloudEl('invite-status').textContent=result.message;},'Crear enlace');
  const target=cloudEl('account-user-list');
  try{const result=await cloudApi('users');if(target.isConnected)target.innerHTML='<p>Profesores registrados</p>'+result.users.map(u=>`<p>${cloudEscape(u.name)} · ${cloudEscape(u.email)} (${cloudEscape(u.role)}) <button type="button" class="text-button" data-inspect-user="${cloudEscape(u.id)}">Ver recursos</button></p>`).join('');}catch(error){if(target.isConnected)target.textContent=error.message;}
  target.onclick=event=>{const button=event.target.closest('[data-inspect-user]');if(button){document.getElementById('modal').close();cloudInspectTeacher(button.dataset.inspectUser);}};
}
(async()=>{try{
  const data=await cloudApi('bootstrap');cloudUser=data.user;
  const token=new URLSearchParams(location.hash.slice(1)).get('acceso');
  if(token){if(cloudUser){await cloudApi('logout',{});await cloudApi('bootstrap');}cloudShowAuth('claim',token);}
  else if(cloudUser)await cloudOpen();else cloudShowAuth(data.needsSetup?'setup':'login');
}catch(error){cloudEl('auth').hidden=false;cloudEl('auth').innerHTML='<div class="auth-card"><h1>No se pudo abrir Compás</h1><p>'+cloudEscape(error.message)+'</p><button class="button" onclick="location.reload()">Reintentar</button></div>';}})();

function libraryCopies(catalog, selectedIds, own) {
  const ids=new Set(selectedIds), sources=new Set(own.map(c=>c.libraryId).filter(Boolean));
  const normalize=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es').trim().replace(/\s+/g,' ');
  const names=new Set(own.map(c=>normalize(c.name)));
  return catalog.filter(c=>{
    if(!ids.has(c.id)||sources.has(c.id)||names.has(normalize(c.name)))return false;
    sources.add(c.id);names.add(normalize(c.name));return true;
  }).map(c=>({...c,id:crypto.randomUUID(),libraryId:c.id}));
}
async function cloudLibrary(onlyNew=false){
  cloudDialog('Catálogo común',`<p class="sub">Copia coreografías a tu lista privada. Si ignoras una novedad, no volverá a avisarte hasta que se comparta de nuevo. Siempre podrás encontrarla desactivando el filtro de novedades.</p><label class="share-option"><input id="library-new" type="checkbox" ${onlyNew?'checked':''}><span>Solo coreografías nuevas</span></label><button type="button" class="text-button" id="library-seen">Marcar novedades como vistas</button><label for="library-search">Buscar por nombre</label><input id="library-search" type="search"><div class="card-actions"><button type="button" class="button secondary" id="library-all">Marcar todas</button><button type="button" class="button secondary" id="library-none">Desmarcar todas</button><button type="button" class="button secondary" id="library-ignore-all" disabled>Ignorar novedades visibles</button></div><div id="library-list" class="share-list">Cargando…</div><p id="library-count" class="sub" role="status"></p>`,async()=>{
    const copies=libraryCopies(catalog,[...selected],db.coreos);
    if(!copies.length)throw new Error('Selecciona alguna coreografía que no esté en tu lista.');
    const previous=db.coreos;db.coreos=[...previous,...copies];
    try{save();}catch(error){db.coreos=previous;throw error;}
    document.getElementById('modal').close();render();toast(copies.length+' coreografías copiadas a tu lista');
    try{await acknowledge('library-seen',copies.map(c=>c.libraryId));}catch(error){toast('Copias preparadas. No se pudo actualizar el aviso: '+error.message);}
  },'Copiar a mi lista');
  const target=cloudEl('library-list'),submit=document.querySelector('#form button[type="submit"]');submit.disabled=true;
  let catalog=[],selected=new Set(),unseen=new Set(),ackBusy=false;
  const versions=ids=>Object.fromEntries(catalog.filter(c=>ids.includes(c.id)).map(c=>[c.id,c.publicationVersion||0]));
  function visible(){return matchingRoutines(catalog,cloudEl('library-search').value).filter(c=>!cloudEl('library-new').checked||unseen.has(c.id));}
  function update(){
    const available=new Set(libraryCopies(catalog,catalog.map(c=>c.id),db.coreos).map(c=>c.libraryId));
    target.innerHTML=visible().map(c=>`<div class="library-entry"><label class="share-option"><input type="checkbox" value="${cloudEscape(c.id)}" ${available.has(c.id)?'':'disabled'} ${selected.has(c.id)?'checked':''}><span>${cloudEscape(c.name)}${unseen.has(c.id)?' · NUEVA':''}<small>${cloudEscape(c.level)} · ${cloudEscape(c.counts||'Counts pendientes')}${available.has(c.id)?'':' · Ya está en tu lista'}</small></span></label>${unseen.has(c.id)?`<button type="button" class="text-button library-ignore" data-ignore="${cloudEscape(c.id)}" aria-label="Ignorar ${cloudEscape(c.name)}" ${ackBusy?'disabled':''}>Ignorar</button>`:''}</div>`).join('')||'<div class="empty">No hay coreografías con estos filtros.</div>';
    cloudEl('library-count').textContent=selected.size+' seleccionadas';submit.disabled=!selected.size||ackBusy;
    cloudEl('library-ignore-all').disabled=ackBusy||!visible().some(c=>unseen.has(c.id));
    cloudEl('library-seen').disabled=ackBusy||!unseen.size;
  }
  async function acknowledge(action,ids){
    await cloudApi(action,{ids,versions:versions(ids)});
    if(target.isConnected){ids.forEach(id=>{unseen.delete(id);selected.delete(id);});update();}
    await cloudRefreshNotifications();
  }
  async function dismiss(action,ids){
    if(ackBusy||!ids.length)return;
    ackBusy=true;update();
    try{await acknowledge(action,ids);if(action==='library-ignore')toast(ids.length===1?'Coreografía ignorada hasta que se vuelva a compartir':'Novedades ignoradas hasta que se vuelvan a compartir');}
    catch(error){toast(error.message);}finally{ackBusy=false;if(target.isConnected)update();}
  }
  target.onchange=e=>{if(e.target.matches('input')){if(e.target.checked)selected.add(e.target.value);else selected.delete(e.target.value);update();}};
  target.onclick=event=>{const button=event.target.closest('[data-ignore]');if(button)dismiss('library-ignore',[button.dataset.ignore]);};
  cloudEl('library-search').oninput=update;
  cloudEl('library-new').onchange=()=>{selected.clear();update();};
  cloudEl('library-seen').onclick=()=>dismiss('library-seen',[...unseen]);
  cloudEl('library-ignore-all').onclick=()=>dismiss('library-ignore',visible().filter(c=>unseen.has(c.id)).map(c=>c.id));
  cloudEl('library-all').onclick=()=>{libraryCopies(visible(),visible().map(c=>c.id),db.coreos).forEach(c=>selected.add(c.libraryId));update();};
  cloudEl('library-none').onclick=()=>{selected.clear();update();};
  try{const result=await cloudApi('library');if(!target.isConnected)return;unseen=new Set(result.unseenIds);catalog=result.coreos.sort((a,b)=>a.name.localeCompare(b.name,'es',{sensitivity:'base',numeric:true}));update();}catch(error){if(target.isConnected)target.textContent=error.message;}
}
async function cloudPublishLibrary(){
  cloudDialog('Gestionar catálogo común','<p class="sub">Elige coreografías de tu catálogo privado para añadir o actualizar sus fichas públicas. Se comparten nombre, autor, nivel, paredes, counts y enlaces. Las copias que ya tienen otros profesores no se modifican.</p><div class="card-actions"><button type="button" class="button secondary" id="publish-all">Marcar todas</button><button type="button" class="button secondary" id="publish-none">Desmarcar todas</button></div><div id="publish-list" class="share-list"></div><label class="share-option"><input type="checkbox" required><span>Quiero publicar estas fichas para todos los profesores de Compás.</span></label><p id="publish-info" class="sub"></p>',async()=>{
    const ids=[...document.querySelectorAll('[data-publish]:checked')].map(b=>b.value);
    if(!ids.length)throw new Error('Selecciona al menos una coreografía.');
    const selection=db.coreos.filter(c=>ids.includes(c.id)).map(c=>{const {libraryId,publicationVersion,...copy}=c;copy.id=libraryId||c.id;return copy;});
    await cloudApi('library',{version:library.version,coreos:selection});document.getElementById('modal').close();toast('Catálogo común actualizado');await cloudRefreshCoreoStates();await cloudRefreshNotifications();
  },'Publicar selección');
  let library;
  const submit=document.querySelector('#form button[type="submit"]');submit.disabled=true;
  const target=cloudEl('publish-list');
  cloudEl('publish-all').onclick=()=>target.querySelectorAll('[data-publish]').forEach(input=>input.checked=true);
  cloudEl('publish-none').onclick=()=>target.querySelectorAll('[data-publish]').forEach(input=>input.checked=false);
  target.innerHTML=[...db.coreos].sort((a,b)=>a.name.localeCompare(b.name,'es')).map(c=>`<label class="share-option"><input type="checkbox" data-publish value="${cloudEscape(c.id)}"><span>${cloudEscape(c.name)}</span></label>`).join('')||'<p class="empty">Importa o crea coreografías en tu catálogo privado primero.</p>';
  try{library=await cloudApi('library');if(target.isConnected){cloudEl('publish-info').textContent=library.coreos.length+' coreografías en el catálogo común';submit.disabled=!db.coreos.length;}}catch(error){if(target.isConnected)cloudEl('publish-info').textContent=error.message;}
}

async function cloudInspectTeacher(id){
  cloudDialog('Recursos del profesor','<p class="sub">Consulta del administrador · Solo lectura</p><div id="teacher-resources" aria-live="polite">Cargando…</div>',async()=>{});
  document.querySelector('#form button[type="submit"]').hidden=true;
  const target=cloudEl('teacher-resources');
  try{
    const {user,data}=await cloudApi('teacher-workspace',undefined,{user_id:id});
    if(!target.isConnected)return;
    const e=cloudEscape, centers=new Map(data.centers.map(c=>[c.id,c])),groups=new Map(data.groups.map(g=>[g.id,g])),coreos=new Map(data.coreos.map(c=>[c.id,c]));
    const course=g=>g ? `${centers.get(g.center)?.name||''} · ${g.level}` : '';
    const section=(title,rows)=>`<details open><summary>${title} (${rows.length})</summary>${rows.join('')||'<p class="sub">Sin recursos</p>'}</details>`;
    target.innerHTML=`<h3>${e(user.name)}</h3><p class="sub">${e(user.email)}</p>`+
      section('Centros',data.centers.map(c=>`<p><strong>${e(c.name)}</strong><br>${e(c.address)}</p>`))+
      section('Cursos',data.groups.map(g=>`<p><strong>${e(course(g))}</strong><br>${e(g.day)} · ${e(g.start)}–${e(g.end)}</p>`))+
      section('Coreografías',data.coreos.map(c=>`<details><summary>${e(c.name)} · ${e(c.level)}</summary><p>${e(c.author)} · ${e(c.counts)} counts · ${e(c.walls)} paredes</p>${['music','video','sheet'].map(k=>{try{const url=new URL(c[k]);return ['https:','http:'].includes(url.protocol)?`<p><a href="${e(url.href)}" target="_blank" rel="noopener noreferrer">${{music:'Música',video:'Vídeo',sheet:'Hoja'}[k]}</a></p>`:'';}catch{return '';}}).join('')}<p>${e(c.extras)}</p></details>`))+
      section('Clases', [...data.sessions].sort((a,b)=>b.date.localeCompare(a.date)).map(s=>`<details><summary>${e(s.date)} · ${e(course(groups.get(s.group)))} · ${e(s.start)}–${e(s.end)} · ${s.closed?'Realizada':'Planificada'}</summary><p>${e(s.term)}</p>${s.items.map(i=>`<p>${e(coreos.get(i.coreo)?.name)} · ${e(i.mode)} · ${i.done?'Realizada':i.planned?'Planeada':'Pendiente'}<br>${e(i.note)}</p>`).join('')}</details>`));
  }catch(error){if(target.isConnected)target.textContent=error.message;}
}

let cloudNotificationTimer,cloudNotificationBusy=false;
function cloudStartNotifications(){
  if(!cloudEl('cloud-notifications')){
    const banner=document.createElement('div');banner.id='cloud-notifications';banner.className='cloud-notifications';banner.setAttribute('aria-live','polite');banner.hidden=true;
    cloudEl('cloud-warning').after(banner);
    banner.onclick=event=>{if(event.target.closest('[data-new-coreos]'))cloudLibrary(true);if(event.target.closest('[data-pending-suggestions]'))cloudSuggestions();};
  }
  clearInterval(cloudNotificationTimer);
  cloudRefreshNotifications();
  cloudNotificationTimer=setInterval(()=>{if(!document.hidden)cloudRefreshNotifications();},60000);
}
async function cloudRefreshNotifications(){
  if(cloudNotificationBusy)return;
  cloudNotificationBusy=true;
  try{
    const notices=await cloudApi('notifications'),banner=cloudEl('cloud-notifications');
    const newCoreos=cloudUser.role==='admin'?0:notices.newCoreos;
    const pendingSuggestions=cloudUser.role==='admin'?notices.pendingSuggestions:0;
    banner.innerHTML=(newCoreos?`<button type="button" class="button secondary" data-new-coreos>${newCoreos} coreografías nuevas en el catálogo común · Ver e importar</button>`:'')+(pendingSuggestions?`<button type="button" class="button secondary" data-pending-suggestions>${pendingSuggestions} propuestas de profesores pendientes · Revisar</button>`:'');
    banner.hidden=!newCoreos&&!pendingSuggestions;
    cloudRefreshCoreoStates();
  }catch(error){
    const banner=cloudEl('cloud-notifications');
    if(banner){banner.hidden=false;banner.textContent='No se pudieron consultar los avisos. '+error.message;}
  }finally{cloudNotificationBusy=false;}
}
function cloudSuggestionDetails(c){
  const e=cloudEscape;
  return `<p>${e(c.author)} · ${e(c.level)} · ${e(c.counts)} counts · ${e(c.walls)} paredes</p>`+
    ['music','video','sheet'].map(key=>{try{const url=new URL(c[key]);return ['https:','http:'].includes(url.protocol)?`<p><a href="${e(url.href)}" target="_blank" rel="noopener noreferrer">${{music:'Música',video:'Vídeo',sheet:'Hoja'}[key]}</a></p>`:'';}catch{return '';}}).join('')+
    (c.extras?`<p class="suggestion-extras">${e(c.extras)}</p>`:'');
}
async function cloudSuggestions(){
  const admin=cloudUser.role==='admin',e=cloudEscape;
  cloudDialog(admin?'Propuestas de profesores':'Proponer al catálogo común',
    `<p class="sub">${admin?'Consulta quién propone cada coreo. Puedes corregir su ficha antes de publicarla o explicar al profesor por qué la descartas.':'Envía una coreo privada al administrador y consulta aquí su estado y los comentarios de revisión.'}</p>`+
    (admin?'<div class="review-filters"><label for="suggestion-filter">Estado</label><select id="suggestion-filter"><option value="pending">Pendientes</option><option value="accepted">Publicadas</option><option value="rejected">Descartadas</option><option value="all">Todas</option></select><label for="suggestion-query">Buscar coreo o profesor</label><input id="suggestion-query" type="search" placeholder="Nombre de la coreo o del profesor"></div>':`<label for="suggestion-source">Coreografía de mi lista</label><select id="suggestion-source" name="source_id" required><option value="">Selecciona una coreografía</option>${[...db.coreos].sort((a,b)=>a.name.localeCompare(b.name,'es')).map(c=>`<option value="${e(c.id)}">${e(c.name)}</option>`).join('')}</select><div id="suggestion-preview"></div>`)+
    '<div id="suggestion-list" aria-live="polite">Cargando propuestas…</div>',async values=>{
      if(cloudFailure)throw new Error('Resuelve el error de guardado antes de enviar la propuesta.');
      if(cloudBusy)throw new Error('Espera a que termine el guardado antes de enviar la propuesta.');
      await cloudFlush();
      if(cloudFailure||cloudPending||cloudBusy)throw new Error('Espera a que se guarden los cambios antes de enviar la propuesta.');
      await cloudApi('suggestions',{source_id:values.source_id});
      await load();await cloudRefreshCoreoStates();toast('Propuesta enviada al administrador');
    },'Enviar propuesta');
  const target=cloudEl('suggestion-list'),submit=document.querySelector('#form button[type="submit"]');
  submit.hidden=admin;
  let suggestions=[];
  if(!admin){
    submit.disabled=true;
    cloudEl('suggestion-source').onchange=event=>{const coreo=db.coreos.find(c=>c.id===event.target.value);cloudEl('suggestion-preview').innerHTML=coreo?cloudSuggestionDetails(coreo):'';};
  }
  function draw(){
    const state=admin?cloudEl('suggestion-filter').value:'all',query=admin?cloudEl('suggestion-query').value.trim().toLocaleLowerCase('es'):'';
    const visible=suggestions.filter(s=>(state==='all'||s.status===state)&&(!query||[s.coreo.name,s.teacher_name,s.teacher_email].some(v=>String(v||'').toLocaleLowerCase('es').includes(query))));
    const status={pending:'Propuesta pendiente',accepted:'Propuesta publicada',rejected:'Propuesta descartada'};
    target.innerHTML=`<p class="sub review-count">${visible.length} propuestas${state==='pending'?' pendientes':''}</p>`+visible.map(s=>`<article class="suggestion-card"><div class="suggestion-heading"><h3>${e(s.coreo.name)}</h3><span class="coreo-state ${e(s.status)}">${e(status[s.status])}</span></div><p class="sub">${admin?`Propuesta por <strong>${e(s.teacher_name)}</strong> · ${e(s.teacher_email)}`:'Tu propuesta'}${s.created_at?' · '+e(new Date(Number(s.created_at)*1000).toLocaleDateString('es-ES')):''}</p>${cloudSuggestionDetails(s.coreo)}${s.review_note?`<div class="review-note"><strong>${s.status==='rejected'?'Motivo del descarte':'Comentario del administrador'}</strong><p>${e(s.review_note)}</p></div>`:''}${s.status==='accepted'&&s.reviewedCoreo?.name?`<details class="review-published"><summary>Ver ficha publicada</summary><h4>${e(s.reviewedCoreo.name)}</h4>${cloudSuggestionDetails(s.reviewedCoreo)}</details>`:''}${admin&&s.status==='pending'?`<div class="card-actions"><button type="button" class="button" data-review="accepted" data-suggestion="${e(s.id)}">Revisar y publicar</button><button type="button" class="button secondary" data-review="rejected" data-suggestion="${e(s.id)}">Descartar con motivo</button></div>`:''}</article>`).join('')+(visible.length?'':'<p class="empty">No hay propuestas.</p>');
  }
  async function load(){
    const result=await cloudApi('suggestions');if(!target.isConnected)return;
    suggestions=result.suggestions.filter(s=>!admin||s.user_id!==cloudUser.id);draw();
    if(!admin){const proposed=new Set(suggestions.map(s=>s.source_id));for(const option of cloudEl('suggestion-source').options)option.disabled=proposed.has(option.value);if(proposed.has(cloudEl('suggestion-source').value)){cloudEl('suggestion-source').value='';cloudEl('suggestion-preview').innerHTML='';}submit.disabled=![...cloudEl('suggestion-source').options].some(o=>o.value&&!o.disabled);}
  }
  if(admin){cloudEl('suggestion-filter').onchange=draw;cloudEl('suggestion-query').oninput=draw;}
  target.onclick=event=>{
    const button=event.target.closest('[data-review]');if(!button)return;
    const suggestion=suggestions.find(s=>s.id===button.dataset.suggestion);if(!suggestion)return;
    document.getElementById('modal').close();cloudReviewSuggestion(suggestion,button.dataset.review);
  };
  try{await load();}catch(error){if(target.isConnected)target.textContent=error.message;}
}
function cloudReviewSuggestion(suggestion,decision){
  if(cloudUser.role!=='admin')return;
  const accepted=decision==='accepted',e=cloudEscape,c=suggestion.coreo;
  const input=(key,label,type='text',required=false)=>`<div><label for="review-${key}">${label}</label><input id="review-${key}" name="${key}" type="${type}" value="${e(c[key]??'')}" ${required?'required':''} ${type==='number'?'min="1" max="999"':''}></div>`;
  const editor=accepted?`<div class="review-editor">${input('name','Nombre de la coreografía','text',true)}${input('author','Autor')}<div class="form-grid">${input('level','Nivel','text',true)}${input('walls','Paredes','number')}${input('counts','Counts','number')}</div>${input('music','Enlace a música','url')}${input('video','Enlace a vídeo','url')}${input('sheet','Enlace a la hoja','url')}<label for="review-extras">Extras</label><textarea id="review-extras" name="extras" rows="4">${e(c.extras||'')}</textarea></div>`:`<h3>${e(c.name)}</h3><p class="sub">Explica qué necesita corregir el profesor. Verá el motivo en sus propuestas.</p>`;
  cloudDialog(accepted?'Revisar y publicar':'Descartar propuesta',`<p class="sub">Propuesta por <strong>${e(suggestion.teacher_name)}</strong> · ${e(suggestion.teacher_email)}</p>${accepted?'<p class="sub">Puedes corregir la ficha pública. La coreografía privada del profesor se conserva.</p>':''}${editor}<label for="review-note">${accepted?'Comentario para el profesor (opcional)':'Motivo del descarte'}</label><textarea id="review-note" name="review_note" maxlength="2000" rows="3" ${accepted?'':'required'}></textarea>`,async values=>{
    const body={id:suggestion.id,decision,review_note:values.review_note};
    if(accepted){const {review_note,...coreo}=values;coreo.id=c.id;for(const key of ['walls','counts'])if(coreo[key])coreo[key]=Number(coreo[key]);body.coreo=coreo;}
    await cloudApi('review-suggestion',body);
    document.getElementById('modal').close();
    await cloudRefreshCoreoStates();await cloudRefreshNotifications();
    await cloudSuggestions();toast(accepted?'Coreografía publicada con la ficha revisada':'Propuesta descartada; el profesor verá el motivo');
  },accepted?'Confirmar publicación':'Confirmar descarte');
}
let cloudCoreoStates=null,cloudCoreoStatesBusy=false;
const cloudStateLabels={private:'Privada',shared:'Compartida',imported:'Copiada del catálogo',pending:'Propuesta pendiente',accepted:'Propuesta publicada',rejected:'Propuesta descartada'};
function cloudCoreoStateMarkup(c){
  const state=cloudCoreoStates?.[c.id]||(!cloudCoreoStates?'loading':'private');
  return `<span class="coreo-state ${state}" data-coreo-state="${cloudEscape(c.id)}">${cloudStateLabels[state]||'Consultando estado…'}</span>`;
}
async function cloudRefreshCoreoStates(){
  if(cloudCoreoStatesBusy)return;
  cloudCoreoStatesBusy=true;
  try{
    const result=await cloudApi('coreo-states');cloudCoreoStates=result.states;
    document.querySelectorAll('[data-coreo-state]').forEach(el=>{const state=cloudCoreoStates[el.dataset.coreoState]||'private';el.className='coreo-state '+state;el.textContent=cloudStateLabels[state]||'Privada';});
  }catch{
    document.querySelectorAll('[data-coreo-state]').forEach(el=>{el.className='coreo-state loading';el.textContent='Estado no disponible';});
  }finally{cloudCoreoStatesBusy=false;}
}

function cloudShareCoreoButton(coreo){
  const label=(cloudUser.role==='admin'?'Compartir en el catálogo común: ':'Sugerir al catálogo común: ')+coreo.name;
  return `<button type="button" class="coreo-share-button" data-share-coreo="${cloudEscape(coreo.id)}" title="${cloudEscape(label)}" aria-label="${cloudEscape(label)}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m9 10 6-3m-6 7 6 3"/></svg></button>`;
}
document.addEventListener('click',event=>{
  const button=event.target.closest('[data-share-coreo]');
  if(button)cloudShareCoreo(button.dataset.shareCoreo);
});
function cloudShareCoreo(id){
  const source=db.coreos.find(c=>c.id===id);if(!source)return;
  const admin=cloudUser.role==='admin';
  cloudDialog(admin?'Compartir coreografía':'Sugerir coreografía',
    `<p class="sub">${admin?'¿Quieres publicar esta coreografía en el catálogo común? Los profesores podrán copiarla a su espacio privado. Si ya estaba compartida, se actualizará y generará un nuevo aviso.':'¿Quieres sugerir esta coreografía para el catálogo común? El administrador verá tu nombre, correo y la ficha, y decidirá si la publica.'}</p><div class="suggestion-card"><h3>${cloudEscape(source.name)}</h3>${cloudSuggestionDetails(source)}</div>`,async()=>{
      const current=db.coreos.find(c=>c.id===id);
      if(!current)throw new Error('Esta coreografía ya no está en tu lista.');
      if(admin){
        const library=await cloudApi('library');
        const {libraryId,publicationVersion,...copy}=current;copy.id=libraryId||current.id;
        await cloudApi('library',{version:library.version,coreos:[copy]});
      }else{
        if(cloudFailure)throw new Error('Resuelve el error de guardado antes de enviar la propuesta.');
        if(cloudBusy)throw new Error('Espera a que termine el guardado antes de enviar la propuesta.');
        await cloudFlush();
        if(cloudFailure||cloudPending||cloudBusy)throw new Error('Espera a que se guarden los cambios antes de enviar la propuesta.');
        await cloudApi('suggestions',{source_id:id});
      }
      document.getElementById('modal').close();
      await cloudRefreshCoreoStates();
      toast(admin?'Coreografía compartida en el catálogo común':'Propuesta enviada al administrador');
      await cloudRefreshNotifications();
    },admin?'Confirmar publicación':'Confirmar sugerencia');
}
