// Transports and clients against a fake fetch.
import { MutationObserver, QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { SERVER_REQUEST_TIMEOUT_MS } from "@/lib/config";
import { ApiError, errorMessage } from "./errors";
import { createEstimatorClient } from "./estimator";
import { createServerTransport } from "./server-transport";
import { createBrowserTransport, type Transport } from "./transport";

// `server-only` throws outside Next's server build.
vi.mock("server-only", () => ({}));

const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers });
const hangs: typeof fetch = (_url, init) =>
  new Promise((_, reject) => init?.signal?.addEventListener("abort", () => reject(init.signal!.reason)));
const replying = (res: () => Response) => (async () => res()) as typeof fetch;

describe("browser transport", () => {
  const call = (res: () => Response) => createBrowserTransport({ fetch: replying(res) })("estimator", "/estimates");

  it("maps a FastAPI 422 list to field: msg", async () => {
    await expect(call(() => json(422, { detail: [{ loc: ["body", "bedrooms"], msg: "must be >= 1" }] }))).rejects.toThrow("bedrooms: must be >= 1");
  });

  it("falls back for a 5xx without detail", async () => {
    await expect(call(() => json(502, {}))).rejects.toThrow("The service is unavailable right now. Try again in a moment.");
  });

  it("reads the request id into ApiError and errorMessage", async () => {
    const e = (await call(() => json(404, { detail: "nope" }, { "X-Request-ID": "abcdef0123456789" })).catch((x) => x)) as ApiError;
    expect(e).toBeInstanceOf(ApiError);
    expect(e.requestId).toBe("abcdef0123456789");
    expect(errorMessage(e)).toBe("nope · ref abcdef01");
  });

  it("returns undefined for 204", async () => {
    await expect(call(() => new Response(null, { status: 204 }))).resolves.toBeUndefined();
  });

  it("turns a timeout into the timeout message", async () => {
    await expect(createBrowserTransport({ fetch: hangs, timeoutMs: 20 })("market", "/summary")).rejects.toThrow("The request timed out. Try again.");
  });

  it("re-throws a caller abort untouched", async () => {
    const caller = new AbortController();
    const p = createBrowserTransport({ fetch: hangs })("market", "/summary", { signal: caller.signal }).catch((x) => x);
    caller.abort();
    const e = (await p) as Error;
    expect(e).not.toBeInstanceOf(ApiError);
    expect(e.name).toBe("AbortError");
  });
});

describe("server transport", () => {
  it("turns a hung fetch into a readable timeout within the budget", async () => {
    expect(SERVER_REQUEST_TIMEOUT_MS).toBeLessThanOrEqual(5_000);
    const t0 = Date.now();
    await expect(createServerTransport({ fetch: hangs, timeoutMs: 50 })("estimator", "/estimates")).rejects.toThrow(
      "The estimator service timed out. Try again in a moment.",
    );
    expect(Date.now() - t0).toBeLessThan(1_000);
  });

  it("uses the same 422 mapping and a status fallback", async () => {
    const t = (res: () => Response) => createServerTransport({ fetch: replying(res) });
    await expect(t(() => json(422, { detail: [{ loc: ["query", "by"], msg: "bad" }] }))("market", "/segments?by=x")).rejects.toThrow("by: bad");
    await expect(t(() => json(500, {}))("market", "/summary?")).rejects.toThrow("The market service failed (500)");
  });

  it("applies the cache policy per backend", async () => {
    const seen: { url: string; init?: RequestInit }[] = [];
    const spy = createServerTransport({ fetch: (async (url, init) => (seen.push({ url: String(url), init }), json(200, []))) as typeof fetch });
    await spy("estimator", "/estimates");
    await spy("market", "/summary?min_price=1");
    expect(seen[0].init?.cache).toBe("no-store");
    expect((seen[0].init?.headers as Record<string, string>)["X-Request-ID"]).toBeTruthy();
    expect(seen[1].url).toContain("/api/market/summary?min_price=1");
    // No request id on market reads: it would split the fetch cache.
    expect(Object.keys(seen[1].init ?? {}).sort()).toEqual(["next", "signal"]);
  });
});

describe("estimator client", () => {
  const calls: string[] = [];
  const fake = (tag: string): Transport => (async (backend, path, req) => (calls.push(`${tag} ${backend} ${req?.method ?? "GET"} ${path}`), [])) as Transport;
  const browser = createEstimatorClient(fake("browser"));
  const server = createEstimatorClient(fake("server"));

  it("has the same key and path whichever transport is used", async () => {
    const makers = [(c: typeof browser) => c.queries.estimates(), (c: typeof browser) => c.queries.estimatesByIds([1, 2]), (c: typeof browser) => c.queries.modelInfo()];
    for (const make of makers) {
      const [a, b] = [make(browser), make(server)];
      expect(a.queryKey).toEqual(b.queryKey);
      await (a.queryFn as (c: unknown) => Promise<unknown>)({});
      await (b.queryFn as (c: unknown) => Promise<unknown>)({});
    }
    expect(calls).toEqual([
      "browser estimator GET /estimates", "server estimator GET /estimates",
      "browser estimator GET /estimates?ids=1,2", "server estimator GET /estimates?ids=1,2",
      "browser estimator GET /model-info", "server estimator GET /model-info",
    ]);
  });

  it("invalidates the estimates key after create and delete", async () => {
    const qc = new QueryClient();
    qc.setQueryData(browser.queries.estimates().queryKey, []);
    qc.setQueryData(browser.queries.estimatesByIds([1, 2]).queryKey, []);
    qc.setQueryData(browser.queries.modelInfo().queryKey, {} as never);
    await new MutationObserver(qc, browser.mutations.create(qc)).mutate({ label: "x" } as never);
    const stale = (key: readonly unknown[]) => qc.getQueryState(key)!.isInvalidated;
    expect(stale(browser.queries.estimates().queryKey)).toBe(true);
    expect(stale(browser.queries.estimatesByIds([1, 2]).queryKey)).toBe(true);
    expect(stale(browser.queries.modelInfo().queryKey)).toBe(false);
    expect(calls.at(-1)).toMatch(/^browser estimator POST \/estimates/);
    await new MutationObserver(qc, browser.mutations.delete(qc)).mutate(7);
    expect(calls.at(-1)).toBe("browser estimator DELETE /estimates/7");
  });
});
