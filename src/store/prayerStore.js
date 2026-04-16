import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { today, subtractDays, toDateString } from "../utils/dateUtils";
import { PRAYER_NAMES } from "../utils/prayerTimes";

const STORAGE_KEY = "rakah-v1";

// Sunnah muakkadah prayers associated with each fard prayer.
// status per key: 'prayed' | null (null = not logged / pending)
export const SUNNAH_CONFIG = {
  Fajr:    [{ key: "Fajr_pre",     label: "2 Sunnah before", rakah: 2 }],
  Dhuhr:   [
    { key: "Dhuhr_pre",  label: "4 Sunnah before", rakah: 4 },
    { key: "Dhuhr_post", label: "2 Sunnah after",  rakah: 2 },
  ],
  Asr:     [],
  Maghrib: [{ key: "Maghrib_post", label: "2 Sunnah after",  rakah: 2 }],
  Isha:    [
    { key: "Isha_post", label: "2 Sunnah after", rakah: 2 },
    { key: "Witr", label: "Witr", rakah: 3 },
  ],
};

const ALL_SUNNAH = Object.values(SUNNAH_CONFIG).flat();

const DEFAULT_SETTINGS = {
  calcMethod: "ISNA",
  location: {
    type: "auto",
    latitude: 40.7128,
    longitude: -74.006,
    city: "New York",
    timezone: -4,
  },
  notifications: {
    Fajr: false,
    Dhuhr: false,
    Asr: false,
    Maghrib: false,
    Isha: false,
  },
  sunnahTracking: false,
  vibrations: true,
  gender: null, // 'male' | 'female'
  onboardingComplete: false,
};

const DEFAULT_QADA = { Fajr: 0, Dhuhr: 0, Asr: 0, Maghrib: 0, Isha: 0 };

// A day "qualifies" for the streak if all prayers were completed OR the day is exempt.
function dayQualifies(prayerLogs, exemptLogs, d) {
  if (exemptLogs[d]) return true;
  const log = prayerLogs[d] || {};
  return PRAYER_NAMES.every((p) => {
    const s = log[p];
    return s === "on-time" || s === "late";
  });
}

function computeStreak(prayerLogs, exemptLogs = {}) {
  let streak = 0;
  let d = today();

  if (!dayQualifies(prayerLogs, exemptLogs, d)) {
    d = subtractDays(d, 1);
  }

  for (let i = 0; i < 365; i++) {
    if (!dayQualifies(prayerLogs, exemptLogs, d)) break;
    streak++;
    d = subtractDays(d, 1);
  }
  return streak;
}

function computeBestStreak(prayerLogs, exemptLogs = {}) {
  const dates = Object.keys({ ...prayerLogs, ...exemptLogs }).sort();
  let best = 0;
  let current = 0;
  for (const d of dates) {
    if (dayQualifies(prayerLogs, exemptLogs, d)) {
      current++;
      if (current > best) best = current;
    } else {
      current = 0;
    }
  }
  return best;
}

function computeWeeklyConsistency(prayerLogs, exemptLogs = {}) {
  let prayed = 0;
  let total = 0;
  const t = new Date();
  const dayOfWeek = t.getDay();
  for (let i = 0; i <= dayOfWeek; i++) {
    const d = new Date(t);
    d.setDate(t.getDate() - i);
    const dateStr = toDateString(d);
    if (exemptLogs[dateStr]) continue; // skip exempt days
    const log = prayerLogs[dateStr] || {};
    PRAYER_NAMES.forEach((p) => {
      const s = log[p];
      if (s && s !== "pending") {
        total++;
        if (s === "on-time") prayed++;
      }
    });
  }
  if (total === 0) return 0;
  return Math.round((prayed / total) * 100);
}

function computeStats(prayerLogs, exemptLogs = {}) {
  const missCount = { Fajr: 0, Dhuhr: 0, Asr: 0, Maghrib: 0, Isha: 0 };
  const onTimeCount = { Fajr: 0, Dhuhr: 0, Asr: 0, Maghrib: 0, Isha: 0 };
  let totalLogged = 0;
  let totalOnTime = 0;

  for (const dateStr of Object.keys(prayerLogs)) {
    if (exemptLogs[dateStr]) continue; // skip exempt days
    const log = prayerLogs[dateStr];
    PRAYER_NAMES.forEach((p) => {
      const s = log[p];
      if (s && s !== "pending") {
        totalLogged++;
        if (s === "missed") missCount[p]++;
        if (s === "on-time") {
          onTimeCount[p]++;
          totalOnTime++;
        }
      }
    });
  }

  const hasData = totalLogged > 0;
  const topMissed = Object.entries(missCount).sort(([, a], [, b]) => b - a)[0];
  const topOnTime = Object.entries(onTimeCount).sort(([, a], [, b]) => b - a)[0];

  const mostMissed = hasData && topMissed?.[1] > 0 ? topMissed[0] : null;
  const bestPrayer = hasData && topOnTime?.[1] > 0 ? topOnTime[0] : null;
  const overallConsistency = hasData ? Math.round((totalOnTime / totalLogged) * 100) : 0;

  return { mostMissed, bestPrayer, overallConsistency, hasData };
}

const usePrayerStore = create((set, get) => ({
  // State
  prayerLogs: {}, // { [dateStr]: { [prayer]: 'pending'|'on-time'|'late'|'missed' } }
  qdaCounts: { ...DEFAULT_QADA },
  qdaLog: [], // [{ prayer, change, total, timestamp }]
  settings: { ...DEFAULT_SETTINGS },
  sunnahLogs: {}, // { [dateStr]: { [sunnahKey]: 'prayed' | null } }
  exemptLogs: {}, // { [dateStr]: 'haid' | 'nifas' } — female-only exempt periods
  isHydrated: false,

  // Derived (computed on demand)
  getStreak: () => computeStreak(get().prayerLogs, get().exemptLogs),
  getBestStreak: () => computeBestStreak(get().prayerLogs, get().exemptLogs),
  getWeeklyConsistency: () => computeWeeklyConsistency(get().prayerLogs, get().exemptLogs),
  getStats: () => computeStats(get().prayerLogs, get().exemptLogs),

  getDayLog: (dateStr) => {
    const logs = get().prayerLogs;
    return logs[dateStr] || {};
  },

  getDaySunnahLog: (dateStr) => get().sunnahLogs[dateStr] || {},

  getExemptDay: (dateStr) => get().exemptLogs[dateStr] || null,

  getSunnahStats: () => {
    const { sunnahLogs, prayerLogs, exemptLogs } = get();
    const trackedDates = Object.keys(prayerLogs).filter((d) => !exemptLogs[d]);
    const total = trackedDates.length * ALL_SUNNAH.length;
    let prayed = 0;
    for (const dateStr of trackedDates) {
      const sLog = sunnahLogs[dateStr] || {};
      ALL_SUNNAH.forEach(({ key }) => {
        if (sLog[key] === "prayed") prayed++;
      });
    }
    return { prayed, total, pct: total > 0 ? Math.round((prayed / total) * 100) : 0 };
  },

  // Prayer status actions
  setPrayerStatus: (dateStr, prayer, status) => {
    set((state) => {
      const isExempt = !!state.exemptLogs[dateStr];
      const newLogs = {
        ...state.prayerLogs,
        [dateStr]: {
          ...(state.prayerLogs[dateStr] || {}),
          [prayer]: status,
        },
      };

      // Auto-increment Qada when marking as missed, but not on exempt days
      let newCounts = state.qdaCounts;
      let newLog = state.qdaLog;
      if (!isExempt && status === "missed") {
        const current = state.qdaCounts[prayer] || 0;
        const newCount = current + 1;
        newCounts = { ...state.qdaCounts, [prayer]: newCount };
        const logEntry = {
          id: Date.now().toString(),
          prayer,
          change: 1,
          total: newCount,
          timestamp: new Date().toISOString(),
          note: "Auto-added from missed prayer",
        };
        newLog = [logEntry, ...state.qdaLog].slice(0, 200);
      }

      const newState = {
        prayerLogs: newLogs,
        ...(!isExempt && status === "missed"
          ? { qdaCounts: newCounts, qdaLog: newLog }
          : {}),
      };
      get()._persist({ ...state, ...newState });
      return newState;
    });
  },

  // Sunnah actions
  setSunnahStatus: (dateStr, key, status) => {
    set((state) => {
      const dayLog = state.sunnahLogs[dateStr] || {};
      const newDayLog = { ...dayLog };
      if (status === null || status === undefined) {
        delete newDayLog[key];
      } else {
        newDayLog[key] = status;
      }
      const newSunnahLogs = { ...state.sunnahLogs, [dateStr]: newDayLog };
      const newState = { sunnahLogs: newSunnahLogs };
      get()._persist({ ...state, ...newState });
      return newState;
    });
  },

  // Exempt period actions (female users)
  setExemptDay: (dateStr, type) => {
    // type: 'haid' | 'nifas' | null (null clears the exempt marker)
    set((state) => {
      const prevExempt = state.exemptLogs[dateStr];
      if (prevExempt === type) return {};

      let newCounts = { ...state.qdaCounts };
      let newLog = [...state.qdaLog];
      const dayPrayerLog = state.prayerLogs[dateStr] || {};

      if (type && !prevExempt) {
        // Marking as exempt: reverse qada for any previously-missed prayers
        PRAYER_NAMES.forEach((prayer) => {
          if (dayPrayerLog[prayer] === "missed") {
            newCounts[prayer] = Math.max(0, (newCounts[prayer] || 0) - 1);
            newLog = [
              {
                id: `${Date.now()}${prayer}`,
                prayer,
                change: -1,
                total: newCounts[prayer],
                timestamp: new Date().toISOString(),
                note: `Exempt period — ${type}`,
              },
              ...newLog,
            ].slice(0, 200);
          }
        });
      } else if (!type && prevExempt) {
        // Clearing exempt: re-add qada for any missed prayers that were reversed
        PRAYER_NAMES.forEach((prayer) => {
          if (dayPrayerLog[prayer] === "missed") {
            newCounts[prayer] = (newCounts[prayer] || 0) + 1;
            newLog = [
              {
                id: `${Date.now()}${prayer}`,
                prayer,
                change: 1,
                total: newCounts[prayer],
                timestamp: new Date().toISOString(),
                note: "Exempt period removed",
              },
              ...newLog,
            ].slice(0, 200);
          }
        });
      }

      const newExemptLogs = { ...state.exemptLogs };
      if (type) {
        newExemptLogs[dateStr] = type;
      } else {
        delete newExemptLogs[dateStr];
      }

      const newState = { exemptLogs: newExemptLogs, qdaCounts: newCounts, qdaLog: newLog };
      get()._persist({ ...state, ...newState });
      return newState;
    });
  },

  // Qada actions
  adjustQada: (prayer, delta, note = "") => {
    set((state) => {
      const current = state.qdaCounts[prayer] || 0;
      const newCount = Math.max(0, current + delta);
      const newCounts = { ...state.qdaCounts, [prayer]: newCount };
      const logEntry = {
        id: Date.now().toString(),
        prayer,
        change: delta,
        total: newCount,
        timestamp: new Date().toISOString(),
        note,
      };
      const newLog = [logEntry, ...state.qdaLog].slice(0, 200);
      const newState = { qdaCounts: newCounts, qdaLog: newLog };
      get()._persist({ ...state, ...newState });
      return newState;
    });
  },

  setQadaCount: (prayer, count) => {
    set((state) => {
      const current = state.qdaCounts[prayer] || 0;
      const delta = count - current;
      const newCounts = { ...state.qdaCounts, [prayer]: Math.max(0, count) };
      const logEntry = {
        id: Date.now().toString(),
        prayer,
        change: delta,
        total: Math.max(0, count),
        timestamp: new Date().toISOString(),
        note: "Manual entry",
      };
      const newLog = [logEntry, ...state.qdaLog].slice(0, 200);
      const newState = { qdaCounts: newCounts, qdaLog: newLog };
      get()._persist({ ...state, ...newState });
      return newState;
    });
  },

  setBulkQada: (prayer, years, months) => {
    const totalDays = Math.round(years * 365 + months * 30);
    get().setQadaCount(prayer, totalDays);
  },

  // Settings
  updateSettings: (partial) => {
    set((state) => {
      const newSettings = { ...state.settings, ...partial };
      const newState = { settings: newSettings };
      get()._persist({ ...state, ...newState });
      return newState;
    });
  },

  updateLocation: (location) => {
    set((state) => {
      const newSettings = {
        ...state.settings,
        location: { ...state.settings.location, ...location },
      };
      const newState = { settings: newSettings };
      get()._persist({ ...state, ...newState });
      return newState;
    });
  },

  // Persistence
  _persist: async (state) => {
    try {
      const data = {
        prayerLogs: state.prayerLogs,
        qdaCounts: state.qdaCounts,
        qdaLog: state.qdaLog,
        settings: state.settings,
        sunnahLogs: state.sunnahLogs,
        exemptLogs: state.exemptLogs,
      };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error("Rakah: Failed to persist store", e);
    }
  },

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        set({
          prayerLogs: data.prayerLogs || {},
          qdaCounts: { ...DEFAULT_QADA, ...(data.qdaCounts || {}) },
          qdaLog: data.qdaLog || [],
          settings: {
            ...DEFAULT_SETTINGS,
            ...(data.settings || {}),
            location: {
              ...DEFAULT_SETTINGS.location,
              ...(data.settings?.location || {}),
            },
          },
          sunnahLogs: data.sunnahLogs || {},
          exemptLogs: data.exemptLogs || {},
          isHydrated: true,
        });
      } else {
        set({ isHydrated: true });
      }
    } catch (e) {
      console.error("Rakah: Failed to hydrate store", e);
      set({ isHydrated: true });
    }
  },

  exportData: async () => {
    const state = get();
    return JSON.stringify(
      {
        prayerLogs: state.prayerLogs,
        qdaCounts: state.qdaCounts,
        qdaLog: state.qdaLog,
        settings: state.settings,
        sunnahLogs: state.sunnahLogs,
        exemptLogs: state.exemptLogs,
        exportedAt: new Date().toISOString(),
        version: 1,
      },
      null,
      2,
    );
  },

  importData: async (jsonStr) => {
    try {
      const data = JSON.parse(jsonStr);
      set({
        prayerLogs: data.prayerLogs || {},
        qdaCounts: { ...DEFAULT_QADA, ...(data.qdaCounts || {}) },
        qdaLog: data.qdaLog || [],
        settings: { ...DEFAULT_SETTINGS, ...(data.settings || {}) },
        sunnahLogs: data.sunnahLogs || {},
        exemptLogs: data.exemptLogs || {},
      });
      await get()._persist(get());
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },
}));

export default usePrayerStore;
export { PRAYER_NAMES };
