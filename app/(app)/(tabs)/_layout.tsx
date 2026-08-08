import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { colors } from "@/lib/theme";

type IconName = keyof typeof Ionicons.glyphMap;

function TabIcon({ name, focused }: { name: IconName; focused: boolean }) {
  return (
    <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
      <Ionicons name={name} size={22} color={focused ? colors.primary : colors.textFaint} />
    </View>
  );
}

export default function TabsLayout() {
  const { t } = useTranslation();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("home.tabTitle"),
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? "home" : "home-outline"} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: t("calendar.tabTitle"),
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? "calendar" : "calendar-outline"} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="todos"
        options={{
          title: t("todo.tabTitle"),
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? "checkmark-circle" : "checkmark-circle-outline"} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="groceries"
        options={{
          title: t("groceries.tabTitle"),
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? "cart" : "cart-outline"} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="meals"
        options={{
          title: t("meals.tabTitle"),
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? "restaurant" : "restaurant-outline"} focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: 84,
    paddingTop: 8,
    paddingBottom: 14,
    backgroundColor: colors.white,
    borderTopColor: colors.borderLight,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "700",
  },
  iconWrap: {
    width: 40,
    height: 30,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapActive: {
    backgroundColor: colors.primaryMuted,
  },
});
