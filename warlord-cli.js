#!/usr/bin/env node
import { Command } from "commander";
import { getConfigPath, loadConfig, saveConfig, editConfig } from "./lib/config.js";
import { buyToken, sellToken } from "./lib/trades.js";

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

// BUY command
program
  .command("buy <mint> <amountSol>")
  .description("Spend <amountSol> SOL to buy <mint> tokens")
  .action(async (mint, amountSol) => {
    const amount = parseFloat(amountSol);
    if (isNaN(amount) || amount <= 0) {
      console.error("⚠️  Invalid SOL amount. Provide a positive number, e.g. 0.5");
      process.exit(1);
    }
    try {
      console.log(`🚀 Warlord: Buying ${amount} SOL of ${mint}...`);
      const result = await buyToken(mint, amount);
      console.log("✅ Buy successful!");
      console.log(`   • TXID             : ${result.txid}`);
      console.log(`   • Tokens Purchased : ${result.tokensReceivedDecimal}`);
      console.log(`   • New Holding      : ${result.newHolding}`);
      console.log(`   • Cost Basis       : ${result.newCostBasis} SOL`);
      console.log(`   • Unrealized PnL   : ${result.unrealizedPnl} SOL`);
      process.exit(0);
    } catch (err) {
      console.error(`❌ Buy failed: ${err.message}`);
      process.exit(1);
    }
  });

// SELL command
program
  .command("sell <mint> <percent>")
  .description("Sell a percentage of your <mint> holdings")
  .action(async (mint, percent) => {
    let pct = parseFloat(percent.toString().replace("%", ""));
    if (isNaN(pct) || pct <= 0 || pct > 100) {
      console.error("⚠️  Invalid percentage. Provide a number between 0 and 100 (e.g. 25)");
      process.exit(1);
    }
    try {
      console.log(`⚔️  Warlord: Selling ${pct}% of ${mint}...`);
      const result = await sellToken(mint, pct);
      console.log("✅ Sell successful!");
      console.log(`   • TXID               : ${result.txid}`);
      console.log(`   • Tokens Sold        : ${result.tokensSoldDecimal}`);
      console.log(`   • SOL Received       : ${result.solReceivedDecimal} SOL`);
      console.log(`   • Realized PnL       : ${result.realizedPnl} SOL`);
      console.log(`   • Remaining Holding  : ${result.newHolding}`);
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