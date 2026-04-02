/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import type { SchemaDefinition, GenericSchema } from "convex/server";
import appSchema from "../example/convex/schema";
import componentSchema from "../src/component/schema";
import {
  registerMockSteelClient,
  resetMockSteelClient,
  type MockSteelClientOptions,
  componentModules,
} from "../src/test";

const appModules = import.meta.glob("../example/convex/**/*.ts");

const ACTION_PATHS = new Set([
  "sessions:refresh", "sessions:refreshMany", "sessions:release",
  "sessions:releaseAll", "sessions:create", "sessions:computer",
  "sessions:context", "sessions:events", "sessions:liveDetails",
  "sessionFiles:list", "sessionFiles:upload", "sessionFiles:delete", "sessionFiles:deleteAll",
  "captchas:status", "captchas:solve", "captchas:solveImage",
  "profiles:list", "profiles:get", "profiles:create", "profiles:update",
  "credentials:list", "credentials:create", "credentials:update", "credentials:delete",
  "extensions:list", "extensions:upload", "extensions:update", "extensions:delete",
  "extensions:deleteAll", "extensions:download",
  "files:list", "files:upload", "files:delete", "files:download",
  "topLevel:screenshot", "topLevel:scrape", "topLevel:pdf",
]);

const MUTATION_PATHS = new Set([
  "sessions:upsert",
]);

export type FunctionPath = {
  componentPath: string;
  udfPath: string;
  type: "action" | "query" | "mutation";
};

export const createSteelTestHarness = () => {
  const t = convexTest(
    appSchema as SchemaDefinition<GenericSchema, boolean>,
    appModules,
  );
  t.registerComponent(
    "steel",
    componentSchema as SchemaDefinition<GenericSchema, boolean>,
    componentModules as unknown as Record<string, () => Promise<any>>,
  );

  const makeFunctionRef = (componentPath: string, udfPath: string) => {
    const ref = {} as any;
    const [module, fn] = udfPath.split(":");
    ref[Symbol.for("toReferencePath")] = `_reference/app/${componentPath}/${module}/${fn}`;
    return ref;
  };

  const fun = async (fn: FunctionPath, args: Record<string, unknown>) => {
    const ref = makeFunctionRef(fn.componentPath, fn.udfPath);
    if (fn.type === "action") return t.action(ref, args);
    if (fn.type === "mutation") return t.mutation(ref, args);
    return t.query(ref, args);
  };

  return { ...t, fun };
};

export const steelFunction = (udfPath: string): FunctionPath => ({
  componentPath: "steel",
  udfPath,
  type: ACTION_PATHS.has(udfPath) ? "action" : MUTATION_PATHS.has(udfPath) ? "mutation" : "query",
});

export const resetSteelClientMock = (): void => resetMockSteelClient();

export const createMockSteelClient = (options: MockSteelClientOptions = { sessions: [] }) => {
  resetMockSteelClient();
  return registerMockSteelClient(options);
};