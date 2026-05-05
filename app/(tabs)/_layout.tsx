// SashLive — Tab Navigation (PoppoLive Style)
import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, Animated } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, FontWeight } from '@/constants/theme';

// Custom SVG-style icons matching PoppoLive's bottom bar
function TabIcon({ name, focused, badge }: { name: string; focused: boolean; badge?: number }) {
  const color = focused ? '#111827' : '#9CA3AF';

  const icons: Record<string, JSX.Element> = {
    home: (
      <View style={{ alignItems: 'center', justifyContent: 'center', width: 26, height: 26 }}>
        {/* TV / Home icon like PoppoLive */}
        <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.55 }}>📺</Text>
      </View>
    ),
    discover: (
      <View style={{ alignItems: 'center', justifyContent: 'center', width: 26, height: 26 }}>
        <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.55 }}>🔔</Text>
        {focused && <View style={dotS.focusDot} />}
      </View>
    ),
    explore: (
      <View style={{ alignItems: 'center', justifyContent: 'center', width: 26, height: 26 }}>
        <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.55 }}>🪐</Text>
      </View>
    ),
    messages: (
      <View style={{ alignItems: 'center', justifyContent: 'center', width: 26, height: 26, position: 'relative' }}>
        <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.55 }}>💬</Text>
        {badge && badge > 0 ? (
          <View style={dotS.badge}>
            <Text style={dotS.badgeText}>{badge > 99 ? '99+' : badge}</Text>
          </View>
        ) : null}
      </View>
    ),
    profile: (
      <View style={{ alignItems: 'center', justifyContent: 'center', width: 26, height: 26 }}>
        <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.55 }}>🐼</Text>
      </View>
    ),
  };

  return icons[name] || <Text style={{ fontSize: 20 }}>●</Text>;
}
const dotS = StyleSheet.create({
  focusDot: { position: 'absolute', bottom: -3, width: 5, height: 5, borderRadius: 3, backgroundColor: '#111827' },
  badge: { position: 'absolute', top: -4, right: -8, backgroundColor: Colors.live, borderRadius: 8, paddingHorizontal: 4, paddingVertical: 1, minWidth: 16, alignItems: 'center', borderWidth: 1.5, borderColor: '#FFF' },
  badgeText: { color: '#FFF', fontSize: 8, fontWeight: FontWeight.black },
});

function CustomTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const scaleAnims = useRef(state.routes.map(() => new Animated.Value(1))).current;

  const tabs = [
    { name: 'index',    icon: 'home',     label: 'Home'     },
    { name: 'explore',  icon: 'discover', label: 'Discover' },
    { name: '__live__', icon: 'live',     label: '',         isCenter: true },
    { name: 'messages', icon: 'messages', label: 'Messages', badge: 99 },
    { name: 'profile',  icon: 'profile',  label: 'Me'       },
  ];

  const pb = Platform.select({ ios: insets.bottom, android: Math.max(insets.bottom, 4), default: 8 });

  const handlePress = (tab: typeof tabs[0], routeIndex: number) => {
    if (tab.isCenter) {
      router.push('/go-live');
      return;
    }
    const route = state.routes[routeIndex];
    const isFocused = state.index === routeIndex;
    if (!isFocused && route) {
      // Animate
      Animated.sequence([
        Animated.timing(scaleAnims[routeIndex], { toValue: 0.85, duration: 80, useNativeDriver: true }),
        Animated.spring(scaleAnims[routeIndex], { toValue: 1, useNativeDriver: true, tension: 300 }),
      ]).start();
      navigation.navigate(tab.name);
    }
  };

  let realRouteIndex = -1;

  return (
    <View style={[styles.tabBar, { paddingBottom: pb }]}>
      {tabs.map((tab, idx) => {
        if (!tab.isCenter) realRouteIndex++;
        const currentRealIndex = tab.isCenter ? -1 : realRouteIndex;
        const route = tab.isCenter ? null : state.routes[currentRealIndex];
        const isFocused = tab.isCenter ? false : state.index === currentRealIndex;

        if (tab.isCenter) {
          return (
            <Pressable
              key="live-center"
              style={styles.centerWrap}
              onPress={() => router.push('/go-live')}
            >
              <View style={styles.centerBtn}>
                <Text style={{ fontSize: 24 }}>🔴</Text>
              </View>
            </Pressable>
          );
        }

        const animIdx = currentRealIndex;
        return (
          <Pressable
            key={tab.name}
            style={styles.tabItem}
            onPress={() => handlePress(tab, currentRealIndex)}
          >
            <Animated.View style={[styles.tabContent, { transform: [{ scale: scaleAnims[animIdx] || new Animated.Value(1) }] }]}>
              <TabIcon name={tab.icon} focused={isFocused} badge={tab.name === 'messages' ? 99 : undefined} />
              {tab.label ? (
                <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>
                  {tab.label}
                </Text>
              ) : null}
            </Animated.View>
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
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 8,
    paddingHorizontal: 0,
    alignItems: 'flex-end',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 12,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    paddingBottom: 3,
  },
  tabContent: {
    alignItems: 'center',
    gap: 2,
  },
  tabLabel: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  tabLabelActive: {
    color: '#111827',
    fontWeight: '700',
  },
  // Center Go Live button
  centerWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 6,
  },
  centerBtn: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: -4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
});
