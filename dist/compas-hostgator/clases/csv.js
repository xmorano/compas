// CSV fields: name, class/tutorial video, music, step sheet.
function parseCsv(text) {
  text = text.replace(/^\uFEFF/, '');
  const rows = [];
  let row = [], value = '', quoted = false, closed = false, line = 1, start = 1;
  function cell() { row.push(value.trim()); value = ''; closed = false; }
  function record() { cell(); if (row.some(Boolean)) rows.push({line: start, cells: row}); row = []; }
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { value += '"'; i++; }
        else { quoted = false; closed = true; }
      } else { value += c; if (c === '\n') line++; }
    } else if (c === ',') cell();
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      record(); line++; start = line;
    } else if (c === '"') {
      if (value.trim() || closed) throw new Error(`Línea ${line}: comillas inesperadas.`);
      value = ''; quoted = true;
    } else {
      if (closed && c.trim()) throw new Error(`Línea ${line}: falta una coma después de las comillas.`);
      if (!closed) value += c;
    }
  }
  if (quoted) throw new Error(`Línea ${start}: hay comillas sin cerrar.`);
  record();
  return rows;
}
function csvPlan(text, existing) {
  const rows = parseCsv(text), errors = [], entries = [];
  const normalize = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase().replace(/\s+/g, ' ');
  if (rows.length && ['nombre coreo','nombre coreografia','nombre'].includes(normalize(rows[0].cells[0])) && /link|enlace|clase|video/i.test(rows[0].cells[1] || '')) rows.shift();
  const names = new Set(existing.map(c => normalize(c.name)));
  let skipped = 0;
  for (const row of rows) {
    const [name, video, music, sheet] = row.cells;
    if (row.cells.length !== 4) { errors.push(`Línea ${row.line}: se esperan 4 columnas y hay ${row.cells.length}.`); continue; }
    if (!name) { errors.push(`Línea ${row.line}: falta el nombre de la coreografía.`); continue; }
    let invalid = false;
    for (const [label, url] of [['clase',video],['música',music],['hoja',sheet]]) {
      if (url && !safeUrl(url)) { errors.push(`Línea ${row.line}: el enlace de ${label} debe empezar por https:// o http://.`); invalid = true; }
    }
    if (invalid) continue;
    const key = normalize(name);
    if (names.has(key)) { skipped++; continue; }
    names.add(key);
    entries.push({name, video, music, sheet, author:'', level:'Sin definir', walls:'', counts:''});
  }
  return {entries, errors, skipped};
}
function importCsv() {
  modal('Importar coreografías', `
    <p class="sub">Carga un archivo CSV o pega su contenido. Una coreografía por fila, en este orden:</p>
    <div class="csv-format">nombre coreo, link a clase, link a música, link a la hoja de la coreo</div>
    <p class="sub">El enlace a clase se guarda como vídeo. Los enlaces pueden quedar vacíos. Puedes incluir una cabecera; si un nombre contiene comas, escríbelo entre comillas.</p>
    <label for="csv-file">Archivo CSV</label><input id="csv-file" type="file" accept=".csv,text/csv">
    <label for="csv-text">Contenido CSV</label><textarea id="csv-text" rows="6" spellcheck="false" placeholder="Mi coreografía,https://ejemplo.com/clase,https://ejemplo.com/musica,https://ejemplo.com/hoja"></textarea>
    <p class="sub csv-help">Se omiten los nombres ya existentes. El nivel, paredes y counts quedan pendientes para que puedas completarlos después.</p>
    <div id="csv-preview" aria-live="polite"></div>`, () => {});
  const button = $('#form button[type="submit"]');
  let loading = false, readVersion = 0;
  function preview() {
    button.disabled = true;
    try {
      const plan = csvPlan($('#csv-text').value, db.coreos);
      $('#csv-preview').innerHTML = plan.errors.length
        ? `<div class="csv-errors" role="alert">${plan.errors.map(esc).join('<br>')}<br>Corrige estas filas para importar.</div>`
        : `<p class="sub">${plan.entries.length} nuevas · ${plan.skipped} duplicadas omitidas</p>${plan.entries.length ? `<ul class="csv-list">${plan.entries.slice(0,20).map(c => `<li>${esc(c.name)}</li>`).join('')}${plan.entries.length>20?'<li>… y '+(plan.entries.length-20)+' más</li>':''}</ul>` : ''}`;
      button.textContent = `Importar ${plan.entries.length} coreografías`;
      button.disabled = loading || !!plan.errors.length || !plan.entries.length;
      return plan;
    } catch (error) { $('#csv-preview').innerHTML = `<p class="csv-errors" role="alert">${esc(error.message)}</p>`; return null; }
  }
  $('#csv-text').oninput = () => { readVersion++; loading = false; preview(); };
  $('#csv-file').onchange = async e => {
    const file = e.target.files[0], version = ++readVersion;
    if (!file) return;
    loading = true; button.disabled = true;
    try {
      const text = await file.text();
      if (version !== readVersion || !$('#modal').open) return;
      $('#csv-text').value = text; loading = false; preview();
    } catch { if(version !== readVersion) return; loading = false; $('#csv-preview').innerHTML = '<p class="csv-errors" role="alert">No se pudo leer el archivo. Prueba de nuevo o pega su contenido.</p>'; }
  };
  $('#form').onsubmit = e => {
    e.preventDefault();
    if (loading) return;
    const plan = preview();
    if (!plan || plan.errors.length || !plan.entries.length) return;
    const previous = db.coreos;
    db.coreos = [...previous, ...plan.entries.map(c => ({id:uid(), ...c}))];
    try { save(); }
    catch { db.coreos = previous; $('#csv-preview').innerHTML = '<p class="csv-errors" role="alert">No se pudo guardar. Comprueba el espacio disponible en el navegador y vuelve a intentarlo.</p>'; return; }
    $('#modal').close(); render(); toast(`${plan.entries.length} coreografías importadas`);
  };
  preview();
}
