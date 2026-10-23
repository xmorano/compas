function centerPhotoUrl(value){return /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(value||'')?value:safeUrl(value);}
function editCenterPhotoForm(id){
  const existing=center(id),c=existing||{};let uploaded=/^data:image\//.test(c.photo||'')?c.photo:'',busy=false;
  classDialog(existing?'Editar centro':'Nuevo centro',field('name','Nombre',c.name,'text',true)+field('address','Dirección',c.address,'text',true)+field('email','Correo',c.email,'email')+field('phone','Teléfono',c.phone,'tel')+field('photo','URL de la foto',/^https?:/i.test(c.photo||'')?c.photo:'','url')+'<div class="center-photo-editor"><div id="center-photo-preview" class="center-photo-preview" aria-label="Vista previa de la foto"></div><label for="center-photo-file">O subir una foto</label><input id="center-photo-file" type="file" accept="image/jpeg,image/png,image/webp"><div class="card-actions"><button type="button" class="button secondary" id="center-photo-remove">Quitar foto</button></div><p class="sub" id="center-photo-status" role="status">Puedes sustituir la imagen por otra URL o subir un archivo JPG, PNG o WebP.</p></div>',async values=>{
    if(busy)throw Error('Espera a que termine de prepararse la foto.');
    const photo=values.photo.trim()||uploaded;
    if(photo&&!centerPhotoUrl(photo))throw Error('Indica una URL HTTP/HTTPS o sube una imagen válida.');
    const data={name:values.name,address:values.address,email:values.email,phone:values.phone,photo};
    saveClassChange(()=>{if(existing)Object.assign(existing,data);else db.centers.push({id:uid(),...data});});
    $('#modal').close();render();toast('Centro guardado');
  });
  const preview=()=>{const value=$('#f-photo').value.trim()||uploaded,box=$('#center-photo-preview');box.innerHTML=value&&centerPhotoUrl(value)?`<img src="${esc(centerPhotoUrl(value))}" alt="Vista previa del centro" referrerpolicy="no-referrer">`:'<span>⌂ Sin foto</span>';const img=box.querySelector('img');if(img)img.onerror=()=>box.replaceChildren(document.createTextNode('No se pudo cargar la imagen. Comprueba la URL.'));};
  $('#f-photo').oninput=()=>{uploaded='';$('#center-photo-file').value='';preview();};
  $('#center-photo-remove').onclick=()=>{uploaded='';$('#f-photo').value='';$('#center-photo-file').value='';$('#center-photo-status').textContent='La foto se quitará al guardar.';preview();};
  $('#center-photo-file').onchange=async event=>{
    const file=event.target.files[0];if(!file||busy)return;
    const submit=$('#form button[type="submit"]'),status=$('#center-photo-status');busy=true;submit.disabled=true;$('#center-photo-remove').disabled=true;$('#f-photo').disabled=true;status.textContent='Preparando foto…';let url;
    try{
      if(!/^image\/(jpeg|png|webp)$/.test(file.type)||file.size>8*1024*1024)throw Error('Elige un JPG, PNG o WebP de hasta 8 MB.');
      url=URL.createObjectURL(file);const image=await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error('No se pudo abrir la imagen.'));img.src=url;});
      const canvas=document.createElement('canvas');let result;
      for(const size of [768,512,384]){const scale=Math.min(1,size/Math.max(image.width,image.height));canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);result=canvas.toDataURL('image/jpeg',.76);if(result.length<=300000)break;}
      if(result.length>300000)throw Error('No se pudo reducir suficiente la foto. Prueba con otra imagen.');
      uploaded=result;if(status.isConnected){$('#f-photo').value='';preview();status.textContent='Foto lista. Guarda el centro para conservarla.';}
    }catch(error){if(status.isConnected)status.textContent=error.message;}
    finally{if(url)URL.revokeObjectURL(url);busy=false;submit.disabled=false;if(status.isConnected){$('#center-photo-remove').disabled=false;$('#f-photo').disabled=false;}}
  };preview();
}
