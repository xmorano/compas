// Reuse the existing local Eventos service; no messages are sent on load.
const whatsappService = 'http://127.0.0.1:3001';
async function whatsappRequest(path, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(whatsappService + path, {...options, signal:controller.signal});
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'El servicio no pudo completar la petición.');
    return data;
  } finally { clearTimeout(timer); }
}
function whatsappPayload(groupId, summary) {
  if (!/^.+@g\.us$/.test(groupId)) throw new Error('Selecciona un grupo de WhatsApp válido.');
  return {group:groupId, events:[whatsappSummaryEvent(summary)]};
}
function whatsappSummaryEvent(summary) {
  const [firstLine, ...rest] = summary.split('\n');
  return {title:firstLine.replace(/\s+/g, ' ').replace(/[*_~`]/g, '').trim(), description:rest.join('\n').trim()};
}
function whatsappSummaryPreview(summary) {
  const event = whatsappSummaryEvent(summary);
  return `*${event.title}*\n\n${event.description}`;
}
async function loadWhatsappGroups(select, status, savedId, onChange, settings = {}) {
  status.textContent = 'Cargando grupos del servicio local…';
  try {
    const groups = await whatsappRequest('/api/groups');
    if (!Array.isArray(groups)) throw new Error('Respuesta de grupos no válida.');
    if (!select.isConnected) return;
    select.innerHTML = `<option value="">${esc(settings.emptyLabel || 'Elegir destinatario en WhatsApp (envío manual)')}</option>` +
      groups.filter(g => typeof g.id === 'string' && g.id.endsWith('@g.us') && typeof g.name === 'string')
        .sort((a,b) => a.name.localeCompare(b.name,'es'))
        .map(g => `<option value="${esc(g.id)}">${esc(g.name)} · ${esc(g.id)}</option>`).join('');
    const missing = savedId && ![...select.options].some(o => o.value === savedId);
    if (missing && settings.preserveSaved) select.insertAdjacentHTML('beforeend', `<option value="${esc(savedId)}">${esc(settings.savedName || savedId)} (guardado, no disponible)</option>`);
    select.value = [...select.options].some(o => o.value === savedId) ? savedId : '';
    status.textContent = missing && settings.preserveSaved ? 'El grupo guardado no está disponible ahora. Se conservará salvo que elijas otro.' : savedId && !select.value ? 'El grupo guardado no está disponible. Selecciona otro destino.' : (settings.help || 'Selecciona un grupo para enviarlo directamente. Se recordará para este centro y nivel.');
    onChange();
  } catch (error) {
    if (!select.isConnected) return;
    status.textContent = 'No se pudieron cargar los grupos. Comprueba que el servicio de Eventos está activo en este ordenador. Puedes usar el envío manual. ' + (error.name === 'TypeError' ? '' : error.message);
  }
}
