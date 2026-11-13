# Contributing

## Setup

- Node 20+
- pnpm 10.18.0 (`corepack enable`)

```bash
pnpm install
pnpm build
pnpm test
pnpm typecheck
pnpm validate:package
```

## Scope

The project is intentionally small. Do not add features, adapters or abstractions without an issue that explains the problem and the tradeoff.

The maintained integration is Vercel AI SDK 7. OpenAI, Anthropic, LangChain and Gemini are experimental.

## Tests

- Add a regression test for every bug.
- Prefer tests that exercise the public contract.
- Do not test private implementation details unless there is no public path.
- Run `pnpm typecheck` when you change public types.
- Run the examples workflow if you change the adapter or the package shape.

## Docs

- `README.md` is the entry point, not the full documentation.
- `site/` is the VitePress documentation.
- `docs/` contains audits, ADRs and migration guides.
- Keep claims precise. If something is experimental or not tested, say so.

## Commits

Use conventional commits:

```text
fix(core): ...
fix(vercel): ...
feat(types)!: ...
docs: ...
test: ...
ci: ...
chore(release): ...
```

Do not add AI attribution to commits.

## Releases

- Do not publish to npm without the maintainer's approval.
- The publish workflow uses npm Trusted Publishing (OIDC).
- Do not move public tags. If a published version needs a fix, create a new patch version.
- Update `CHANGELOG.md` before tagging.
