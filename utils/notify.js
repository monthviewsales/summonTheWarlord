import { exec } from "child_process";

/**
 * Display a macOS native notification using osascript.
 * @param {string} message - The body text of the notification.
 * @param {string} [title="Warlord CLI"] - The title of the notification.
 */
export function notify(message, title = "Warlord CLI") {
  const escapedMessage = message.replace(/"/g, '\\"');
  const escapedTitle = title.replace(/"/g, '\\"');
  const command = `osascript -e 'display notification "${escapedMessage}" with title "${escapedTitle}"'`;
  exec(command, (error) => {
    if (error) {
      console.error("⚠️ Notification failed:", error.message);
    }
  });
}
