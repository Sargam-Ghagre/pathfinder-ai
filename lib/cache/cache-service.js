import { cacheStore } from "./store.js";
import { DEFAULT_CACHE_TTL_MS, generateCacheKey } from "./utils.js";

export function buildCacheKey(userId, prompt) {
  return generateCacheKey("ai", userId, prompt);
}

export async function getCachedResponse(userId, prompt) {
  const key = buildCacheKey(userId, prompt);

  try {
    return await cacheStore.get(key);
  } catch (error) {
    console.warn("[cache] Failed to read cached response", error);
    return null;
  }
}

export async function cacheResponse(userId, prompt, response) {
  if (!response) return;

  const key = buildCacheKey(userId, prompt);

  try {
    await cacheStore.set(key, response, DEFAULT_CACHE_TTL_MS);
  } catch (error) {
    console.warn("[cache] Failed to store cached response", error);
  }
}