import { describe, expect, it } from "vitest";
import { mapWithConcurrency } from "./pool.js";

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

describe("mapWithConcurrency", () => {
  it("preserves input order even when later items resolve first", async () => {
    const out = await mapWithConcurrency([30, 10, 20], 3, async (ms) => {
      await delay(ms);
      return ms;
    });
    expect(out).toEqual([30, 10, 20]);
  });

  it("runs work concurrently up to the limit", async () => {
    let inFlight = 0;
    let peak = 0;
    const out = await mapWithConcurrency([1, 2, 3, 4, 5, 6, 7], 3, async (n) => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      await delay(10);
      inFlight--;
      return n * 2;
    });
    expect(out).toEqual([2, 4, 6, 8, 10, 12, 14]);
    expect(peak).toBe(3);
  });

  it("never exceeds a limit larger than the item count", async () => {
    let inFlight = 0;
    let peak = 0;
    await mapWithConcurrency([1, 2], 10, async (n) => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      await delay(5);
      inFlight--;
      return n;
    });
    expect(peak).toBe(2);
  });

  it("handles an empty list", async () => {
    const out = await mapWithConcurrency([], 5, async (n) => n);
    expect(out).toEqual([]);
  });

  it("propagates a rejection from the mapper", async () => {
    await expect(
      mapWithConcurrency([1, 2, 3], 2, async (n) => {
        if (n === 2) throw new Error("boom");
        return n;
      }),
    ).rejects.toThrow("boom");
  });
});
