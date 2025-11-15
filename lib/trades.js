import { notify } from "../utils/notify.js";
import { SolanaTracker } from "solana-swap";
import { loadConfig } from "./config.js";
import { getPrivateKey } from "../utils/keychain.js";

// Wrapped SOL mint address on Solana
const WRAPPED_SOL_MINT = "So11111111111111111111111111111111111111112";

// Memoize the SolanaTracker client so we don't rebuild it for every swap (retry-safe)
let _clientPromise = null;
const getTrackerClient = async () => {
  if (!_clientPromise) {
    _clientPromise = makeTrackerClient().catch((err) => {
      // Reset so subsequent calls can retry client creation
      _clientPromise = null;
      throw err;
    });
  }
  return _clientPromise;
};

/**
 * Instantiate a SolanaTracker client using user config.
 */
async function makeTrackerClient() {
  const cfg = await loadConfig();

  const raw = await getPrivateKey();
  if (!raw) throw new Error("Private key not found in macOS Keychain. Run `warlord keychain store` first.");

  // Lazy-load heavy deps only when needed
  const [{ default: bs58 }, { Keypair }] = await Promise.all([
    import("bs58"),
    import("@solana/web3.js"),
  ]);

  // Decode wallet secret key (JSON array or Base58)
  let secretBytes;
  if (raw.trim().startsWith("[")) {
    secretBytes = Uint8Array.from(JSON.parse(raw));
  } else {
    secretBytes = bs58.decode(raw.trim());
  }
  const keypair = Keypair.fromSecretKey(secretBytes);

  // Ensure RPC URL includes advancedTx=true
  let rpcUrl = cfg.rpcUrl;
  if (!rpcUrl.includes("advancedTx")) {
    const separator = rpcUrl.includes("?") ? "&" : "?";
    rpcUrl = `${rpcUrl}${separator}advancedTx=true`;
  }

  // Pass API key as 3rd arg (no header hacks). Stay HTTP-only.
  const apiKey = cfg.swapAPIKey || undefined; // your jduck key
  const debugEnabled = Boolean(cfg.DEBUG_MODE || process.env.NODE_ENV === "development");

  // ctor: (keypair, rpcUrl, apiKey?, debug?)
  const tracker = new SolanaTracker(keypair, rpcUrl, apiKey, debugEnabled);

  if (debugEnabled && typeof tracker.setDebug === "function") {
    tracker.setDebug(true);
  }
  return tracker;
}

/**
 * Buy tokens: spend a specific amount of SOL to acquire <mint>.
 * @param {string} mint       SPL token mint address
 * @param {number|string} amountSol  Amount in SOL to spend, or "auto"/"<percent>%"
 * @returns Promise resolving with txid, tokens received, and quote/rate details
 */
export async function buyToken(mint, amountSol) {
  const cfg = await loadConfig();
  const tracker = await getTrackerClient();
  const debugEnabled = Boolean(cfg.DEBUG_MODE || process.env.NODE_ENV === "development");

  const slippage = Number(cfg.slippage);
  const priorityFeeArg = (cfg.priorityFee === "auto") ? "auto" : Number(cfg.priorityFee);

  // Advanced opts: keep HTTP-only; include txVersion/priority level; include software fee here
  const opts = {
    txVersion: cfg.txVersion || "v0",
    priorityFeeLevel: cfg.priorityFeeLevel || "low",
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
    const result = await tracker.performSwap(swapResp, { debug: debugEnabled });
    txid = result.signature ?? result;
  } catch (err) {
    throw new Error(`Swap failed: ${err.message || err}`);
  }

  // Normalize quote/rate and extract received tokens
  const quote = swapResp.quote ?? swapResp.rate ?? {};
  const tokensReceivedDecimal = Number(quote.amountOut ?? 0);
  const fee = Number(quote.fee ?? 0);
  const platformFee = Number(quote.platformFeeUI ?? 0);
  const totalFees = fee + platformFee;
  const priceImpact = quote.priceImpact;

  const feePercent = (tokensReceivedDecimal > 0 && quote.amountIn)
    ? ((totalFees / quote.amountIn) * 100)
    : null;

  notify(
    `Bought ${tokensReceivedDecimal.toFixed(4)} tokens\nFees: ${totalFees.toFixed(4)} (${feePercent?.toFixed(2) ?? "0.00"}%) | Impact: ${priceImpact?.toFixed(2)}%`,
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
  const tracker = await getTrackerClient();
  const debugEnabled = Boolean(cfg.DEBUG_MODE || process.env.NODE_ENV === "development");

  const slippage = Number(cfg.slippage);
  const priorityFeeArg = (cfg.priorityFee === "auto") ? "auto" : Number(cfg.priorityFee);
  const opts = {
    txVersion: cfg.txVersion || "v0",
    priorityFeeLevel: cfg.priorityFeeLevel || "low",
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
    const result = await tracker.performSwap(swapResp, { debug: debugEnabled });
    txid = result.signature ?? result;
  } catch (err) {
    throw new Error(`Swap failed: ${err.message || err}`);
  }

  // Normalize quote/rate and extract SOL received
  const quote = swapResp.quote ?? swapResp.rate ?? {};
  const solReceivedDecimal = Number(quote.outAmount ?? quote.amountOut ?? 0);
  const fee = Number(quote.fee ?? 0);
  const platformFee = Number(quote.platformFeeUI ?? 0);
  const totalFees = fee + platformFee;
  const priceImpact = quote.priceImpact;

  const feePercent = (solReceivedDecimal > 0)
    ? ((totalFees / solReceivedDecimal) * 100)
    : null;

  notify(
    `Received ${solReceivedDecimal.toFixed(4)} SOL\nFees: ${totalFees.toFixed(4)} (${feePercent?.toFixed(2) ?? "0.00"}%) | Impact: ${priceImpact?.toFixed(2)}%`,
    "🔴 Sell Completed"
  );
  return { txid, solReceivedDecimal, totalFees, priceImpact, quote };
}
