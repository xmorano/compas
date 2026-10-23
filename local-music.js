// Audio stays in this browser; it never enters the workspace JSON or the server.
window.CompasMusic = (() => {
  let connection, player, currentUrl, currentKey;
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
  function stop() {
    if(player) {player.querySelector('audio').pause();player.remove();player = null;}
    if(currentUrl) URL.revokeObjectURL(currentUrl);
    currentUrl = currentKey = null;
  }
  async function play(id, title) {
    const track = await record(id);
    if(!track) throw new Error('Vuelve a añadir el MP3 en este dispositivo.');
    if(currentKey === key(id) && player) {await player.querySelector('audio').play();return;}
    stop();
    currentKey = key(id);currentUrl = URL.createObjectURL(track.file);
    player = document.createElement('section');player.className = 'local-player';player.setAttribute('aria-label', 'Reproductor de música local');
    player.innerHTML = `<strong>${escape(title)}</strong><audio controls preload="metadata"></audio><div class="music-speed"><label for="music-speed">Velocidad <output id="music-speed-value" for="music-speed">100 %</output></label><input id="music-speed" type="range" min="50" max="100" step="5" value="100" aria-valuetext="100 %"><button type="button" class="button secondary" data-speed-reset>Normal (100 %)</button></div><button data-player-close type="button" class="button secondary" aria-label="Cerrar reproductor">Cerrar ✕</button><small role="status"></small>`;
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
    player.querySelector('[data-player-close]').onclick = stop;
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
  window.addEventListener('pagehide', stop);
  return {markup, stop};
})();
