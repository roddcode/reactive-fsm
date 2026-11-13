# Security

## Supported versions

Security fixes are provided for the latest `2.x` release.

## Reporting a vulnerability

Do not open a public issue for a vulnerability.

- Use GitHub's private vulnerability reporting: https://github.com/roddcode/reactive-fsm/security/advisories/new
- Or email `roddcode.dev@gmail.com` with a short description, reproduction steps and affected version.

Please do not include secrets, tokens or personal data in the report.

## Scope

In scope:

- The library code in `src/`.
- The Vercel AI SDK 7 adapter.
- The published npm package and its exports.

Out of scope:

- Vulnerabilities in your own tool implementations.
- Misconfiguration of your agent, provider or authorization layer.
- Issues that require a compromised npm account or GitHub account.

## What this library does not do

`reactive-fsm` is a tool-availability policy layer. It does not authorize side effects, execute tools, or replace application-level validation. A vulnerability report that assumes the library is an authorization boundary will be treated as a documentation issue, not a security guarantee.

## Response

Reports are acknowledged on a best-effort basis. There is no bug bounty.
