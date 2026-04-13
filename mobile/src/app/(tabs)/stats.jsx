import { useMemo } from "react";
import { View, Text, ScrollView, Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import {
  Flame,
  Target,
  TrendingUp,
  Award,
  AlertTriangle,
  Star,
} from "lucide-react-native";
import usePrayerStore from "@/store/prayerStore";
import { today, subtractDays, toDateString } from "@/utils/dateUtils";

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
const PRAYERS = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];

function StatCard({ icon: Icon, iconColor, title, value, subtitle, delay }) {
  return (
    <Animated.View
      entering={FadeInDown.delay(delay).duration(200)}
      style={{
        flex: 1,
        backgroundColor: C.card,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: C.border,
        padding: 18,
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: `${iconColor}18`,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 12,
        }}
      >
        <Icon size={18} color={iconColor} strokeWidth={1.8} />
      </View>
      <Text
        style={{
          fontFamily: F.xbold,
          fontSize: 30,
          color: C.text,
          letterSpacing: -1,
        }}
      >
        {value}
      </Text>
      <Text
        style={{
          fontFamily: F.semi,
          fontSize: 13,
          color: C.text,
          marginTop: 4,
        }}
      >
        {title}
      </Text>
      {subtitle ? (
        <Text
          style={{
            fontFamily: F.reg,
            fontSize: 11,
            color: C.textSec,
            marginTop: 2,
          }}
        >
          {subtitle}
        </Text>
      ) : null}
    </Animated.View>
  );
}

function ConsistencyRing({ pct, size = 110 }) {
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = (pct / 100) * circumference;
  const cx = size / 2;
  const cy = size / 2;
  const color = pct >= 80 ? C.accent : pct >= 50 ? C.gold : C.red;
  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <View style={{ position: "absolute" }}>
        {/* Track ring */}
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: 8,
            borderColor: C.cardAlt,
          }}
        />
      </View>
      <View style={{ position: "absolute" }}>
        {/* Progress approximation using arcs — simplified with a mask approach */}
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: 8,
            borderColor: "transparent",
            borderTopColor: pct > 0 ? color : "transparent",
            borderRightColor: pct > 25 ? color : "transparent",
            borderBottomColor: pct > 50 ? color : "transparent",
            borderLeftColor: pct > 75 ? color : "transparent",
            transform: [{ rotate: "-90deg" }],
          }}
        />
      </View>
      <View style={{ alignItems: "center" }}>
        <Text style={{ fontFamily: F.xbold, fontSize: 24, color: color }}>
          {pct}%
        </Text>
        <Text style={{ fontFamily: F.med, fontSize: 10, color: C.textSec }}>
          on time
        </Text>
      </View>
    </View>
  );
}

function PrayerBar({ prayer, pct, color, delay }) {
  const barWidth = Math.max((pct / 100) * (SCREEN_W - 80), 4);
  return (
    <Animated.View
      entering={FadeInDown.delay(delay).duration(200)}
      style={{ marginBottom: 14 }}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginBottom: 6,
        }}
      >
        <Text style={{ fontFamily: F.semi, fontSize: 14, color: C.text }}>
          {prayer}
        </Text>
        <Text style={{ fontFamily: F.semi, fontSize: 13, color: color }}>
          {pct}%
        </Text>
      </View>
      <View
        style={{
          height: 8,
          backgroundColor: C.cardAlt,
          borderRadius: 4,
          overflow: "hidden",
        }}
      >
        <Animated.View
          entering={FadeInDown.delay(delay + 80).duration(200)}
          style={{
            width: `${pct}%`,
            height: "100%",
            backgroundColor: color,
            borderRadius: 4,
          }}
        />
      </View>
    </Animated.View>
  );
}

export default function StatsScreen() {
  const insets = useSafeAreaInsets();
  const prayerLogs = usePrayerStore((s) => s.prayerLogs);
  const getStreak = usePrayerStore((s) => s.getStreak);
  const getBestStreak = usePrayerStore((s) => s.getBestStreak);
  const getWeeklyConsistency = usePrayerStore((s) => s.getWeeklyConsistency);
  const getStats = usePrayerStore((s) => s.getStats);

  const streak = getStreak();
  const bestStreak = getBestStreak();
  const weeklyPct = getWeeklyConsistency();
  const { mostMissed, bestPrayer, overallConsistency } = getStats();

  const prayerStats = useMemo(() => {
    return PRAYERS.map((prayer) => {
      let onTime = 0,
        total = 0;
      for (const dateStr of Object.keys(prayerLogs)) {
        const s = prayerLogs[dateStr]?.[prayer];
        if (s && s !== "pending") {
          total++;
          if (s === "on-time") onTime++;
        }
      }
      const pct = total > 0 ? Math.round((onTime / total) * 100) : 0;
      const color =
        pct >= 80 ? C.accent : pct >= 50 ? C.gold : pct > 0 ? C.red : C.textDim;
      return { prayer, pct, color, onTime, total };
    });
  }, [prayerLogs]);

  // Last 28 days heatmap data
  const last28 = useMemo(() => {
    return Array.from({ length: 28 }, (_, i) => {
      const d = subtractDays(today(), 27 - i);
      const log = prayerLogs[d] || {};
      const statuses = PRAYERS.map((p) => log[p] || "pending");
      const onTime = statuses.filter((s) => s === "on-time").length;
      const prayed = statuses.filter(
        (s) => s === "on-time" || s === "late",
      ).length;
      if (prayed === 0) return { d, score: 0 };
      if (onTime === 5) return { d, score: 4 };
      if (prayed === 5) return { d, score: 3 };
      if (prayed >= 3) return { d, score: 2 };
      return { d, score: 1 };
    });
  }, [prayerLogs]);

  const heatColors = ["#1E2232", "#1a3a2a", "#1a6a3a", "#1a9e5c", C.accent];

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
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
            Stats
          </Text>
          <Text
            style={{
              fontFamily: F.reg,
              fontSize: 13,
              color: C.textSec,
              marginTop: 3,
            }}
          >
            Your prayer insights
          </Text>
        </View>

        {/* Consistency Ring + Weekly */}
        <Animated.View
          entering={FadeInDown.delay(50)}
          style={{
            marginHorizontal: 20,
            backgroundColor: C.card,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: C.border,
            padding: 20,
            marginBottom: 16,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 20 }}>
            <ConsistencyRing pct={overallConsistency} />
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontFamily: F.semi,
                  fontSize: 13,
                  color: C.textSec,
                  marginBottom: 14,
                }}
              >
                OVERALL
              </Text>
              <View style={{ gap: 8 }}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                  }}
                >
                  <Text
                    style={{
                      fontFamily: F.med,
                      fontSize: 13,
                      color: C.textSec,
                    }}
                  >
                    This week
                  </Text>
                  <Text
                    style={{
                      fontFamily: F.semi,
                      fontSize: 13,
                      color: C.accent,
                    }}
                  >
                    {weeklyPct}%
                  </Text>
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                  }}
                >
                  <Text
                    style={{
                      fontFamily: F.med,
                      fontSize: 13,
                      color: C.textSec,
                    }}
                  >
                    Best prayer
                  </Text>
                  <Text
                    style={{ fontFamily: F.semi, fontSize: 13, color: C.text }}
                  >
                    {bestPrayer}
                  </Text>
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                  }}
                >
                  <Text
                    style={{
                      fontFamily: F.med,
                      fontSize: 13,
                      color: C.textSec,
                    }}
                  >
                    Most missed
                  </Text>
                  <Text
                    style={{ fontFamily: F.semi, fontSize: 13, color: C.red }}
                  >
                    {mostMissed}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Streak cards */}
        <View
          style={{
            paddingHorizontal: 20,
            flexDirection: "row",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <StatCard
            icon={Flame}
            iconColor={C.gold}
            title="Current Streak"
            value={streak}
            subtitle="consecutive days"
            delay={80}
          />
          <StatCard
            icon={Award}
            iconColor={C.teal}
            title="Best Streak"
            value={bestStreak}
            subtitle="all time"
            delay={120}
          />
        </View>

        {/* Prayer breakdown */}
        <Animated.View
          entering={FadeInDown.delay(160)}
          style={{
            marginHorizontal: 20,
            backgroundColor: C.card,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: C.border,
            padding: 20,
            marginBottom: 16,
          }}
        >
          <Text
            style={{
              fontFamily: F.semi,
              fontSize: 13,
              color: C.textSec,
              marginBottom: 18,
            }}
          >
            PRAYER BREAKDOWN (ON TIME)
          </Text>
          {prayerStats.map(({ prayer, pct, color }, i) => (
            <PrayerBar
              key={prayer}
              prayer={prayer}
              pct={pct}
              color={color}
              delay={200 + i * 50}
            />
          ))}
        </Animated.View>

        {/* 28-day heatmap */}
        <Animated.View
          entering={FadeInDown.delay(300)}
          style={{
            marginHorizontal: 20,
            backgroundColor: C.card,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: C.border,
            padding: 20,
            marginBottom: 16,
          }}
        >
          <Text
            style={{
              fontFamily: F.semi,
              fontSize: 13,
              color: C.textSec,
              marginBottom: 14,
            }}
          >
            28-DAY HEATMAP
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 5 }}>
            {last28.map(({ d, score }) => (
              <View
                key={d}
                style={{
                  width: (SCREEN_W - 80 - 27 * 5) / 28,
                  aspectRatio: 1,
                  borderRadius: 3,
                  backgroundColor: heatColors[score],
                }}
              />
            ))}
          </View>
          <View
            style={{
              flexDirection: "row",
              gap: 12,
              marginTop: 12,
              flexWrap: "wrap",
            }}
          >
            {[
              ["None", heatColors[0]],
              ["Partial", heatColors[2]],
              ["All on time", heatColors[4]],
            ].map(([lbl, col]) => (
              <View
                key={lbl}
                style={{ flexDirection: "row", alignItems: "center", gap: 5 }}
              >
                <View
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 2,
                    backgroundColor: col,
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

        {/* Motivational footer */}
        {overallConsistency > 0 && (
          <Animated.View
            entering={FadeInDown.delay(380)}
            style={{
              marginHorizontal: 20,
              backgroundColor: `${C.accent}12`,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: `${C.accent}25`,
              padding: 18,
              marginBottom: 8,
            }}
          >
            <Text
              style={{
                fontFamily: F.semi,
                fontSize: 14,
                color: C.accent,
                textAlign: "center",
              }}
            >
              {overallConsistency >= 90
                ? "Exceptional consistency. Keep it up!"
                : overallConsistency >= 70
                  ? "Great dedication — you're building a strong habit."
                  : overallConsistency >= 50
                    ? "Good progress. Every prayer counts."
                    : "Every step forward matters. Keep going. 🌿"}
            </Text>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}
