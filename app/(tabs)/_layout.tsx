// SashLive — Tab Navigation (Poppo Live style)
import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';

function CustomTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const tabs = [
    { name: 'index',    icon: 'home',         label: 'Home'     },
    { name: 'explore',  icon: 'explore',      label: 'Explore'  },
    { name: '__live__', icon: 'videocam',      label: 'Live',    isCenter: true },
    { name: 'messages', icon: 'chat-bubble',   label: 'Inbox'    },
    { name: 'profile',  icon: 'person',        label: 'Me'       },
  ];

  const pb = Platform.select({ ios: insets.bottom, android: insets.bottom + 4, default: 8 });

  return (
    <View style={[styles.tabBar, { paddingBottom: pb }]}>
      {tabs.map((tab, idx) => {
        if (tab.isCenter) {
          return (
            <Pressable
              key="live"
              style={({ pressed }) => [styles.centerBtn, pressed && { transform: [{ scale: 0.92 }] }]}
              onPress={() => router.push('/go-live')}
            >
              <View style={styles.centerBtnInner}>
                <MaterialIcons name="videocam" size={24} color="#FFF" />
              </View>
              <Text style={styles.centerLabel}>Live</Text>
            </Pressable>
          );
        }
        const route = state.routes.find((r: any) => r.name === tab.name);
        const routeIndex = state.routes.indexOf(route);
        const isFocused = state.index === routeIndex;
        return (
          <Pressable
            key={tab.name}
            style={styles.tabItem}
            onPress={() => { if (!isFocused && route) navigation.navigate(tab.name); }}
          >
            <View style={[styles.tabIconWrap, isFocused && styles.tabIconWrapActive]}>
              <MaterialIcons
                name={tab.icon as any}
                size={22}
                color={isFocused ? Colors.primary : Colors.textMuted}
              />
            </View>
            <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={props => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="explore" />
      <Tabs.Screen name="messages" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.bgSecondary,
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
    paddingTop: 6,
    paddingHorizontal: Spacing.xs,
    alignItems: 'flex-end',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingBottom: 2,
    minHeight: 44,
  },
  tabIconWrap: {
    width: 36, height: 28,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 14,
  },
  tabIconWrapActive: {
    backgroundColor: Colors.primary + '20',
  },
  tabLabel: { fontSize: 10, color: Colors.textMuted, fontWeight: '500' },
  tabLabelActive: { color: Colors.primary, fontWeight: '700' },
  centerBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 2,
    gap: 2,
  },
  centerBtnInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -14,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 14,
    elevation: 12,
    borderWidth: 3,
    borderColor: Colors.bgSecondary,
  },
  centerLabel: { fontSize: 10, color: Colors.primary, fontWeight: '700' },
});
