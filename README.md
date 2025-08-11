## 🧙‍♂️ summonTheWarlord

**Version:** 1.4.0

> ⚠️ **First time using a CLI tool or Solana wallet?** No worries—this guide walks you through each step. You’ll need a free account on [SolanaTracker](https://www.solanatracker.io/solana-rpc?via=scoobycarolan) to get an RPC URL and API Key, and we’ll show you how to securely set up your wallet using macOS Keychain.

**summonWarlord** is a CLI tool for executing token trades on Solana DEXes with speed and precision, designed for power users and bots.

### Features

- Lightning-fast token trades (buy/sell) on Solana
- Unified trade command for both directions
- "Auto" sell logic (stop-loss, trailing stop, etc)
- Percent-based sells
- Human-readable output
- 0.9% trading fee lower than all web based tools.  Use this along side Axiom or GMGN 
- macOS notifications for trade results and during setup to confirm permissions
- Secure key storage with overwrite detection in setup
- Performance improvements via lazy-loading and memoization with retry-safe client creation
- Supported DEXs

    Raydium,
    Raydium CPMM,
    Pump.fun,
    Pump.fun AMM,
    Raydium Launchpad,
    MoonIt,
    Letsbonk.fun,
    Jupiter Studio,
    Believe,
    Meteora Dynamic,
    Moonshot,
    Orca,
    Jupiter (Private Self-Hosted API),

## ⚡️ Quickstart

1. **Clone the repo**

```bash
git clone https://github.com/your-username/summonTheWarlord.git
cd summonTheWarlord
```

2. **Install dependencies**

```bash
npm install
```

3. **Make the CLI globally accessible**

If you'd like to run `warlord` from anywhere:

```bash
chmod +x warlord-cli.js
```

Then add this line to your `.zshrc` (macOS default shell):

```bash
export PATH="$PATH:/path/to/summonTheWarlord"
```

Replace `/path/to/summonTheWarlord` with the full path to the directory you cloned.

After saving `.zshrc`, reload your shell:

```bash
source ~/.zshrc
```

Alternatively, you can use:

```bash
npm link
```

To symlink the CLI globally (handy for development).

4. **Run initial setup**

Run the interactive setup wizard:

```bash
warlord setup
```

This will walk you through setting slippage, API key, RPC URL, public wallet address, and optionally store your private key in the macOS Keychain for safety. At the end of setup, a test macOS notification will be sent to confirm permissions.

5. **Check your balance and available tokens**:

```bash
warlord balances
```

6. **Find a token mint address** (e.g., via [SolanaTracker.io Memescope](https://www.solanatracker.io/memescope) or your favorite explorer).

## 🔐 Using the macOS Keychain

We strongly recommend macOS users store their private key in the system Keychain instead of writing it into any config files.

- To store your key:
  ```bash
  warlord keychain store
  ```

  Paste your private key (Base58 string or full JSON array) when prompted.

- To verify it was saved:
  ```bash
  warlord keychain unlock
  ```

- To remove the key:
  ```bash
  warlord keychain delete
  ```

During setup, the tool will detect if a key is already stored in the Keychain and prompt you to replace it if desired.

This helps keep your wallet safe while still allowing the CLI to sign transactions.

## 🚀 Usage

Once configured, you can execute trades using a unified command with only a .9% fee!  Thats lower than any web platform out there:

### Trade Command

```bash
warlord trade <MINT_ADDRESS> <buy|sell> <AMOUNT?>
```

- **`<MINT_ADDRESS>`**: The SPL token mint you want to trade.
- **`buy` / `-b`** or **`sell` / `-s`**: Direction of trade.
- **`<AMOUNT?>`**:
  - For **buys**: Amount of SOL to spend (e.g., `0.25`, `1.5`)
  - For **sells**: Accepts:
    - A percent of holdings (e.g., `25`, `100`)
    - `auto` to let the bot decide (based on internal logic it sells all)

### 🔼 Buy Example

```bash
warlord trade So11111111111111111111111111111111111111112 buy 0.5
```

*Output:*

```
🚀 Warlord: Buying 0.5 SOL of So1111…...
✅ Buy successful!
   • TXID             : 5AbC3…XyZ
   • Tokens Purchased : 1234.5678
   • New Holding      : 1234.5678
   • Cost Basis       : 0.5 SOL
   • Unrealized PnL   : 0.05 SOL
```

### 🔽 Sell Example (percent)

```bash
warlord trade FvVJ6RCr1XH8hvZbzx4pH45ab24NNUhWjgTKvGcuVYHD sell 25%
```

### 🔽 Sell Example (auto)

```bash
warlord trade FvVJ6RCr1XH8hvZbzx4pH45ab24NNUhWjgTKvGcuVYHD sell auto
```

*Output (example for sell):*

```
⚔️  Warlord: Selling 25% of FvVJ6R…...
✅ Sell successful!
   • TXID               : 8ZxY3…Gh2
   • Tokens Sold        : 308.64197
   • SOL Received       : 0.15432 SOL
   • Realized PnL       : 0.00432 SOL
   • Remaining Holding  : 925.92593
```

## 🧰 Config Commands

View, edit, or set your CLI configuration.

### View Config

```bash
warlord config view
```

Displays your current config file location and contents.

### Edit Config

```bash
warlord config edit
```

Opens your config file in your system `$EDITOR`.

### Set Config Key

Supported keys include `slippage`, `rpcUrl`, `swapAPIKey`, and `priorityFee`.

```bash
warlord config set swapAPIKey YOUR-API-KEY
```

Updates a single config key. Example:

```bash
warlord config set slippage 25
```

## 🔑 Wallet Command

Open your wallet in the browser on SolanaTracker.io:

```bash
warlord wallet
```

This fetches your stored private key from the macOS Keychain, derives the public key, and opens your wallet view in a browser tab.

## 🧪 Need Help?

If something doesn’t work:
- Double-check your RPC URL and API key from SolanaTracker.
- Make sure your wallet has SOL for gas.
- Use `warlord config view` to confirm your settings.
- Run `warlord setup` again to reconfigure.

Still stuck? Reach out to the Warlord’s trench crew.

If notifications don't appear, check System Settings → Notifications and allow alerts for "Script Editor" (osascript).
