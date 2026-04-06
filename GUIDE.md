# Getting Started with steel-convex-component

A step-by-step guide to integrating Steel browser sessions into your Convex app.

---

## What you'll build

By the end of this guide you'll have a Convex app that can:

- Create and manage Steel browser sessions
- Persist session state in your Convex database
- Scope sessions per tenant with `ownerId`
- List, refresh, and release sessions

---

## Prerequisites

- Node.js 18+
- A Convex account — [dashboard.convex.dev](https://dashboard.convex.dev)
- A Steel API key — [steel.dev](https://steel.dev)

---

## Installation

Install the component and its peer dependency:

```bash
npm install steel-convex-component convex
```

Or install directly from GitHub if you want the latest unreleased version:

```bash
npm install github:steel-experiments/steel-convex-component#master
```

---

## Step 1 — Mount the component

In your `convex/convex.config.ts`, register the Steel component:

```ts
import { defineApp } from "convex/server";
import steel from "steel-convex-component/convex.config";

const app = defineApp();
app.use(steel);

export default app;
```

---

## Step 2 — Add a schema

Your app needs a `convex/schema.ts` with at least an empty schema:

```ts
import { defineSchema } from "convex/server";

export default defineSchema({});
```

You can add your own tables here alongside the component's tables.

---

## Step 3 — Create the client

In any Convex action file, instantiate `SteelComponent`:

```ts
import { components } from "./_generated/api";
import { SteelComponent } from "steel-convex-component";

const steel = new SteelComponent(components.steel, {
  STEEL_API_KEY: process.env.STEEL_API_KEY,
});
```

The `STEEL_API_KEY` is read from the Convex runtime environment. Never hardcode it.

---

## Step 4 — Set your API key

Convex runtime does not inherit your shell environment. Set the key explicitly:

```bash
npx convex env set STEEL_API_KEY <your_steel_key>
```

---

## Step 5 — Write your first action

Create `convex/steelActions.ts`:

```ts
import { action } from "./_generated/server";
import { v } from "convex/values";
import { components } from "./_generated/api";
import { SteelComponent } from "steel-convex-component";

const steel = new SteelComponent(components.steel, {
  STEEL_API_KEY: process.env.STEEL_API_KEY,
});

export const runLifecycle = action({
  args: { ownerId: v.string() },
  handler: async (ctx, args) => {
    const { ownerId } = args;

    // Create a session
    const created = await steel.sessions.create(
      ctx,
      { sessionArgs: { timeout: 120000 } },
      { ownerId },
    );

    // Refresh it
    const refreshed = await steel.sessions.refresh(
      ctx,
      { externalId: created.externalId },
      { ownerId },
    );

    // Release it when done
    const released = await steel.sessions.release(
      ctx,
      { externalId: created.externalId },
      { ownerId },
    );

    return { created, refreshed, released };
  },
});
```

---

## Step 6 — Run it

Start Convex dev in one terminal:

```bash
npx convex dev
```

Run your action in another terminal:

```bash
npx convex run steelActions:runLifecycle '{"ownerId":"tenant-1"}'
```

A successful response looks like:

```json
{
  "created": {
    "status": "live",
    "externalId": "3afa1818-...",
    "debugUrl": "https://api.steel.dev/v1/sessions/.../player",
    "websocketUrl": "wss://connect.steel.dev?sessionId=...",
    "sessionViewerUrl": "https://app.steel.dev/sessions/...",
    "ownerId": "tenant-1"
  },
  "refreshed": { "status": "live", ... },
  "released": { "status": "released", ... }
}
```

`created.status === "live"` and `released.status === "released"` means the integration is working correctly.

---

## Listing sessions

Sessions are persisted in Convex after every create/refresh/release. You can query them:

```ts
export const listSessions = action({
  args: { ownerId: v.string() },
  handler: async (ctx, args) =>
    steel.sessions.list(ctx, { ownerId: args.ownerId }, { ownerId: args.ownerId }),
});
```

```bash
npx convex run steelActions:listSessions '{"ownerId":"tenant-1"}'
```

You can also filter by status:

```ts
steel.sessions.list(ctx, { ownerId, status: "live" }, { ownerId })
```

---

## Scraping a page

The component includes a top-level `scrape` utility that fetches page metadata without managing a session manually:

```ts
export const getTitle = action({
  args: { ownerId: v.string(), url: v.string() },
  handler: async (ctx, args) => {
    const result = await steel.steel.scrape(
      ctx,
      { url: args.url },
      { ownerId: args.ownerId },
    );
    return result;
  },
});
```

```bash
npx convex run steelActions:getTitle '{"ownerId":"tenant-1","url":"https://example.com"}'
```

---

## Multi-tenant usage

Every method requires an `ownerId`. Sessions are fully isolated per tenant — `sessions.list` for `tenant-a` will never return sessions belonging to `tenant-b`.

```ts
// tenant-a's sessions
await steel.sessions.create(ctx, { sessionArgs: {} }, { ownerId: "tenant-a" });

// tenant-b's sessions — completely separate
await steel.sessions.create(ctx, { sessionArgs: {} }, { ownerId: "tenant-b" });
```

---

## Available modules

| Module | Methods |
|---|---|
| `sessions` | `create`, `refresh`, `refreshMany`, `release`, `releaseAll`, `get`, `getByExternalId`, `list` |
| `sessionFiles` | `list`, `upload`, `delete`, `deleteAll` |
| `captchas` | `status`, `solve`, `solveImage` |
| `profiles` | `list`, `get`, `create`, `update` |
| `credentials` | `create`, `update`, `list`, `delete` |
| `extensions` | `list`, `upload`, `update`, `delete`, `deleteAll`, `download` |
| `files` | `list`, `upload`, `delete`, `download` |
| `steel` | `screenshot`, `scrape`, `pdf` |

---

## Data model

The component maintains its own Convex tables, all scoped by `ownerId`:

- `sessions` — session lifecycle state, URLs, timestamps
- `sessionFileMetadata` — files attached to sessions
- `captchaStates` — captcha solve state per session
- `profiles` — browser profiles
- `credentials` — saved login credentials
- `extensions` — browser extensions
- `globalFiles` — files not tied to a specific session

These tables are managed automatically — you read from them via the component's query methods, not directly.

---

## Testing

The component ships with a test helper for use with `convex-test` and Vitest:

```ts
import { convexTest } from "convex-test";
import { componentModules, registerMockSteelClient } from "steel-convex-component/test";
import componentSchema from "steel-convex-component/component/schema";
import appSchema from "./schema";

const t = convexTest(appSchema, appModules);
t.registerComponent("steel", componentSchema, componentModules);

// Mock the Steel client
registerMockSteelClient({ sessions: [] });
```

Run the component's own test suite:

```bash
npm run test
npm run typecheck
npm run release:check
```

---

## Real-world example — price monitor

This example builds a price monitor that checks a product's price on a schedule and stores the result in Convex. Each user gets their own isolated session and their own price history.

### Schema

Add a `priceHistory` table to your `convex/schema.ts`:

```ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  priceHistory: defineTable({
    ownerId: v.string(),
    url: v.string(),
    price: v.string(),
    checkedAt: v.number(),
  })
    .index("byOwnerAndUrl", ["ownerId", "url"])
    .index("byOwner", ["ownerId"]),
});
```

### Action

Create `convex/priceMonitor.ts`:

```ts
import { action, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { components } from "./_generated/api";
import { SteelComponent } from "steel-convex-component";
import { api } from "./_generated/api";

const steel = new SteelComponent(components.steel, {
  STEEL_API_KEY: process.env.STEEL_API_KEY,
});

// Check the price of a product URL and store the result
export const checkPrice = action({
  args: {
    ownerId: v.string(),
    url: v.string(),
  },
  handler: async (ctx, args) => {
    const { ownerId, url } = args;

    // Create a Steel session
    const session = await steel.sessions.create(
      ctx,
      { sessionArgs: { timeout: 60000 } },
      { ownerId },
    );

    try {
      // Scrape the page for price data
      const result = await steel.steel.scrape(
        ctx,
        { url },
        { ownerId },
      );

      // Extract price from metadata (adapt selector to your target site)
      const price = (result as any)?.metadata?.price ?? "unknown";

      // Store in Convex
      await ctx.runMutation(api.priceMonitor.recordPrice, {
        ownerId,
        url,
        price,
        checkedAt: Date.now(),
      });

      return { price, sessionId: session.externalId };
    } finally {
      // Always release the session
      await steel.sessions.release(
        ctx,
        { externalId: session.externalId },
        { ownerId },
      );
    }
  },
});

// Store a price record
export const recordPrice = mutation({
  args: {
    ownerId: v.string(),
    url: v.string(),
    price: v.string(),
    checkedAt: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("priceHistory", args);
  },
});

// Read price history for a URL
export const getPriceHistory = query({
  args: {
    ownerId: v.string(),
    url: v.string(),
  },
  handler: async (ctx, args) => {
    return ctx.db
      .query("priceHistory")
      .withIndex("byOwnerAndUrl", (q) =>
        q.eq("ownerId", args.ownerId).eq("url", args.url),
      )
      .order("desc")
      .take(50);
  },
});
```

### Run it

```bash
npx convex run priceMonitor:checkPrice '{"ownerId":"user-1","url":"https://example.com/product"}'
```

Then query the history:

```bash
npx convex run priceMonitor:getPriceHistory '{"ownerId":"user-1","url":"https://example.com/product"}'
```

### Key patterns this demonstrates

- **Session per task** — create a session, do the work, always release in a `finally` block so sessions are never leaked
- **Tenant isolation** — each user's price history is scoped by `ownerId` and never visible to other users
- **Convex as the store** — scraped data lands directly in your Convex tables, ready to query in real time from your frontend
- **Separation of concerns** — Steel handles the browser, Convex handles the data, your action orchestrates both

---

## Common issues

**`Missing STEEL_API_KEY`**

The Convex runtime does not inherit your shell environment. Run:

```bash
npx convex env set STEEL_API_KEY <your_key>
```

**`Schema file missing default export`**

Make sure your `convex/schema.ts` has `export default defineSchema({...})`, not `export const schema = defineSchema({...})`.

**`No matching export ... components`**

Import `components` from `./_generated/api`, not `./_generated/server`:

```ts
// correct
import { components } from "./_generated/api";

// wrong
import { components } from "./_generated/server";
```

**`paginate() is only supported in the app`**

This is a known Convex limitation — `paginate()` cannot be used inside components. The component uses `take()` instead.

---

## Next steps

- Browse the full [API reference](./API.md)
- Check the [demo repo](https://github.com/steel-experiments/steel-convex-demo) for a working example
- See [steel.dev](https://steel.dev) for Steel API documentation