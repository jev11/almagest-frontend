import { describe, it, expect, beforeEach } from "vitest";
import "fake-indexeddb/auto";
import { ChartCache } from "../../../../packages/astro-client/src/cache.js";
import type { StoredChart } from "../../../../packages/astro-client/src/types.js";

function makeChart(id: string, name = "Test"): StoredChart {
  return {
    id,
    name,
    chart: {} as StoredChart["chart"],
    request: { datetime: "2000-01-01T12:00:00Z", latitude: 0, longitude: 0 },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

// Each test gets a fresh cache instance backed by a fresh IDB db name
let cache: ChartCache;
let dbIndex = 0;

beforeEach(() => {
  dbIndex++;
  cache = new ChartCache(`astro-chart-cache-test-${dbIndex}`);
});

describe("ChartCache CRUD", () => {
  it("returns undefined for a missing id", async () => {
    expect(await cache.get("nonexistent")).toBeUndefined();
  });

  it("stores and retrieves a chart", async () => {
    const chart = makeChart("abc123");
    await cache.set(chart);
    const result = await cache.get("abc123");
    expect(result).toEqual(chart);
  });

  it("overwrites an existing chart with the same id", async () => {
    await cache.set(makeChart("dup", "Original"));
    await cache.set(makeChart("dup", "Updated"));
    const result = await cache.get("dup");
    expect(result?.name).toBe("Updated");
  });

  it("getAll returns all stored charts", async () => {
    await cache.set(makeChart("a"));
    await cache.set(makeChart("b"));
    await cache.set(makeChart("c"));
    const all = await cache.getAll();
    expect(all).toHaveLength(3);
  });

  it("delete removes the chart", async () => {
    await cache.set(makeChart("del"));
    await cache.delete("del");
    expect(await cache.get("del")).toBeUndefined();
  });

  it("delete is a no-op for unknown id", async () => {
    await expect(cache.delete("ghost")).resolves.toBeUndefined();
  });

  it("clear removes all charts", async () => {
    await cache.set(makeChart("x"));
    await cache.set(makeChart("y"));
    await cache.clear();
    expect(await cache.getAll()).toHaveLength(0);
  });

  it("count returns correct number", async () => {
    expect(await cache.count()).toBe(0);
    await cache.set(makeChart("one"));
    await cache.set(makeChart("two"));
    expect(await cache.count()).toBe(2);
  });
});
