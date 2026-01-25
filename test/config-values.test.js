import { test, expect } from "@jest/globals";

import { parseConfigValue, normalizeConfigValue } from "../lib/config.js";

test("parseConfigValue coerces booleans and numbers", () => {
  expect(parseConfigValue("true")).toBe(true);
  expect(parseConfigValue("false")).toBe(false);
  expect(parseConfigValue("1.5")).toBe(1.5);
  expect(parseConfigValue("abc")).toBe("abc");
});

test("normalizeConfigValue validates slippage", () => {
  expect(normalizeConfigValue("slippage", 2, { strict: true })).toBe(2);
  expect(() => normalizeConfigValue("slippage", -1, { strict: true })).toThrow();
});

test("normalizeConfigValue accepts priorityFee auto or number", () => {
  expect(normalizeConfigValue("priorityFee", "auto", { strict: true })).toBe("auto");
  expect(normalizeConfigValue("priorityFee", 0.1, { strict: true })).toBe(0.1);
});
