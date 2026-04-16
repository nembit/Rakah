import { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  Easing,
  interpolate,
  Extrapolation,
  runOnJS,
} from "react-native-reanimated";
import {
  Plus,
  Minus,
  RefreshCw,
  Clock,
  ChevronDown,
  ChevronUp,
  Check,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import usePrayerStore from "@/store/prayerStore";
import { formatShortDate } from "@/utils/dateUtils";

const C = {
  bg: "#0F1117",
  card: "#1A1D27",
  cardAlt: "#1E2232",
  accent: "#2ECC71",
  accentDim: "#1A7A43",
  gold: "#F59E0B",
  red: "#EF4444",
  teal: "#38BDF8",
  brown: "#B07A3F",
  qadaDarkBlue: "#ff8000",
  qadaWarmYellow: "#E8C15A",
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
const RAKAH_PER_PRAYER = {
  Fajr: 2,
  Dhuhr: 4,
  Asr: 4,
  Maghrib: 3,
  Isha: 4,
};
const EST_MIN_PER_RAKAH = 1.5;
const CONFETTI_PARTICLES = [
  { dx: -22, dy: -26, size: 5, color: "#2ECC71", delay: 0.0, rotation: -50 },
  { dx: -10, dy: -32, size: 4, color: "#E8C15A", delay: 0.03, rotation: -20 },
  { dx: 8, dy: -30, size: 5, color: "#38BDF8", delay: 0.05, rotation: 30 },
  { dx: 22, dy: -24, size: 4, color: "#F59E0B", delay: 0.08, rotation: 55 },
  { dx: -26, dy: -12, size: 4, color: "#A78BFA", delay: 0.02, rotation: -35 },
  { dx: 26, dy: -10, size: 4, color: "#F97316", delay: 0.06, rotation: 35 },
  { dx: -16, dy: -36, size: 3, color: "#F9FAFB", delay: 0.1, rotation: -70 },
  { dx: 16, dy: -36, size: 3, color: "#F9FAFB", delay: 0.12, rotation: 70 },
];

function formatDuration(minutes) {
  const safeMinutes = Math.max(0, Math.round(minutes));
  const hours = Math.floor(safeMinutes / 60);
  const mins = safeMinutes % 60;

  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

function AnimatedCounter({ value }) {
  const displayVal = useSharedValue(value);
  const [displayText, setDisplayText] = useState(String(value));
  const scaleAnim = useSharedValue(1);

  useEffect(() => {
    const prev = displayVal.value;
    const next = value;
    if (prev === next) return;

    const isDecrement = next < prev;
    if (isDecrement) {
      let current = prev;
      const interval = setInterval(
        () => {
          current = Math.max(current - 1, next);
          setDisplayText(String(current));
          if (current <= next) clearInterval(interval);
        },
        Math.max(12, Math.min(30, 180 / (prev - next + 1))),
      );
      displayVal.value = next;
      scaleAnim.value = withSequence(
        withTiming(1.13, { duration: 70 }),
        withTiming(1, { duration: 90 }),
      );
    } else {
      displayVal.value = next;
      setDisplayText(String(next));
      scaleAnim.value = withSequence(
        withTiming(1.1, { duration: 70 }),
        withTiming(1, { duration: 90 }),
      );
    }
  }, [value]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scaleAnim.value }],
  }));

  return (
    <Animated.View style={style}>
      <Text
        style={{
          fontFamily: F.xbold,
          fontSize: 28,
          color: value === 0 ? C.accent : C.qadaDarkBlue,
          minWidth: 44,
          textAlign: "center",
        }}
      >
        {displayText}
      </Text>
    </Animated.View>
  );
}

function ConfettiPiece({ progress, piece }) {
  const style = useAnimatedStyle(() => {
    const t = interpolate(
      progress.value,
      [0, piece.delay, 1],
      [0, 0, 1],
      Extrapolation.CLAMP,
    );
    const opacity = interpolate(progress.value, [0, piece.delay + 0.05, 1], [0, 1, 0], Extrapolation.CLAMP);
    return {
      opacity,
      transform: [
        { translateX: piece.dx * t },
        // Ease-out timing drives quick start then slow settle.
        { translateY: piece.dy * t },
        { rotate: `${piece.rotation * t}deg` },
        { scale: interpolate(t, [0, 0.2, 1], [0.5, 1, 0.95], Extrapolation.CLAMP) },
      ],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          top: 10,
          left: -piece.size / 2,
          width: piece.size,
          height: piece.size,
          borderRadius: 1.5,
          backgroundColor: piece.color,
        },
        style,
      ]}
    />
  );
}

function BulkEntryModal({ visible, prayer, onClose, onSubmit }) {
  const [years, setYears] = useState("");
  const [months, setMonths] = useState("");
  const [direct, setDirect] = useState("");
  const [tab, setTab] = useState("period"); // 'period' or 'direct'

  const total =
    tab === "period"
      ? Math.round(parseFloat(years || 0) * 365 + parseFloat(months || 0) * 30)
      : parseInt(direct || 0, 10);

  const handleSubmit = () => {
    if (isNaN(total) || total < 0) {
      Alert.alert("Invalid", "Please enter a valid number.");
      return;
    }
    onSubmit(total);
    setYears("");
    setMonths("");
    setDirect("");
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.75)",
            justifyContent: "flex-end",
          }}
          onPress={onClose}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View
              style={{
                backgroundColor: C.card,
                borderTopLeftRadius: 28,
                borderTopRightRadius: 28,
                padding: 24,
                paddingBottom: 40,
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
                  fontFamily: F.bold,
                  fontSize: 18,
                  color: C.text,
                  textAlign: "center",
                  marginBottom: 4,
                }}
              >
                Set Qada — {prayer}
              </Text>
              <Text
                style={{
                  fontFamily: F.reg,
                  fontSize: 13,
                  color: C.textSec,
                  textAlign: "center",
                  marginBottom: 20,
                }}
              >
                Enter your backlog of missed {prayer} prayers
              </Text>

              {/* Tab switcher */}
              <View
                style={{
                  flexDirection: "row",
                  backgroundColor: C.cardAlt,
                  borderRadius: 12,
                  padding: 4,
                  marginBottom: 20,
                }}
              >
                {["period", "direct"].map((t) => (
                  <TouchableOpacity
                    key={t}
                    onPress={() => setTab(t)}
                    style={{
                      flex: 1,
                      paddingVertical: 8,
                      borderRadius: 9,
                      alignItems: "center",
                      backgroundColor: tab === t ? C.card : "transparent",
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: F.semi,
                        fontSize: 13,
                        color: tab === t ? C.text : C.textSec,
                      }}
                    >
                      {t === "period" ? "By Period" : "Direct Count"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {tab === "period" ? (
                <View
                  style={{ flexDirection: "row", gap: 12, marginBottom: 20 }}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontFamily: F.med,
                        fontSize: 12,
                        color: C.textSec,
                        marginBottom: 8,
                      }}
                    >
                      Years
                    </Text>
                    <TextInput
                      value={years}
                      onChangeText={setYears}
                      keyboardType="decimal-pad"
                      placeholderTextColor={C.textDim}
                      placeholder="0"
                      style={{
                        backgroundColor: C.cardAlt,
                        borderRadius: 12,
                        padding: 14,
                        fontFamily: F.bold,
                        fontSize: 20,
                        color: C.text,
                        borderWidth: 1,
                        borderColor: C.border,
                        textAlign: "center",
                      }}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontFamily: F.med,
                        fontSize: 12,
                        color: C.textSec,
                        marginBottom: 8,
                      }}
                    >
                      Months
                    </Text>
                    <TextInput
                      value={months}
                      onChangeText={setMonths}
                      keyboardType="decimal-pad"
                      placeholderTextColor={C.textDim}
                      placeholder="0"
                      style={{
                        backgroundColor: C.cardAlt,
                        borderRadius: 12,
                        padding: 14,
                        fontFamily: F.bold,
                        fontSize: 20,
                        color: C.text,
                        borderWidth: 1,
                        borderColor: C.border,
                        textAlign: "center",
                      }}
                    />
                  </View>
                </View>
              ) : (
                <View style={{ marginBottom: 20 }}>
                  <Text
                    style={{
                      fontFamily: F.med,
                      fontSize: 12,
                      color: C.textSec,
                      marginBottom: 8,
                    }}
                  >
                    Total prayers
                  </Text>
                  <TextInput
                    value={direct}
                    onChangeText={setDirect}
                    keyboardType="number-pad"
                    placeholderTextColor={C.textDim}
                    placeholder="0"
                    style={{
                      backgroundColor: C.cardAlt,
                      borderRadius: 12,
                      padding: 14,
                      fontFamily: F.bold,
                      fontSize: 24,
                      color: C.text,
                      borderWidth: 1,
                      borderColor: C.border,
                      textAlign: "center",
                    }}
                  />
                </View>
              )}

              <View
                style={{
                  backgroundColor: C.cardAlt,
                  borderRadius: 12,
                  padding: 14,
                  marginBottom: 20,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{ fontFamily: F.med, fontSize: 13, color: C.textSec }}
                >
                  Total prayers to make up
                </Text>
                <Text
                  style={{
                    fontFamily: F.xbold,
                    fontSize: 30,
                    color: C.teal,
                    marginTop: 4,
                  }}
                >
                  {isNaN(total) ? 0 : total}
                </Text>
              </View>

              <TouchableOpacity
                onPress={handleSubmit}
                style={{
                  backgroundColor: C.accent,
                  borderRadius: 14,
                  paddingVertical: 16,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{ fontFamily: F.bold, fontSize: 16, color: "#0F1117" }}
                >
                  Set Qada Count
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function QadaCard({
  prayer,
  count,
  onIncrement,
  onDecrement,
  onBulkSet,
  index,
  vibrationsEnabled,
}) {
  const scaleInc = useSharedValue(1);
  const scaleDec = useSharedValue(1);
  const confettiBurst = useSharedValue(0);
  const zeroTextBurst = useSharedValue(0);
  const rakahCount = count * (RAKAH_PER_PRAYER[prayer] || 0);

  const handleInc = () => {
    scaleInc.value = withSequence(
      withTiming(0.92, { duration: 60 }),
      withTiming(1, { duration: 100 }),
    );
    if (Platform.OS !== "web" && vibrationsEnabled)
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onIncrement();
  };

  const handleDec = () => {
    if (count <= 0) return;
    const willReachZero = count === 1;
    scaleDec.value = withSequence(
      withTiming(0.92, { duration: 60 }),
      withTiming(1, { duration: 100 }),
    );
    if (Platform.OS !== "web" && vibrationsEnabled)
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onDecrement();
    confettiBurst.value = 0;
    confettiBurst.value = withTiming(1, {
      duration: 480,
      easing: Easing.out(Easing.cubic),
    });
    if (willReachZero) {
      zeroTextBurst.value = 0;
      zeroTextBurst.value = withTiming(1, {
        duration: 620,
        easing: Easing.out(Easing.cubic),
      });
    }
  };

  const incStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleInc.value }],
  }));
  const decStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleDec.value }],
  }));
  const zeroTextStyle = useAnimatedStyle(() => ({
    opacity: interpolate(zeroTextBurst.value, [0, 0.18, 0.8, 1], [0, 1, 1, 0], Extrapolation.CLAMP),
    transform: [
      { translateY: interpolate(zeroTextBurst.value, [0, 1], [0, -16], Extrapolation.CLAMP) },
      { scale: interpolate(zeroTextBurst.value, [0, 0.2, 1], [0.9, 1.05, 1], Extrapolation.CLAMP) },
    ],
  }));

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 50).duration(200)}
      style={{
        backgroundColor: C.card,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: C.border,
        paddingVertical: 12,
        paddingHorizontal: 14,
        marginBottom: 8,
      }}
    >
      <View
        style={{
          alignItems: "center",
          marginBottom: 6,
        }}
      >
        <Text
          style={{
            fontFamily: F.bold,
            fontSize: 15,
            color: C.text,
            textAlign: "center",
          }}
        >
          {prayer}
        </Text>
      </View>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Left: Add button - neutral grey for discouragement */}
        <Animated.View style={incStyle}>
          <TouchableOpacity
            onPress={handleInc}
            style={{
              width: 42,
              height: 42,
              borderRadius: 21,
              backgroundColor: `${C.textSec}15`,
              borderWidth: 1,
              borderColor: `${C.textSec}30`,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Plus size={16} color={C.textSec} strokeWidth={2.2} />
          </TouchableOpacity>
        </Animated.View>

        <View style={{ alignItems: "center", position: "relative", minWidth: 72 }}>
          <Animated.Text
            pointerEvents="none"
            style={[
              {
                position: "absolute",
                top: -20,
                fontFamily: F.bold,
                fontSize: 12,
                color: C.accent,
                letterSpacing: 0.2,
              },
              zeroTextStyle,
            ]}
          >
            Mashallah
          </Animated.Text>
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              top: -1,
              left: "50%",
              marginLeft: 1,
              width: 2,
              height: 36,
              alignItems: "center",
              justifyContent: "flex-start",
            }}
          >
            {CONFETTI_PARTICLES.map((piece, idx) => (
              <ConfettiPiece key={`${prayer}-confetti-${idx}`} progress={confettiBurst} piece={piece} />
            ))}
          </View>
          <AnimatedCounter value={count} />
          <Text
            style={{
              fontFamily: F.reg,
              fontSize: 11,
              color: C.textSec,
              marginTop: -2,
            }}
          >
            {rakahCount} rakah
          </Text>
        </View>

        {/* Right: Checkmark (decrement) button - green for positive action */}
        <Animated.View style={decStyle}>
          <TouchableOpacity
            onPress={handleDec}
            style={{
              width: 42,
              height: 42,
              borderRadius: 21,
              backgroundColor: count > 0 ? `${C.accent}18` : C.cardAlt,
              borderWidth: 1,
              borderColor: count > 0 ? `${C.accent}40` : C.border,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Check
              size={16}
              color={count > 0 ? C.accent : C.textDim}
              strokeWidth={2.2}
            />
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Set bulk button - subtle and below counter */}
      <View style={{ marginTop: 8, alignItems: "center" }}>
        <TouchableOpacity
          onPress={onBulkSet}
          style={{
            paddingHorizontal: 10,
            paddingVertical: 5,
          }}
        >
          <Text
            style={{
              fontFamily: F.med,
              fontSize: 10,
              color: C.textDim,
              textDecorationLine: "underline",
            }}
          >
            Set bulk amount
          </Text>
        </TouchableOpacity>
      </View>

    </Animated.View>
  );
}

export default function QadaScreen() {
  const insets = useSafeAreaInsets();
  const qdaCounts = usePrayerStore((s) => s.qdaCounts);
  const qdaLog = usePrayerStore((s) => s.qdaLog);
  const adjustQada = usePrayerStore((s) => s.adjustQada);
  const setQadaCount = usePrayerStore((s) => s.setQadaCount);
  const settings = usePrayerStore((s) => s.settings);

  const [bulkPrayer, setBulkPrayer] = useState(null);
  const [showLog, setShowLog] = useState(false);

  const totalQada = PRAYERS.reduce((sum, p) => sum + (qdaCounts[p] || 0), 0);
  const totalRakah = PRAYERS.reduce(
    (sum, p) => sum + (qdaCounts[p] || 0) * (RAKAH_PER_PRAYER[p] || 0),
    0,
  );
  const qadaTotalColor = totalQada === 0 ? C.accent : C.qadaDarkBlue;
  const rakahTotalColor = totalRakah === 0 ? C.accent : C.qadaWarmYellow;
  const estimatedTotalMinutes = totalRakah * EST_MIN_PER_RAKAH;
  const recentLog = qdaLog.slice(0, 20);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <BulkEntryModal
        visible={!!bulkPrayer}
        prayer={bulkPrayer}
        onClose={() => setBulkPrayer(null)}
        onSubmit={(count) => setQadaCount(bulkPrayer, count)}
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
            marginBottom: 20,
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
            Qada
          </Text>
          <Text
            style={{
              fontFamily: F.reg,
              fontSize: 13,
              color: C.textSec,
              marginTop: 3,
            }}
          >
            Makeup prayer tracker
          </Text>
        </View>

        {/* Total summary */}
        <Animated.View
          entering={FadeInDown.delay(40)}
          style={{
            marginHorizontal: 20,
            backgroundColor: C.card,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: C.border,
            padding: 20,
            marginBottom: 24,
            alignItems: "center",
          }}
        >
          <Text
            style={{
              fontFamily: F.med,
              fontSize: 13,
              color: C.textSec,
              marginBottom: 6,
            }}
          >
            TOTAL QADA REMAINING
          </Text>
          <View style={{ alignItems: "center" }}>
            <Text
              style={{
                fontFamily: F.xbold,
                fontSize: 52,
                color: qadaTotalColor,
                letterSpacing: -2,
              }}
            >
              {totalQada}
            </Text>
            <Text
              style={{
                fontFamily: F.reg,
                fontSize: 12,
                color: C.textSec,
                marginTop: -4,
              }}
            >
              prayers
            </Text>

            <Text
              style={{
                fontFamily: F.bold,
                fontSize: 28,
                color: rakahTotalColor,
                marginTop: 8,
              }}
            >
              {totalRakah}
            </Text>
            <Text
              style={{
                fontFamily: F.reg,
                fontSize: 12,
                color: C.textSec,
                marginTop: -2,
              }}
            >
              rakah
            </Text>

            {totalRakah > 0 && (
              <Text
                style={{
                  fontFamily: F.reg,
                  fontSize: 11,
                  color: C.textSec,
                  marginTop: 8,
                }}
              >
                Est. prayer time: {formatDuration(estimatedTotalMinutes)}
              </Text>
            )}
            {totalRakah > 0 && (
              <Text
                style={{
                  fontFamily: F.reg,
                  fontSize: 10,
                  color: C.textDim,
                  marginTop: 2,
                }}
              >
                based on ~{EST_MIN_PER_RAKAH} min per rakah
              </Text>
            )}
          </View>
          {totalQada === 0 && (
            <Text
              style={{
                fontFamily: F.med,
                fontSize: 14,
                color: C.accent,
                marginTop: 6,
              }}
            >
              Mashallah — no backlog!
            </Text>
          )}
        </Animated.View>

        {/* Prayer Qada cards */}
        <View style={{ paddingHorizontal: 20 }}>
          {PRAYERS.map((prayer, i) => (
            <QadaCard
              key={prayer}
              prayer={prayer}
              count={qdaCounts[prayer] || 0}
              onIncrement={() => adjustQada(prayer, 1)}
              onDecrement={() => adjustQada(prayer, -1)}
              onBulkSet={() => setBulkPrayer(prayer)}
              index={i}
              vibrationsEnabled={settings.vibrations !== false}
            />
          ))}
        </View>

        {/* Recent Log */}
        {recentLog.length > 0 && (
          <Animated.View
            entering={FadeInDown.delay(200)}
            style={{
              marginHorizontal: 20,
              marginTop: 12,
              backgroundColor: C.card,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: C.border,
              padding: 20,
            }}
          >
            <TouchableOpacity
              onPress={() => setShowLog((v) => !v)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <Clock size={16} color={C.textSec} strokeWidth={1.8} />
                <Text
                  style={{ fontFamily: F.semi, fontSize: 14, color: C.textSec }}
                >
                  RECENT CHANGES
                </Text>
              </View>
              {showLog ? (
                <ChevronUp size={16} color={C.textSec} />
              ) : (
                <ChevronDown size={16} color={C.textSec} />
              )}
            </TouchableOpacity>

            {showLog && (
              <View style={{ marginTop: 16 }}>
                {recentLog.map((entry) => {
                  const isInc = entry.change > 0;
                  const dateLabel = new Date(
                    entry.timestamp,
                  ).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  return (
                    <View
                      key={entry.id}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        paddingVertical: 10,
                        borderBottomWidth: 1,
                        borderColor: C.border,
                      }}
                    >
                      <View
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: 15,
                          backgroundColor: isInc
                            ? `${C.gold}20`
                            : `${C.teal}20`,
                          alignItems: "center",
                          justifyContent: "center",
                          marginRight: 12,
                        }}
                      >
                        {isInc ? (
                          <Plus size={14} color={C.gold} strokeWidth={2} />
                        ) : (
                          <Minus size={14} color={C.teal} strokeWidth={2} />
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            fontFamily: F.semi,
                            fontSize: 13,
                            color: C.text,
                          }}
                        >
                          {entry.prayer}
                        </Text>
                        <Text
                          style={{
                            fontFamily: F.reg,
                            fontSize: 11,
                            color: C.textSec,
                          }}
                        >
                          {dateLabel}
                        </Text>
                      </View>
                      <View style={{ alignItems: "flex-end" }}>
                        <Text
                          style={{
                            fontFamily: F.bold,
                            fontSize: 14,
                            color: isInc ? C.gold : C.teal,
                          }}
                        >
                          {isInc ? "+" : ""}
                          {entry.change}
                        </Text>
                        <Text
                          style={{
                            fontFamily: F.reg,
                            fontSize: 11,
                            color: C.textDim,
                          }}
                        >
                          total: {entry.total}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}
