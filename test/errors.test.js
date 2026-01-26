import { test, expect } from "@jest/globals";

import { AppError, ConfigError, KeychainError, SwapError, NotificationError, DoctorError } from "../lib/errors.js";

test("AppError stores name, cause, and details", () => {
  const cause = new Error("root");
  const details = { key: "value" };
  const err = new AppError("boom", { cause, details });

  expect(err).toBeInstanceOf(Error);
  expect(err.name).toBe("AppError");
  expect(err.message).toBe("boom");
  expect(err.cause).toBe(cause);
  expect(err.details).toEqual(details);
});

test("error subclasses carry their class name", () => {
  expect(new ConfigError("x").name).toBe("ConfigError");
  expect(new KeychainError("x").name).toBe("KeychainError");
  expect(new SwapError("x").name).toBe("SwapError");
  expect(new NotificationError("x").name).toBe("NotificationError");
  expect(new DoctorError("x").name).toBe("DoctorError");
});
