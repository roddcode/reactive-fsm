# ADR-0001: Scope and positioning

- **Estado:** aceptado
- **Fecha:** 2026-11-12
- **Decisor:** mantenedor
- **Contexto:** auditoría de `reactive-fsm` v1.4.1, commit `7b59308`

## Contexto

La versión 1.4.1 tiene un núcleo pequeño y legible, pero su superficie pública promete más de lo que implementa:

- `config.tools` y `registry.gates` pueden contradecirse.
- Los adaptadores formatean herramientas; no ejecutan ni autorizan.
- El adaptador de Vercel no coincide con el peer declarado (`ai@4`) y no tipa con el SDK actual.
- Los peers bloquean la instalación con los majors actuales de cuatro de los cinco SDKs.
- `transitionToAsync` puede sobrescribir un estado posterior.
- Hay APIs muertas o no integradas (`prompts`, `schema`, `currentStateGroup`, `toMermaid`).
- El CI está rojo y el badge público dice “failing”.

El proyecto tiene 1 star, 0 forks, 0 issues, 0 releases y 75 descargas mensuales. No hay usuarios externos que justifiquen mantener cinco adaptadores ni una compatibilidad amplia.

## Decisión

**Reducir el alcance para conseguir una especialización sólida**, con un cambio de posicionamiento:

> **State-scoped tool availability and tool budgets for TypeScript AI agents.**

La librería se define como una política pequeña y provider-agnóstica para decidir qué herramientas se anuncian en cada estado y cuántas llamadas se permiten. No es un FSM completo, no es un runtime de agentes y no es una capa de autorización.

Consecuencias concretas:

1. **Una sola integración oficial:** Vercel AI SDK 7. OpenAI y Anthropic quedan como experimentales hasta que tengan tests de contrato reales. LangChain y Gemini se retiran de la promesa estable; Gemini solo vuelve si se porta a `@google/genai`.
2. **Una sola fuente de verdad para el gating:** `config.tools` manda; los adaptadores filtran el registry por `allowedTools` y validan divergencias al construirse.
3. **El loop shield se llama “tool budget”** y cuenta llamadas individuales, no pasos; no promete detección semántica.
4. **El gating es advisory.** La autorización y la validación de argumentos viven en la aplicación; si se ofrece un helper de ejecución, se documenta como opt-in.
5. **ESM-only** se documenta explícitamente. No se añade CJS sin demanda real.
6. **No se añaden funcionalidades nuevas** hasta que la Etapa 1 y 2 estén cerradas y exista un caso de uso real.

## Alternativas consideradas

- **Mantener el alcance y mejorar calidad:** rechazada. Cinco adaptadores y un “FSM” sin tabla de transiciones son demasiada superficie para una persona y no están validados.
- **Ampliar funcionalidades:** rechazada. No hay demanda; 75 descargas y 0 issues no justifican más código.
- **Replantear solo el posicionamiento:** insuficiente. El problema no es solo el mensaje; también la doble fuente de verdad y los adaptadores sin integración.
- **Detener la inversión:** prematura. El núcleo es pequeño y el problema es real; corregirlo es más barato que empezar de cero. Queda como fallback si después de las Etapas 1–2 no se demuestra valor.

## Consecuencias

**Positivas:**

- Menos superficie que mantener.
- Un quickstart que se puede ejecutar.
- Un contrato pequeño y comprobable.
- Una historia creíble para GitHub: higiene, estabilización, integración real, reducción.

**Negativas:**

- Breaking changes en la Etapa 3 (`2.0.0`): adaptadores retirados, tipos genéricos, APIs muertas.
- Usuarios de `ai@4` o LangChain tendrán que migrar.
- El proyecto renuncia a competir como framework de agentes.

## Criterio de revisión

Esta decisión se revisa si ocurre alguna de estas condiciones:

1. Aparece un usuario real con un caso de uso que reactive-fsm resuelve mejor que el SDK nativo.
2. Un adaptador retirado recibe demanda repetida y hay capacidad para mantenerlo con tests de contrato.
3. La comparación con la solución nativa del SDK demuestra una reducción medible de complejidad o errores.

Si ninguna ocurre después de las Etapas 1–2, la opción 5 (mantener solo compatibilidad/correcciones) es aceptable.
