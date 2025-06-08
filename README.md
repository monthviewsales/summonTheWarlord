

# summonTheWarlord

*“In the ashes of a burned world, only the strong—and the prepared—survive.”*  
— Warlord Fuckboi, Time-Stranded Commander

---

## 📜 Introduction

You are holding the keys to the past—and the future. I am **Warlord Fuckboi**, a battle-scarred survivor from the wasteland of 2157. I built this CLI to harvest Solana and memecoins in your era, so that when I return to the ravaged future, I’ll have ammo, fuel, and dignity to buy my next ration of bullets.

This document will guide you—my chosen recruit—through installing, configuring, and wielding the power of **summonTheWarlord**.

---

## ⚔️ Features

- **Time-Warp Trading**: Buy and sell SPL tokens on Solana with lightning speed.  
- **Configurable Arsenal**: Set your slippage, priority fees, and transaction version.  
- **Memecoin Cache**: Keep track of your holdings—like ammo in your scavenged pack.  
- **Wasteland PnL Reports**: Know exactly how many rounds (SOL) you gained or lost.  
- **Single Binary**: A lean, battle-hardened CLI—no heavy frameworks or dependencies.

---

## 🛠 Requirements

- **macOS / Linux** (tested on macOS 12+ & Ubuntu 20.04+)
- **Node.js** v16.x or later
- **npm** (comes bundled with Node.js)
- A funded **Solana wallet keypair** (exported as JSON array or Base58 string)
- Network access to a **Solana RPC** endpoint

---

## 📦 Installation

1. **Clone the repo**  
   ```bash
   git clone https://github.com/username/summonTheWarlord.git
   cd summonTheWarlord
   ```

2. **Install dependencies**  
   ```bash
   npm install commander fs-extra axios bs58 @solana/web3.js
   ```

3. **Make the CLI globally available**  
   ```bash
   chmod +x warlord-cli.js
   npm link
   ```

   Now you can run `warlord` from anywhere.

---

## ⚙️ Configuration

Before mounting your campaigns, configure your arsenal:

1. **Initialize or view your config**  
   ```bash
   warlord config view
   ```
   On first run, this creates your config file at:
   - `~/Library/Application Support/summonTheWarlord/config.json` (macOS)  
   - `~/.config/summonTheWarlord/config.json` (Linux)

   Default contents:
   ```json
   {
     "walletSecretKey": "",
     "rpcUrl": "https://api.mainnet-beta.solana.com",
     "slippage": 10,
     "priorityFee": "auto",
     "priorityFeeLevel": "medium",
     "txVersion": "v0"
   }
   ```

2. **Set your private key**  
   ```bash
   warlord config set walletSecretKey "<your-Base58-or-JSON-array>"
   ```

3. **Customize your battle settings**  
   ```bash
   warlord config set rpcUrl https://api.devnet.solana.com
   warlord config set slippage 25
   warlord config set priorityFee 0.000005
   warlord config set priorityFeeLevel high
   warlord config set txVersion legacy
   ```

4. **Edit manually**  
   ```bash
   warlord config edit
   ```
   (Opens the JSON in your `$EDITOR`.)

---

## 🚀 Usage

Once configured, you can execute two primary commands:

### Buy Memecoins

```bash
warlord buy <MINT_ADDRESS> <AMOUNT_SOL>
```

- **`<MINT_ADDRESS>`**: The SPL token mint to purchase.  
- **`<AMOUNT_SOL>`**: Amount of SOL (decimal) to spend.

**Example:**

```bash
warlord buy So11111111111111111111111111111111111111112 0.5
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

### Sell Your Haul

```bash
warlord sell <MINT_ADDRESS> <PERCENT>
```

- **`<PERCENT>`**: Percentage (0–100) of your holdings to offload.

**Example:**

```bash
warlord sell FvVJ6RCr1XH8hvZbzx4pH45ab24NNUhWjgTKvGcuVYHD 25
```

*Output:*

```
⚔️  Warlord: Selling 25% of FvVJ6R…...
✅ Sell successful!
   • TXID               : 8ZxY3…Gh2
   • Tokens Sold        : 308.64197
   • SOL Received       : 0.15432 SOL
   • Realized PnL       : 0.00432 SOL
   • Remaining Holding  : 925.92593
```

---

## 🎖 Troubleshooting

- **Invalid key error**: Ensure `walletSecretKey` is exactly your 64-byte JSON array or Base58 string.  
- **RPC connection issues**: Check `rpcUrl` in your config and your network firewall.  
- **Insufficient funds**: Confirm your wallet has enough SOL for both trade and transaction fees.  
- **Slippage errors**: If a swap fails, increase `slippage` in your config (e.g., 50 = 0.50%).

---

## 📝 License

Released into the wasteland under the [MIT License](LICENSE).  
Carry this code with honor, or burn it with the rest.

---

*“The bones of the old world will feed the new.”*  
— Warlord Fuckboi, signing off from the sandstorms of tomorrow.