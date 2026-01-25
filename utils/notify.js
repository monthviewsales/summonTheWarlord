import { spawnSync } from "node:child_process";
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
 */
export function notify({
  title = "summonTheWarlord",
  message = "",
  subtitle = "",
  sound,
  throwOnError = false,
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

    const result = spawnSync("osascript", ["-e", script], { stdio: "ignore" });
    if (result.error || result.status !== 0) {
      throw new NotificationError(`osascript exited with ${result.status}`, { cause: result.error });
    }
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
