import test, { beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import fs from "fs-extra";

import { getConfigPath, loadConfig, saveConfig } from "../lib/config.js";

let originalXdgConfigHome;
let tempConfigHome;

beforeEach(async () => {
  originalXdgConfigHome = process.env.XDG_CONFIG_HOME;
  tempConfigHome = await fs.mkdtemp(path.join(os.tmpdir(), "warlord-config-"));
  process.env.XDG_CONFIG_HOME = tempConfigHome;
});

afterEach(async () => {
  if (originalXdgConfigHome === undefined) {
    delete process.env.XDG_CONFIG_HOME;
  } else {
    process.env.XDG_CONFIG_HOME = originalXdgConfigHome;
  }
  originalXdgConfigHome = undefined;

  if (tempConfigHome) {
    await fs.remove(tempConfigHome);
    tempConfigHome = undefined;
  }
});

test("getConfigPath respects XDG_CONFIG_HOME", () => {
  const expected = path.join(tempConfigHome, "summonTheWarlord", "config.json");
  assert.equal(getConfigPath(), expected);
});

test("loadConfig writes defaults when missing", async () => {
  const configPath = getConfigPath();
  const cfg = await loadConfig();

  assert.ok(await fs.pathExists(configPath), "config file should be created");
  const fileContents = await fs.readJson(configPath);
  assert.deepEqual(cfg, fileContents, "config returned should match file contents");

  assert.equal(cfg.rpcUrl, "https://rpc.solanatracker.io/public?advancedTx=true");
  assert.equal(cfg.priorityFee, "auto");
  assert.equal(cfg.swapAPIKey, "jduck-d815-4c28-b85d-17e9fc3a21a8");

  const fileStat = await fs.stat(configPath);
  assert.equal(fileStat.mode & 0o777, 0o600, "config file permissions should be 600");

  const dirStat = await fs.stat(path.dirname(configPath));
  assert.equal(dirStat.mode & 0o777, 0o700, "config directory permissions should be 700");
});

test("loadConfig merges missing defaults", async () => {
  const configPath = getConfigPath();
  await fs.ensureDir(path.dirname(configPath));
  await fs.writeJson(configPath, { rpcUrl: "https://example", slippage: 5 });

  const cfg = await loadConfig();

  assert.equal(cfg.rpcUrl, "https://example");
  assert.equal(cfg.slippage, 5);
  assert.equal(cfg.priorityFeeLevel, "low", "missing default should be merged");
  assert.equal(cfg.txVersion, "v0", "txVersion default should be added");
});

test("saveConfig persists updates with secure permissions", async () => {
  const configPath = getConfigPath();
  const newConfig = {
    rpcUrl: "https://custom?advancedTx=true",
    slippage: 2,
    priorityFee: 0.001,
    priorityFeeLevel: "medium",
    txVersion: "legacy",
    showQuoteDetails: true,
    swapAPIKey: "custom-key",
    DEBUG_MODE: true,
  };

  await saveConfig(newConfig);

  const stored = await fs.readJson(configPath);
  assert.deepEqual(stored, newConfig);

  const fileStat = await fs.stat(configPath);
  assert.equal(fileStat.mode & 0o777, 0o600);
});
