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
