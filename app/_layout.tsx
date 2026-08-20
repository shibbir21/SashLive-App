// SashLive — App Layout
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AlertProvider, AuthProvider } from '@/template';
import { AppProvider } from '@/contexts/AppContext';
import { usePushNotifications, sendWelcomeNotification } from '@/hooks/usePushNotifications';
import { useAuth } from '@/template';
import { useEffect, useRef } from 'react';

function PushNotificationSetup() {
  const { user } = useAuth();
  const hasWelcomed = useRef(false);

  usePushNotifications(user?.id);

  // Send welcome notification only once per session on first login
  useEffect(() => {
    if (user?.id && !hasWelcomed.current) {
      hasWelcomed.current = true;
      const timer = setTimeout(() => {
        sendWelcomeNotification(user.email?.split('@')[0] || 'Friend');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [user?.id]);

  return null;
}

function RootProviders({ children }: { children: React.ReactNode }) {
  return (
    <AlertProvider>
      <SafeAreaProvider>
        <AuthProvider>
          <AppProvider>
            <PushNotificationSetup />
            {children}
          </AppProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </AlertProvider>
  );
}

export default function RootLayout() {
  return (
    <RootProviders>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="live/[id]" />
        <Stack.Screen name="chat/[id]" />
        <Stack.Screen name="wallet" />
        <Stack.Screen name="vip-store" />
        <Stack.Screen name="leaderboard" />
        <Stack.Screen name="recharge" />
        <Stack.Screen name="games" />
        <Stack.Screen name="host-panel" />
        <Stack.Screen name="audio-room/[id]" />
        <Stack.Screen name="video-call/[id]" />
        <Stack.Screen name="stories" />
        <Stack.Screen name="reels" />
        <Stack.Screen name="agency" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="search" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="user/[id]" />
        <Stack.Screen name="followers/[id]" />
        <Stack.Screen name="withdrawal" />
        <Stack.Screen name="go-live" />
        <Stack.Screen name="daily-tasks" />
        <Stack.Screen name="pk-invite/[id]" />
        <Stack.Screen name="admin" />
        <Stack.Screen name="edit-profile" />
        <Stack.Screen name="activity-centre" />
      </Stack>
    </RootProviders>
  );
}
