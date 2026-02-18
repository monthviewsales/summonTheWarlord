import { spawn, spawnSync } from "node:child_process";
import { NotificationError } from "../lib/errors.js";
import { logger } from "./logger.js";

function escapeAppleScriptString(str) {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/"/g, "\\\"")
    .replace(/\n/g, "\\n");
}

/**
 * Display a macOS native notification using osascript.
 * @param {Object} options
 * @param {string} [options.title="summonTheWarlord"]
 * @param {string} [options.message=""]
 * @param {string} [options.subtitle=""]
 * @param {string} [options.sound]
 * @param {boolean} [options.blocking] When true, waits for osascript completion.
 *                                     Defaults to throwOnError so strict callers stay blocking.
 */
export function notify({
  title = "summonTheWarlord",
  message = "",
  subtitle = "",
  sound,
  throwOnError = false,
  blocking = throwOnError,
} = {}) {
  if (process.platform !== "darwin") {
    const bell = "\u0007";
    console.log(`${bell} ${title}: ${message}${subtitle ? ` - ${subtitle}` : ""}`);
    return false;
  }

  try {
    const escTitle = escapeAppleScriptString(title);
    const escMessage = escapeAppleScriptString(message);
    const escSubtitle = escapeAppleScriptString(subtitle);
    let script = `display notification "${escMessage}" with title "${escTitle}"`;
    if (subtitle) {
      script += ` subtitle "${escSubtitle}"`;
    }
    if (sound) {
      script += ` sound name "${escapeAppleScriptString(sound)}"`;
    }

    if (blocking) {
      const result = spawnSync("osascript", ["-e", script], { stdio: "ignore" });
      if (result.error || result.status !== 0) {
        throw new NotificationError(`osascript exited with ${result.status}`, { cause: result.error });
      }
      return true;
    }
    let handledFailure = false;
    const fallback = () => {
      if (handledFailure) return;
      handledFailure = true;
      console.log(`🔔 ${title}: ${message}${subtitle ? ` - ${subtitle}` : ""}`);
    };
    const child = spawn("osascript", ["-e", script], { stdio: "ignore" });
    child.once("error", (err) => {
      logger.warn("Notification failed.", { error: err?.message });
      fallback();
    });
    child.once("exit", (code) => {
      if (code !== 0) {
        logger.warn("Notification failed.", { error: `osascript exited with ${code}` });
        fallback();
      }
    });
    // Intentionally keep the child process referenced so CLI flows that call
    // process.exit(...) immediately after notify still allow exit/error handlers
    // to run and emit the console fallback when delivery fails.
    return true;
  } catch (err) {
    logger.warn("Notification failed.", { error: err?.message });
    if (throwOnError) {
      throw err;
    }
    console.log(`🔔 ${title}: ${message}${subtitle ? ` - ${subtitle}` : ""}`);
    return false;
  }
}
