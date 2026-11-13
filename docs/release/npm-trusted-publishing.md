# npm Trusted Publishing

El workflow [`publish.yml`](../../.github/workflows/publish.yml) está preparado para publicar con OIDC y procedencia, sin un token npm permanente.

## Requisitos

- Node 22.14+ y npm CLI 11.5.1+ en el job de publicación. El workflow usa Node 24 solo para publicar; la librería sigue soportando Node 20.
- El paquete `reactive-fsm` debe tener configurado un **Trusted Publisher** en npm.
- El repositorio debe tener un environment de GitHub llamado `npm` con reviewers.

## Configuración en npm

En npm, dentro de **Package settings → Trusted publishing**, configurar:

| Campo | Valor |
|---|---|
| Publisher | GitHub Actions |
| Organization / user | `roddcode` |
| Repository | `reactive-fsm` |
| Workflow filename | `publish.yml` |
| Environment | `npm` |

No se necesita `NODE_AUTH_TOKEN` ni un token clásico.

## Configuración en GitHub

1. Crear el environment `npm` en **Settings → Environments**.
2. Añadir required reviewers (el mantenedor).
3. Opcional: restringir el environment a la rama `main`.

El workflow solo se ejecuta manualmente (`workflow_dispatch`). No publica en cada push.

## Publicación

1. Verificar que `package.json` tiene la versión final y que el tag corresponde al commit validado.
2. Ejecutar **Actions → Publish → Run workflow**.
3. Aprobar el environment `npm`.
4. El job ejecuta build, tests, typecheck, `validate:package` y `npm publish --provenance --access public`.

## Verificación posterior

```bash
npm view reactive-fsm version dist.integrity

# En un directorio limpio
npm install reactive-fsm@<version>
node -e "import('reactive-fsm').then(m => console.log(m.createFSM))"
```

También conviene repetir el typecheck del consumidor con `ai@7` y ejecutar el test de `generateText` contra el paquete instalado, no contra `src`.

## Notas

- `2.0.0` quedó etiquetada pero no se publicó. La primera publicación debe ser `2.0.1` o posterior.
- Si se publica una versión nueva, crear un tag nuevo; no mover tags públicos existentes.
- Si npm rechaza la publicación por versión duplicada, bumpear el patch y repetir el workflow.
