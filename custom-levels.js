const defaultCoreoLevels=['Iniciación','Intermedio','Avanzado'];
const levelKey=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLocaleLowerCase('es').replace(/\s+/g,' ');
function uniqueCoreoLevels(values){const result=new Map();for(const raw of values){if(typeof raw!=='string')continue;const value=raw.trim().replace(/\s+/g,' '),key=levelKey(value);if(value&&key!=='sin definir'&&!result.has(key))result.set(key,value);}return [...result.values()];}
function userCoreoLevels(){return uniqueCoreoLevels([...defaultCoreoLevels,...(db.customLevels||[]),...db.coreos.map(c=>c.level),...(db.groups||[]).map(g=>g.level)]);}
function commonCoreoLevels(catalog){return uniqueCoreoLevels([...defaultCoreoLevels,...catalog.map(c=>c.level)]);}
function rememberCoreoLevels(values){const next=uniqueCoreoLevels([...(db.customLevels||[]),...values]).filter(v=>!defaultCoreoLevels.some(d=>levelKey(d)===levelKey(v)));if(next.length>500)throw Error('La cuenta admite hasta 500 niveles personalizados.');db.customLevels=next;}
function levelEditorMarkup(value='',available=userCoreoLevels(),prefix='f'){
  const known=uniqueCoreoLevels(available),match=known.find(v=>levelKey(v)===levelKey(value)),isNew=!!value&&levelKey(value)!=='sin definir'&&!match;
  return `<label for="${prefix}-level">Nivel</label><select id="${prefix}-level" name="level"><option value="Sin definir" ${!value||levelKey(value)==='sin definir'?'selected':''}>Sin definir</option>${known.map(v=>`<option value="${esc(v)}" ${match===v?'selected':''}>${esc(v)}</option>`).join('')}<option value="__new_level__" ${isNew?'selected':''}>＋ Crear otro nivel…</option></select><div id="${prefix}-new-level-box" ${isNew?'':'hidden'}><label for="${prefix}-new-level">Nombre del nuevo nivel</label><input id="${prefix}-new-level" name="new_level" maxlength="120" value="${esc(isNew?value:'')}" ${isNew?'required':'disabled'} placeholder="Por ejemplo: Improver, Básico 2…"><p class="sub csv-help">Se añadirá a la lista al guardar. Los niveles ya existentes no se duplican.</p></div>`;
}
function mountLevelEditor(prefix='f'){
  const select=document.getElementById(prefix+'-level'),input=document.getElementById(prefix+'-new-level'),box=document.getElementById(prefix+'-new-level-box');
  select.onchange=()=>{const isNew=select.value==='__new_level__';box.hidden=!isNew;input.disabled=!isNew;input.required=isNew;if(isNew)input.focus();};
}
function resolveCoreoLevel(values,available=userCoreoLevels()){
  const value=String(values.level==='__new_level__'?values.new_level||'':values.level||'Sin definir').trim().replace(/\s+/g,' ');
  if(!value||value.length>120)throw Error('El nivel debe tener entre 1 y 120 caracteres.');
  const known=uniqueCoreoLevels(available);return known.find(v=>levelKey(v)===levelKey(value))||value;
}
function editCoreoWithLevels(id){
  if(typeof extrasEditorMarkup!=='function'||typeof mountExtrasEditor!=='function'){toast('Recarga la página para cargar el editor.');return;}
  const c=coreo(id)||{};
  classDialog(id?'Editar coreografía':'Nueva coreografía',field('name','Nombre',c.name,'text',true)+field('author','Coreógrafo/a',c.author)+levelEditorMarkup(c.level)+`<div class="form-grid"><div>${field('walls','Paredes',c.walls??4,'number')}</div><div>${field('counts','Counts',c.counts??32,'number')}</div></div>`+extrasEditorMarkup(c.extras)+field('music','Enlace a música',c.music,'url')+field('video','Enlace a vídeo',c.video,'url')+field('sheet','Enlace a hoja de pasos',c.sheet,'url'),async values=>{
    const level=resolveCoreoLevel(values);delete values.new_level;values.level=level;
    saveClassChange(()=>{if(levelKey(level)!=='sin definir')rememberCoreoLevels([level]);if(id)Object.assign(c,values);else db.coreos.push({id:uid(),...values});});
    $('#modal').close();render();toast('Coreografía guardada');
  });mountLevelEditor();mountExtrasEditor();
}
function renderLevelTransfer(target,coreos,known,destination){
  if(!target)return;
  const previous=new Map([...target.querySelectorAll('[data-transfer-level]')].map(el=>[levelKey(el.dataset.transferLevel),el.value]));
  const missing=uniqueCoreoLevels(coreos.map(c=>c.level)).filter(v=>!known.some(k=>levelKey(k)===levelKey(v)));
  target.innerHTML=missing.length?`<div class="level-transfer"><h3>Niveles nuevos para ${esc(destination)}</h3><p class="sub">Puedes añadir estos niveles o asociarlos a uno existente.</p>${missing.map(v=>`<label>${esc(v)}<select data-transfer-level="${esc(v)}"><option value="__add_level__">Añadir «${esc(v)}»</option>${known.map(k=>`<option value="${esc(k)}">Usar ${esc(k)}</option>`).join('')}</select></label>`).join('')}</div>`:'';
  target.querySelectorAll('[data-transfer-level]').forEach(el=>{if([...el.options].some(o=>o.value===previous.get(levelKey(el.dataset.transferLevel))))el.value=previous.get(levelKey(el.dataset.transferLevel));});
}
function resolveLevelTransfer(coreos,target,known){
  const choices=new Map([...target.querySelectorAll('[data-transfer-level]')].map(el=>[levelKey(el.dataset.transferLevel),el.value]));
  return coreos.map(c=>{const choice=choices.get(levelKey(c.level)),raw=choice&&choice!=='__add_level__'?choice:c.level;const level=known.find(k=>levelKey(k)===levelKey(raw))||String(raw||'Sin definir').trim().replace(/\s+/g,' ');if(level.length>120)throw Error('El nivel es demasiado largo. Asócialo a uno de tus niveles existentes.');return {...c,level};});
}
