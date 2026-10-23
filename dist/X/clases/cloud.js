// Cloud bootstrap is loaded before the existing application scripts.
window.COMPAS_CLOUD = true;
window.COMPAS_INITIAL_DATA = null;
let cloudUser, cloudCsrf, cloudVersion=0, cloudPending=null, cloudBusy=false, cloudTimer, cloudFailure=null;
const cloudEl = id => document.getElementById(id);
const cloudEscape = value => String(value ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function cloudApi(action, body) {
  const controller=new AbortController(), timer=setTimeout(()=>controller.abort(),20000);
  let response;
  try { response=await fetch('api/index.php?action='+encodeURIComponent(action), {signal:controller.signal, credentials:'same-origin', cache:'no-store', method:body===undefined?'GET':'POST', headers:body===undefined?{}:{'Content-Type':'application/json','X-CSRF-Token':cloudCsrf}, ...(body===undefined?{}:{body:JSON.stringify(body)})}); }
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
  document.querySelector('.profile span').textContent=cloudUser.name;
  if(!window.COMPAS_LOADED){
    for(const src of ['whatsapp.js','previous-class.js','app.js','csv.js'])await cloudLoadScript(src);
    window.COMPAS_LOADED=true;
  }
  cloudStatus('● Guardado en tu cuenta');
  cloudEl('cloud-account').onclick=cloudAccount;
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
function cloudAccount(){
  modal('Mi cuenta',`<p class="sub">${cloudEscape(cloudUser.name)} · ${cloudEscape(cloudUser.email)}</p><div class="card-actions"><button type="button" class="button secondary" id="account-import">Importar copia JSON</button><button type="button" class="button secondary" id="account-password">Cambiar contraseña</button>${cloudUser.role==='admin'?'<button type="button" class="button secondary" id="account-users">Profesores e invitaciones</button><button type="button" class="button secondary" id="account-library">Gestionar catálogo común</button>':''}<button type="button" class="button secondary" id="account-logout">Cerrar sesión</button></div><p class="sub csv-help">La importación permite trasladar tus datos de la versión local. Exporta allí una copia con el botón de descarga.</p>`,()=>{});
  const submit=document.querySelector('#form button[type="submit"]');submit.hidden=true;
  document.getElementById('modal').addEventListener('close',()=>{submit.hidden=false;},{once:true});
  cloudEl('account-import').onclick=()=>{document.getElementById('modal').close();cloudImport();};
  cloudEl('account-password').onclick=()=>{document.getElementById('modal').close();cloudPassword();};
  if(cloudUser.role==='admin')cloudEl('account-users').onclick=()=>{document.getElementById('modal').close();cloudInvites();};
  if(cloudUser.role==='admin')cloudEl('account-library').onclick=()=>{document.getElementById('modal').close();cloudPublishLibrary();};
  cloudEl('account-logout').onclick=async()=>{
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
  cloudDialog('Profesores e invitaciones',field('email','Correo del profesor','','email',true)+select('kind','Tipo de enlace',[['invite','Invitar a un nuevo profesor'],['reset','Recuperar acceso de un profesor existente']],'invite')+'<p class="sub csv-help">El enlace caduca en 48 horas y solo sirve una vez. Compártelo en privado con el profesor. No se envía ningún correo automáticamente.</p><label for="invite-link">Enlace generado</label><input id="invite-link" readonly><div id="account-user-list" class="sub"></div>',async values=>{const result=await cloudApi('invite',values);cloudEl('invite-link').value=new URL('./',location.href).href+'#acceso='+result.token;cloudEl('invite-link').select();},'Crear enlace');
  const target=cloudEl('account-user-list');
  try{const result=await cloudApi('users');if(target.isConnected)target.innerHTML='<p>Profesores registrados</p>'+result.users.map(u=>`<p>${cloudEscape(u.name)} · ${cloudEscape(u.email)} (${cloudEscape(u.role)})</p>`).join('');}catch(error){if(target.isConnected)target.textContent=error.message;}
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
async function cloudLibrary(){
  cloudDialog('Catálogo común','<p class="sub">Copia coreografías a tu lista privada. Podrás modificarlas sin afectar al catálogo común ni a otros profesores.</p><label for="library-search">Buscar por nombre</label><input id="library-search" type="search"><div class="card-actions"><button type="button" class="text-button" id="library-all">Marcar visibles</button><button type="button" class="text-button" id="library-none">Desmarcar todas</button></div><div id="library-list" class="share-list">Cargando…</div><p id="library-count" class="sub" role="status"></p>',async()=>{
    const copies=libraryCopies(catalog,[...selected],db.coreos);
    if(!copies.length)throw new Error('Selecciona alguna coreografía que no esté en tu lista.');
    const previous=db.coreos;db.coreos=[...previous,...copies];
    try{save();}catch(error){db.coreos=previous;throw error;}
    document.getElementById('modal').close();render();toast(copies.length+' coreografías copiadas a tu lista');
  },'Copiar a mi lista');
  const target=cloudEl('library-list'),submit=document.querySelector('#form button[type="submit"]');submit.disabled=true;
  let catalog=[],selected=new Set();
  function visible(){return matchingRoutines(catalog,cloudEl('library-search').value);}
  function update(){
    const available=new Set(libraryCopies(catalog,catalog.map(c=>c.id),db.coreos).map(c=>c.libraryId));
    target.innerHTML=visible().map(c=>`<label class="share-option"><input type="checkbox" value="${cloudEscape(c.id)}" ${available.has(c.id)?'':'disabled'} ${selected.has(c.id)?'checked':''}><span>${cloudEscape(c.name)}<small>${cloudEscape(c.level)} · ${cloudEscape(c.counts||'Counts pendientes')}${available.has(c.id)?'':' · Ya está en tu lista'}</small></span></label>`).join('')||'<div class="empty">No hay coreografías disponibles. El administrador puede añadirlas al catálogo común.</div>';
    cloudEl('library-count').textContent=selected.size+' seleccionadas';submit.disabled=!selected.size;
  }
  target.onchange=e=>{if(e.target.matches('input')){if(e.target.checked)selected.add(e.target.value);else selected.delete(e.target.value);update();}};
  cloudEl('library-search').oninput=update;
  cloudEl('library-all').onclick=()=>{libraryCopies(visible(),visible().map(c=>c.id),db.coreos).forEach(c=>selected.add(c.libraryId));update();};
  cloudEl('library-none').onclick=()=>{selected.clear();update();};
  try{const result=await cloudApi('library');if(!target.isConnected)return;catalog=result.coreos.sort((a,b)=>a.name.localeCompare(b.name,'es',{sensitivity:'base',numeric:true}));update();}catch(error){if(target.isConnected)target.textContent=error.message;}
}
async function cloudPublishLibrary(){
  cloudDialog('Gestionar catálogo común','<p class="sub">Elige coreografías de tu catálogo privado para añadir o actualizar sus fichas públicas. Se comparten nombre, autor, nivel, paredes, counts y enlaces. Las copias que ya tienen otros profesores no se modifican.</p><div id="publish-list" class="share-list"></div><label class="share-option"><input type="checkbox" required><span>Quiero publicar estas fichas para todos los profesores de Compás.</span></label><p id="publish-info" class="sub"></p>',async()=>{
    const ids=[...document.querySelectorAll('[data-publish]:checked')].map(b=>b.value);
    if(!ids.length)throw new Error('Selecciona al menos una coreografía.');
    const merged=new Map(library.coreos.map(c=>[c.id,c]));
    for(const c of db.coreos.filter(c=>ids.includes(c.id))){const {libraryId,...copy}=c;copy.id=libraryId||c.id;merged.set(copy.id,copy);}
    await cloudApi('library',{version:library.version,coreos:[...merged.values()]});document.getElementById('modal').close();toast('Catálogo común actualizado');
  },'Publicar selección');
  let library;
  const submit=document.querySelector('#form button[type="submit"]');submit.disabled=true;
  const target=cloudEl('publish-list');
  target.innerHTML=[...db.coreos].sort((a,b)=>a.name.localeCompare(b.name,'es')).map(c=>`<label class="share-option"><input type="checkbox" data-publish value="${cloudEscape(c.id)}"><span>${cloudEscape(c.name)}</span></label>`).join('')||'<p class="empty">Importa o crea coreografías en tu catálogo privado primero.</p>';
  try{library=await cloudApi('library');if(target.isConnected){cloudEl('publish-info').textContent=library.coreos.length+' coreografías en el catálogo común';submit.disabled=!db.coreos.length;}}catch(error){if(target.isConnected)cloudEl('publish-info').textContent=error.message;}
}
