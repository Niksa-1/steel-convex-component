# Steel Convex Component Specification

## Document metadata

- Date: March 2, 2026
- Project: `steel-convex-component`
- Objective: Build a reusable Convex Component that wraps Steel.dev APIs and exposes reactive Convex queries plus server-side actions.

## Research summary

This specification is based on these inputs and findings.

- Steel Node SDK repository (`steel-dev/steel-node`) and generated API/types.
- Browser Use Convex component repository (`Cheggin/browser-use-convex-component`) as implementation pattern reference.
- Browser Use component listing on Convex (`convex.dev/components/browser-use`) for packaging and UX expectations.
- Browser Use npm package metadata (`browser-use-convex-component`).
- Convex component authoring docs (`docs.convex.dev/components/authoring`).
- Steel docs on session lifecycle and captcha APIs (`docs.steel.dev`).

Current package versions verified during research (as of March 2, 2026):

- `steel-sdk` latest: `0.17.0` (published February 7, 2026).
- `browser-use-convex-component` latest: `0.1.1` (published February 14, 2026).
- `convex` latest: `1.32.0` (published February 18, 2026).

## Problem statement

We need a Convex Component for Steel that gives apps:

- A clean, typed server-side API over Steel endpoints.
- Reactive data for key resources (especially sessions) inside Convex tables.
- Convex-native query/mutation/action boundaries.
- Package entry points and build flow compatible with Convex Component conventions.

## Goals

1. Deliver a production-usable sessions-focused component first.
2. Follow Convex component best practices for codegen, boundaries, and packaging.
3. Mirror Steel SDK capabilities where useful, while keeping Convex args/returns practical.
4. Expose a client wrapper class to simplify app-side usage and API key handling.
5. Keep security and tenancy controls explicit in the app layer.

## Non-goals

- Exposing component functions directly to untrusted clients.
- Implementing app-level auth inside the component.
- Persisting every large Steel payload by default (for example full rrweb event logs).
- Supporting every edge endpoint in MVP.

## Critical constraints from Convex component model

From Convex component docs, these directly shape the design:

- Component functions are isolated and cannot access app `process.env` directly.
- `ctx.auth` is not available inside components.
- `Id<"table">` types become `string` at the component boundary.
- Public component functions are callable via `ctx.runQuery`, `ctx.runMutation`, `ctx.runAction` from the app.

Design consequence:

- API keys and caller identity must be passed in from app-level wrappers.
- Authz must happen in the app before invoking the component.

## Product shape

### Recommended release strategy

1. MVP: Sessions lifecycle + local persistence + reactive queries.
2. V1: Session operations (computer/context/liveDetails/events) + session files + captchas.
3. V1.1: Profiles, credentials, extensions, global files, and top-level screenshot/scrape/pdf.

### Why this sequence

- Steel’s core value is session orchestration.
- Sessions have clean status lifecycle (`live`, `released`, `failed`) and map well to Convex reactive state.
- File and profile uploads need extra adaptation for Convex-compatible inputs.

## V0.1 scope and tenant model (finalized)

### Scope

- `v0.1` will ship sessions features only:
  - `sessions.create`, `sessions.refresh`, `sessions.refreshMany`, `sessions.release`, `sessions.releaseAll`
  - `sessions.get`, `sessions.getByExternalId`, `sessions.list`
  - internal `upsert`, `upsertMany`, `getInternalByExternalId`
- Captchas, session files, credentials, profiles, extensions, global files, and top-level utilities are deferred to `v1`+.
- No background data migrations or file payload persistence are in v0.1.

### Tenant model

- `ownerId` is mandatory in v0.1 for every public session mutation and read.
- The app wrapper must supply `ownerId`; component APIs should not infer tenant from environment.
- Every local session row stores `ownerId`, and mutations/queries must filter by `ownerId` + `externalId` for isolation.
- A missing/empty `ownerId` is treated as an authorization error and must fail fast.
- Shared sessions without explicit owner are out of scope for v0.1.

## High-level architecture

### Runtime model

- Component actions call Steel using `steel-sdk`.
- Component queries read from component-owned Convex tables.
- Internal mutations perform upserts and normalization.
- App code uses a wrapper class in `src/client/index.ts` and passes API key + optional tenant identity.

### Data ownership model

- Steel is source of truth for live operational state.
- Convex tables are local cache plus indexing layer for reactivity.
- Sync actions reconcile remote -> local state on demand.

### Sync model

- Write-through on action calls (for example create/release/fetch details).
- Pull-based refresh actions (`refreshOne`, `refreshMany`) for drift correction.
- Optional app-level cron calls refresh actions for periodic reconciliation.

## Proposed package/project structure

```txt
src/
  client/
    index.ts
  component/
    convex.config.ts
    schema.ts
    steel.ts
    normalize.ts
    sessions.ts
    sessionFiles.ts
    captchas.ts
    profiles.ts
    credentials.ts
    extensions.ts
    files.ts
    topLevel.ts
  test.ts
example/
  convex/
    convex.config.ts
    schema.ts
    steelExample.ts
package.json
tsconfig.json
```

## API surface specification

### App-facing client wrapper (`src/client/index.ts`)

```ts
new SteelComponent(components.steel, { STEEL_API_KEY?: string })
```

Client wrapper responsibilities:

- Resolve API key from constructor option first, then app `process.env.STEEL_API_KEY`.
- Call component functions with `ctx.runAction/runQuery/runMutation`.
- Keep app-side ergonomics and stable method names.

### Sessions module (MVP)

Public actions:

- `sessions.create`
- `sessions.refresh`
- `sessions.refreshMany`
- `sessions.release`
- `sessions.releaseAll`

Public queries:

- `sessions.get`
- `sessions.getByExternalId`
- `sessions.list`

Internal functions:

- `sessions.upsert`
- `sessions.upsertMany`
- `sessions.getInternalByExternalId`

### Sessions extended module (V1)

Public actions:

- `sessions.computer`
- `sessions.context`
- `sessions.liveDetails`
- `sessions.events`

Behavior:

- These actions return remote data directly.
- Optional lightweight snapshot persistence can be enabled for `liveDetails` metadata only.

### Session files module (V1)

Public actions:

- `sessionFiles.list`
- `sessionFiles.uploadFromUrl`
- `sessionFiles.delete`
- `sessionFiles.deleteAll`
- `sessionFiles.downloadToStorage` (optional)

Persistence:

- Store file metadata list for reactivity.
- Avoid persisting binary payloads by default.

### Captchas module (V1)

Public actions:

- `captchas.status`
- `captchas.solve`
- `captchas.solveImage`

Persistence:

- Store latest status snapshots optionally in `captchaStates` table.

### Profiles module (V1.1)

Public actions:

- `profiles.list`
- `profiles.get`
- `profiles.createFromUrl`
- `profiles.updateFromUrl`

Note:

- Steel profile create/update require `userDataDir` uploadable.
- Convex-friendly input should be URL-based (or storage-id-based in a later enhancement).

### Credentials module (V1.1)

Public actions:

- `credentials.create`
- `credentials.update`
- `credentials.list`
- `credentials.delete`

Persistence:

- Store metadata only.
- Never store secret credential values in Convex tables.

### Extensions module (V1.1)

Public actions:

- `extensions.list`
- `extensions.uploadFromUrl`
- `extensions.updateFromUrl`
- `extensions.delete`
- `extensions.deleteAll`

### Global files module (V1.1)

Public actions:

- `files.list`
- `files.uploadFromUrl`
- `files.delete`
- `files.downloadToStorage` (optional)

### Top-level utilities (V1.1)

Public actions:

- `steel.screenshot`
- `steel.scrape`
- `steel.pdf`

These can be direct pass-through actions with minimal or no persistence.

## Convex schema specification

### Core tables

`sessions`

- `externalId: string` (unique index)
- `status: "live" | "released" | "failed"`
- `createdAt: number`
- `updatedAt: number`
- `lastSyncedAt: number`
- `debugUrl?: string`
- `sessionViewerUrl?: string`
- `websocketUrl?: string`
- `timeout?: number`
- `duration?: number`
- `creditsUsed?: number`
- `eventCount?: number`
- `proxyBytesUsed?: number`
- `profileId?: string`
- `region?: string`
- `headless?: boolean`
- `isSelenium?: boolean`
- `userAgent?: string`
- `raw?: any`
- `ownerId?: string` (recommended multi-tenant partition key passed from app)

Indexes:

- `byExternalId`
- `byStatus`
- `byCreatedAt`
- `byOwnerId` (if owner partitioning enabled)

`sessionFileMetadata` (V1)

- `sessionExternalId: string`
- `path: string`
- `size: number`
- `lastModified: number`
- `lastSyncedAt: number`
- `ownerId?: string`

Indexes:

- `bySessionExternalId`
- `bySessionExternalIdAndPath`

`captchaStates` (optional, V1)

- `sessionExternalId: string`
- `pageId: string`
- `url: string`
- `isSolvingCaptcha: boolean`
- `lastUpdated?: number`
- `ownerId?: string`

Indexes:

- `bySessionExternalId`
- `bySessionExternalIdAndPageId`

`profiles`, `credentialsMetadata`, `extensions`, `globalFiles` (V1.1)

- Store metadata only.
- Include `ownerId` where tenant partitioning is required.

## Input and validation strategy

Recommended approach for Convex validators:

- Strongly type common scalar fields with explicit `v.string/v.number/v.boolean`.
- Use `v.any()` only where Steel payloads are deeply nested or frequently evolving.
- Prefer explicit unions for known status enums.
- Keep external ids as strings at component boundary.

## API key and identity strategy

### API keys

- The component receives `apiKey` in action args.
- The app-side wrapper injects it from app env (`STEEL_API_KEY`) or explicit constructor option.
- The component never persists API keys.

### Auth and tenancy

- App functions authenticate callers before invoking the component.
- App passes `ownerId` or `tenantId` into component actions when tenant-scoped records are needed.
- Queries should optionally filter by `ownerId`.

## Error handling and resilience

### Error contract

Normalize thrown errors into a structured shape:

- `provider: "steel"`
- `message: string`
- `status?: number`
- `code?: string`
- `retryable: boolean`
- `operation: string`

### Retry behavior

- Rely on Steel SDK default retries (`maxRetries` default 2).
- Keep component-level retries minimal to avoid duplicate side effects.
- For bulk sync operations, continue-on-error with per-item result collection.

### Idempotency and upserts

- All sync writes should use upsert keyed by external id.
- Release actions should be safe if the session is already released.

## Performance and cost controls

- Default list limits should be conservative (for example 50).
- Large payload actions (`events`, binary downloads) should be opt-in and non-persistent by default.
- Expose sync actions with filters (`status`, `limit`) to avoid unbounded pulls.
- Include optional `includeRaw` flags only where necessary.

Steel session lifecycle and billing implications from docs:

- Sessions are billed by time and can remain live until timeout/release.
- Explicit release should be encouraged in wrapper docs and examples.

## Implementation plan

### Phase 0: Scaffold

1. Initialize component skeleton and `convex.config.ts`.
2. Add schema with `sessions` table and indexes.
3. Add `steel.ts` helper to instantiate SDK client from passed API key.
4. Add package exports for `.`, `./convex.config.js`, `./_generated/component.js`, `./test`.

### Phase 1: Sessions MVP

1. Implement `sessions.create`, `sessions.refresh`, `sessions.release`, `sessions.releaseAll`.
2. Implement internal `upsert` and public `get/list` queries.
3. Implement client wrapper class methods for sessions.
4. Add example app wiring and usage examples.

### Phase 2: Sessions advanced features

1. Add `computer`, `context`, `liveDetails`, `events` actions.
2. Add `refreshMany` action using Steel list pagination/cursors.
3. Add optional snapshot persistence fields.

### Phase 3: Session files and captchas

1. Implement session files list/upload/delete APIs.
2. Implement captcha status/solve/solveImage APIs.
3. Add corresponding metadata tables if persistence is enabled.

### Phase 4: Org resources and top-level tools

1. Implement profiles/credentials/extensions/files modules.
2. Implement top-level screenshot/scrape/pdf pass-through actions.
3. Add wrapper methods and docs.

### Phase 5: Hardening and release

1. Add comprehensive tests.
2. Finalize README API reference.
3. Publish initial npm release and optionally submit to Convex components directory.

## Testing plan

### Unit and component tests

- Use `convex-test` and export a `register` helper via `src/test.ts`.
- Mock Steel SDK interactions for deterministic tests.
- Validate upsert behavior and index-backed queries.
- Validate error normalization and retry semantics.

### Integration tests

- Example app smoke tests with mocked mode by default.
- Optional live integration tests gated by `STEEL_API_KEY` in CI.

### Test matrix

- Create/release lifecycle.
- Sync after out-of-band state change.
- Pagination sync behavior.
- Tenant partitioning (`ownerId`) behavior.
- Large payload pass-through behavior.

## Packaging and distribution specification

- Package format: ESM package with TypeScript declarations.
- Peer dependency: `convex` (recommend `^1.32.0`).
- Runtime dependency: `steel-sdk` (recommend `^0.17.0`).
- Required exports:
- `.`
- `./convex.config.js`
- `./convex.config`
- `./_generated/component.js`
- `./_generated/component`
- `./test`
- Build scripts should follow Convex component ordering:
- `convex codegen --component-dir ./src/component`
- TypeScript build
- Example `convex dev --typecheck-components`

## Risks and mitigations

- Risk: Overly broad argument surface from Steel SDK can make validators brittle.
- Mitigation: Ship strict MVP args and progressively expand with explicit versions.

- Risk: Binary upload/download flows are awkward in Convex actions.
- Mitigation: Use URL-based upload endpoints first and keep binary storage optional.

- Risk: Drift between remote and local state.
- Mitigation: Provide explicit refresh actions and recommended app cron wiring.

- Risk: Multi-tenant data leakage if app forgets to filter.
- Mitigation: Document owner-scoped usage and include optional `ownerId` in schema + indexes.

## Open decisions to resolve before implementation starts

1. Scope decision: sessions-only initial release vs sessions+captchas+files in v0.1.
2. Tenant model: enforce `ownerId` on every API now or keep optional in v0.1.
3. Binary handling: include `downloadToStorage` in initial release or defer.
4. Payload policy: persist `raw` session snapshots by default or only normalized fields.
5. Release posture: publish immediately to npm after MVP or keep private alpha first.

## Recommended decisions

1. Ship sessions-focused MVP first.
2. Include optional `ownerId` support in v0.1 and document strongly.
3. Defer binary download persistence until v0.2.
4. Persist normalized fields plus optional `raw` only when `includeRaw` is set.
5. Run one private alpha with a sample app before public npm release.

## References

- https://github.com/steel-dev/steel-node
- https://github.com/Cheggin/browser-use-convex-component
- https://www.convex.dev/components/browser-use
- https://www.npmjs.com/package/browser-use-convex-component
- https://docs.convex.dev/components/authoring
- https://docs.steel.dev/overview/sessions-api/session-lifecycle
- https://docs.steel.dev/overview/captchas-api/overview
