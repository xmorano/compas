"""Build a deployable /clases directory without credentials or personal data."""
from pathlib import Path
import shutil, zipfile, hashlib, json, subprocess, html as html_escape
ROOT=Path(__file__).resolve().parents[1]
# Artifact-only commits do not change the displayed source revision.
source_paths=['.',':(exclude)dist']
revision=subprocess.check_output(['git','log','-1','--format=%H','--',*source_paths],cwd=ROOT,text=True).strip()
if not revision:
    raise RuntimeError('No se encontró un commit de código para identificar la versión.')
source_dirty=subprocess.check_output(['git','status','--porcelain','--',*source_paths],cwd=ROOT,text=True).strip()
release_label=revision[:7]+('-dev' if source_dirty else '')
out=ROOT/'dist'/'clases'
out.mkdir(parents=True,exist_ok=True)
shutil.copytree(ROOT/'assets',out/'assets',dirs_exist_ok=True)
for name in ['style.css','previous-class.js','csv.js','rich-extras.js']:
    shutil.copy2(ROOT/name,out/name)
s=(ROOT/'app.js').read_text()
a=s.index('let db;try{');b=s.index("let page='agenda'",a)
s=s[:a]+'let db=structuredClone(window.COMPAS_INITIAL_DATA);'+s[b:]
s=s.replace("function save(){localStorage.setItem('compas-v1',JSON.stringify(db))}", 'function save(){window.cloudSave(db)}')
s=s.replace("toast('Cambios guardados')", "toast('Cambios preparados para guardar')")
s=s.replace('function render(){', "function render(){if(page==='library-admin'){cloudRenderLibraryManager();return;}")
s=s.replace('<span class="tag">${esc(c.level)}</span><h3>', '<span class="tag">${esc(c.level)}</span>${cloudCoreoStateMarkup(c)}<h3>')
s=s.replace('<div class="card-actions"><button class="button secondary" data-edit-coreo="${c.id}">', '<div class="card-actions">${cloudShareCoreoButton(c)}<button class="button secondary" data-edit-coreo="${c.id}">')
s=s.replace('<div class="toolbar"><button class="button secondary" data-action="import-csv">', '<div class="toolbar"><button class="button secondary" type="button" onclick="cloudLibrary()">Catálogo común</button><button class="button secondary" type="button" onclick="cloudSuggestions()">Propuestas al catálogo</button><button class="button secondary" data-action="import-csv">')
s=s.replace('◉ Datos de ejemplo para explorar tu estudio. Puedes editarlos y crear tus propios centros y clases.','◉ Tu espacio es privado. Empieza creando tus centros y cursos.')
# Cloud edition always uses the teacher's own WhatsApp sharing flow.
s=s.replace("  loadCourseGroups();", "  picker.closest('form').querySelector('label[for=\"f-whatsappGroupId\"]').hidden=true;picker.hidden=true;status.textContent='Comparte los resúmenes desde tu propio WhatsApp.';reload.hidden=true;")
s=s.replace('  reloadGroups();', "  destination.value='';destination.hidden=true;document.querySelector('label[for=\"share-destination\"]').hidden=true;reload.hidden=true;serviceStatus.textContent='Se abrirá tu WhatsApp para que elijas el grupo y confirmes el envío.';")
# Bundle the editor so even older cloud loaders cannot omit this dependency.
s=(ROOT/'local-music.js').read_text()+'\n'+(ROOT/'students.js').read_text()+'\n'+(ROOT/'class-tools.js').read_text()+'\n'+(ROOT/'center-photos.js').read_text()+'\n'+(ROOT/'rich-extras.js').read_text().replace('EXTRAS_RICH_PREFIX','COMPAS_BUNDLED_EXTRAS_PREFIX')+'\n'+s
(out/'app.js').write_text(s)
# Keep format helpers but no localhost endpoint in the public edition.
w=(ROOT/'whatsapp.js').read_text()
a=w.index("const whatsappService");b=w.index('function whatsappPayload',a)
w=w[:a]+"async function whatsappRequest(){throw new Error('El envío directo local no está disponible en esta edición.');}\n"+w[b:]
(out/'whatsapp.js').write_text(w)
html=(ROOT/'index.html').read_text()
html=html.replace('<link rel="stylesheet" href="style.css">','<link rel="stylesheet" href="style.css"><link rel="stylesheet" href="cloud.css">')
html=html.replace('</head>', '<link rel="manifest" href="manifest.webmanifest"><meta name="theme-color" content="#7860cc"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-title" content="Compás"><link rel="apple-touch-icon" href="icons/apple-touch-icon.png"><link rel="icon" type="image/png" href="icons/icon-192.png"></head>')
html=html.replace('<body><aside>','<body><section id="auth"><div class="auth-card">Cargando tu espacio…</div></section><aside hidden>')
html=html.replace('<main>','<main hidden>')
html=html.replace('</aside>', '<div class="pwa-tools"><button type="button" class="button secondary" id="pwa-install">Instalar Compás</button></div><div class="app-version" aria-label="Versión de la aplicación" title="Commit de código: '+html_escape.escape(revision)+'"><span>Versión</span><code>'+html_escape.escape(release_label)+'</code></div></aside>')
html=html.replace('● Guardado en este navegador','Conectando…')
html=html.replace('<button class="icon" id="export"','<button class="button secondary" id="cloud-account">Mi cuenta</button><button class="icon" id="export"')
html=html.replace('<div id="content">','<div id="cloud-warning" class="cloud-warning" hidden><span id="cloud-warning-text"></span><button id="cloud-retry" class="button secondary">Reintentar guardado</button><button id="cloud-backup" class="button secondary">Descargar mis cambios</button></div><div id="content">')
a=html.index('<script src=');html=html[:a]+'''<dialog id="pwa-help" aria-labelledby="pwa-help-title"><h2 id="pwa-help-title">Instalar Compás</h2><p><strong>Android:</strong> abre esta web en Chrome y elige «Instalar aplicación» o «Añadir a pantalla de inicio» en el menú.</p><p><strong>iPhone o iPad:</strong> abre esta web en Safari, pulsa Compartir y «Añadir a la pantalla de inicio». Activa «Abrir como app web» si aparece.</p><p><strong>Ordenador:</strong> usa la opción de instalar aplicación del navegador, si está disponible.</p><p class="sub">Necesitas conexión para abrir tus clases y guardar cambios. Si estás en el navegador integrado de otra app, abre Compás en Chrome o Safari.</p><button type="button" class="button" id="pwa-help-close">Entendido</button></dialog><div id="pwa-update" class="pwa-update" role="status" hidden><span id="pwa-update-text"></span><button type="button" class="button" id="pwa-update-now">Actualizar</button><button type="button" class="text-button" id="pwa-update-later">Más tarde</button></div><script src="cloud.js"></script><script src="pwa.js"></script></body></html>\n'''
(out/'index.html').write_text(html)
for name in ['cloud.js','cloud.css']:
    shutil.copy2(ROOT/'server'/name,out/name)
(out/'api').mkdir(exist_ok=True)
for name in ['index.php','lib.php','email.php','email-invitation.html']:shutil.copy2(ROOT/'server'/name,out/'api'/name)
(out/'.htaccess').write_text('''Options -Indexes
<IfModule mod_mime.c>
AddType application/manifest+json .webmanifest
</IfModule>
DirectoryIndex index.html
<FilesMatch "\\.(sql|md|json|zip|log|bak|ini)$">
Require all denied
</FilesMatch>
<IfModule mod_headers.c>
Header always set X-Content-Type-Options "nosniff"
Header always set Referrer-Policy "no-referrer"
Header always set X-Frame-Options "DENY"
Header always set Cache-Control "no-store"
</IfModule>
''')
# API helpers must not be called as independent entry points.
(out/'api'/'.htaccess').write_text('<FilesMatch "^(lib\\.php|email\\.php|email-invitation\\.html)$">\nRequire all denied\n</FilesMatch>\n')
for path in (ROOT/'server/pwa').rglob('*'):
    if path.is_file() and path.name != 'sw.js':
        target=out/path.relative_to(ROOT/'server/pwa');target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(path,target)
assets=sorted(p.relative_to(out).as_posix() for p in out.rglob('*') if p.is_file() and (p.suffix in ['.js','.css','.png','.svg','.webmanifest'] or p.name=='offline.html') and p.name!='sw.js')
version=hashlib.sha256(b''.join(p.encode()+(out/p).read_bytes() for p in assets)+(out/'index.html').read_bytes()+(ROOT/'server/pwa/sw.js').read_bytes()).hexdigest()[:16]
sw=(ROOT/'server/pwa/sw.js').read_text().replace('__BUILD_VERSION__',version).replace('__PUBLIC_ASSETS__',json.dumps(assets))
(out/'sw.js').write_text(sw)
package=ROOT/'dist'/'compas-hostgator.zip'
with zipfile.ZipFile(package,'w',zipfile.ZIP_DEFLATED) as z:
    for source,name in [(ROOT/'INSTALACION.md','INSTALACION.md'),(ROOT/'server/schema.sql','schema.sql'),(ROOT/'server/migration-suggestion-reviews.sql','migration-suggestion-reviews.sql'),(ROOT/'server/migration-catalog.sql','migration-catalog.sql'),(ROOT/'server/migration-catalog-notices.sql','migration-catalog-notices.sql'),(ROOT/'server/config.example.php','config.example.php')]:
        z.write(source,name)
    for path in sorted(out.rglob('*')):
        if path.is_file():z.write(path,path.relative_to(out.parent))
print(package)

# Frontend-only update: preserve the user's PHP/configuration on HostGator.
with zipfile.ZipFile(ROOT/'dist/compas-pwa-actualizacion.zip','w',zipfile.ZIP_DEFLATED) as z:
    for path in sorted(out.rglob('*')):
        if path.is_file() and 'api' not in path.relative_to(out).parts:
            z.write(path,path.relative_to(out.parent))
print(ROOT/'dist/compas-pwa-actualizacion.zip')

# Specific update with API and additive SQL migration; no configuration or user data.
with zipfile.ZipFile(ROOT/'dist'/'compas-catalogo-actualizacion.zip','w',zipfile.ZIP_DEFLATED) as z:
    z.write(ROOT/'server/migration-catalog.sql','migration-catalog.sql')
    z.write(ROOT/'server/migration-suggestion-reviews.sql','migration-suggestion-reviews.sql')
    z.write(ROOT/'server/migration-catalog-notices.sql','migration-catalog-notices.sql')
    for name in ['index.html','style.css','assets/vadecountry-logo.png','app.js','cloud.js','cloud.css','sw.js','api/index.php','api/lib.php','api/email.php','api/email-invitation.html','api/.htaccess']:
        z.write(out/name,'clases/'+name)
print(ROOT/'dist'/'compas-catalogo-actualizacion.zip')

# Class tools update: preserve the hosting's API entry point and private configuration.
with zipfile.ZipFile(ROOT/'dist'/'compas-clases-actualizacion.zip','w',zipfile.ZIP_DEFLATED) as z:
    for name in ['index.html','app.js','style.css','cloud.js','cloud.css','sw.js','api/lib.php']:
        z.write(out/name,'clases/'+name)
    z.writestr('ACTUALIZAR.txt','Actualización de herramientas de clase de Compás\n\nSube el contenido de clases/ a public_html/clases/, respetando api/lib.php.\nNo necesita SQL ni cambios en compas-config.php o api/index.php.\nRecarga la web o acepta la actualización de la PWA.\n\nIncluye sugerencias por grupo, playlist de MP3 locales, directorio opcional de alumnos con fichas e inscripciones múltiples, asistencia y resumen visual exportable.\nLos MP3 siguen siendo locales al dispositivo. Alumnos y asistencia se guardan en la cuenta y nunca se incluyen en el resumen para alumnos.\n')
print(ROOT/'dist/compas-clases-actualizacion.zip')
