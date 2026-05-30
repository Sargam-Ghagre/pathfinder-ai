import { expect, it } from "vitest";

import { generateCacheKey, hashString } from "../lib/cache/utils.js";

it("hashString is deterministic and truncated to a compact length", () => {
  const first = hashString("hello world");
  const second = hashString("hello world");

  expect(first).toBe(second);
  expect(first).toHaveLength(32);
});

it("generateCacheKey is stable for nested inputs", () => {
  const keyA = generateCacheKey("quiz", "technology", ["React", "Node.js"], { category: "Technical" });
  const keyB = generateCacheKey("quiz", "technology", ["React", "Node.js"], { category: "Technical" });
  const keyC = generateCacheKey("quiz", "technology", ["Node.js", "React"], { category: "Technical" });

  expect(keyA).toBe(keyB);
  expect(keyA).not.toBe(keyC);
  expect(keyA.startsWith("quiz:")).toBe(true);
});