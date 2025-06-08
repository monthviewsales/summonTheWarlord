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
 * @param {string} mint  SPL token mint address
 * @param {number} amountSol  Amount in SOL to spend
 */
export async function buyToken(mint, amountSol) {
    const cfg = await loadConfig();
    const tracker = await makeTrackerClient();
    // Build swap: WSOL -> target token
    const swapResponse = await tracker.getSwapInstructions(
        WRAPPED_SOL_MINT,
        mint,
        amountSol,
        cfg.slippage,
        tracker.keypair.publicKey.toBase58(),
        cfg.priorityFee === "auto" ? undefined : Number(cfg.priorityFee)
    );
    // Execute swap
    let txid;
    try {
        txid = await tracker.performSwap(swapResponse, {
            sendOptions: { skipPreflight: false, preflightCommitment: "confirmed" },
            confirmationRetries: 30,
            confirmationRetryTimeout: 500,
            lastValidBlockHeightBuffer: 150,
            resendInterval: 1000,
            confirmationCheckInterval: 1000,
            commitment: "processed",
            skipConfirmationCheck: false
        });
    } catch (err) {
        throw new Error(`Swap failed: ${err.message || err}`);
    }
    const tokensReceivedDecimal = swapResponse.quote?.outAmount;
    return { txid, tokensReceivedDecimal, quote: swapResponse.quote };
}

/**
 * Sell tokens: sell a percentage of holdings or specific SOL amount.
 * @param {string} mint    SPL token mint address
 * @param {string} amount  "auto", "<percent>%", or numeric string for tokens
 */
export async function sellToken(mint, amount) {
    const cfg = await loadConfig();
    const tracker = await makeTrackerClient();
    // Build swap: token -> WSOL
    const swapResponse = await tracker.getSwapInstructions(
        mint,
        WRAPPED_SOL_MINT,
        amount,
        cfg.slippage,
        tracker.keypair.publicKey.toBase58(),
        cfg.priorityFee === "auto" ? undefined : Number(cfg.priorityFee)
    );
    // Execute swap
    let txid;
    try {
        txid = await tracker.performSwap(swapResponse, {
            sendOptions: { skipPreflight: false, preflightCommitment: "confirmed" },
            confirmationRetries: 30,
            confirmationRetryTimeout: 500,
            lastValidBlockHeightBuffer: 150,
            resendInterval: 1000,
            confirmationCheckInterval: 1000,
            commitment: "processed",
            skipConfirmationCheck: false
        });
    } catch (err) {
        throw new Error(`Swap failed: ${err.message || err}`);
    }
    const solReceivedDecimal = swapResponse.quote?.outAmount;
    return { txid, solReceivedDecimal, quote: swapResponse.quote };
}