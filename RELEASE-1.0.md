# Mini Hospital 1.0 — Preparación de lanzamiento

**Estado: listo para revisión previa, no desplegado.** No se ha conectado una cuenta de Vercel ni se ha publicado una URL.

## Funcionalidades listas

- Editor y guardado local de la doctora, equipo de cuatro profesionales, pacientes, conversación, consentimiento y preparación.
- Temas claro (blanco) y oscuro (negro) persistentes, pantalla completa del quirófano bajo acción explícita y un caso inicial de atención inmediata con paciente en camilla en recepción.
- En Mi Hospital, personal seleccionable con destinos por habitaciones desbloqueadas, nueva Sala de revisión para pacientes en espera con ubicación persistente, decoración visible en las siete salas, puertas interiores, entrada principal y acceso directo al tema.
- Escena quirúrgica ficticia con cuatro minijuegos, dificultad, eventos, desenlaces de éxito/fracaso y reintento.
- Resultados con puntuación, rendimiento, estabilidad, errores, eventos, equipo, experiencia, monedas, saldos actuales e historial.
- Progreso, configuración de audio, economía, hospital y resultados persistidos con Zustand/localStorage.

## Verificaciones realizadas

- `npm run build`: compila TypeScript y genera la versión de producción; Vite mantiene visible su advertencia de chunk grande de Phaser.
- `npm run lint`: pasa.
- `npm test`: 68 pruebas aprobadas.
- `npm run test:e2e`: 11 pruebas Playwright aprobadas en Chromium contra Vite de desarrollo.
- `PLAYWRIGHT_USE_PREVIEW=1 npm run test:e2e`: 11 pruebas Playwright aprobadas contra `dist/` servido por `vite preview`.
- El recorrido exitoso personaliza y guarda la doctora, cambia un profesional del equipo y guarda la formación; después realiza conversación, consentimiento, preparación, las cuatro fases quirúrgicas, recompensa e historial.
- El recorrido fallido usa dificultad difícil y acciones repetibles para llegar a la complicación y al resultado fallido; verifica persistencia y reintento limpio.
- La partida exitosa se reabre en una pestaña nueva del mismo contexto de navegador. Se comparan monedas, experiencia, recompensas e historial antes y después para verificar que no se dupliquen.
- Se comprobó el flujo preoperatorio y la escena de cirugía en 390×844, 844×390, 768×1024 y 1440×900, incluyendo la indicación de orientación y desbordamiento horizontal.
- Las pruebas añadidas comprueban las instrucciones de la verificación inicial, la persistencia del modo noche, la entrada/salida de pantalla completa y el acceso inmediato al paciente en camilla.
- También pasan las comprobaciones E2E de volúmenes independientes, visibilidad del canvas en vertical y destrucción de la escena Hospital al navegar fuera.
- Se verificó el envío de un paciente en espera a Sala de revisión y que la ubicación se conserve al recargar, tanto en desarrollo como en la vista previa de producción.
- Validación manual adicional en navegador: tocar a un profesional muestra sus destinos; elegir una sala cierra el selector y confirma el movimiento. El modo noche persiste tras recargar, y la vista móvil de Mi Hospital no presenta desbordamiento horizontal en 390×844. Se revisó visualmente la decoración de las habitaciones y la entrada principal.
- La suite usa un generador pseudoaleatorio determinista para hacer repetibles los desenlaces; el juego sigue ejecutando sus minijuegos y reglas reales de interfaz, no mocks de la aplicación.
- Las pruebas se ejecutaron en Chromium con viewports emulados. No equivalen a uso en un teléfono físico ni a una auditoría WCAG/lector de pantalla.

Estas pruebas se ejecutaron en Chromium de escritorio con tamaños de viewport emulados. No equivalen a pruebas en dispositivos físicos, publicación pública, ni certificación médica.

## Rendimiento observado y pendiente

- El build de producción genera un bundle inicial JS de ~357 kB (~110 kB gzip) y un chunk Phaser de 1,194.42 kB (~318.49 kB gzip). Se conserva la advertencia de Vite >500 kB; el umbral no se ha elevado artificialmente.
- Medición en Chromium contra `vite preview`: primera interfaz visible ~363–387 ms; el chunk Phaser se solicitó solo al entrar en cirugía, con ~26–28 ms de duración y 316,017 bytes transferidos. La ventana de inicio no descargó Phaser.
- Son muestras locales, no un benchmark en hardware público ni una garantía; dependen de navegador, servidor, caché y equipo.
- No se detectaron configuraciones `.env*`, dependencias de variables `VITE_*` ni rutas de navegador fuera de `/`. La aplicación navega mediante estado React y usa `localStorage`; Vite genera `dist/`. La configuración estándar del preset Vite de Vercel es suficiente; no se requiere `vercel.json` para el flujo actual.
- No se midieron FPS/memoria en móvil físico. `performance.memory` no es estándar; los resultados previos de heap/FPS son muestras cortas de desarrollo y no garantías de rendimiento.

## Problemas conocidos y limitaciones

- Los personajes del juego usan ilustraciones vectoriales procedurales. Sprites/atlas y animaciones de arte final siguen pendientes.
- No existe backend ni sincronización entre dispositivos; al limpiar los datos del navegador se pierde la partida.
- La evaluación de respuestas libres es una heurística local de palabras/conceptos, no IA ni comprensión lingüística real.
- El juego no reproduce intervenciones médicas ni debe usarse como simulador o consejo clínico.
- No existe una preferencia persistente dedicada para movimiento reducido. Algunas animaciones CSS respetan `prefers-reduced-motion`, pero las escenas Phaser todavía no lo aplican de extremo a extremo.
- La escena Phaser de cirugía mantiene una descarga inicial grande aunque se carga bajo demanda.
- La pantalla completa depende de una acción de la jugadora y puede no estar disponible en todos los navegadores móviles; el diseño horizontal adaptable sigue siendo la alternativa.
- La ejecución responsive verificada es emulación de viewport; faltan comprobaciones de interacción táctil y rendimiento en dispositivos físicos.
- No se ha realizado una auditoría WCAG formal, pruebas con lector de pantalla ni despliegue en Vercel.

## Publicación

1. Importar el repositorio en una cuenta/proyecto Vercel autorizados. No se ha realizado este paso.
2. Seleccionar el preset Vite (detección automática), `npm ci` como instalación, `npm run build` como build y `dist` como directorio de salida.
3. No configurar variables de entorno: la aplicación no las necesita actualmente.
4. Autorizar el despliegue y guardar la URL generada.
5. Abrir la URL publicada, probar carga inicial y entrada diferida al quirófano en los cuatro viewports, y comprobar recarga y persistencia local en el mismo navegador.
6. Confirmar que no hay errores de consola/red y que la URL raíz responde después de recargar. No declarar el lanzamiento público hasta terminar esta comprobación.

Para validar localmente antes de autorizar un despliegue:

1. Instalar dependencias: `npm ci`.
2. Ejecutar validaciones: `npm run lint`, `npm test`, `npm run test:e2e` y `npm run build`.
3. Para E2E en una máquina nueva, instalar Chromium una vez: `npx playwright install chromium`.

## Ejecución local

```bash
npm install
npm run dev
```

Consulta [README.md](./README.md) para requisitos, arquitectura y comandos de desarrollo.
