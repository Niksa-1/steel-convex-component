# API Reference

This document describes the generated component functions and the typed app wrapper in
`src/client/index.ts`.

## Quick conventions

- Methods are called as `steel.<group>.<method>(ctx, args, options?)`.
- `ctx` is a Convex execution context (`ctx.runAction`, `ctx.runQuery`,
  `ctx.runMutation` depending on method type).
- `options` are the same shape as `SteelComponentOptions`:
  - `STEEL_API_KEY?: string` (optional override)
  - `ownerId?: string` (optional override)
- All wrapper methods resolve `apiKey` from options / constructor / `process.env.STEEL_API_KEY`.
- All wrapper methods resolve `ownerId` from args / wrapper / options and fail fast
  when unresolved.

## Shared return types

- `SteelSessionRecord`
  - Core session metadata used across list/query/action returns.
- `SteelListResult`
  - `{ items: SteelSessionRecord[]; hasMore: boolean; continuation?: string }`
- `SteelRefreshManyResult`
  - `{ items: SteelSessionRecord[]; failures: { externalId?: string; operation: string; message: string }[]; hasMore: boolean; continuation?: string }`
- `SteelReleaseAllResult`
  - `{ items: SteelSessionRecord[]; failures: { externalId: string; operation: string; message: string }[]; hasMore: boolean; continuation?: string }`
- `SteelSessionFileListResult`
  - `{ items: SteelSessionFileRecord[]; hasMore: boolean; continuation?: string }`
- `SteelFileListResult`
  - `{ items: SteelFileRecord[]; hasMore: boolean; continuation?: string }`
- `SteelProfileListResult`
  - `{ items: SteelProfileMetadata[]; hasMore: boolean; continuation?: string }`
- `SteelCredentialListResult`
  - `{ items: SteelCredentialMetadata[]; hasMore: boolean; continuation?: string }`
- `SteelExtensionListResult`
  - `{ items: SteelExtensionMetadata[]; hasMore: boolean; continuation?: string }`

## Top-level utility actions

Methods live on `steel.steel.*`.

| Group | Method | Boundary | Description | Returns |
| --- | --- | --- | --- | --- |
| `steel` | `screenshot` | action | Run Steel screenshot utility. |
`{ url, timeout?, commandArgs? }` | `unknown` |
| `steel` | `scrape` | action | Run Steel scrape utility. |
`{ url, timeout?, commandArgs? }` | `unknown` |
| `steel` | `pdf` | action | Run Steel PDF utility. |
`{ url, timeout?, commandArgs? }` | `unknown` |

## Sessions module

`sessions` is the primary module and uses mixed boundaries.

### Actions

| Method | Description | Args | Returns |
| --- | --- | --- | --- |
| `create` | Create remote session and write-through local metadata. | `SteelComponentSessionCreateArgs` | `SteelSessionRecord` |
| `refresh` | Pull latest remote state for one session and upsert local metadata. | `SteelComponentSessionRefreshArgs` | `SteelSessionRecord` |
| `refreshMany` | Bulk refresh by status cursor + limit; continues on partial failures. | `SteelComponentSessionRefreshManyArgs` | `SteelRefreshManyResult` |
| `release` | Release one remote session (idempotent if already released). | `SteelComponentSessionReleaseArgs` | `SteelSessionRecord` |
| `releaseAll` | Release local sessions by owner and optional status; paginated. | `SteelComponentSessionReleaseAllArgs` | `SteelReleaseAllResult` |
| `computer` | Pass-through Steel session command endpoint. | `SteelComponentSessionCommandArgs` | `unknown` |
| `context` | Pass-through Steel session context endpoint. | `SteelComponentSessionCommandArgs` | `unknown` |
| `liveDetails` | Pass-through Steel liveDetails; optional snapshot persistence. | `SteelComponentSessionLiveDetailsArgs` | `unknown` |
| `events` | Pass-through Steel events endpoint. | `SteelComponentSessionCommandArgs` | `unknown` |

### Queries

| Method | Description | Args | Returns |
| --- | --- | --- | --- |
| `get` | Get local session by component row id. | `SteelComponentSessionGetArgs` | `SteelSessionRecord \| null` |
| `getByExternalId` | Get local session by external id. | `SteelComponentSessionGetByExternalIdArgs` | `SteelSessionRecord \| null` |
| `list` | Paginated owner/status session list. | `SteelComponentSessionListArgs` | `SteelListResult` |

Notes:

- `limit` defaults to `50` and is clamped to `100`.
- List responses include `{ hasMore, continuation }`.
- `ownerId` is required at wrapper level for all `SteelComponent` method calls.

## Session files module

Methods on `sessionsFiles`.

| Method | Boundary | Description | Args | Returns |
| --- | --- | --- | --- | --- |
| `list` | action | List files for a session from Steel and sync local metadata. | `SteelComponentSessionFileListArgs` | `SteelSessionFileListResult` |
| `uploadFromUrl` | action | Upload/create session file entry from URL, persist metadata. | `SteelComponentSessionFileUploadArgs` | `SteelSessionFileRecord \| unknown` |
| `delete` | action | Delete session file by path and clear local row for that path. | `SteelComponentSessionFileDeleteArgs` | `unknown` |
| `deleteAll` | action | Delete all session file metadata entries for a session. | `SteelComponentSessionFileDeleteAllArgs` | `unknown` |

## Global files module

Methods on `files`.

| Method | Boundary | Description | Args | Returns |
| --- | --- | --- | --- | --- |
| `list` | action | List global files from Steel, persist metadata rows. | `SteelComponentFileListArgs` | `SteelFileListResult` |
| `uploadFromUrl` | action | Upload/create file metadata from URL. | `SteelComponentFileUploadFromUrlArgs` | `SteelFileRecord` |
| `delete` | action | Delete remote file and remove local metadata. | `SteelComponentFileDeleteArgs` | `unknown` |
| `downloadToStorage` | action | Optional helper to request storage download path; metadata best-effort upsert. | `SteelComponentFileDownloadToStorageArgs` | `unknown` |

## Captchas module

Methods on `captchas`.

| Method | Boundary | Description | Args | Returns |
| --- | --- | --- | --- | --- |
| `status` | action | Fetch captcha status. | `SteelComponentCaptchaStatusArgs` | `unknown` |
| `solve` | action | Send solve request for captcha challenge context. | `SteelComponentCaptchaSolveArgs` | `unknown` |
| `solveImage` | action | Send image solve request for captcha challenge context. | `SteelComponentCaptchaSolveArgs` | `unknown` |

## Profiles module

Methods on `profiles`.

| Method | Boundary | Description | Args | Returns |
| --- | --- | --- | --- | --- |
| `list` | action | List Steel profiles and persist metadata. | `SteelComponentProfileListArgs` | `SteelProfileListResult` |
| `get` | action | Get one profile by external id and persist metadata. | `SteelComponentProfileGetArgs` | `SteelProfileMetadata` |
| `createFromUrl` | action | Create profile from `userDataDirUrl`; stores metadata. | `SteelComponentProfileCreateFromUrlArgs` | `SteelProfileMetadata` |
| `updateFromUrl` | action | Update profile, optional new `userDataDirUrl`. | `SteelComponentProfileUpdateFromUrlArgs` | `SteelProfileMetadata` |

## Credentials module

Methods on `credentials`.

| Method | Boundary | Description | Args | Returns |
| --- | --- | --- | --- | --- |
| `create` | action | Create credential metadata entry locally after remote create. | `SteelComponentCredentialCreateArgs` | `SteelCredentialMetadata` |
| `update` | action | Update credential metadata entry locally after remote update. | `SteelComponentCredentialUpdateArgs` | `SteelCredentialMetadata` |
| `list` | action | List remote credentials and persist metadata. | `SteelComponentCredentialListArgs` | `SteelCredentialListResult` |
| `delete` | action | Delete remote credential and clear local metadata. | `SteelComponentCredentialDeleteArgs` | `unknown` |

## Extensions module

Methods on `extensions`.

| Method | Boundary | Description | Args | Returns |
| --- | --- | --- | --- | --- |
| `list` | action | List extensions and persist metadata. | `SteelComponentExtensionListArgs` | `SteelExtensionListResult` |
| `uploadFromUrl` | action | Upload extension from URL and persist metadata. | `SteelComponentExtensionUploadFromUrlArgs` | `SteelExtensionMetadata` |
| `updateFromUrl` | action | Update extension from URL, persist metadata. | `SteelComponentExtensionUpdateFromUrlArgs` | `SteelExtensionMetadata` |
| `delete` | action | Delete extension by external id and remove local metadata. | `SteelComponentExtensionDeleteArgs` | `unknown` |
| `deleteAll` | action | Delete all extensions for current owner. | `SteelComponentExtensionDeleteAllArgs` | `unknown` |

## Security and scoping notes

- All public wrapper methods inject and validate `ownerId`.
- Component side `ownerId` validation is also enforced in mutation/action handlers.
- Secret handling:
  - `apiKey` is never persisted by the component.
  - Credentials metadata persistence avoids obvious secret-like keys.
- Query boundaries only read local tables; no remote Steel calls from queries.

## Internal methods

The generated component also exposes internal mutation/query helpers used by public
actions/flows for normalization/upsert logic. These are intended for generated
component internals and test harness usage, not direct app calls.

Refer to `src/component/sessions.ts` and adjacent component modules for internals.

