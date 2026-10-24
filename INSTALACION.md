# Compás multiusuario en HostGator: /clases

Esta es una beta por invitación. La edición local sigue estando en la raíz del proyecto. La edición online se genera en `dist/clases` y se distribuye en `dist/compas-hostgator.zip`.

## Qué incluye

- Cuentas privadas por profesor: centros, cursos, clases, historial y catálogo propio.
- Catálogo común administrado: cada profesor copia las fichas que le interesan a su lista y puede editarlas. Editar o retirar una ficha común no modifica las copias privadas.
- Administración inicial, invitaciones y recuperación de contraseñas con enlaces de un uso que caducan en 48 horas. Los enlaces se comparten manualmente y no se envían correos automáticamente.
- Guardado online con control de versiones: si dos dispositivos editan a la vez, la segunda escritura se bloquea y se ofrece descargar los cambios antes de recargar. No hay fusión automática ni edición colaborativa.
- Exportación JSON e importación validada para migrar desde la versión local.
- Compartir por WhatsApp desde la cuenta del propio profesor. Esta edición no conecta con el servicio local de Eventos ni envía desde el WhatsApp del administrador.

## 1. Preparar el hosting

En cPanel, comprueba:

- Una versión mantenida de PHP 8.2 o posterior con `PDO` y `pdo_mysql`.
- MySQL con tablas InnoDB.
- HTTPS activo en el dominio.
- Espacio para crear una base de datos y un usuario independientes de tus otras webs.

No cambies la versión de PHP de las otras webs sin comprobar su compatibilidad. Si cPanel no permite elegir versión por carpeta, prueba primero bajo un dominio/subdominio con configuración compatible.

## 2. Crear la base de datos

En «MySQL Databases» o el asistente equivalente:

1. Crea una base, por ejemplo `TUUSUARIO_clases`.
2. Crea un usuario MySQL dedicado con contraseña larga.
3. Asócialo a esa base de datos. No le des acceso a bases de otras webs.
4. Abre phpMyAdmin, selecciona la base nueva e importa `server/schema.sql` (en el ZIP aparece como `schema.sql`).

La aplicación almacena el espacio completo de cada profesor como JSON en una fila privada, además de las tablas de usuarios, invitaciones y catálogo común. Es una implementación inicial con control de versiones; no está pensada para informes SQL complejos ni muchos editores simultáneos sobre la misma cuenta.

### Si aparece el error #1215 al crear compas_workspaces

Las columnas `compas_users.id` y `compas_workspaces.user_id` deben tener el mismo juego de caracteres y la misma intercalación. El esquema actualizado establece `utf8mb4_unicode_ci` explícitamente en ambas tablas.

Si la importación anterior falló en esta tabla, vuelve a importar el `schema.sql` actualizado: las tablas existentes se conservan con `CREATE TABLE IF NOT EXISTS`. No borres tablas ni desactives las claves foráneas.

Si sigue fallando, ejecuta `SHOW CREATE TABLE compas_users;` y comprueba la definición real: una tabla creada previamente no se modifica al volver a importar el esquema.

## 3. Crear la configuración privada

Copia `server/config.example.php` como **`compas-config.php` fuera de la carpeta pública**.

Ejemplo de estructura para un dominio cuyo DocumentRoot sea `/home/TUUSUARIO/public_html`:

```text
/home/TUUSUARIO/
  compas-config.php
  public_html/
    clases/
      index.html
      cloud.js
      api/
        index.php
        lib.php
      ...
```

Edita:

```php
return [
    'dsn' => 'mysql:host=localhost;dbname=TUUSUARIO_clases;charset=utf8mb4',
    'db_user' => 'TUUSUARIO_clases',
    'db_password' => 'TU_CONTRASEÑA_DE_MYSQL',
    'base_path' => '/clases',
    'setup_key' => 'UNA_CLAVE_ALEATORIA_LARGA_DISTINTA_DE_LA_CONTRASEÑA',
    'allow_insecure_local' => false,
];
```

Usa al menos 32 caracteres aleatorios para `setup_key`. Puedes generarlos con un gestor de contraseñas o, si tienes Terminal, con:

```sh
php -r 'echo bin2hex(random_bytes(32)), PHP_EOL;'
```

Permisos recomendados del archivo: `600`, si tu configuración de PHP lo permite. Nunca lo subas dentro de `public_html` ni compartas su contenido.

La API busca el archivo en el directorio padre del **DocumentRoot**. Para un dominio adicional cuyo DocumentRoot esté dentro de otra carpeta pública, esa ubicación podría ser pública: en ese caso guarda el archivo en `/home/TUUSUARIO/compas-config.php` y cambia `$configPath` al principio de `clases/api/index.php` por esa ruta absoluta privada. La variable de entorno `COMPAS_CONFIG` también permite indicar la ruta si el hosting la admite.

## 4. Subir los archivos

Descomprime `compas-hostgator.zip` en tu ordenador. Sube **solo el contenido de la carpeta `clases`** a `public_html/clases`.

No subas `tests`, bases de prueba, código fuente de configuración, SQL, copias JSON ni archivos personales al directorio web. Si extraes el ZIP desde cPanel, hazlo fuera de `public_html` y mueve únicamente la carpeta `clases`.

No hace falta Node.js, Composer ni compilar en el hosting. Las rutas son relativas, pensadas para `https://TU-DOMINIO/clases/`. No hay que modificar el `.htaccess` de tus otras webs. Si tienes reglas de redirección de WordPress u otra aplicación, verifica que no intercepten `/clases/api/index.php`.

## 5. Crear tu cuenta y migrar tus datos

1. Abre `https://TU-DOMINIO/clases/`.
2. Introduce tu nombre, correo, contraseña y la `setup_key` del archivo privado.
3. Solo la primera cuenta se crea como administrador; el alta inicial queda cerrada después.
4. Abre la versión local en el navegador donde tienes tus clases y pulsa el botón de descarga. Conserva ese JSON en lugar seguro.
5. En la versión online, entra en **Mi cuenta → Importar copia JSON**. Revisa el número de centros, cursos, coreografías y clases y confirma el reemplazo.
6. Comprueba tus datos y que el encabezado diga «Guardado en tu cuenta» antes de usar otro dispositivo.

El `localStorage` de `localhost` no se puede leer automáticamente desde tu dominio. Por eso la migración es mediante exportación e importación explícita.

## 6. Preparar el catálogo común

En tu cuenta de administrador:

1. Crea o importa las coreografías a tu catálogo privado (CSV o copia JSON).
2. Entra en **Administración → Catálogo común**.
3. Marca las fichas que quieras ofrecer a los demás profesores, revisa autoría y enlaces y confirma la publicación.

Solo se publican datos de la coreografía, no centros, clases ni notas. Publicar de nuevo la misma ficha actualiza la entrada común; las copias ya importadas por profesores permanecen independientes. El catálogo común comienza vacío y no contiene datos ficticios.

Cada profesor entra en **Coreografías → Catálogo común**, selecciona las fichas y pulsa **Copiar a mi lista**. Las fichas ya copiadas (o con el mismo nombre normalizado) no se duplican. Las nuevas copias tienen identificadores privados diferentes.

## 7. Invitar profesores y recuperar accesos

En **Administración → Profesores e invitaciones**, escribe el correo y crea una invitación. Comparte el enlace en privado con esa persona. No se envía WhatsApp ni correo automáticamente. El invitado elige su contraseña y empieza con su espacio vacío.

Para recuperar una contraseña, el administrador crea un enlace de «Recuperar acceso». Al utilizarlo, se invalidan las sesiones anteriores de esa cuenta y se conservan sus datos. Un enlace nuevo invalida el anterior del mismo correo.

Guarda la contraseña del administrador en un gestor. Si se pierde el único acceso administrador, la recuperación requiere intervención del propietario del hosting sobre la base de datos; no existe un acceso maestro público. Esta beta no incorpora baja autoservicio ni gestión de suscripciones.

## 8. Comprobaciones antes de invitar gente

- Crea dos profesores de prueba y verifica que cada uno ve únicamente sus datos.
- Copia una coreografía común y edítala en una cuenta: la otra cuenta y el catálogo común deben conservar sus fichas.
- Guarda una clase y abre la cuenta en otro dispositivo: debe aparecer.
- Prueba exportar/importar una copia en una cuenta de prueba.
- Abre dos pestañas y modifica ambas: el conflicto debe avisarse, nunca sobrescribirse silenciosamente.
- Verifica acceso por HTTPS y que los archivos privados no sean descargables.
- Confirma que WhatsApp abre el selector del teléfono del profesor y no tu cuenta.

## Copias y mantenimiento

Configura copias periódicas de la base de datos y los archivos con cPanel o el mecanismo disponible en tu plan; verifica también que se puedan restaurar en una base de prueba. La aplicación permite exportar cada cuenta, pero **no configura automáticamente copias del hosting**.

Las fotos se guardan como enlaces en esta versión. Los cambios sin conexión quedan pendientes en ese navegador, con un aviso visible; no es una aplicación offline completa. Si una operación queda sin confirmar, descarga tus cambios antes de recargar.

Antes de abrir el registro al público, define la política de privacidad, la gestión de bajas y solicitudes de datos, los límites de uso y el mantenimiento. Empieza con una beta por invitación.

## Desarrollo y pruebas

```sh
python3 tools/build.py
php -l server/index.php
php -l server/lib.php
```

Las pruebas automatizadas de API y navegador se ejecutan con PHP real y SQLite aislado en `tests/runtime`, por disponibilidad de herramientas locales. La producción usa MySQL; **falta ejecutar la comprobación final con las versiones de PHP/MySQL de tu HostGator**. No se han subido archivos ni cambiado ninguna web remota.

## Instalar Compás como aplicación en el móvil (PWA)

La edición online incluye manifest, iconos, un botón «Instalar en el móvil» y un service worker limitado a `/clases/`. No requiere Node.js ni cambios en la base de datos.

### Actualizar una instalación que ya funciona

Usa **`dist/compas-pwa-actualizacion.zip`**. Este paquete contiene solo archivos de la interfaz y la PWA: **no incluye `api/`, credenciales ni SQL**, por lo que conserva la ruta de configuración que hayas ajustado en `api/index.php`.

1. Descomprime el paquete y sube el contenido de su carpeta `clases` a tu carpeta web `/clases`, sustituyendo los archivos con el mismo nombre. No crees una segunda carpeta `/clases/clases`.
2. Incluye `manifest.webmanifest`, `sw.js`, `pwa.js`, `offline.html`, la carpeta `icons` y los archivos HTML, CSS y JavaScript que vienen en la actualización.
3. Incluye `.htaccess` si no lo has personalizado. Si tienes cambios propios, incorpora la declaración `AddType application/manifest+json .webmanifest` y conserva las restricciones y cabeceras existentes.
4. Abre la web por HTTPS, recarga y comprueba que aparece «Instalar en el móvil». Si mantienes una pestaña antigua, puedes necesitar una recarga completa la primera vez.

No vuelvas a importar el SQL ni a crear la cuenta de administrador para esta actualización. Tu base de datos se conserva.

### Instalar

- **Android / Chrome:** pulsa «Instalar Compás» si se ofrece, o usa el menú del navegador → «Instalar aplicación» / «Añadir a pantalla de inicio».
- **iPhone / iPad:** abre la web en Safari → Compartir → «Añadir a la pantalla de inicio». Activa «Abrir como app web» si aparece.
- **Ordenador:** utiliza el botón o la opción de instalación de Chrome/Edge, si está disponible.

El botón muestra instrucciones cuando el navegador no ofrece un diálogo de instalación. La disponibilidad y el texto exacto del menú dependen del navegador. Abre la web en un navegador completo, no en el navegador integrado de WhatsApp u otra aplicación. Al abrirla desde el icono puede pedirte iniciar sesión de nuevo.

### Conexión y privacidad

Es una **PWA instalable que necesita conexión para abrir las clases y guardar en la cuenta**. Si la abres sin conexión verás una pantalla informativa, no las clases almacenadas de otro acceso. No incorpora un modo de trabajo offline completo.

El service worker guarda solo una lista explícita de archivos públicos (scripts, estilos, iconos y pantalla sin conexión). Las respuestas de `/clases/api/`, los datos de profesores, las peticiones POST, recursos externos y otras webs del dominio no se guardan en esa caché. El mecanismo existente de recuperación de cambios pendientes sigue separado y asociado a cada cuenta.

### Actualizaciones

Cada ejecución de `python3 tools/build.py` calcula una versión a partir de los archivos públicos. Cuando cambian, la PWA avisa de que hay una actualización. El usuario puede posponerla o actualizar cuando haya guardado y cerrado sus formularios. No se fuerza una recarga mientras hay cambios pendientes. Otras pestañas abiertas también recibirán el aviso.

Para verificarlo desde un ordenador, abre las herramientas de desarrollo → Application/Aplicación → Manifest y Service Workers. El alcance del worker debe ser `/clases/`. En Cache Storage solo deben aparecer archivos públicos. Si falla el registro, comprueba HTTPS, que `sw.js` devuelve JavaScript y que las reglas de redirección de tu web no lo convierten en una página HTML.

Validado en Chrome automatizado. La instalación física en Android/iOS y el comportamiento de tu servidor Apache/HTTPS se deben comprobar tras subir los archivos a HostGator.

## Estados de una coreografía dentro de la clase

Cada pulsación avanza en este ciclo: sin marcar → check azul (planeada) → check verde (realizada) → sin marcar. El texto bajo la casilla también identifica el estado. Añadir una coreografía a la lista no la marca automáticamente como planeada.

Solo las verdes cuentan en el historial de realización, la primera enseñanza, los contadores de centros/niveles y el resumen de WhatsApp. Las marcas antiguas de realizada se conservan verdes; las entradas antiguas no realizadas se mantienen sin marcar. Al importar desde una clase anterior, las seleccionadas entran como planeadas en azul; una nueva ya realizada pasa a Repaso.

«Planear todas» marca en azul las que estaban sin marcar y conserva las verdes; «Todas realizadas» marca todas en verde; «Desmarcar todas» limpia ambos estados. La distinción se guarda con los datos de la clase y no requiere migrar la base de datos ni cambiar PHP. Para actualizar el hosting utiliza el paquete de interfaz `compas-pwa-actualizacion.zip`, conservando `api/` y tu configuración privada.

## Extras y hoja de pasos en la clase

Las fichas incluyen «Extras (restarts, tags…)», un texto opcional que se muestra en el catálogo privado y en cada clase que contiene esa coreografía. El enlace «Hoja de la coreografía» aparece en la clase cuando la ficha tiene una URL de hoja válida. Las notas de una clase siguen siendo independientes de estos extras generales.

Actualiza la interfaz con `compas-pwa-actualizacion.zip`; los extras privados se guardan con la API existente y no requieren SQL. Para que también se publiquen en el catálogo común, añade `'extras'` a la lista de campos permitidos en tu `clases/api/index.php`, en la línea que contiene `array_intersect_key` dentro de la acción `library`:

```php
['id','name','author','level','walls','counts','music','video','sheet','extras']
```

Haz solo ese cambio en el PHP que ya tienes funcionando para conservar tu ruta personalizada de configuración. El paquete completo ya incorpora la corrección, pero el ZIP de interfaz no sobrescribe archivos PHP.

## Texto enriquecido en Extras

El editor de Extras permite negrita, cursiva, subrayado, listas con viñetas o numeradas y enlaces HTTP/HTTPS. Selecciona el texto y utiliza la barra de formato; para un enlace, pulsa «Enlace» e introduce su dirección. «Sin enlace» elimina el vínculo de la selección.

El formato se conserva al guardar, exportar/importar copias y copiar desde el catálogo común. Los extras antiguos se interpretan como texto, incluso si contienen símbolos `<` o `>`. El formato se almacena en el mismo campo `extras`, con un marcador de versión; no requiere cambios de SQL ni de la API privada. Para publicar Extras en el catálogo común sigue siendo necesario que `'extras'` figure en la lista de campos permitidos descrita en el apartado anterior.

Sube todos los archivos de `clases` del ZIP de actualización, incluido `rich-extras.js`, y acepta la actualización de la PWA. No subas los archivos de la raíz del proyecto local. El editor y el renderizado eliminan etiquetas, atributos y protocolos de enlace no permitidos. Comprobado en Chrome; conviene comprobar también el formato desde Safari en el iPhone que utilices.

### Música MP3 en la tablet y PWA

En Android, abre la web en Chrome y pulsa **Instalar Compás**. Si Chrome no muestra el diálogo automático, el botón explica cómo instalar desde el menú del navegador. La web necesita HTTPS. Si ya está instalada, no hace falta reinstalarla.

En **Coreografías**, pulsa **Añadir MP3 local** y selecciona la canción. Se guarda una copia en el almacenamiento del navegador para esa cuenta y dispositivo, sin enviarla al servidor ni incluirla en las copias JSON. Después aparece **Reproducir**, junto con **Cambiar MP3** y **Quitar MP3**. En la lista de cada clase aparece automáticamente **Reproducir** para esa coreografía; la selección y gestión del archivo se hacen desde Coreografías. El reproductor permite pausar y avanzar; sigue sonando al marcar bailes o cambiar de vista. Quitar la copia no borra el archivo original.

La música permanece después de cerrar la app, pero borrar los datos del sitio elimina estas copias. Conserva los originales. Cada dispositivo necesita importar sus propios MP3; la capacidad depende del espacio disponible y del navegador. La app solicita almacenamiento persistente, cuya concesión depende del navegador. Con la clase ya abierta, el audio importado puede sonar sin conexión; abrir las clases y sincronizar sus cambios sigue necesitando conexión.

Para actualizar HostGator, sube el contenido de la carpeta `clases` de `dist/compas-pwa-actualizacion.zip` a `/clases/`. Este paquete no modifica PHP, configuración privada ni base de datos. No subas el `app.js` o `index.html` de la raíz del proyecto: pertenecen a la edición local.

El reproductor de MP3 local incluye **Velocidad**, ajustable del 50 % al 100 % en pasos de 5 %, manteniendo el tono mediante el navegador. Puedes cambiarla mientras suena la música y volver con **Normal (100 %)**. Cada vez que abres un nuevo reproductor empieza al 100 %; el archivo original no se modifica. Este control se aplica a los MP3 importados, no a los enlaces externos de música.


## Invitaciones por correo y consulta del administrador

En **Administración → Profesores e invitaciones**, el administrador introduce el nombre y correo del profesor. Compás envía un enlace de activación de un solo uso, válido 48 horas. Al abrirlo, el profesor confirma su nombre y crea su contraseña antes de entrar. No se envían contraseñas por correo. La cuenta se crea cuando se acepta la invitación.

En el archivo privado `compas-config.php`, configura `app_url` con la dirección HTTPS completa de Compás (por ejemplo, `https://tudominio.com/clases`) y `mail_from` con una cuenta de correo de tu dominio autorizada en el hosting. Se utiliza la función `mail()` de PHP del hosting. La aceptación del mensaje por el servidor no garantiza su entrega: comprueba el envío y la carpeta de spam en una cuenta real. Si falla el envío, la pantalla conserva el enlace para compartirlo en privado.

En la lista de profesores registrados, **Ver recursos** muestra centros, cursos, coreografías con sus enlaces y clases con su repertorio. Es una consulta de solo lectura disponible exclusivamente para administradores. Cada profesor sigue trabajando únicamente con sus propios datos.

Para actualizar una instalación existente, sube la interfaz del paquete `compas-pwa-actualizacion.zip` y **también `clases/api/index.php` del paquete completo**. Si habías ajustado la ruta privada de configuración dentro de ese PHP, conserva ese ajuste. Añade las dos opciones de correo al archivo privado. No es necesario cambiar el esquema SQL ni importar de nuevo la base de datos. El paquete de interfaz por sí solo no incorpora estas funciones del servidor.

## Novedades del catálogo y propuestas de profesores

Los avisos aparecen dentro de Compás al entrar y se consultan cada minuto mientras la aplicación está visible. No se envían correos ni notificaciones del teléfono por estas novedades.

- El aviso de coreografías nuevas abre el catálogo con **Solo coreografías nuevas** activado. Cada profesor puede seleccionar y copiar las fichas a su lista privada. Las copias mantienen su independencia.
- Las novedades se recuerdan por cuenta en el servidor, también entre dispositivos. Copiar una ficha la marca como vista; también se pueden marcar todas las novedades cargadas como vistas sin importarlas. Las fichas que se publiquen después seguirán pendientes. Al instalar esta actualización, las fichas existentes se consideran novedades hasta que cada usuario las marque como vistas. Editar una copia privada no genera novedades. Volver a publicar expresamente una ficha común sí genera un nuevo aviso, aunque conserve el mismo identificador.
- En **Coreografías → Propuestas al catálogo** o **Mi cuenta → Proponer coreografía / Mis propuestas**, el profesor selecciona una ficha privada y envía una propuesta. Se guarda una copia de su ficha en ese momento, sin centros ni clases. La lista muestra si está pendiente, publicada o descartada. Una misma ficha solo se puede proponer una vez.
- El administrador recibe un aviso con el número de propuestas pendientes. Desde él, o desde **Administración → Propuestas de profesores**, consulta nombre, correo y ficha de cada propuesta. Puede **Publicar en catálogo común** o **Descartar**. La publicación crea una entrada independiente y genera una novedad para los usuarios. Se rechaza una aprobación repetida y se evita publicar una propuesta con un nombre ya existente.

### Actualizar una instalación existente

1. En phpMyAdmin, selecciona la base de datos de Compás e importa **`migration-catalog.sql`** incluido en `dist/compas-catalogo-actualizacion.zip`. Añade dos tablas (`compas_library_seen` y `compas_suggestions`); no borra ni sustituye datos. No es necesario importar de nuevo el esquema completo.
2. Del mismo ZIP, sube el contenido de `clases/` a `public_html/clases/`, respetando las subcarpetas: `app.js`, `cloud.js`, `cloud.css`, `sw.js`, `api/index.php` y `api/lib.php`.
3. Si tu `api/index.php` tiene una ruta personalizada en `$configPath`, conserva ese ajuste. No sustituyas el archivo privado `compas-config.php`.
4. Recarga o acepta la actualización de la PWA. Comprueba el flujo con una cuenta de profesor y otra de administrador.

El SQL se importa desde el ordenador; no lo subas al directorio público. El ZIP de interfaz `compas-pwa-actualizacion.zip` por sí solo no basta para esta actualización. Una instalación nueva utiliza `schema.sql` del paquete completo, que ya incluye las dos tablas.


La publicación del catálogo común conserva en el servidor todas las fichas anteriores aunque una petición solo incluya la nueva selección. Publicar una ficha con el mismo identificador actualiza esa ficha; omitirla no la elimina. La tabla `compas_library` contiene una única fila cuyo campo `payload` guarda la lista completa: actualizar esa fila es normal.


## Versión visible y registro de cambios

El pie de la barra izquierda muestra el hash corto del commit de código utilizado para generar la web. El hash completo figura al pasar el ratón. Para actualizarlo en el hosting, sube `index.html`, `cloud.css` y `sw.js` de `dist/clases/`. El push a GitHub no despliega automáticamente en HostGator.

Cada cambio se registra con su motivo y se envía al remoto. Primero se hace commit del código, después se ejecuta `python3 tools/build.py` y se registran los paquetes en otro commit. La versión mostrada identifica el commit del código, no el de empaquetado, evitando una referencia circular. Una compilación con fuentes sin registrar añade el sufijo `-dev`.


## Ignorar novedades y volver a compartir

El administrador no recibe avisos de nuevas coreos del catálogo común; mantiene los avisos de propuestas de profesores pendientes. Cada publicación marca sus fichas como vistas para quien las publica.

En el catálogo común, cada ficha nueva tiene **Ignorar** y existe **Ignorar novedades visibles** para descartar en bloque las novedades que coinciden con la búsqueda y los filtros. Ignorar no importa ni elimina la ficha: permanece accesible desactivando **Solo coreografías nuevas**. La preferencia se guarda por usuario en el servidor y se mantiene entre dispositivos. Si se publica de nuevo esa misma ficha, vuelve a generar un aviso. Una pantalla abierta antes de esa nueva publicación no puede ocultarla por error al ignorar la versión anterior.

La publicación envía únicamente las fichas seleccionadas. El servidor conserva el resto del catálogo, sin generar nuevos avisos por las fichas que no se han vuelto a compartir. Las copias privadas existentes no se actualizan automáticamente.

Para actualizar una instalación que ya tenga avisos y propuestas:

1. Importa `server/migration-catalog-notices.sql` (también incluido en los ZIP completos y de catálogo) en la base de datos de Compás con phpMyAdmin. Solo añade `compas_library_receipts`; no borra datos. No subas el SQL al directorio público.
2. Sube `api/index.php`, `api/lib.php`, `cloud.js`, `cloud.css`, `index.html` y `sw.js` de `dist/clases/` a sus mismas rutas en `public_html/clases/`. Conserva cualquier personalización de `$configPath` en `api/index.php`.
3. Recarga la aplicación o acepta la actualización de la PWA.

Las instalaciones nuevas usan `schema.sql`. La migración general `migration-catalog.sql` también incluye la nueva tabla y puede ejecutarse sin borrar las existentes. Las marcas de visto de la versión anterior se respetan para las fichas antiguas hasta su próxima publicación.


El acceso **Administración** está en la navegación izquierda y solo se muestra a administradores. Agrupa profesores e invitaciones, catálogo común y propuestas. **Mi cuenta** conserva las opciones personales de contraseña, importación y cierre de sesión.


En la vista **Coreografías**, cada ficha de la edición online incluye un icono de compartir. Para el administrador abre una confirmación para publicar únicamente esa ficha en el catálogo común. Para los profesores abre una confirmación para sugerirla al administrador. Cancelar no publica ni envía nada. Las propuestas se revisan en **Administración → Propuestas de profesores**, donde figura quién la ha enviado, con su nombre y correo.


La aprobación y publicación del catálogo no dependen de la tabla de preferencias `compas_library_receipts`, porque el administrador no recibe avisos del catálogo. Si una operación falla, la transacción conserva la propuesta pendiente y el catálogo anterior. Los errores internos incluyen una referencia para buscarlos en `error_log`. Para administradores, una tabla de avisos ausente o archivos de API de versiones distintas muestran instrucciones concretas de actualización.


## Estados de coreografías y revisión de propuestas

Las fichas privadas muestran **Privada**, **Compartida**, **Copiada del catálogo**, **Propuesta pendiente**, **Propuesta publicada** o **Propuesta descartada**. El estado se consulta en el servidor para la cuenta actual, se actualiza al publicar o proponer y se refresca con los avisos. No se guarda como una etiqueta editable en la ficha privada. Si falla la consulta, se indica que el estado no está disponible.

En **Administración → Propuestas de profesores**, el administrador puede buscar por coreo, nombre o correo del profesor, y filtrar pendientes, publicadas, descartadas o todas. **Revisar y publicar** abre la ficha editable (nombre, autor, nivel, paredes, counts, enlaces y extras), junto con un comentario opcional para el profesor. La confirmación publica la ficha corregida, conserva el original privado y guarda la revisión. **Descartar con motivo** exige una explicación. El profesor ve el motivo o comentario en **Mis propuestas**, además de la ficha final publicada cuando esté disponible. Las propuestas revisadas en versiones anteriores conservan su estado aunque no tengan comentario ni ficha de revisión archivada.

### Actualizar esta mejora

1. Importa **`server/migration-suggestion-reviews.sql`** en la base de datos seleccionada en phpMyAdmin. Solo añade `compas_suggestion_reviews` y no borra datos. También se incluye en `dist/compas-catalogo-actualizacion.zip`.
2. Sube `api/index.php`, `app.js`, `cloud.js`, `cloud.css`, `index.html` y `sw.js` de `dist/clases/` a las mismas rutas en el hosting. Conserva el ajuste privado de `$configPath` si lo habías personalizado.
3. Recarga la web o acepta la actualización PWA. Comprueba una publicación corregida y un descarte con dos cuentas distintas.

No subas el SQL a la carpeta pública. Para instalaciones nuevas, `schema.sql` ya contiene la tabla de revisiones. Los estados pueden consultarse sin esta tabla, pero la lista y revisión de propuestas requieren completar la migración.


## Correo de bienvenida de Compás

Las nuevas invitaciones usan el texto aprobado de bienvenida, con presentación de Compás, las funciones disponibles, botón para crear contraseña, caducidad de 48 horas y firma VaDeCountry. Se envían como `multipart/alternative`: incluyen una versión de texto y otra HTML con estilos integrados. El logo se carga desde `assets/vadecountry-logo.png` en la dirección pública de Compás; el contenido y el botón siguen siendo utilizables si el lector bloquea imágenes.

La recuperación de contraseña conserva su mensaje específico. El remitente sigue siendo `mail_from` del archivo privado: esta mejora no cambia el transporte de correo ni sus credenciales. Si falla la generación o el envío, Compás sigue mostrando el enlace para compartirlo en privado.

Para instalar esta plantilla, sube de `dist/clases/` a sus mismas rutas en el hosting: `api/index.php`, **`api/email.php`**, **`api/email-invitation.html`**, `api/.htaccess`, `index.html` y `sw.js`. Conserva el ajuste de `$configPath` en `api/index.php`. No requiere SQL ni cambios en `compas-config.php`. Los archivos de plantilla se incluyen en el paquete completo y el de catálogo, pero no en el ZIP de interfaz.

La prueba `php tests/email_test.php` construye y comprueba el mensaje MIME sin enviar correos. Comprueba el resultado final con una nueva invitación en un buzón real tras actualizar el hosting.


## Gestión visual del catálogo común

**Administración → Catálogo común** abre una pantalla completa con tarjetas compactas, contador de publicadas y sin publicar, búsqueda por nombre o autor y filtros **Todas**, **Publicadas**, **Sin publicar** y **Retiradas**. Incluye tanto las fichas del catálogo común (también las propuestas aprobadas de profesores) como las fichas privadas del administrador disponibles para publicar. Las fichas ya presentes se agrupan por identificador de origen para no duplicarlas.

Cada tarjeta permite **Publicar** o **Despublicar**. Se pueden seleccionar varias, usar **Marcar visibles** / **Desmarcar todas** y aplicar **Publicar selección** o **Despublicar selección**. La publicación por lotes solo afecta a las seleccionadas sin publicar, y la retirada solo a las publicadas. Antes de guardar se muestra una confirmación con la lista de fichas afectadas. **Actualizar** recarga el catálogo; si otra sesión lo ha cambiado, se rechaza el guardado antiguo para evitar sobrescribir cambios.

Despublicar conserva la ficha archivada para que el administrador pueda volver a publicarla. Los profesores dejan de verla en el catálogo y sus avisos, pero conservan sus copias privadas y sus clases. Volver a publicarla mantiene su identificador y genera un aviso nuevo; no actualiza automáticamente las copias que ya tienen los profesores. Publicar otras fichas no reactiva las retiradas.

No requiere migración SQL: el estado se almacena dentro del catálogo existente. Las fichas antiguas se consideran publicadas. Para actualizar, sube de `dist/clases/`: `api/index.php`, `api/lib.php`, `app.js`, `cloud.js`, `cloud.css`, `index.html` y `sw.js`. Conserva el ajuste de `$configPath` en `api/index.php` si lo tienes personalizado.

## Herramientas de preparación y seguimiento de clases

En cada clase aparecen **Lista de reproducción**, **Asistencia** y **Resumen para alumnos**, además del desplegable **Sugerencias para preparar esta clase**.

### Sugerencias del grupo

Se basan exclusivamente en clases anteriores del mismo grupo (incluidas las de otro trimestre). Priorizan fichas planeadas sin realizar en su última aparición, coreos enseñadas en las dos clases anteriores y coreos enseñadas que llevan al menos 21 días sin bailarse. No usan clases futuras ni de otros grupos. Se muestran hasta ocho sugerencias con el motivo y se omiten las que ya están en la clase. Al añadir una, se marca como planeada, pendiente de realizar; si ya fue enseñada se propone como repaso. No modifica automáticamente el historial ni los estados de realizado.

### Lista de reproducción por clase

Muestra las coreografías en el orden guardado de esa clase y permite subirlas y bajarlas. El orden se guarda al moverlas; la vista de trabajo habitual conserva su orden alfabético. **Reproducir MP3 disponibles** reproduce en secuencia las copias locales del dispositivo, con controles anterior/siguiente, avance al terminar, pausa y velocidad. Los elementos sin MP3 local se omiten y se informa del número. Los enlaces de música se abren aparte; no se descargan ni se convierten vídeos. Al arrancar la lista se cierra el diálogo para poder usar el reproductor mientras trabajas en la clase. Cerrar el reproductor detiene y limpia la cola.

### Alumnos y asistencia

En **Alumnos**, disponible en el menú izquierdo, puedes activar opcionalmente la gestión, crear una ficha por persona y asignarla a varios grupos o centros. Las fichas admiten nombre, teléfono, correo, foto, nivel y notas; solo el nombre es obligatorio. Cada grupo admite hasta 1000 alumnos y la cuenta hasta 5000. Desactivar un alumno conserva su asistencia anterior. También se accede con el grupo filtrado desde **Centros y grupos → Alumnos** o **Asistencia → Gestionar alumnos**.

En cada clase se registran **Presente**, **Ausente**, **Justificada** o **Sin marcar**. Sin marcar no se interpreta como ausencia. Hay controles para todos presentes o limpiar las marcas. El historial de un alumno muestra su asistencia y las coreografías nuevas realizadas en esas clases; permite identificar qué enseñanzas se perdió. Cambiar el grupo de una clase limpia su asistencia, con aviso en el formulario, para evitar mezclar alumnos. Eliminar un centro elimina sus grupos y clases, y quita esas inscripciones de los alumnos, pero conserva sus fichas y sus inscripciones en otros centros.

Los alumnos se guardan en la lista opcional `students` del JSON privado y la asistencia en `sessions[].attendance`; las copias antiguas sin esos campos siguen siendo válidas. La API valida identificadores, estados, duplicados y que el alumno pertenezca al grupo de la clase. Se incluyen en las copias de seguridad y al importarlas, pero nunca se publican en el catálogo común.

### Resumen visual para alumnos

**Resumen para alumnos** permite elegir entre las coreografías realizadas. La vista previa agrupa **Aprendimos**, **Repasamos** y **Bailamos**, con enlaces válidos a vídeo, música y hoja de pasos. Incluye WhatsApp (el usuario elige destinatario y confirma), copiar texto, descargar un HTML independiente y abrir una versión de impresión para guardar como PDF desde el navegador. El HTML conserva los enlaces y puede compartirse como archivo; no crea una página pública ni un enlace de acceso a la cuenta.

No incluye nombres de alumnos, asistencia ni notas privadas. No adjunta ni publica los MP3 locales. Las coreografías solo planeadas quedan fuera del resumen. El envío clásico anterior de WhatsApp sigue disponible.

### Actualizar estas cuatro mejoras

Usa **`dist/compas-clases-actualizacion.zip`**: sube su carpeta `clases/` a `/public_html/clases/`, respetando las subcarpetas. Contiene `app.js`, `style.css`, `cloud.js`, `cloud.css`, `index.html`, `sw.js` y **`api/lib.php`**. No requiere SQL ni sustituir `api/index.php` o la configuración privada. Es imprescindible actualizar `api/lib.php` para que el servidor acepte y conserve alumnos y asistencia. Después recarga o acepta la actualización de la PWA.


## Alumnos opcionales y fichas compartidas entre grupos de la misma cuenta

La sección **Alumnos** aparece en el menú izquierdo de cada profesor. La gestión está desactivada inicialmente para cuentas sin alumnos; pulsa **Activar gestión de alumnos** para empezar. Si ya había alumnos registrados con la versión anterior, la gestión sigue activa y conserva sus identificadores y asistencias. **Desactivar gestión de alumnos** oculta la asistencia y accesos de alumnos en grupos y clases, sin borrar datos. La organización de coreos, clases, música y resúmenes funciona igualmente sin activar alumnos.

Cada alumno tiene una ficha única dentro de la cuenta del profesor, con nombre (obligatorio), teléfono, correo, foto, nivel, notas privadas y estado activo/inactivo. Puede no tener inscripciones o pertenecer a varios grupos del mismo centro o de centros distintos. Las personas no se comparten automáticamente entre profesores.

La pantalla permite buscar por nombre, teléfono, correo o nivel, y filtrar por grupo, sin inscripciones y activos/inactivos. El editor de cada ficha tiene una lista de grupos con selección múltiple. Al filtrar un grupo, **Gestionar inscripciones del grupo** permite inscribir personas que ya existen sin crear nuevas fichas, conservando sus otras inscripciones. Retirar una inscripción mantiene las marcas de asistencia anteriores y el historial. Cada clase continúa registrando su propia asistencia: la misma persona puede estar presente en varias clases o centros el mismo día.

La foto admite enlace HTTP/HTTPS o archivo JPG/PNG/WebP de hasta 8 MB. Al subirla, el navegador la reduce a un máximo de 256 píxeles y la convierte a JPEG antes de guardarla en el JSON privado (máximo 150 KB por imagen codificada). Los enlaces externos dependen de que la imagen siga disponible. Las fichas y fotos se incluyen en las copias JSON; no aparecen en el catálogo común ni en los resúmenes para alumnos.

El JSON acepta `studentsEnabled` como preferencia opcional y perfiles con `groups` y `pastGroups` para inscripciones actuales e históricas. Se siguen leyendo perfiles antiguos con `group` único; al editarlos pasan al formato múltiple. El historial abarca todas las clases con asistencia de esa persona y muestra el centro/grupo. No hace falta migrar SQL.

Para instalar, usa **`dist/compas-clases-actualizacion.zip`** o sube sus archivos de `clases/` a las mismas rutas: `index.html`, `app.js`, `style.css`, `cloud.js`, `cloud.css`, `sw.js` y **`api/lib.php`**. No se modifica la configuración privada ni `api/index.php`. Actualiza la interfaz y la validación del servidor juntas para conservar los campos de las fichas y las inscripciones múltiples.


## Fotos de centros por archivo o URL

Al crear o editar un centro, puedes poner la **URL de la foto** o usar **Subir una foto**. Se muestra una vista previa y **Quitar foto** permite dejar el centro sin imagen. Puedes sustituir una imagen subida por una URL, o una URL por otra imagen. Los cambios se aplican al guardar; cancelar conserva la foto anterior.

Se admiten JPG, PNG y WebP de hasta 8 MB. El navegador reduce la imagen a un máximo de 768 píxeles (y, si hace falta, menos) y la convierte a JPEG antes de guardarla, con un máximo de 300 KB codificados. Se guarda en el JSON privado del centro, se sincroniza con la cuenta y se incluye en las copias de seguridad. No necesita carpetas de subida ni permisos nuevos en el hosting. Las URL HTTP/HTTPS existentes siguen funcionando.

Para actualizar, sube de `dist/clases/`: **`app.js`**, **`style.css`**, **`api/lib.php`**, `index.html` y `sw.js`; también están en `dist/compas-clases-actualizacion.zip`. No requiere SQL ni tocar la configuración privada. Actualiza la interfaz y `api/lib.php` juntas para que el servidor acepte la foto subida.


## Niveles personalizados por profesor

En **Nueva/Editar coreografía → Nivel** puedes elegir uno existente o **Crear otro nivel…**. Se pide el nombre y se incorpora a tu lista al guardar la ficha. Cancelar no crea el nivel. Se conservan los tres iniciales y se reconocen los niveles ya utilizados en fichas y grupos antiguos; no se cambian al abrir y guardar el editor. Los nombres se normalizan para evitar duplicados por mayúsculas, acentos o espacios. Se admiten hasta 500 niveles personalizados, de 1 a 120 caracteres. También aparecen como opciones al crear o editar grupos.

La lista se guarda en `customLevels` dentro del JSON privado de cada cuenta y se incluye en las copias de seguridad. No se comparte automáticamente con otros profesores. Las copias antiguas sin este campo siguen funcionando.

Al seleccionar coreos para copiar del catálogo común, si su nivel no existe en tu lista aparece una propuesta: **Añadir ese nivel** o **Usar uno existente**. La elección se aplica solo a tu copia y los niveles nuevos se guardan al confirmar la importación. No se modifica el original común. Puedes asociar cada nivel entrante a uno distinto.

Al publicar una coreo privada, individualmente o por lotes desde la gestión del catálogo, también se proponen los niveles que todavía no se usan en el catálogo común. Puedes mantenerlos como nuevos o asociarlos a uno existente. La ficha privada conserva su nivel. Al aprobar una propuesta de profesor, el editor sugiere crear su nivel si aún no existe; el administrador puede aceptarlo, cambiar el nombre o elegir otro nivel. El profesor mantiene su ficha original. Los niveles del catálogo común se obtienen de sus fichas, incluidas las retiradas para poder republicarlas.

Para actualizar, sube de `dist/clases/`: **`app.js`**, **`cloud.js`**, **`style.css`**, **`api/lib.php`**, `index.html` y `sw.js`; también se incluyen en **`dist/compas-clases-actualizacion.zip`**. No requiere SQL ni cambiar `api/index.php` o configuración privada. Es necesario actualizar `api/lib.php` para conservar la lista privada de niveles.
