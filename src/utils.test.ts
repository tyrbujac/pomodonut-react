import { describe, it, expect } from "vitest";
import { formatTime, wedgePath, parseTime } from "./utils";

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

describe("wedgePath", () => {
  it("returns empty string for zero progress", () => {
    expect(wedgePath(0)).toBe("");
  });

  it("returns empty string for negative progress", () => {
    expect(wedgePath(-0.1)).toBe("");
  });

  it("returns a full-circle path for progress >= 1", () => {
    const path = wedgePath(1);
    // Full circle uses two 180° arcs; check it contains two arc commands
    expect((path.match(/A/g) ?? []).length).toBe(2);
    expect(path).toContain("M 130,130");
  });

  it("returns a wedge path for partial progress", () => {
    const path = wedgePath(0.5);
    // Should contain exactly one arc command for a partial wedge
    expect((path.match(/A/g) ?? []).length).toBe(1);
    expect(path).toContain("M 130,130");
    // The large-arc flag should be 0 for progress <= 0.5
    expect(path).toContain("0 0 0");
  });

  it("uses large-arc flag 1 for progress > 0.5", () => {
    const path = wedgePath(0.75);
    expect(path).toContain("1 0 ");
  });

  it("starts at 12 o'clock (130, -20)", () => {
    const path = wedgePath(0.25);
    // Start point L 130,-20 (cx=130, cy=130, r=150 → startY=130-150=-20)
    expect(path).toContain("L 130,-20");
  });
});

describe("parseTime", () => {
  it("parses MM:SS format", () => {
    expect(parseTime("25:00")).toBe(1500);
    expect(parseTime("4:21")).toBe(261);
    expect(parseTime("1:30")).toBe(90);
  });

  it("parses single-digit minute M:SS", () => {
    expect(parseTime("5:00")).toBe(300);
    expect(parseTime("0:30")).toBe(30);
  });

  it("returns null for invalid formats", () => {
    expect(parseTime("abc")).toBeNull();
    expect(parseTime("25")).toBeNull();
    expect(parseTime(":30")).toBeNull();
    expect(parseTime("5:60")).toBeNull(); // seconds >= 60
    expect(parseTime("5:99")).toBeNull();
    expect(parseTime("")).toBeNull();
  });

  it("clamps to minimum of 5 seconds", () => {
    expect(parseTime("0:00")).toBe(5);
    expect(parseTime("0:03")).toBe(5);
    expect(parseTime("0:05")).toBe(5);
  });

  it("clamps to maximum of 5999 seconds (99:59)", () => {
    expect(parseTime("99:59")).toBe(5999);
  });

  it("trims surrounding whitespace", () => {
    expect(parseTime("  5:00  ")).toBe(300);
  });
});
