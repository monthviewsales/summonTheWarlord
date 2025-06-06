// WALLET_SECRET_KEY must be set in `.env.vault` as either:
//   • a JSON array of 64 numbers: [12,34,...], or
//   • a Base58-encoded string.
// The key will be read from process.env.WALLET_SECRET_KEY (not from a file).
// Cache is now in-memory only (not persisted to disk).

// trades.js
// ───────────────────────────────────────────────────────────────────────────────
//   Uses “solana-swap” (v1.0+) to perform every trade, and Data-API SDK for token decimals.
//   Maintains a per-mint cache (holding + totalCostSol) and a sessionRealizedPnl.
//   After each buy or sell, prints that trade’s PnL and cumulative session PnL.
// ───────────────────────────────────────────────────────────────────────────────

import "dotenv-vault/config";  // ← decrypt .env.vault & populate process.env

import { Client as DataApiClient } from "@solana-tracker/data-api";        //  [oai_citation:3‡github.com](https://github.com/YZYLAB/solana-swap)
import { SolanaTracker } from "solana-swap";                               //  [oai_citation:4‡github.com](https://github.com/YZYLAB/solana-swap) [oai_citation:5‡github.com](https://github.com/YZYLAB/solana-swap)
import { createKeyPairFromBytes } from "@solana/keys";
import { toLegacyKeypair } from "@solana/kit/compat";
import bs58 from "bs58";

// ───────────────────────────────────────────────────────────────────────────────
// CONSTANTS & CONFIGURATION
// ───────────────────────────────────────────────────────────────────────────────

// Wrapped SOL mint (used for buy/sell)
const WRAPPED_SOL_MINT = "So11111111111111111111111111111111111111112";

// Lamports per SOL (canonical)
const LAMPORTS_PER_SOL = 1_000_000_000;


// The RPC endpoint used by solana-swap (with advancedTx=true for richer instructions)
const RPC_URL = process.env.RPC_URL;


// Slippage tolerance (in %). You can adjust or pull from .env if you like.
const DEFAULT_SLIPPAGE_PERCENT = 1.0; // 1%

// ───────────────────────────────────────────────────────────────────────────────
// CACHE UTILITIES
// ───────────────────────────────────────────────────────────────────────────────

// Our cache.json structure looks like:
//
// {
//   "mints": {
//     "<MINT_PUBKEY>": {
//       "holding": 1234.567,     // decimal number of tokens currently held
//       "totalCostSol": 5.68123  // total SOL spent acquiring those tokens (cost basis in SOL)
//     },
//     ...
//   },
//   "sessionRealizedPnl": 0.1234  // total SOL gained (or lost) from all sells so far
// }

let memoryCache = { mints: {} };

async function loadCache() {
    return memoryCache;
}

async function saveCache(cacheObj) {
    // No-op: cache is in-memory only
}

// ───────────────────────────────────────────────────────────────────────────────
// DATA-API SDK (for token decimals, name, etc.)
// ───────────────────────────────────────────────────────────────────────────────

function makeDataClient() {
    return new DataApiClient({
        apiKey: process.env.SOLANATRACKER_API_KEY,
    });
}

// Fetch token decimals (and symbol/name) via Data-API SDK
async function fetchTokenInfo(mintAddress) {
    const client = makeDataClient();
    try {
        const info = await client.getTokenInfo(mintAddress);
        // { mint: string, decimals: number, symbol: string, name: string, ... }
        return {
            decimals: info.decimals,
            symbol: info.symbol,
            name: info.name,
        };
    } catch (err) {
        throw new Error(
            `Failed to fetch token info for ${mintAddress}: ${err.message || err}`
        );
    }
}

// ______________________________________________________________________________
// SOLANA-SWAP INITIALIZATION
// ______________________________________________________________________________
//
// We’ll initialize a single SolanaTracker instance per process.  That class comes
// from “solana-swap” (YZYLAB), and under the hood it bundles all the routing logic
// and “multi-DEX” calls for you.  [oai_citation:6‡github.com](https://github.com/YZYLAB/solana-swap)
//

let globalSwapClient = null;

/**
 * 1) Read the secret key from WALLET_SECRET_KEY (JSON array or Base58 string).
 * 2) Instantiate a Keypair from that secret key. Then create a SolanaTracker client.
 */
async function makeSwapClient() {
    if (globalSwapClient) return globalSwapClient;

    // 1) Read WALLET_SECRET_KEY from env
    const raw = process.env.WALLET_SECRET_KEY;
    if (!raw) {
        throw new Error("WALLET_SECRET_KEY is not set in environment.");
    }
    let secretKeyBytes;
    try {
        if (raw.trim().startsWith("[")) {
            secretKeyBytes = Uint8Array.from(JSON.parse(raw));
        } else {
            secretKeyBytes = bs58.decode(raw.trim());
        }
    } catch {
        secretKeyBytes = bs58.decode(raw.trim());
    }
    // Use @solana/keys to create a CryptoKeyPair
    const { privateKey, publicKey } = await createKeyPairFromBytes(secretKeyBytes);
    const cryptoKeyPair = { publicKey, privateKey };
    // Convert to a legacy Keypair for solana-swap
    const keypair = toLegacyKeypair(cryptoKeyPair);
    globalSwapClient = new SolanaTracker(keypair, RPC_URL);
    return globalSwapClient;
}

// ______________________________________________________________________________
// BUY LOGIC
// ______________________________________________________________________________
//
// Steps (buyToken):
//   1) Convert `amountSol` → decimal (the user passes e.g. 0.5 SOL).
//   2) Fetch token decimals for `mintAddress` (only to update our cache with proper decimal).
//   3) Call `swapClient.getSwapInstructions(...)` to build the swap.
//   4) Call `swapClient.performSwap(...)` to execute the transaction.
//   5) Update our cache: 
//        • holding += tokensReceivedDecimal
//        • totalCostSol += amountSol (plus any priority fee + on‐chain fee, if you want to include it).
//   6) Compute this “buy’s PnL”: 
//        • Realized PnL = 0 (because we just bought).
//        • Unrealized PnL = [ newHolding * currentPrice ] − newCostBasis.
//   7) Return an object with all those values so our CLI can print them “in‐character.”
//

/**
 * Buy `amountSol` SOL worth of `mintAddress` tokens.
 *
 * @param {string} mintAddress   – the SPL token mint we want to buy.
 * @param {number} amountSol     – how many SOL (decimal) to spend.
 * @param {number} slippagePct   – maximum slippage in percent (defaults to DEFAULT_SLIPPAGE_PERCENT).
 * @param {number} priorityFee   – how much SOL to tip the node validator (optional; defaults to 0.0005).
 */
export async function buyToken({
    mintAddress,
    amountSol,
    slippagePct = DEFAULT_SLIPPAGE_PERCENT,
    priorityFee = 0.0005,
}) {
    // 1) Load and/or initialize cache
    const cache = await loadCache();
    const previousMintRecord = cache.mints[mintAddress] || {
        holding: 0,
        totalCostSol: 0,
    };
    const previousHolding = previousMintRecord.holding;
    const previousCostBasis = previousMintRecord.totalCostSol;

    // 2) Fetch token info (decimals + symbol)
    const { decimals, symbol } = await fetchTokenInfo(mintAddress);

    // 3) Instantiate our swap client
    const swapClient = await makeSwapClient();

    // 4) Build the swap instructions
    //    getSwapInstructions(fromMint, toMint, amount, slippagePct, payerPubkey, priorityFee)
    //    – The “amount” param here is interpreted *in decimal* (SOL or SPL token units).
    //    – For a WSOL→SPL buy, we pass amountSol directly (it knows WSOL decimals internally).
    //
    let swapResponse;
    try {
        swapResponse = await swapClient.getSwapInstructions(
            WRAPPED_SOL_MINT,          // from = WSOL
            mintAddress,               // to   = target memecoin
            amountSol,                 // amountIn (in decimal SOL)
            slippagePct,               // allowed slippage in %
            swapClient.keypair.publicKey.toBase58(),
            priorityFee                // e.g. 0.0005 SOL tip
        );
    } catch (err) {
        throw new Error(`🛡️ Warlord [buy] → failed to build swap: ${err.message || err}`);
    }

    // 5) Execute the swap (this sends the TX to chain)
    let txid;
    let swapResult;
    try {
        swapResult = await swapClient.performSwap(swapResponse, {
            sendOptions: { skipPreflight: false, preflightCommitment: "confirmed" },
            confirmationRetries: 30,
            confirmationRetryTimeout: 500,
            lastValidBlockHeightBuffer: 150,
            resendInterval: 1000,
            confirmationCheckInterval: 1000,
            commitment: "processed",
            skipConfirmationCheck: false,
        });
        txid = swapResult.signature; // performSwap returns { signature: <txid>, ... }
    } catch (err) {
        // solana-swap throws an error object that may have `.signature` and `.message`
        throw new Error(`🛡️ Warlord [buy] → transaction failed: ${err.message || err}`);
    }

    // 6) Determine how many tokens we actually received.
    //    swapResponse typically carries a `quote.outAmount` (decimal number).
    //    In practice, solana-swap’s getSwapInstructions returns an object whose shape
    //    includes a “quote” property with “outAmount” (decimal tokens received).
    const tokensReceivedDecimal = swapResponse.quote?.outAmount;
    if (typeof tokensReceivedDecimal !== "number") {
        // Fallback: if outAmount isn’t in quote, we could read logs or fetch our new
        // token balance on chain. But by default, the SDK provides quote.outAmount as a decimal.
        throw new Error("🛡️ Warlord [buy] → could not determine tokens received from swapResponse.quote.outAmount");
    }

    // 7) Update our per-mint cache record:
    const newHolding = parseFloat((previousHolding + tokensReceivedDecimal).toFixed(decimals));
    const newCostBasis = parseFloat((previousCostBasis + amountSol).toFixed(9)); // keep SOL precision
    cache.mints[mintAddress] = {
        holding: newHolding,
        totalCostSol: newCostBasis,
    };

    // 8) Compute PnL for this buy:
    //    • Realized PnL = 0 (since no sale yet).
    //    • Unrealized PnL = [ newHolding * currentPrice ] − newCostBasis.
    //      We can get currentPrice via Data-API (price endpoint). For simplicity,
    //      we’ll fetch the “last” price from Data API’s price endpoint:
    let currentPricePerToken;
    try {
        // Data API v0.0.3: client.getTokenPrice(mint) → { price: <decimal USD> … }
        const priceResp = await makeDataClient().getTokenPrice(mintAddress);
        currentPricePerToken = priceResp.price || 0;
    } catch {
        currentPricePerToken = 0; // if price fetch fails, default to 0
    }
    // currentPrice in SOL: since Data API’s price is usually in USD, *we want price in SOL*:
    // Optionally fetch SOL/USD via Data API:
    let solUsdPrice = 0;
    try {
        const solPrice = await makeDataClient().getTokenPrice(WRAPPED_SOL_MINT);
        solUsdPrice = solPrice.price || 0; // e.g. 25.123 USD per SOL
    } catch {
        solUsdPrice = 0;
    }
    const currentPriceInSol = solUsdPrice > 0 ? currentPricePerToken / solUsdPrice : 0;
    const unrealizedPnl = parseFloat(
        (
            newHolding * currentPriceInSol -
            newCostBasis
        ).toFixed(9)
    );

    // 9) Save cache to disk
    await saveCache(cache);

    // 10) Fetch per-token PnL from Data API
    const walletAddress = swapClient.keypair.publicKey.toBase58();
    let tokenPnL = null;
    try {
      tokenPnL = await makeDataClient().getTokenPnL(walletAddress, mintAddress);
    } catch {
      tokenPnL = null;
    }

    // 11) Build our return object (for CLI to print)
    return {
        txid,
        mint: mintAddress,
        symbol,
        amountSpentSol: amountSol,
        tokensReceivedDecimal,
        newHolding,
        newCostBasis,
        realizedPnl: 0,
        unrealizedPnl,
        tokenPnL,
        quote: swapResponse.quote,
    };
}

// ______________________________________________________________________________
// SELL LOGIC
// ______________________________________________________________________________
// Steps (sellToken):
//   1) Load cache → see how many tokens Warlord currently holds of mintAddress.
//   2) Compute `tokensToSellDecimal = (currentHolding * percent/100)`.
//   3) Fetch token decimals (again) to ensure precision.
//   4) Call `getSwapInstructions(mintAddress, WRAPPED_SOL_MINT, tokensToSellDecimal, ...)`
//   5) Call `performSwap(...)` to send the TX.
//   6) Compute how much SOL we actually got: swapResponse.quote.outAmount (decimal SOL).
//   7) Compute realized PnL = SOL_RECEIVED − (avgCostBasis * tokensToSellDecimal) − swapFees.
//   8) Subtract cost basis portion from totalCostSol and update holding.
//   9) Add realized PnL to `cache.sessionRealizedPnl`.
//  10) Persist cache, and return an object for CLI to print.
// ───────────────────────────────────────────────────────────────────────────────

/**
 * Sell a percentage (`percent`, 0 < percent ≤ 100) of our holdings in `mintAddress` for SOL.
 *
 * @param {string} mintAddress  – the SPL token mint we want to sell.
 * @param {number} percent      – integer or decimal percent of our holding to sell (e.g. 25 or 12.5).
 * @param {number} slippagePct  – maximum slippage in percent (defaults to DEFAULT_SLIPPAGE_PERCENT).
 * @param {number} priorityFee  – SOL tip for network priority (default 0.0005).
 */
export async function sellToken({
    mintAddress,
    percent,
    slippagePct = DEFAULT_SLIPPAGE_PERCENT,
    priorityFee = 0.0005,
}) {
    // 1) Load cache
    const cache = await loadCache();
    const mintRecord = cache.mints[mintAddress];
    if (!mintRecord) {
        throw new Error(`🛡️ Warlord [sell] → No holdings found for ${mintAddress}. Cannot sell.`);
    }
    const currentHolding = mintRecord.holding;        // decimal tokens
    const totalCostSol = mintRecord.totalCostSol;      // SOL

    // 2) Compute tokensToSellDecimal
    if (percent <= 0 || percent > 100) {
        throw new Error(`🛡️ Warlord [sell] → Percent must be between 0 and 100.`);
    }
    const tokensToSellDecimal = parseFloat(
        ((currentHolding * percent) / 100).toFixed(8) // we’ll round to 8 decimals
    );
    if (tokensToSellDecimal <= 0) {
        throw new Error(`🛡️ Warlord [sell] → Computed zero tokens to sell at ${percent}%.`);
    }

    // 3) Fetch token decimals (to know how precise we must be)
    const { decimals, symbol } = await fetchTokenInfo(mintAddress);

    // 4) Instantiate swap client
    const swapClient = await makeSwapClient();

    // 5) Build the swap instructions: from `mintAddress` → WSOL
    let swapResponse;
    try {
        swapResponse = await swapClient.getSwapInstructions(
            mintAddress,                // from = memecoin
            WRAPPED_SOL_MINT,           // to   = WSOL
            tokensToSellDecimal,        // amountIn (decimal tokens)
            slippagePct,                // slippage tolerance %
            swapClient.keypair.publicKey.toBase58(),
            priorityFee                 // priority fee in SOL
        );
    } catch (err) {
        throw new Error(`🛡️ Warlord [sell] → failed to build swap: ${err.message || err}`);
    }

    // 6) Execute the swap
    let txid;
    try {
        const swapResult = await swapClient.performSwap(swapResponse, {
            sendOptions: { skipPreflight: false, preflightCommitment: "confirmed" },
            confirmationRetries: 30,
            confirmationRetryTimeout: 500,
            lastValidBlockHeightBuffer: 150,
            resendInterval: 1000,
            confirmationCheckInterval: 1000,
            commitment: "processed",
            skipConfirmationCheck: false,
        });
        txid = swapResult.signature;
    } catch (err) {
        throw new Error(`🛡️ Warlord [sell] → transaction failed: ${err.message || err}`);
    }

    // 7) How much SOL we actually received?
    //    solReceivedDecimal = swapResponse.quote.outAmount (decimal SOL).
    //    swapResponse.quote.outAmount should be a number (e.g. 0.1234 SOL).
    const solReceivedDecimal = swapResponse.quote?.outAmount;
    if (typeof solReceivedDecimal !== "number") {
        throw new Error("🛡️ Warlord [sell] → could not determine SOL received from swapResponse.quote.outAmount");
    }

    // 8) Compute realized PnL for this trade:
    //    • We sold “tokensToSellDecimal” tokens.
    //    • Our average cost‐basis per token was totalCostSol / currentHolding.
    const avgCostPerToken = totalCostSol / currentHolding; // SOL per token
    const costBasisForSoldTokens = avgCostPerToken * tokensToSellDecimal; // in SOL

    //    • Swap fee (in SOL) must be subtracted.  solana-swap’s quote also includes a “fee” field
    //      in SOL; per docs, swapResponse.quote.fee is a decimal SOL amount. If missing, assume 0.
    const swapFeeSol = swapResponse.quote?.fee || 0;

    //    • realizedPnl = SOL_received − costBasisForSoldTokens − swapFeeSol
    const realizedPnl = parseFloat(
        (
            solReceivedDecimal -
            costBasisForSoldTokens -
            swapFeeSol
        ).toFixed(9)
    );

    // 9) Update our per-mint cache object:
    const newHolding = parseFloat(
        (currentHolding - tokensToSellDecimal).toFixed(decimals)
    );
    const newTotalCostSol = parseFloat(
        (totalCostSol - costBasisForSoldTokens).toFixed(9)
    );

    if (newHolding <= 0) {
        delete cache.mints[mintAddress];
    } else {
        cache.mints[mintAddress] = {
            holding: newHolding,
            totalCostSol: newTotalCostSol,
        };
    }

    // 10) Save cache
    await saveCache(cache);

    // 11) Also compute “unrealized PnL” on whatever remains (optional)
    //     newUnrealizedPnl = newHolding * currentPriceInSol − newTotalCostSol
    let currentPricePerToken = 0;
    let solUsdPrice = 0;
    try {
        const priceResp = await makeDataClient().getTokenPrice(mintAddress);
        currentPricePerToken = priceResp.price;
        const solPriceResp = await makeDataClient().getTokenPrice(WRAPPED_SOL_MINT);
        solUsdPrice = solPriceResp.price;
    } catch { }
    const currentPriceInSol = solUsdPrice > 0 ? currentPricePerToken / solUsdPrice : 0;
    const newUnrealizedPnl = parseFloat(
        (
            newHolding * currentPriceInSol -
            newTotalCostSol
        ).toFixed(9)
    );

    // 12) Fetch per-token PnL from Data API
    const walletAddress = swapClient.keypair.publicKey.toBase58();
    let tokenPnL = null;
    try {
      tokenPnL = await makeDataClient().getTokenPnL(walletAddress, mintAddress);
    } catch {
      tokenPnL = null;
    }

    // 13) Return an object with everything so our CLI can format it
    return {
        txid,
        mint: mintAddress,
        symbol,
        tokensSoldDecimal,
        solReceivedDecimal,
        costBasisForSoldTokens,
        swapFeeSol,
        realizedPnl,
        newHolding,
        newTotalCostSol,
        newUnrealizedPnl,
        tokenPnL,
        quote: swapResponse.quote,
    };
}