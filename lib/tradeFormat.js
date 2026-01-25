export function formatPercent(value, { fallback = "N/A" } = {}) {
  const num = Number(value);
  return Number.isFinite(num) ? num.toFixed(2) : fallback;
}
