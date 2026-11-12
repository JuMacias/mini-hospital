# Mini Hospital

Juego web casual construido con React, TypeScript, Vite, Tailwind CSS, Zustand y Phaser 3. Incluye una aventura quirúrgica completamente ficticia con minijuegos abstractos; no proporciona instrucciones ni consejos médicos.

## Requisitos

- Node.js 20.19+ o 22.12+
- npm

## Ejecutar en desarrollo

```bash
npm install
npm run dev
```

Abre la URL que imprime Vite (normalmente `http://localhost:5173`).

## Comprobar

```bash
npm run build
npm run lint
npm test
```

## Funcionalidades actuales

- Menú principal, editor de personaje por capas SVG y selección visual avanzada del equipo quirúrgico: catálogo filtrable/ordenable, cuatro roles validados, ficha y estadísticas, apariencia individual, equipo favorito, energía, experiencia y compatibilidad explicable.
- Hospital vivo en Phaser: cola persistida de cinco pacientes, recepción, consulta, preparación, cirugía, recuperación, alta y estados alternativos de consentimiento rechazado y cirugía fallida. Los fallos no pueden recibir el alta exitosa.
- Personal del equipo, doctora principal, recepción y pacientes se muestran con sus apariencias y animan desplazamientos cortos, espera/descanso, conversación, trabajo y reacciones. La escena reutiliza su instancia Phaser y actualiza mapa/personajes según los cambios de estado.
- Misiones deterministas de atención, cirugía, preparación, mejora y equipo completo; las recompensas se reclaman una sola vez. Los muebles adquiridos pueden previsualizarse, colocarse en zonas libres, moverse, girarse y retirarse; las puertas y zonas de paso se validan.
- Editor de personaje con vista previa vectorial en tiempo real, nombre y género, categorías de rostro, tono de piel, cabello, gorros/diseños, gafas, barba/bigote y uniforme/accesorios, selección de opciones, aleatorización y guardado.
- Atención preoperatoria: cinco pacientes ilustrados con expresiones emocionales, diálogo ramificado sobre presentación, procedimiento ficticio, beneficios, riesgos, recuperación y preguntas; respuestas predefinidas con orden estable por paciente/pregunta, evaluación local explicable del texto libre, comprensión y consentimiento explícito.
- Preparación 2.5D ilustrada del quirófano, equipo asignado, seis tareas marcables y avance hasta el estado listo.
- Cirugía interactiva en Phaser 3 con cuatro fases abstractas, minijuegos dependientes de acciones, estabilidad, rendimiento, eventos de fantasía, ajustes de dificultad e intensidad visual, resultados y recompensas.

La aplicación guarda los datos con Zustand persist bajo la clave `mini-hospital-save`, usando el esquema versionado 6. Las migraciones conservan doctores, equipos, resultados, sesiones, conversaciones, consentimientos y hospitales anteriores; crean una cola inicial y valores por defecto para muebles y misiones sin sustituir el progreso existente. Se persisten apariencias, experiencia, afinidad, conversación, decisiones, cirugía, monedas, cola y estados de pacientes, recompensas reclamadas, habitaciones, compras, mejoras, decoración y ubicación/rotación de muebles. Las monedas se otorgan una sola vez por resultado de cirugía o por misión reclamada; las compras también son idempotentes. El alta solo se permite después de una cirugía exitosa y recuperación; un fallo sigue un estado narrativo distinto. La comodidad solo es un indicador visual y no modifica las probabilidades ni garantiza resultados quirúrgicos. La respuesta libre preoperatoria sigue siendo una heurística local transparente, no IA. Las instancias Phaser, escenas, temporizadores y objetos gráficos son temporales y nunca se guardan en Zustand.

Las escenas de cirugía y hospital se cargan de forma diferida y destruyen sus instancias al salir. La compilación de producción separa las páginas de juego del bundle inicial; el módulo Phaser sigue siendo un chunk monolítico de ~1.19 MB (~318 kB gzip). Vite mantiene visible la advertencia del chunk >500 kB: no se eleva el umbral para ocultarla. La primera apertura de cada escena descarga el motor si aún no está en caché.

## Estructura

- `src/App.tsx`: navegación y pantallas originales, con acceso al flujo preoperatorio.
- `src/components/CharacterCreatorPage.tsx`: editor de personaje, controles de identidad, categorías, aleatorización y guardado.
- `src/components/TeamPage.tsx`, `TeamPage.css` y `TeamPageMotion.css`: catálogo visual, formación, roles, compatibilidad, ficha, personalización y progresión profesional.
- `src/components/HospitalPage.tsx` y `HospitalPage.css`: mapa/controles, cola de atención, misiones, colocación de muebles, panel de habitaciones y compras.
- `src/components/CharacterRenderer.tsx`: renderizador SVG reutilizable del personaje por capas.
- `src/components/CharacterPreview.tsx`, `CustomizationCategories.tsx` y `CustomizationGrid.tsx`: vista previa y controles del editor.
- `src/components/Avatar.tsx`: avatar reutilizable para la interfaz.
- `src/components/Avatar.css`: estilos y animaciones de interfaz del avatar.
- `src/components/AudioSettings.tsx`: activación de audio y controles independientes de volumen.
- `src/game/AudioManager.ts`: síntesis local de música ambiental y efectos, iniciada bajo gesto explícito.
- `src/components/PreopFlow.tsx`, `PreopFlow.css` y `PreopConversation.css`: catálogo, conversación ramificada y emocional, consentimiento y preparación.
- `src/components/SurgeryPage.tsx` y `SurgeryNarrative.css`: muestran el contexto emocional del paciente en cirugía sin conectarlo a las reglas de estabilidad.
- `src/components/SurgeryPage.tsx`: ciclo de vida de Phaser, ajustes e integración con el estado del juego.
- `src/components/SurgeryHUD.tsx`, `SurgeryResults.tsx` y `SurgeryResults.css`: minijuegos, eventos y resumen de resultados con avisos de subida de nivel.
- `src/game/SurgeryScene.ts`: escena Phaser con escenario isométrico, personajes y equipamiento vectoriales.
- `src/game/HospitalScene.ts`: escena Phaser independiente para explorar el hospital, mobiliario configurable, pacientes y personajes animados.
- `src/game/CharacterSprite.ts` y `src/game/characterVisuals.ts`: generador visual por capas para Phaser, poses, movimientos cortos y clasificación visual de estados.
- `src/game/CharacterOptions.ts` y `src/game/characterRules.ts`: opciones, normalización, aleatorización y migración de apariencia.
- `src/game/teamRules.ts` y `teamRules.test.ts`: validación de roles, compatibilidad determinista, progreso, energía y perfiles del equipo.
- `src/game/hospitalRules.ts`, `hospitalOperations.ts`, `hospitalRules.test.ts`, `hospitalOperations.test.ts` y `hospitalStore.test.ts`: progresión, transiciones de atención, misiones, colocación de muebles, compras, mejoras, saldo y persistencia del hospital.
- `src/game/assets/assetManifest.ts`: estado y procedencia/licencia de recursos gráficos y de audio.
- `src/game/SurgeryEngine.ts` y `surgeryRules.ts`: máquina de estados y reglas puras de cirugía.
- `src/game/surgeryRules.test.ts`: pruebas automatizadas de transiciones, complicaciones, desenlaces y persistencia.
- `src/data/`: catálogo tipado de profesionales, pacientes y tareas.
- `src/game/preopRules.ts`: reglas puras de ramificación, evaluación local, emoción, consentimiento y progreso; `src/data/patients.ts` define los diálogos ficticios.
- `src/game/preopRules.test.ts`, `characterRules.test.ts`, `visualSystems.test.ts` y `src/game/surgeryRules.test.ts`: pruebas automatizadas de reglas, migración/persistencia, sistemas visuales, transiciones, complicaciones, desenlaces y persistencia.
- `src/store/gameStore.ts`: estado Zustand persistido.
- `src/types.ts`: modelos del juego.

## Recursos gráficos y audio

Los personajes de Phaser y los avatares de interfaz se componen de capas vectoriales originales; el editor y la vista previa usan SVG para dibujar por separado el rostro, tono de piel, cabello, uniforme, gorros, gafas, barba y accesorios. La escena Phaser reutiliza el sistema visual por capas y anima poses básicas de idle, walk, work, talk, alert, happy y sad. Son ilustraciones vectoriales procedurales de prototipo, no sprites ni animaciones finales. Los atlases finales de personajes/pacientes y el arte final de entorno siguen pendientes y requieren verificación de licencia antes de incorporarse.

El inventario verificable de recursos está en `src/game/assets/assetManifest.ts`; diferencia los placeholders disponibles de sprites y paquetes de arte pendientes. El audio se sintetiza localmente con Web Audio, no carga archivos externos y permanece apagado hasta que la persona jugadora lo active explícitamente desde Configuración. Música y efectos tienen volumen independiente y sus preferencias se guardan en localStorage. No se almacenan objetos de audio ni de Phaser en Zustand.

El diseño prioriza la vista horizontal en móviles. En orientación vertical se muestra una indicación para girar el dispositivo; no se fuerza el bloqueo de orientación del navegador.

## Décima entrega: pulido y estabilidad

- La guía de siete pasos es opcional: se abre desde «Ver guía», puede omitirse, cerrarse con Escape o retomarse cuando la jugadora quiera; no bloquea el inicio del juego.
- La vista quirúrgica usa un panel lado a lado en móvil horizontal y conserva el aviso de giro en móvil vertical.
- Las compras deshabilitadas muestran el nivel requerido o las monedas faltantes antes de confirmar.
- `npm run test:economy` ejecuta pruebas aisladas con un store/storage en memoria: saldo insuficiente, compra, persistencia, duplicados y colocación. No modifica partidas ni agrega monedas al juego real.
- `npm run test:e2e` ejecuta siete escenarios Chromium, incluida una partida que personaliza a la doctora y cambia a un profesional del equipo antes de jugar, además de éxito, fracaso, consentimiento, preparación, persistencia, reintento, cuatro viewports, carga diferida de Phaser, audio y limpieza de escenas. Requiere `npx playwright install chromium`; usa el puerto 4178 y un contexto nuevo por prueba. Tras `npm run build`, `PLAYWRIGHT_USE_PREVIEW=1 npm run test:e2e` ejecuta los mismos recorridos contra el build de producción local.
- Las páginas de hospital y cirugía se cargan bajo demanda y destruyen Phaser al salir. Phaser ocupa aproximadamente 1,19 MB sin comprimir (318 kB gzip) en un chunk propio; la advertencia de Vite permanece visible, sin elevar su umbral. El motor y sus sistemas de escenas/renderizado no se sustituyeron por gráficos simplificados.
- Los personajes siguen siendo ilustraciones vectoriales procedurales de prototipo; sprites finales y animación de producción siguen pendientes. Las transiciones de escena y el modo horizontal se mantienen ligeros; el uso de memoria detallado depende de la disponibilidad de `performance.memory` del navegador.
- En Chromium contra el preview de producción local: primera interfaz visible ~363–387 ms; la primera carga bajo demanda del chunk Phaser tardó ~26–28 ms y transfirió 316,017 bytes (~309 KiB). La prueba confirma que Phaser no se solicita en Inicio. Son muestras puntuales del equipo local, no una garantía de producción. El build genera un bundle inicial JS de ~357 kB (~110 kB gzip) y un chunk Phaser de ~1,194 kB (~318 kB gzip); el umbral de advertencia no se ha cambiado.
- Verificación anterior: `npm run build`, `npm run lint` y `npm test` pasaron con 60 pruebas; `npm run test:economy` pasó 13 pruebas aisladas. Los tiempos de preview indicados arriba son muestras locales puntuales, no garantías de rendimiento.

## Preparación 1.0

- Los resultados muestran el desenlace, rendimiento, estabilidad, errores, eventos, recompensas, saldo/experiencia actuales, equipo participante e historial reciente. El historial y el resultado terminal sobreviven a la recarga; volver a operar crea una ronda nueva sin borrar resultados previos.
- Las pruebas E2E de Playwright recorren personalización, cambio de integrante del equipo, conversación, consentimiento, preparación, cirugía exitosa y fallida, resultados, persistencia y reintento en Chromium.
- Se comprobó el recorrido interactivo sin desbordamiento horizontal en 390×844, 844×390, 768×1024 y 1440×900. La prueba inspecciona el catálogo, conversación, tareas y escena de cirugía; son viewports emulados, no dispositivos físicos.
- La partida exitosa se reabre en una pestaña nueva del mismo contexto de navegador: monedas, experiencia, recompensas e historial conservan sus valores y el resultado sigue siendo único. La partida fallida también conserva su resultado y permite reintentar sin duplicarlo.
- No se ha realizado una auditoría WCAG completa ni pruebas con lector de pantalla o hardware táctil/físico.
- La configuración mantiene activación de audio por gesto, volúmenes separados y persistencia local. Poner ambos volúmenes en cero silencia la síntesis. No hay un control persistente propio para movimiento reducido: algunas pantallas obedecen `prefers-reduced-motion`, pero las animaciones Phaser no lo aplican de forma integral.
- La compilación de producción conserva el chunk Phaser separado y la advertencia >500 kB; no se aumentó su umbral. Consulta [RELEASE-1.0.md](./RELEASE-1.0.md) para el estado, evidencia de pruebas, limitaciones y pasos de publicación.
- Verificación 1.0: `npm run build`, `npm run lint`, `npm test` (60 pruebas) y `npm run test:e2e` (7 escenarios) pasan. Los recorridos automatizados verifican cleanup de las escenas de Hospital y Surgery.

## Publicar en Vercel

El proyecto no necesita variables `VITE_*`: no hay backend ni configuración de secretos. La navegación es interna a React, sin rutas URL adicionales, por lo que tampoco requiere una regla SPA especial ni `vercel.json`.

1. Importa el repositorio en Vercel y conserva el preset detectado **Vite**.
2. Usa `npm ci` para instalar dependencias, `npm run build` como comando de build y `dist` como directorio de salida.
3. Usa Node.js 20.19+ o 22.12+.
4. Después de autorizar y completar el despliegue, abre la URL proporcionada por Vercel; verifica la carga inicial, la primera entrada al quirófano, recarga y guardado local en los viewports indicados arriba.

El despliegue no se ha ejecutado y no existe una URL pública verificada. La partida se guarda solo en el navegador/dispositivo actual.
