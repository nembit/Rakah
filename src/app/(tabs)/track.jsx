import { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable,
  PanResponder,
  Animated as RNAnimated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Clock,
  X,
  Minus,
} from "lucide-react-native";
import usePrayerStore, { SUNNAH_CONFIG } from "@/store/prayerStore";
import {
  today,
  getMonthDays,
  fromDateString,
  getDayName,
  getMonthName,
  toDateString,
  subtractDays,
} from "@/utils/dateUtils";

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

const PRAYERS = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const STATUS_CONFIG = {
  "on-time": { color: C.accent, bg: "#0D2E1A" },
  late: { color: C.gold, bg: "#2A1F0A" },
  missed: { color: C.red, bg: "#2A0F0F" },
  pending: { color: C.textDim, bg: C.cardAlt },
  exempt: { color: C.violet, bg: "#1A1030" },
};

function getDayScore(log, isExempt) {
  if (isExempt) return "exempt";
  if (!log) return "empty";
  const statuses = PRAYERS.map((p) => log[p] || "pending");
  const anyLogged = statuses.some((s) => s !== "pending");
  if (!anyLogged) return "empty";
  const allOnTime = statuses.every((s) => s === "on-time");
  if (allOnTime) return "perfect";
  const noneMissed = statuses.every((s) => s !== "missed");
  const anyPrayed = statuses.some((s) => s === "on-time" || s === "late");
  if (anyPrayed && noneMissed) return "good";
  if (anyPrayed) return "partial";
  return "missed";
}

function DayDetailModal({
  dateStr, log, sunnahLog, showSunnah, visible, onClose,
  onSetStatus, onSetSunnah,
  exemptType, showExempt, onSetExempt,
}) {
  if (!dateStr) return null;
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

  const d = fromDateString(dateStr);
  const label = `${DAY_LABELS[d.getDay()]}, ${getMonthName(d.getMonth())} ${d.getDate()}`;
  const isExempt = !!exemptType;

  const options = [
    { key: "on-time", label: "On time", color: C.accent },
    { key: "late", label: "Late", color: C.gold },
    { key: "missed", label: "Missed", color: C.red },
    { key: "pending", label: "Clear", color: C.textSec },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.75)",
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
                borderTopLeftRadius: 28,
                borderTopRightRadius: 28,
                padding: 24,
                paddingBottom: 40,
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
                fontFamily: F.bold,
                fontSize: 18,
                color: C.text,
                textAlign: "center",
                marginBottom: 20,
              }}
            >
              {label}
            </Text>

            {/* Exempt period toggle — female users only */}
            {showExempt && (
              <View
                style={{
                  marginBottom: 20,
                  padding: 14,
                  borderRadius: 14,
                  backgroundColor: isExempt ? `${C.violet}12` : C.cardAlt,
                  borderWidth: 1,
                  borderColor: isExempt ? `${C.violet}35` : C.border,
                }}
              >
                <Text
                  style={{
                    fontFamily: F.semi,
                    fontSize: 11,
                    color: C.textSec,
                    letterSpacing: 0.5,
                    marginBottom: 10,
                  }}
                >
                  EXEMPT PERIOD
                </Text>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {[
                    { value: null, label: "None" },
                    { value: "haid", label: "Haid" },
                    { value: "nifas", label: "Nifas" },
                  ].map(({ value, label: eLabel }) => {
                    const active = exemptType === value;
                    return (
                      <TouchableOpacity
                        key={String(value)}
                        onPress={() => onSetExempt(dateStr, value)}
                        style={{
                          flex: 1,
                          paddingVertical: 9,
                          borderRadius: 10,
                          alignItems: "center",
                          backgroundColor: active
                            ? value === null ? C.cardAlt : `${C.violet}22`
                            : C.bg,
                          borderWidth: 1,
                          borderColor: active
                            ? value === null ? C.border : `${C.violet}55`
                            : C.border,
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: F.semi,
                            fontSize: 12,
                            color: active
                              ? value === null ? C.textSec : C.violet
                              : C.textDim,
                          }}
                        >
                          {eLabel}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {isExempt && (
                  <Text
                    style={{
                      fontFamily: F.reg,
                      fontSize: 11,
                      color: C.textSec,
                      marginTop: 8,
                    }}
                  >
                    Prayers on this day are exempt and won't affect your streak or qada count.
                  </Text>
                )}
              </View>
            )}

            {PRAYERS.map((prayer) => {
              const status = isExempt ? "exempt" : (log?.[prayer] || "pending");
              const sc = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
              const sunnahItems = showSunnah ? (SUNNAH_CONFIG[prayer] || []) : [];
              return (
                <View key={prayer} style={{ marginBottom: 14 }}>
                  {/* Fard row */}
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginBottom: 8,
                      gap: 8,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: F.semi,
                        fontSize: 14,
                        color: C.text,
                        width: 70,
                      }}
                    >
                      {prayer}
                    </Text>
                    <View
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 3,
                        backgroundColor: `${sc.color}20`,
                        borderRadius: 999,
                      }}
                    >
                      <Text style={{ fontFamily: F.semi, fontSize: 11, color: sc.color }}>
                        {status === "on-time"
                          ? "On Time"
                          : status.charAt(0).toUpperCase() + status.slice(1)}
                      </Text>
                    </View>
                  </View>
                  {isExempt ? (
                    <View
                      style={{
                        paddingVertical: 8,
                        borderRadius: 10,
                        alignItems: "center",
                        backgroundColor: `${C.violet}12`,
                        borderWidth: 1,
                        borderColor: `${C.violet}30`,
                      }}
                    >
                      <Text style={{ fontFamily: F.semi, fontSize: 10, color: C.violet }}>
                        Exempt
                      </Text>
                    </View>
                  ) : (
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      {options.map((opt) => {
                        const realStatus = log?.[prayer] || "pending";
                        return (
                          <TouchableOpacity
                            key={opt.key}
                            onPress={() => onSetStatus(dateStr, prayer, opt.key)}
                            style={{
                              flex: 1,
                              paddingVertical: 8,
                              borderRadius: 10,
                              alignItems: "center",
                              backgroundColor:
                                realStatus === opt.key ? `${opt.color}25` : C.cardAlt,
                              borderWidth: 1,
                              borderColor:
                                realStatus === opt.key ? `${opt.color}50` : "transparent",
                            }}
                          >
                            <Text
                              style={{
                                fontFamily: F.semi,
                                fontSize: 10,
                                color: realStatus === opt.key ? opt.color : C.textDim,
                              }}
                            >
                              {opt.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}

                  {/* Sunnah toggles */}
                  {!isExempt && sunnahItems.length > 0 && (
                    <View
                      style={{
                        flexDirection: "row",
                        flexWrap: "wrap",
                        gap: 6,
                        marginTop: 8,
                        paddingLeft: 4,
                      }}
                    >
                      <Text style={{ fontFamily: F.reg, fontSize: 11, color: C.textDim, alignSelf: "center", marginRight: 2 }}>
                        Sunnah:
                      </Text>
                      {sunnahItems.map(({ key, label: sLabel }) => {
                        const prayed = sunnahLog?.[key] === "prayed";
                        return (
                          <TouchableOpacity
                            key={key}
                            onPress={() => onSetSunnah(dateStr, key, prayed ? null : "prayed")}
                            activeOpacity={0.7}
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 4,
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
                              {sLabel}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            })}
            <TouchableOpacity
              onPress={onClose}
              style={{
                marginTop: 12,
                paddingVertical: 15,
                backgroundColor: C.cardAlt,
                borderRadius: 14,
                alignItems: "center",
              }}
            >
              <Text style={{ fontFamily: F.semi, fontSize: 15, color: C.textSec }}>
                Done
              </Text>
            </TouchableOpacity>
          </RNAnimated.View>
        </View>
      </Pressable>
    </Modal>
  );
}

export default function TrackScreen() {
  const insets = useSafeAreaInsets();
  const prayerLogs = usePrayerStore((s) => s.prayerLogs);
  const exemptLogs = usePrayerStore((s) => s.exemptLogs);
  const setPrayerStatus = usePrayerStore((s) => s.setPrayerStatus);
  const adjustQada = usePrayerStore((s) => s.adjustQada);
  const sunnahTracking = usePrayerStore((s) => s.settings.sunnahTracking);
  const gender = usePrayerStore((s) => s.settings.gender);
  const sunnahLogs = usePrayerStore((s) => s.sunnahLogs);
  const setSunnahStatus = usePrayerStore((s) => s.setSunnahStatus);
  const getExemptDay = usePrayerStore((s) => s.getExemptDay);
  const setExemptDay = usePrayerStore((s) => s.setExemptDay);

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  const days = getMonthDays(year, month);
  const todayStr = today();

  const prevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else setMonth((m) => m + 1);
  };

  const openDay = (dateStr) => {
    if (!dateStr || dateStr > todayStr) return;
    const limit = subtractDays(todayStr, 30);
    if (dateStr < limit) return;
    setSelectedDate(dateStr);
    setModalVisible(true);
  };

  const handleSetStatus = (dateStr, prayer, newStatus) => {
    // Block status changes on exempt days
    if (getExemptDay(dateStr)) return;
    const previousStatus = prayerLogs[dateStr]?.[prayer] || "pending";
    setPrayerStatus(dateStr, prayer, newStatus);

    // If marking as missed, automatically increment Qada counter
    if (newStatus === "missed" && previousStatus !== "missed") {
      adjustQada(prayer, 1, `Missed on ${dateStr}`);
    }
    // If changing from missed to something else, decrement Qada counter
    if (previousStatus === "missed" && newStatus !== "missed") {
      adjustQada(prayer, -1, `Changed from missed on ${dateStr}`);
    }
  };

  const handleSetExempt = (dateStr, type) => {
    setExemptDay(dateStr, type);
  };

  const SCORE_COLORS = {
    perfect: C.accent,
    good: "#1a9e5c",
    partial: C.gold,
    missed: C.red,
    empty: C.textDim,
    exempt: C.violet,
  };

  // Weekly summary for past 7 days
  const weekSummary = PRAYERS.map((prayer) => {
    let onTime = 0,
      late = 0,
      missed = 0;
    for (let i = 0; i < 7; i++) {
      const d = subtractDays(todayStr, i);
      const s = prayerLogs[d]?.[prayer] || "pending";
      if (s === "on-time") onTime++;
      else if (s === "late") late++;
      else if (s === "missed") missed++;
    }
    return { prayer, onTime, late, missed };
  });

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <DayDetailModal
        dateStr={selectedDate}
        log={selectedDate ? prayerLogs[selectedDate] : null}
        sunnahLog={selectedDate ? (sunnahLogs[selectedDate] || {}) : null}
        showSunnah={sunnahTracking}
        exemptType={selectedDate ? getExemptDay(selectedDate) : null}
        showExempt={gender === "female"}
        onSetExempt={handleSetExempt}
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSetStatus={handleSetStatus}
        onSetSunnah={setSunnahStatus}
      />
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 90 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View
          style={{
            paddingTop: insets.top + 16,
            paddingHorizontal: 20,
            marginBottom: 24,
          }}
        >
          <Text
            style={{
              fontFamily: F.bold,
              fontSize: 26,
              color: C.text,
              letterSpacing: -0.5,
            }}
          >
            Track
          </Text>
          <Text
            style={{
              fontFamily: F.reg,
              fontSize: 13,
              color: C.textSec,
              marginTop: 3,
            }}
          >
            Your prayer calendar
          </Text>
        </View>

        {/* Calendar */}
        <Animated.View
          entering={FadeInDown.delay(50)}
          style={{
            marginHorizontal: 20,
            backgroundColor: C.card,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: C.border,
            padding: 20,
            marginBottom: 20,
          }}
        >
          {/* Month nav */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 18,
            }}
          >
            <TouchableOpacity
              onPress={prevMonth}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: C.cardAlt,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ChevronLeft size={16} color={C.textSec} strokeWidth={2} />
            </TouchableOpacity>
            <Text style={{ fontFamily: F.semi, fontSize: 16, color: C.text }}>
              {getMonthName(month)} {year}
            </Text>
            <TouchableOpacity
              onPress={nextMonth}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: C.cardAlt,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ChevronRight size={16} color={C.textSec} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          {/* Day labels */}
          <View style={{ flexDirection: "row", marginBottom: 10 }}>
            {DAY_LABELS.map((d) => (
              <View key={d} style={{ flex: 1, alignItems: "center" }}>
                <Text
                  style={{ fontFamily: F.semi, fontSize: 11, color: C.textDim }}
                >
                  {d}
                </Text>
              </View>
            ))}
          </View>

          {/* Grid */}
          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            {days.map((dateStr, i) => {
              if (!dateStr) {
                return (
                  <View
                    key={`pad-${i}`}
                    style={{ width: `${100 / 7}%`, aspectRatio: 1 }}
                  />
                );
              }
              const d = fromDateString(dateStr);
              const log = prayerLogs[dateStr];
              const dayExempt = exemptLogs[dateStr];
              const score = getDayScore(log, !!dayExempt);
              const color = dayExempt ? C.violet : SCORE_COLORS[score];
              const isFuture = dateStr > todayStr;
              const isToday = dateStr === todayStr;
              return (
                <TouchableOpacity
                  key={dateStr}
                  onPress={() => openDay(dateStr)}
                  disabled={isFuture}
                  style={{
                    width: `${100 / 7}%`,
                    aspectRatio: 1,
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 2,
                  }}
                >
                  <View
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 17,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor:
                        score !== "empty" ? `${color}22` : "transparent",
                      borderWidth: isToday ? 2 : 0,
                      borderColor: isToday ? C.accent : "transparent",
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: isToday ? F.bold : F.med,
                        fontSize: 13,
                        color: isFuture ? C.textDim : color,
                      }}
                    >
                      {d.getDate()}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Legend */}
          <View
            style={{
              flexDirection: "row",
              gap: 14,
              marginTop: 16,
              flexWrap: "wrap",
            }}
          >
            {[
              ["All on time", C.accent],
              ["Partial", C.gold],
              ["Missed", C.red],
              ...(gender === "female" ? [["Exempt", C.violet]] : []),
            ].map(([lbl, color]) => (
              <View
                key={lbl}
                style={{ flexDirection: "row", alignItems: "center", gap: 5 }}
              >
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: color,
                  }}
                />
                <Text
                  style={{ fontFamily: F.reg, fontSize: 11, color: C.textSec }}
                >
                  {lbl}
                </Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* Weekly breakdown */}
        <Animated.View
          entering={FadeInDown.delay(120)}
          style={{
            marginHorizontal: 20,
            backgroundColor: C.card,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: C.border,
            padding: 20,
          }}
        >
          <Text
            style={{
              fontFamily: F.semi,
              fontSize: 15,
              color: C.textSec,
              marginBottom: 16,
            }}
          >
            LAST 7 DAYS
          </Text>
          {weekSummary.map(({ prayer, onTime, late, missed }) => {
            const total = onTime + late + missed;
            const pct = total > 0 ? Math.round((onTime / 7) * 100) : 0;
            return (
              <View key={prayer} style={{ marginBottom: 14 }}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    marginBottom: 6,
                  }}
                >
                  <Text
                    style={{ fontFamily: F.semi, fontSize: 14, color: C.text }}
                  >
                    {prayer}
                  </Text>
                  <Text
                    style={{
                      fontFamily: F.semi,
                      fontSize: 13,
                      color: pct > 70 ? C.accent : pct > 40 ? C.gold : C.red,
                    }}
                  >
                    {pct}%
                  </Text>
                </View>
                <View
                  style={{
                    height: 6,
                    backgroundColor: C.cardAlt,
                    borderRadius: 3,
                    flexDirection: "row",
                    overflow: "hidden",
                  }}
                >
                  {onTime > 0 && (
                    <View style={{ flex: onTime, backgroundColor: C.accent }} />
                  )}
                  {late > 0 && (
                    <View style={{ flex: late, backgroundColor: C.gold }} />
                  )}
                  {missed > 0 && (
                    <View style={{ flex: missed, backgroundColor: C.red }} />
                  )}
                  {7 - onTime - late - missed > 0 && (
                    <View
                      style={{
                        flex: 7 - onTime - late - missed,
                        backgroundColor: "transparent",
                      }}
                    />
                  )}
                </View>
              </View>
            );
          })}
        </Animated.View>
      </ScrollView>
    </View>
  );
}
