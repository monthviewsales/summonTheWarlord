import bs58 from "bs58";
import { Keypair } from "@solana/web3.js";
import { SolanaTracker } from "solana-swap";
import { loadConfig } from "./config.js";

// Wrapped SOL mint address on Solana
const WRAPPED_SOL_MINT = "So11111111111111111111111111111111111111112";

/**
 * Instantiate a SolanaTracker client using user config.
 */
async function makeTrackerClient() {
    const cfg = await loadConfig();

    // Decode wallet secret key (JSON array or Base58)
    let raw = cfg.walletSecretKey;
    if (!raw) throw new Error("walletSecretKey not set in config");
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

    return new SolanaTracker(keypair, rpcUrl);
}

/**
 * Buy tokens: spend a specific amount of SOL to acquire <mint>.
 * @param {string} mint       SPL token mint address
 * @param {number|string} amountSol  Amount in SOL to spend, or "auto"/"<percent>%"
 * @returns Promise resolving with txid, tokens received, and quote/rate details
 */
export async function buyToken(mint, amountSol) {
    const cfg = await loadConfig();
    const tracker = await makeTrackerClient();

    // Build swap instructions: WSOL -> target token
    const swapResp = await tracker.getSwapInstructions(
        WRAPPED_SOL_MINT,
        mint,
        amountSol,
        cfg.slippage,
        tracker.keypair.publicKey.toBase58(),
        cfg.priorityFee === "auto" ? undefined : Number(cfg.priorityFee)
    );

    // Execute the swap
    let txid;
    try {
        const result = await tracker.performSwap(swapResp, {
            sendOptions: { skipPreflight: false, preflightCommitment: "confirmed" },
            confirmationRetries: 30,
            confirmationRetryTimeout: 500,
            lastValidBlockHeightBuffer: 150,
            resendInterval: 1000,
            confirmationCheckInterval: 1000,
            commitment: "processed",
            skipConfirmationCheck: false
        });
        txid = result.signature ?? result;
    } catch (err) {
        throw new Error(`Swap failed: ${err.message || err}`);
    }

    // Normalize quote/rate and extract received tokens
    const quote = swapResp.quote ?? swapResp.rate ?? {};
    const tokensReceivedDecimal = quote.outAmount ?? quote.amountOut ?? 0;

    return { txid, tokensReceivedDecimal, quote };
}

/**
 * Sell tokens: swap a specified amount (decimal, 'auto', or '<percent>%') back to SOL.
 * @param {string} mint      SPL token mint address
 * @param {number|string} amount  Decimal amount, "auto", or "<percent>%"
 * @returns Promise resolving with txid, SOL received, and quote/rate details
 */
export async function sellToken(mint, amount) {
    const cfg = await loadConfig();
    const tracker = await makeTrackerClient();

    // Build swap instructions: token -> WSOL
    const swapResp = await tracker.getSwapInstructions(
        mint,
        WRAPPED_SOL_MINT,
        amount,
        cfg.slippage,
        tracker.keypair.publicKey.toBase58(),
        cfg.priorityFee === "auto" ? undefined : Number(cfg.priorityFee)
    );

    // Execute the swap
    let txid;
    try {
        const result = await tracker.performSwap(swapResp, {
            sendOptions: { skipPreflight: false, preflightCommitment: "confirmed" },
            confirmationRetries: 30,
            confirmationRetryTimeout: 500,
            lastValidBlockHeightBuffer: 150,
            resendInterval: 1000,
            confirmationCheckInterval: 1000,
            commitment: "processed",
            skipConfirmationCheck: false
        });
        txid = result.signature ?? result;
    } catch (err) {
        throw new Error(`Swap failed: ${err.message || err}`);
    }

    // Normalize quote/rate and extract SOL received
    const quote = swapResp.quote ?? swapResp.rate ?? {};
    const solReceivedDecimal = quote.outAmount ?? quote.amountOut ?? 0;

    return { txid, solReceivedDecimal, quote };
}
