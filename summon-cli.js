#!/usr/bin/env node
import { Command } from "commander";
import {
  getConfigPath,
  loadConfig,
  saveConfig,
  editConfig,
  CONFIG_KEYS,
  DEFAULT_CONFIG,
  parseConfigValue,
  normalizeConfigValue,
  PRIORITY_FEE_LEVELS,
  TX_VERSIONS,
} from "./lib/config.js";
import { storePrivateKey, getPrivateKey, deletePrivateKey, hasPrivateKey } from "./utils/keychain.js";
import readline from "readline";
import { notify } from "./utils/notify.js";
import { runDoctor } from "./lib/doctor.js";

const program = new Command();
program
  .name("summon")
  .description("Summon Solana CLI")
  .showHelpAfterError(); // show help after invalid flags/args

const CONFIG_KEY_SET = new Set([
  ...CONFIG_KEYS.filter((key) => key !== "jito"),
  "jito.enabled",
  "jito.tip",
]);
const CONFIG_HELP = [
  { key: "rpcUrl", type: "string", note: "RPC URL (advancedTx=true is enforced)" },
  { key: "slippage", type: "number | auto", note: "Max slippage percentage" },
  { key: "priorityFee", type: "number | auto", note: "Priority fee in SOL" },
  {
    key: "priorityFeeLevel",
    type: PRIORITY_FEE_LEVELS.join(" | "),
    note: "Required when priorityFee=auto",
  },
  { key: "txVersion", type: TX_VERSIONS.join(" | "), note: "Transaction version" },
  { key: "showQuoteDetails", type: "true | false", note: "Print quote details after swaps" },
  { key: "DEBUG_MODE", type: "true | false", note: "Enable verbose SDK logs" },
  { key: "notificationsEnabled", type: "true | false", note: "Enable macOS notifications" },
  { key: "jito.enabled", type: "true | false", note: "Enable Jito bundles" },
  { key: "jito.tip", type: "number", note: "Tip in SOL when Jito enabled" },
];

const askQuestion = (rl, prompt) =>
  new Promise((resolve) => rl.question(prompt, (answer) => resolve(answer.trim())));

const COLOR_ENABLED = process.stdout.isTTY;
const ANSI = {
  reset: "\x1b[0m",
  blue: "\x1b[34m",
  purple: "\x1b[35m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
};

const paint = (text, color) => (COLOR_ENABLED ? `${color}${text}${ANSI.reset}` : text);

function clearScreen() {
  if (process.stdout.isTTY) {
    process.stdout.write("\x1Bc");
  } else {
    console.clear();
  }
}

function renderWizardHeader() {
  console.log("⚙️  Config Wizard");
  console.log("Press Enter to keep the current value.\n");
}

function toDisplayValue(value) {
  if (value === undefined || value === null) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function formatBox({ title, rows }) {
  const normalizedRows = rows.map(([label, value]) => [String(label), String(value)]);
  const labelWidth = Math.max(...normalizedRows.map(([label]) => label.length), 0);
  const valueWidth = Math.max(...normalizedRows.map(([, value]) => value.length), 0);
  const titleText = title ? ` ${title} ` : "";
  const innerWidth = Math.max(labelWidth + 3 + valueWidth, titleText.length);
  const totalWidth = innerWidth + 2;

  let topBorder = `┌${"─".repeat(totalWidth)}┐`;
  if (titleText) {
    const left = Math.floor((totalWidth - titleText.length) / 2);
    const right = totalWidth - titleText.length - left;
    topBorder = `┌${"─".repeat(left)}${paint(titleText, ANSI.purple)}${"─".repeat(right)}┐`;
  }

  const lines = normalizedRows.map(([label, value]) => {
    const labelText = label.padEnd(labelWidth);
    const content = `${paint(labelText, ANSI.blue)} : ${paint(value, ANSI.green)}`;
    const contentLength = labelText.length + 3 + value.length;
    const padding = " ".repeat(Math.max(0, innerWidth - contentLength));
    return `│ ${content}${padding} │`;
  });

  const bottomBorder = `└${"─".repeat(totalWidth)}┘`;
  return [topBorder, ...lines, bottomBorder].join("\n");
}

function formatPlainBox({ title, rows }) {
  const normalizedRows = rows.map(([label, value]) => [String(label), String(value)]);
  const labelWidth = Math.max(...normalizedRows.map(([label]) => label.length), 0);
  const valueWidth = Math.max(...normalizedRows.map(([, value]) => value.length), 0);
  const titleText = title ? ` ${title} ` : "";
  const innerWidth = Math.max(labelWidth + 3 + valueWidth, titleText.length);
  const totalWidth = innerWidth + 2;

  let topBorder = `┌${"─".repeat(totalWidth)}┐`;
  if (titleText) {
    const left = Math.floor((totalWidth - titleText.length) / 2);
    const right = totalWidth - titleText.length - left;
    topBorder = `┌${"─".repeat(left)}${titleText}${"─".repeat(right)}┐`;
  }

  const lines = normalizedRows.map(([label, value]) => {
    const labelText = label.padEnd(labelWidth);
    const content = `${labelText} : ${value}`;
    const contentLength = labelText.length + 3 + value.length;
    const padding = " ".repeat(Math.max(0, innerWidth - contentLength));
    return `│ ${content}${padding} │`;
  });

  const bottomBorder = `└${"─".repeat(totalWidth)}┘`;
  return [topBorder, ...lines, bottomBorder].join("\n");
}

function renderStatusBox({ title, rows, tone }) {
  const box = formatPlainBox({ title, rows });
  const colored = box
    .split("\n")
    .map((line) => paint(line, tone))
    .join("\n");
  console.log(colored);
}

function renderConfigSummary(cfg, configPath, title = "CONFIG") {
  const jitoEnabled = cfg.jito?.enabled ? "true" : "false";
  const jitoTip = cfg.jito?.enabled ? cfg.jito.tip : "-";
  const rows = [
    ["Config path", configPath],
    ["RPC URL", cfg.rpcUrl],
    ["Slippage", cfg.slippage],
    ["Priority fee", cfg.priorityFee],
    ["Priority level", cfg.priorityFeeLevel],
    ["Tx version", cfg.txVersion],
    ["Show quote", cfg.showQuoteDetails],
    ["Debug mode", cfg.DEBUG_MODE],
    ["Notifications", cfg.notificationsEnabled],
    ["Jito enabled", jitoEnabled],
    ["Jito tip (SOL)", jitoTip],
  ];
  console.log(formatBox({ title, rows }));
}

async function promptSelect(rl, label, options, { current, required = false } = {}) {
  const menu = options.map((opt, index) => `  ${index + 1}) ${opt}`).join("\n");
  while (true) {
    console.log(`\n${label}`);
    console.log(menu);
    const suffix = current ? ` [${current}]` : "";
    const answer = await askQuestion(rl, `Select${suffix}: `);
    if (!answer) {
      if (required) {
        console.log("⚠️  Selection required.");
        continue;
      }
      return current;
    }
    const normalized = answer.trim();
    const index = Number(normalized);
    if (Number.isInteger(index) && index >= 1 && index <= options.length) {
      return options[index - 1];
    }
    const match = options.find((opt) => opt.toLowerCase() === normalized.toLowerCase());
    if (match) return match;
    console.log("⚠️  Invalid selection. Choose a number or value from the list.");
  }
}

async function promptNormalized(rl, label, key, { current, required = false } = {}) {
  while (true) {
    const suffix = current !== undefined ? ` [${toDisplayValue(current)}]` : "";
    const answer = await askQuestion(rl, `${label}${suffix}: `);
    if (!answer) {
      if (required) {
        console.log("⚠️  Value required.");
        continue;
      }
      return current;
    }
    try {
      return normalizeConfigValue(key, parseConfigValue(answer), { strict: true });
    } catch (err) {
      console.log(`⚠️  ${err.message}`);
    }
  }
}

async function promptNumber(rl, label, { current, required = false } = {}) {
  while (true) {
    const suffix = current !== undefined ? ` [${toDisplayValue(current)}]` : "";
    const answer = await askQuestion(rl, `${label}${suffix}: `);
    if (!answer) {
      if (required) {
        console.log("⚠️  Value required.");
        continue;
      }
      return current;
    }
    const num = Number(answer);
    if (Number.isFinite(num) && num >= 0) {
      return num;
    }
    console.log("⚠️  Invalid number. Use a non-negative value.");
  }
}

async function runConfigWizard({ cfg, rl }) {
  const nextCfg = { ...cfg, jito: { ...DEFAULT_CONFIG.jito, ...(cfg.jito || {}) } };

  clearScreen();
  renderWizardHeader();
  console.log("RPC URL should be the SolanaTracker endpoint assigned to you.");
  console.log("advancedTx=true is enforced automatically.\n");
  nextCfg.rpcUrl = await promptNormalized(rl, "RPC URL", "rpcUrl", { current: nextCfg.rpcUrl });

  clearScreen();
  renderWizardHeader();
  nextCfg.slippage = await promptNormalized(rl, "Max slippage (number or \"auto\")", "slippage", {
    current: nextCfg.slippage,
  });

  clearScreen();
  renderWizardHeader();
  nextCfg.priorityFee = await promptNormalized(rl, "Priority fee (number or \"auto\")", "priorityFee", {
    current: nextCfg.priorityFee,
  });

  clearScreen();
  renderWizardHeader();
  nextCfg.priorityFeeLevel = await promptSelect(
    rl,
    "Priority fee level (used when priorityFee is auto)",
    PRIORITY_FEE_LEVELS,
    {
      current: nextCfg.priorityFeeLevel,
      required: true,
    }
  );

  clearScreen();
  renderWizardHeader();
  nextCfg.txVersion = await promptSelect(rl, "Transaction version", TX_VERSIONS, {
    current: nextCfg.txVersion,
  });

  clearScreen();
  renderWizardHeader();
  const showQuoteDetails = await promptSelect(rl, "Show quote details", ["true", "false"], {
    current: nextCfg.showQuoteDetails ? "true" : "false",
  });
  nextCfg.showQuoteDetails = showQuoteDetails === "true";

  clearScreen();
  renderWizardHeader();
  const debugMode = await promptSelect(rl, "Enable debug mode", ["true", "false"], {
    current: nextCfg.DEBUG_MODE ? "true" : "false",
  });
  nextCfg.DEBUG_MODE = debugMode === "true";

  clearScreen();
  renderWizardHeader();
  const notificationsEnabled = await promptSelect(rl, "Enable notifications", ["true", "false"], {
    current: nextCfg.notificationsEnabled ? "true" : "false",
  });
  nextCfg.notificationsEnabled = notificationsEnabled === "true";

  clearScreen();
  renderWizardHeader();
  const jitoEnabled = await promptSelect(rl, "Enable Jito bundles", ["true", "false"], {
    current: nextCfg.jito.enabled ? "true" : "false",
  });
  nextCfg.jito.enabled = jitoEnabled === "true";
  if (nextCfg.jito.enabled) {
    clearScreen();
    renderWizardHeader();
    const requireTip = nextCfg.jito.tip === undefined || nextCfg.jito.tip === null;
    nextCfg.jito.tip = await promptNumber(rl, "Jito tip (SOL)", {
      current: nextCfg.jito.tip,
      required: requireTip,
    });
  }

  return nextCfg;
}

let tradeModulePromise;
const getTradeModule = async () => {
  if (!tradeModulePromise) {
    tradeModulePromise = import("./lib/trades.js");
  }
  return tradeModulePromise;
};

async function executeTrade(type, mint, amountArg) {
  const cfg = await loadConfig();

  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(mint)) {
    console.error("⚠️  Invalid mint format. Expected base58 address (32–44 chars).");
    process.exit(1);
  }

  let amountParam = amountArg.toString().trim().toLowerCase().replace(/\s+/g, "");

  if (amountParam !== "auto" && !amountParam.endsWith("%")) {
    const num = parseFloat(amountParam);
    if (isNaN(num) || num <= 0) {
      console.error("⚠️  Invalid amount. Use a positive number, 'auto' during a sell, or '<percent>%'.");
      process.exit(1);
    }
    amountParam = num;
  }

  try {
    const mintDisplay = `${mint.slice(0, 4)}…${mint.slice(-4)}`;
    const amountDisplay = String(amountParam);
    const baseRows = [
      ["Action", type === "buy" ? "Buy" : "Sell"],
      ["Mint", mintDisplay],
      ["Amount", amountDisplay],
    ];
    clearScreen();
    renderStatusBox({
      title: "PENDING",
      tone: ANSI.yellow,
      rows: [
        ...baseRows,
        ["TXID", "-"],
        ["Explorer", "-"],
        ["Info", "Submitting swap..."],
      ],
    });

    if (type === "buy") {
      if (amountParam === "auto") {
        console.error("⚠️  Buying with 'auto' isn’t supported. Use a number or '<percent>%'.");
        process.exit(1);
      }

      const { buyToken } = await getTradeModule();
      const result = await buyToken(mint, amountParam);
      clearScreen();
      const info = `Received ${result.tokensReceivedDecimal} tokens | Fees ${result.totalFees} | Impact ${result.priceImpact}`;
      const buyRows = [
        ...baseRows,
        ["TXID", result.txid],
        ["Explorer", `https://orbmarkets.io/tx/${result.txid}`],
        ["Info", info],
        ["Verification", result.verificationStatus],
      ];
      renderStatusBox({ title: "SUCCESS", rows: buyRows, tone: ANSI.green });
      if (cfg.showQuoteDetails) {
        console.log(`   • Quote Details     : ${JSON.stringify(result.quote, null, 2)}`);
      }
    } else if (type === "sell") {
      const { sellToken } = await getTradeModule();
      const result = await sellToken(mint, amountParam);
      clearScreen();
      const info = `Received ${result.solReceivedDecimal} SOL | Fees ${result.totalFees} | Impact ${result.priceImpact}`;
      const sellRows = [
        ...baseRows,
        ["TXID", result.txid],
        ["Explorer", `https://orbmarkets.io/tx/${result.txid}`],
        ["Info", info],
        ["Verification", result.verificationStatus],
      ];
      renderStatusBox({ title: "SUCCESS", rows: sellRows, tone: ANSI.green });
      if (cfg.showQuoteDetails) {
        console.log(`   • Quote Details      : ${JSON.stringify(result.quote, null, 2)}`);
      }
    }
    process.exit(0);
  } catch (err) {
    clearScreen();
    const errorMessage = err?.message || "Unknown error";
    const txidMatch = errorMessage.match(/[1-9A-HJ-NP-Za-km-z]{32,}/);
    const txid = txidMatch ? txidMatch[0] : "-";
    const explorer = txidMatch ? `https://orbmarkets.io/tx/${txid}` : "-";
    const mintDisplay = `${mint.slice(0, 4)}…${mint.slice(-4)}`;
    const amountDisplay = String(amountParam);
    renderStatusBox({
      title: "FAILED",
      tone: ANSI.red,
      rows: [
        ["Action", type === "buy" ? "Buy" : "Sell"],
        ["Mint", mintDisplay],
        ["Amount", amountDisplay],
        ["TXID", txid],
        ["Explorer", explorer],
        ["Error", errorMessage],
      ],
    });
    process.exit(1);
  }
}

// CONFIG subcommands
const configCmd = program.command("config").description("Manage CLI configuration");

configCmd
  .command("view")
  .description("Show current config")
  .action(async () => {
    const configPath = getConfigPath();
    const cfg = await loadConfig();
    console.log(`Config file: ${configPath}\n`);
    renderConfigSummary(cfg, configPath);
  });

configCmd
  .command("edit")
  .description("Edit config in your $EDITOR")
  .action(async () => {
    await editConfig();
  });

configCmd
  .command("set <key> <value>")
  .description("Set a single config key")
  .action(async (key, value) => {
    const configPath = getConfigPath();
    const cfg = await loadConfig();
    const parsedValue = parseConfigValue(value);
    if (!CONFIG_KEY_SET.has(key)) {
      console.error(`⚠️  Unknown config key: ${key}`);
      console.error("Run `summon config list` to see valid keys.");
      process.exit(1);
    }
    try {
      if (key.startsWith("jito.")) {
        const field = key.split(".")[1];
        const nextJito = { ...(cfg.jito || DEFAULT_CONFIG.jito), [field]: parsedValue };
        cfg.jito = normalizeConfigValue("jito", nextJito, { strict: true });
      } else {
        const normalizedValue = normalizeConfigValue(key, parsedValue, { strict: true });
        cfg[key] = normalizedValue;
        if (key === "priorityFee" && normalizedValue === "auto") {
          console.log(
            `ℹ️  priorityFeeLevel is required when priorityFee is auto. Current level: ${cfg.priorityFeeLevel}`
          );
        }
      }
    } catch (err) {
      console.error(`⚠️  ${err.message}`);
      process.exit(1);
    }
    await saveConfig(cfg);
    console.log(`✅  Updated ${key} → ${value} in ${configPath}`);
    renderConfigSummary(cfg, configPath);
  });

configCmd
  .command("list")
  .description("List available config keys and types")
  .action(() => {
    console.log("Available config keys:");
    for (const entry of CONFIG_HELP) {
      console.log(`  • ${entry.key} (${entry.type}) — ${entry.note}`);
    }
  });

configCmd
  .command("wizard")
  .description("Interactive config editor with type validation")
  .action(async () => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    const cfg = await loadConfig();
    const updated = await runConfigWizard({ cfg, rl });
    await saveConfig(updated);
    rl.close();
    const configPath = getConfigPath();
    console.log("✅ Config updated.");
    renderConfigSummary(updated, configPath);
  });

// SETUP command – interactive setup wizard
program
  .command("setup")
  .description("Run interactive setup for config and keychain")
  .action(async () => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const configPath = getConfigPath();
    const cfg = await loadConfig();

    console.log("⚙️  Summon CLI Setup\n");
    const updated = await runConfigWizard({ cfg, rl });
    await saveConfig(updated);
    console.log(`✅ Config saved to ${configPath}`);

    // Private key
    try {
      if (await hasPrivateKey()) {
        const updateKey = await askQuestion(
          rl,
          "🔓 Private key already stored in Keychain. Would you like to replace it? (y/N): "
        );
        if (updateKey.toLowerCase() === "y") {
          const privKey = await askQuestion(rl, "Paste your new private key: ");
          await storePrivateKey(privKey);
          console.log("🔐 Private key updated.");
        } else {
          console.log("✅ Keeping existing private key.");
        }
      } else {
        const storeKey = await askQuestion(
          rl,
          "Would you like to store your private key in the macOS Keychain now? (y/N): "
        );
        if (storeKey.toLowerCase() === "y") {
          const privKey = await askQuestion(rl, "Paste your private key: ");
          await storePrivateKey(privKey);
          console.log("🔐 Private key stored securely.");
        } else {
          console.log("⚠️ No private key stored. You can add one later with `summon keychain store`.");
        }
      }
    } catch (e) {
      console.error("❌ Keychain error:", e.message);
    }

    rl.close();
    console.log("🧠 Setup complete.");

    // Test macOS notifications so users can allow permissions now
    if (updated.notificationsEnabled !== false) {
      try {
        notify({
          title: "summonTheWarlord",
          subtitle: "Setup complete",
          message: "If you see this, notifications are enabled.",
          sound: "Ping",
        });
        console.log("🔔 Test notification sent. If you see it, notifications are enabled.");
      } catch {
        console.warn("⚠️ Unable to send test notification. You may need to enable notifications for your terminal.");
      }
    } else {
      console.log("🔕 Notifications are disabled in config.");
    }
  });

// KEYCHAIN subcommands
const keychainCmd = program.command("keychain").description("Manage private key storage in macOS Keychain");

keychainCmd
  .command("store")
  .description("Store private key securely in macOS Keychain")
  .action(() => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question("Paste your wallet private key: ", async (input) => {
      rl.close();
      try {
        await storePrivateKey(input.trim());
        console.log("🔐 Private key securely stored in macOS Keychain.");
      } catch (err) {
        console.error("❌ Failed to store key:", err.message);
        process.exitCode = 1;
      }
    });
  });

keychainCmd
  .command("unlock")
  .description("Test retrieval of private key from macOS Keychain")
  .action(async () => {
    try {
      const key = await getPrivateKey();
      if (key) console.log("🔓 Private key retrieved successfully.");
    } catch (err) {
      console.error("❌ Failed to retrieve key:", err.message);
    }
  });

keychainCmd
  .command("delete")
  .description("Delete the private key from macOS Keychain")
  .action(async () => {
    await deletePrivateKey();
    console.log("💥 Private key deleted from macOS Keychain.");
  });

program
  .command("buy <mint> <amount>")
  .description("Buy a token with SOL")
  .action(async (mint, amount) => {
    await executeTrade("buy", mint, amount);
  });

program
  .command("sell <mint> <amount>")
  .description("Sell a token for SOL")
  .action(async (mint, amount) => {
    await executeTrade("sell", mint, amount);
  });

// Trade command with options for buy and sell (deprecated)
program
  .command("trade <mint>", { hidden: true })
  .description("DEPRECATED: Trade a specific token")
  .option("-b, --buy <amount>", "Spend <amount> SOL (number or '<percent>%') to buy token")
  .option("-s, --sell <amount>", "Sell <amount> tokens (number, 'auto', or '<percent>%')")
  .action(async (mint, options) => {
    console.log("⚠️  'summon trade' is deprecated. Use 'summon buy' or 'summon sell' instead.");
    if (options.buy) {
      await executeTrade("buy", mint, options.buy);
    } else if (options.sell) {
      await executeTrade("sell", mint, options.sell);
    } else {
      console.log("⚠️  Please specify --buy <amount> or --sell <amount>");
      process.exit(1);
    }
  });

program
  .command("wallet")
  .alias("w")
  .description("Open your wallet in the browser via SolanaTracker.io")
  .action(async () => {
    // Lazy-load heavier deps only when wallet command runs
    const [{ Keypair }, { default: bs58 }, { default: open }] = await Promise.all([
      import("@solana/web3.js"),
      import("bs58"),
      import("open"),
    ]);
    try {
      const rawKey = await getPrivateKey();
      let keypair;

      try {
        // Try base58 format
        const bytes = bs58.decode(rawKey);
        keypair = Keypair.fromSecretKey(bytes);
      } catch {
        try {
          // Try JSON array format
          const arr = JSON.parse(rawKey);
          if (!Array.isArray(arr)) throw new Error("Not an array");
          keypair = Keypair.fromSecretKey(Uint8Array.from(arr));
        } catch {
          throw new Error("Private key is neither base58 nor valid JSON array.");
        }
      }

      const pubkey = keypair.publicKey.toBase58();
      const url = `https://www.solanatracker.io/wallet/${pubkey}`;
      console.log(`🌐 Opening wallet in browser: ${url}`);
      await open(url);
    } catch (err) {
      console.error("❌ Failed to load key from Keychain:", err.message);
    }
  });

// DOCTOR command
program
  .command("doctor")
  .description("Run environment and connectivity checks")
  .option("-v, --verbose", "Show verbose output")
  .action(async (options) => {
    const results = await runDoctor({ verbose: Boolean(options.verbose) });
    for (const result of results) {
      const icon = result.status === "ok" ? "✅" : result.status === "skip" ? "⚠️" : "❌";
      console.log(`${icon} ${result.name}: ${result.message}`);
      if (options.verbose && result.details) {
        console.log(`   • ${result.details}`);
      }
    }
    const hasFailure = results.some((item) => item.status === "fail");
    process.exit(hasFailure ? 1 : 0);
  });

// MANUAL command
program
  .command("man")
  .alias("m")
  .description("Display usage and help information")
  .action(() => {
    console.log(`
📖 Summon CLI Manual

FIRST TIME QUICKSTART:
  1) summon setup
     Saves config + stores your private key in Keychain.
  2) summon config wizard
     Review RPC, fees, slippage, notifications, and Jito.
  3) summon doctor
     Confirms RPC + swap API are healthy.
  4) summon buy <mint> 0.01
     Start small while you learn.

TERMS:
  • Mint = token address (base58). Copy it from a Solana explorer or DEX listing.
  • Amounts:
      - Buy uses SOL amount (e.g. 0.1)
      - Sell uses token amount, percent (50%), or auto for full balance

USAGE:
  summon setup
      Run initial setup wizard (RPC, slippage, priority fees, Jito, etc.)

  summon config view
      View current configuration

  summon config edit
      Edit config in your $EDITOR

  summon config set <key> <value>
      Set a single config key

  summon config wizard
      Interactive config editor with type validation

  summon config list
      List available config keys and types

  summon keychain store
      Store your private key in the macOS Keychain (recommended)
        • Paste either a base58-encoded string OR a JSON array like [12, 34, ...]

  summon keychain unlock
      Retrieve and verify your stored key

  summon keychain delete
      Delete the private key from macOS Keychain

  summon buy <mint> <amount>
  summon sell <mint> <amount>
      Buy or sell a token. Amount formats:
        • Fixed amount (e.g. 0.5 or 100)
        • Percent of holdings (e.g. 50%)
        • "auto" (sell only — sells your full balance)

  summon wallet
      Open your wallet on SolanaTracker.io

  summon doctor
      Run diagnostics for config, Keychain, RPC, swap API, and notifications

  summon man
      Display this manual

NOTES:
  • This tool relies on SolanaTracker.io as its backend and won't work without them.
      You can use the default RPC URL, but may see errors and issues because it’s free & public.
      Signup for a free account here: https://www.solanatracker.io/solana-rpc
      Use the new URL you are assigned in the config file.
  • You may see errors about rate limits.  This is largely due to using the free endpoint,
      but they do happen occasionally.  Your trade may still go through because those errors happen
      while we're waiting for trade confirmation.
  • Use summon buy or summon sell for trades
  • Buying with "auto" is NOT supported — use a number or percent
  • Your private key is never stored in plain text — use the Keychain for secure access
  • Notifications are optional. Toggle notificationsEnabled in config if you want silence.
  • Swaps show Pending → Success/Failed panes. If Verification is pending, open:
      https://orbmarkets.io/tx/<txid>
  • Quote details can be toggled in config or during setup
  • Always confirm transactions via returned TXID and fees

Enjoy the chaos. 🪖
    `);
  });

// If no subcommand provided, show help
if (!process.argv.slice(2).length) {
  program.outputHelp();
  process.exit(0);
}

program.parse(process.argv);
