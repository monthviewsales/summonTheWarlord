#!/usr/bin/env node
import { Command } from "commander";
import { getConfigPath, loadConfig, saveConfig, editConfig } from "./lib/config.js";
import { storePrivateKey, getPrivateKey, deletePrivateKey, hasPrivateKey } from "./utils/keychain.js";
import readline from "readline";
import { notify } from "./utils/notify.js";

const program = new Command();
program
  .name("warlord")
  .description("Summon the Warlord Solana CLI")
  .showHelpAfterError(); // show help after invalid flags/args

// CONFIG subcommands
const configCmd = program.command("config").description("Manage CLI configuration");

configCmd
  .command("view")
  .description("Show current config")
  .action(async () => {
    const configPath = getConfigPath();
    const cfg = await loadConfig();

    // redact API key to avoid screen-share leaks
    const redacted = { ...cfg };
    if (redacted.swapAPIKey && typeof redacted.swapAPIKey === "string") {
      const tail = redacted.swapAPIKey.slice(-4);
      redacted.swapAPIKey = `************${tail}`;
    }

    console.log(`Config file: ${configPath}\n`);
    console.log(JSON.stringify(redacted, null, 2));
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

    const ask = (q) => new Promise((resolve) => rl.question(q, (answer) => resolve(answer.trim())));

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
    try {
      if (await hasPrivateKey()) {
        const updateKey = await ask("🔓 Private key already stored in Keychain. Would you like to replace it? (y/N): ");
        if (updateKey.toLowerCase() === "y") {
          const privKey = await ask("Paste your new private key: ");
          await storePrivateKey(privKey);
          console.log("🔐 Private key updated.");
        } else {
          console.log("✅ Keeping existing private key.");
        }
      } else {
        const storeKey = await ask("Would you like to store your private key in the macOS Keychain now? (y/N): ");
        if (storeKey.toLowerCase() === "y") {
          const privKey = await ask("Paste your private key: ");
          await storePrivateKey(privKey);
          console.log("🔐 Private key stored securely.");
        } else {
          console.log("⚠️ No private key stored. You can add one later with `warlord keychain store`.");
        }
      }
    } catch (e) {
      console.error("❌ Keychain error:", e.message);
    }

    rl.close();
    console.log("🧠 Setup complete.");

    // Test macOS notifications so users can allow permissions now
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

// Trade command with options for buy and sell
program
  .command("trade <mint>")
  .description("Trade a specific token")
  .option("-b, --buy <amount>", "Spend <amount> SOL (number or '<percent>%') to buy token")
  .option("-s, --sell <amount>", "Sell <amount> tokens (number, 'auto', or '<percent>%')")
  .action(async (mint, options) => {
    const cfg = await loadConfig();

    // basic mint sanity check (cheap guard before calling SDK)
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(mint)) {
      console.error("⚠️  Invalid mint format. Expected base58 address (32–44 chars).");
      process.exit(1);
    }

    // Lazy-load heavy trade functions only when needed
    let _tradeModule;
    const getTradeModule = async () => {
      if (!_tradeModule) {
        _tradeModule = await import("./lib/trades.js");
      }
      return _tradeModule;
    };

    const executeTrade = async (type, amountArg) => {
      // normalize: trim spaces and collapse whitespace (accepts "50 %")
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
        if (type === "buy") {
          // block 'auto' on buys to match SDK behavior
          if (amountParam === "auto") {
            console.error("⚠️  Buying with 'auto' isn’t supported. Use a number or '<percent>%'.");
            process.exit(1);
          }

          console.log(`🚀 Warlord: Buying ${amountParam} of ${mint}...`);
          const { buyToken } = await getTradeModule();
          const result = await buyToken(mint, amountParam);
          console.log("✅ Buy successful!");
          console.log(`   • TXID              : ${result.txid}`);
          console.log(`   • Tokens Purchased  : ${result.tokensReceivedDecimal}`);
          console.log(`   • Price Impact      : ${result.priceImpact}`);
          console.log(`   • Fees              : ${result.totalFees}`);
          if (cfg.showQuoteDetails) {
            console.log(`   • Quote Details     : ${JSON.stringify(result.quote, null, 2)}`);
          }
        } else if (type === "sell") {
          console.log(`⚔️  Warlord: Selling ${amountParam} of ${mint}...`);
          const { sellToken } = await getTradeModule();
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
      You can use the default RPC URL, but may see errors and issues because it’s free & public.
      Signup for a free account here: https://www.solanatracker.io/solana-rpc
      Use the new URL you are assigned in the config file.
  • You may see errors about rate limits.  This is largely due to using the free endpoint,
      but they do happen occasionally.  Your trade may still go through because those errors happen
      while we're waiting for trade confirmation.
  • You may use either --buy/-b or --sell/-s flags
  • Buying with "auto" is NOT supported — use a number or percent
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
