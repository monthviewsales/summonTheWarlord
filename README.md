# summonTheWarlord — a VAULT77 🔐77 relic

![Release](https://img.shields.io/github/v/release/monthviewsales/summonTheWarlord)
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
- `npm` — [Artistic-2.0](https://github.com/npm/cli/blob/HEAD/LICENSE)
- `open` — [MIT](https://github.com/sindresorhus/open/blob/HEAD/LICENSE)
- `solana-swap` — [ISC](https://github.com/YZYLAB/solana-swap/blob/HEAD/LICENSE)

Tooling:

- `eslint` — [MIT](https://github.com/eslint/eslint/blob/HEAD/LICENSE)
- `eslint-config-standard` — [MIT](https://github.com/standard/eslint-config-standard/blob/HEAD/LICENSE)
- `eslint-plugin-import` — [MIT](https://github.com/import-js/eslint-plugin-import/blob/HEAD/LICENSE)
- `eslint-plugin-n` — [MIT](https://github.com/eslint-community/eslint-plugin-n/blob/HEAD/LICENSE)
- `eslint-plugin-promise` — [ISC](https://github.com/eslint-community/eslint-plugin-promise/blob/HEAD/LICENSE)
- `jest` — [MIT](https://github.com/jestjs/jest/blob/HEAD/LICENSE)
