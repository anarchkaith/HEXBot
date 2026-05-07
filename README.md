# HEX - Bot de reportes para Discord

Bot de Discord para gestionar reportes con evidencia, aprobacion/rechazo por staff, listado Most Wanted y almacenamiento local de pruebas.

## 1. Funcionalidades principales

- Comando `/report` para reportar usuarios con hasta 5 archivos de evidencia.
- Validacion de tipo de archivo (imagen o video).
- Limite de tamano por archivo: 25 MB.
- Cooldown por usuario: 1 minuto entre reportes.
- Flujo de moderacion con botones de staff: aceptar o rechazar.
- Rechazo con motivo obligatorio mediante modal.
- Publicacion en canal Most Wanted al aceptar un reporte.
- Registro de auditoria en canal de logs.
- Guardado local de evidencia en carpeta por usuario.
- Comando `/mwlist` para ver el ranking Most Wanted.

## 2. Requisitos

- Node.js 18 o superior
- npm 9 o superior
- Un bot de Discord creado en el Developer Portal
- Bot agregado a tu servidor con permisos suficientes

## 3. Instalacion

1. Instala dependencias:

```bash
npm install
```

2. Crea o edita el archivo `.env` en la raiz del proyecto con estas variables:

```env
DISCORD_TOKEN=TU_TOKEN
DISCORD_CLIENT_ID=TU_CLIENT_ID
DISCORD_GUILD_ID=TU_GUILD_ID
DISCORD_REPORT_CHANNEL_ID=TU_CANAL_REPORTES
DISCORD_MOST_WANTED_CHANNEL_ID=TU_CANAL_MOST_WANTED
DISCORD_LOGS_CHANNEL_ID=TU_CANAL_LOGS
DISCORD_STAFF_ROLE_ID=TU_ROL_STAFF
WANTED_FOLDER=wanted_reports
API_PORT=3001
API_SECRET=UN_TOKEN_LARGO_Y_SECRETO
KAITH_API_BASE_URL=https://api.kaithsrebels.com
KAITH_AI_GENERATE_ENDPOINT=/api/generate
KAITH_AI_CHAT_ENDPOINT=/api/ia-chat
KAITH_AI_REPORT_CORRELATION_ENDPOINT=/api/ia-report-correlation
KAITH_AI_USER=TU_USUARIO
KAITH_AI_PASSWORD=TU_PASSWORD
KAITH_AI_MODEL=qwen2.5:latest
KAITH_AI_CHAT_TIMEOUT_MS=120000
KAITH_AI_CORRELATION_TIMEOUT_MS=120000
```

## 4. Arranque del bot

Si quieres usar `npm run start`, agrega esto a `package.json`:

```json
{
  "scripts": {
    "start": "node bot.js"
  }
}
```

## 5. Comandos disponibles y uso

### `/report`

Crea un reporte para revision del staff.

Parametros:

- `username` (obligatorio): nombre del usuario reportado.
- `reason` (obligatorio): motivo del reporte.
- `anonymous` (obligatorio): `true` para ocultar al reportero en Most Wanted publico.
- `evidence1` (obligatorio): primer archivo de evidencia.
- `evidence2` a `evidence5` (opcionales): evidencia adicional.

Reglas:

- Se requiere al menos 1 evidencia.
- Tipos permitidos:
  - Imagen: PNG, JPG, JPEG, GIF, WEBP
  - Video: MP4, WEBM, MOV
- Maximo 25 MB por archivo.
- Cooldown: 1 minuto por usuario.

Resultado:

- El bot envia el reporte al canal de reportes.
- Staff puede aceptarlo o rechazarlo con botones.

### `/mwlist`

Muestra el listado Most Wanted ordenado por cantidad total de reportes.

Incluye:

- Nombre del usuario.
- Motivo del ultimo reporte.
- Total de reportes.
- Motivos anteriores (si existen).

## 6. Flujo de moderacion (staff)

Cuando llega un reporte al canal de revision:

1. Staff con el rol configurado (`DISCORD_STAFF_ROLE_ID`) puede usar botones:
   - `ACCEPT REPORT`
   - `REFUSE REPORT`
2. Si se acepta:
   - Se guarda evidencia local en carpeta del usuario.
   - Se actualiza lista Most Wanted.
   - Se publica embed en canal Most Wanted.
   - Se registra accion en canal de logs.
3. Si se rechaza:
   - Se abre modal para escribir motivo obligatorio.
   - Se registra rechazo en logs.
   - Se intenta notificar por DM al reportero.

## 7. Estructura de datos local

Archivos de estado usados por el bot:

- `report_counter.json`: ultimo ID y reportes procesados.
- `cooldowns.json`: cooldown por usuario.
- `wanted_list.json`: estado de la lista Most Wanted.

Evidencia local:

- Carpeta base: `wanted_reports/`
- Por usuario: `wanted_reports/<usuario_sanitizado>/`
- Evidencia: `wanted_reports/<usuario_sanitizado>/evidence/`
- Historial de razones: `wanted_reports/<usuario_sanitizado>/reason.txt`

## 8. Permisos recomendados para el bot

En el servidor de Discord, asegura estos permisos segun tus canales:

- Ver canales
- Enviar mensajes
- Insertar enlaces
- Adjuntar archivos
- Leer historial de mensajes
- Gestionar mensajes (opcional, si quieres ampliar moderacion)

## 9. Seguridad importante

- No subas `.env` ni `config.json` al repositorio.
- Si ya expusiste el token en commits o archivos compartidos, rotalo inmediatamente desde Discord Developer Portal.
- Mantener secretos en variables de entorno por entorno (dev/staging/prod).

## 10. Troubleshooting

### Error: `.env file not found. Program stopped.`

Crea el archivo `.env` en la raiz del proyecto y completa todas las variables requeridas.

### Error al ejecutar `npm run start`

El proyecto no trae script `start` por defecto. Usa `node bot.js` o agrega el script en `package.json`.

### Los comandos slash no aparecen

- Verifica `DISCORD_CLIENT_ID` y `DISCORD_GUILD_ID`.
- Revisa que el bot tenga permisos en el servidor.
- Reinicia el bot para forzar registro de comandos.

### No encuentra canales o rol

Revisa IDs en `.env`:

- `DISCORD_REPORT_CHANNEL_ID`
- `DISCORD_MOST_WANTED_CHANNEL_ID`
- `DISCORD_LOGS_CHANNEL_ID`
- `DISCORD_STAFF_ROLE_ID`

## 11. Integracion con tu sitio web

Si `API_SECRET` esta configurado, el bot levanta una API HTTP para recibir reportes externos.

Endpoint:

- `POST /api/reports`
- `GET /health`

Headers:

- `Content-Type: application/json`
- `Authorization: Bearer TU_API_SECRET`

Body de ejemplo:

```json
{
  "username": "Jugador123",
  "reason": "Uso de exploit",
  "anonymous": false,
  "source": "panel-web",
  "reporter": {
    "id": "user-42",
    "name": "Formulario Web"
  },
  "report": {
    "categories": ["Exploit", "Vehiculos"],
    "tags": ["exploit", "griefing"],
    "contacto": "PANEL_WEB",
    "severity": "critica",
    "analysis": {
      "summary": "Sujeto reincidente con patron de abuso.",
      "recommendation": "Suspension preventiva inmediata.",
      "reason": "Coincidencia con incidentes previos.",
      "operationalRecommendation": "Evitar confrontacion directa y escalar a staff.",
      "tacticalDirective": "Interceptar y retirar acceso.",
      "threatLevel": "critical",
      "confidence": 0.92,
      "corruptionPercent": 80,
      "corruptionReason": "Severidad alta y multiples evidencias."
    }
  },
  "evidence": [
    {
      "url": "https://tu-sitio.com/uploads/captura-1.png",
      "name": "captura-1.png",
      "contentType": "image/png"
    }
  ]
}
```

Respuesta exitosa:

```json
{
  "ok": true,
  "reportId": 15,
  "evidenceCount": 1
}
```

Notas:

- La API acepta entre 1 y 5 evidencias.
- Las URLs deben ser accesibles por el bot para poder descargarlas al aceptar el reporte.
- Si no configuras `API_SECRET`, la API queda deshabilitada.
- `report` es opcional y permite enriquecer el embed publico de Most Wanted sin romper el payload minimo actual.
- Por compatibilidad, el bot tambien acepta `categories`, `tags`, `contacto`, `severity` y `analysis` a nivel raiz si la web aun no los manda dentro de `report`.
- Si faltan datos clave del analisis, el bot puede enriquecer el embed con IA usando `KAITH_API_BASE_URL` y la capa compartida de Kaith.
- Para Ollama local, puedes apuntar `KAITH_API_BASE_URL` a `http://127.0.0.1:11434`, dejar `KAITH_AI_GENERATE_ENDPOINT=/api/generate` y vaciar `KAITH_AI_CHAT_ENDPOINT=` y `KAITH_AI_REPORT_CORRELATION_ENDPOINT=` para que el bot use `generate` directamente.
- Los envios web guardan auditoria tecnica en `security_audit.log` y `reporter_audit.log`.
- La IP y el pais dependen de headers del proxy/CDN (`x-forwarded-for`, `cf-ipcountry`, etc.).
- Discord no expone la IP ni datos personales del usuario; solo se registra la informacion disponible de la cuenta y del servidor.

## 12. Tests

Ejecuta:

```bash
npm test
npm run test:reports
```

## 13. Comportamiento tecnico resumido

- Entrada principal: `bot.js`
- Inicializacion y wiring del bot: `src/bot/createBot.js`
- Registro de slash commands: `src/bot/commands.js`
- Manejo de interacciones: `src/bot/handlers/interactionHandlers.js`
- API externa: `src/bot/apiServer.js`
- Builder de Most Wanted: `src/bot/builders/mostWantedReportMessageBuilder.js`

Con esto tienes una base lista para operar reportes en un servidor de Discord y escalar luego a arquitectura separada con API/base de datos compartida.
