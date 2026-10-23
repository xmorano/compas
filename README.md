# Compás
Aplicación personal para organizar clases de baile en línea. HTML, CSS y JavaScript sin dependencias de compilación.

## Abrir
Desde esta carpeta: `python3 -m http.server 8000`, y visita http://localhost:8000.

Incluye centros y grupos editables, horarios, objetivo de clases por trimestre, catálogo de coreografías con recursos, planificación por fecha, registro de bailes realizados y nuevas enseñanzas por grupo, notas, historial y resumen para compartir mediante el selector de WhatsApp. El enlace del grupo se puede guardar y abrir desde Centros. WhatsApp requiere seleccionar el destinatario y confirmar el envío.

Los datos iniciales son ejemplos. Los cambios se guardan en localStorage del navegador; el botón de descarga exporta una copia JSON. No hay servidor de datos, autenticación ni sincronización. Antes de publicar como servicio multiusuario hacen falta esas capas y copias de seguridad recuperables. Las fuentes de Google son opcionales; hay fuentes de sistema de respaldo.

## Importar coreografías
En Coreografías → Importar CSV puedes subir un archivo o pegar filas con cuatro columnas: `nombre coreo, link a clase, link a música, link a la hoja de la coreo`. El enlace a clase se guarda en Vídeo. Admite cabecera opcional, enlaces vacíos y valores entre comillas (incluidas comas y comillas escapadas). La vista previa muestra errores y duplicados por nombre; no importa ninguna fila hasta corregir los errores. Los duplicados se omiten y los datos no incluidos quedan pendientes.

## Envío directo a WhatsApp
Compás reutiliza el servicio de `~/Work/Eventos/whatsapp-service` en `http://127.0.0.1:3001`. Inícialo según su README y vincula WhatsApp si lo solicita. En Compartir resumen, elige un grupo de la lista: el destino se recuerda por centro/nivel. Revisa la vista previa y pulsa Enviar al grupo. El envío manual sigue disponible.

La integración consulta `/api/groups` y usa `/api/whatsapp/send` con un único evento cuyo título contiene el centro y nivel y cuya descripción contiene la fecha y las coreografías. No modifica el servicio de Eventos. No reintenta envíos automáticamente. Si se pierde la respuesta, comprueba el chat antes de repetir. El navegador debe ejecutarse en el ordenador donde corre el servicio; desde un móvil, 127.0.0.1 apunta al propio móvil.

## Edición multiusuario para HostGator

La edición local de esta carpeta se conserva. La versión online, preparada para `/clases`, está en `dist/clases` y en el paquete `dist/compas-hostgator.zip`. Consulta [INSTALACION.md](INSTALACION.md) para crear la base de datos, configurar el acceso y migrar tus datos.

Cada profesor tiene centros, cursos, clases y catálogo privados. El administrador publica un catálogo común y los profesores copian fichas a su propia lista para modificarlas de forma independiente. La edición online utiliza PHP/MySQL y WhatsApp manual. No se ha desplegado aún en ningún hosting.
