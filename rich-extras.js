const EXTRAS_RICH_PREFIX='<!--compas-rich-v1-->';
function cleanExtrasHtml(html) {
  const template=document.createElement('template');template.innerHTML=html;
  const allowed=new Set(['P','DIV','BR','STRONG','B','EM','I','U','UL','OL','LI','A']);
  const blocked=new Set(['SCRIPT','STYLE','IFRAME','OBJECT','EMBED','SVG','MATH','TEMPLATE','IMG','VIDEO','AUDIO','LINK','META','FORM','INPUT','BUTTON']);
  function clean(node) {
    if(node.nodeType===Node.TEXT_NODE)return document.createTextNode(node.textContent);
    if(node.nodeType!==Node.ELEMENT_NODE||blocked.has(node.tagName))return document.createDocumentFragment();
    const out=allowed.has(node.tagName)?document.createElement(node.tagName.toLowerCase()):document.createDocumentFragment();
    if(node.tagName==='A'){
      const href=safeUrl(node.getAttribute('href'));
      if(href){out.setAttribute('href',href);out.setAttribute('target','_blank');out.setAttribute('rel','noopener noreferrer');}
    }
    for(const child of node.childNodes)out.append(clean(child));
    return out;
  }
  const result=document.createElement('div');for(const child of template.content.childNodes)result.append(clean(child));
  return result.innerHTML;
}
function extrasHtml(value='') {
  value=String(value||'');
  return value.startsWith(EXTRAS_RICH_PREFIX)?cleanExtrasHtml(value.slice(EXTRAS_RICH_PREFIX.length)):esc(value).replace(/\r?\n/g,'<br>');
}
function extrasEditorMarkup(value='') {
  return `<label id="extras-label" for="extras-editor">Extras (restarts, tags…)</label><div class="extras-edit-box"><div class="extras-toolbar" role="toolbar" aria-label="Formato de extras">${[['bold','Negrita','<b>B</b>'],['italic','Cursiva','<i>I</i>'],['underline','Subrayado','<u>U</u>'],['insertUnorderedList','Lista con viñetas','• Lista'],['insertOrderedList','Lista numerada','1. Lista'],['createLink','Añadir o editar enlace','Enlace'],['unlink','Quitar enlace','Sin enlace'],['removeFormat','Quitar formato','Limpiar']].map(([cmd,label,text])=>`<button type="button" data-extras-command="${cmd}" title="${label}" aria-label="${label}">${text}</button>`).join('')}</div><div id="extras-editor" class="extras-rich extras-editor" contenteditable="true" role="textbox" aria-multiline="true" aria-labelledby="extras-label" aria-describedby="extras-help" spellcheck="true">${extrasHtml(value)}</div></div><input type="hidden" id="f-extras" name="extras" value="${esc(value)}"><p id="extras-help" class="sub csv-help">Selecciona texto para darle formato o añadir un enlace.</p><p id="extras-error" class="csv-errors" role="alert" hidden></p>`;
}
function mountExtrasEditor() {
  const editor=$('#extras-editor'),hidden=$('#f-extras'),error=$('#extras-error'),form=$('#form'),submit=form.querySelector('[type="submit"]');
  let selection;
  const remember=()=>{const s=window.getSelection();if(s.rangeCount&&editor.contains(s.getRangeAt(0).commonAncestorContainer))selection=s.getRangeAt(0).cloneRange();};
  function restore(){editor.focus();const s=window.getSelection();s.removeAllRanges();if(selection&&editor.contains(selection.commonAncestorContainer))s.addRange(selection);else{const r=document.createRange();r.selectNodeContents(editor);r.collapse(false);s.addRange(r);}}
  function sync(){
    const html=cleanExtrasHtml(editor.innerHTML),text=document.createElement('div');text.innerHTML=html;
    hidden.value=text.textContent.trim()?EXTRAS_RICH_PREFIX+html:'';
    const tooLong=new TextEncoder().encode(hidden.value).length>9500;
    error.hidden=!tooLong;error.textContent=tooLong?'Los extras son demasiado largos. Reduce el texto o el formato antes de guardar.':'';
    submit.disabled=tooLong;return !tooLong;
  }
  editor.addEventListener('input',()=>{remember();sync();});
  editor.addEventListener('keyup',remember);editor.addEventListener('mouseup',remember);editor.addEventListener('touchend',remember);editor.addEventListener('blur',remember);
  document.querySelectorAll('[data-extras-command]').forEach(button=>{
    button.onmousedown=e=>{e.preventDefault();remember();};
    button.onclick=()=>{
      restore();let command=button.dataset.extrasCommand,value=null;
      if(command==='createLink'){
        const anchor=window.getSelection().anchorNode?.parentElement?.closest('a');
        const url=prompt('Dirección del enlace (https://…)',anchor?.getAttribute('href')||'https://');
        if(url===null)return;value=safeUrl(url.trim());
        if(!value){error.hidden=false;error.textContent='Indica un enlace válido que empiece por https:// o http://.';return;}
        restore();
        if(window.getSelection().isCollapsed&&!anchor){document.execCommand('insertHTML',false,`<a href="${esc(value)}">${esc(value)}</a>`);remember();sync();return;}
      }
      document.execCommand(command,false,value);remember();sync();
    };
  });
  editor.addEventListener('paste',e=>{
    e.preventDefault();const html=e.clipboardData.getData('text/html'),text=e.clipboardData.getData('text/plain');
    document.execCommand('insertHTML',false,html?cleanExtrasHtml(html):esc(text).replace(/\r?\n/g,'<br>'));remember();sync();
  });
  editor.addEventListener('drop',e=>e.preventDefault());
  const original=form.onsubmit;
  form.onsubmit=e=>{if(!sync()){e.preventDefault();editor.focus();return;}original(e);};
  sync();
}
