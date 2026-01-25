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
  expect(normalizeConfigValue("slippage", "auto", { strict: true })).toBe("auto");
  expect(() => normalizeConfigValue("slippage", -1, { strict: true })).toThrow();
});

test("normalizeConfigValue accepts priorityFee auto or number", () => {
  expect(normalizeConfigValue("priorityFee", "auto", { strict: true })).toBe("auto");
  expect(normalizeConfigValue("priorityFee", 0.1, { strict: true })).toBe(0.1);
});

test("normalizeConfigValue validates priorityFeeLevel", () => {
  expect(normalizeConfigValue("priorityFeeLevel", "medium", { strict: true })).toBe("medium");
  expect(() => normalizeConfigValue("priorityFeeLevel", "unsafeMax", { strict: true })).toThrow();
});

test("normalizeConfigValue validates jito config", () => {
  expect(normalizeConfigValue("jito", { enabled: true, tip: 0.0001 }, { strict: true })).toEqual({
    enabled: true,
    tip: 0.0001,
  });
  expect(() => normalizeConfigValue("jito", { enabled: "maybe" }, { strict: true })).toThrow();
});
