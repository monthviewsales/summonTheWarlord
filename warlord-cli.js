
import { Command } from "commander";
import { getConfigPath, loadConfig, saveConfig, editConfig } from "./lib/config.js";
import { buyToken, sellToken } from "./lib/trades.js";

const program = new Command();
program.name("warlord")
  .description("Warlord Fuckboi Solana CLI");

// CONFIG command
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

// In place of the BUY stub:
program
  .command("buy <mint> <amountSol>")
  .action(async (mint, amountSol) => {
    await buyToken(mint, parseFloat(amountSol));
  });

// And similarly for sell:
program
  .command("sell <mint> <percent>")
  .action(async (mint, percent) => {
    await sellToken(mint, parseFloat(percent));
  });

// If no subcommand provided, show help
if (!process.argv.slice(2).length) {
  program.outputHelp();
  process.exit(0);
}

program.parse(process.argv);