import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  FadeInRight,
  FadeOutLeft,
  FadeIn,
} from "react-native-reanimated";
import * as Location from "expo-location";
import {
  MapPin,
  Navigation,
  Check,
  BookOpen,
  User,
  ChevronRight,
  Search,
  X,
  Landmark,
  Crosshair,
} from "lucide-react-native";
import { useTabletLayout } from "@/utils/useTabletLayout";
import { searchPlaces, getTimezoneOffset } from "@/utils/locationSearch";
import usePrayerStore from "@/store/prayerStore";

const C = {
  bg: "#0F1117",
  card: "#1A1D27",
  cardAlt: "#1E2232",
  accent: "#2ECC71",
  accentDim: "#1A7A43",
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

// Total steps (excluding welcome)
const STEPS = ["gender", "location", "sunnah"];

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const updateSettings = usePrayerStore((s) => s.updateSettings);
  const updateLocation = usePrayerStore((s) => s.updateLocation);
  const { contentStyle } = useTabletLayout();

  const [step, setStep] = useState(-1); // -1 = welcome

  // Gender step
  const [gender, setGender] = useState(null);

  // Location step
  const [locType, setLocType] = useState("auto");
  const [city, setCity] = useState("New York");
  const [lat, setLat] = useState("40.7128");
  const [lon, setLon] = useState("-74.0060");
  const [tz, setTz] = useState("-4");
  const [detecting, setDetecting] = useState(false);
  const [detected, setDetected] = useState(false);

  // Location search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [fetchingTz, setFetchingTz] = useState(false);

  useEffect(() => {
    if (searchQuery.length < 3) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try { setSearchResults(await searchPlaces(searchQuery)); }
      catch { setSearchResults([]); }
      setSearching(false);
    }, 550);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const selectPlace = async (place) => {
    setCity(place.shortName);
    setLat(place.lat);
    setLon(place.lon);
    setSearchQuery("");
    setSearchResults([]);
    setDetected(true);
    setFetchingTz(true);
    const offset = await getTimezoneOffset(place.lat, place.lon);
    setTz(String(offset));
    setFetchingTz(false);
  };

  // Sunnah step
  const [sunnah, setSunnah] = useState(null);

  const detectLocation = async () => {
    setDetecting(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Location permission is needed for accurate prayer times.");
        setDetecting(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const [geo] = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
      const tzOffset = -(new Date().getTimezoneOffset() / 60);
      setLat(String(loc.coords.latitude.toFixed(4)));
      setLon(String(loc.coords.longitude.toFixed(4)));
      setTz(String(tzOffset));
      setCity(geo?.city || geo?.region || "My Location");
      setDetected(true);
    } catch {
      Alert.alert("Error", "Could not detect location. You can enter it manually.");
    }
    setDetecting(false);
  };

  const canContinue = () => {
    if (step === 0) return gender !== null;
    if (step === 1) {
      if (locType === "auto") return detected;
      return city.trim() !== "" && lat.trim() !== "" && lon.trim() !== "" && !fetchingTz;
    }
    if (step === 2) return sunnah !== null;
    return true;
  };

  const handleContinue = () => {
    if (step === STEPS.length - 1) {
      // Save all and complete onboarding
      updateSettings({ gender, sunnahTracking: sunnah, onboardingComplete: true });
      updateLocation({
        type: locType,
        latitude: parseFloat(lat) || 40.7128,
        longitude: parseFloat(lon) || -74.006,
        city: city || "My Location",
        timezone: parseFloat(tz) || -4,
      });
      router.replace("/(tabs)/home");
    } else {
      setStep((s) => s + 1);
    }
  };

  const progress = step >= 0 ? (step + 1) / STEPS.length : 0;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: C.bg }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View
        style={[
          {
            flex: 1,
            paddingTop: insets.top + 16,
            paddingBottom: insets.bottom + 24,
            paddingHorizontal: 28,
          },
          contentStyle
        ]}
      >
        {/* Progress bar — hidden on welcome */}
        {step >= 0 && (
          <Animated.View entering={FadeIn} style={{ marginBottom: 40 }}>
            <View
              style={{
                height: 3,
                backgroundColor: C.cardAlt,
                borderRadius: 2,
                overflow: "hidden",
              }}
            >
              <Animated.View
                style={{
                  height: "100%",
                  width: `${progress * 100}%`,
                  backgroundColor: C.accent,
                  borderRadius: 2,
                }}
              />
            </View>
            <Text
              style={{
                fontFamily: F.reg,
                fontSize: 12,
                color: C.textDim,
                marginTop: 8,
                textAlign: "right",
              }}
            >
              {step + 1} of {STEPS.length}
            </Text>
          </Animated.View>
        )}

        {/* Welcome step */}
        {step === -1 && (
          <Animated.View
            key="welcome"
            entering={FadeIn.duration(500)}
            style={{ flex: 1, justifyContent: "center" }}
          >
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 22,
                backgroundColor: `${C.accent}18`,
                borderWidth: 1,
                borderColor: `${C.accent}35`,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 32,
              }}
            >
              <Landmark size={34} color={C.accent} strokeWidth={2} />
            </View>
            <Text
              style={{
                fontFamily: F.xbold,
                fontSize: 38,
                color: C.text,
                letterSpacing: -1,
                marginBottom: 16,
              }}
            >
              Welcome to{"\n"}Rakah
            </Text>
            <Text
              style={{
                fontFamily: F.reg,
                fontSize: 16,
                color: C.textSec,
                lineHeight: 26,
                marginBottom: 48,
              }}
            >
              Let's take a moment to set things up so your prayer times and tracking are perfectly tailored to you.
            </Text>
            <TouchableOpacity
              onPress={() => setStep(0)}
              style={{
                backgroundColor: C.accent,
                borderRadius: 16,
                paddingVertical: 16,
                alignItems: "center",
                flexDirection: "row",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <Text style={{ fontFamily: F.bold, fontSize: 16, color: "#0F1117" }}>
                Get Started
              </Text>
              <ChevronRight size={18} color="#0F1117" strokeWidth={2.5} />
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Gender step */}
        {step === 0 && (
          <Animated.View
            key="gender"
            entering={FadeInRight.duration(350)}
            style={{ flex: 1 }}
          >
            <View
              style={{
                width: 52,
                height: 52,
                borderRadius: 16,
                backgroundColor: C.cardAlt,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 24,
              }}
            >
              <User size={24} color={C.textSec} strokeWidth={1.8} />
            </View>
            <Text style={{ fontFamily: F.bold, fontSize: 28, color: C.text, letterSpacing: -0.5, marginBottom: 10 }}>
              What's your gender?
            </Text>
            <Text style={{ fontFamily: F.reg, fontSize: 15, color: C.textSec, lineHeight: 24, marginBottom: 36 }}>
              This is used to personalize certain app functionality. You can update it anytime in Settings.
            </Text>

            <View style={{ gap: 12 }}>
              {[
                { value: "male", label: "Male" },
                { value: "female", label: "Female" },
              ].map(({ value, label }) => {
                const active = gender === value;
                return (
                  <TouchableOpacity
                    key={value}
                    onPress={() => setGender(value)}
                    style={{
                      paddingVertical: 18,
                      paddingHorizontal: 20,
                      borderRadius: 16,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      backgroundColor: active ? `${C.accent}14` : C.card,
                      borderWidth: 1.5,
                      borderColor: active ? `${C.accent}50` : C.border,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: F.semi,
                        fontSize: 16,
                        color: active ? C.accent : C.text,
                      }}
                    >
                      {label}
                    </Text>
                    {active && (
                      <View
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 11,
                          backgroundColor: C.accent,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Check size={13} color="#0F1117" strokeWidth={3} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </Animated.View>
        )}

        {/* Location step */}
        {step === 1 && (
          <Animated.View
            key="location"
            entering={FadeInRight.duration(350)}
            style={{ flex: 1 }}
          >
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 16,
                  backgroundColor: C.cardAlt,
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 24,
                }}
              >
                <MapPin size={24} color={C.textSec} strokeWidth={1.8} />
              </View>
              <Text style={{ fontFamily: F.bold, fontSize: 28, color: C.text, letterSpacing: -0.5, marginBottom: 10 }}>
                Your location
              </Text>
              <Text style={{ fontFamily: F.reg, fontSize: 15, color: C.textSec, lineHeight: 24, marginBottom: 32 }}>
                Accurate prayer times require your coordinates. You can always change this in Settings.
              </Text>

              {/* Toggle */}
              <View
                style={{
                  flexDirection: "row",
                  backgroundColor: C.cardAlt,
                  borderRadius: 12,
                  padding: 4,
                  marginBottom: 24,
                }}
              >
                {[{ key: "auto", label: "Auto GPS" }, { key: "manual", label: "Manual" }].map(({ key, label }) => (
                  <TouchableOpacity
                    key={key}
                    onPress={() => { setLocType(key); setDetected(false); }}
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      borderRadius: 9,
                      alignItems: "center",
                      backgroundColor: locType === key ? C.card : "transparent",
                    }}
                  >
                    <Text style={{ fontFamily: F.semi, fontSize: 14, color: locType === key ? C.text : C.textSec }}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {locType === "auto" ? (
                <View>
                  {!detected ? (
                    <TouchableOpacity
                      onPress={detectLocation}
                      disabled={detecting}
                      style={{
                        backgroundColor: C.accent,
                        borderRadius: 14,
                        paddingVertical: 16,
                        alignItems: "center",
                        flexDirection: "row",
                        justifyContent: "center",
                        gap: 10,
                        opacity: detecting ? 0.7 : 1,
                      }}
                    >
                      {detecting ? (
                        <ActivityIndicator size="small" color="#0F1117" />
                      ) : (
                        <Navigation size={18} color="#0F1117" strokeWidth={2} />
                      )}
                      <Text style={{ fontFamily: F.bold, fontSize: 15, color: "#0F1117" }}>
                        {detecting ? "Detecting…" : "Detect My Location"}
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <View
                      style={{
                        backgroundColor: `${C.accent}12`,
                        borderRadius: 14,
                        padding: 16,
                        borderWidth: 1,
                        borderColor: `${C.accent}35`,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 12,
                      }}
                    >
                      <View
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 16,
                          backgroundColor: C.accent,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Check size={16} color="#0F1117" strokeWidth={3} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontFamily: F.bold, fontSize: 15, color: C.accent }}>
                          {city}
                        </Text>
                        <Text style={{ fontFamily: F.reg, fontSize: 12, color: C.textSec, marginTop: 2 }}>
                          {lat}, {lon} · UTC{parseFloat(tz) >= 0 ? "+" : ""}{tz}
                        </Text>
                      </View>
                      <TouchableOpacity onPress={() => { setDetected(false); }}>
                        <Text style={{ fontFamily: F.semi, fontSize: 13, color: C.textSec }}>Re-detect</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ) : (
                <View style={{ gap: 12 }}>
                  {/* Search input */}
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: C.cardAlt,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: searchQuery ? C.accent : C.border,
                      paddingHorizontal: 12,
                      gap: 8,
                    }}
                  >
                    {searching ? (
                      <ActivityIndicator size="small" color={C.textSec} />
                    ) : (
                      <Search size={16} color={C.textSec} strokeWidth={2} />
                    )}
                    <TextInput
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      placeholder="Search for a city…"
                      placeholderTextColor={C.textDim}
                      returnKeyType="search"
                      style={{ flex: 1, fontFamily: F.semi, fontSize: 14, color: C.text, paddingVertical: 13 }}
                    />
                    {searchQuery.length > 0 && (
                      <TouchableOpacity onPress={() => { setSearchQuery(""); setSearchResults([]); }}>
                        <X size={15} color={C.textSec} strokeWidth={2} />
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Search results */}
                  {searchResults.length > 0 && (
                    <View
                      style={{
                        backgroundColor: C.cardAlt,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: C.border,
                        overflow: "hidden",
                      }}
                    >
                      {searchResults.map((place, idx) => (
                        <TouchableOpacity
                          key={place.id}
                          onPress={() => selectPlace(place)}
                          style={{
                            paddingHorizontal: 14,
                            paddingVertical: 12,
                            borderTopWidth: idx > 0 ? 1 : 0,
                            borderTopColor: C.border,
                          }}
                        >
                          <Text style={{ fontFamily: F.semi, fontSize: 14, color: C.text }}>
                            {place.shortName}
                          </Text>
                          <Text style={{ fontFamily: F.reg, fontSize: 11, color: C.textSec, marginTop: 2 }} numberOfLines={1}>
                            {place.displayName}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  {/* Editable fields */}
                  {[
                    { label: "City Name", value: city, setter: setCity, keyboard: "default" },
                    { label: "Latitude", value: lat, setter: setLat, keyboard: "numbers-and-punctuation" },
                    { label: "Longitude", value: lon, setter: setLon, keyboard: "numbers-and-punctuation" },
                    { label: "UTC Offset", value: fetchingTz ? "…" : tz, setter: setTz, keyboard: "numbers-and-punctuation" },
                  ].map(({ label, value, setter, keyboard }) => (
                    <View key={label}>
                      <Text style={{ fontFamily: F.med, fontSize: 12, color: C.textSec, marginBottom: 6 }}>
                        {label}
                      </Text>
                      <TextInput
                        value={value}
                        onChangeText={setter}
                        keyboardType={keyboard}
                        placeholderTextColor={C.textDim}
                        editable={!fetchingTz}
                        style={{
                          backgroundColor: C.cardAlt,
                          borderRadius: 10,
                          padding: 14,
                          fontFamily: F.semi,
                          fontSize: 15,
                          color: fetchingTz ? C.textDim : C.text,
                          borderWidth: 1,
                          borderColor: C.border,
                        }}
                      />
                    </View>
                  ))}
                </View>
              )}

              <View style={{ height: 120 }} />
            </ScrollView>
          </Animated.View>
        )}

        {/* Sunnah step */}
        {step === 2 && (
          <Animated.View
            key="sunnah"
            entering={FadeInRight.duration(350)}
            style={{ flex: 1 }}
          >
            <View
              style={{
                width: 52,
                height: 52,
                borderRadius: 16,
                backgroundColor: C.cardAlt,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 24,
              }}
            >
              <BookOpen size={24} color={C.textSec} strokeWidth={1.8} />
            </View>
            <Text style={{ fontFamily: F.bold, fontSize: 28, color: C.text, letterSpacing: -0.5, marginBottom: 10 }}>
              Track Sunnah prayers?
            </Text>
            <Text style={{ fontFamily: F.reg, fontSize: 15, color: C.textSec, lineHeight: 24, marginBottom: 36 }}>
              Sunnah Muakkadah are the voluntary prayers performed before or after the obligatory prayers. You can toggle this later in Settings.
            </Text>

            <View
              style={{
                backgroundColor: C.card,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: C.border,
                marginBottom: 20,
                overflow: "hidden",
              }}
            >
              {[
                { value: true, label: "Yes, track Sunnah prayers", sub: "Shows Sunnah chips on prayer cards and in statistics" },
                { value: false, label: "No, just obligatory prayers", sub: "Only track the 5 daily Fard prayers" },
              ].map(({ value, label, sub }, i) => {
                const active = sunnah === value;
                return (
                  <TouchableOpacity
                    key={String(value)}
                    onPress={() => setSunnah(value)}
                    style={{
                      paddingVertical: 16,
                      paddingHorizontal: 18,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 14,
                      borderTopWidth: i > 0 ? 1 : 0,
                      borderTopColor: C.border,
                      backgroundColor: active ? `${C.accent}10` : "transparent",
                    }}
                  >
                    <View
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 11,
                        borderWidth: 2,
                        borderColor: active ? C.accent : C.border,
                        backgroundColor: active ? C.accent : "transparent",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {active && <Check size={12} color="#0F1117" strokeWidth={3} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: F.semi, fontSize: 15, color: active ? C.accent : C.text }}>
                        {label}
                      </Text>
                      <Text style={{ fontFamily: F.reg, fontSize: 12, color: C.textSec, marginTop: 3 }}>
                        {sub}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Animated.View>
        )}

        {/* Continue / Finish button */}
        {step >= 0 && (
          <TouchableOpacity
            onPress={handleContinue}
            disabled={!canContinue()}
            style={{
              backgroundColor: canContinue() ? C.accent : C.cardAlt,
              borderRadius: 16,
              paddingVertical: 16,
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "center",
              gap: 8,
              marginTop: 12,
            }}
          >
            <Text
              style={{
                fontFamily: F.bold,
                fontSize: 16,
                color: canContinue() ? "#0F1117" : C.textDim,
              }}
            >
              {step === STEPS.length - 1 ? "Start Praying" : "Continue"}
            </Text>
            {canContinue() && step < STEPS.length - 1 && (
              <ChevronRight size={18} color="#0F1117" strokeWidth={2.5} />
            )}
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
