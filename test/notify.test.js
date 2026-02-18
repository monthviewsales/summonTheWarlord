import { beforeAll, afterEach, describe, expect, jest, test } from "@jest/globals";

let platformDescriptor;

function setPlatform(value) {
  Object.defineProperty(process, "platform", {
    value,
    configurable: true,
  });
}

beforeAll(() => {
  platformDescriptor = Object.getOwnPropertyDescriptor(process, "platform");
});

afterEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
  jest.restoreAllMocks();
  Object.defineProperty(process, "platform", platformDescriptor);
});

describe("notify", () => {
  test("uses non-blocking spawn by default on macOS and keeps child referenced for failure visibility", async () => {
    setPlatform("darwin");

    const child = {
      once: jest.fn(() => child),
      unref: jest.fn(),
    };

    const spawn = jest.fn().mockReturnValue(child);
    const spawnSync = jest.fn();
    const loggerWarn = jest.fn();
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    jest.unstable_mockModule("node:child_process", () => ({ spawn, spawnSync }));
    jest.unstable_mockModule("../utils/logger.js", () => ({ logger: { warn: loggerWarn } }));

    const { notify } = await import("../utils/notify.js");

    const result = notify({ title: "Trade", message: "Filled" });

    expect(result).toBe(true);
    expect(spawn).toHaveBeenCalledTimes(1);
    expect(spawnSync).not.toHaveBeenCalled();
    expect(child.once).toHaveBeenCalledTimes(2);
    expect(child.unref).not.toHaveBeenCalled();
    expect(logSpy).not.toHaveBeenCalled();
  });


  test("logs fallback when osascript exits non-zero in non-blocking mode", async () => {
    setPlatform("darwin");

    const handlers = {};
    const child = {
      once: jest.fn((event, callback) => {
        handlers[event] = callback;
        return child;
      }),
      unref: jest.fn(),
    };

    const spawn = jest.fn().mockReturnValue(child);
    const spawnSync = jest.fn();
    const loggerWarn = jest.fn();
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    jest.unstable_mockModule("node:child_process", () => ({ spawn, spawnSync }));
    jest.unstable_mockModule("../utils/logger.js", () => ({ logger: { warn: loggerWarn } }));

    const { notify } = await import("../utils/notify.js");

    const result = notify({ title: "Trade", message: "Filled" });
    handlers.exit(1);

    expect(result).toBe(true);
    expect(loggerWarn).toHaveBeenCalledWith("Notification failed.", { error: "osascript exited with 1" });
    expect(logSpy).toHaveBeenCalledWith("🔔 Trade: Filled");
    expect(child.unref).not.toHaveBeenCalled();
  });

  test("throws NotificationError when throwOnError triggers blocking path failure", async () => {
    setPlatform("darwin");

    const spawn = jest.fn();
    const spawnSync = jest.fn().mockReturnValue({ status: 1, error: null });
    const loggerWarn = jest.fn();

    jest.unstable_mockModule("node:child_process", () => ({ spawn, spawnSync }));
    jest.unstable_mockModule("../utils/logger.js", () => ({ logger: { warn: loggerWarn } }));

    const { notify } = await import("../utils/notify.js");

    expect(() => notify({ throwOnError: true })).toThrow("osascript exited with 1");
    expect(spawnSync).toHaveBeenCalledTimes(1);
    expect(spawn).not.toHaveBeenCalled();
  });

  test("falls back to console bell on non-macOS platforms", async () => {
    setPlatform("linux");

    const spawn = jest.fn();
    const spawnSync = jest.fn();
    const loggerWarn = jest.fn();
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    jest.unstable_mockModule("node:child_process", () => ({ spawn, spawnSync }));
    jest.unstable_mockModule("../utils/logger.js", () => ({ logger: { warn: loggerWarn } }));

    const { notify } = await import("../utils/notify.js");

    const result = notify({ title: "Trade", message: "Filled", subtitle: "Buy" });

    expect(result).toBe(false);
    expect(spawn).not.toHaveBeenCalled();
    expect(spawnSync).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("Trade: Filled - Buy"));
  });

  test("uses non-blocking fallback when spawn emits error", async () => {
    setPlatform("darwin");

    const handlers = {};
    const child = {
      once: jest.fn((event, callback) => {
        handlers[event] = callback;
        return child;
      }),
      unref: jest.fn(),
    };

    const spawn = jest.fn().mockReturnValue(child);
    const spawnSync = jest.fn();
    const loggerWarn = jest.fn();
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    jest.unstable_mockModule("node:child_process", () => ({ spawn, spawnSync }));
    jest.unstable_mockModule("../utils/logger.js", () => ({ logger: { warn: loggerWarn } }));

    const { notify } = await import("../utils/notify.js");

    const result = notify({ title: "Trade", message: "Filled" });
    handlers.error(new Error("spawn failed"));

    expect(result).toBe(true);
    expect(loggerWarn).toHaveBeenCalledWith("Notification failed.", { error: "spawn failed" });
    expect(logSpy).toHaveBeenCalledWith("🔔 Trade: Filled");
  });
});