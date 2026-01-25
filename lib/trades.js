import { notify } from "../utils/notify.js";
import { loadConfig } from "./config.js";
import { SwapError } from "./errors.js";
import { getSwapClient } from "./swapClient.js";
import { formatPercent } from "./tradeFormat.js";

// Wrapped SOL mint address on Solana
const WRAPPED_SOL_MINT = "So11111111111111111111111111111111111111112";

/**
 * Buy tokens: spend a specific amount of SOL to acquire <mint>.
 * @param {string} mint       SPL token mint address
 * @param {number|string} amountSol  Amount in SOL to spend, or "auto"/"<percent>%"
 * @returns Promise resolving with txid, tokens received, and quote/rate details
 */
export async function buyToken(mint, amountSol) {
  const cfg = await loadConfig();
  const tracker = await getSwapClient();
  const debugEnabled = Boolean(cfg.DEBUG_MODE || process.env.NODE_ENV === "development");

  const slippage = cfg.slippage;
  const priorityFeeArg = cfg.priorityFee;
  const priorityFeeLevel = cfg.priorityFeeLevel || "medium";
  const jito = cfg.jito?.enabled ? { enabled: true, tip: cfg.jito.tip } : null;

  // Advanced opts: keep HTTP-only; include txVersion/priority level; include software fee here
  const opts = {
    txVersion: cfg.txVersion || "v0",
    priorityFeeLevel,
    fee: { wallet: "8aBKXBErcp1Bi5LmaeGnaXCj9ot7PE4T2wuqHQfeT5E6", percentage: 0.4 }, // 0.4%
    feeType: "add"
    // other optional flags that you may expose later:
    // onlyDirectRoutes: false,
    // customTip: undefined,
  };

  // Build swap instructions: WSOL -> target token
  const swapResp = await tracker.getSwapInstructions(
    WRAPPED_SOL_MINT,
    mint,
    amountSol,                         // supports numbers, "auto", or "NN%"
    slippage,
    tracker.keypair.publicKey.toBase58(),
    priorityFeeArg,
    false,                             // forceLegacy; keep false when using txVersion in opts
    opts
  );

  // Execute the swap (HTTP polling only; no websockets)
  let txid;
  try {
    const performOpts = { debug: debugEnabled };
    if (jito) {
      performOpts.jito = jito;
    }
    const result = await tracker.performSwap(swapResp, performOpts);
    txid = result.signature ?? result;
  } catch (err) {
    throw new SwapError(`Swap failed: ${err.message || err}`, { cause: err });
  }

  // Normalize quote/rate and extract received tokens
  const quote = swapResp.quote ?? swapResp.rate ?? {};
  const tokensReceivedDecimal = Number(quote.amountOut ?? 0);
  const fee = Number(quote.fee ?? 0);
  const platformFee = Number(quote.platformFeeUI ?? 0);
  const totalFees = fee + platformFee;
  const priceImpact = quote.priceImpact;
  const priceImpactDisplay = formatPercent(priceImpact);

  const feePercent = (tokensReceivedDecimal > 0 && quote.amountIn)
    ? ((totalFees / quote.amountIn) * 100)
    : null;
  const feePercentDisplay = formatPercent(feePercent, { fallback: "0.00" });

  notify(
    `Bought ${tokensReceivedDecimal.toFixed(4)} tokens\nFees: ${totalFees.toFixed(4)} (${feePercentDisplay}%) | Impact: ${priceImpactDisplay}%`,
    "🟢 Buy Completed"
  );
  return { txid, tokensReceivedDecimal, totalFees, priceImpact, quote };
}

/**
 * Sell tokens: swap a specified amount (decimal, 'auto', or '<percent>%') back to SOL.
 * @param {string} mint      SPL token mint address
 * @param {number|string} amount  Decimal amount, "auto", or "<percent>%"
 * @returns Promise resolving with txid, SOL received, and quote/rate details
 */
export async function sellToken(mint, amount) {
  const cfg = await loadConfig();
  const tracker = await getSwapClient();
  const debugEnabled = Boolean(cfg.DEBUG_MODE || process.env.NODE_ENV === "development");

  const slippage = cfg.slippage;
  const priorityFeeArg = cfg.priorityFee;
  const priorityFeeLevel = cfg.priorityFeeLevel || "medium";
  const jito = cfg.jito?.enabled ? { enabled: true, tip: cfg.jito.tip } : null;
  const opts = {
    txVersion: cfg.txVersion || "v0",
    priorityFeeLevel,
    // add operator fee to sells as well:
    fee: { wallet: "8aBKXBErcp1Bi5LmaeGnaXCj9ot7PE4T2wuqHQfeT5E6", percentage: 0.4 }, // 0.4%
    feeType: "deduct"
  };

  // Build swap instructions: token -> WSOL
  const swapResp = await tracker.getSwapInstructions(
    mint,
    WRAPPED_SOL_MINT,
    amount,
    slippage,
    tracker.keypair.publicKey.toBase58(),
    priorityFeeArg,
    false,
    opts
  );

  // Execute the swap (HTTP polling only; no websockets)
  let txid;
  try {
    const performOpts = { debug: debugEnabled };
    if (jito) {
      performOpts.jito = jito;
    }
    const result = await tracker.performSwap(swapResp, performOpts);
    txid = result.signature ?? result;
  } catch (err) {
    throw new SwapError(`Swap failed: ${err.message || err}`, { cause: err });
  }

  // Normalize quote/rate and extract SOL received
  const quote = swapResp.quote ?? swapResp.rate ?? {};
  const solReceivedDecimal = Number(quote.outAmount ?? quote.amountOut ?? 0);
  const fee = Number(quote.fee ?? 0);
  const platformFee = Number(quote.platformFeeUI ?? 0);
  const totalFees = fee + platformFee;
  const priceImpact = quote.priceImpact;
  const priceImpactDisplay = formatPercent(priceImpact);

  const feePercent = (solReceivedDecimal > 0)
    ? ((totalFees / solReceivedDecimal) * 100)
    : null;
  const feePercentDisplay = formatPercent(feePercent, { fallback: "0.00" });

  notify(
    `Received ${solReceivedDecimal.toFixed(4)} SOL\nFees: ${totalFees.toFixed(4)} (${feePercentDisplay}%) | Impact: ${priceImpactDisplay}%`,
    "🔴 Sell Completed"
  );
  return { txid, solReceivedDecimal, totalFees, priceImpact, quote };
}
