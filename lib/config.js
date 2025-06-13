import fs from "fs-extra";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";

// Application name for config directory
const APP_NAME = "summonTheWarlord";

// Default configuration values
// Note: walletSecretKey has been moved to macOS Keychain storage
const DEFAULT_CONFIG = {
  rpcUrl: "https://rpc.solanatracker.io/public?advancedTx=true",
  swapAPIKey: "jduck-d815-4c28-b85d-17e9fc3a21a8",
  slippage: 10,               // Maximum acceptable slippage percentage (e.g., 10)
  priorityFee: "auto",        // Amount in SOL or "auto"
  priorityFeeLevel: "low",    // "min","low","medium","high","veryHigh","unsafeMax"
  txVersion: "v0",            // "v0" or "legacy"
  showQuoteDetails: false      //  Outputs the JSON swap response to the console
};

/**
 * Compute the path to the config file.
 * - On macOS: ~/Library/Application Support/summonTheWarlord/config.json
 * - Else:      $XDG_CONFIG_HOME/summonTheWarlord/config.json (or ~/.config/…)
 */
export function getConfigPath() {
  const home = os.homedir();
  if (process.platform === "darwin") {
    const appSupport = path.join(home, "Library", "Application Support", APP_NAME);
    return path.join(appSupport, "config.json");
  }
  const xdgConfig = process.env.XDG_CONFIG_HOME || path.join(home, ".config");
  return path.join(xdgConfig, APP_NAME, "config.json");
}

/**
 * Load the config, writing defaults if the file didn't exist.
 * Also merges in any new keys from DEFAULT_CONFIG.
 */
export async function loadConfig() {
  const configPath = getConfigPath();

  // If missing, write out defaults
  if (!await fs.pathExists(configPath)) {
    await fs.ensureDir(path.dirname(configPath), { mode: 0o700 });
    await fs.writeJson(configPath, DEFAULT_CONFIG, { spaces: 2 });
    await fs.chmod(configPath, 0o600);
    return { ...DEFAULT_CONFIG };
  }

  // Read existing, merge missing defaults
  const cfg = await fs.readJson(configPath);
  let updated = false;
  for (const [key, value] of Object.entries(DEFAULT_CONFIG)) {
    if (!(key in cfg)) {
      cfg[key] = value;
      updated = true;
    }
  }
  if (updated) {
    await fs.writeJson(configPath, cfg, { spaces: 2 });
    await fs.chmod(configPath, 0o600);
  }
  return cfg;
}

/**
 * Save the given config object back to disk (with secure perms).
 */
export async function saveConfig(cfg) {
  const configPath = getConfigPath();
  await fs.ensureDir(path.dirname(configPath), { mode: 0o700 });
  // Note: walletSecretKey is now stored securely in the macOS Keychain, not in this file
  await fs.writeJson(configPath, cfg, { spaces: 2 });
  await fs.chmod(configPath, 0o600);
}

/**
 * Open the config file in the user's $EDITOR.
 */
export function editConfig() {
  const configPath = getConfigPath();
  const editor = process.env.EDITOR || "vim";
  spawnSync(editor, [configPath], { stdio: "inherit" });
}