import { SolanaTracker } from "solana-swap";
import { loadConfig } from "./config.js";
import { getPrivateKey } from "../utils/keychain.js";
import { logger } from "../utils/logger.js";
import { ConfigError, SwapError } from "./errors.js";
import { notify } from "../utils/notify.js";

const SWAP_DISCOUNT_CODE = "jduck-d815-4c28-b85d-17e9fc3a21a8";

let clientPromise = null;
let clientFactory = defaultFactory;

export function ensureAdvancedTx(rpcUrl) {
  if (!rpcUrl || typeof rpcUrl !== "string") {
    throw new ConfigError("RPC URL is missing or invalid.");
  }
  if (rpcUrl.includes("advancedTx")) {
    return rpcUrl;
  }
  const separator = rpcUrl.includes("?") ? "&" : "?";
  return `${rpcUrl}${separator}advancedTx=true`;
}

export function setSwapClientFactory(factory) {
  clientFactory = factory;
  clientPromise = null;
}

export async function getSwapClient() {
  if (!clientPromise) {
    clientPromise = clientFactory().catch((err) => {
      clientPromise = null;
      throw err;
    });
  }
  return clientPromise;
}

async function defaultFactory() {
  const cfg = await loadConfig();
  let raw;
  try {
    raw = await getPrivateKey();
  } catch (err) {
    if (cfg.notificationsEnabled !== false) {
      notify({
        title: "🔑 Keychain Missing",
        subtitle: "No private key found",
        message: "Run `warlord keychain store` to add your wallet.",
        sound: "Ping",
      });
    }
    throw err;
  }

  // Lazy-load heavy deps only when needed
  const [{ default: bs58 }, { Keypair }] = await Promise.all([
    import("bs58"),
    import("@solana/web3.js"),
  ]);

  let secretBytes;
  if (raw.trim().startsWith("[")) {
    secretBytes = Uint8Array.from(JSON.parse(raw));
  } else {
    secretBytes = bs58.decode(raw.trim());
  }
  const keypair = Keypair.fromSecretKey(secretBytes);

  const rpcUrl = ensureAdvancedTx(cfg.rpcUrl);
  const apiKey = SWAP_DISCOUNT_CODE;
  const debugEnabled = Boolean(cfg.DEBUG_MODE || process.env.NODE_ENV === "development");

  try {
    const tracker = new SolanaTracker(keypair, rpcUrl, apiKey, debugEnabled);
    if (debugEnabled && typeof tracker.setDebug === "function") {
      tracker.setDebug(true);
    }
    return tracker;
  } catch (err) {
    logger.error("Failed to initialize swap client.", { error: err?.message });
    throw new SwapError("Unable to initialize swap client.", { cause: err });
  }
}
