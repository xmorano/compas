(()=>{
  const installed=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
  let promptEvent=null,registration=null,reloadRequested=false;
  const button=document.getElementById('pwa-install'),help=document.getElementById('pwa-help'),update=document.getElementById('pwa-update');
  function refresh(){button.hidden=installed();if(!button.hidden)button.textContent=promptEvent?'Instalar Compás':'Instalar en el móvil';}
  function busy(){
    return (typeof cloudPending!=='undefined'&&!!cloudPending)||(typeof cloudBusy!=='undefined'&&cloudBusy)||document.getElementById('modal')?.open||[...document.querySelectorAll('#auth:not([hidden]) #auth-form input')].some(input=>input.value);
  }
  function message(text){document.getElementById('pwa-update-text').textContent=text;update.hidden=false;}
  window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();promptEvent=event;refresh();});
  window.addEventListener('appinstalled',()=>{promptEvent=null;button.hidden=true;help.close();});
  matchMedia('(display-mode: standalone)').addEventListener('change',refresh);
  button.onclick=async()=>{
    if(promptEvent){const event=promptEvent;promptEvent=null;await event.prompt();await event.userChoice;refresh();}
    else help.showModal();
  };
  document.getElementById('pwa-help-close').onclick=()=>help.close();
  document.getElementById('pwa-update-later').onclick=()=>{update.hidden=true;};
  document.getElementById('pwa-update-now').onclick=()=>{
    if(busy()){message('Guarda los cambios pendientes y cierra los formularios antes de actualizar.');return;}
    if(!navigator.onLine){message('Conéctate a Internet antes de actualizar.');return;}
    if(registration?.waiting){reloadRequested=true;registration.waiting.postMessage({type:'ACTIVATE_UPDATE'});}
    else location.reload();
  };
  refresh();
  if(!('serviceWorker' in navigator)||!window.isSecureContext)return;
  let hadController=!!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange',()=>{
    if(!hadController){hadController=true;return;}
    if(reloadRequested&&!busy()){location.reload();return;}
    message('Hay una versión nueva de Compás. Recarga cuando hayas terminado tus cambios.');
  });
  navigator.serviceWorker.register('sw.js',{scope:'./',updateViaCache:'none'}).then(reg=>{
    registration=reg;
    if(reg.waiting)message('Hay una versión nueva de Compás disponible.');
    reg.addEventListener('updatefound',()=>{
      const worker=reg.installing;
      worker?.addEventListener('statechange',()=>{if(worker.state==='installed'&&navigator.serviceWorker.controller)message('Hay una versión nueva de Compás disponible.');});
    });
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&navigator.onLine)reg.update().catch(()=>{});});
  }).catch(()=>{button.title='No se pudo preparar la instalación. Comprueba tu conexión y recarga.';});
})();
