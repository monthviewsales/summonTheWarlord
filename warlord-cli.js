#!/usr/bin/env node
import { Command } from "commander";
import { getConfigPath, loadConfig, saveConfig, editConfig } from "./lib/config.js";
import { buyToken, sellToken } from "./lib/trades.js";
import { storePrivateKey, getPrivateKey, deletePrivateKey } from "./lib/keychain.js";
import readline from "readline";

const program = new Command();
program.name("warlord")
  .description("Warlord Fuckboi Solana CLI");

// CONFIG subcommands
const configCmd = program.command("config").description("Manage CLI configuration");

configCmd
  .command("view")
  .description("Show current config")
  .action(async () => {
    const configPath = getConfigPath();
    const cfg = await loadConfig();
    console.log(`Config file: ${configPath}\n`);
    console.log(JSON.stringify(cfg, null, 2));
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
    cfg[key] = isNaN(Number(value)) ? value : Number(value);
    await saveConfig(cfg);
    console.log(`✅  Updated ${key} → ${value} in ${configPath}`);
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

    const ask = (question) => new Promise((resolve) => rl.question(question, (answer) => resolve(answer.trim())));

    const configPath = getConfigPath();
    const cfg = await loadConfig();

    console.log("⚙️  Warlord CLI Setup\n");

    // Slippage
    const slippage = await ask(`Enter max slippage % [${cfg.slippage}]: `);
    if (slippage) cfg.slippage = parseFloat(slippage);

    // API Key
    const swapAPIKey = await ask(`Enter Swap API Key [${cfg.swapAPIKey}]: `);
    if (swapAPIKey) cfg.swapAPIKey = swapAPIKey;

    // RPC URL
    const rpcUrl = await ask(`Enter RPC URL [${cfg.rpcUrl}]: `);
    if (rpcUrl) cfg.rpcUrl = rpcUrl;

    // Quote Details
    const quoteDetail = await ask(`Show quote details in output? (y/N): `);
    cfg.showQuoteDetails = quoteDetail.toLowerCase() === "y";

    await saveConfig(cfg);
    console.log(`✅ Config saved to ${configPath}`);

    // Private key
    const storeKey = await ask("Would you like to store your private key in the macOS Keychain now? (y/N): ");
    if (storeKey.toLowerCase() === "y") {
      const privKey = await ask("Paste your private key: ");
      await storePrivateKey(privKey);
      console.log("🔐 Private key stored securely.");
    }

    rl.close();
    console.log("🧠 Setup complete.");
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
      await storePrivateKey(input.trim());
      console.log("🔐 Private key securely stored in macOS Keychain.");
    });
  });

keychainCmd
  .command("unlock")
  .description("Test retrieval of private key from macOS Keychain")
  .action(async () => {
    try {
      const key = await getPrivateKey();
      console.log("🔓 Private key retrieved successfully.");
      // You can optionally cache it or mark session-ready
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

// BUY command – supports numeric, “auto”, or “<percent>%”
program
  .command("buy <mint> <amount>")
  .description("Spend <amount> SOL (number, ‘auto’, or ‘<percent>%’) to buy <mint> tokens")
  .action(async (mint, amountArg) => {
    // Determine amount parameter
    let amountParam;
    const raw = amountArg.toString().toLowerCase();
    if (raw === "auto") {
      amountParam = "auto";
    } else if (raw.endsWith("%")) {
      amountParam = raw;               // e.g. "50%"
    } else {
      const num = parseFloat(raw);
      if (isNaN(num) || num <= 0) {
        console.error("⚠️  Invalid amount. Use a positive number, 'auto', or '<percent>%'.");
        process.exit(1);
      }
      amountParam = num;               // e.g. 0.5
    }

    try {
      const cfg = await loadConfig();
      console.log(`🚀 Warlord: Buying ${amountParam} of ${mint}...`);
      const result = await buyToken(mint, amountParam);
      console.log("✅ Buy successful!");
      console.log(`   • TXID              : ${result.txid}`);
      console.log(`   • Tokens Purchased  : ${result.tokensReceivedDecimal}`);
      console.log(`   • Price Impact      : ${result.priceImpact}`);
      console.log(`   • Fees              : ${result.totalFees}`);
      if (cfg.showQuoteDetails) {
        console.log(
          `   • Quote Details    : ${JSON.stringify(result.quote, null, 2)}`
          );
        }
      process.exit(0);
    } catch (err) {
      console.error(`❌ Buy failed: ${err.message}`);
      process.exit(1);
    }
  });

// SELL command – supports numeric, “auto”, or “<percent>%”
program
  .command("sell <mint> <amount>")
  .description("Sell <amount> (number of tokens, ‘auto’, or ‘<percent>%’) of <mint> for SOL")
  .action(async (mint, amountArg) => {
    let amountParam = amountArg.toString().toLowerCase();
    if (amountParam !== "auto" && !amountParam.endsWith("%")) {
      const num = parseFloat(amountParam);
      if (isNaN(num) || num <= 0) {
        console.error("⚠️  Invalid amount. Use a positive number, 'auto', or '<percent>%'.");
        process.exit(1);
      }
      amountParam = num;               // explicit token count
    }

    try {
      // Load config so cfg.showQuoteDetails is defined
      const cfg = await loadConfig();
      console.log(`⚔️  Warlord: Selling ${amountParam} of ${mint}...`);
      const result = await sellToken(mint, amountParam);
      console.log("✅ Sell successful!");
      console.log(`   • TXID                : ${result.txid}`);
      console.log(`   • SOL Received        : ${result.solReceivedDecimal}`);
      console.log(`   • Price Impact        : ${result.priceImpact}`);
      console.log(`   • Fees                : ${result.totalFees}`);
      if (cfg.showQuoteDetails) {
        console.log(
          `   • Quote Details      : ${JSON.stringify(result.quote, null, 2)}`
          );
        }
      process.exit(0);
    } catch (err) {
      console.error(`❌ Sell failed: ${err.message}`);
      process.exit(1);
    }
  });

// If no subcommand provided, show help
if (!process.argv.slice(2).length) {
  program.outputHelp();
  process.exit(0);
}

program.parse(process.argv);