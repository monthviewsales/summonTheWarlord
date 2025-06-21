#!/usr/bin/env node
import { Command } from "commander";
import { getConfigPath, loadConfig, saveConfig, editConfig } from "./lib/config.js";
import { buyToken, sellToken } from "./lib/trades.js";
import { storePrivateKey, getPrivateKey, deletePrivateKey } from "./utils/keychain.js";
import readline from "readline";
import open from "open";

const program = new Command();
program.name("warlord")
  .description("Summon the Warlord Solana CLI");

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
    const rpcUrl = await ask(`Enter RPC URL from SolanaTracker.io [${cfg.rpcUrl}]: `);
    if (rpcUrl) cfg.rpcUrl = rpcUrl;

    // Public Wallet Address
    const publicWallet = await ask(`Enter your public wallet address [${cfg.publicWallet || ""}]: `);
    if (publicWallet) {
      cfg.publicWallet = publicWallet;
    } else if (!cfg.publicWallet) {
      console.log("⚠️  No public wallet address set. You can set it later via 'config set publicWallet <address>'.");
    }

    // Quote Details
    const quoteDetail = await ask(`Show trade details in output? (y/N): `);
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

// Trade command with options for buy and sell
program
  .command("trade <mint>")
  .description("Trade a specific token")
  .option("-b, --buy <amount>", "Spend <amount> SOL (number or '<percent>%') to buy token")
  .option("-s, --sell <amount>", "Sell <amount> tokens (number, 'auto', or '<percent>%')")
  .action(async (mint, options) => {
    const cfg = await loadConfig();

    const executeTrade = async (type, amountArg) => {
      let amountParam = amountArg.toString().toLowerCase();
      if (amountParam !== "auto" && !amountParam.endsWith("%")) {
        const num = parseFloat(amountParam);
        if (isNaN(num) || num <= 0) {
          console.error("⚠️  Invalid amount. Use a positive number, 'auto' during a sell, or '<percent>%'.");
          process.exit(1);
        }
        amountParam = num;
      }

      try {
        if (type === "buy") {
          console.log(`🚀 Warlord: Buying ${amountParam} of ${mint}...`);
          const result = await buyToken(mint, amountParam);
          console.log("✅ Buy successful!");
          console.log(`   • TXID              : ${result.txid}`);
          console.log(`   • Tokens Purchased  : ${result.tokensReceivedDecimal}`);
          console.log(`   • Price Impact      : ${result.priceImpact}`);
          console.log(`   • Fees              : ${result.totalFees}`);
          if (cfg.showQuoteDetails) {
            console.log(`   • Quote Details    : ${JSON.stringify(result.quote, null, 2)}`);
          }
        } else if (type === "sell") {
          console.log(`⚔️  Warlord: Selling ${amountParam} of ${mint}...`);
          const result = await sellToken(mint, amountParam);
          console.log("✅ Sell successful!");
          console.log(`   • TXID                : ${result.txid}`);
          console.log(`   • SOL Received        : ${result.solReceivedDecimal}`);
          console.log(`   • Price Impact        : ${result.priceImpact}`);
          console.log(`   • Fees                : ${result.totalFees}`);
          if (cfg.showQuoteDetails) {
            console.log(`   • Quote Details      : ${JSON.stringify(result.quote, null, 2)}`);
          }
        }
        process.exit(0);
      } catch (err) {
        console.error(`❌ ${type === "buy" ? "Buy" : "Sell"} failed: ${err.message}`);
        process.exit(1);
      }
    };

    if (options.buy) {
      await executeTrade("buy", options.buy);
    } else if (options.sell) {
      await executeTrade("sell", options.sell);
    } else {
      console.log("⚠️  Please specify --buy <amount> or --sell <amount>");
      process.exit(1);
    }
  });

import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";

program
  .command("wallet")
  .alias("w")
  .description("Open your wallet in the browser via SolanaTracker.io")
  .action(async () => {
    try {
      const rawKey = await getPrivateKey();
      let keypair;

      try {
        // Try base58 format
        const bytes = bs58.decode(rawKey);
        keypair = Keypair.fromSecretKey(bytes);
      } catch (err) {
        try {
          // Try JSON array format
          const arr = JSON.parse(rawKey);
          if (!Array.isArray(arr)) throw new Error("Not an array");
          keypair = Keypair.fromSecretKey(Uint8Array.from(arr));
        } catch (jsonErr) {
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

// MANUAL command
program
  .command("man")
  .alias("m")
  .description("Display usage and help information")
  .action(() => {
    console.log(`
📖 summonTheWarlord CLI Manual

USAGE:
  warlord setup
      Run initial setup wizard (RPC, API key, slippage, etc.)

  warlord config view
      View current configuration

  warlord config edit
      Edit config in your $EDITOR

  warlord config set <key> <value>
      Set a single config key

  warlord keychain store
      Store your private key in the macOS Keychain (recommended)
        • Paste either a base58-encoded string OR a JSON array like [12, 34, ...]

  warlord keychain unlock
      Retrieve and verify your stored key

  warlord keychain delete
      Delete the private key from macOS Keychain

  warlord trade <mint> -b <amount>
  warlord trade <mint> -s <amount>
      Buy or sell a token. Amount formats:
        • Fixed amount (e.g. 0.5 or 100)
        • Percent of holdings (e.g. 50%)
        • "auto" (sell only — sells your full balance)

  warlord wallet
      Open your wallet on SolanaTracker.io

  warlord man
      Display this manual

NOTES:
  • This tool relies on SolanaTracker.io as its backend and won't work without them.
      You can use the default RPC URL, but may see errors and issues because its free & public.
      Signup for a free account here: https://www.solanatracker.io/solana-rpc 
      Use the new URL you are assigned in the config file.
  • You may see errors about rate limits.  This is largely due to using the free endpoint,
      but they do happen occasionally.  You trade may still go through because those errors happen
      while we're waiting for trade confirmation.
  • You may use either --buy/-b or --sell/-s flags
  • Buying with "auto" is not supported — use a number or percent
  • Your private key is never stored in plain text — use the Keychain for secure access
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