// Not fully implemented yet.  macOS Terminal can't issue notifications.  
// Will be added in a later version when bundled as .app
import { spawnSync } from "child_process";

/**
 * Display a macOS native notification using osascript.
 * @param {string} message - The body text of the notification.
 * @param {string} [title="Warlord CLI"] - The title of the notification.
 */
export function notify(message, title = "summonTheWarlord") {
  spawnSync("osascript", [
    "-e",
    `display notification ${JSON.stringify(message)} with title ${JSON.stringify(title)}`
  ]);
}
