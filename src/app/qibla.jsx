import { useState, useEffect, useRef, useMemo } from "react";
import { View, Text, Platform, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { Magnetometer, Accelerometer } from "expo-sensors";
import { Navigation2, RotateCcw, ChevronLeft } from "lucide-react-native";
import usePrayerStore from "@/store/prayerStore";
import {
  getQiblaBearing,
  getDistanceToKaaba,
  bearingToCardinal,
  computeHeading,
  lowPassAngle,
} from "@/utils/qibla";

const C = {
  bg: "#0F1117",
  card: "#1A1D27",
  cardAlt: "#1E2232",
  accent: "#2ECC71",
  accentDim: "#1A7A43",
  gold: "#F59E0B",
  text: "#F9FAFB",
  textSec: "#9CA3AF",
  textDim: "#4B5563",
  border: "#252836",
  red: "#EF4444",
  kaaba: "#C8A96E", // warm gold for Kaaba indicator
};
const F = {
  reg: "PlusJakartaSans_400Regular",
  med: "PlusJakartaSans_500Medium",
  semi: "PlusJakartaSans_600SemiBold",
  bold: "PlusJakartaSans_700Bold",
  xbold: "PlusJakartaSans_800ExtraBold",
};

const COMPASS_SIZE = 290;
const CENTER = COMPASS_SIZE / 2;
const TICK_OUTER_R = CENTER - 6; // outer edge of tick marks (touching the ring border)
// Cardinal ticks are short so they hug the outer ring, leaving room for labels below them
const RING_R = CENTER - 46;      // radius for direction labels (well inside tick inner edges)
const ANIM_DURATION = 160;

// 8 compass directions drawn around the ring
const RING_DIRS = [
  { label: "N", angle: 0, cardinal: true },
  { label: "NE", angle: 45 },
  { label: "E", angle: 90, cardinal: true },
  { label: "SE", angle: 135 },
  { label: "S", angle: 180, cardinal: true },
  { label: "SW", angle: 225 },
  { label: "W", angle: 270, cardinal: true },
  { label: "NW", angle: 315 },
];

// 36 tick marks pre-computed using the midpoint+lineAngle method so they always
// render correctly regardless of angle (avoids the transformOrigin pitfall).
const TICKS = Array.from({ length: 36 }, (_, i) => {
  const angle = i * 10;
  const isCardinal = angle % 90 === 0;
  const isMajor = angle % 45 === 0;
  const rad = (angle * Math.PI) / 180;
  // Cardinals are kept short so they stay near the outer ring edge
  const tickLen = isCardinal ? 8 : isMajor ? 6 : 4;
  const thickness = isCardinal ? 2.5 : isMajor ? 1.5 : 1;
  // Outer point sits on the ring border; inner point is tickLen toward center
  const ox = CENTER + TICK_OUTER_R * Math.sin(rad);
  const oy = CENTER - TICK_OUTER_R * Math.cos(rad);
  const ix = CENTER + (TICK_OUTER_R - tickLen) * Math.sin(rad);
  const iy = CENTER - (TICK_OUTER_R - tickLen) * Math.cos(rad);
  // Midpoint of the tick line
  const mx = (ox + ix) / 2;
  const my = (oy + iy) / 2;
  // Angle needed to rotate a horizontal View so it aligns with the radial direction
  const lineAngle = Math.atan2(iy - oy, ix - ox) * (180 / Math.PI);
  return { angle, mx, my, lineAngle, tickLen, thickness, isCardinal, isMajor };
});

function formatDistance(km) {
  if (km >= 1000) return `${(km / 1000).toFixed(1)}k km`;
  return `${Math.round(km)} km`;
}

export default function QiblaScreen() {
  const insets = useSafeAreaInsets();
  const location = usePrayerStore((s) => s.settings.location);

  const qiblaBearing = useMemo(
    () => getQiblaBearing(location.latitude, location.longitude),
    [location.latitude, location.longitude],
  );
  const distanceKm = useMemo(
    () => getDistanceToKaaba(location.latitude, location.longitude),
    [location.latitude, location.longitude],
  );

  // Live heading state (smoothed, for display text)
  const [heading, setHeading] = useState(0);
  const [sensorReady, setSensorReady] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  // Refs for sensor fusion and smooth accumulation
  const magRef = useRef({ x: 0, y: 0, z: 0 });
  const accRef = useRef({ x: 0, y: 0, z: -9.8 });
  const smoothHeadingRef = useRef(0);      // low-pass smoothed (0–360)
  const accumHeadingRef = useRef(0);       // unbounded accumulated (no jumps)
  const prevRawHeadingRef = useRef(null);  // previous raw reading

  // Reanimated shared values (unbounded, to avoid 0/360 jump)
  const dialRotate = useSharedValue(0);    // compass ring: -accumHeading
  const needleRotate = useSharedValue(0);  // Qibla needle: qiblaBearing - accumHeading

  const dialStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${dialRotate.value}deg` }],
  }));
  const needleStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${needleRotate.value}deg` }],
  }));

  const processNewRawHeading = (rawH) => {
    // Accumulate unbounded heading (handles 0/360 crossing)
    if (prevRawHeadingRef.current === null) {
      prevRawHeadingRef.current = rawH;
      accumHeadingRef.current = rawH;
      smoothHeadingRef.current = rawH;
    } else {
      let delta = rawH - prevRawHeadingRef.current;
      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;
      accumHeadingRef.current += delta;
      prevRawHeadingRef.current = rawH;
    }

    // Low-pass filter on the 0–360 value for display text
    smoothHeadingRef.current = lowPassAngle(
      rawH,
      smoothHeadingRef.current,
      0.18,
    );
    const displayH = ((smoothHeadingRef.current % 360) + 360) % 360;
    setHeading(Math.round(displayH));

    // Animate using accumulated (unbounded) value for smooth rotation
    const accum = accumHeadingRef.current;
    dialRotate.value = withTiming(-accum, {
      duration: ANIM_DURATION,
      easing: Easing.out(Easing.quad),
    });
    needleRotate.value = withTiming(qiblaBearing - accum, {
      duration: ANIM_DURATION,
      easing: Easing.out(Easing.quad),
    });
  };

  useEffect(() => {
    if (Platform.OS === "web") {
      setUnavailable(true);
      return;
    }

    let magSub, accSub;

    const init = async () => {
      const magAvail = await Magnetometer.isAvailableAsync();
      if (!magAvail) {
        setUnavailable(true);
        return;
      }

      Magnetometer.setUpdateInterval(80);
      Accelerometer.setUpdateInterval(80);

      magSub = Magnetometer.addListener((data) => {
        magRef.current = data;
        const rawH = computeHeading(magRef.current, accRef.current);
        processNewRawHeading(rawH);
        setSensorReady(true);
      });

      accSub = Accelerometer.addListener((data) => {
        accRef.current = data;
      });
    };

    init();
    return () => {
      magSub?.remove();
      accSub?.remove();
    };
  }, [qiblaBearing]);

  // How close to facing Qibla (within ±10° = aligned)
  const needleAngle = ((qiblaBearing - heading + 360) % 360);
  const alignmentDiff = needleAngle > 180 ? needleAngle - 360 : needleAngle;
  const isAligned = Math.abs(alignmentDiff) <= 10;

  const qiblaCardinal = bearingToCardinal(qiblaBearing);
  const dialPrimaryColor = isAligned ? C.accent : C.text;
  const dialSecondaryColor = isAligned ? C.accent : C.textSec;
  const dialTickColor = isAligned ? `${C.accent}CC` : C.border;
  const dialOuterRingColor = isAligned ? `${C.accent}55` : C.border;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View
        style={{
          flex: 1,
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 16,
          paddingHorizontal: 24,
          alignItems: "center",
        }}
      >
        {/* Header */}
        <View
          style={{
            width: "100%",
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 28,
            gap: 12,
          }}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              backgroundColor: C.card,
              borderWidth: 1,
              borderColor: C.border,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ChevronLeft size={20} color={C.textSec} strokeWidth={2} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontFamily: F.bold,
                fontSize: 22,
                color: C.text,
                letterSpacing: -0.5,
              }}
            >
              Qibla
            </Text>
            <Text
              style={{ fontFamily: F.reg, fontSize: 12, color: C.textSec, marginTop: 2 }}
            >
              {location.city} · {qiblaBearing.toFixed(1)}° {qiblaCardinal}
            </Text>
          </View>
        </View>

        {/* ── Compass ── */}
        <View
          style={{
            width: COMPASS_SIZE,
            height: COMPASS_SIZE,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Outer decorative ring */}
          <View
            style={{
              position: "absolute",
              width: COMPASS_SIZE,
              height: COMPASS_SIZE,
              borderRadius: COMPASS_SIZE / 2,
              borderWidth: 1.5,
              borderColor: dialOuterRingColor,
              backgroundColor: C.card,
            }}
          />

          {/* Rotating compass dial — direction labels & tick marks */}
          <Animated.View
            style={[
              {
                position: "absolute",
                width: COMPASS_SIZE,
                height: COMPASS_SIZE,
              },
              dialStyle,
            ]}
          >
            {/* Tick marks — each View is a horizontal line centred on the midpoint
                of the tick, then rotated to align with the radial direction. */}
            {TICKS.map(({ angle, mx, my, lineAngle, tickLen, thickness, isCardinal }) => (
              <View
                key={angle}
                style={{
                  position: "absolute",
                  width: tickLen,
                  height: thickness,
                  left: mx - tickLen / 2,
                  top: my - thickness / 2,
                  backgroundColor: isCardinal ? dialSecondaryColor : dialTickColor,
                  transform: [{ rotate: `${lineAngle}deg` }],
                }}
              />
            ))}

            {/* Direction labels */}
            {RING_DIRS.map(({ label, angle, cardinal }) => {
              const rad = ((angle - 90) * Math.PI) / 180;
              const lx = CENTER + RING_R * Math.cos(rad);
              const ly = CENTER + RING_R * Math.sin(rad);
              const isNorth = label === "N";
              return (
                <Text
                  key={label}
                  style={{
                    position: "absolute",
                    left: lx - (cardinal ? 9 : 12),
                    top: ly - 9,
                    fontFamily: cardinal ? F.bold : F.semi,
                    fontSize: cardinal ? 14 : 10,
                    color: isAligned
                      ? C.accent
                      : isNorth
                      ? C.red
                      : cardinal
                      ? dialPrimaryColor
                      : dialSecondaryColor,
                    textAlign: "center",
                    width: cardinal ? 18 : 24,
                  }}
                >
                  {label}
                </Text>
              );
            })}
          </Animated.View>

          {/* ── Qibla needle (rotates independently) ── */}
          <Animated.View
            style={[
              {
                position: "absolute",
                width: COMPASS_SIZE,
                height: COMPASS_SIZE,
                alignItems: "center",
                justifyContent: "center",
              },
              needleStyle,
            ]}
          >
            {/* Needle shaft — upper half points toward Qibla */}
            <View
              style={{
                position: "absolute",
                top: CENTER - (RING_R - 38),
                width: 3,
                height: RING_R - 38,
                backgroundColor: isAligned ? C.accent : C.kaaba,
                borderRadius: 2,
              }}
            />
            {/* Arrowhead */}
            <View
              style={{
                position: "absolute",
                top: CENTER - (RING_R - 38) - 14,
                width: 0,
                height: 0,
                borderLeftWidth: 8,
                borderRightWidth: 8,
                borderBottomWidth: 14,
                borderLeftColor: "transparent",
                borderRightColor: "transparent",
                borderBottomColor: isAligned ? C.accent : C.kaaba,
              }}
            />
            {/* Kaaba label at tip */}
            <Text
              style={{
                position: "absolute",
                top: CENTER - (RING_R - 38) - 32,
                fontFamily: F.bold,
                fontSize: 9,
                color: isAligned ? C.accent : C.kaaba,
                letterSpacing: 0.5,
              }}
            >
              KAABA
            </Text>

            {/* Counter-needle (gray, lower half) */}
            <View
              style={{
                position: "absolute",
                top: CENTER,
                width: 3,
                height: (RING_R - 38) * 0.6,
                backgroundColor: C.textDim,
                borderRadius: 2,
                opacity: 0.5,
              }}
            />
          </Animated.View>

          {/* Center dot */}
          <View
            style={{
              width: 14,
              height: 14,
              borderRadius: 7,
              backgroundColor: isAligned ? C.accent : C.cardAlt,
              borderWidth: 2,
              borderColor: isAligned ? C.accentDim : C.border,
            }}
          />

          {/* Alignment glow ring */}
          {isAligned && (
            <View
              style={{
                position: "absolute",
                width: COMPASS_SIZE - 12,
                height: COMPASS_SIZE - 12,
                borderRadius: (COMPASS_SIZE - 12) / 2,
                borderWidth: 2,
                borderColor: `${C.accent}40`,
              }}
            />
          )}
        </View>

        {/* ── Info row ── */}
        <View
          style={{
            flexDirection: "row",
            gap: 12,
            marginTop: 28,
            width: "100%",
          }}
        >
          {[
            {
              label: "Qibla Direction",
              value: `${qiblaBearing.toFixed(1)}°`,
              sub: qiblaCardinal,
              color: C.kaaba,
            },
            {
              label: "You're Facing",
              value: `${heading}°`,
              sub: bearingToCardinal(heading),
              color: C.teal || C.textSec,
            },
            {
              label: "Distance",
              value: formatDistance(distanceKm),
              sub: "to Kaaba",
              color: C.textSec,
            },
          ].map(({ label, value, sub, color }) => (
            <View
              key={label}
              style={{
                flex: 1,
                backgroundColor: C.card,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: C.border,
                padding: 14,
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontFamily: F.xbold,
                  fontSize: 18,
                  color: color,
                  letterSpacing: -0.5,
                }}
              >
                {value}
              </Text>
              <Text
                style={{
                  fontFamily: F.semi,
                  fontSize: 11,
                  color: C.textSec,
                  marginTop: 2,
                }}
              >
                {sub}
              </Text>
              <Text
                style={{
                  fontFamily: F.reg,
                  fontSize: 10,
                  color: C.textDim,
                  marginTop: 4,
                  textAlign: "center",
                }}
              >
                {label}
              </Text>
            </View>
          ))}
        </View>

        {/* ── Status / calibration hint ── */}
        <View
          style={{
            marginTop: 20,
            paddingHorizontal: 16,
            paddingVertical: 12,
            backgroundColor: isAligned ? `${C.accent}10` : C.card,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: isAligned ? `${C.accent}30` : C.border,
            width: "100%",
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
          }}
        >
          {isAligned ? (
            <Navigation2 size={16} color={C.accent} strokeWidth={2} />
          ) : (
            <RotateCcw size={16} color={C.textDim} strokeWidth={1.8} />
          )}
          <Text
            style={{
              fontFamily: F.semi,
              fontSize: 13,
              color: isAligned ? C.accent : C.textSec,
              flex: 1,
            }}
          >
            {unavailable
              ? "Compass not available on this device or platform."
              : !sensorReady
              ? "Waiting for compass sensor…"
              : isAligned
              ? "You are facing the Qibla direction."
              : `Rotate ${alignmentDiff > 0 ? "right" : "left"} ${Math.abs(Math.round(alignmentDiff))}° to face Qibla.`}
          </Text>
        </View>

        {/* Calibration note */}
        {sensorReady && !unavailable && (
          <Text
            style={{
              fontFamily: F.reg,
              fontSize: 11,
              color: C.textDim,
              textAlign: "center",
              marginTop: 14,
              lineHeight: 17,
            }}
          >
            For best accuracy, hold the phone flat.{"\n"}
            If the needle is jittery, move the phone in a figure-8 to calibrate.
          </Text>
        )}
      </View>
    </View>
  );
}
