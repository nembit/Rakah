import { useState, useCallback, useEffect } from "react";
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
  Linking,
  ActivityIndicator,
  KeyboardAvoidingView,
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
  Clock,
  User,
  Search,
  X,
  Star,
  MessageCircle,
  Trash2,
} from "lucide-react-native";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import * as StoreReview from "expo-store-review";
import * as DocumentPicker from "expo-document-picker";
import {
  cacheDirectory,
  documentDirectory,
  EncodingType,
  writeAsStringAsync,
  readAsStringAsync,
} from "expo-file-system";
import usePrayerStore from "@/store/prayerStore";
import { getMethods } from "@/utils/prayerTimes";
import { searchPlaces, getTimezoneOffset } from "@/utils/locationSearch";
import { useTabletLayout } from "@/utils/useTabletLayout";

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
const FEEDBACK_EMAIL = "support@rakah.app";

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
  const [city, setCity] = useState(current?.city || "New York");
  const [lat, setLat] = useState(String(current?.latitude || "40.7128"));
  const [lon, setLon] = useState(String(current?.longitude || "-74.0060"));
  const [tz, setTz] = useState(String(current?.timezone ?? "-4"));
  const [loading, setLoading] = useState(false);

  // Search state
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
    setFetchingTz(true);
    const offset = await getTimezoneOffset(place.lat, place.lon);
    setTz(String(offset));
    setFetchingTz(false);
  };

  const detectLocation = async () => {
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Location permission is needed for prayer times.");
        setLoading(false);
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
    } catch {
      Alert.alert("Error", "Could not detect location.");
    }
    setLoading(false);
  };

  const handleSave = () => {
    onSave({
      type: locType,
      latitude: parseFloat(lat) || 40.7128,
      longitude: parseFloat(lon) || -74.006,
      city: city || "New York",
      timezone: parseFloat(tz) || -4,
    });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.75)", justifyContent: "flex-end" }}
          onPress={onClose}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View
              style={{
                backgroundColor: C.card,
                borderTopLeftRadius: 28,
                borderTopRightRadius: 28,
                paddingBottom: 40,
              }}
            >
              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ padding: 24, paddingBottom: 56 }}
              >
                <View style={{ width: 36, height: 4, backgroundColor: C.border, borderRadius: 2, alignSelf: "center", marginBottom: 20 }} />
                <Text style={{ fontFamily: F.bold, fontSize: 18, color: C.text, textAlign: "center", marginBottom: 20 }}>
                  Location
                </Text>

                {/* Auto / Manual tab */}
                <View style={{ flexDirection: "row", backgroundColor: C.cardAlt, borderRadius: 12, padding: 4, marginBottom: 20 }}>
                  {["auto", "manual"].map((t) => (
                    <TouchableOpacity
                      key={t}
                      onPress={() => setLocType(t)}
                      style={{ flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: "center", backgroundColor: locType === t ? C.card : "transparent" }}
                    >
                      <Text style={{ fontFamily: F.semi, fontSize: 13, color: locType === t ? C.text : C.textSec }}>
                        {t === "auto" ? "Auto GPS" : "Search / Manual"}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {locType === "auto" ? (
                  <TouchableOpacity
                    onPress={detectLocation}
                    disabled={loading}
                    style={{ backgroundColor: C.accent, borderRadius: 14, paddingVertical: 15, alignItems: "center", marginBottom: 16, flexDirection: "row", justifyContent: "center", gap: 10 }}
                  >
                    {loading ? <ActivityIndicator size="small" color="#0F1117" /> : <Navigation size={18} color="#0F1117" strokeWidth={2} />}
                    <Text style={{ fontFamily: F.bold, fontSize: 15, color: "#0F1117" }}>
                      {loading ? "Detecting..." : "Detect My Location"}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <>
                    {/* Search input */}
                    <View style={{ marginBottom: 6 }}>
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

                      {/* Results dropdown */}
                      {searchResults.length > 0 && (
                        <View
                          style={{
                            marginTop: 4,
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
                    </View>

                    {/* Editable fields */}
                    {[
                      { label: "City Name", value: city, setter: setCity, keyboard: "default" },
                      { label: "Latitude", value: lat, setter: setLat, keyboard: "numbers-and-punctuation" },
                      { label: "Longitude", value: lon, setter: setLon, keyboard: "numbers-and-punctuation" },
                      { label: "UTC Offset", value: fetchingTz ? "…" : tz, setter: setTz, keyboard: "numbers-and-punctuation" },
                    ].map(({ label, value, setter, keyboard }) => (
                      <View key={label} style={{ marginBottom: 12 }}>
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
                            backgroundColor: C.bg,
                            borderRadius: 10,
                            padding: 12,
                            fontFamily: F.semi,
                            fontSize: 15,
                            color: fetchingTz ? C.textDim : C.text,
                            borderWidth: 1,
                            borderColor: C.border,
                          }}
                        />
                      </View>
                    ))}
                  </>
                )}

                <TouchableOpacity
                  onPress={handleSave}
                  style={{ backgroundColor: C.accent, borderRadius: 14, paddingVertical: 15, alignItems: "center", marginTop: 8 }}
                >
                  <Text style={{ fontFamily: F.bold, fontSize: 15, color: "#0F1117" }}>
                    Save Location
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function ImportDataModal({
  visible,
  onClose,
  importText,
  onChangeImportText,
  onPickFile,
  onImport,
  importing,
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.75)", justifyContent: "center", padding: 20 }}
        onPress={onClose}
      >
        <Pressable onPress={(e) => e.stopPropagation()}>
          <View
            style={{
              backgroundColor: C.card,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: C.border,
              padding: 18,
            }}
          >
            <Text style={{ fontFamily: F.bold, fontSize: 16, color: C.text, marginBottom: 10 }}>
              Import Data
            </Text>
            <Text style={{ fontFamily: F.reg, fontSize: 12, color: C.textSec, marginBottom: 14, lineHeight: 18 }}>
              Restore from a JSON backup exported from Rakah.
            </Text>

            <TouchableOpacity
              onPress={onPickFile}
              style={{
                borderRadius: 12,
                borderWidth: 1,
                borderColor: C.border,
                backgroundColor: C.cardAlt,
                paddingVertical: 12,
                paddingHorizontal: 14,
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                marginBottom: 12,
              }}
            >
              <Upload size={16} color={C.textSec} strokeWidth={1.8} />
              <Text style={{ fontFamily: F.semi, fontSize: 13, color: C.text }}>
                Pick a backup file
              </Text>
            </TouchableOpacity>

            <TextInput
              value={importText}
              onChangeText={onChangeImportText}
              placeholder="…or paste your JSON backup here"
              placeholderTextColor={C.textDim}
              multiline
              textAlignVertical="top"
              style={{
                height: 170,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: C.border,
                backgroundColor: C.bg,
                padding: 12,
                color: C.text,
                fontFamily: F.reg,
                fontSize: 12,
              }}
            />

            <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
              <TouchableOpacity
                onPress={onClose}
                disabled={importing}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 12,
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: C.border,
                  backgroundColor: "transparent",
                }}
              >
                <Text style={{ fontFamily: F.semi, fontSize: 13, color: importing ? C.textDim : C.textSec }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onImport}
                disabled={importing}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 12,
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: importing ? C.border : C.accentDim,
                  backgroundColor: importing ? C.cardAlt : C.accent,
                }}
              >
                {importing ? (
                  <ActivityIndicator size="small" color="#0F1117" />
                ) : (
                  <Text style={{ fontFamily: F.bold, fontSize: 13, color: "#0F1117" }}>
                    Import
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { contentStyle } = useTabletLayout();
  const settings = usePrayerStore((s) => s.settings);
  const updateSettings = usePrayerStore((s) => s.updateSettings);
  const updateLocation = usePrayerStore((s) => s.updateLocation);
  const exportData = usePrayerStore((s) => s.exportData);
  const importData = usePrayerStore((s) => s.importData);
  const clearAllData = usePrayerStore((s) => s.clearAllData);

  const [methodModal, setMethodModal] = useState(false);
  const [locationModal, setLocationModal] = useState(false);
  const [support, setSupport] = useState(false);
  const [importModal, setImportModal] = useState(false);
  const [importText, setImportText] = useState("");
  const [importing, setImporting] = useState(false);

  const requestNotificationPermissionIfNeeded = async () => {
    try {
      const existing = await Notifications.getPermissionsAsync();
      if (existing.granted) return true;

      const requested = await Notifications.requestPermissionsAsync();
      return !!requested.granted;
    } catch (e) {
      return false;
    }
  };

  const toggleNotif = async (prayer) => {
    const currentlyEnabled = !!settings.notifications?.[prayer];
    if (!currentlyEnabled) {
      const granted = await requestNotificationPermissionIfNeeded();
      if (!granted) {
        Alert.alert(
          "Notifications Disabled",
          "Please allow notification permission to enable prayer reminders.",
        );
        return;
      }
    }

    const newNotif = {
      ...settings.notifications,
      [prayer]: !currentlyEnabled,
    };
    updateSettings({ notifications: newNotif });
  };

  const handleExport = async () => {
    const json = await exportData();
    try {
      const dateStr = new Date().toISOString().slice(0, 10);
      const filename = `rakah-backup-${dateStr}.json`;

      if (Platform.OS === "web") {
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        return;
      }

      const dir = cacheDirectory || documentDirectory;
      const fileUri = `${dir}${filename}`;
      await writeAsStringAsync(fileUri, json, {
        encoding: EncodingType.UTF8,
      });

      await Share.share({
        title: "Rakah Data Export",
        message: "Rakah backup attached.",
        url: fileUri,
      });
    } catch (e) {
      Alert.alert("Export", "Could not share data.");
    }
  };

  const handlePickImportFile = async () => {
    try {
      if (Platform.OS === "web") {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "application/json,.json,.txt";
        input.onchange = () => {
          const file = input.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = () => {
            const text = typeof reader.result === "string" ? reader.result : "";
            setImportText(text);
          };
          reader.readAsText(file);
        };
        input.click();
        return;
      }

      const res = await DocumentPicker.getDocumentAsync({
        type: ["application/json", "text/plain"],
        copyToCacheDirectory: true,
      });
      if (res.canceled) return;
      const asset = res.assets?.[0];
      if (!asset?.uri) return;
      const text = await readAsStringAsync(asset.uri, {
        encoding: EncodingType.UTF8,
      });
      setImportText(text);
    } catch {
      Alert.alert("Import", "Could not read the selected file.");
    }
  };

  const handleImport = async () => {
    if (!importText.trim()) {
      Alert.alert("Import", "Paste JSON or pick a backup file first.");
      return;
    }
    Alert.alert(
      "Import backup?",
      "This will overwrite your current prayer logs, Qada counts, and settings on this device.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Import",
          style: "destructive",
          onPress: async () => {
            setImporting(true);
            const res = await importData(importText);
            setImporting(false);
            if (res?.success) {
              setImportText("");
              setImportModal(false);
              Alert.alert("Import", "Imported successfully.");
            } else {
              Alert.alert("Import failed", res?.error || "Invalid JSON backup.");
            }
          },
        },
      ],
    );
  };

  const handleClearAllData = () => {
    Alert.alert(
      "Clear all app data?",
      "This will permanently remove prayer logs, Qada data, settings, and local backups in app storage. You can import a backup afterward if needed.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: async () => {
            const res = await clearAllData();
            if (res?.success) {
              Alert.alert("Data cleared", "All local app data has been removed.");
            } else {
              Alert.alert("Could not clear data", res?.error || "Please try again.");
            }
          },
        },
      ],
    );
  };

  const handleRateApp = async () => {
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

  const handleSendFeedback = async () => {
    const subject = encodeURIComponent("Rakah feedback");
    const body = encodeURIComponent(
      "Assalamu alaikum,\n\nI wanted to share feedback about Rakah:\n\n",
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
        message:
          "Assalamu alaikum,\n\nI wanted to share feedback about Rakah:\n\n",
      });
    } catch {
      Alert.alert("Feedback", "Could not open feedback options right now.");
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
    {
      label: "Custom amount",
      price: "Choose",
      desc: "Pick your own support amount ✨",
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
      <ImportDataModal
        visible={importModal}
        onClose={() => setImportModal(false)}
        importText={importText}
        onChangeImportText={setImportText}
        onPickFile={handlePickImportFile}
        onImport={handleImport}
        importing={importing}
      />

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={contentStyle}>
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
              noBorder={false}
            />
            <SettingRow
              icon={Clock}
              label="24-hour time"
              subtitle={settings.use24HourTime ? "On" : "Off"}
              right={
                <Switch
                  value={!!settings.use24HourTime}
                  onValueChange={(v) => updateSettings({ use24HourTime: v })}
                  trackColor={{ false: C.cardAlt, true: C.accentDim }}
                  thumbColor={settings.use24HourTime ? C.accent : C.textDim}
                />
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

          {/* Rate & feedback */}
          <SectionHeader title="RATE & FEEDBACK" />
          <Animated.View
            entering={FadeInDown.delay(140)}
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
              icon={Star}
              label="Rate Rakah"
              subtitle="Leave a quick rating"
              onPress={handleRateApp}
              right={<ChevronRight size={16} color={C.textDim} strokeWidth={1.8} />}
            />
            <SettingRow
              icon={MessageCircle}
              label="Send Feedback"
              subtitle="Email feedback directly"
              onPress={handleSendFeedback}
              noBorder
              right={<ChevronRight size={16} color={C.textDim} strokeWidth={1.8} />}
            />
          </Animated.View>

          {/* Profile */}
          <SectionHeader title="PROFILE" />
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
            <View
              style={{
                paddingVertical: 14,
                paddingHorizontal: 18,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 14 }}>
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
                  <User size={16} color={C.textSec} strokeWidth={1.8} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: F.semi, fontSize: 15, color: C.text }}>
                    Gender
                  </Text>
                  <Text style={{ fontFamily: F.reg, fontSize: 12, color: C.textSec, marginTop: 2 }}>
                    Required for certain app functionality
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {[
                  { value: "male", label: "Male" },
                  { value: "female", label: "Female" },
                ].map(({ value, label }) => {
                  const active = settings.gender === value;
                  return (
                    <TouchableOpacity
                      key={value}
                      onPress={() => updateSettings({ gender: value })}
                      style={{
                        flex: 1,
                        paddingVertical: 12,
                        borderRadius: 12,
                        alignItems: "center",
                        backgroundColor: active ? `${C.accent}18` : C.cardAlt,
                        borderWidth: 1,
                        borderColor: active ? `${C.accent}45` : C.border,
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: F.semi,
                          fontSize: 14,
                          color: active ? C.accent : C.textSec,
                        }}
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </Animated.View>

          {/* Tracking */}
          <SectionHeader title="TRACKING" />
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
              icon={BookOpen}
              label="Sunnah Prayers"
              subtitle="Track optional prayers"
              noBorder={false}
              right={
                <Switch
                  value={!!settings.sunnahTracking}
                  onValueChange={(v) => updateSettings({ sunnahTracking: v })}
                  trackColor={{ false: C.cardAlt, true: C.accentDim }}
                  thumbColor={settings.sunnahTracking ? C.accent : C.textDim}
                />
              }
            />
            <SettingRow
              icon={Navigation}
              label="Vibrations"
              subtitle="Haptic feedback for taps and actions"
              noBorder
              right={
                <Switch
                  value={settings.vibrations !== false}
                  onValueChange={(v) => updateSettings({ vibrations: v })}
                  trackColor={{ false: C.cardAlt, true: C.accentDim }}
                  thumbColor={settings.vibrations !== false ? C.accent : C.textDim}
                />
              }
            />
          </Animated.View>

          {/* Data */}
          <SectionHeader title="DATA & PRIVACY" />
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
              onPress={() => setImportModal(true)}
              right={
                <ChevronRight size={16} color={C.textDim} strokeWidth={1.8} />
              }
              noBorder={false}
            />
            <SettingRow
              icon={Trash2}
              label="Clear All Data"
              subtitle="Permanently remove all local app data"
              onPress={handleClearAllData}
              right={
                <ChevronRight size={16} color={C.red} strokeWidth={1.8} />
              }
              noBorder
            />
          </Animated.View>

          {/* Support */}
          <SectionHeader title="SUPPORT RAKAH" />
          <Animated.View
            entering={FadeInDown.delay(280)}
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
                helps your prayer, consider supporting us — it keeps
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
              marginBottom: 10,
            }}
          >
            Rakah v1.0 · All data stored locally · No account required
          </Text>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center",
              gap: 8,
              marginBottom: 20,
            }}
          >
            <TouchableOpacity
              onPress={() =>
                Linking.openURL("https://sites.google.com/view/rakah-privacy-policy/home")
              }
              activeOpacity={0.7}
            >
              <Text
                style={{
                  fontFamily: F.semi,
                  fontSize: 12,
                  color: C.textSec,
                  textDecorationLine: "underline",
                }}
              >
                Privacy Policy
              </Text>
            </TouchableOpacity>
            <Text style={{ fontFamily: F.reg, fontSize: 12, color: C.textDim }}>·</Text>
            <TouchableOpacity
              onPress={() =>
                Linking.openURL("https://sites.google.com/view/rakah-terms-of-service/home")
              }
              activeOpacity={0.7}
            >
              <Text
                style={{
                  fontFamily: F.semi,
                  fontSize: 12,
                  color: C.textSec,
                  textDecorationLine: "underline",
                }}
              >
                Terms of Service
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        </View>
      </ScrollView>
    </View>
  );
}
