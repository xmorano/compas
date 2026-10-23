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
2. Entra en **Mi cuenta → Gestionar catálogo común**.
3. Marca las fichas que quieras ofrecer a los demás profesores, revisa autoría y enlaces y confirma la publicación.

Solo se publican datos de la coreografía, no centros, clases ni notas. Publicar de nuevo la misma ficha actualiza la entrada común; las copias ya importadas por profesores permanecen independientes. El catálogo común comienza vacío y no contiene datos ficticios.

Cada profesor entra en **Coreografías → Catálogo común**, selecciona las fichas y pulsa **Copiar a mi lista**. Las fichas ya copiadas (o con el mismo nombre normalizado) no se duplican. Las nuevas copias tienen identificadores privados diferentes.

## 7. Invitar profesores y recuperar accesos

En **Mi cuenta → Profesores e invitaciones**, escribe el correo y crea una invitación. Comparte el enlace en privado con esa persona. No se envía WhatsApp ni correo automáticamente. El invitado elige su contraseña y empieza con su espacio vacío.

Para recuperar una contraseña, el administrador crea un enlace de «Recuperar acceso». Al utilizarlo, se invalidan las sesiones anteriores de esa cuenta y se conservan sus datos. Un enlace nuevo invalida el anterior del mismo correo.

Guarda la contraseña del administrador en un gestor. Si se pierde el único acceso administrador, la recuperación requiere intervención del propietario del hosting sobre la base de datos; no existe un acceso maestro público. Esta beta no incorpora envío de correos, baja autoservicio ni gestión de suscripciones.

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
