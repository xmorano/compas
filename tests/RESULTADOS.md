# Validación de la beta multiusuario

Validado localmente con PHP 8.5, PDO SQLite y Chrome real automatizado.

- API: creación de administrador, invitación de un uso, permisos, aislamiento por profesor, catálogo común, copias privadas, rechazo de versiones antiguas, integridad de referencias, CSRF, recuperación de acceso y cierre de sesión.
- Navegador: acceso, guardado y recarga, invitaciones, separación de datos, copia y edición independiente de coreografías, prevención de duplicados y cierre.
- Flujos: importación de copia con centros/cursos/clases, WhatsApp manual sin conexión al servicio local, edición de cursos, publicación de catálogo común y conflicto recuperable entre dispositivos.
- Sintaxis: PHP y JavaScript del paquete.
- Empaquetado: sin datos personales, bases de prueba ni credenciales.

Pendiente: ejecutar el SQL y las pruebas de instalación sobre PHP/MySQL del HostGator del usuario; no hay credenciales ni despliegue remoto. El servidor temporal de pruebas se ha detenido.

## PWA instalable

Validado en Chrome automatizado: manifiesto sin errores de instalabilidad, iconos PNG válidos, alcance /clases, caché limitada a archivos públicos, respuestas privadas y API no cacheadas, pantalla genérica sin conexión, actualización con consentimiento, bloqueo de actualización con cambios pendientes y conservación de cachés de otras aplicaciones. Captura de móvil revisada.

La instalación nativa en teléfonos Android/iOS y los tipos MIME del HostGator remoto siguen pendientes de comprobación tras desplegar. El paquete compas-pwa-actualizacion.zip no incluye API, SQL ni configuración privada.

## Novedades y propuestas del catálogo (23 de octubre de 2026)

Comprobado en Chrome real con API simulada (`tests/catalog_notifications_test.cjs`): aviso de novedades, filtro de nuevas fichas, copia privada, retirada del aviso, propuesta de profesor, identificación del autor, aprobación y escape de contenido HTML. Sintaxis JavaScript y generación de paquetes comprobadas.

Se han ampliado `tests/api_test.py` y `tests/prepare.php` para comprobar novedades por cuenta, versiones publicadas, CSRF, aislamiento de propuestas, selección exclusiva de fichas propias, aprobación única, descarte e independencia de las copias. Estas nuevas pruebas de API no se han ejecutado en esta sesión: el entorno no dispone de PHP. Sigue pendiente la validación de integración PHP/MySQL y la ejecución de la migración en el hosting. Esta actualización no se ha desplegado.


## Ignorados por publicación (23 de octubre de 2026)

Prueba en Chrome con API simulada superada: ignorar una novedad, ignorar las visibles, conservación en el catálogo completo, reaparición al volver a compartir e importación independiente posterior. La prueba existente de propuestas y revisión también pasa. Sintaxis JavaScript y Python comprobadas. Las pruebas de API ampliadas cubren aislamiento de ignorados, rechazo de versiones futuras, CSRF y mantenimiento del aviso ante una confirmación de una publicación anterior; no ejecutadas por falta de PHP en el entorno. La integración PHP/MySQL en hosting sigue pendiente.


## Estados y revisión de propuestas (23 de octubre de 2026)

Chrome real con API simulada: edición de la ficha pública antes de confirmar, conservación de la ficha privada, comentario en el historial, rechazo del formulario de descarte sin motivo, visualización del motivo guardado y etiquetas de estado actualizadas. También siguen pasando los escenarios anteriores de avisos, ignorados, navegación por rol y publicación individual. Se han ampliado las pruebas de API para ficha corregida, comentarios y estados de propuestas pendientes, aceptadas y descartadas; no ejecutadas por falta de PHP en este entorno. Pendiente probar la migración y las transacciones con PHP/MySQL en hosting.


## Plantilla de invitación (23 de octubre de 2026)

Vista previa HTML comprobada en Chrome a 800 y 390 píxeles, con botón de activación y sin desbordamiento horizontal. Se ha preparado `tests/email_test.php` para comprobar las partes de texto y HTML, los enlaces, el escape del nombre y los delimitadores MIME sin enviar mensajes. No ejecutada por falta de PHP en el entorno. Pendiente comprobar el mensaje recibido en clientes de correo reales; no se han enviado correos desde esta sesión.


## Gestión visual y retirada del catálogo (23 de octubre de 2026)

Chrome con API simulada (`tests/catalog_manager_test.cjs`): vista completa, filtros, selección, cancelación sin escritura, retirada por lotes, republicación de una ficha externa, publicación múltiple y ausencia de desbordamiento en móvil y escritorio. Revisada captura móvil. La prueba anterior de avisos, estados, propuestas y acciones por rol sigue pasando. Las pruebas de API se amplían con retirada exclusiva de admin, CSRF, conflictos de versión, conservación de copias privadas y nuevo aviso tras republicar; pendientes de ejecución por falta de PHP en el entorno. Sigue pendiente la integración PHP/MySQL en hosting.

## Preparación, reproducción, asistencia y resumen (23 de octubre de 2026)

Prueba real local en Chrome (`tests/class_tools_test.cjs`) con IndexedDB y MP3 generado: sugerencias por grupo sin futuras, prioridad de pendientes y adición sin marcar realizadas; alta de alumnos, asistencia e historial de enseñanzas perdidas; orden de playlist persistido, omisión de audio ausente, reproducción y avance automático/anterior; resumen limitado a realizadas con hoja de pasos y sin nombres de alumnos ni notas; restauración ante fallo de guardado y conservación tras recargar. Regresión de música individual superada, incluida persistencia, velocidad, aislamiento por cuenta, borrado e instalabilidad PWA. Siguen pasando últimas actividades, gestión de catálogo y propuestas con API simulada.

Las pruebas de API incluyen alumnos y asistencia opcionales, referencias al grupo, rechazo de duplicados/estados inválidos y aislamiento por cuenta. No ejecutadas por falta de PHP en este entorno; pendiente validar guardado PHP/MySQL en el hosting tras actualizar `api/lib.php`. No se han enviado mensajes a alumnos ni generado páginas públicas.


## Directorio opcional de alumnos (23 de octubre de 2026)

Chrome real (`tests/students_test.cjs`): controles de asistencia ocultos antes de activar, ficha con teléfono/correo/nivel/notas y foto subida y reducida, una persona en dos centros sin duplicación, asistencia en ambos grupos, retirada/reinscripción sin perder historial, desactivar/reactivar sin borrar datos, recarga, compatibilidad con perfiles antiguos y vista móvil sin desbordamiento. Siguen pasando herramientas de clase, música local, propuestas y catálogo. Pruebas API ampliadas para múltiples inscripciones, antiguas inscripciones con asistencia, fotos/correos inválidos y preferencia opcional; pendientes de ejecución por falta de PHP. Validación PHP/MySQL y recepción de los datos nuevos pendiente en hosting tras subir `api/lib.php`.


## Fotos de centros (23 de octubre de 2026)

Chrome real (`tests/center_photos_test.cjs`): alta con imagen subida, conversión a JPEG, vista previa, conservación tras recarga, sustitución por URL y por otro archivo, cancelar sin sobrescribir, quitar foto y diseño sin desbordamiento móvil. Regresión de fichas y fotos de alumnos superada. Pruebas API ampliadas para datos de imagen, URL, retirada y rechazo de SVG, esquemas inseguros, base64 inválido y exceso de tamaño; pendientes de ejecución por falta de PHP. Falta verificar el guardado PHP/MySQL en hosting tras subir `api/lib.php`.


## Niveles personalizados (24 de octubre de 2026)

Chrome real (`tests/custom_levels_test.cjs`): crear, guardar y recuperar un nivel tras recargar; evitar duplicados por acentos/mayúsculas; cancelación sin crear; conservación de extras y nivel al editar; selección del nuevo nivel en grupos; aislamiento entre espacios. Con API de intercambio simulada: propuesta de niveles al copiar, asociación a uno existente o creación, publicación con mapeo sin cambiar el original privado y revisión de un nivel propuesto. Regresiones de catálogo y revisión superadas. Pruebas API ampliadas para persistencia, aislamiento y límites de la lista opcional `customLevels`; pendientes por falta de PHP en el entorno. Falta verificar el guardado PHP/MySQL en hosting con `api/lib.php` actualizado.


Actualización 2026-10-24: aceptar una propuesta la guarda en el catálogo común como «Aceptada · sin publicar». Solo «Publicar» la ofrece a los profesores y genera avisos. Las tarjetas muestran quién la propuso y quién la publicó. El administrador puede copiar también los borradores a su lista privada; al copiar se limpian los filtros de coreografías. No requiere migración SQL. Subir también `api/index.php` y `api/lib.php`. Pruebas de navegador con API simulada superadas; integración PHP/MySQL pendiente (PHP no instalado en este entorno).


2026-10-24: extras enriquecidos en propuestas compartidas, historial y consulta de recursos del profesor. La revisión usa el editor con formato. Prueba de navegador con API simulada: HTML permitido, eliminación de etiquetas peligrosas, texto plano escapado y conservación del formato al aceptar.


2026-10-24: corregido el acceso «Catálogo común» para administradores: abre la gestión completa e incluye propuestas aceptadas sin publicar. Tras aceptar se abre esa gestión directamente. Pruebas de navegador con API simulada superadas: navegación tras aceptar, tarjeta de borrador visible con procedencia y acción Publicar, y conservación de la consulta de historial.


2026-10-24: las publicaciones no se ofrecen al profesor que propuso la coreografía ni generan avisos para él; los demás profesores siguen recibiéndolas. Se conserva la procedencia también en propuestas antiguas con identificador de sugerencia. Las tarjetas y el selector del catálogo muestran «Compartida por»; actualizar los estados ya no borra la procedencia del catálogo administrado. Subir `cloud.js`, `index.html`, `sw.js`, `api/index.php` y `api/lib.php` desde `dist/clases/`. Sin migración SQL. Pruebas de interfaz con API simulada superadas; integración PHP/MySQL pendiente porque no hay PHP instalado.


2026-10-24: el catálogo reconstruye las propuestas aceptadas cuya ficha falte a partir del historial de revisión, conservando la ficha corregida y la procedencia. Las recuperadas aparecen como aceptadas sin publicar solo en la gestión del administrador; no se cambian entradas existentes ni se generan avisos. La siguiente escritura del catálogo conserva también las recuperadas. Sin migración SQL. Actualizar `api/lib.php`, `index.html` y `sw.js` desde `dist/clases/`. Pruebas de navegador con API simulada superadas; prueba de recuperación `tests/catalog_recovery_test.php` preparada, no ejecutada por falta de PHP/PDO en este entorno. La causa en producción sigue sin confirmar al no tener acceso a sus datos ni versión desplegada.
