# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.1] - 2026-11-13

### Fixed

- El adaptador de Vercel ya no contabiliza una tool call del estado anterior dentro del presupuesto del estado nuevo después de `transitionTo()`. La revisión monotónica del FSM permite detectar el cambio y saltar las llamadas históricas.
- Test de regresión con `generateText` + `MockLanguageModelV3`, `loopShield.enabled` y `maxConsecutiveTools: 1`: `validate_dni` transiciona IDENTITY → BOOKING y `check_availability` sigue disponible.
- Test de no-regresión: el presupuesto se sigue aplicando cuando no hay cambio de estado.

### Notes

- `2.0.0` quedó etiquetada pero nunca se publicó en npm. `2.0.1` la reemplaza. El tag público `v2.0.0` no se mueve.

## [2.0.0] - 2026-11-13

### Added

- Auditoría técnica de `1.4.1` y checkpoint P0 en `docs/audits/`.
- `ROADMAP.md`, ADR de alcance y ADR de release 2.0.0.
- Guía de migración `docs/migrations/1.x-to-2.0.0.md`.
- Test de integración con `generateText` y `MockLanguageModelV3` que cruza IDENTITY → BOOKING.
- `pnpm typecheck` con tipos de estado literales y `ai@7`.
- Tests de gating en los cinco adaptadores, concurrencia async y contrato del budget.

### Changed

- `config.tools` es la autoridad del gating; los adaptadores filtran por `allowedTools`, `gates` y `condition`.
- El adaptador de Vercel usa un `ToolSet` estable y `prepareStep` devuelve `activeTools`; ya no muta `tools`.
- Las transiciones async obsoletas se rechazan con una revisión monotónica.
- `createFSM` devuelve `FSMPublic<S>`; `transitionTo` y `transitionToAsync` usan la unión literal de estados.
- El tool budget se documenta como admisión entre pasos; `onLoop` se dispara una vez por episodio; `repeated` exige nombre; el contador se resetea al cambiar de estado.
- El CI y `packageManager` usan pnpm 10.18.0 en Node 20/22.
- El runtime declara Node 20+.

### Fixed

- El adaptador de Vercel respeta `registry.gates` al calcular `activeTools`.
- El fallback resetea el shield y activa las tools del estado de emergencia.
- El job de Node 20 deja de fallar en `actions/setup-node@v4`.
- La suite ya no cuenta un step con varias tool calls como cero.

### Removed

- Los cinco `peerDependencies` de proveedores; el paquete no tiene peers ni dependencias de runtime.
- Soporte declarado de Node 18 (EOL).

### Breaking changes

- `config.tools` ahora manda sobre `registry.gates`.
- El adaptador de Vercel requiere AI SDK 7 y cambia la forma de `inject()`.
- Las transiciones async obsoletas producen error.
- `createFSM` devuelve `FSMPublic<S>` y oculta los métodos internos.
- Node 20+.

Ver `docs/migrations/1.x-to-2.0.0.md`.

## [1.4.1] - 2026-09-26

### Fixed

- Extensiones `.js` en imports relativos para resolución Node16 ESM.
- Validación de paquete con `publint` y `attw`.
- Workflow de CI con build, tests y validación de paquete.

### Documentation

- README actualizado para las features de `1.4.0`.
- Roadmap interno reconstruido.

## [1.4.0] - 2026-09-26

### Added

- Modos de loop shield: `consecutive` y `repeated`.
- Callback `onLoop` con metadata.
- `currentStateGroup` para estados `STATE:substate`.
- `transitionToAsync` y guards asíncronos.
- `createBaseAdapter` compartido por los adaptadores.

## [1.3.0] - 2026-09-26

### Added

- `fallbackState` para transiciones de emergencia.
- Tipos literales de estado con `const` generic.
- `guard` recibe `context` como tercer parámetro.

## [1.2.0] - 2026-09-26

### Added

- `onTransition`, `guard`, `prompts`, `snapshot`, `toMermaid` y `context`.
- `buildToolsForGate` y `validateWith`.
- Validación de snapshot y fallback.

## [1.0.0] - 2026-06-06

### Added

- `createFSM`, `buildToolsForGate`, `createLoopShield`.
- Adaptadores iniciales para Vercel AI SDK y OpenAI.
- Núcleo sin dependencias y licencia MIT.
