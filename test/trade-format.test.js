import { test, expect } from "@jest/globals";

import { formatPercent } from "../lib/tradeFormat.js";

test("formatPercent returns fixed percent strings", () => {
  expect(formatPercent(1)).toBe("1.00");
  expect(formatPercent("2.3456")).toBe("2.35");
});

test("formatPercent falls back for invalid values", () => {
  expect(formatPercent("nope")).toBe("N/A");
  expect(formatPercent(undefined)).toBe("N/A");
});
