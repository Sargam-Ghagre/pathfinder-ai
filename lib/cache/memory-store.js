import { createMemoryCacheStore } from "./store.js";

export const memoryStore = createMemoryCacheStore({ cleanupIntervalMs: 0 });