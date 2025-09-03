## Requirements

- A [SolanaTracker.io](https://www.solanatracker.io/?ref=0NGJ5PPN) account (used for RPC and API access).   
- macOS (Keychain + notifications required — other OSes are not supported).

# summonTheWarlord — a VAULT77 🔐77 relic

**Version:** 1.4.4

> *Relic software unearthed from VAULT77.  
> For trench operators only. macOS-native. Handle with care.*  
> It executes trades with speed and precision — a lifeline to save our futures.

---

## 📡 Connect with VAULT77

- **VAULT77 Community**: [Join on X](https://x.com/i/communities/1962257350309650488)  
- **Telegram (Community)**: [@BurnWalletBroadcast](https://t.me/BurnWalletBroadcast)  
> Join VAULT77 🔐77 and become part of the operator network.

⚠️ **First time using a CLI tool or Solana wallet?**  
No worries — this guide walks you through each step. You’ll need a free account on [SolanaTracker](https://www.solanatracker.io/?ref=0NGJ5PPN) to get an RPC URL and API Key, and we’ll show you how to securely set up your wallet using macOS Keychain.

**summonTheWarlord** is a CLI tool for executing token trades on Solana DEXes with speed and trench-tested precision.

### Features

- Lightning-fast token trades (buy/sell) on Solana
- Unified trade command for both directions
- "Auto" sell logic (stop-loss, trailing stop, etc.)
- Percent-based sells
- Human-readable output
- **0.5% trading fee — lower than all web tools**  
  Plus a **0.4% operator fee** on buys routed to the Warlord Treasury (to keep the trench doors open)
- macOS notifications for trade results and setup
- Secure key storage with overwrite detection
- Retry-safe client creation for stability
- Supported DEXs:  
  Raydium, Raydium CPMM, Pump.fun, Pump.fun AMM, Raydium Launchpad, MoonIt, Letsbonk.fun, Jupiter Studio, Believe, Meteora Dynamic, Moonshot, Orca, Jupiter (Private API), Heaven, and more added regularly.

---

## ⚡️ Step-by-Step Quickstart Guide

Welcome, Operator. The Warlord awaits your command.  
Follow these steps to unlock the power of this VAULT77 relic and execute trades at the speed of the trenches.

### 1. Clone the Repository

First, retrieve the relic from the vault:

```bash
git clone https://github.com/your-username/summonTheWarlord.git
cd summonTheWarlord
```

### 2. Install Dependencies

Let Node.js prepare your terminal for battle.  
Run this command in the project directory:

```bash
npm install
```

### 3. Set Up Your Environment

You’ll need a `.env` file in the project root to connect to Solana and the Warlord’s command lines.  
Create a `.env` file (you can copy `.env.example` if provided) and add your credentials:

```env
SOLANATRACKER_API_KEY=your_solanatracker_api_key_here
SOLANATRACKER_RPC=https://your-rpc-url.solanatracker.io
```

> **How to get these?**  
> - Create a free account at [SolanaTracker.io](https://www.solanatracker.io/?ref=0NGJ5PPN)  
> - Find your API key and RPC URL in your dashboard.

**Wallet Keypair:**  
On first run, your Solana wallet keypair will be generated and stored securely in your macOS Keychain.  
No private keys are ever written to disk.  

### 4. First Run: Initialize Your Wallet & Permissions

Summon the Warlord and set up your operator credentials:

```bash
node warlord-cli.js setup
```

This will:
- Guide you through wallet creation or import.
- Store your keypair in the macOS Keychain.
- Request notification permissions from macOS (approve to receive trade alerts).

### 5. Trade Examples

Once setup is complete, you’re ready to trade from the trenches.

- **Buy a token using 0.1 SOL:**
  ```bash
  node warlord-cli.js trade <TOKEN_MINT> -b 0.1
  ```
  Replace `<TOKEN_MINT>` with the token’s Solana mint address.

- **Sell 50% of your holdings:**
  ```bash
  node warlord-cli.js trade <TOKEN_MINT> -s 50%
  ```

You can use any percent (e.g. `-s 100%` for all, or `-s 25%` for a quarter sell).

### 6. Notifications

On first run, macOS will prompt you for notification permissions — grant them to receive real-time trade and setup alerts directly from the VAULT77 Warlord.

Every successful (or failed) trade triggers a native notification, so you always know the fate of your orders.

### 7. Support & Community

Should you encounter any anomalies, lost relics, or require guidance from seasoned operators:

- **VAULT77 Community:** [Join on X](https://x.com/i/communities/1962257350309650488)
- **Telegram:** [@BurnWalletBroadcast](https://t.me/BurnWalletBroadcast)

> The Warlord’s trenches run deep. Don’t hesitate to reach out — the community is here to help you survive and thrive.
