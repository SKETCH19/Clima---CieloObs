# Clima---CieloObs

Aplicación web para registrar observaciones del cielo desde el navegador, con persistencia local, grabación de audio, captura de foto, GPS y modo instalable.

## Estructura

- `index.html`: shell principal de la app.
- `assets/css/styles.css`: estilos y layout.
- `assets/js/app.js`: estado, persistencia y comportamiento.
- `public/manifest.webmanifest`: configuración instalable.
- `public/sw.js`: service worker para cache básico.
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