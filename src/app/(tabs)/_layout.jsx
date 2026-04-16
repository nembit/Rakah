import { Tabs } from "expo-router";
import { Home, CalendarDays, RefreshCw, BarChart2 } from "lucide-react-native";
import { View, Text } from "react-native";

const COLORS = {
  bg: "#0F1117",
  card: "#1A1D27",
  accent: "#2ECC71",
  inactive: "#4B5563",
  border: "#1E2232",
  textPrimary: "#F9FAFB",
};

const F = "PlusJakartaSans_600SemiBold";

function TabIcon({ Icon, color, size, label, focused }) {
  return (
    <View style={{ alignItems: "center", justifyContent: "center" }}>
      <Icon size={22} color={color} strokeWidth={focused ? 2.2 : 1.8} />
      <Text
        numberOfLines={1}
        ellipsizeMode="clip"
        allowFontScaling={false}
        style={{
          fontFamily: F,
          fontSize: 9,
          color,
          marginTop: 3,
          textAlign: "center",
        }}
      >
        {label}
      </Text>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: "#13161F",
          borderTopWidth: 1,
          borderTopColor: "#1E2232",
          paddingBottom: 8,
          paddingTop: 12,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarActiveTintColor: COLORS.accent,
        tabBarInactiveTintColor: COLORS.inactive,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon Icon={Home} color={color} focused={focused} label="Home" />
          ),
        }}
      />
      <Tabs.Screen
        name="track"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              Icon={CalendarDays}
              color={color}
              focused={focused}
              label="Track"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="qada"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              Icon={RefreshCw}
              color={color}
              focused={focused}
              label="Qada"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              Icon={BarChart2}
              color={color}
              focused={focused}
              label="Stats"
            />
          ),
        }}
      />
    </Tabs>
  );
}
