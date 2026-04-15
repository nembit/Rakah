import { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Pressable,
  Modal,
  Platform,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  FadeInDown,
  withSpring,
  withTiming,
  withSequence,
  withDelay,
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
} from "react-native-reanimated";
import {
  Settings,
  Flame,
  Clock,
  Check,
  X,
  Minus,
  ChevronLeft,
  ChevronRight,
} from "lucide-react-native";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import usePrayerStore from "@/store/prayerStore";
import { calculatePrayerTimes } from "@/utils/prayerTimes";
import {
  today,
  formatDisplayDate,
  subtractDays,
  addDays,
  formatRelativeDate,
  fromDateString,
} from "@/utils/dateUtils";

const { width: SCREEN_W } = Dimensions.get("window");

const C = {
  bg: "#0F1117",
  card: "#1A1D27",
  cardAlt: "#1E2232",
  accent: "#2ECC71",
  accentDim: "#1A7A43",
  gold: "#F59E0B",
  red: "#EF4444",
  teal: "#38BDF8",
  text: "#F9FAFB",
  textSec: "#9CA3AF",
  textDim: "#4B5563",
  border: "#252836",
};
const F = {
  reg: "PlusJakartaSans_400Regular",
  med: "PlusJakartaSans_500Medium",
  semi: "PlusJakartaSans_600SemiBold",
  bold: "PlusJakartaSans_700Bold",
  xbold: "PlusJakartaSans_800ExtraBold",
};

const STATUS_CONFIG = {
  pending: {
    label: "Pending",
    color: C.textDim,
    bg: "#1E2232",
    border: C.border,
  },
  "on-time": {
    label: "On Time",
    color: C.accent,
    bg: "#0D2E1A",
    border: C.accentDim,
  },
  late: { label: "Late", color: C.gold, bg: "#2A1F0A", border: "#7A5200" },
  missed: { label: "Missed", color: C.red, bg: "#2A0F0F", border: "#7A1F1F" },
};

const MILESTONES = {
  3: "Three days strong — keep going! 🌙",
  7: "A full week! You're building something beautiful. 💫",
  30: "30 days! MashaAllah — a true commitment. ✨",
};
const ENCOURAGEMENTS = [
  "Every prayer is a conversation with Allah.",
  "Small steps, consistent faith.",
  "Today's prayers shape tomorrow's character.",
  "You showed up. That matters. 🌿",
];

function getCurrentPrayerInfo(prayerTimes, nowDate = new Date()) {
  const order = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];
  const schedule = order
    .map((prayer) => ({ prayer, time: prayerTimes[prayer]?.time }))
    .filter((item) => item.time !== null && item.time !== undefined && !isNaN(item.time));

  if (!schedule.length) return null;

  const nowHours =
    nowDate.getHours() + nowDate.getMinutes() / 60 + nowDate.getSeconds() / 3600;

  let current = schedule[schedule.length - 1];
  for (const item of schedule) {
    if (nowHours >= item.time) {
      current = item;
    } else {
      break;
    }
  }

  const next = schedule.find((item) => item.time > nowHours) || schedule[0];

  const currentTimeValue = current.time;
  const nextTimeValue = next.time;
  const durationHours =
    nextTimeValue > currentTimeValue
      ? nextTimeValue - currentTimeValue
      : 24 - currentTimeValue + nextTimeValue;
  const elapsedHours =
    nowHours >= currentTimeValue
      ? nowHours - currentTimeValue
      : 24 - currentTimeValue + nowHours;
  const progressToNext =
    durationHours > 0
      ? Math.max(0, Math.min(1, elapsedHours / durationHours))
      : 0;
  const durationMinutes = Math.round(durationHours * 60);
  const elapsedMinutes = Math.round(elapsedHours * 60);
  const hoursLeftToNext = Math.max(0, durationHours - elapsedHours);
  const minutesLeftToNext = Math.round(hoursLeftToNext * 60);

  return {
    currentPrayer: current.prayer,
    currentTime: prayerTimes[current.prayer]?.formatted || "--:--",
    nextPrayer: next.prayer,
    nextTime: prayerTimes[next.prayer]?.formatted || "--:--",
    progressToNext,
    durationMinutes,
    elapsedMinutes,
    minutesLeftToNext,
  };
}

function getAutoPrayerStatus(currentPrayerInfo) {
  if (!currentPrayerInfo || !currentPrayerInfo.currentPrayer) return "on-time";

  const prayer = currentPrayerInfo.currentPrayer;
  const nowHours = currentPrayerInfo.nowHours;
  const prayerTimes = currentPrayerInfo.prayerTimes || {};

  if (typeof nowHours !== "number") return "on-time";

  const start = prayerTimes[prayer]?.time;
  if (typeof start !== "number") return "on-time";

  const getLateTrigger = () => {
    if (prayer === "Fajr") return prayerTimes.Sunrise?.time;
    if (prayer === "Dhuhr") return prayerTimes.Asr?.time;
    if (prayer === "Asr") return prayerTimes.Maghrib?.time;
    if (prayer === "Maghrib") {
      if (typeof prayerTimes.Isha?.time === "number") return prayerTimes.Isha.time;
      if (typeof prayerTimes.Sunset?.time === "number") return prayerTimes.Sunset.time + 1.25;
      return typeof prayerTimes.Maghrib?.time === "number"
        ? prayerTimes.Maghrib.time + 1.25
        : undefined;
    }
    if (prayer === "Isha") {
      const sunset =
        typeof prayerTimes.Sunset?.time === "number"
          ? prayerTimes.Sunset.time
          : prayerTimes.Maghrib?.time;
      const fajr = prayerTimes.Fajr?.time;
      if (typeof sunset !== "number" || typeof fajr !== "number") return undefined;
      const nextFajr = fajr <= sunset ? fajr + 24 : fajr;
      return sunset + (nextFajr - sunset) / 2;
    }
    return undefined;
  };

  const lateTrigger = getLateTrigger();
  if (typeof lateTrigger !== "number") return "on-time";

  let adjustedTrigger = lateTrigger;
  let adjustedNow = nowHours;

  if (adjustedTrigger < start) adjustedTrigger += 24;
  if (adjustedNow < start) adjustedNow += 24;

  return adjustedNow >= adjustedTrigger ? "late" : "on-time";
}

function formatMinutesLeft(totalMinutes) {
  const safeMinutes = Math.max(0, totalMinutes || 0);
  const hours = Math.floor(safeMinutes / 60);
  const mins = safeMinutes % 60;

  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

function StatusModal({ visible, onClose, prayer, onSelect, currentStatus }) {
  const options = [
    { key: "on-time", label: "Prayed on time", icon: Check, color: C.accent },
    { key: "late", label: "Prayed late", icon: Clock, color: C.gold },
    { key: "missed", label: "Missed", icon: X, color: C.red },
    { key: "pending", label: "Clear status", icon: Minus, color: C.textSec },
  ];
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.7)",
          justifyContent: "flex-end",
        }}
        onPress={onClose}
      >
        <Pressable onPress={(e) => e.stopPropagation()}>
          <View
            style={{
              backgroundColor: C.card,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 24,
              paddingBottom: 36,
            }}
          >
            <View
              style={{
                width: 36,
                height: 4,
                backgroundColor: C.border,
                borderRadius: 2,
                alignSelf: "center",
                marginBottom: 20,
              }}
            />
            <Text
              style={{
                fontFamily: F.semi,
                fontSize: 15,
                color: C.textSec,
                textAlign: "center",
                marginBottom: 20,
                letterSpacing: 0.5,
              }}
            >
              {prayer?.toUpperCase()}
            </Text>
            {options.map((opt) => {
              const Icon = opt.icon;
              const isActive = currentStatus === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  onPress={() => {
                    onSelect(opt.key);
                    onClose();
                  }}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 14,
                    backgroundColor: isActive
                      ? `${opt.color}18`
                      : "transparent",
                    borderWidth: 1,
                    borderColor: isActive ? `${opt.color}40` : "transparent",
                    borderRadius: 14,
                    padding: 16,
                    marginBottom: 10,
                  }}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: `${opt.color}20`,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Icon size={18} color={opt.color} strokeWidth={2} />
                  </View>
                  <Text
                    style={{
                      fontFamily: F.semi,
                      fontSize: 16,
                      color: opt.color,
                      flex: 1,
                    }}
                  >
                    {opt.label}
                  </Text>
                  {isActive && (
                    <View
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: opt.color,
                      }}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function PrayerCard({ prayer, time, status, onTap, onLongPress, index }) {
  const sc = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const scale = useSharedValue(1);
  const shakeX = useSharedValue(0);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateX: shakeX.value }],
  }));

  const handlePress = () => {
    scale.value = withSequence(
      withTiming(0.97, { duration: 60 }),
      withTiming(1, { duration: 100 }),
    );
    if (Platform.OS !== "web")
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onTap();
  };

  const handleLongPress = () => {
    if (Platform.OS !== "web")
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onLongPress();
  };

  useEffect(() => {
    if (status === "missed") {
      shakeX.value = withSequence(
        withTiming(-5, { duration: 50 }),
        withTiming(5, { duration: 50 }),
        withTiming(-3, { duration: 50 }),
        withTiming(3, { duration: 50 }),
        withTiming(0, { duration: 50 }),
      );
    }
  }, [status]);

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 60).duration(200)}
      style={animStyle}
    >
      <TouchableOpacity
        onPress={handlePress}
        onLongPress={handleLongPress}
        activeOpacity={0.8}
        style={{
          backgroundColor: sc.bg,
          borderRadius: 18,
          borderWidth: 1,
          borderColor: sc.border,
          borderLeftWidth: 3,
          borderLeftColor: sc.color,
          padding: 18,
          marginBottom: 12,
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontFamily: F.bold,
              fontSize: 19,
              color: C.text,
              marginBottom: 3,
            }}
          >
            {prayer}
          </Text>
          <Text style={{ fontFamily: F.med, fontSize: 13, color: C.textSec }}>
            {time}
          </Text>
        </View>
        <View
          style={{
            paddingHorizontal: 14,
            paddingVertical: 7,
            backgroundColor: `${sc.color}18`,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: `${sc.color}35`,
          }}
        >
          <Text style={{ fontFamily: F.semi, fontSize: 12, color: sc.color }}>
            {sc.label}
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { setPrayerStatus, getDayLog, settings, getStreak, adjustQada } =
    usePrayerStore();
  const prayerLogs = usePrayerStore((s) => s.prayerLogs);

  const [selectedDate, setSelectedDate] = useState(today());
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPrayer, setSelectedPrayer] = useState(null);
  const [times, setTimes] = useState({});
  const [message, setMessage] = useState("");
  const [nowTick, setNowTick] = useState(Date.now());

  const streak = getStreak();
  const dayLog = getDayLog(selectedDate);
  const isToday = selectedDate === today();

  useEffect(() => {
    const { latitude, longitude, timezone, calcMethod } = {
      ...settings.location,
      calcMethod: settings.calcMethod,
    };
    const date = fromDateString(selectedDate);
    try {
      const t = calculatePrayerTimes(
        date,
        latitude,
        longitude,
        timezone,
        settings.calcMethod,
      );
      setTimes(t);
    } catch (e) {
      console.error("Prayer times error:", e);
    }
  }, [selectedDate, settings]);

  useEffect(() => {
    if (MILESTONES[streak]) {
      setMessage(MILESTONES[streak]);
    } else {
      setMessage(
        ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)],
      );
    }
  }, [streak]);

  useEffect(() => {
    if (!isToday) return;
    const id = setInterval(() => setNowTick(Date.now()), 30000);
    return () => clearInterval(id);
  }, [isToday]);

  const prayers = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];

  const openModal = (prayer) => {
    setSelectedPrayer(prayer);
    setModalVisible(true);
  };

  const handlePrayerTap = (prayer) => {
    const currentStatus = dayLog[prayer] || "pending";
    // If pending, mark as on-time directly
    if (currentStatus === "pending") {
      setPrayerStatus(selectedDate, prayer, "on-time");
    } else {
      // Otherwise open modal for other options
      openModal(prayer);
    }
  };

  const handlePrayerLongPress = (prayer) => {
    openModal(prayer);
  };

  const handleSelect = (status) => {
    if (selectedPrayer) {
      const previousStatus = dayLog[selectedPrayer] || "pending";
      setPrayerStatus(selectedDate, selectedPrayer, status);

      // If marking as missed, automatically increment Qada counter
      if (status === "missed" && previousStatus !== "missed") {
        adjustQada(selectedPrayer, 1, `Missed on ${selectedDate}`);
      }
      // If changing from missed to something else, decrement Qada counter
      if (previousStatus === "missed" && status !== "missed") {
        adjustQada(
          selectedPrayer,
          -1,
          `Changed from missed on ${selectedDate}`,
        );
      }
    }
  };

  const goBack = () => {
    const prev = subtractDays(selectedDate, 1);
    const limit = subtractDays(today(), 30);
    if (prev >= limit) setSelectedDate(prev);
  };

  const goForward = () => {
    if (selectedDate < today()) setSelectedDate(addDays(selectedDate, 1));
  };

  const completedCount = prayers.filter((p) => {
    const s = dayLog[p];
    return s === "on-time" || s === "late";
  }).length;
  const currentPrayerInfo = isToday
    ? getCurrentPrayerInfo(times, new Date(nowTick))
    : null;
  const currentPrayerStatus = currentPrayerInfo
    ? dayLog[currentPrayerInfo.currentPrayer] || "pending"
    : "pending";
  const currentPrayerStyle = STATUS_CONFIG[currentPrayerStatus] || STATUS_CONFIG.pending;
  const isCurrentPrayerPrayed =
    currentPrayerStatus === "on-time" || currentPrayerStatus === "late";

  const handleSetCurrentPrayed = () => {
    if (!currentPrayerInfo) return;
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    const now = new Date(nowTick);
    const nowHours =
      now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
    const autoStatus = getAutoPrayerStatus({
      ...currentPrayerInfo,
      nowHours,
      prayerTimes: times,
    });
    setPrayerStatus(selectedDate, currentPrayerInfo.currentPrayer, autoStatus);
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        prayer={selectedPrayer}
        onSelect={handleSelect}
        currentStatus={
          selectedPrayer ? dayLog[selectedPrayer] || "pending" : "pending"
        }
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 90 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View
          style={{
            paddingTop: insets.top + 12,
            paddingHorizontal: 20,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 20,
          }}
        >
          <View>
            <Text
              style={{
                fontFamily: F.xbold,
                fontSize: 28,
                color: C.text,
                letterSpacing: -0.5,
              }}
            >
              Rakah
            </Text>
            <Text
              style={{
                fontFamily: F.med,
                fontSize: 13,
                color: C.textSec,
                marginTop: 2,
              }}
            >
              {formatRelativeDate(selectedDate) === "Today"
                ? formatDisplayDate(selectedDate)
                : formatRelativeDate(selectedDate)}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push("/settings")}
            style={{
              width: 42,
              height: 42,
              borderRadius: 21,
              backgroundColor: C.card,
              borderWidth: 1,
              borderColor: C.border,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Settings size={18} color={C.textSec} strokeWidth={1.8} />
          </TouchableOpacity>
        </View>

        {/* Current Prayer */}
        {isToday && currentPrayerInfo && (
          <Animated.View
            entering={FadeInDown.delay(30)}
            style={{ paddingHorizontal: 20, marginBottom: 12 }}
          >
            <View
              style={{
                backgroundColor: C.card,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: C.border,
                borderLeftWidth: 3,
                borderLeftColor: currentPrayerStyle.color,
                padding: 16,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 8,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text style={{ fontFamily: F.semi, fontSize: 12, color: C.textSec }}>
                    CURRENT PRAYER
                  </Text>
                </View>
                <View
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    backgroundColor: `${currentPrayerStyle.color}18`,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: `${currentPrayerStyle.color}35`,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: F.semi,
                      fontSize: 11,
                      color: currentPrayerStyle.color,
                    }}
                  >
                    {currentPrayerStyle.label}
                  </Text>
                </View>
              </View>

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                }}
              >
                <Text style={{ fontFamily: F.xbold, fontSize: 24, color: C.text }}>
                  {currentPrayerInfo.currentPrayer}
                </Text>
                <Text style={{ fontFamily: F.bold, fontSize: 16, color: C.text }}>
                  {currentPrayerInfo.currentTime}
                </Text>
              </View>

              <Text
                style={{
                  fontFamily: F.reg,
                  fontSize: 12,
                  color: C.textSec,
                  marginTop: 6,
                }}
              >
                Next: {currentPrayerInfo.nextPrayer} at {currentPrayerInfo.nextTime}
              </Text>

              <View style={{ marginTop: 10 }}>
                <View
                  style={{
                    height: 8,
                    borderRadius: 999,
                    backgroundColor: C.cardAlt,
                    borderWidth: 1,
                    borderColor: C.border,
                    overflow: "hidden",
                  }}
                >
                  <View
                    style={{
                      height: "100%",
                      width: `${Math.round(currentPrayerInfo.progressToNext * 100)}%`,
                      backgroundColor: C.accent,
                    }}
                  />
                </View>
                <View
                  style={{
                    marginTop: 8,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 5,
                      flexShrink: 1,
                    }}
                  >
                    <Clock size={13} color={C.textSec} strokeWidth={2} />
                    <Text
                      style={{
                        fontFamily: F.reg,
                        fontSize: 11,
                        color: C.textSec,
                        flexShrink: 1,
                      }}
                    >
                      {formatMinutesLeft(currentPrayerInfo.minutesLeftToNext)} until {currentPrayerInfo.nextPrayer}
                    </Text>
                  </View>
                  <Text
                    style={{
                      fontFamily: F.reg,
                      fontSize: 11,
                      color: C.textSec,
                      textAlign: "right",
                    }}
                  >
                    {Math.round(currentPrayerInfo.progressToNext * 100)}% elapsed
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={handleSetCurrentPrayed}
                disabled={isCurrentPrayerPrayed}
                style={{
                  marginTop: 12,
                  paddingVertical: 10,
                  borderRadius: 12,
                  alignItems: "center",
                  backgroundColor: isCurrentPrayerPrayed ? C.cardAlt : C.accent,
                  borderWidth: 1,
                  borderColor: isCurrentPrayerPrayed ? C.border : C.accentDim,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Check
                    size={14}
                    color={isCurrentPrayerPrayed ? C.textSec : "#0F1117"}
                    strokeWidth={2.4}
                  />
                  <Text
                    style={{
                      fontFamily: F.semi,
                      fontSize: 13,
                      color: isCurrentPrayerPrayed ? C.textSec : "#0F1117",
                    }}
                  >
                    Marked as prayed
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}

        {/* Streak & Message */}
        {isToday && (
          <Animated.View
            entering={FadeInDown.delay(50)}
            style={{ paddingHorizontal: 20, marginBottom: 20 }}
          >
            <View
              style={{
                backgroundColor: C.card,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: C.border,
                padding: 18,
                flexDirection: "row",
                alignItems: "center",
                gap: 14,
              }}
            >
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: "#2A1F0A",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Flame size={22} color={C.gold} strokeWidth={1.8} />
              </View>
              <View style={{ flex: 1 }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "baseline",
                    gap: 6,
                  }}
                >
                  <Text
                    style={{ fontFamily: F.xbold, fontSize: 28, color: C.gold }}
                  >
                    {streak}
                  </Text>
                  <Text
                    style={{
                      fontFamily: F.med,
                      fontSize: 14,
                      color: C.textSec,
                    }}
                  >
                    day streak
                  </Text>
                </View>
                <Text
                  style={{
                    fontFamily: F.reg,
                    fontSize: 12,
                    color: C.textSec,
                    marginTop: 2,
                  }}
                  numberOfLines={1}
                >
                  {message}
                </Text>
              </View>
              <View
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  backgroundColor: `${C.accent}15`,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: `${C.accent}30`,
                }}
              >
                <Text
                  style={{ fontFamily: F.semi, fontSize: 13, color: C.accent }}
                >
                  {completedCount}/5
                </Text>
              </View>
            </View>
          </Animated.View>
        )}

        {/* Date Navigator */}
        <View
          style={{
            paddingHorizontal: 20,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <TouchableOpacity
            onPress={goBack}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: C.card,
              borderWidth: 1,
              borderColor: C.border,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ChevronLeft size={16} color={C.textSec} strokeWidth={2} />
          </TouchableOpacity>
          <Text style={{ fontFamily: F.semi, fontSize: 14, color: C.text }}>
            {isToday ? "Today" : formatRelativeDate(selectedDate)}
          </Text>
          <TouchableOpacity
            onPress={goForward}
            disabled={isToday}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: isToday ? "transparent" : C.card,
              borderWidth: 1,
              borderColor: isToday ? "transparent" : C.border,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ChevronRight
              size={16}
              color={isToday ? C.textDim : C.textSec}
              strokeWidth={2}
            />
          </TouchableOpacity>
        </View>

        {/* Prayer Cards */}
        <View style={{ paddingHorizontal: 20 }}>
          {prayers.map((prayer, i) => (
            <PrayerCard
              key={prayer}
              prayer={prayer}
              time={times[prayer]?.formatted || "--:--"}
              status={dayLog[prayer] || "pending"}
              onTap={() => handlePrayerTap(prayer)}
              onLongPress={() => handlePrayerLongPress(prayer)}
              index={i}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
