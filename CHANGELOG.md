# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Auditoría técnica de `1.4.1` en `docs/audits/2026-11-12-v1.4.1.md`.
- `ROADMAP.md` con el plan de estabilización, integración y reducción de alcance.
- ADR `docs/decisions/0001-scope-and-positioning.md`.

### Changed

- El CI y `packageManager` usan pnpm 10.18.0 en la matriz de Node 20/22 para respetar el `engines` del runtime.
- `ROADMAP.md` pasa a estar versionado; `roadmap.md` deja de estar ignorado.
- El runtime declara Node 20+; Node 18 está EOL y Vitest 4 no lo soporta.

### Removed

- Soporte declarado de Node 18. El código probablemente sigue funcionando allí, pero no se testea ni se promete.

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
