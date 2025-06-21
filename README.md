## 🧙‍♂️ summonWarlord

**summonWarlord** is a CLI tool for executing token trades on Solana DEXes with speed and precision, designed for power users and bots.

### Features

- Lightning-fast token trades (buy/sell) on Solana
- Unified trade command for both directions
- "Auto" sell logic (stop-loss, trailing stop, etc)
- Percent-based sells
- Human-readable output

## ⚡️ Quickstart

1. **Install** (requires Python 3.9+)

```bash
pip install summonwarlord
```

2. **Configure your wallet**:

```bash
warlord configure
```

You will be prompted to enter your Solana private key or keypair file.

3. **Check your balance and available tokens**:

```bash
warlord balances
```

4. **Find a token mint address** (e.g., via [SolanaTracker.io Memescope](https://www.solanatracker.io/memescope) or your favorite explorer).

## 🚀 Usage

Once configured, you can execute trades using a unified command with only a .9% fee!  Thats lower than any web platform out there:

### Trade Command

```bash
warlord trade <MINT_ADDRESS> <buy|sell> <AMOUNT?>
```

- **`<MINT_ADDRESS>`**: The SPL token mint you want to trade.
- **`buy` / `-b` or `sell` / `-s` **: Direction of trade.
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
warlord trade FvVJ6RCr1XH8hvZbzx4pH45ab24NNUhWjgTKvGcuVYHD sell 25
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