// SashLive — Tab Navigation (PoppoLive Style)
import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, Animated } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, BorderRadius, FontWeight } from '@/constants/theme';

function TabIcon({ name, focused, badge }: { name: string; focused: boolean; badge?: number }) {
  const activeColor = '#111827';
  const inactiveColor = '#9CA3AF';
  const color = focused ? activeColor : inactiveColor;

  const iconMap: Record<string, keyof typeof MaterialIcons.glyphMap> = {
    home: 'live-tv',
    discover: 'explore',
    messages: 'chat-bubble',
    profile: 'person',
  };

  const iconName = iconMap[name];
  if (!iconName) return null;

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', width: 28, height: 28 }}>
      <MaterialIcons
        name={iconName}
        size={focused ? 26 : 24}
        color={color}
      />
      {name === 'messages' && badge && badge > 0 ? (
        <View style={dotS.badge}>
          <Text style={dotS.badgeText}>{badge > 99 ? '99+' : badge}</Text>
        </View>
      ) : null}
    </View>
  );
}

const dotS = StyleSheet.create({
  badge: {
    position: 'absolute', top: -4, right: -8,
    backgroundColor: Colors.live, borderRadius: 8,
    paddingHorizontal: 4, paddingVertical: 1, minWidth: 16,
    alignItems: 'center', borderWidth: 1.5, borderColor: '#FFF',
  },
  badgeText: { color: '#FFF', fontSize: 8, fontWeight: FontWeight.black },
});

function CustomTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const scaleAnims = useRef(state.routes.map(() => new Animated.Value(1))).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);

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
      Animated.sequence([
        Animated.timing(scaleAnims[routeIndex], { toValue: 0.82, duration: 80, useNativeDriver: true }),
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
              <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                <LinearGradient
                  colors={['#FF2E8B', '#9B30FF']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.centerBtn}
                >
                  <MaterialIcons name="videocam" size={28} color="#FFF" />
                </LinearGradient>
              </Animated.View>
              <Text style={styles.centerLabel}>LIVE</Text>
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
              {isFocused && <View style={styles.activeDot} />}
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
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 16,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
    paddingBottom: 3,
  },
  tabContent: {
    alignItems: 'center',
    gap: 2,
    position: 'relative',
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
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.primary,
    marginTop: 1,
  },
  centerWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 2,
  },
  centerBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: -2,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  centerLabel: {
    fontSize: 9,
    color: Colors.primary,
    fontWeight: FontWeight.black,
    letterSpacing: 1,
    marginTop: 2,
  },
});
