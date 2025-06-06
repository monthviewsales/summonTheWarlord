#!/usr/bin/env node
// warlord-cli.js
// ───────────────────────────────────────────────────────────────────────────────
//   Command-line interface for Warlord Fuckboi trading bot.
//   Defines "buy" and "sell" commands, invoking trades.js functions and
//   printing trade details (PnL, session PnL, etc.) in-character.
// ───────────────────────────────────────────────────────────────────────────────

import "dotenv-vault/config";    // ← decrypts .env.vault and populates process.env
import { Command } from "commander";
import { buyToken, sellToken } from "./trades.js";

const program = new Command();

// Global options (if needed to override .env values)
program
  .option(
    "--rpc <url>",
    "Override RPC URL (defined in .env.vault)",
    process.env.RPC_URL
  )
  .option(
    "--cache <path>",
    "Override cache.json path",
    process.env.CACHE_PATH
  );

// BUY command: `warlord buy <mintAddress> <amountSol>`
program
  .command("buy <mintAddress> <amountSol>")
  .description("Warlord: Spend <amountSol> SOL to acquire <mintAddress> tokens.")
  .action(async (mintAddress, amountSol) => {
    const sol = parseFloat(amountSol);
    if (isNaN(sol) || sol <= 0) {
      console.error("⚠️ Warlord: Invalid SOL amount. Provide a positive number, e.g. 0.5.");
      process.exit(1);
    }

    try {
      console.log(`🚀 Warlord Fuckboi: “At your command, spending ${sol} SOL to buy ${mintAddress}...”`);
      const result = await buyToken({ mintAddress, amountSol: sol });

      console.log("\n💥 Warlord [Buy] Report:");
      console.log(`   • TXID             : ${result.txid}`);
      console.log(`   • Spent (SOL)      : ${result.amountSpentSol}`);
      console.log(`   • Tokens Received  : ${result.tokensReceivedDecimal}`);
      console.log(`   • New Holding      : ${result.newHolding} ${result.symbol}`);
      console.log(`   • Cost Basis (SOL) : ${result.newCostBasis}`);
      console.log(`   • Unrealized PnL   : ${result.unrealizedPnl} SOL`);
      console.log(`   • Session PnL      : ${result.sessionRealizedPnl} SOL`);
      console.log(`   • Quote Details    : ${JSON.stringify(result.quote, null, 2)}`);
      console.log("👑 Warlord: “Our banners rise. The conquest continues.”");
      process.exit(0);
    } catch (err) {
      console.error(`🤖 Warlord Error [Buy]: ${err.message || err}`);
      process.exit(1);
    }
  });

// SELL command: `warlord sell <mintAddress> <percent>`
program
  .command("sell <mintAddress> <percent>")
  .description("Warlord: Sell <percent>% of our holding of <mintAddress> for SOL.")
  .action(async (mintAddress, percent) => {
    const pct = parseFloat(percent);
    if (isNaN(pct) || pct <= 0 || pct > 100) {
      console.error("⚠️ Warlord: Percentage must be between 0 and 100.");
      process.exit(1);
    }

    try {
      console.log(`⚔️ Warlord Fuckboi: “Scorching ${pct}% of our ${mintAddress} supply into SOL...”`);
      const result = await sellToken({ mintAddress, percent: pct });

      console.log("\n💥 Warlord [Sell] Report:");
      console.log(`   • TXID                   : ${result.txid}`);
      console.log(`   • Tokens Sold            : ${result.tokensSoldDecimal} ${result.symbol}`);
      console.log(`   • SOL Received           : ${result.solReceivedDecimal}`);
      console.log(`   • Cost Basis on Sold     : ${result.costBasisForSoldTokens} SOL`);
      console.log(`   • Swap Fee               : ${result.swapFeeSol} SOL`);
      console.log(`   • Realized PnL           : ${result.realizedPnl} SOL`);
      console.log(`   • New Holding            : ${result.newHolding} ${result.symbol}`);
      console.log(`   • New Cost Basis (SOL)   : ${result.newTotalCostSol} SOL`);
      console.log(`   • New Unrealized PnL     : ${result.newUnrealizedPnl} SOL`);
      console.log(`   • Session Realized PnL   : ${result.sessionRealizedPnl} SOL`);
      console.log(`   • Quote Details          : ${JSON.stringify(result.quote, null, 2)}`);
      console.log("👑 Warlord: “Feast upon their SOL, for victory is ours!”");
      process.exit(0);
    } catch (err) {
      console.error(`🤖 Warlord Error [Sell]: ${err.message || err}`);
      process.exit(1);
    }
  });

program.parse(process.argv);

// If no subcommand is provided, display help
if (!process.argv.slice(2).length) {
  program.outputHelp();
}