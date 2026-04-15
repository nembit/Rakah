import { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Modal,
  Pressable,
  TextInput,
  Alert,
  Share,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import {
  ChevronLeft,
  MapPin,
  Bell,
  BookOpen,
  Download,
  Upload,
  Heart,
  CheckCircle,
  ChevronRight,
  Navigation,
  Globe,
} from "lucide-react-native";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import usePrayerStore from "@/store/prayerStore";
import { getMethods } from "@/utils/prayerTimes";

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

function SectionHeader({ title }) {
  return (
    <Text
      style={{
        fontFamily: F.semi,
        fontSize: 12,
        color: C.textSec,
        letterSpacing: 0.8,
        marginBottom: 10,
        marginTop: 8,
        paddingHorizontal: 4,
      }}
    >
      {title}
    </Text>
  );
}

function SettingRow({ icon: Icon, label, subtitle, right, onPress, noBorder }) {
  const Inner = (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 14,
        paddingHorizontal: 18,
        borderBottomWidth: noBorder ? 0 : 1,
        borderColor: C.border,
      }}
    >
      {Icon && (
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            backgroundColor: C.cardAlt,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 14,
          }}
        >
          <Icon size={16} color={C.textSec} strokeWidth={1.8} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: F.semi, fontSize: 15, color: C.text }}>
          {label}
        </Text>
        {subtitle ? (
          <Text
            style={{
              fontFamily: F.reg,
              fontSize: 12,
              color: C.textSec,
              marginTop: 2,
            }}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
    </View>
  );
  if (onPress)
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {Inner}
      </TouchableOpacity>
    );
  return Inner;
}

function MethodModal({ visible, current, onClose, onSelect }) {
  const methods = getMethods();
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
                marginBottom: 20,
              }}
            >
              Calculation Method
            </Text>
            {methods.map(({ key, name }) => (
              <TouchableOpacity
                key={key}
                onPress={() => {
                  onSelect(key);
                  onClose();
                }}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 14,
                  paddingHorizontal: 16,
                  backgroundColor:
                    current === key ? `${C.accent}15` : "transparent",
                  borderRadius: 12,
                  marginBottom: 6,
                  borderWidth: 1,
                  borderColor:
                    current === key ? `${C.accent}40` : "transparent",
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontFamily: F.semi,
                      fontSize: 15,
                      color: current === key ? C.accent : C.text,
                    }}
                  >
                    {key}
                  </Text>
                  <Text
                    style={{
                      fontFamily: F.reg,
                      fontSize: 12,
                      color: C.textSec,
                      marginTop: 2,
                    }}
                  >
                    {name}
                  </Text>
                </View>
                {current === key && (
                  <CheckCircle size={18} color={C.accent} strokeWidth={2} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function LocationModal({ visible, current, onClose, onSave }) {
  const [locType, setLocType] = useState(current?.type || "auto");
  const [city, setCity] = useState(current?.city || "");
  const [lat, setLat] = useState(String(current?.latitude || ""));
  const [lon, setLon] = useState(String(current?.longitude || ""));
  const [tz, setTz] = useState(String(current?.timezone ?? ""));
  const [loading, setLoading] = useState(false);

  const detectLocation = async () => {
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "Location permission is needed for prayer times.",
        );
        setLoading(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const [geo] = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
      const tzOffset = -(new Date().getTimezoneOffset() / 60);
      setLat(String(loc.coords.latitude.toFixed(4)));
      setLon(String(loc.coords.longitude.toFixed(4)));
      setTz(String(tzOffset));
      setCity(geo?.city || geo?.region || "My Location");
    } catch (e) {
      Alert.alert("Error", "Could not detect location.");
    }
    setLoading(false);
  };

  const handleSave = () => {
    const location = {
      type: locType,
      latitude: parseFloat(lat) || 40.7128,
      longitude: parseFloat(lon) || -74.006,
      city: city || "My Location",
      timezone: parseFloat(tz) || -4,
    };
    onSave(location);
    onClose();
  };

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
                marginBottom: 20,
              }}
            >
              Location
            </Text>
            <View
              style={{
                flexDirection: "row",
                backgroundColor: C.cardAlt,
                borderRadius: 12,
                padding: 4,
                marginBottom: 20,
              }}
            >
              {["auto", "manual"].map((t) => (
                <TouchableOpacity
                  key={t}
                  onPress={() => setLocType(t)}
                  style={{
                    flex: 1,
                    paddingVertical: 9,
                    borderRadius: 9,
                    alignItems: "center",
                    backgroundColor: locType === t ? C.card : "transparent",
                  }}
                >
                  <Text
                    style={{
                      fontFamily: F.semi,
                      fontSize: 13,
                      color: locType === t ? C.text : C.textSec,
                    }}
                  >
                    {t === "auto" ? "Auto GPS" : "Manual"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {locType === "auto" ? (
              <TouchableOpacity
                onPress={detectLocation}
                disabled={loading}
                style={{
                  backgroundColor: C.accent,
                  borderRadius: 14,
                  paddingVertical: 15,
                  alignItems: "center",
                  marginBottom: 16,
                  flexDirection: "row",
                  justifyContent: "center",
                  gap: 10,
                }}
              >
                <Navigation size={18} color="#0F1117" strokeWidth={2} />
                <Text
                  style={{ fontFamily: F.bold, fontSize: 15, color: "#0F1117" }}
                >
                  {loading ? "Detecting..." : "Detect My Location"}
                </Text>
              </TouchableOpacity>
            ) : null}
            {["City Name", "Latitude", "Longitude", "UTC Offset"].map(
              (label, i) => {
                const vals = [city, lat, lon, tz];
                const setters = [setCity, setLat, setLon, setTz];
                return (
                  <View key={label} style={{ marginBottom: 12 }}>
                    <Text
                      style={{
                        fontFamily: F.med,
                        fontSize: 12,
                        color: C.textSec,
                        marginBottom: 6,
                      }}
                    >
                      {label}
                    </Text>
                    <TextInput
                      value={vals[i]}
                      onChangeText={setters[i]}
                      keyboardType={
                        i === 0 ? "default" : "numbers-and-punctuation"
                      }
                      placeholder={["New York", "40.7128", "-74.0060", "-4"][i]}
                      placeholderTextColor={C.textDim}
                      style={{
                        backgroundColor: C.cardAlt,
                        borderRadius: 10,
                        padding: 12,
                        fontFamily: F.semi,
                        fontSize: 15,
                        color: C.text,
                        borderWidth: 1,
                        borderColor: C.border,
                      }}
                    />
                  </View>
                );
              },
            )}
            <TouchableOpacity
              onPress={handleSave}
              style={{
                backgroundColor: C.accent,
                borderRadius: 14,
                paddingVertical: 15,
                alignItems: "center",
                marginTop: 8,
              }}
            >
              <Text
                style={{ fontFamily: F.bold, fontSize: 15, color: "#0F1117" }}
              >
                Save Location
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const settings = usePrayerStore((s) => s.settings);
  const updateSettings = usePrayerStore((s) => s.updateSettings);
  const updateLocation = usePrayerStore((s) => s.updateLocation);
  const exportData = usePrayerStore((s) => s.exportData);

  const [methodModal, setMethodModal] = useState(false);
  const [locationModal, setLocationModal] = useState(false);
  const [support, setSupport] = useState(false);

  const toggleNotif = (prayer) => {
    const newNotif = {
      ...settings.notifications,
      [prayer]: !settings.notifications[prayer],
    };
    updateSettings({ notifications: newNotif });
  };

  const handleExport = async () => {
    const json = await exportData();
    try {
      await Share.share({ message: json, title: "Rakah Data Export" });
    } catch (e) {
      Alert.alert("Export", "Could not share data.");
    }
  };

  const SUPPORT_TIERS = [
    { label: "One-time gift", price: "$2.99", desc: "Buy us a coffee ☕" },
    {
      label: "Monthly supporter",
      price: "$0.99/mo",
      desc: "Keep the lights on 🌙",
    },
    {
      label: "Lifetime supporter",
      price: "$9.99",
      desc: "Forever grateful 💚",
    },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <MethodModal
        visible={methodModal}
        current={settings.calcMethod}
        onClose={() => setMethodModal(false)}
        onSelect={(method) => updateSettings({ calcMethod: method })}
      />
      <LocationModal
        visible={locationModal}
        current={settings.location}
        onClose={() => setLocationModal(false)}
        onSave={updateLocation}
      />

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View
          style={{
            paddingTop: insets.top + 12,
            paddingHorizontal: 20,
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            marginBottom: 28,
          }}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: C.card,
              borderWidth: 1,
              borderColor: C.border,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ChevronLeft size={18} color={C.textSec} strokeWidth={2} />
          </TouchableOpacity>
          <Text style={{ fontFamily: F.bold, fontSize: 22, color: C.text }}>
            Settings
          </Text>
        </View>

        <View style={{ paddingHorizontal: 20 }}>
          {/* Prayer Times */}
          <SectionHeader title="PRAYER TIMES" />
          <Animated.View
            entering={FadeInDown.delay(60)}
            style={{
              backgroundColor: C.card,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: C.border,
              marginBottom: 20,
              overflow: "hidden",
            }}
          >
            <SettingRow
              icon={Globe}
              label="Calculation Method"
              subtitle={
                getMethods().find((m) => m.key === settings.calcMethod)?.name ||
                settings.calcMethod
              }
              onPress={() => setMethodModal(true)}
              right={
                <ChevronRight size={16} color={C.textDim} strokeWidth={1.8} />
              }
            />
            <SettingRow
              icon={MapPin}
              label="Location"
              subtitle={settings.location.city}
              onPress={() => setLocationModal(true)}
              right={
                <ChevronRight size={16} color={C.textDim} strokeWidth={1.8} />
              }
              noBorder
            />
          </Animated.View>

          {/* Notifications */}
          <SectionHeader title="NOTIFICATIONS" />
          <Animated.View
            entering={FadeInDown.delay(120)}
            style={{
              backgroundColor: C.card,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: C.border,
              marginBottom: 20,
              overflow: "hidden",
            }}
          >
            {PRAYERS.map((prayer, i) => (
              <SettingRow
                key={prayer}
                icon={Bell}
                label={prayer}
                noBorder={i === PRAYERS.length - 1}
                right={
                  <Switch
                    value={!!settings.notifications?.[prayer]}
                    onValueChange={() => toggleNotif(prayer)}
                    trackColor={{ false: C.cardAlt, true: C.accentDim }}
                    thumbColor={
                      settings.notifications?.[prayer] ? C.accent : C.textDim
                    }
                  />
                }
              />
            ))}
          </Animated.View>

          {/* Tracking */}
          <SectionHeader title="TRACKING" />
          <Animated.View
            entering={FadeInDown.delay(160)}
            style={{
              backgroundColor: C.card,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: C.border,
              marginBottom: 20,
              overflow: "hidden",
            }}
          >
            <SettingRow
              icon={BookOpen}
              label="Sunnah Prayers"
              subtitle="Track optional prayers"
              noBorder
              right={
                <Switch
                  value={!!settings.sunnahTracking}
                  onValueChange={(v) => updateSettings({ sunnahTracking: v })}
                  trackColor={{ false: C.cardAlt, true: C.accentDim }}
                  thumbColor={settings.sunnahTracking ? C.accent : C.textDim}
                />
              }
            />
          </Animated.View>

          {/* Data */}
          <SectionHeader title="DATA & PRIVACY" />
          <Animated.View
            entering={FadeInDown.delay(200)}
            style={{
              backgroundColor: C.card,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: C.border,
              marginBottom: 20,
              overflow: "hidden",
            }}
          >
            <SettingRow
              icon={Download}
              label="Export Data"
              subtitle="Save your data as JSON"
              onPress={handleExport}
              right={
                <ChevronRight size={16} color={C.textDim} strokeWidth={1.8} />
              }
            />
            <SettingRow
              icon={Upload}
              label="Import Data"
              subtitle="Restore from a backup"
              onPress={() =>
                Alert.alert(
                  "Import",
                  "To import, paste your JSON backup into the text field. This feature requires a file picker — coming soon!",
                )
              }
              right={
                <ChevronRight size={16} color={C.textDim} strokeWidth={1.8} />
              }
              noBorder
            />
          </Animated.View>

          {/* Support */}
          <SectionHeader title="SUPPORT RAKAH" />
          <Animated.View
            entering={FadeInDown.delay(240)}
            style={{
              backgroundColor: C.card,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: C.border,
              marginBottom: 20,
              overflow: "hidden",
            }}
          >
            <View style={{ padding: 20 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 10,
                }}
              >
                <Heart size={18} color={C.accent} strokeWidth={1.8} />
                <Text
                  style={{ fontFamily: F.bold, fontSize: 16, color: C.text }}
                >
                  Keep Rakah free for the Ummah
                </Text>
              </View>
              <Text
                style={{
                  fontFamily: F.reg,
                  fontSize: 13,
                  color: C.textSec,
                  lineHeight: 20,
                  marginBottom: 18,
                }}
              >
                Rakah is a free app with no ads and no data collection. If it
                helps your prayer practice, consider supporting us — it keeps
                the app alive and free for everyone.
              </Text>
              {SUPPORT_TIERS.map((tier, i) => (
                <TouchableOpacity
                  key={tier.label}
                  onPress={() =>
                    Alert.alert(
                      "Thank you!",
                      "In-app purchases coming soon. JazakAllah Khair for your support!",
                    )
                  }
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    padding: 16,
                    backgroundColor: C.cardAlt,
                    borderRadius: 14,
                    marginBottom: 10,
                    borderWidth: 1,
                    borderColor: C.border,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontFamily: F.semi,
                        fontSize: 15,
                        color: C.text,
                      }}
                    >
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
                      paddingHorizontal: 14,
                      paddingVertical: 7,
                      backgroundColor: `${C.accent}18`,
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: `${C.accent}35`,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: F.bold,
                        fontSize: 13,
                        color: C.accent,
                      }}
                    >
                      {tier.price}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>

          <Text
            style={{
              fontFamily: F.reg,
              fontSize: 12,
              color: C.textDim,
              textAlign: "center",
              marginBottom: 20,
            }}
          >
            Rakah v1.0 · All data stored locally · No account required
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
