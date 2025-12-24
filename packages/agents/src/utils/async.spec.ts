import { describe, expect, it, vi } from "vitest";
import { IgniterAgentAsyncUtils } from "./async";

describe("IgniterAgentAsyncUtils", () => {
  it("delays execution", async () => {
    vi.useFakeTimers();

    const delayed = IgniterAgentAsyncUtils.delay(10).then(() => "done");
    await vi.advanceTimersByTimeAsync(10);

    await expect(delayed).resolves.toBe("done");
    vi.useRealTimers();
  });

  it("retries until success", async () => {
    vi.useFakeTimers();

    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("fail"))
      .mockResolvedValue("ok");

    const promise = IgniterAgentAsyncUtils.retry(fn, {
      maxAttempts: 2,
      baseDelay: 5,
      maxDelay: 5,
    });

    await vi.runAllTimersAsync();

    await expect(promise).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);

    vi.useRealTimers();
  });
});
