import { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Pressable,
  TextInput,
  Modal,
  Platform,
  Dimensions,
  Alert,
  Linking,
  Share,
  PanResponder,
  Animated as RNAnimated,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  FadeInDown,
  withSpring,
  withTiming,
  withSequence,
  withDelay,
  useSharedValue,
  useAnimatedStyle,
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
  MapPin,
  Sunrise,
  Sun,
  CloudSun,
  Sunset,
  Moon,
  Heart,
  Sparkles,
  Star,
} from "lucide-react-native";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import * as StoreReview from "expo-store-review";
import usePrayerStore, { SUNNAH_CONFIG } from "@/store/prayerStore";
import { calculatePrayerTimes } from "@/utils/prayerTimes";
import { schedulePrayerNotifications } from "@/utils/prayerNotifications";
import {
  today,
  formatDisplayDate,
  subtractDays,
  addDays,
  formatRelativeDate,
  fromDateString,
  formatHijriDate,
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
  violet: "#8B5CF6",
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
  pending: { label: "Pending", color: C.textDim, bg: "#1E2232", border: C.border },
  "on-time": { label: "On Time", color: C.accent, bg: "#0D2E1A", border: C.accentDim },
  late: { label: "Late", color: C.gold, bg: "#2A1F0A", border: "#7A5200" },
  missed: { label: "Missed", color: C.red, bg: "#2A0F0F", border: "#7A1F1F" },
  exempt: { label: "Exempt", color: C.violet, bg: "#1A1030", border: "#4C2D8A" },
};

const MILESTONES = {
  3: "Three days strong — keep going! 🌙",
  7: "A full week! You're building something beautiful. 💫",
  30: "30 days! Mashallah — a true commitment. ✨",
};
const FEEDBACK_EMAIL = "support@rakah.app";

const PRAYER_ICON_CONFIG = {
  Fajr: { icon: Sunrise, color: "#7DD3FC" },
  Morning: { icon: Sun, color: "#FDE047" },
  Dhuhr: { icon: Sun, color: "#FDE047" },
  Asr: { icon: CloudSun, color: "#FBBF24" },
  Maghrib: { icon: Sunset, color: "#FB923C" },
  Isha: { icon: Moon, color: "#A5B4FC" },
};

const PRAYER_BANNER_IMAGES = {
  Fajr: require("../../../assets/images/prayers/Fajr.png"),
  Morning: require("../../../assets/images/prayers/Morning.png"),
  Dhuhr: require("../../../assets/images/prayers/Dhuhr.png"),
  Asr: require("../../../assets/images/prayers/Asr.png"),
  Maghrib: require("../../../assets/images/prayers/Maghrib.png"),
  Isha: require("../../../assets/images/prayers/Isha.png"),
};

function getBannerKeyForNow(prayerTimes, fallbackPrayer, nowDate = new Date()) {
  const nowHours =
    nowDate.getHours() + nowDate.getMinutes() / 60 + nowDate.getSeconds() / 3600;
  const sunrise = prayerTimes?.Sunrise?.time;
  const dhuhr = prayerTimes?.Dhuhr?.time;

  if (typeof sunrise === "number" && typeof dhuhr === "number") {
    if (nowHours >= sunrise && nowHours < dhuhr) return "Morning";
  }
  return fallbackPrayer;
}

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

function PrayerHorizonVisual({ prayer }) {
  const accent = (PRAYER_ICON_CONFIG[prayer] || PRAYER_ICON_CONFIG.Fajr).color;
  const source = PRAYER_BANNER_IMAGES[prayer] || PRAYER_BANNER_IMAGES.Fajr;
  const bannerHeight = Math.round(SCREEN_W / 3);

  return (
    <View
      style={{
        marginBottom: 12,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: `${accent}38`,
        height: bannerHeight,
        overflow: "hidden",
        backgroundColor: "#111826",
      }}
    >
      <Image
        source={source}
        contentFit="cover"
        contentPosition="bottom"
        style={{ width: "100%", height: "100%", borderRadius: 13 }}
      />
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(8, 12, 20, 0.08)",
          borderRadius: 13,
        }}
      />
    </View>
  );
}

function StatusModal({ visible, onClose, prayer, onSelect, currentStatus }) {
  const dragY = useRef(new RNAnimated.Value(0)).current;
  const dragStartYRef = useRef(0);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    if (visible) dragY.setValue(0);
  }, [visible]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dy) > 2,
      onPanResponderGrant: () => {
        isDraggingRef.current = true;
        dragY.stopAnimation((value) => {
          dragStartYRef.current = value;
        });
      },
      onPanResponderMove: (_, gestureState) => {
        const next = dragStartYRef.current + gestureState.dy;
        dragY.setValue(Math.max(0, next));
      },
      onPanResponderRelease: (_, gestureState) => {
        const shouldClose = gestureState.dy > 80 || gestureState.vy > 0.9;
        if (shouldClose) {
          RNAnimated.timing(dragY, {
            toValue: 420,
            duration: 180,
            useNativeDriver: true,
          }).start(({ finished }) => {
            if (finished) onClose();
          });
        } else {
          RNAnimated.spring(dragY, {
            toValue: 0,
            damping: 18,
            stiffness: 220,
            useNativeDriver: true,
          }).start();
        }
        setTimeout(() => {
          isDraggingRef.current = false;
        }, 40);
      },
      onPanResponderTerminate: () => {
        RNAnimated.spring(dragY, {
          toValue: 0,
          damping: 18,
          stiffness: 220,
          useNativeDriver: true,
        }).start();
        setTimeout(() => {
          isDraggingRef.current = false;
        }, 40);
      },
      onPanResponderTerminationRequest: () => false,
    }),
  ).current;

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
        onPress={() => {
          if (isDraggingRef.current) return;
          onClose();
        }}
      >
        <View>
          <RNAnimated.View
            style={[
              {
                backgroundColor: C.card,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                padding: 24,
                paddingBottom: 14,
              },
              { transform: [{ translateY: dragY }] },
            ]}
          >
            <View
              {...panResponder.panHandlers}
              style={{
                paddingVertical: 8,
                marginTop: -8,
                marginBottom: 12,
                alignItems: "center",
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 4,
                  backgroundColor: C.border,
                  borderRadius: 2,
                }}
              />
            </View>
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
          </RNAnimated.View>
        </View>
      </Pressable>
    </Modal>
  );
}

function SupportModal({ visible, onClose, onSelectTier, supportTiers }) {
  const dragY = useRef(new RNAnimated.Value(0)).current;
  const dragStartYRef = useRef(0);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    if (visible) dragY.setValue(0);
  }, [visible]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dy) > 2,
      onPanResponderGrant: () => {
        isDraggingRef.current = true;
        dragY.stopAnimation((value) => {
          dragStartYRef.current = value;
        });
      },
      onPanResponderMove: (_, gestureState) => {
        const next = dragStartYRef.current + gestureState.dy;
        dragY.setValue(Math.max(0, next));
      },
      onPanResponderRelease: (_, gestureState) => {
        const shouldClose = gestureState.dy > 80 || gestureState.vy > 0.9;
        if (shouldClose) {
          RNAnimated.timing(dragY, {
            toValue: 420,
            duration: 180,
            useNativeDriver: true,
          }).start(({ finished }) => {
            if (finished) onClose();
          });
        } else {
          RNAnimated.spring(dragY, {
            toValue: 0,
            damping: 18,
            stiffness: 220,
            useNativeDriver: true,
          }).start();
        }
        setTimeout(() => {
          isDraggingRef.current = false;
        }, 40);
      },
      onPanResponderTerminate: () => {
        RNAnimated.spring(dragY, {
          toValue: 0,
          damping: 18,
          stiffness: 220,
          useNativeDriver: true,
        }).start();
        setTimeout(() => {
          isDraggingRef.current = false;
        }, 40);
      },
      onPanResponderTerminationRequest: () => false,
    }),
  ).current;

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
        onPress={() => {
          if (isDraggingRef.current) return;
          onClose();
        }}
      >
        <View>
          <RNAnimated.View
            style={[
              {
                backgroundColor: C.card,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                padding: 24,
                paddingBottom: 36,
              },
              { transform: [{ translateY: dragY }] },
            ]}
          >
            <View
              {...panResponder.panHandlers}
              style={{
                paddingVertical: 8,
                marginTop: -8,
                marginBottom: 12,
                alignItems: "center",
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 4,
                  backgroundColor: C.border,
                  borderRadius: 2,
                }}
              />
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Sparkles size={16} color={C.gold} strokeWidth={2} />
              <Text style={{ fontFamily: F.bold, fontSize: 20, color: C.text }}>
                Keep Rakah free for the Ummah
              </Text>
            </View>
            <Text
              style={{
                fontFamily: F.reg,
                fontSize: 13,
                color: C.textSec,
                lineHeight: 20,
                marginTop: 8,
                marginBottom: 16,
              }}
            >
              Rakah is a free app with no ads and no data collection. If it helps your prayer,
              consider supporting us — it keeps the app alive and free for everyone.
            </Text>

            <ScrollView
              style={{ flexGrow: 0 }}
              contentContainerStyle={{ paddingBottom: 0 }}
              showsVerticalScrollIndicator={false}
            >
              {supportTiers.map((tier) => (
                <TouchableOpacity
                  key={tier.key}
                  onPress={onSelectTier}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    padding: 15,
                    backgroundColor: C.cardAlt,
                    borderRadius: 14,
                    marginBottom: 10,
                    borderWidth: 1,
                    borderColor: C.border,
                  }}
                >
                  <View
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 17,
                      backgroundColor: `${C.accent}18`,
                      borderWidth: 1,
                      borderColor: `${C.accent}35`,
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 10,
                    }}
                  >
                    {tier.key === "monthly" ? (
                      <Clock size={15} color={C.accent} strokeWidth={2} />
                    ) : tier.key === "lifetime" ? (
                      <Sparkles size={15} color={C.accent} strokeWidth={2} />
                    ) : tier.key === "custom" ? (
                      <Minus size={15} color={C.accent} strokeWidth={2} />
                    ) : (
                      <Heart size={15} color={C.accent} strokeWidth={2} />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: F.semi, fontSize: 15, color: C.text }}>
                      {tier.label}
                    </Text>
                    <Text
                      style={{
                        fontFamily: F.reg,
                        fontSize: 12,
                        color: C.textSec,
                        marginTop: 2,
                      }}
                    >
                      {tier.desc}
                    </Text>
                  </View>
                  <View
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 7,
                      backgroundColor: `${C.accent}18`,
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: `${C.accent}35`,
                    }}
                  >
                    <Text style={{ fontFamily: F.bold, fontSize: 12, color: C.accent }}>
                      {tier.price}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                onPress={onClose}
                style={{
                  marginTop: 4,
                  alignItems: "center",
                  justifyContent: "center",
                  paddingVertical: 12,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: C.border,
                  backgroundColor: "transparent",
                }}
              >
                <Text style={{ fontFamily: F.semi, fontSize: 13, color: C.textSec }}>
                  Not now
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </RNAnimated.View>
        </View>
      </Pressable>
    </Modal>
  );
}

function ReviewFunnelModal({
  visible,
  rating,
  feedbackText,
  onSetRating,
  onChangeFeedback,
  onHighRatingSelect,
  onClose,
  onSubmit,
}) {
  const isLowRating = rating > 0 && rating <= 3;
  const canSubmit = rating >= 1 && (!isLowRating || feedbackText.trim().length > 0);
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
          backgroundColor: "rgba(0,0,0,0.72)",
          justifyContent: "center",
          paddingHorizontal: 24,
        }}
        onPress={onClose}
      >
        <Pressable onPress={(e) => e.stopPropagation()}>
          <View
            style={{
              backgroundColor: C.card,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: C.border,
              padding: 20,
            }}
          >
            <Text style={{ fontFamily: F.bold, fontSize: 18, color: C.text, textAlign: "center" }}>
              How would you rate Rakah?
            </Text>
            <Text
              style={{
                fontFamily: F.reg,
                fontSize: 12,
                color: C.textSec,
                marginTop: 8,
                textAlign: "center",
              }}
            >
              Your feedback helps us improve and serve better.
            </Text>

            <View style={{ flexDirection: "row", justifyContent: "center", gap: 10, marginTop: 16 }}>
              {[1, 2, 3, 4, 5].map((n) => {
                const active = rating >= n;
                return (
                  <TouchableOpacity
                    key={n}
                    onPress={() => {
                      onSetRating(n);
                      if (n >= 4) onHighRatingSelect(n);
                    }}
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 19,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: active ? `${C.gold}18` : C.cardAlt,
                      borderWidth: 1,
                      borderColor: active ? `${C.gold}45` : C.border,
                    }}
                  >
                    <Star
                      size={18}
                      color={active ? C.gold : C.textDim}
                      fill={active ? C.gold : "none"}
                      strokeWidth={1.9}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>

            {isLowRating && (
              <View style={{ marginTop: 14 }}>
                <Text
                  style={{
                    fontFamily: F.semi,
                    fontSize: 12,
                    color: C.textSec,
                    marginBottom: 8,
                  }}
                >
                  What can we improve?
                </Text>
                <TextInput
                  value={feedbackText}
                  onChangeText={onChangeFeedback}
                  placeholder="Tell us what you didn't like or what to improve"
                  placeholderTextColor={C.textDim}
                  multiline
                  textAlignVertical="top"
                  style={{
                    minHeight: 92,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: C.border,
                    backgroundColor: C.cardAlt,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    color: C.text,
                    fontFamily: F.reg,
                    fontSize: 13,
                  }}
                />
              </View>
            )}

            <TouchableOpacity
              onPress={onSubmit}
              disabled={!canSubmit}
              style={{
                marginTop: 18,
                paddingVertical: 11,
                borderRadius: 12,
                alignItems: "center",
                backgroundColor: canSubmit ? C.accent : C.cardAlt,
                borderWidth: 1,
                borderColor: canSubmit ? C.accentDim : C.border,
              }}
            >
              <Text
                style={{
                  fontFamily: F.semi,
                  fontSize: 13,
                  color: canSubmit ? "#0F1117" : C.textDim,
                }}
              >
                {isLowRating ? "Submit" : "Continue"}
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function PrayerCard({
  prayer, time, status, onTap, onLongPress, index,
  sunnahItems, sunnahLog, onSunnahToggle, isExempt, vibrationsEnabled,
}) {
  const sc = isExempt ? STATUS_CONFIG.exempt : (STATUS_CONFIG[status] || STATUS_CONFIG.pending);
  const prayerIcon = PRAYER_ICON_CONFIG[prayer] || { icon: Clock, color: C.textSec };
  const PrayerIcon = prayerIcon.icon;
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
    if (Platform.OS !== "web" && vibrationsEnabled)
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onTap();
  };

  const handleLongPress = () => {
    if (Platform.OS !== "web" && vibrationsEnabled)
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

  const hasSunnah = sunnahItems && sunnahItems.length > 0;

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 60).duration(200)}
      style={[animStyle, { marginBottom: 12 }]}
    >
      <View
        style={{
          backgroundColor: sc.bg,
          borderRadius: 18,
          borderWidth: 1,
          borderColor: sc.border,
          borderLeftWidth: 3,
          borderLeftColor: sc.color,
          overflow: "hidden",
        }}
      >
        {/* Fard prayer row */}
        <TouchableOpacity
          onPress={isExempt ? undefined : handlePress}
          onLongPress={isExempt ? undefined : handleLongPress}
          activeOpacity={isExempt ? 1 : 0.8}
          style={{
            padding: 18,
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: `${prayerIcon.color}20`,
              borderWidth: 1,
              borderColor: `${prayerIcon.color}40`,
              alignItems: "center",
              justifyContent: "center",
              marginRight: 12,
            }}
          >
            <PrayerIcon size={18} color={prayerIcon.color} strokeWidth={2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: F.bold, fontSize: 19, color: C.text, marginBottom: 3 }}>
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

        {/* Sunnah section */}
        {hasSunnah && !isExempt && (
          <View
            style={{
              borderTopWidth: 1,
              borderTopColor: `${C.border}`,
              paddingHorizontal: 18,
              paddingVertical: 10,
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 8,
              alignItems: "center",
            }}
          >
            {sunnahItems.map(({ key, label }) => {
              const prayed = sunnahLog?.[key] === "prayed";
              return (
                <TouchableOpacity
                  key={key}
                  onPress={() => onSunnahToggle(key, prayed ? null : "prayed")}
                  activeOpacity={0.7}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 5,
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 999,
                    backgroundColor: prayed ? `${C.accent}18` : C.cardAlt,
                    borderWidth: 1,
                    borderColor: prayed ? `${C.accent}40` : C.border,
                  }}
                >
                  {prayed && <Check size={10} color={C.accent} strokeWidth={3} />}
                  <Text style={{ fontFamily: F.semi, fontSize: 11, color: prayed ? C.accent : C.textSec }}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>
    </Animated.View>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const {
    setPrayerStatus, getDayLog, settings, getStreak, adjustQada,
    getDaySunnahLog, setSunnahStatus, getExemptDay, setExemptDay,
  } = usePrayerStore();
  const prayerLogs = usePrayerStore((s) => s.prayerLogs);

  const [selectedDate, setSelectedDate] = useState(today());
  const [modalVisible, setModalVisible] = useState(false);
  const [supportModalVisible, setSupportModalVisible] = useState(false);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewFeedback, setReviewFeedback] = useState("");
  const [selectedPrayer, setSelectedPrayer] = useState(null);
  const [times, setTimes] = useState({});
  const [message, setMessage] = useState("");
  const [nowTick, setNowTick] = useState(Date.now());
  const SUPPORT_TIERS = [
    { key: "one-time", label: "One-time gift", price: "$2.99", desc: "Buy us a coffee" },
    { key: "monthly", label: "Monthly supporter", price: "$0.99/mo", desc: "Keep the lights on" },
    { key: "lifetime", label: "Lifetime supporter", price: "$9.99", desc: "Forever grateful" },
    { key: "custom", label: "Custom amount", price: "Choose", desc: "Pick your own support amount" },
  ];

  const streak = getStreak();
  const dayLog = getDayLog(selectedDate);
  const isToday = selectedDate === today();

  useEffect(() => {
    const { latitude, longitude, timezone } = settings.location;
    const date = fromDateString(selectedDate);
    try {
      const t = calculatePrayerTimes(
        date,
        latitude,
        longitude,
        timezone,
        settings.calcMethod,
        !!settings.use24HourTime,
      );
      setTimes(t);
    } catch (e) {
      console.error("Prayer times error:", e);
    }
  }, [selectedDate, settings]);

  // Schedule prayer notifications for today + tomorrow whenever
  // today's times are freshly computed or notification preferences change.
  useEffect(() => {
    if (!isToday || Object.keys(times).length === 0) return;
    const notifSettings = settings.notifications;
    if (!notifSettings || !Object.values(notifSettings).some(Boolean)) return;

    const { latitude, longitude, timezone } = settings.location;
    const todayDate = fromDateString(today());
    const tomorrowDate = new Date(todayDate);
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);

    let tomorrowTimes = {};
    try {
      tomorrowTimes = calculatePrayerTimes(
        tomorrowDate,
        latitude,
        longitude,
        timezone,
        settings.calcMethod,
        !!settings.use24HourTime,
      );
    } catch {
      // skip tomorrow if calculation fails
    }

    schedulePrayerNotifications(
      times, tomorrowTimes, notifSettings, todayDate, tomorrowDate,
    ).catch(() => {});
  }, [times, settings.notifications, isToday]);

  useEffect(() => {
    if (MILESTONES[streak]) {
      setMessage(MILESTONES[streak]);
    } else {
      setMessage("");
    }
  }, [streak]);

  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const now = new Date(nowTick);
    const nowHours =
      now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
    const todayStr = today();
    const yesterdayStr = subtractDays(todayStr, 1);

    const { latitude, longitude, timezone } = settings.location;
    let todayTimes;

    try {
      todayTimes = calculatePrayerTimes(
        now,
        latitude,
        longitude,
        timezone,
        settings.calcMethod,
        !!settings.use24HourTime,
      );
    } catch (e) {
      return;
    }

    const endedPrayerTimes = {
      Fajr: todayTimes.Dhuhr?.time,
      Dhuhr: todayTimes.Asr?.time,
      Asr: todayTimes.Maghrib?.time,
      Maghrib: todayTimes.Isha?.time,
    };

    const toMissToday = ["Fajr", "Dhuhr", "Asr", "Maghrib"].filter(
      (prayer) => {
        const status = prayerLogs[todayStr]?.[prayer] || "pending";
        const endTime = endedPrayerTimes[prayer];
        return (
          status === "pending" &&
          typeof endTime === "number" &&
          nowHours >= endTime
        );
      },
    );

    toMissToday.forEach((prayer) => {
      setPrayerStatus(todayStr, prayer, "missed");
    });

    const yesterdayIshaStatus = prayerLogs[yesterdayStr]?.Isha || "pending";
    const todayFajrTime = todayTimes.Fajr?.time;
    if (
      yesterdayIshaStatus === "pending" &&
      typeof todayFajrTime === "number" &&
      nowHours >= todayFajrTime
    ) {
      setPrayerStatus(yesterdayStr, "Isha", "missed");
    }
  }, [nowTick, prayerLogs, setPrayerStatus, settings]);

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

  const sunnahTracking = settings.sunnahTracking;
  const gender = settings.gender;
  const daySunnahLog = getDaySunnahLog(selectedDate);
  const exemptType = getExemptDay(selectedDate);
  const isDayExempt = !!exemptType;

  // A prayer on an exempt day only shows as exempt once its window has ended
  // (next prayer has started). This way if the user was praying in the morning
  // and became exempt at Dhuhr, Fajr shows its real status.
  const getExemptForPrayer = (prayer) => {
    if (!isDayExempt) return false;
    const stored = dayLog[prayer] || "pending";
    // Already logged (prayed or missed) — honour it regardless of exempt toggle
    if (stored === "on-time" || stored === "late" || stored === "missed") return false;
    // For past days we have no live clock, so all unprayed prayers are exempt
    if (!isToday) return true;
    // For today: exempt only once the prayer's window has ended
    const NEXT = { Fajr: "Dhuhr", Dhuhr: "Asr", Asr: "Maghrib", Maghrib: "Isha" };
    const now = new Date(nowTick);
    const nextName = NEXT[prayer];
    if (nextName) {
      const nextTime = times[nextName]?.time;
      return nextTime ? nextTime < now : false;
    }
    // Isha: exempt once Isha time has started (it's the last prayer)
    const ishaTime = times.Isha?.time;
    return ishaTime ? ishaTime < now : false;
  };

  const completedCount = prayers.filter((p) => {
    const s = dayLog[p];
    return s === "on-time" || s === "late";
  }).length;
  const currentPrayerInfo = isToday
    ? getCurrentPrayerInfo(times, new Date(nowTick))
    : null;
  const currentPrayerStatus = currentPrayerInfo
    ? (getExemptForPrayer(currentPrayerInfo.currentPrayer) ? "exempt"
      : dayLog[currentPrayerInfo.currentPrayer] || "pending")
    : "pending";
  const currentPrayerStyle = STATUS_CONFIG[currentPrayerStatus] || STATUS_CONFIG.pending;
  const isCurrentPrayerPrayed =
    currentPrayerStatus === "on-time" || currentPrayerStatus === "late";
  const currentLocationLabel = settings?.location?.city || "Location not set";
  const loggedDaysCount = Object.values(prayerLogs || {}).filter((entry) =>
    prayers.some((p) => (entry?.[p] || "pending") !== "pending"),
  ).length;
  const showRateCard = loggedDaysCount >= 7;

  const handleSetCurrentPrayed = () => {
    if (!currentPrayerInfo) return;
    if (Platform.OS !== "web" && settings.vibrations !== false) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    if (isCurrentPrayerPrayed) {
      setPrayerStatus(selectedDate, currentPrayerInfo.currentPrayer, "pending");
      return;
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

  const handleSupportPress = () => {
    setSupportModalVisible(true);
  };

  const handleSelectSupportTier = () => {
    setSupportModalVisible(false);
    Alert.alert(
      "Thank you!",
      "In-app purchases coming soon. JazakAllah Khair for your support!",
    );
  };

  const openFeedbackComposer = async (feedback = "") => {
    const subject = encodeURIComponent("Rakah feedback");
    const body = encodeURIComponent(
      `Assalamu alaikum,\n\nI wanted to share feedback about Rakah:\n\n${feedback}`,
    );
    const mailtoUrl = `mailto:${FEEDBACK_EMAIL}?subject=${subject}&body=${body}`;

    try {
      const canOpen = await Linking.canOpenURL(mailtoUrl);
      if (canOpen) {
        await Linking.openURL(mailtoUrl);
        return;
      }
      await Share.share({
        title: "Send feedback",
        message: `Assalamu alaikum,\n\nI wanted to share feedback about Rakah:\n\n${feedback}`,
      });
    } catch {
      Alert.alert("Feedback", "Could not open feedback options right now.");
    }
  };

  const handleRatePress = () => {
    setReviewRating(0);
    setReviewFeedback("");
    setReviewModalVisible(true);
  };

  const handleHighRatingSelect = async () => {
    setReviewModalVisible(false);
    try {
      const canReview = await StoreReview.hasAction();
      if (canReview) {
        await StoreReview.requestReview();
        return;
      }
      Alert.alert(
        "Rate Rakah",
        "In-app rating is not available on this device right now.",
      );
    } catch {
      Alert.alert("Rate Rakah", "Could not open the rating prompt right now.");
    }
  };

  const handleSubmitReviewFunnel = async () => {
    if (reviewRating < 1) return;

    if (reviewRating >= 4) {
      await handleHighRatingSelect();
      return;
    }

    const text = reviewFeedback.trim();
    if (!text) return;
    setReviewModalVisible(false);
    // Placeholder send path until backend endpoint is connected.
    Alert.alert(
      "Thanks for your feedback",
      "Submitted successfully (placeholder). We'll use this to improve Rakah.",
      [{ text: "OK", onPress: () => { openFeedbackComposer(text); } }],
    );
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
      <SupportModal
        visible={supportModalVisible}
        onClose={() => setSupportModalVisible(false)}
        onSelectTier={handleSelectSupportTier}
        supportTiers={SUPPORT_TIERS}
      />
      <ReviewFunnelModal
        visible={reviewModalVisible}
        rating={reviewRating}
        feedbackText={reviewFeedback}
        onSetRating={setReviewRating}
        onChangeFeedback={setReviewFeedback}
        onHighRatingSelect={handleHighRatingSelect}
        onClose={() => setReviewModalVisible(false)}
        onSubmit={handleSubmitReviewFunnel}
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
            position: "relative",
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
          </View>
          <View
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              alignItems: "center",
              pointerEvents: "none",
              paddingTop: insets.top + 12,
            }}
          >
            <Text
              style={{
                fontFamily: F.med,
                fontSize: 13,
                color: C.textSec,
              }}
            >
              {formatRelativeDate(selectedDate) === "Today"
                ? formatDisplayDate(selectedDate)
                : formatRelativeDate(selectedDate)}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 4 }}>
              <MapPin size={12} color={C.textDim} strokeWidth={2} />
              <Text
                style={{ fontFamily: F.reg, fontSize: 12, color: C.textDim }}
                numberOfLines={1}
              >
                {currentLocationLabel}
              </Text>
            </View>
            <Text
              style={{
                fontFamily: F.reg,
                fontSize: 11,
                color: C.textDim,
                marginTop: 3,
                letterSpacing: 0.2,
                textAlign: "center",
              }}
            >
              {formatHijriDate(fromDateString(selectedDate))}
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
              <PrayerHorizonVisual
                prayer={getBannerKeyForNow(
                  times,
                  currentPrayerInfo.currentPrayer,
                  new Date(nowTick),
                )}
              />

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
                Upcoming: {currentPrayerInfo.nextPrayer} at {currentPrayerInfo.nextTime}
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

              {isDayExempt ? (
                <View
                  style={{
                    marginTop: 12,
                    paddingVertical: 10,
                    borderRadius: 12,
                    alignItems: "center",
                    backgroundColor: `${C.violet}15`,
                    borderWidth: 1,
                    borderColor: `${C.violet}40`,
                  }}
                >
                  <Text style={{ fontFamily: F.semi, fontSize: 13, color: C.violet }}>
                    {exemptType === "haid" ? "Haid — Exempt Period" : "Nifas — Exempt Period"}
                  </Text>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={handleSetCurrentPrayed}
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
                    {isCurrentPrayerPrayed ? (
                      <Minus size={14} color={C.textSec} strokeWidth={2.4} />
                    ) : (
                      <Check size={14} color="#0F1117" strokeWidth={2.4} />
                    )}
                    <Text
                      style={{
                        fontFamily: F.semi,
                        fontSize: 13,
                        color: isCurrentPrayerPrayed ? C.textSec : "#0F1117",
                      }}
                    >
                      {isCurrentPrayerPrayed ? "Unmark prayed" : "Mark as prayed"}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}

              {/* Sunnah section for current prayer */}
              {!isDayExempt && sunnahTracking &&
                SUNNAH_CONFIG[currentPrayerInfo.currentPrayer]?.length > 0 && (
                <View
                  style={{
                    marginTop: 12,
                    borderTopWidth: 1,
                    borderTopColor: C.border,
                    paddingTop: 12,
                  }}
                >
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                    {SUNNAH_CONFIG[currentPrayerInfo.currentPrayer].map(({ key, label }) => {
                      const prayed = daySunnahLog[key] === "prayed";
                      return (
                        <TouchableOpacity
                          key={key}
                          onPress={() =>
                            setSunnahStatus(selectedDate, key, prayed ? null : "prayed")
                          }
                          activeOpacity={0.7}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 6,
                            paddingHorizontal: 14,
                            paddingVertical: 8,
                            borderRadius: 12,
                            backgroundColor: prayed ? C.cardAlt : C.accent,
                            borderWidth: 1,
                            borderColor: prayed ? C.border : C.accentDim,
                            flex: 1,
                            justifyContent: "center",
                          }}
                        >
                          {prayed ? (
                            <Minus
                              size={12}
                              color={C.textSec}
                              strokeWidth={2.5}
                            />
                          ) : (
                            <Check
                              size={12}
                              color="#0F1117"
                              strokeWidth={2.5}
                            />
                          )}
                          <Text
                            style={{
                              fontFamily: F.semi,
                              fontSize: 12,
                              color: prayed ? C.textSec : "#0F1117",
                            }}
                          >
                            {label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}
            </View>
          </Animated.View>
        )}

        <Animated.View
          entering={FadeInDown.delay(65)}
          style={{ paddingHorizontal: 20, marginBottom: showRateCard ? 10 : 16 }}
        >
          <View
            style={{
              backgroundColor: C.card,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: C.border,
              padding: 14,
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
            }}
          >
            <View
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                backgroundColor: `${C.accent}18`,
                borderWidth: 1,
                borderColor: `${C.accent}35`,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Heart size={15} color={C.accent} strokeWidth={2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: F.semi, fontSize: 13, color: C.text }}>
                Keep Rakah free
              </Text>
              <Text style={{ fontFamily: F.reg, fontSize: 11, color: C.textSec, marginTop: 2 }}>
                Support the app if it's helping your prayer journey
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleSupportPress}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 7,
                borderRadius: 999,
                backgroundColor: `${C.accent}18`,
                borderWidth: 1,
                borderColor: `${C.accent}35`,
              }}
            >
              <Text style={{ fontFamily: F.semi, fontSize: 12, color: C.accent }}>
                Support
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {showRateCard && (
          <Animated.View
            entering={FadeInDown.delay(75)}
            style={{ paddingHorizontal: 20, marginBottom: 16 }}
          >
            <View
              style={{
                backgroundColor: C.card,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: C.border,
                padding: 14,
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
              }}
            >
              <View
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  backgroundColor: `${C.gold}18`,
                  borderWidth: 1,
                  borderColor: `${C.gold}40`,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Star size={15} color={C.gold} strokeWidth={2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: F.semi, fontSize: 13, color: C.text }}>
                  Enjoying Rakah?
                </Text>
                <Text style={{ fontFamily: F.reg, fontSize: 11, color: C.textSec, marginTop: 2 }}>
                  You've logged a week — a quick rating helps us a lot
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleRatePress}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                  borderRadius: 999,
                  backgroundColor: `${C.gold}18`,
                  borderWidth: 1,
                  borderColor: `${C.gold}40`,
                }}
              >
                <Text style={{ fontFamily: F.semi, fontSize: 12, color: C.gold }}>
                  Rate us
                </Text>
              </TouchableOpacity>
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

        {/* Exempt Period toggle — female users only */}
        {gender === "female" && (
          <Animated.View
            entering={FadeInDown.delay(60)}
            style={{
              paddingHorizontal: 20,
              marginBottom: 14,
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Text
              style={{
                fontFamily: F.semi,
                fontSize: 11,
                color: C.textDim,
                letterSpacing: 0.5,
                marginRight: 2,
              }}
            >
              EXEMPT
            </Text>
            {[
              { type: null, label: "None" },
              { type: "haid", label: "Haid" },
              { type: "nifas", label: "Nifas" },
            ].map(({ type, label }) => {
              const active = exemptType === type;
              return (
                <TouchableOpacity
                  key={String(type)}
                  onPress={() => setExemptDay(selectedDate, type)}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 6,
                    borderRadius: 999,
                    backgroundColor: active
                      ? type === null ? C.cardAlt : `${C.violet}20`
                      : "transparent",
                    borderWidth: 1,
                    borderColor: active
                      ? type === null ? C.border : `${C.violet}50`
                      : C.border,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: F.semi,
                      fontSize: 12,
                      color: active
                        ? type === null ? C.textSec : C.violet
                        : C.textDim,
                    }}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </Animated.View>
        )}

        {/* Streak & Message (summary card kept separate from prayer list) */}
        {isToday && (
          <Animated.View
            entering={FadeInDown.delay(70)}
            style={{ paddingHorizontal: 20, marginBottom: 14 }}
          >
            <Text
              style={{
                fontFamily: F.semi,
                fontSize: 11,
                color: C.textDim,
                letterSpacing: 0.5,
                marginBottom: 8,
              }}
            >
              TODAY SUMMARY
            </Text>
            <View
              style={{
                backgroundColor: C.card,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: C.border,
                paddingHorizontal: 16,
                paddingVertical: 14,
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
              }}
            >
              <View
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 21,
                  backgroundColor: "#30280E",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Flame size={19} color="#F4D35E" strokeWidth={1.8} />
              </View>
              <View style={{ flex: 1 }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "baseline",
                    gap: 5,
                  }}
                >
                  <Text
                    style={{ fontFamily: F.xbold, fontSize: 24, color: "#F4D35E" }}
                  >
                    {streak}
                  </Text>
                  <Text
                    style={{
                      fontFamily: F.med,
                      fontSize: 13,
                      color: C.textSec,
                    }}
                  >
                    day streak
                  </Text>
                </View>
                {message ? (
                  <Text
                    style={{
                      fontFamily: F.reg,
                      fontSize: 11,
                      color: C.textSec,
                      marginTop: 1,
                      lineHeight: 16,
                    }}
                  >
                    {message}
                  </Text>
                ) : null}
              </View>
              <View
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  backgroundColor: completedCount === 5 ? `${C.accent}15` : C.cardAlt,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: completedCount === 5 ? `${C.accent}30` : C.border,
                }}
              >
                <Text
                  style={{
                    fontFamily: F.semi,
                    fontSize: 12,
                    color: completedCount === 5 ? C.accent : C.textSec,
                  }}
                >
                  {completedCount}/5
                </Text>
              </View>
            </View>
          </Animated.View>
        )}

        {/* Prayer Cards */}
        <View style={{ paddingHorizontal: 20 }}>
          {prayers.map((prayer, i) => {
            const prayerExempt = getExemptForPrayer(prayer);
            return (
              <PrayerCard
                key={prayer}
                prayer={prayer}
                time={times[prayer]?.formatted || "--:--"}
                status={dayLog[prayer] || "pending"}
                onTap={() => handlePrayerTap(prayer)}
                onLongPress={() => handlePrayerLongPress(prayer)}
                index={i}
                isExempt={prayerExempt}
                vibrationsEnabled={settings.vibrations !== false}
                sunnahItems={sunnahTracking ? SUNNAH_CONFIG[prayer] : undefined}
                sunnahLog={sunnahTracking ? daySunnahLog : undefined}
                onSunnahToggle={sunnahTracking
                  ? (key, status) => setSunnahStatus(selectedDate, key, status)
                  : undefined}
              />
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
