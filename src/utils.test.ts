import { describe, it, expect } from "vitest";
import { formatTime } from "./utils";

describe("formatTime", () => {
  it("formats whole minutes", () => {
    expect(formatTime(1500)).toBe("25:00");
  });

  it("pads seconds with a leading zero", () => {
    expect(formatTime(65)).toBe("1:05");
  });

  it("handles seconds under ten", () => {
    expect(formatTime(5)).toBe("0:05");
  });

  it("handles zero", () => {
    expect(formatTime(0)).toBe("0:00");
  });
});