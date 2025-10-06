# summonTheWarlord — Agent Guide

## Project Summary
- CLI (`warlord-cli.js`) wraps SolanaTracker's swap SDK (`solana-swap`) to buy/sell SPL tokens with a configured wallet (`lib/trades.js`).
- Configuration lives in a JSON file under `~/Library/Application Support/summonTheWarlord/config.json`; sensitive keys are managed via macOS Keychain (`utils/keychain.js`).
- Notifications are macOS-only (`utils/notify.js`); the project is not intended to run on other operating systems.

## Environment & Tooling
- Target Node.js ≥18 with ES modules enabled. Dependencies are already vendored via `npm install`.
- Assumes macOS access to Keychain; avoid running flows that bypass secure storage.
- RPC endpoints must include `advancedTx=true`; `lib/trades.js` enforces this by appending the flag when missing.
- The Solana swap backend is currently `https://swap-v2.solanatracker.io`. If receiving HTTP 500 errors, confirm whether SolanaTracker has migrated to a new base URL and update the SDK or call `tracker.setBaseUrl(...)` accordingly.

## Configuration & Secrets
- Never commit wallet secrets or API keys. Use the `warlord keychain` commands to inspect or update stored keys.
- Default config (`lib/config.js`) seeds a public RPC and `swapAPIKey`. Treat these as placeholders; operators are expected to override with their own values.
- `priorityFee` may be `"auto"` or numeric. Percent-based amounts are strings ending with `%`, while `"auto"` consumes the full balance for sells.

## Execution & Testing
- Run the CLI via `node warlord-cli.js ...` or the `warlord` bin. Buying with `"auto"` is disallowed; selling supports `"auto"` and percentage strings.
- There is no automated test suite beyond `npm test` (placeholder). Validate critical paths manually: fetching swap instructions and executing swaps against Solana mainnet.
- When debugging trades, log the swap response only if `showQuoteDetails` is true to avoid noisy console output.

## Development Notes
- Heavy dependencies (`@solana/web3.js`, `bs58`) are lazily imported inside trade helpers for faster CLI startup.
- Swap fees are injected via the `fee` option inside `buyToken`/`sellToken`; adjust both functions if fee policy changes.
- Respect the memoized tracker client `getTrackerClient()` so retries reuse a single SolanaTracker instance.
- Keychain-related failures should surface clear error messages—prefer `Error` objects with actionable guidance instead of generic strings.

## Operational Checks
- If swaps suddenly fail, test the upstream REST endpoints directly with `curl` to isolate SDK vs. backend issues.
- Ensure RPC URLs remain healthy; the CLI appends `advancedTx=true` but still relies on operator-provided hosts for reliability.
- Confirm macOS notification permissions during setup (`warlord setup`) so users see trade confirmations.

