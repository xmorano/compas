# Flujo de trabajo de Compás

- Después de cada cambio solicitado, crea un commit con una descripción de lo cambiado y el motivo, y haz push al remoto configurado. No publiques credenciales, datos personales ni archivos de pruebas temporales.
- Genera los paquetes de distribución antes de finalizar. La web muestra al pie de la barra izquierda el hash corto del commit de código usado para generar la distribución.
- Registra primero el código fuente; después ejecuta `python3 tools/build.py` y registra los artefactos generados en un segundo commit. El commit de empaquetado no cambia la versión del código mostrado. Haz push de ambos commits.
- Si falla el push, informa del error y conserva los commits locales; no fuerces el push.
