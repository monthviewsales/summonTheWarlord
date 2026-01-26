import { test, expect, beforeEach, afterEach, jest } from "@jest/globals";

const ORIGINAL_ENV = {
  WARLORD_LOG_LEVEL: process.env.WARLORD_LOG_LEVEL,
  WARLORD_LOG_JSON: process.env.WARLORD_LOG_JSON,
  NODE_ENV: process.env.NODE_ENV,
};

const setEnv = (overrides) => {
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
};

const restoreEnv = () => {
  setEnv(ORIGINAL_ENV);
};

const captureConsole = () => {
  const spies = {
    log: jest.spyOn(console, "log").mockImplementation(() => {}),
    info: jest.spyOn(console, "info").mockImplementation(() => {}),
    warn: jest.spyOn(console, "warn").mockImplementation(() => {}),
    error: jest.spyOn(console, "error").mockImplementation(() => {}),
    debug: jest.spyOn(console, "debug").mockImplementation(() => {}),
  };
  return () => {
    Object.values(spies).forEach((spy) => spy.mockRestore());
  };
};

const loadLogger = async () => {
  jest.resetModules();
  const mod = await import("../utils/logger.js");
  return mod.logger;
};

beforeEach(() => {
  restoreEnv();
});

afterEach(() => {
  restoreEnv();
});

test("logger outputs JSON when enabled", async () => {
  setEnv({ WARLORD_LOG_JSON: "1", WARLORD_LOG_LEVEL: "debug", NODE_ENV: "production" });
  const restore = captureConsole();
  const logger = await loadLogger();

  logger.info("hello", { foo: "bar" });

  expect(console.log).toHaveBeenCalledTimes(1);
  const payload = console.log.mock.calls[0][0];
  const parsed = JSON.parse(payload);
  expect(parsed).toMatchObject({ level: "info", message: "hello", foo: "bar" });
  restore();
});

test("logger respects log level filtering", async () => {
  setEnv({ WARLORD_LOG_LEVEL: "error", WARLORD_LOG_JSON: "0", NODE_ENV: "production" });
  const restore = captureConsole();
  const logger = await loadLogger();

  logger.info("ignored");
  logger.error("boom");

  expect(console.log).not.toHaveBeenCalled();
  expect(console.error).toHaveBeenCalledTimes(1);
  restore();
});

test("logger formats non-JSON messages with meta", async () => {
  setEnv({ WARLORD_LOG_LEVEL: "debug", WARLORD_LOG_JSON: "0", NODE_ENV: "production" });
  const restore = captureConsole();
  const logger = await loadLogger();

  logger.warn("warned", { id: 42 });

  expect(console.warn).toHaveBeenCalledTimes(1);
  const payload = console.warn.mock.calls[0][0];
  expect(payload).toContain("[WARN]");
  expect(payload).toContain("warned");
  expect(payload).toContain("\"id\":42");
  restore();
});

test("logger supports debug output", async () => {
  setEnv({ WARLORD_LOG_LEVEL: "debug", WARLORD_LOG_JSON: "0", NODE_ENV: "production" });
  const restore = captureConsole();
  const logger = await loadLogger();

  logger.debug("details");

  expect(console.debug).toHaveBeenCalledTimes(1);
  const payload = console.debug.mock.calls[0][0];
  expect(payload).toContain("[DEBUG]");
  restore();
});
