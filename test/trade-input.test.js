import { describe, expect, test } from "@jest/globals";

import {
  getAmountExamples,
  normalizeMint,
  parseAmount,
  validateMint,
  validateTradeInput,
} from "../lib/tradeInput.js";

const VALID_MINT = "6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN";

describe("trade input mint parsing", () => {
  test("normalizeMint trims surrounding whitespace", () => {
    expect(normalizeMint(`  ${VALID_MINT}  `)).toBe(VALID_MINT);
  });

  test("validateMint rejects missing mint", () => {
    const result = validateMint("   ");

    expect(result.ok).toBe(false);
    expect(result.field).toBe("mint");
    expect(result.code).toBe("missing");
  });

  test("validateMint rejects non-base58 mint content", () => {
    const result = validateMint("00000000000000000000000000000000");

    expect(result.ok).toBe(false);
    expect(result.code).toBe("invalid");
  });

  test("validateMint accepts base58 mint in expected length range", () => {
    const result = validateMint(VALID_MINT);

    expect(result.ok).toBe(true);
    expect(result.value).toBe(VALID_MINT);
  });
});

describe("trade input amount parsing", () => {
  test("parseAmount returns numeric values for positive amounts", () => {
    const result = parseAmount(" 1.25 ");

    expect(result.ok).toBe(true);
    expect(result.value).toBe(1.25);
  });

  test("parseAmount preserves percent form", () => {
    const result = parseAmount(" 25% ");

    expect(result.ok).toBe(true);
    expect(result.value).toBe("25%");
  });

  test("parseAmount preserves auto form", () => {
    const result = parseAmount(" AUTO ");

    expect(result.ok).toBe(true);
    expect(result.value).toBe("auto");
  });

  test("parseAmount rejects non-positive numeric values", () => {
    const zero = parseAmount("0");
    const negative = parseAmount("-1");

    expect(zero.ok).toBe(false);
    expect(negative.ok).toBe(false);
    expect(zero.code).toBe("invalid");
    expect(negative.code).toBe("invalid");
  });
});

describe("trade input validation by trade type", () => {
  test("buy rejects auto amount", () => {
    const result = validateTradeInput({ type: "buy", mint: VALID_MINT, amount: "auto" });

    expect(result.ok).toBe(false);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].code).toBe("buy_auto_not_supported");
  });

  test("sell accepts auto amount", () => {
    const result = validateTradeInput({ type: "sell", mint: VALID_MINT, amount: "auto" });

    expect(result.ok).toBe(true);
    expect(result.amount).toBe("auto");
  });

  test("issues are ordered with mint errors before amount errors", () => {
    const result = validateTradeInput({ type: "buy", mint: "bad", amount: "0" });

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.field)).toEqual(["mint", "amount"]);
  });

  test("amount examples include buy and sell specific values", () => {
    expect(getAmountExamples("buy")).toEqual(["0.01", "25%"]);
    expect(getAmountExamples("sell")).toEqual(["100", "25%", "auto"]);
  });
});
