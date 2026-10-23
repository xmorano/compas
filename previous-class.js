function previousClass(session) {
  const time = s => `${s.date}T${s.start || '00:00'}`;
  return db.sessions.filter(s => s.id !== session.id && s.group === session.group && s.term === session.term && time(s) < time(session))
    .sort((a,b) => time(b).localeCompare(time(a)))[0];
}
function previousClassBanner(session) {
  const previous = previousClass(session);
  if (!previous) return '';
  return `<div class="previous-class-banner"><div><strong>Continúa desde la clase anterior</strong><p class="sub">${dateLabel(previous.date)} ${previous.date.slice(0,4)} · ${esc(previous.start)} · ${previous.items.length} en la lista · ${previous.items.filter(i=>i.planned||i.done).length} planeadas o realizadas · ${previous.items.filter(i=>i.done).length} realizadas</p></div><button class="button secondary" data-action="import-previous">Importar coreografías</button></div>`;
}
function previousClassItems(session, previous, selectedIds) {
  const existing = new Set(session.items.map(i => i.coreo)), selected = new Set(selectedIds);
  return previous.items.filter(item => {
    if (!selected.has(item.coreo) || existing.has(item.coreo) || !coreo(item.coreo)) return false;
    existing.add(item.coreo); return true;
  }).map(item => ({coreo:item.coreo, done:false, planned:true, mode:item.mode === 'Nueva' && item.done ? 'Repaso' : item.mode, note:''}));
}
function importPreviousClass() {
  const session = db.sessions.find(s => s.id === activeSession), previous = session && previousClass(session);
  if (!previous) { toast('No hay una clase anterior en este grupo y trimestre.'); return; }
  const existing = new Set(session.items.map(i => i.coreo));
  const items = sortedSessionItems(previous.items).map(({item})=>item).filter(i=>coreo(i.coreo));
  modal('Importar de la clase anterior',
    `<p class="sub">${esc(center(group(previous.group).center).name)} · ${esc(group(previous.group).level)}<br>${dateLabel(previous.date)} ${previous.date.slice(0,4)} · ${esc(previous.start)} · ${esc(previous.term)}</p><p class="sub csv-help">Lista: ${previous.items.length} coreografías. Planeadas pendientes: ${previous.items.filter(i=>routineState(i)==='planned').length}. Realizadas: ${previous.items.filter(i=>i.done).length}.${previous.closed ? '' : ' La clase anterior aún no está finalizada; el registro puede estar incompleto.'}</p>` +
    '<div class="previous-presets"><button type="button" class="text-button" data-previous-select="all">Todas</button><button type="button" class="text-button" data-previous-select="done">Solo realizadas</button><button type="button" class="text-button" data-previous-select="pending">Planeadas sin realizar</button><button type="button" class="text-button" data-previous-select="none">Ninguna</button></div>' +
    `<div class="share-list">${items.map((item,index) => `<label class="share-option"><input type="checkbox" data-previous-index="${index}" ${existing.has(item.coreo)?'disabled':'checked'}><span>${esc(coreo(item.coreo).name)}<small>${esc(item.mode)} · ${routineStateLabel(item)}${existing.has(item.coreo)?' · Ya está en esta clase':''}</small>${item.note?`<small>Nota anterior: ${esc(item.note)}</small>`:''}</span></label>`).join('') || '<div class="empty">La clase anterior no tiene coreografías para importar.</div>'}</div>` +
    '<p class="sub csv-help">Se añaden como planeadas (azul), pendientes de realizar. Las nuevas que ya enseñaste pasan a Repaso. Las notas anteriores quedan en su clase original.</p><p id="previous-count" class="sub" role="status"></p>', () => {});
  const boxes = [...document.querySelectorAll('[data-previous-index]')], submit = $('#form button[type="submit"]');
  const selectedIds = () => boxes.filter(b=>b.checked && !b.disabled).map(b=>items[Number(b.dataset.previousIndex)].coreo);
  function update() {
    const count = selectedIds().length;
    submit.disabled = !count;
    submit.textContent = `Importar ${count} coreografías`;
    $('#previous-count').textContent = `${count} seleccionadas para la nueva clase`;
  }
  boxes.forEach(b => { b.onchange = update; });
  document.querySelectorAll('[data-previous-select]').forEach(button => {
    button.onclick = () => {
      const preset = button.dataset.previousSelect;
      boxes.forEach(b => { if (!b.disabled) { const item = items[Number(b.dataset.previousIndex)]; b.checked = preset === 'all' || (preset === 'done' && item.done) || (preset === 'pending' && routineState(item)==='planned'); } });
      update();
    };
  });
  $('#form').onsubmit = e => {
    e.preventDefault();
    const added = previousClassItems(session, previous, selectedIds());
    if (!added.length) return;
    const original = session.items;
    session.items = [...original, ...added];
    try { save(); }
    catch { session.items = original; toast('No se pudo guardar la importación. Inténtalo de nuevo.'); return; }
    $('#modal').close(); render(); toast(`${added.length} coreografías importadas`);
  };
  update();
}
