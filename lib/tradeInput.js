export const MINT_EXAMPLE = "6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN";

const MINT_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const FIELD_ORDER = ["mint", "amount"];

const AMOUNT_EXAMPLES = Object.freeze({
  buy: ["0.01", "25%"],
  sell: ["100", "25%", "auto"],
});

export function getAmountExamples(type) {
  return AMOUNT_EXAMPLES[type] || ["0.01"];
}

export function normalizeMint(rawMint) {
  return String(rawMint ?? "").trim();
}

export function validateMint(rawMint) {
  const mint = normalizeMint(rawMint);
  if (!mint) {
    return {
      ok: false,
      field: "mint",
      code: "missing",
      message: "Missing mint address. Provide a base58 token mint (32-44 chars).",
      value: null,
    };
  }
  if (!MINT_REGEX.test(mint)) {
    return {
      ok: false,
      field: "mint",
      code: "invalid",
      message: "Invalid mint format. Expected base58 address (32-44 chars).",
      value: null,
    };
  }
  return { ok: true, field: "mint", code: null, message: null, value: mint };
}

export function normalizeAmount(rawAmount) {
  return String(rawAmount ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
}

export function parseAmount(rawAmount) {
  const normalized = normalizeAmount(rawAmount);
  if (!normalized) {
    return {
      ok: false,
      field: "amount",
      code: "missing",
      message: "Missing amount.",
      value: null,
    };
  }
  if (normalized !== "auto" && !normalized.endsWith("%")) {
    const parsed = parseFloat(normalized);
    if (Number.isNaN(parsed) || parsed <= 0) {
      return {
        ok: false,
        field: "amount",
        code: "invalid",
        message: "Invalid amount. Use a positive number, 'auto' during a sell, or '<percent>%'.",
        value: null,
      };
    }
    return { ok: true, field: "amount", code: null, message: null, value: parsed };
  }
  return { ok: true, field: "amount", code: null, message: null, value: normalized };
}

export function validateTradeInput({ type, mint, amount }) {
  const mintResult = validateMint(mint);
  const amountResult = parseAmount(amount);
  const issues = [];

  if (!mintResult.ok) {
    issues.push(mintResult);
  }
  if (!amountResult.ok) {
    issues.push(amountResult);
  } else if (type === "buy" && amountResult.value === "auto") {
    issues.push({
      ok: false,
      field: "amount",
      code: "buy_auto_not_supported",
      message: "Buying with 'auto' isn't supported. Use a number or '<percent>%'.",
      value: null,
    });
  }

  issues.sort((left, right) => FIELD_ORDER.indexOf(left.field) - FIELD_ORDER.indexOf(right.field));

  return {
    ok: issues.length === 0,
    mint: mintResult.ok ? mintResult.value : null,
    amount: amountResult.ok ? amountResult.value : null,
    issues,
  };
}
