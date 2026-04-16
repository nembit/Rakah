import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

export const PRAYER_CHANNEL_ID = "prayer-times";
const PRAYER_NAMES = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];

/** Creates the Android notification channel. Safe to call multiple times. */
export async function setupNotificationChannel() {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(PRAYER_CHANNEL_ID, {
    name: "Prayer Times",
    description: "Reminders for daily prayer times",
    importance: Notifications.AndroidImportance.HIGH,
    sound: "default",
    vibrationPattern: [0, 300, 200, 300],
    lightColor: "#2ECC71",
  });
}

/**
 * Converts a fractional-hour prayer time (e.g. 5.35) into a Date on the
 * given calendar date.
 */
function fractionalHourToDate(fractionalHour, date) {
  const d = new Date(date);
  const hours = Math.floor(fractionalHour);
  const minutes = Math.round((fractionalHour - hours) * 60);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

/**
 * Cancels all previously scheduled prayer notifications (identified by their
 * data.type === "prayer" tag).
 */
export async function cancelPrayerNotifications() {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of scheduled) {
    if (n.content?.data?.type === "prayer") {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  }
}

/**
 * Schedules prayer notifications for today (remaining prayers only) and tomorrow.
 * Notifications are ONLY scheduled for prayer times strictly in the future (> 60s away).
 * They fire exactly when the prayer time arrives — not immediately.
 *
 * @param {object} todayTimes    - { Fajr: { time: number, formatted: string }, ... }
 * @param {object} tomorrowTimes - same shape for the next calendar day
 * @param {object} notifSettings - { Fajr: bool, Dhuhr: bool, ... }
 * @param {Date}   todayDate     - today's Date (for anchor)
 * @param {Date}   tomorrowDate  - tomorrow's Date
 */
export async function schedulePrayerNotifications(
  todayTimes,
  tomorrowTimes,
  notifSettings,
  todayDate,
  tomorrowDate,
) {
  // Always cancel existing prayer notifications before rescheduling.
  await cancelPrayerNotifications();

  const now = new Date();
  // Require the prayer to be at least 60 seconds in the future.
  // This ensures we never schedule a notification that fires immediately.
  const MIN_FUTURE_MS = 60 * 1000;

  for (const prayer of PRAYER_NAMES) {
    if (!notifSettings?.[prayer]) continue;

    // --- Today ---
    const todayFraction = todayTimes[prayer]?.time;
    if (typeof todayFraction === "number") {
      const todayAt = fractionalHourToDate(todayFraction, todayDate);
      const msUntilToday = todayAt.getTime() - now.getTime();

      if (msUntilToday > MIN_FUTURE_MS) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `🕌 ${prayer}`,
            body: `Time for ${prayer} — ${todayTimes[prayer].formatted}`,
            sound: true,
            data: { type: "prayer", prayer, day: "today" },
          },
          trigger: {
            // Explicit DATE trigger type required by expo-notifications 0.32+
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: todayAt,
            channelId: PRAYER_CHANNEL_ID,
          },
        });
      }
    }

    // --- Tomorrow ---
    const tomorrowFraction = tomorrowTimes?.[prayer]?.time;
    if (typeof tomorrowFraction === "number") {
      const tomorrowAt = fractionalHourToDate(tomorrowFraction, tomorrowDate);
      const msUntilTomorrow = tomorrowAt.getTime() - now.getTime();

      if (msUntilTomorrow > MIN_FUTURE_MS) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `🕌 ${prayer}`,
            body: `Time for ${prayer} — ${tomorrowTimes[prayer].formatted}`,
            sound: true,
            data: { type: "prayer", prayer, day: "tomorrow" },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: tomorrowAt,
            channelId: PRAYER_CHANNEL_ID,
          },
        });
      }
    }
  }
}
