# summonTheWarlord

# summonTheWarlord

A command-line trading bot CLI in the persona of "Warlord Fuckboi" for Solana-based token trading.  
Uses the [solana-swap](https://github.com/YZYLAB/solana-swap) package for swap execution and the Solana Tracker Data-API SDK for on-chain data (token info, price, PnL).

## Table of Contents

- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Setup](#environment-setup)
- [Project Structure](#project-structure)
- [Usage](#usage)
  - [Buy Command](#buy-command)
  - [Sell Command](#sell-command)
- [Cache and Token PnL](#cache-and-token-pnl)
- [Examples](#examples)
- [Troubleshooting](#troubleshooting)
- [License](#license)

---

## Features

- **In-Character CLI:** All commands and outputs use the persona "Warlord Fuckboi".
- **Buy in SOL:** Spend a specified amount of SOL to acquire SPL tokens.
- **Sell by Percentage:** Sell a percentage of existing token holdings.
- **Per-Token PnL:** Fetch on-chain PnL data for each token in the connected wallet.
- **Persistent Cache:** Maintains `cache.json` for holdings and cost basis per token.
- **Data-API Integration:** Uses Solana Tracker Data-API SDK to fetch token decimals, prices, and token-specific PnL.
- **Swap Execution:** Leverages `solana-swap` for building and executing swap transactions.

---

## Prerequisites

- **Node.js** v16.x or later (LTS recommended)
- **npm** (comes bundled with Node.js)
- A funded Solana wallet keypair (exported as JSON or Base58 string)
- Access to Solana mainnet RPC with advanced transactions enabled
- A Solana Tracker Data-API key

---

## Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/your-username/summonTheWarlord.git
   cd summonTheWarlord
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

   This will install:

   - `solana-swap`
   - `@solana-tracker/data-api`
   - `commander`
   - `dotenv-vault`
   - `fs-extra`
   - `bs58`
   - `@solana/web3.js`

---

## Environment Setup

This project uses [dotenv‑vault](https://github.com/bkeepers/dotenv-vault) for secure environment variables. The following variables must be set in `.env.vault`:

```text
# Required values

# Solana RPC endpoint with advancedTx=true (for swap instructions)
RPC_URL=https://rpc.solanatracker.io/public?advancedTx=true

# Solana Tracker Data-API key (for token info, price, PnL)
SOLANATRACKER_API_KEY=your_data_api_key_here

# Path to your local Solana keypair (JSON array or Base58 string)
KEYPAIR_PATH=/Users/you/.config/solana/id.json

# Path to the cache file (relative or absolute)
CACHE_PATH=./cache.json
```

1. **Login to dotenv‑vault (if not already):**

   ```bash
   npx dotenv-vault login
   ```

2. **Initialize `.env.vault`:**

   ```bash
   npx dotenv-vault new .env.vault
   ```

   Follow the prompts and add the four variables above.

---

## Project Structure

```
summonTheWarlord/
├─ .env.vault           # Encrypted environment variables
├─ cache.json           # Tracks per-token holdings and cost basis
├─ package.json
├─ trades.js            # Core buy/sell logic, cache handling, PnL fetching
├─ warlord-cli.js       # CLI entrypoint (defines buy & sell commands)
└─ README.md            # This documentation
```

- **`warlord-cli.js`**  
  The primary command-line interface. Defines `buy` and `sell` subcommands using `commander`.

- **`trades.js`**  
  Contains `buyToken()` and `sellToken()` functions:
  - Builds and executes swaps via `solana-swap`.
  - Updates `cache.json` with current holdings and cost basis.
  - Fetches per-token PnL via `DataApiClient.getTokenPnL()`.
  - Calculates realized and unrealized PnL for each trade.

---

## Usage

Ensure `cache.json` exists (an empty JSON object is fine). You can create it manually:

```bash
echo "{}" > cache.json
```

### Buy Command

```bash
node warlord-cli.js buy <MINT_ADDRESS> <AMOUNT_SOL>
```

- **`<MINT_ADDRESS>`**: The SPL token mint to purchase.
- **`<AMOUNT_SOL>`**: Amount of SOL (decimal) to spend.

**Example:**

```bash
node warlord-cli.js buy FvVJ6RCr1XH8hvZbzx4pH45ab24NNUhWjgTKvGcuVYHD 0.5
```

On success, you will see an in-character report with:

- Transaction signature (TXID)
- Amount of SOL spent
- Tokens received
- New token holding and cost basis
- Unrealized PnL for that token
- Per-token PnL from Data-API

---

### Sell Command

```bash
node warlord-cli.js sell <MINT_ADDRESS> <PERCENT>
```

- **`<MINT_ADDRESS>`**: The SPL token mint to sell.
- **`<PERCENT>`**: Percentage of your current holding to sell (0 < PERCENT ≤ 100).

**Example:**

```bash
node warlord-cli.js sell FvVJ6RCr1XH8hvZbzx4pH45ab24NNUhWjgTKvGcuVYHD 25
```

On success, you will receive an in-character report with:

- Transaction signature (TXID)
- Tokens sold (decimal)
- SOL received
- Cost basis and swap fee
- Realized PnL (in SOL)
- New token holding and cost basis
- Unrealized PnL for remaining tokens
- Per-token PnL from Data-API

---

## Cache and Token PnL

- **`cache.json`** stores:
  ```json
  {
    "mints": {
      "<MINT_ADDRESS>": {
        "holding": <decimal number of tokens>,
        "totalCostSol": <total SOL spent>
      },
      ...
    }
  }
  ```
- After each trade, `trades.js` updates the appropriate entry in `cache.json`.
- `trades.js` uses `getTokenPnL(walletAddress, mintAddress)` to fetch historical PnL data for a specific token in your wallet. This is returned as part of the trade report under `tokenPnL`.

You can inspect `cache.json` directly to see your current holdings and cost basis for each token.

---

## Examples

1. **Buy 0.5 SOL worth of a token:**
   ```bash
   node warlord-cli.js buy So11111111111111111111111111111111111111112 1.0
   ```
   Sample output:
   ```
   🚀 Warlord Fuckboi: “At your command, spending 1 SOL to buy So11111111111111111111111111111111111111112...”

   💥 Warlord [Buy] Report:
      • TXID             : 5C2z9Jk…AbCdE
      • Spent (SOL)      : 1.000
      • Tokens Received  : 50.000000
      • New Holding      : 50.000000 wSOL
      • Cost Basis (SOL) : 1.000
      • Unrealized PnL   : 0.100 SOL
      • tokenPnL         : { ... }
      • Quote Details    : { ... }
   👑 Warlord: “Our banners rise. The conquest continues.”
   ```

2. **Sell 25% of current holdings:**
   ```bash
   node warlord-cli.js sell So11111111111111111111111111111111111111112 25
   ```
   Sample output:
   ```
   ⚔️ Warlord Fuckboi: “Scorching 25% of our So11111111111111111111111111111111111111112 supply into SOL...”

   💥 Warlord [Sell] Report:
      • TXID                   : 8ZxY3Mn…eF2Gh
      • Tokens Sold            : 12.500000 wSOL
      • SOL Received           : 0.260
      • Cost Basis on Sold     : 0.250 SOL
      • Swap Fee               : 0.001 SOL
      • Realized PnL           : 0.009 SOL
      • New Holding            : 37.500000 wSOL
      • New Cost Basis (SOL)   : 0.750
      • New Unrealized PnL     : 0.050 SOL
      • tokenPnL               : { ... }
      • Quote Details          : { ... }
   👑 Warlord: “Feast upon their SOL, for victory is ours!”
   ```

---

## Troubleshooting

- **Invalid SOL amount / percentage:**  
  Ensure `<amountSol>` is a positive number (e.g., 0.5), and `<percent>` is between 0 and 100.

- **Keypair not found / invalid:**  
  Verify `KEYPAIR_PATH` in `.env.vault` points to a valid Solana keypair file (JSON array of 64 bytes or Base58 string).

- **Insufficient funds / holdings:**  
  - If you attempt to buy more SOL than your wallet has, the swap will fail.  
  - If you attempt to sell a token not present in `cache.json`, you will receive an error.

- **Price fetch errors:**  
  If the Data-API price endpoints fail or return zero, `unrealizedPnl` may be inaccurate or zero. Check network connectivity and your Data-API key.

- **Swap failures:**  
  If the `solana-swap` call to `performSwap()` fails, ensure your RPC endpoint supports `advancedTx=true` and that your wallet has sufficient SOL for fees.

---

## License

This project is released under the MIT License. See `LICENSE` for details.