# summonTheWarlord — a VAULT77 🔐77 relic

![Release](https://img.shields.io/github/v/release/monthviewsales/summonTheWarlord)
![Node](https://img.shields.io/badge/node-%3E%3D20.x-brightgreen)
![Platform](https://img.shields.io/badge/platform-macOS-blue)

**Version:** 1.5.5

> *Relic software unearthed from VAULT77.  
> For trench operators only. macOS‑native. Handle with care.*  
> It executes trades with speed and precision — a lifeline to save our futures.

---

## Requirements
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

### 3. Environment Setup

Create a `.env` file and add:

```env
SOLANATRACKER_API_KEY=your_api_key
SOLANATRACKER_RPC=https://your-rpc-url.solanatracker.io
```

### 4. First Run — Initialize Wallet + Permissions

```bash
node warlord-cli.js setup
```

This:
- Creates/imports your wallet  
- Stores it securely in macOS Keychain  
- Enables macOS notifications  

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
