import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { today, subtractDays, toDateString } from "../utils/dateUtils";
import { PRAYER_NAMES } from "../utils/prayerTimes";

const STORAGE_KEY = "rakah-v1";

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
    Fajr: true,
    Dhuhr: true,
    Asr: true,
    Maghrib: true,
    Isha: true,
  },
  sunnahTracking: false,
};

const DEFAULT_QADA = { Fajr: 0, Dhuhr: 0, Asr: 0, Maghrib: 0, Isha: 0 };

function computeStreak(prayerLogs) {
  let streak = 0;
  let d = today();
  const todayLog = prayerLogs[d] || {};
  const todayDone = PRAYER_NAMES.every((p) => {
    const s = todayLog[p];
    return s === "on-time" || s === "late";
  });
  if (!todayDone) {
    d = subtractDays(d, 1);
  }
  for (let i = 0; i < 365; i++) {
    const log = prayerLogs[d] || {};
    const allDone = PRAYER_NAMES.every((p) => {
      const s = log[p];
      return s === "on-time" || s === "late";
    });
    if (!allDone) break;
    streak++;
    d = subtractDays(d, 1);
  }
  return streak;
}

function computeBestStreak(prayerLogs) {
  const dates = Object.keys(prayerLogs).sort();
  let best = 0;
  let current = 0;
  for (const d of dates) {
    const log = prayerLogs[d] || {};
    const allDone = PRAYER_NAMES.every((p) => {
      const s = log[p];
      return s === "on-time" || s === "late";
    });
    if (allDone) {
      current++;
      if (current > best) best = current;
    } else {
      current = 0;
    }
  }
  return best;
}

function computeWeeklyConsistency(prayerLogs) {
  let prayed = 0;
  let total = 0;
  const t = new Date();
  const dayOfWeek = t.getDay();
  for (let i = 0; i <= dayOfWeek; i++) {
    const d = new Date(t);
    d.setDate(t.getDate() - i);
    const dateStr = toDateString(d);
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

function computeStats(prayerLogs) {
  const missCount = { Fajr: 0, Dhuhr: 0, Asr: 0, Maghrib: 0, Isha: 0 };
  const onTimeCount = { Fajr: 0, Dhuhr: 0, Asr: 0, Maghrib: 0, Isha: 0 };
  let totalLogged = 0;
  let totalOnTime = 0;

  for (const dateStr of Object.keys(prayerLogs)) {
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

  const mostMissed =
    Object.entries(missCount).sort(([, a], [, b]) => b - a)[0]?.[0] || "N/A";
  const bestPrayer =
    Object.entries(onTimeCount).sort(([, a], [, b]) => b - a)[0]?.[0] || "N/A";
  const overallConsistency =
    totalLogged > 0 ? Math.round((totalOnTime / totalLogged) * 100) : 0;

  return { mostMissed, bestPrayer, overallConsistency };
}

const usePrayerStore = create((set, get) => ({
  // State
  prayerLogs: {}, // { [dateStr]: { [prayer]: 'pending'|'on-time'|'late'|'missed' } }
  qdaCounts: { ...DEFAULT_QADA },
  qdaLog: [], // [{ prayer, change, total, timestamp }]
  settings: { ...DEFAULT_SETTINGS },
  isHydrated: false,

  // Derived (computed on demand)
  getStreak: () => computeStreak(get().prayerLogs),
  getBestStreak: () => computeBestStreak(get().prayerLogs),
  getWeeklyConsistency: () => computeWeeklyConsistency(get().prayerLogs),
  getStats: () => computeStats(get().prayerLogs),

  getDayLog: (dateStr) => {
    const logs = get().prayerLogs;
    return logs[dateStr] || {};
  },

  // Prayer status actions
  setPrayerStatus: (dateStr, prayer, status) => {
    set((state) => {
      const newLogs = {
        ...state.prayerLogs,
        [dateStr]: {
          ...(state.prayerLogs[dateStr] || {}),
          [prayer]: status,
        },
      };

      // Auto-increment Qada when marking as missed
      let newCounts = state.qdaCounts;
      let newLog = state.qdaLog;
      if (status === "missed") {
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
        ...(status === "missed"
          ? { qdaCounts: newCounts, qdaLog: newLog }
          : {}),
      };
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
