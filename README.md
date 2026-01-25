# summonTheWarlord — a VAULT77 🔐77 relic

![Release](https://img.shields.io/github/v/release/monthviewsales/summonTheWarlord)
![Node](https://img.shields.io/badge/node-%3E%3D18.x-brightgreen)
![Platform](https://img.shields.io/badge/platform-macOS-blue)

**Version:** 1.5.7

> *Relic software unearthed from VAULT77.  
> For trench operators only. macOS‑native. Handle with care.*  
> It executes trades with speed and precision — a lifeline to save our futures.

---

## Requirements
- Node.js >= 18  
- A [SolanaTracker.io](https://www.solanatracker.io/?ref=0NGJ5PPN) account  
- macOS (Keychain + notifications required — other OSes are not supported)

---

## 📡 Connect with VAULT77

- **VAULT77 Community:** https://x.com/i/communities/1962257350309650488  
- **Telegram:** https://t.me/BurnWalletBroadcast  

---

# ⚡️ Step‑by‑Step Quickstart Guide

### 1. Clone the Repository

```bash
git clone https://github.com/monthviewsales/summonTheWarlord.git
cd summonTheWarlord
```

### 2. Install Dependencies

```bash
npm install
```

### 3. First Run — Initialize Wallet + Permissions

```bash
node warlord-cli.js setup
```

This:
- Creates/updates your config (RPC URL, API key, slippage, etc.)  
- Stores your private key securely in macOS Keychain  
- Prompts macOS notification permissions  

---

# ⚔️ Trading Examples

### Buy with 0.1 SOL
```bash
warlord trade <TOKEN_MINT> -b 0.1
```

### Sell 50% of holdings
```bash
warlord trade <TOKEN_MINT> -s 50%
```

---

# ⚡️ Summon the Warlord From Any Terminal  
### *VAULT77 Standard Global Invocation Ritual*

Run inside your cloned repo:

```bash
chmod +x warlord-cli.js
mkdir -p ~/bin
ln -sf "$(pwd)/warlord-cli.js" ~/bin/warlord
```

Ensure `~/bin` is in your PATH:

```bash
echo 'export PATH="$HOME/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

Test the summon:

```bash
warlord -h
```

---

# 🛠 Upgrading

```bash
cd summonTheWarlord
git pull origin main
npm install
```

---

# 👁‍🗨 For Coding Agents & Contributors

See **AGENTS.md** for building conventions, coding rules, and automation guidance.

---

# 🛡 Support

- **VAULT77 Community:** https://x.com/i/communities/1962257350309650488  
- **Telegram:** https://t.me/BurnWalletBroadcast  

---

# ⚙️ Configuration

The CLI stores configuration in:

- `~/Library/Application Support/summonTheWarlord/config.json`

You can manage it with:

```bash
warlord config view
warlord config edit
warlord config set <key> <value>
```

Key options:
- `rpcUrl` (the CLI will append `advancedTx=true` if missing)
- `swapAPIKey`
- `slippage` (number, %)
- `priorityFee` (number or `"auto"`)
- `priorityFeeLevel` (`min|low|medium|high|veryHigh|unsafeMax`)
- `txVersion` (`v0` or `legacy`)
- `showQuoteDetails` (`true`/`false`)
- `DEBUG_MODE` (`true`/`false`)

Override config location (useful for CI or tests):
- `SUMMON_WARLORD_CONFIG_HOME=/custom/config/dir`
- `SUMMON_WARLORD_CONFIG_PATH=/custom/path/config.json`

Private keys are never stored in this file. Use:

```bash
warlord keychain store
warlord keychain unlock
warlord keychain delete
```

---

# 🧪 Testing & Linting

```bash
npm test
npm run lint
```

---

# 🩺 Diagnostics

```bash
warlord doctor
```

Runs checks for config, Keychain access, RPC reachability, swap API health, and macOS notifications.
