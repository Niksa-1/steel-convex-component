import { beforeEach, describe, expect, test } from "vitest";

import { createMockSteelClient, createSteelTestHarness, steelFunction } from "./sessionTestUtils";

describe("steel sessions unit tests", () => {
  beforeEach(() => {
    createMockSteelClient();
  });

  test("syncs remote session refresh into local cache", async () => {
    const t = createSteelTestHarness();
    createMockSteelClient({
      sessions: [
        {
          externalId: "sync-live-001",
          status: "failed",
          createdAt: 1_700_000_000_020,
          updatedAt: 1_700_000_000_020,
          lastSyncedAt: 1_700_000_000_020,
          debugUrl: "https://remote.example.com/sync-live-001",
          sessionViewerUrl: "https://viewer.example.com/sync-live-001",
          websocketUrl: "wss://ws.example.com/sync-live-001",
          timeout: 600,
          duration: 1_000,
          creditsUsed: 12,
          eventCount: 4,
          proxyBytesUsed: 800,
          profileId: "profile-sync",
          region: "us-east-1",
          headless: true,
          isSelenium: false,
          userAgent: "test-agent/0.2",
        },
      ],
    });
    const ownerId = "tenant-sync-unit";

    await t.fun(steelFunction("sessions:upsert"), {
      externalId: "sync-live-001",
      status: "released",
      createdAt: 1_700_000_000_000,
      updatedAt: 1_700_000_000_000,
      lastSyncedAt: 1_700_000_000_000,
      ownerId,
    });

    const refreshed = await t.fun(steelFunction("sessions:refresh"), {
      externalId: "sync-live-001",
      ownerId,
      apiKey: "unit-test-key",
      includeRaw: true,
    });

    expect(refreshed.status).toBe("failed");

    const cached = await t.fun(steelFunction("sessions:getByExternalId"), {
      externalId: "sync-live-001",
      ownerId,
    });
    expect(cached).not.toBeNull();
    expect(cached?.status).toBe("failed");
  });

  test("upsert updates existing session rows", async () => {
    const t = createSteelTestHarness();
    const ownerId = "tenant-upsert-unit";

    await t.fun(steelFunction("sessions:upsert"), {
      externalId: "upsert-001",
      status: "live",
      createdAt: 1_700_000_010_000,
      updatedAt: 1_700_000_010_000,
      lastSyncedAt: 1_700_000_010_000,
      ownerId,
      timeout: 600,
      duration: 10,
      userAgent: "before-update",
    });

    await t.fun(steelFunction("sessions:upsert"), {
      externalId: "upsert-001",
      status: "released",
      createdAt: 1_700_000_010_000,
      updatedAt: 1_700_000_020_000,
      lastSyncedAt: 1_700_000_020_000,
      ownerId,
      timeout: 600,
      duration: 20,
      userAgent: "after-update",
    });

    const updated = await t.fun(steelFunction("sessions:getByExternalId"), {
      externalId: "upsert-001",
      ownerId,
    });

    expect(updated).not.toBeNull();
    expect(updated?.status).toBe("released");
    expect(updated?.duration).toBe(20);
    expect(updated?.updatedAt).toBe(1_700_000_020_000);
  });

  test("lists tenant-scoped sessions", async () => {
    const t = createSteelTestHarness();
    const ownerA = "tenant-list-a";
    const ownerB = "tenant-list-b";

    await t.fun(steelFunction("sessions:upsert"), {
      externalId: "list-a-live",
      status: "live",
      createdAt: 1_700_000_030_000,
      updatedAt: 1_700_000_030_100,
      lastSyncedAt: 1_700_000_030_100,
      ownerId: ownerA,
    });
    await t.fun(steelFunction("sessions:upsert"), {
      externalId: "list-a-released",
      status: "released",
      createdAt: 1_700_000_031_000,
      updatedAt: 1_700_000_031_100,
      lastSyncedAt: 1_700_000_031_100,
      ownerId: ownerA,
    });
    await t.fun(steelFunction("sessions:upsert"), {
      externalId: "list-b-live",
      status: "live",
      createdAt: 1_700_000_032_000,
      updatedAt: 1_700_000_032_100,
      lastSyncedAt: 1_700_000_032_100,
      ownerId: ownerB,
    });

    const ownerAList = await t.fun(steelFunction("sessions:list"), { ownerId: ownerA });
    expect(ownerAList.items).toHaveLength(2);
    expect(ownerAList.items.every((item: { ownerId: string }) => item.ownerId === ownerA)).toBe(
      true,
    );

    const ownerBList = await t.fun(steelFunction("sessions:list"), { ownerId: ownerB });
    expect(ownerBList.items).toHaveLength(1);
    expect(ownerBList.items[0].ownerId).toBe(ownerB);
    expect(ownerBList.items[0].externalId).toBe("list-b-live");

    const ownerALive = await t.fun(steelFunction("sessions:list"), {
      ownerId: ownerA,
      status: "live",
    });
    expect(ownerALive.items).toHaveLength(1);
    expect(ownerALive.items[0].status).toBe("live");
  });

  test("release is idempotent for already released sessions", async () => {
    const t = createSteelTestHarness();
    const ownerId = "tenant-release-unit";
    const mockClient = createMockSteelClient();

    await t.fun(steelFunction("sessions:upsert"), {
      externalId: "released-idempotent-001",
      status: "released",
      createdAt: 1_700_000_040_000,
      updatedAt: 1_700_000_040_000,
      lastSyncedAt: 1_700_000_040_000,
      ownerId,
    });

    const first = await t.fun(steelFunction("sessions:release"), {
      externalId: "released-idempotent-001",
      ownerId,
      apiKey: "unit-test-key",
    });
    const second = await t.fun(steelFunction("sessions:release"), {
      externalId: "released-idempotent-001",
      ownerId,
      apiKey: "unit-test-key",
    });

    expect(first.status).toBe("released");
    expect(second.status).toBe("released");
    expect(
      mockClient.__calls.sessions.some((item: { method: string }) => item.method === "release"),
    ).toBe(false);
  });
});
