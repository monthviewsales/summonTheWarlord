# summonTheWarlord — a VAULT77 🔐77 relic

![Release](https://img.shields.io/npm/v/@vault77/summon?label=release)
![Node](https://img.shields.io/badge/node-%3E%3D18.x-brightgreen)
![Platform](https://img.shields.io/badge/platform-macOS-blue)

**Version:** 2.0.2

> _Relic software unearthed from VAULT77.  
> For trench operators only. macOS‑native. Handle with care._  
> It executes trades with speed and precision — a lifeline to save our futures.

---

⚠️ **Operator notice:** summonTheWarlord executes live on‑chain swaps. Always verify token mints, amounts, and configuration values before execution. If you buy crap its your fault.

## Requirements

- Node.js >= 18
- A [SolanaTracker.io](https://www.solanatracker.io/?ref=0NGJ5PPN) account
- macOS (required for native Keychain security and system notifications; other operating systems are not supported)

---

## Before `summon setup`

First-time operator? Run `summon man` first for the built-in walkthrough.

Have these inputs ready:

- SolanaTracker RPC URL assigned to your account (full `https://...` endpoint; `advancedTx=true` can be present or omitted because summon enforces it automatically)
- Wallet private key in one accepted format: base58 string or JSON byte array string (example: `[12,34,...]`)

During `summon setup`, you'll be asked for:

- `rpcUrl`
- `slippage` (`number` or `"auto"`)
- `priorityFee` (`number` or `"auto"`)
- `priorityFeeLevel` (`min|low|medium|high|veryHigh`)
- `txVersion` (`v0` or `legacy`)
- `showQuoteDetails` (`true`/`false`)
- `DEBUG_MODE` (`true`/`false`)
- `notificationsEnabled` (`true`/`false`)
- `jito.enabled` (`true`/`false`)
- `jito.tip` (SOL, only when Jito is enabled)
- Whether to store/replace your private key now (`y/N`) and, if yes, paste the key

---

## 📡 Connect with VAULT77

- **VAULT77 Community:** https://x.com/i/communities/1962257350309650488
- **Telegram:** https://t.me/BurnWalletBroadcast

---

# ⚡️ Step‑by‑Step Quickstart Guide

### 1. Install from npm

```bash
npm install -g @vault77/summon
```

### 2. First Run — Initialize Wallet + Permissions

```bash
summon setup
```

If this is your first time, run `summon man` before setup for the full command walkthrough.

This:

- Creates/updates your config (RPC URL, slippage, priority fees, etc.)
- Stores your private key securely in macOS Keychain
- Prompts macOS notification permissions (optional)

---

# ⚔️ Trading Examples

### Buy with 0.1 SOL

```bash
summon buy <TOKEN_MINT> 0.1
```

### Sell 50% of holdings

```bash
summon sell <TOKEN_MINT> 50%
```

---

# 📘 Command Reference

For the full first-time walkthrough:

```bash
summon man
```

- `summon setup` — interactive setup for config plus Keychain/private key prompts
- `summon config view` — show current config
- `summon config edit` — edit config in your `$EDITOR`
- `summon config set <key> <value>` — set one config value
- `summon config wizard` — interactive, validated config editor
- `summon config list` — list config keys and expected types
- `summon keychain store` — store private key in macOS Keychain
- `summon keychain unlock` — verify key retrieval from Keychain
- `summon keychain delete` — delete stored private key
- `summon buy <TOKEN_MINT> <amount>` — buy with SOL amount (`auto` is not supported for buys)
- `summon sell <TOKEN_MINT> <amount>` — sell fixed amount, percent (like `50%`), or `auto`
- `summon wallet` — open your wallet page in browser
- `summon doctor` — run config/Keychain/RPC/swap/notification diagnostics
- `summon man` — display the built-in manual

---

# 🧰 Local Development (optional)

```bash
git clone https://github.com/monthviewsales/summonTheWarlord.git
cd summonTheWarlord
npm install
node summon-cli.js setup
```

---

# 🛠 Upgrading

```bash
npm install -g @vault77/summon@latest
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
summon config view
summon config edit
summon config set <key> <value>
summon config wizard
summon config list
```

Tip: use `summon config wizard` for validated prompts and selector-based choices.

Key options:

- `rpcUrl` (the CLI will append `advancedTx=true` if missing)
- `slippage` (number or `"auto"`)
- `priorityFee` (number or `"auto"`)
- `priorityFeeLevel` (`min|low|medium|high|veryHigh`) — required when `priorityFee="auto"`
- `txVersion` (`v0` or `legacy`)
- `showQuoteDetails` (`true`/`false`)
- `DEBUG_MODE` (`true`/`false`)
- `notificationsEnabled` (`true`/`false`)
- `jito.enabled` (`true`/`false`)
- `jito.tip` (number, SOL)

If you want fewer popups, set `notificationsEnabled` to `false`.

Override config location (useful for CI or tests):

- `SUMMON_CONFIG_HOME=/custom/config/dir`
- `SUMMON_CONFIG_PATH=/custom/path/config.json`

Private keys are never stored in this file. Use:

```bash
summon keychain store
summon keychain unlock
summon keychain delete
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
summon doctor
```

Runs checks for config, Keychain access, RPC reachability, swap API health, and macOS notifications (skipped when disabled).

---

# 🫡 Open Source Thanks

This never would have been possible without Open Source Software and these contributions.

Dependencies:

- `@solana/web3.js` — [MIT](https://github.com/solana-foundation/solana-web3.js/blob/HEAD/LICENSE)
- `axios` — [MIT](https://github.com/axios/axios/blob/HEAD/LICENSE)
- `bs58` — [MIT](https://github.com/cryptocoinjs/bs58/blob/HEAD/LICENSE)
- `commander` — [MIT](https://github.com/tj/commander.js/blob/HEAD/LICENSE)
- `fs-extra` — [MIT](https://github.com/jprichardson/node-fs-extra/blob/HEAD/LICENSE)
- `keytar` — [MIT](https://github.com/atom/node-keytar/blob/HEAD/LICENSE)
- `open` — [MIT](https://github.com/sindresorhus/open/blob/HEAD/LICENSE)
- `solana-swap` — [ISC](https://github.com/YZYLAB/solana-swap/blob/HEAD/LICENSE)

Tooling:

- `eslint` — [MIT](https://github.com/eslint/eslint/blob/HEAD/LICENSE)
- `jest` — [MIT](https://github.com/jestjs/jest/blob/HEAD/LICENSE)
