# Clima---CieloObs

Aplicación web para registrar observaciones del cielo desde el navegador, con persistencia local, grabación de audio, captura de foto, GPS y modo instalable.

## APK para Android

El proyecto queda preparado para generar un APK de Android usando Capacitor y GitHub Actions.

### Opción rápida: instalarla ya en tu teléfono

Como esta app ya es una PWA, en Android también puedes abrirla en Chrome y usar `Agregar a pantalla de inicio` para instalarla sin APK.

### Generar un APK desde GitHub

1. Sube estos cambios a tu repositorio en GitHub.
2. En GitHub, entra en la pestaña `Actions`.
3. Ejecuta el workflow `Android APK` o haz un push a `main`.
4. Cuando termine, descarga el artefacto `cieloobs-debug-apk`.
5. Copia `app-debug.apk` a tu teléfono Android e instálalo permitiendo orígenes desconocidos si el sistema lo pide.

### Notas

- El APK generado por defecto es de depuración (`debug`), útil para instalarlo manualmente en tu teléfono.
- El identificador Android configurado es `com.sketch19.cieloobs`.
- Para publicar en Play Store después habría que generar una versión firmada (`release`).

## Estructura

- `index.html`: shell principal de la app.
- `assets/css/styles.css`: estilos y layout.
- `assets/js/app.js`: estado, persistencia y comportamiento.
- `public/manifest.webmanifest`: configuración instalable.
- `public/sw.js`: service worker para cache básico.
- `capacitor.config.json`: configuración de empaquetado Android con Capacitor.
- `.github/workflows/android-apk.yml`: workflow para generar un APK descargable.
- `package.json`: scripts para desarrollo y build.

## Desarrollo

1. Instala dependencias:

	`npm install`

2. Inicia la app en desarrollo:

	`npm run dev -- --host 0.0.0.0`

3. Genera build de producción:

	`npm run build`

4. Previsualiza la build:

	`npm run preview -- --host 0.0.0.0`

## Funcionalidades actuales

- Registro de observaciones con fecha, hora, categoría y descripción.
- Captura de ubicación por GPS.
- Adjuntar foto desde el dispositivo.
- Grabación y reproducción de nota de voz.
- Persistencia en `localStorage`.
- Filtros, estadísticas y vista de detalle.
- Instalación como app web en dispositivos compatibles.