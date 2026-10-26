// errorMessage with a request id is covered in clients.test.ts; these are the other branches.
import { describe, expect, it } from "vitest";
import { ApiError, errorMessage } from "./errors";

describe("errorMessage", () => {
  it("appends the first 8 chars of the request id", () => {
    expect(errorMessage(new ApiError(500, "boom", "0123456789abcdef"))).toBe("boom · ref 01234567");
  });
  it("has no suffix without a request id", () => {
    expect(errorMessage(new ApiError(500, "boom"))).toBe("boom");
    expect(errorMessage(new ApiError(500, "boom", null))).toBe("boom");
  });
  it("uses the message of a plain Error", () => expect(errorMessage(new Error("bad"))).toBe("bad"));
  it("falls back for non-errors", () => expect(errorMessage("oops")).toBe("Something went wrong"));
});
